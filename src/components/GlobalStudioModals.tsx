import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Layers, BarChart2, Briefcase, PlusCircle } from 'lucide-react';
import { useUIStore } from '../stores/useUIStore';
import { useLanguage, useT } from '../lib/language';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../App';
import { MatchBreakdownModal } from './MatchBreakdownModal';
import { StartupDealRoomModal } from './StartupDealRoomModal';
import { NeedCardWall } from './NeedCardWall';
import { ProfileModal } from './ProfileModal';
import {
  FounderProfile,
  StartupVenture,
  NeedCardItem,
  RoleCategory,
  StartupStage,
  CommitmentType,
} from '../types';
import {
  INITIAL_MY_PROFILE,
  STARTUP_VENTURES,
  createAvatarSvg,
} from '../data/studioCatalog';
import { enrichFoundersWithMatches } from '../utils/matchingEngine';
import { DEMO_VENTURE } from '../data/demoVenture';
import { compatibility, fromCast, fromProfile } from '../lib/compatibility';
import { mergeFitIntoViewer } from '../lib/fitCheck';
import { avatarOf, cofounderPool, directoryPeople, type Person } from '../lib/peopleSource';
import { messagingBridge } from '../lib/messagingBridge';
import {
  ensureChatConversation,
  keys,
  logActivity,
  readNeeds,
  readProfileLocal,
  readRound,
  readSaved,
  readValue,
  removeSaved,
  saveProfile,
  trackApplication,
  upsertNeed,
  writeProfileLocal,
  writeValue,
} from '../lib/localLists';
import { useStored } from '../lib/useStored';
import { startupRecord, useEntity } from '../lib/entities';
import { myVentureFrom, wallCards } from '../lib/studioData';
import { effectivePitch } from '../lib/pitch';

/** A real account's studio profile starts empty — never the sample founder's facts. */
const BLANK_MY_PROFILE: FounderProfile = {
  ...INITIAL_MY_PROFILE,
  name: '',
  avatar: '',
  headline: '',
  location: '',
  equityExpectation: '',
  experienceYears: 0,
  bio: '',
  skills: [],
  lookingFor: [],
  pastExperience: '',
  education: undefined,
  verified: false,
  matchHighlights: [],
  socials: {},
  featuredProject: undefined,
};

/** Whole words only: "building" is not "ui", "maintain" is not "ai". */
function mapRoleCategory(rawRole?: string, headline?: string): RoleCategory {
  const text = `${rawRole || ''} ${headline || ''}`.toLowerCase();
  if (/\b(mentor|advisor)/.test(text)) return 'Mentor & Advisor';
  if (/\b(investor|angel|vc)\b/.test(text)) return 'Angel / Investor';
  if (/\b(tech\w*|cto|engineer\w*|developer|ai|ml|full-stack|hardware)\b/.test(text)) return 'Technical Co-Founder';
  if (/\b(design\w*|product|ux|ui)\b/.test(text)) return 'Product & Design';
  if (/\b(growth|sales|gtm|marketing|business|commercial)\b/.test(text)) return 'Business & Growth';
  return 'Domain & Operations';
}

function mapStartupStage(rawStage?: string): StartupStage {
  const s = (rawStage || '').toLowerCase();
  if (s.includes('idea')) return 'Idea / Concept';
  if (s.includes('proto') || s.includes('mvp')) return 'Prototype / MVP';
  if (s.includes('series') || s.includes('growth')) return 'Series A+';
  if (s.includes('seed') && !s.includes('pre')) return 'Seed Funded';
  return 'Pre-Seed (Traction)';
}

function mapCommitment(rawCommitment?: string): CommitmentType {
  const c = (rawCommitment || '').toLowerCase();
  if (c.includes('advis')) return 'Advisory';
  if (c.includes('part')) return 'Part-Time (Transition to FT)';
  if (c.includes('side') || c.includes('weekend')) return 'Evenings & Weekends';
  return 'Full-Time';
}

