import type { FounderProfile, MatchScoreBreakdown, RoleCategory, StartupStage } from '../types.ts';

export const MATCH_WEIGHTS = {
  roleComplementarity: 25,
  skillsOverlap: 25,
  stageAlignment: 20,
  commitmentAlignment: 15,
  locationProximity: 5,
  recencyBonus: 10,
} as const;

function norm(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().trim();
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const inter = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union > 0 ? inter / union : 0;
}

const STAGE_ORDER: StartupStage[] = [
  'Idea / Concept',
  'Prototype / MVP',
  'Pre-Seed (Traction)',
  'Seed Funded',
  'Series A+',
];

const ROLE_KEYWORDS: Record<RoleCategory, string[]> = {
  'Technical Co-Founder': ['technical', 'engineer', 'cto', 'ai', 'backend', 'full-stack', 'rust', 'python', 'typescript', 'architecture', 'ml', 'mobile'],
  'Business & Growth': ['gtm', 'sales', 'business', 'growth', 'fundraising', 'commercial', 'enterprise', 'marketing', 'ceo', 'revenue'],
  'Product & Design': ['product', 'design', 'ux', 'ui', 'figma', 'research', 'visionary', 'virality'],
  'Domain & Operations': ['operations', 'domain', 'clinical', 'regulatory', 'compliance', 'healthcare', 'fintech', 'hospital', 'supply chain'],
  'Mentor & Advisor': ['advisor', 'mentor', 'scaling', 'leadership', 'due diligence', 'fundraising'],
  'Angel / Investor': ['investor', 'angel', 'seed', 'capital', 'fundraising'],
};

/**
 * Deterministic 6-axis matching algorithm between viewer and candidate FounderProfile.
 */
