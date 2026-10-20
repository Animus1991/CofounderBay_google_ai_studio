import { User, Profile, UserSkill, ValuesPreferences, MatchProfile } from '../types';

export interface MatchingResult {
  score: number;
  explanation: string;
  compatibilityDimensions: {
    skills: number;
    values: number;
    goals: number;
    availability: number;
  };
  sharedStrengths: string[];
  complementaryStrengths: string[];
  mismatchFlags: string[];
}

export const calculateCompatibility = (
  userA: { user: User; profile: Profile; skills: UserSkill[]; values: ValuesPreferences; matchProfile: MatchProfile },
  userB: { user: User; profile: Profile; skills: UserSkill[]; values: ValuesPreferences; matchProfile: MatchProfile }
): MatchingResult => {
  let totalScore = 0;
  const dimensions = {
    skills: 0,
    values: 0,
    goals: 0,
    availability: 0,
  };
  const sharedStrengths: string[] = [];
  const complementaryStrengths: string[] = [];
  const mismatchFlags: string[] = [];

  // 1. Role Fit (Crucial)
  const userALookingFor = userA.matchProfile.lookingForRoles || [];
  const userBRoles = userB.user.roles || [];
  const roleMatch = userALookingFor.some(role => userBRoles.includes(role as any));
  if (roleMatch) {
    totalScore += 25;
    dimensions.goals += 25;
  } else {
    mismatchFlags.push("Role mismatch");
  }

  // 2. Skills (Complementary vs Shared)
  const userASkillIds = userA.skills.map(s => s.skillId);
  const userBSkillIds = userB.skills.map(s => s.skillId);
  
  const sharedSkills = userASkillIds.filter(id => userBSkillIds.includes(id));
  const complementarySkills = userBSkillIds.filter(id => !userASkillIds.includes(id));

  if (sharedSkills.length > 0) {
    dimensions.skills += Math.min(15, sharedSkills.length * 5);
    sharedStrengths.push("Shared technical background");
  }
  if (complementarySkills.length > 0) {
    dimensions.skills += Math.min(20, complementarySkills.length * 7);
    complementaryStrengths.push("Complementary skill sets");
  }
  totalScore += dimensions.skills;

  // 3. Values & Work Style
  const userAWorkStyle = Array.isArray(userA.values.workStyle) ? userA.values.workStyle : [userA.values.workStyle];
  const userBWorkStyle = Array.isArray(userB.values.workStyle) ? userB.values.workStyle : [userB.values.workStyle];
  
  const sharedWorkStyles = userAWorkStyle.filter(style => userBWorkStyle.includes(style));
  if (sharedWorkStyles.length > 0) {
    dimensions.values += 15;
    sharedStrengths.push("Aligned work styles");
  }
  if (userA.values.riskTolerance === userB.values.riskTolerance) {
    dimensions.values += 10;
    sharedStrengths.push("Similar risk tolerance");
  } else {
    mismatchFlags.push("Different risk appetite");
  }
  totalScore += dimensions.values;

  // 4. Commitment & Availability
  if (userA.profile.commitmentLevel === userB.profile.commitmentLevel) {
    dimensions.availability += 15;
  } else {
    mismatchFlags.push("Commitment level difference");
  }
  totalScore += dimensions.availability;

  // 5. Industry Fit
  const sharedIndustries = userA.values.preferredIndustries.filter(ind => userB.values.preferredIndustries.includes(ind));
  if (sharedIndustries.length > 0) {
    totalScore += 10;
    sharedStrengths.push("Shared industry focus");
  }

  // Final Normalization (Cap at 100)
  const finalScore = Math.min(100, totalScore);

  let explanation = `This match is strong due to ${sharedStrengths.join(', ')}.`;
  if (complementaryStrengths.length > 0) {
    explanation += ` They also bring ${complementaryStrengths.join(', ')} to the table.`;
  }
  if (mismatchFlags.length > 0) {
    explanation += ` Note: ${mismatchFlags.join(', ')} might require discussion.`;
  }

  return {
    score: finalScore,
    explanation,
    compatibilityDimensions: dimensions,
    sharedStrengths,
    complementaryStrengths,
    mismatchFlags,
  };
};
