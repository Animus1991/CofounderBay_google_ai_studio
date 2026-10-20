/**
 * The Settings → privacy switches, as plain functions. The page and the
 * studio assistant call the same writers, so a toggle and an assistant write
 * can never disagree. `applySwitches` writes the snapshot and then derives
 * the open-to list + profile privacy slice through `applyOpenTo` — identical
 * to what the Settings toggles always did.
 */
import { applyOpenTo } from './openTo';
import { keys, readOpenTo, readValue, writeValue, type OpenToKind } from './localLists';

const SWITCH_KEY = keys.accountSwitches;

export type Switches = {
  publicProfile: boolean;
  mentorAvailability: boolean;
  openToCofounder: boolean;
  openToInvestors: boolean;
  openToAdvisors: boolean;
  showEmail: boolean;
  showLocation: boolean;
  showStartup: boolean;
  discoverable: boolean;
  sharePresence: boolean;
  twoFactor: boolean;
  pushMatches: boolean;
  pushMessages: boolean;
  pushEvents: boolean;
  pushMentors: boolean;
  productUpdates: boolean;
  weeklyDigest: boolean;
  quietHours: boolean;
  messagesFrom: 'anyone' | 'connections' | 'none';
  digest: 'instant' | 'daily' | 'weekly' | 'off';
  quietStart: string;
  quietEnd: string;
};

export function defaultSwitches(): Switches {
  return {
    publicProfile: true,
    mentorAvailability: false,
    openToCofounder: true,
    openToInvestors: false,
    openToAdvisors: true,
    showEmail: false,
    showLocation: true,
    showStartup: true,
    discoverable: true,
    sharePresence: true,
    twoFactor: false,
    pushMatches: true,
    pushMessages: true,
    pushEvents: true,
    pushMentors: false,
    productUpdates: true,
    weeklyDigest: true,
    quietHours: false,
    messagesFrom: 'connections',
    digest: 'daily',
    quietStart: '22:00',
    quietEnd: '08:00',
  };
}

export function readSwitches(): Switches {
  const stored = readValue<Partial<Switches> | null>(SWITCH_KEY, null);
  return { ...defaultSwitches(), ...(stored ?? {}) };
}

export function applySwitches(patch: Partial<Switches>, ctx: { uid: string | null; demo: boolean }): Switches {
  const next = { ...readSwitches(), ...patch };
  writeValue(SWITCH_KEY, next);
  const kinds: OpenToKind[] = readOpenTo().filter((kind) => kind === 'speaking');
  if (next.openToCofounder) kinds.push('cofounder');
  if (next.openToInvestors) kinds.push('investor');
  if (next.openToAdvisors) kinds.push('advisor');
  if (next.mentorAvailability) kinds.push('mentoring');
  // Shared helper: list + switch snapshot + profile privacy in one remote write.
  applyOpenTo(kinds, {
    uid: ctx.uid,
    demo: ctx.demo,
    privacy: {
      discoverable: next.discoverable && next.publicProfile,
      messagesFrom: next.messagesFrom,
      showEmail: next.showEmail,
      visibility: next.publicProfile ? 'Public' : 'Connections Only',
      sharePresence: next.sharePresence,
    },
  });
  return next;
}

type RemotePrivacy = {
  discoverable?: boolean;
  messagesFrom?: Switches['messagesFrom'];
  showEmail?: boolean;
  sharePresence?: boolean;
  openTo?: string[];
  mentorAvailability?: boolean;
  profileVisibility?: string;
};

/** A real account seeds from what is already saved on the profile, so two devices agree. */
export function seedSwitchesFromProfile(profile: RemotePrivacy | null | undefined, stored: Switches): Switches {
  if (!profile) return stored;
  return {
    ...stored,
    discoverable: profile.discoverable ?? stored.discoverable,
    messagesFrom: profile.messagesFrom ?? stored.messagesFrom,
    showEmail: profile.showEmail ?? stored.showEmail,
    sharePresence: profile.sharePresence ?? stored.sharePresence,
    publicProfile: profile.profileVisibility ? profile.profileVisibility === 'Public' : stored.publicProfile,
    mentorAvailability: profile.mentorAvailability ?? (Array.isArray(profile.openTo) ? profile.openTo.includes('mentoring') : stored.mentorAvailability),
    openToCofounder: Array.isArray(profile.openTo) ? profile.openTo.includes('cofounder') : stored.openToCofounder,
    openToInvestors: Array.isArray(profile.openTo) ? profile.openTo.includes('investor') : stored.openToInvestors,
    openToAdvisors: Array.isArray(profile.openTo) ? profile.openTo.includes('advisor') : stored.openToAdvisors,
  };
}