export function computeFounderMatch(
  viewer: FounderProfile,
  candidate: FounderProfile
): { score: number; breakdown: MatchScoreBreakdown; highlights: string[] } {
  const reasons: string[] = [];

  // 1. Role Complementarity (max 25)
  let roleComplementarity = 15;
  const viewerLookingText = viewer.lookingFor.map(norm).join(' ');
  const candidateLookingText = candidate.lookingFor.map(norm).join(' ');
  const candidateRoleKeys = ROLE_KEYWORDS[candidate.role] || [];
  const viewerRoleKeys = ROLE_KEYWORDS[viewer.role] || [];

  const candidateFillsViewerNeed = candidateRoleKeys.some((k) => viewerLookingText.includes(k));
  const viewerFillsCandidateNeed = viewerRoleKeys.some((k) => candidateLookingText.includes(k));

  if (viewer.role !== candidate.role && candidateFillsViewerNeed && viewerFillsCandidateNeed) {
    roleComplementarity = MATCH_WEIGHTS.roleComplementarity; // 25
    reasons.push(`Mutual role fit: ${viewer.role} ↔ ${candidate.role}`);
  } else if (viewer.role !== candidate.role && (candidateFillsViewerNeed || viewerFillsCandidateNeed)) {
    roleComplementarity = 23;
    reasons.push(`Strong role complementarity (${candidate.role})`);
  } else if (viewer.role !== candidate.role) {
    roleComplementarity = 20;
    reasons.push(`Complementary founding discipline (${candidate.role})`);
  } else {
    roleComplementarity = 14;
    reasons.push(`Peer technical/domain alignment (${candidate.role})`);
  }

  // 2. Skills & Domain Synergy (max 25)
  const viewerSkills = new Set(viewer.skills.map(norm).filter(Boolean));
  const candidateSkills = new Set(candidate.skills.map(norm).filter(Boolean));
  const directJaccard = jaccard(viewerSkills, candidateSkills);

  const candidateCorpus = `${candidate.skills.join(' ')} ${candidate.headline} ${candidate.bio}`.toLowerCase();
  let soughtHits = 0;
  for (const item of viewer.lookingFor) {
    const words = norm(item).split(/\s+/).filter((w) => w.length > 2);
    if (words.some((w) => candidateCorpus.includes(w))) {
      soughtHits += 1;
    }
  }
  const soughtRatio = viewer.lookingFor.length > 0 ? soughtHits / viewer.lookingFor.length : 0.5;
  const combinedSkillRatio = Math.min(1, directJaccard * 0.45 + soughtRatio * 0.75 + 0.25);
  const skillsOverlap = Math.max(12, Math.min(MATCH_WEIGHTS.skillsOverlap, Math.round(combinedSkillRatio * MATCH_WEIGHTS.skillsOverlap)));

  if (skillsOverlap >= 20) {
    reasons.push('High superpower & sought-skill synergy');
  } else if (skillsOverlap >= 15) {
    reasons.push('Complementary skill stack');
  }

  // 3. Venture Stage Alignment (max 20)
  let stageAlignment = 10;
  if (viewer.stage === candidate.stage) {
    stageAlignment = MATCH_WEIGHTS.stageAlignment; // 20
    reasons.push(`Exact stage alignment (${candidate.stage})`);
  } else {
    const vi = STAGE_ORDER.indexOf(viewer.stage);
    const ci = STAGE_ORDER.indexOf(candidate.stage);
    if (vi >= 0 && ci >= 0 && Math.abs(vi - ci) === 1) {
      stageAlignment = 16;
      reasons.push(`Adjacent venture stage (${candidate.stage})`);
    } else {
      stageAlignment = 11;
    }
  }

  // 4. Commitment Alignment (max 15)
  let commitmentAlignment = 8;
  if (viewer.commitment === candidate.commitment) {
    commitmentAlignment = MATCH_WEIGHTS.commitmentAlignment; // 15
    reasons.push(`Matched commitment (${candidate.commitment})`);
  } else if (
    (viewer.commitment === 'Full-Time' && candidate.commitment === 'Part-Time (Transition to FT)') ||
    (candidate.commitment === 'Full-Time' && viewer.commitment === 'Part-Time (Transition to FT)')
  ) {
    commitmentAlignment = 12;
    reasons.push('Compatible transition-to-full-time cadence');
  } else if (candidate.role === 'Mentor & Advisor' || candidate.commitment === 'Advisory') {
    commitmentAlignment = 12;
    reasons.push('Flexible advisory cadence');
  }

  // 5. Location & Remote Proximity (max 5)
  let locationProximity = 3;
  const vLoc = norm(viewer.location);
  const cLoc = norm(candidate.location);
  if (vLoc && cLoc && (vLoc === cLoc || vLoc.split(',')[0] === cLoc.split(',')[0])) {
    locationProximity = MATCH_WEIGHTS.locationProximity; // 5
    reasons.push(`Shared hub location (${(candidate.location.split('/')[0] || candidate.location).trim()})`);
  } else if (viewer.isRemote && candidate.isRemote) {
    locationProximity = 5;
    reasons.push('Remote-first collaboration ready');
  }

  // 6. Activity & Verification Recency Bonus (max 10)
  const recencyBonus = candidate.verified ? 10 : 7;
  if (candidate.verified) {
    reasons.push('Verified founder track record');
  }

  const rawTotal =
    roleComplementarity +
    skillsOverlap +
    stageAlignment +
    commitmentAlignment +
    locationProximity +
    recencyBonus;

  const score = Math.min(99, Math.max(65, rawTotal));

  const breakdown: MatchScoreBreakdown = {
    roleComplementarity,
    skillsOverlap,
    stageAlignment,
    commitmentAlignment,
    locationProximity,
    recencyBonus,
    reasons,
  };

  const highlights = reasons.slice(0, 3);

  return { score, breakdown, highlights };
}

export function enrichFoundersWithMatches(
  viewer: FounderProfile,
  founders: FounderProfile[]
): FounderProfile[] {
  return founders.map((candidate) => {
    if (candidate.id === viewer.id) {
      return {
        ...candidate,
        matchScore: 100,
      };
    }
    const { score, breakdown, highlights } = computeFounderMatch(viewer, candidate);
    return {
      ...candidate,
      matchScore: score,
      matchBreakdown: breakdown,
      matchHighlights: highlights.length > 0 ? highlights : candidate.matchHighlights,
    };
  });
}