/** A directory member in the studio's shape — only what the member actually said, nothing filled in. */
function personToFounderProfile(person: Person): FounderProfile {
  return {
    id: person.id,
    name: person.fullName,
    avatar: avatarOf(person) || createAvatarSvg(person.fullName.slice(0, 2).toUpperCase(), '#1E293B', '#334155', '#6366F1'),
    headline: person.headline || person.role,
    role: mapRoleCategory(person.role, person.headline),
    location: person.location || [person.city, person.country].filter(Boolean).join(', '),
    isRemote: /remote/i.test(`${person.location} ${person.availability}`),
    stage: mapStartupStage(person.stage),
    commitment: mapCommitment(person.commitment),
    equityExpectation: '',
    experienceYears: 0,
    bio: person.bio || person.headline,
    skills: person.skills,
    lookingFor: person.lookingFor,
    pastExperience: person.company ? `${person.role} @ ${person.company}` : [person.role, person.industry].filter(Boolean).join(' · '),
    education: undefined,
    verified: person.verified,
    matchScore: 0,
    matchHighlights: [],
    socials: {
      linkedin: person.linkedinUrl || undefined,
      github: person.githubUrl || undefined,
    },
  };
}

export const GlobalStudioModals: React.FC = () => {
  const { mode: lang } = useLanguage();
  const t = useT();
  const navigate = useNavigate();
  const { profile: authProfile, isDemoMode } = useAuth();
  const { success: toastSuccess } = useToast();

  const matchBreakdownModalOpen = useUIStore((s) => s.matchBreakdownModalOpen);
  const setMatchBreakdownModalOpen = useUIStore((s) => s.setMatchBreakdownModalOpen);
  const selectedFounderId = useUIStore((s) => s.selectedFounderId);

  const dealRoomModalOpen = useUIStore((s) => s.dealRoomModalOpen);
  const setDealRoomModalOpen = useUIStore((s) => s.setDealRoomModalOpen);
  const selectedStartupId = useUIStore((s) => s.selectedStartupId);

  const needWallModalOpen = useUIStore((s) => s.needWallModalOpen);
  const setNeedWallModalOpen = useUIStore((s) => s.setNeedWallModalOpen);

  // Live reactive subscriptions to local studio state
  const localNeeds = useStored(readNeeds, [keys.needs]);
  const localProfilePatch = useStored(readProfileLocal, [keys.profileLocal]);
  const localRound = useStored(readRound, [keys.round]);
  const localStartup = useEntity(startupRecord);
  const localCanvas = useStored(() => readValue<Record<string, string>>(keys.canvas, {}), [keys.canvas]);
  const localPitch = useStored(effectivePitch, [keys.pitch, keys.canvas, keys.builder, keys.startup, keys.round]);
  const savedProfiles = useStored(readSaved, [keys.saved]);
  const customStartups = useStored(
    () => readValue<StartupVenture[]>(keys.dealRoomStartups, []),
    [keys.dealRoomStartups],
  );

  // Edits made in the studio profile modal, kept per account kind so the sample never leaks into a real account.
  const [myProfileEdits, setMyProfileEdits] = useState<{ demo: boolean; profile: FounderProfile } | null>(null);
  const myProfileBase = myProfileEdits && myProfileEdits.demo === isDemoMode
    ? myProfileEdits.profile
    : isDemoMode ? INITIAL_MY_PROFILE : BLANK_MY_PROFILE;
  const [activeFounderId, setActiveFounderId] = useState<string | undefined>(undefined);
  const [activeStartupId, setActiveStartupId] = useState<string>('sv-my-venture');
  const [dealRoomMode, setDealRoomMode] = useState<'view' | 'apply' | 'create'>('view');
  const [fullProfileFounder, setFullProfileFounder] = useState<FounderProfile | null>(null);

  useEffect(() => {
    const anyOpen = matchBreakdownModalOpen || dealRoomModalOpen || needWallModalOpen || Boolean(fullProfileFounder);
    if (!anyOpen) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (fullProfileFounder) {
        setFullProfileFounder(null);
      } else if (matchBreakdownModalOpen) {
        setMatchBreakdownModalOpen(false);
      } else if (dealRoomModalOpen) {
        setDealRoomModalOpen(false);
      } else if (needWallModalOpen) {
        setNeedWallModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [matchBreakdownModalOpen, dealRoomModalOpen, needWallModalOpen, fullProfileFounder, setMatchBreakdownModalOpen, setDealRoomModalOpen, setNeedWallModalOpen]);

  // Synchronize viewer profile across Auth, localProfilePatch, and Studio Profile
  const myProfile = useMemo<FounderProfile>(() => {
    const mergedName = localProfilePatch.fullName || authProfile?.fullName || myProfileBase.name;
    const mergedHeadline = localProfilePatch.headline || authProfile?.headline || myProfileBase.headline;
    const mergedBio = localProfilePatch.bio || authProfile?.bio || myProfileBase.bio;
    const mergedLocation = localProfilePatch.location || authProfile?.location || myProfileBase.location;
    const mergedAvatar = localProfilePatch.avatarUrl || authProfile?.avatarUrl || myProfileBase.avatar;
    const rawRole = localProfilePatch.role || authProfile?.role;
    const mergedSkills =
      Array.isArray(localProfilePatch.skills) && localProfilePatch.skills.length > 0
        ? localProfilePatch.skills
        : Array.isArray(authProfile?.skills) && authProfile.skills.length > 0
          ? authProfile.skills
          : myProfileBase.skills;
    const mergedLookingFor =
      Array.isArray(localProfilePatch.lookingFor) && localProfilePatch.lookingFor.length > 0
        ? localProfilePatch.lookingFor
        : Array.isArray(authProfile?.lookingFor) && authProfile.lookingFor.length > 0
          ? authProfile.lookingFor
          : myProfileBase.lookingFor;
    return {
      ...myProfileBase,
      name: mergedName,
      avatar: mergedAvatar,
      headline: mergedHeadline,
      role: rawRole || mergedHeadline ? mapRoleCategory(rawRole, mergedHeadline) : myProfileBase.role,
      bio: mergedBio,
      location: mergedLocation,
      stage: mapStartupStage(localProfilePatch.stage || authProfile?.stage || myProfileBase.stage),
      commitment: mapCommitment(localProfilePatch.commitment || authProfile?.commitment || myProfileBase.commitment),
      skills: mergedSkills,
      lookingFor: mergedLookingFor,
    };
  }, [myProfileBase, authProfile, localProfilePatch]);

  // One score everywhere: the breakdown, the picker and the full profile use the same engine as
  // Matches cards, profiles, the dashboard and the assistant, so every number shown is the same.
  const fitFor = useMemo(() => {
    const viewer = fromProfile(mergeFitIntoViewer(authProfile));
    const directory = directoryPeople();
    return (founder: FounderProfile) => {
      const person = directory.find((p) => p.id === founder.id);
      const them = person
        ? fromCast({ skills: person.skills, lookingFor: person.lookingFor, interests: person.interests, industry: person.industry, stage: person.stage, commitment: person.commitment, city: person.city || person.location.split(',')[0], timezone: person.timezone })
        : fromCast({ skills: founder.skills, lookingFor: founder.lookingFor, stage: founder.stage, commitment: founder.commitment, city: founder.location.split(/[,/]/)[0]?.trim() });
      const fit = compatibility(viewer, them);
      return fit.score == null ? null : fit;
    };
  }, [authProfile]);

  // Every directory member (the demo cast in the sample account, real members otherwise), best match first.
  const founders = useMemo<FounderProfile[]>(() => {
    const byId = new Map<string, FounderProfile>();
    for (const person of directoryPeople()) {
      if (!byId.has(person.id)) {
        byId.set(person.id, personToFounderProfile(person));
      }
    }
    return enrichFoundersWithMatches(myProfile, Array.from(byId.values()))
      .map((founder) => {
        const fit = fitFor(founder);
        return {
          ...founder,
          matchScore: fit?.score ?? 0,
          matchHighlights: fit
            ? fit.dimensions
                .filter((dim) => dim.reason && (dim.score ?? 0) >= 60)
                .slice(0, 3)
                .map((dim) => (lang === 'el' ? dim.reason!.el : dim.reason!.en))
            : [],
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [myProfile, fitFor, lang]);

  // Unified Startups pool: the founder's own venture (Founder Tools, pitch deck, round, Need Cards),
  // the ventures they launched here, and — in the sample account only — the sample Deal Rooms.
  const startups = useMemo<StartupVenture[]>(() => {
    const ventureName =
      typeof localStartup.name === 'string' && localStartup.name.trim()
        ? localStartup.name.trim()
        : isDemoMode ? DEMO_VENTURE.name : (lang === 'el' ? 'Το venture σου' : 'Your venture');
    const oneLiner =
      typeof localStartup.oneLiner === 'string' && localStartup.oneLiner.trim()
        ? localStartup.oneLiner.trim()
        : isDemoMode ? (lang === 'el' ? DEMO_VENTURE.oneLinerEl : DEMO_VENTURE.oneLiner) : '';
    const description =
      typeof localStartup.description === 'string' && localStartup.description.trim()
        ? localStartup.description.trim()
        : oneLiner;
    const readiness = typeof localStartup.readinessScore === 'number' ? localStartup.readinessScore : isDemoMode ? DEMO_VENTURE.readinessScore : 0;
    const rawStage = localRound.name || authProfile?.stage;

    const myVenture = myVentureFrom({
      name: ventureName,
      oneLiner,
      description,
      industry: authProfile?.industry || '',
      stage: rawStage ? mapStartupStage(rawStage) : undefined,
      location: myProfile.location || '',
      openNeeds: localNeeds,
      round: localRound,
      readiness,
      founderName: myProfile.name,
      founderAvatar: myProfile.avatar,
      logo: createAvatarSvg(ventureName.slice(0, 2).toUpperCase(), '#0F172A', '#1E293B', '#10B981'),
      pitch: localPitch,
      canvas: localCanvas,
    });

    const seen = new Set<string>(['sv-my-venture']);
    const merged: StartupVenture[] = [myVenture];
    for (const s of [...customStartups, ...(isDemoMode ? STARTUP_VENTURES : [])]) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        merged.push(s);
      }
    }
    return merged;
  }, [localStartup, localRound, localCanvas, localPitch, localNeeds, authProfile, myProfile, customStartups, isDemoMode, lang]);

  // Unified Need Cards: combines localLists Need Cards (from AI Chat / Network page) + Studio Need Cards
  const needCards = useMemo<NeedCardItem[]>(() => {
    const ventureName =
      typeof localStartup.name === 'string' && localStartup.name.trim()
        ? localStartup.name.trim()
        : isDemoMode ? DEMO_VENTURE.name : (lang === 'el' ? 'Το venture σου' : 'Your venture');
    return wallCards(localNeeds, ventureName, isDemoMode, lang === 'el' ? 'el' : 'en');
  }, [localNeeds, localStartup, isDemoMode, lang]);

  const savedFounderIds = useMemo(() => savedProfiles.map((p) => p.id), [savedProfiles]);
  const ownStartupIds = useMemo(() => new Set(['sv-my-venture', ...customStartups.map((s) => s.id)]), [customStartups]);

  // Each opening starts on the person asked for, or on the best match when nobody was named.
  useEffect(() => {
    if (matchBreakdownModalOpen) setActiveFounderId(selectedFounderId ?? undefined);
  }, [matchBreakdownModalOpen, selectedFounderId]);

  useEffect(() => {
    if (selectedStartupId === 'create') {
      setDealRoomMode('create');
    } else if (selectedStartupId) {
      setActiveStartupId(selectedStartupId);
      setDealRoomMode('view');
    }
  }, [selectedStartupId]);

  // The picker and the default are co-founder candidates — the same pool Matches ranks — best first.
  const topMatches = useMemo(() => {
    const poolIds = new Set(cofounderPool().map((person) => person.id));
    return founders.filter((f) => poolIds.has(f.id)).slice(0, 10);
  }, [founders]);
  const activeFounder =
    founders.find((f) => f.id === activeFounderId) ||
    (activeFounderId ? founders.find((f) => f.name.toLowerCase().includes(activeFounderId.toLowerCase())) : undefined) ||
    topMatches[0] ||
    founders[0] ||
    null;
  const pickerFounders = activeFounder && !topMatches.some((f) => f.id === activeFounder.id)
    ? [activeFounder, ...topMatches.slice(0, 9)]
    : topMatches;
  const activeStartup =
    startups.find((s) => s.id === activeStartupId) || startups[0] || null;

  const activeFit = useMemo(() => (activeFounder ? fitFor(activeFounder) : null), [activeFounder, fitFor]);

  const handleSaveMyProfile = (updated: FounderProfile) => {
    setMyProfileEdits({ demo: isDemoMode, profile: updated });
    writeProfileLocal({
      fullName: updated.name,
      headline: updated.headline,
      bio: updated.bio,
      location: updated.location,
      skills: updated.skills,
      lookingFor: updated.lookingFor,
    });
    logActivity({
      kind: 'profile',
      title: `Updated profile (${updated.name})`,
      titleEl: `Ενημερώθηκε το προφίλ (${updated.name})`,
      href: '/profile',
    });
    toastSuccess(
      t('Profile updated — scores recalculated', 'Το προφίλ ενημερώθηκε — τα σκορ υπολογίστηκαν ξανά')
    );
  };

  const handleSubmitStartupApplication = async (
    startupId: string,
    role: string,
    pitchNote: string
  ) => {
    const ventureTitle = activeStartup?.name || startupId;
    trackApplication(`app-deal-${Date.now()}`, `${ventureTitle} — ${role}`, '/fundraising');
    const founderTarget = directoryPeople().find(
      (p) => p.fullName.toLowerCase() === (activeStartup?.founderName || '').toLowerCase(),
    );
    const note = pitchNote.trim();
    const bridge = messagingBridge();
    const sendResult = founderTarget && note && bridge
      ? await bridge.sendToPerson(founderTarget.id, note)
      : null;
    const noteSent = Boolean(sendResult?.ok);
    logActivity({
      kind: 'application',
      title: `Applied for ${role} at ${ventureTitle}`,
      titleEl: `Αίτηση για ${role} στο ${ventureTitle}`,
      href: '/fundraising',
    });
    setDealRoomModalOpen(false);
    toastSuccess(
      t('Role Application Sent', 'Η αίτηση ρόλου στάλθηκε'),
      noteSent && founderTarget
        ? t(
          `Applied for ${role}. Your note is in your conversation with ${founderTarget.fullName} in Messages.`,
          `Υποβλήθηκε αίτηση για ${role}. Το σημείωμά σου βρίσκεται στη συνομιλία με ${founderTarget.fullName} στα Μηνύματα.`,
        )
        : t(
          `Applied for ${role}.${note ? ` ${founderTarget?.fullName || 'The founder'} can't be messaged here, so your note wasn't sent.` : ''}`,
          `Υποβλήθηκε αίτηση για ${role}.${note ? ` Δεν είναι δυνατό να σταλεί μήνυμα σε ${founderTarget?.fullName || 'αυτόν τον ιδρυτή'} εδώ, οπότε το σημείωμά σου δεν στάλθηκε.` : ''}`,
        )
    );
  };

  // Publishes exactly what the founder typed; nothing is filled in on their behalf.
  const handleCreateStartup = (startupData: Partial<StartupVenture>) => {
    const newId = `sv-${Date.now()}`;
    const name = startupData.name?.trim() || (lang === 'el' ? 'Νέο venture' : 'New venture');
    const tagline = startupData.tagline?.trim() || '';
    const created: StartupVenture = {
      id: newId,
      name,
      logo: createAvatarSvg(name.slice(0, 2).toUpperCase(), '#0F172A', '#1E293B', '#6366F1'),
      tagline,
      description: startupData.description || tagline,
      industry: startupData.industry?.trim() || '',
      stage: startupData.stage || ('' as StartupStage),
      location: startupData.location?.trim() || myProfile.location || '',
      openRoles: startupData.openRoles ?? [],
      equityOffer: startupData.equityOffer?.trim() || '',
      fundingRaised: startupData.fundingRaised?.trim() || '',
      teamSize: '',
      founderName: myProfile.name,
      founderAvatar: myProfile.avatar,
      tractionMetric: startupData.tractionMetric?.trim() || '',
      verified: false,
      pitchDeck: startupData.pitchDeck,
      applicationsCount: 0,
    };
    writeValue(keys.dealRoomStartups, [created, ...customStartups]);
    startupRecord.write({
      ...localStartup,
      name,
      oneLiner: tagline,
      description: startupData.description || tagline,
      updatedAt: new Date().toISOString(),
    });
    if (startupData.pitchDeck) {
      writeValue(keys.canvas, {
        ...localCanvas,
        ...(startupData.pitchDeck.problem ? { problem: startupData.pitchDeck.problem } : {}),
        ...(startupData.pitchDeck.solution ? { solution: startupData.pitchDeck.solution } : {}),
        ...(startupData.pitchDeck.businessModel ? { uvp: startupData.pitchDeck.businessModel } : {}),
      });
    }
    writeProfileLocal({ company: name });
    setActiveStartupId(newId);
    logActivity({
      kind: 'milestone',
      title: `Published Deal Room: ${name}`,
      titleEl: `Δημοσιεύθηκε Deal Room: ${name}`,
      href: '/fundraising',
    });
    setDealRoomMode('view');
    toastSuccess(
      t('Venture Deal Room Published', 'Το Deal Room της Startup δημοσιεύθηκε')
    );
  };

  const handleCreateNeedCard = (
    card: Omit<NeedCardItem, 'id' | 'createdAt' | 'applicantCount' | 'status'>
  ) => {
    const newId = `need-${Date.now()}`;
    upsertNeed({
      id: newId,
      exists: [card.ventureName, card.stage ? `(${card.stage})` : '', card.description ? `— ${card.description}` : ''].filter(Boolean).join(' '),
      outcome: card.outcome || '',
      missing: card.title,
      offer: card.equityOffered,
      category: card.category,
      stage: card.stage,
      commitment: card.commitment,
      location: card.location,
      remote: card.isRemote,
      skills: card.skills,
      status: 'open',
      at: new Date().toISOString(),
    });
    logActivity({
      kind: 'request',
      title: `Published Need Card: ${card.title}`,
      titleEl: `Δημοσιεύθηκε Κάρτα Ανάγκης: ${card.title}`,
      href: '/network?tab=needs',
    });
    toastSuccess(
      t('Need Card saved — it is on the wall and in Network', 'Η κάρτα ανάγκης αποθηκεύτηκε — βρίσκεται στον πίνακα και στο Δίκτυο')
    );
  };

  const handleExpressInterestNeed = (card: NeedCardItem) => {
    toastSuccess(
      isDemoMode
        ? t('Marked as interested. This is a sample card, so no founder is notified.', 'Σημειώθηκε ενδιαφέρον. Είναι δείγμα κάρτας, οπότε δεν ειδοποιείται κανένας ιδρυτής.')
        : t('Marked as interested. It is saved on your account; the founder is not notified.', 'Σημειώθηκε ενδιαφέρον. Αποθηκεύτηκε στον λογαριασμό σου· ο ιδρυτής δεν ειδοποιείται.'),
      card.title,
    );
  };

  return (
    <>
      {matchBreakdownModalOpen && pickerFounders.length > 1 && (
        <div role="toolbar" aria-label={lang === 'el' ? 'Επιλογή υποψηφίου' : 'Inspect candidate'} className="fixed top-3 inset-x-0 mx-auto w-fit z-[120] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/95 border border-border shadow-lg backdrop-blur-md max-w-[95vw] overflow-x-auto">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 px-2 shrink-0">
            <BarChart2 className="w-3.5 h-3.5" />
            {lang === 'el' ? 'Κορυφαίες αντιστοιχίσεις:' : 'Top matches:'}
          </span>
          {pickerFounders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFounderId(f.id)}
              aria-pressed={activeFounder?.id === f.id}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all shrink-0 tabular-nums ${
                activeFounder?.id === f.id
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {f.name.split(' ')[0]} · {f.matchScore > 0 ? `${f.matchScore}%` : '—'}
            </button>
          ))}
        </div>
      )}
      <MatchBreakdownModal
        founder={activeFounder}
        myProfile={myProfile}
        fit={activeFit}
        isOpen={matchBreakdownModalOpen}
        onClose={() => setMatchBreakdownModalOpen(false)}
        onInitiateChat={(founder) => {
          setMatchBreakdownModalOpen(false);
          ensureChatConversation(founder.id);
          navigate(`/messages?user=${founder.id}`);
          toastSuccess(
            t('Opening Conversation', 'Άνοιγμα Συνομιλίας'),
            founder.name
          );
        }}
        onOpenFullProfile={(founder) => {
          setMatchBreakdownModalOpen(false);
          setFullProfileFounder(founder);
        }}
        lang={lang === 'el' ? 'el' : 'en'}
      />

      <ProfileModal
        profile={fullProfileFounder}
        isOpen={Boolean(fullProfileFounder)}
        onClose={() => setFullProfileFounder(null)}
        isOwnProfile={fullProfileFounder?.id === 'me'}
        onSaveProfile={handleSaveMyProfile}
        onOpenMatchBreakdown={(founder) => {
          setFullProfileFounder(null);
          setActiveFounderId(founder.id);
          setMatchBreakdownModalOpen(true, founder.id);
        }}
        onInitiateChat={() => {
          if (fullProfileFounder) {
            ensureChatConversation(fullProfileFounder.id);
            navigate(`/messages?user=${fullProfileFounder.id}`);
          } else {
            navigate('/messages');
          }
          setFullProfileFounder(null);
        }}
        isSaved={fullProfileFounder ? savedFounderIds.includes(fullProfileFounder.id) : false}
        onToggleSave={(id) => {
          if (savedFounderIds.includes(id)) {
            removeSaved(id);
          } else {
            const target = founders.find((f) => f.id === id);
            const person = directoryPeople().find((p) => p.id === id);
            if (target) {
              saveProfile({
                id: target.id,
                fullName: target.name,
                role: person?.role || target.role,
                industry: person?.industry || '',
                location: target.location,
                note: target.headline,
              });
            }
          }
        }}
        lang={lang === 'el' ? 'el' : 'en'}
      />

      {dealRoomModalOpen && (
        <div role="toolbar" aria-label="Deal Rooms" className="fixed top-3 inset-x-0 mx-auto w-fit z-[120] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/95 border border-border shadow-lg backdrop-blur-md max-w-[95vw] overflow-x-auto">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 px-2 shrink-0">
            <Briefcase className="w-3.5 h-3.5" />
            Deal Rooms:
          </span>
          {startups.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={dealRoomMode !== 'create' && activeStartup?.id === s.id}
              onClick={() => {
                setActiveStartupId(s.id);
                setDealRoomMode('view');
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
                dealRoomMode !== 'create' && activeStartup?.id === s.id
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {s.name}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={dealRoomMode === 'create'}
            onClick={() => setDealRoomMode('create')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all shrink-0 ${
              dealRoomMode === 'create'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'border border-border text-foreground hover:bg-accent'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            {lang === 'el' ? 'Νέο venture' : 'Launch a venture'}
          </button>
        </div>
      )}
      <StartupDealRoomModal
        startup={activeStartup}
        mode={dealRoomModalOpen ? dealRoomMode : null}
        isOwn={activeStartup ? ownStartupIds.has(activeStartup.id) : false}
        defaultLocation={myProfile.location}
        onClose={() => setDealRoomModalOpen(false)}
        onSubmitApplication={handleSubmitStartupApplication}
        onCreateStartup={handleCreateStartup}
        lang={lang === 'el' ? 'el' : 'en'}
      />

      {needWallModalOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) setNeedWallModalOpen(false);
          }}
        >
          <div
            role="dialog"
            data-type-scale="app"
            aria-modal="true"
            aria-label={lang === 'el' ? 'Πίνακας Καρτών Ανάγκης' : 'Need Cards wall'}
            className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card text-foreground border border-border shadow-2xl p-4 sm:p-6"
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 shrink-0 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-foreground">
                    {lang === 'el' ? 'Πίνακας Καρτών Ανάγκης' : 'Need Cards wall'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'el'
                      ? isDemoMode
                        ? 'Οι κάρτες σου (ίδιες με το /need και το Δίκτυο) και κάρτες δείγματος.'
                        : 'Οι κάρτες σου — ίδιες με το /need του βοηθού και το Δίκτυο.'
                      : isDemoMode
                        ? 'Your cards (the same as /need and Network) plus sample cards.'
                        : 'Your cards — the same list as the assistant’s /need and Network.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNeedWallModalOpen(false)}
                aria-label={lang === 'el' ? 'Κλείσιμο' : 'Close'}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <NeedCardWall
              needCards={needCards}
              lang={lang === 'el' ? 'el' : 'en'}
              onExpressInterest={handleExpressInterestNeed}
              onCreateNeedCard={handleCreateNeedCard}
              defaultLocation={myProfile.location}
              defaultVenture={startups[0]?.name}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalStudioModals;
