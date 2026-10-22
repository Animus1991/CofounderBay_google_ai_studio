import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Target,
  TrendingUp,
  Plus,
  Star,
  CheckCircle2,
  Clock,
  Flame,
  Sparkles,
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { arrayRemove, arrayUnion, collection, doc, increment, limit, onSnapshot, query, updateDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { Both } from '../lib/both';
import { rememberPerson } from '../lib/people';
import { bothText, labelOf } from '../lib/labels';
import { useAuth } from '../App';
import PageShell from '../components/ui/PageShell';
import Avatar from '../components/ui/Avatar';
import { keys, readActivity, readRequests, saveRequest } from '../lib/localLists';
import { useStored } from '../lib/useStored';
import { getNextBestActions, logNudgeConversion, logNudgeExposure, NextBestAction } from '../services/behavioralOptimizer';
import { db } from '../firebase';
import { ReadinessScore, Streak } from '../types';
import { CAST, avatarFor } from '../data/cast';
import { demoWeeklyViews } from '../data/demoStats';
import { usePeople } from '../lib/directory';
import { avatarOf, cofounderPool, type Person } from '../lib/peopleSource';
import { profileViews as loadProfileViews, sendConnectionRequest, useConnections } from '../lib/social';
import { useOptionalMessaging } from '../context/MessagingContext';
import { fromProfile, rankPeople } from '../lib/compatibility';
import { studioNextStep, studioWaiting } from '../lib/nextStep';
import { greetingFor, formatWhen, localizeAxisLabel } from '../lib/dates';
import { filterSlash, startersFor } from '../lib/assistantStarters';
import { useNotificationFeed } from '../lib/notificationFeed';
import { useLanguage, useT } from '../lib/language';
import NextMove from '../components/ui/NextMove';
import EmptyHint, { AskLink } from '../components/ui/EmptyHint';
import PersonHovercard from '../components/ui/PersonHovercard';
import RelTime from '../components/ui/RelTime';
import FactLine from '../components/ui/FactLine';

const ACTIVITY_DATA = [
  { name: 'Mon', views: 40, matches: 24 },
  { name: 'Tue', views: 30, matches: 13 },
  { name: 'Wed', views: 20, matches: 98 },
  { name: 'Thu', views: 27, matches: 39 },
  { name: 'Fri', views: 18, matches: 48 },
  { name: 'Sat', views: 23, matches: 38 },
  { name: 'Sun', views: 34, matches: 43 },
];

function circlesFromPeople(profile: Parameters<typeof fromProfile>[0], people: Person[]) {
  const pool = new Set(cofounderPool().map((person) => person.id));
  return rankPeople(fromProfile(profile), people.filter((person) => pool.has(person.id)))
    .slice(0, 5)
    .map(({ person, fit }) => ({ id: person.id, name: person.fullName, role: person.headline || person.role, roleEl: person.headlineEl, match: fit.score ?? 0, avatar: avatarOf(person) }));
}

function circlesFromCast(profile: Parameters<typeof fromProfile>[0]) {
  return rankPeople(
    fromProfile(profile),
    CAST.filter((person) => person.role === 'Founder' || person.role === 'Co-Founder Candidate'),
  ).slice(0, 5).map(({ person, fit }) => ({
    id: person.id,
    name: person.fullName,
    role: person.headline,
    roleEl: person.headlineEl,
    match: fit.score ?? 0,
    avatar: avatarFor(person.id),
  }));
}

const ACTIVE_COMMUNITIES = [
  { id: '1', name: 'Fintech Founders', members: '1.2k', newPosts: 12 },
  { id: '2', name: 'AI & Machine Learning', members: '3.4k', newPosts: 45 },
];

// Demo schedule entries carry real ISO timestamps relative to today so the
// shared formatWhen helper renders them localized and 24-hour.
const demoAt = (daysAhead: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const nextWeekday = (weekday: number) => ((weekday - new Date().getDay() + 7) % 7) || 7;
const DEMO_EVENTS = [
  { id: 'downtown', title: 'Downtown Pitch Club', titleEl: 'Pitch Club στο κέντρο', time: demoAt(1, 7), day: '', clock: '', type: 'MEETUP', location: '', attendees: 0 },
  { id: 'hackathon', title: 'Weekend Builders Hackathon', titleEl: 'Hackathon builders το Σαββατοκύριακο', time: demoAt(nextWeekday(6), 9), day: '', clock: '', type: 'NETWORK', location: '', attendees: 0 },
  { id: 'deadline', title: 'Pre-Seed Checklist Deadline', titleEl: 'Προθεσμία λίστας Pre-Seed', time: demoAt(nextWeekday(5), 17), day: '', clock: '', type: 'MILESTONE', location: '', attendees: 0 },
];
// ISO timestamps (demo entries, stored sessions) render via formatWhen; free
// text from the events collection stays as written.
const dashTime = (time: string) => (/^\d{4}-\d{2}-\d{2}/.test(time) || time.endsWith('Z') ? formatWhen(time) : time);

const DEMO_POSTS = [
  {
    id: 'demo-post-sarah',
    authorId: 'sarah-chen',
    name: 'Sarah',
    avatar: avatarFor('sarah-chen'),
    text: 'just reached a Match score of 98',
    textEl: 'μόλις έφτασε σκορ αντιστοίχισης 98',
    time: '2h ago',
    likes: 4,
    comments: 1,
    likedBy: [] as string[],
  },
  {
    id: 'demo-post-alex',
    authorId: 'alex-rivera',
    name: 'Alex',
    avatar: avatarFor('alex-rivera'),
    text: 'hit a 10-day profile activity streak',
    textEl: 'έχει σερί δραστηριότητας προφίλ 10 ημερών',
    time: '4h ago',
    likes: 12,
    comments: 3,
    likedBy: [] as string[],
  },
];

const MISSING_EL: Record<string, string> = {
  'Basic Info': 'Βασικά στοιχεία',
  'Full Name': 'Ονοματεπώνυμο',
  Bio: 'Βιογραφικό',
  Role: 'Ρόλος',
  Industry: 'Κλάδος',
  Skills: 'Δεξιότητες',
  'Looking for': 'Τι ψάχνεις',
  Stage: 'Στάδιο',
  Commitment: 'Δέσμευση',
  Location: 'Τοποθεσία',
  'Social Links': 'Σύνδεσμοι',
};

type Circle = { id: string; name: string; avatar: string; role?: string };
type CommunityRow = { id: string; name: string; members: string | number; newPosts: number };
type ActivityPoint = { name: string; views: number; matches: number };
type Prospect = { id: string; name: string; role: string; match: number; avatar: string };
type FeedPost = {
  id: string;
  authorId: string;
  name: string;
  avatar: string;
  text: string;
  textEl?: string;
  time: string;
  likes: number;
  comments: number;
  likedBy: string[];
};
type DashEvent = {
  id: string;
  title: string;
  titleEl?: string;
  time: string;
  day: string;
  clock: string;
  type: string;
  location: string;
  attendees: number;
};

type LiveUser = {
  profileViews?: number;
  activitySeries: ActivityPoint[] | null;
  communities: CommunityRow[] | null;
  unreadMessages?: number;
  topMatchScore?: number;
  prospect: Prospect | null;
  recentMatches: Circle[] | null;
};

const EMPTY_LIVE: LiveUser = {
  activitySeries: null,
  communities: null,
  prospect: null,
  recentMatches: null,
};

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asSeries(value: unknown): ActivityPoint[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const rows = value.flatMap((row) => {
    if (!row || typeof row !== 'object' || typeof (row as { name?: unknown }).name !== 'string') return [];
    const item = row as { name: string; views?: unknown; matches?: unknown };
    return [{ name: item.name, views: asNumber(item.views) ?? 0, matches: asNumber(item.matches) ?? 0 }];
  });
  return rows.length ? rows : null;
}

function asCommunities(value: unknown): CommunityRow[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const rows = value.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const item = row as { id?: unknown; name?: unknown; members?: unknown; newPosts?: unknown };
    const id = item.id == null ? '' : String(item.id);
    if (!id) return [];
    return [{
      id,
      name: item.name == null ? '' : String(item.name),
      members: typeof item.members === 'number' || typeof item.members === 'string' ? item.members : 0,
      newPosts: asNumber(item.newPosts) ?? 0,
    }];
  });
  return rows.length ? rows : null;
}

function asCircles(value: unknown): Circle[] | null {
  if (!Array.isArray(value)) return null;
  return value.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const item = row as { id?: unknown; name?: unknown; avatar?: unknown; role?: unknown };
    const id = item.id == null ? '' : String(item.id);
    if (!id) return [];
    return [{ id, name: item.name == null ? '' : String(item.name), avatar: typeof item.avatar === 'string' ? item.avatar : '', role: item.role == null ? undefined : String(item.role) }];
  });
}

function asProspect(value: unknown): Prospect | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as { id?: unknown; name?: unknown; role?: unknown; match?: unknown; avatar?: unknown };
  if (item.id == null || item.id === '') return null;
  return {
    id: String(item.id),
    name: item.name == null ? '' : String(item.name),
    role: item.role == null ? '' : String(item.role),
    match: asNumber(item.match) ?? 0,
    avatar: typeof item.avatar === 'string' ? item.avatar : '',
  };
}

function asPosts(docs: { id: string; data: () => Record<string, unknown> }[]): FeedPost[] {
  return docs.map((entry) => {
    const data = entry.data();
    const likedBy = Array.isArray(data.likedBy) ? data.likedBy.filter((id): id is string => typeof id === 'string') : [];
    const comments = asNumber(data.comments) ?? asNumber(data.commentCount) ?? 0;
    return {
      id: entry.id,
      authorId: typeof data.authorId === 'string' ? data.authorId : typeof data.userId === 'string' ? data.userId : entry.id,
      name: typeof data.name === 'string' ? data.name : typeof data.authorName === 'string' ? data.authorName : 'Founder',
      avatar: typeof data.avatar === 'string' ? data.avatar : '',
      text: typeof data.text === 'string' ? data.text : typeof data.body === 'string' ? data.body : '',
      time: typeof data.time === 'string' ? data.time : '',
      likes: asNumber(data.likes) ?? asNumber(data.likeCount) ?? 0,
      comments,
      likedBy,
    };
  });
}

function asEvents(docs: { id: string; data: () => Record<string, unknown> }[]): DashEvent[] {
  return docs.map((entry) => {
    const data = entry.data();
    const attendees = asNumber(data.attendees) ?? asNumber(data.attending) ?? 0;
    return {
      id: entry.id,
      title: typeof data.title === 'string' ? data.title : typeof data.name === 'string' ? data.name : 'Event',
      time: typeof data.time === 'string' ? data.time : typeof data.date === 'string' ? data.date : '',
      day: typeof data.day === 'string' ? data.day : '',
      clock: typeof data.clock === 'string' ? data.clock : typeof data.startTime === 'string' ? data.startTime : '',
      type: typeof data.type === 'string' ? data.type : '',
      location: typeof data.location === 'string' ? data.location : '',
      attendees,
    };
  });
}

export default function DashboardPage() {
  const { user, profile, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [nextActions, setNextActions] = useState<NextBestAction[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [, setReadiness] = useState<ReadinessScore | null>(null);
  const [, setUserStats] = useState({ totalXP: 0, level: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [live, setLive] = useState<LiveUser>(EMPTY_LIVE);
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [feedLoaded, setFeedLoaded] = useState(false);
  const [events, setEvents] = useState<DashEvent[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const activity = useStored(readActivity, ['cfb.activity']);
  const { people } = usePeople(user?.uid);
  const messaging = useOptionalMessaging();
  const localRequests = useStored(readRequests, [keys.requests]);
  const connections = useConnections();
  const noteFeed = useNotificationFeed();
  const [viewCount, setViewCount] = useState<number | null>(null);

  // Who opened your profile in the last 30 days (real accounts).
  useEffect(() => {
    if (!user || isDemoMode) { setViewCount(null); return undefined; }
    let cancelled = false;
    void loadProfileViews(user.uid, 30).then((list) => { if (!cancelled) setViewCount(list.length); });
    return () => { cancelled = true; };
  }, [user, isDemoMode]);

  const getProfileCompletion = () => {
    if (!profile) return { score: 0, missing: ['Basic Info'] };
    let score = 0;
    const missing = [];

    if (profile.fullName) score += 10; else missing.push('Full Name');
    if (profile.bio) score += 10; else missing.push('Bio');
    if (profile.role) score += 5; else missing.push('Role');
    if (profile.industry) score += 10; else missing.push('Industry');
    if (profile.skills && profile.skills.length > 0) score += 15; else missing.push('Skills');
    if (profile.lookingFor && profile.lookingFor.length > 0) score += 15; else missing.push('Looking for');
    if (profile.stage) score += 10; else missing.push('Stage');
    if (profile.commitment) score += 10; else missing.push('Commitment');
    if (profile.location) score += 10; else missing.push('Location');
    if (profile.socialLinks && Object.keys(profile.socialLinks).length > 0) score += 5; else missing.push('Social Links');

    return { score, missing };
  };

  const { score, missing } = getProfileCompletion();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return undefined;
    }

    setLoading(false);

    getNextBestActions(user.uid).then((actions) => {
      setNextActions(actions);
      const firstAction = actions[0];
      if (firstAction) {
        logNudgeExposure(user.uid, firstAction.id, 'dashboard_hero');
      }
    }).catch(() => {});

    if (isDemoMode) return undefined;

    let unsubUser: (() => void) | undefined;
    let unsubStreak: (() => void) | undefined;
    let unsubReadiness: (() => void) | undefined;
    let unsubFeed: (() => void) | undefined;
    let unsubEvents: (() => void) | undefined;

    try {
      unsubUser = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
        if (!snapshot.exists()) {
          setLive(EMPTY_LIVE);
          return;
        }
        const data = snapshot.data();
        const xp = data.totalXP || 0;
        setUserStats({
          totalXP: xp,
          level: Math.floor(Math.sqrt(xp / 100)) + 1,
        });
        setLive({
          profileViews: asNumber(data.profileViews),
          activitySeries: asSeries(data.activitySeries),
          communities: asCommunities(data.communities),
          unreadMessages: asNumber(data.unreadMessages),
          topMatchScore: asNumber(data.topMatchScore),
          prospect: asProspect(data.prospect),
          recentMatches: asCircles(data.recentMatches),
        });
      }, (error) => {
        console.warn('Could not listen to user stats:', error);
      });

      unsubStreak = onSnapshot(doc(db, 'streaks', user.uid), (snapshot) => {
        if (snapshot.exists()) setStreak(snapshot.data() as Streak);
        else setStreak(null);
      }, (error) => {
        console.warn('Could not listen to streak:', error);
      });

      unsubReadiness = onSnapshot(doc(db, 'readinessScores', user.uid), (snapshot) => {
        if (snapshot.exists()) setReadiness(snapshot.data() as ReadinessScore);
      }, (error) => {
        console.warn('Could not listen to readiness score:', error);
      });

      unsubFeed = onSnapshot(collection(db, 'users', user.uid, 'feed'), (snapshot) => {
        setFeed(asPosts(snapshot.docs));
        setFeedLoaded(true);
      }, (error) => {
        console.warn('Could not listen to feed:', error);
        setFeedLoaded(true);
      });

      unsubEvents = onSnapshot(query(collection(db, 'events'), limit(8)), (snapshot) => {
        setEvents(asEvents(snapshot.docs));
        setEventsLoaded(true);
      }, (error) => {
        console.warn('Could not listen to events:', error);
        setEventsLoaded(true);
      });
    } catch (err) {
      console.warn('Firestore listeners failed to initialize:', err);
      setFeedLoaded(true);
      setEventsLoaded(true);
    }

    return () => {
      unsubUser?.();
      unsubStreak?.();
      unsubReadiness?.();
      unsubFeed?.();
      unsubEvents?.();
    };
  }, [user, isDemoMode]);

  const t = useT();
  const { mode } = useLanguage();
  const heroAction = nextActions[0];
  const studioNext = studioNextStep(fromProfile(profile));
  const waiting = studioWaiting();
  const goStep = (href: string) => {
    if (heroAction && user) logNudgeConversion(user.uid, heroAction.id);
    navigate(href);
  };

  const greeting = greetingFor(new Date().getHours());
  const dashStarters = startersFor('/dashboard', profile?.role ?? profile?.roles?.[0]);
  const sendAsk = () => {
    const prompt = searchQuery.trim();
    if (!prompt) return;
    window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt } }));
    setSearchQuery('');
  };

  // Ranked with the same scorer as Matches: the sample cast in the demo, live members for a real account.
  const rankedCircles = useMemo(() => (isDemoMode ? circlesFromCast(profile) : circlesFromPeople(profile, people)), [isDemoMode, profile, people]);
  const circles = isDemoMode ? rankedCircles : (rankedCircles.length ? rankedCircles : (live.recentMatches ?? []));
  const leadMatch = circles[0];
  const firstName = user?.displayName?.split(' ')[0] || 'Founder';
  const activityPosts: FeedPost[] = activity.slice(0, 8).map((item) => ({
    id: item.id,
    authorId: item.byAssistant ? 'assistant' : user?.uid || 'you',
    name: item.byAssistant ? t('Assistant', 'Βοηθός') : firstName,
    avatar: '',
    text: t(item.title, item.titleEl || item.title),
    time: item.at,
    likes: 0,
    comments: 0,
    likedBy: [],
  }));
  const posts = isDemoMode ? [...activityPosts, ...DEMO_POSTS] : (activityPosts.length > 0 ? [...activityPosts, ...feed] : feed);
  const schedule = isDemoMode ? DEMO_EVENTS : events;
  const rawSeries = isDemoMode ? ACTIVITY_DATA : live.activitySeries;
  // Series keep English day keys so the numbers stay comparable; only the tick is translated.
  const chartSeries = rawSeries?.map((point) => ({ ...point, name: localizeAxisLabel(point.name, mode) })) ?? null;
  const communities = isDemoMode ? ACTIVE_COMMUNITIES : (live.communities ?? []);
  const prospect = isDemoMode
    ? rankedCircles[0] ?? null
    : (rankedCircles[0] ?? live.prospect);
  const streakDays = isDemoMode ? (streak?.currentStreak ?? 12) : (streak?.currentStreak ?? 0);
  const profileViews = isDemoMode ? demoWeeklyViews() : (viewCount ?? live.profileViews);
  const matchScore = isDemoMode ? rankedCircles[0]?.match : (rankedCircles[0]?.match ?? live.topMatchScore);
  const unread = messaging?.totalUnread ?? 0;
  const pendingRequests = isDemoMode
    ? localRequests.filter((item) => item.status === 'pending').length
    : connections.incoming.length;
  const nowChips = [
    { count: pendingRequests, en: 'Requests', el: 'Αιτήματα', askEn: 'What needs me in my requests?', askEl: 'Τι χρειάζεται προσοχή στα αιτήματα;' },
    { count: unread ?? 0, en: 'Messages', el: 'Μηνύματα', askEn: 'Which messages are unread?', askEl: 'Ποια μηνύματα είναι αδιάβαστα;' },
    { count: noteFeed.unread, en: 'Notifications', el: 'Ειδοποιήσεις', askEn: 'What is new in my notifications?', askEl: 'Τι νέο στις ειδοποιήσεις;' },
  ].filter((chip) => chip.count > 0).slice(0, 3);

  const slashItems: { en: string; el: string; kind: 'ask' | 'control' }[] = [
    ...dashStarters.map((item) => ({ ...item, kind: 'ask' as const })),
    { en: 'Search people in Discovery', el: 'Αναζήτηση ατόμων στην Εξερεύνηση', kind: 'control' },
    { en: 'Filters', el: 'Φίλτρα', kind: 'control' },
  ];
  const slashHits = filterSlash(slashItems, searchQuery);
  const slashActive = Math.min(slashIndex, Math.max(0, slashHits.length - 1));
  const runSlashItem = (item: (typeof slashItems)[number]) => {
    setSearchQuery('');
    setSlashIndex(0);
    if (item.kind === 'control') { navigate('/discovery'); return; }
    window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: t(item.en, item.el) } }));
  };

  const toggleLike = async (post: FeedPost) => {
    if (isDemoMode) {
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (next.has(post.id)) next.delete(post.id);
        else next.add(post.id);
        return next;
      });
      return;
    }
    if (!user) return;
    const liked = post.likedBy.includes(user.uid);
    try {
      await updateDoc(doc(db, 'users', user.uid, 'feed', post.id), {
        likes: increment(liked ? -1 : 1),
        likedBy: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });
    } catch (error) {
      console.warn('Could not update like:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
          <p className="text-stone-500 font-medium">{t('Loading your ecosystem...', 'Φόρτωση του οικοσυστήματος...')}</p>
        </div>
      </div>
    );
  }

  return (
    <PageShell
      title={bothText(`${greeting.en}, ${firstName}`, `${greeting.el}, ${firstName}`)}
      description={bothText('Your next step, matches, and what changed.', 'Το επόμενο βήμα, οι αντιστοιχίσεις και τι άλλαξε.')}
      sample={isDemoMode}
    >
      <div className="space-y-8">
        <div>
          <div className="flex items-end gap-2 bg-white border border-stone-200 rounded-xl p-2">
            <textarea
              rows={1}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSlashIndex(0);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 76)}px`;
              }}
              onKeyDown={(e) => {
                if (slashHits.length > 0) {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIndex((i) => Math.min(i + 1, slashHits.length - 1)); return; }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIndex((i) => Math.max(i - 1, 0)); return; }
                  if (e.key === 'Escape') { e.preventDefault(); setSearchQuery(''); setSlashIndex(0); return; }
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    const item = slashHits[slashActive];
                    if (item) { runSlashItem(item); return; }
                  }
                }
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  sendAsk();
                }
              }}
              aria-controls="dash-slash-list"
              aria-activedescendant={slashHits.length ? `dash-slash-${slashActive}` : undefined}
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none"
              placeholder={bothText('Ask anything…', 'Ρώτα οτιδήποτε…')}
            />
            <button
              type="button"
              title={bothText('Ask the studio assistant', 'Ρώτα τον βοηθό')}
              onClick={sendAsk}
              disabled={!searchQuery.trim()}
              className="flex items-center justify-center w-9 h-9 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-all shrink-0 disabled:opacity-50"
              aria-label={bothText('Ask the studio assistant', 'Ρώτα τον βοηθό')}
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
          {slashHits.length > 0 && (
            <div id="dash-slash-list" role="listbox" className="mt-1.5 max-h-44 overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-sm">
              {slashHits.map((item, index) => (
                <button
                  key={item.en}
                  id={`dash-slash-${index}`}
                  role="option"
                  aria-selected={index === slashActive}
                  type="button"
                  onMouseEnter={() => setSlashIndex(index)}
                  onClick={() => runSlashItem(item)}
                  className={cn('w-full px-3 py-2 text-left flex items-baseline gap-2', index === slashActive ? 'bg-stone-50' : '')}
                >
                  <span className="text-xs font-medium text-stone-900">{bothText(item.en, item.el)}</span>
                  {item.kind === 'control' ? <span className="text-xs text-stone-400">{bothText('page action', 'ενέργεια σελίδας')}</span> : null}
                </button>
              ))}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {nowChips.map((chip) => (
              <button
                key={chip.en}
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: t(chip.askEn, chip.askEl) } }))}
                className="min-h-8 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 hover:border-stone-400"
              >
                {t(chip.en, chip.el)} · {chip.count}
              </button>
            ))}
            {dashStarters.map((prompt) => (
              <button
                key={prompt.en}
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: bothText(prompt.en, prompt.el) } }))}
                className="min-h-8 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 hover:border-stone-400"
              >
                {bothText(prompt.en, prompt.el)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => navigate(searchQuery.trim() ? `/discovery?q=${encodeURIComponent(searchQuery.trim())}` : '/discovery')}
              className="min-h-8 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 hover:border-stone-400"
            >
              {bothText('Search people in Discovery', 'Αναζήτηση ατόμων στην Εξερεύνηση')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/discovery')}
              className="min-h-8 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 hover:border-stone-400"
            >
              {bothText('Filters', 'Φίλτρα')}
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={waiting ? waiting.id : studioNext.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            <NextMove
              tone="next"
              icon={CheckCircle2}
              label={t('Next', 'Επόμενο')}
              title={t(studioNext.title?.en ?? studioNext.en, studioNext.title?.el ?? studioNext.el)}
              why={studioNext.why ? t(studioNext.why.en, studioNext.why.el) : undefined}
              action={t(studioNext.action?.en ?? 'Go', studioNext.action?.el ?? 'Άνοιγμα')}
              onAction={() => goStep(studioNext.href)}
              askPrompt={studioNext.prompt}
            />
            {waiting ? (
              <NextMove
                tone="waiting"
                icon={Clock}
                label={t('Waiting on you', 'Σε περιμένει')}
                title={t(waiting.title?.en ?? waiting.en, waiting.title?.el ?? waiting.el)}
                why={waiting.why ? t(waiting.why.en, waiting.why.el) : undefined}
                action={t(waiting.action?.en ?? 'Open', waiting.action?.el ?? 'Άνοιγμα')}
                onAction={() => goStep(waiting.href)}
                askPrompt={waiting.prompt}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button type="button" onClick={() => leadMatch && navigate(`/profile/${leadMatch.id}`)} className="text-left bg-white rounded-2xl border border-stone-100 p-4 hover:border-stone-300 transition-all">
            <p className="text-xs font-semibold text-stone-400 tracking-wider mb-2"><Both en="This week · person" el="Αυτή την εβδομάδα · άτομο" /></p>
            {leadMatch ? (
              <div className="flex items-center gap-3">
                <Avatar src={leadMatch.avatar} fallback={leadMatch.name} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate"><PersonHovercard person={leadMatch.id}>{leadMatch.name}</PersonHovercard></p>
                  <p className="text-xs text-stone-500 truncate">{'roleEl' in leadMatch && leadMatch.roleEl ? t(String(leadMatch.role), String(leadMatch.roleEl)) : labelOf(leadMatch.role ?? '')}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-stone-500"><Both en="Ask who you should meet this week." el="Ρώτα ποιον να γνωρίσεις αυτή την εβδομάδα." /></p>
            )}
          </button>
          <button type="button" onClick={() => navigate(!isDemoMode && schedule.length === 0 ? '/calendar' : '/events')} className="text-left bg-white rounded-2xl border border-stone-100 p-4 hover:border-stone-300 transition-all">
            <p className="text-xs font-semibold text-stone-400 tracking-wider mb-2"><Both en="This week · session" el="Αυτή την εβδομάδα · συνάντηση" /></p>
            {!isDemoMode && schedule.length === 0 ? (
              <p className="text-sm text-stone-500"><Both en="No session yet — add one in Calendar" el="Καμία συνάντηση ακόμη — πρόσθεσε μία στο Ημερολόγιο" /></p>
            ) : (
              <>
                <p className="text-sm font-medium text-stone-900">{(() => { const ev = schedule[0] ?? DEMO_EVENTS[0]; return ev ? t(ev.title, ev.titleEl ?? ev.title) : ''; })()}</p>
                <p className="text-xs text-stone-500 mt-1">{dashTime(schedule[0]?.time ?? DEMO_EVENTS[0]?.time ?? '')}</p>
              </>
            )}
          </button>
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'Give me a 7-day match plan' } }))} className="text-left bg-stone-100 border border-stone-200 rounded-2xl p-4 text-stone-900 hover:bg-stone-200/70 transition-all">
            <p className="text-xs font-semibold text-stone-400 tracking-wider mb-2"><Both en="This week · playbook" el="Αυτή την εβδομάδα · σχέδιο δράσης" /></p>
            <p className="text-sm font-medium"><Both en="Ask for a 7-day match plan" el="Ζήτα πλάνο 7 ημερών" /></p>
            <p className="text-xs text-stone-400 mt-1"><Both en="Writes the same Workspace tasks as the Task button." el="Γράφει τις ίδιες εργασίες με το κουμπί «Εργασία» στον Χώρο εργασίας." /></p>
          </button>
        </div>

        <div>
          <p className="text-xs text-stone-400 mb-2"><Both en="Matches" el="Αντιστοιχίσεις" /></p>
          <div className="overflow-x-auto -mx-1 px-1 pb-1">
            <div className="flex items-center gap-4 min-w-max">
              <div className="flex flex-col items-center gap-1.5 cursor-pointer group" onClick={() => navigate('/profile')}>
                <div className="relative">
                  <Avatar src={user?.photoURL || undefined} fallback={profile?.fullName || firstName} size="lg" className="group-hover:scale-105 transition-transform" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-stone-900 border-2 border-white rounded-full flex items-center justify-center">
                    <Plus className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
                <span className="text-xs font-medium text-stone-400"><Both en="You" el="Εσύ" /></span>
              </div>
              {circles.map((match) => (
                <div key={match.id} className="flex flex-col items-center gap-1.5 cursor-pointer group" onClick={() => { rememberPerson({ id: match.id, fullName: match.name, headline: ('role' in match ? String(match.role) : ''), role: ('role' in match ? String(match.role) : '') }); navigate(`/profile/${match.id}`); }}>
                  <Avatar src={match.avatar} fallback={match.name} size="lg" className="group-hover:scale-95 transition-transform" />
                  <span className="text-xs font-medium text-stone-400"><PersonHovercard person={match.id}>{match.name.split(' ')[0]}</PersonHovercard></span>
                </div>
              ))}
            </div>
          </div>
          {leadMatch && (
            <button type="button" className="mt-2 text-xs font-medium text-stone-900 hover:underline" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Why do I match with ${leadMatch.name}?` } }))}>
              <Both en={`Why ${leadMatch.name.split(' ')[0]}?`} el="Γιατί ταιριάζετε;" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs font-semibold text-stone-400 tracking-wider">
              <Both en="What changed" el="Τι άλλαξε" />
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => navigate('/milestones')} className="flex items-center gap-2 min-h-11 px-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors">
                <TrendingUp className="w-3 h-3" /> <Both en="Log Update" el="Ενημέρωση προόδου" />
              </button>
              <button onClick={() => navigate('/communities')} className="flex items-center gap-2 min-h-11 px-4 bg-stone-900 rounded-xl text-sm font-medium text-white hover:bg-stone-800 transition-colors">
                <Plus className="w-3 h-3" /> <Both en="Post" el="Δημοσίευση" />
              </button>
            </div>
          </div>

          {!isDemoMode && feedLoaded && posts.length === 0 ? (
            <EmptyHint
              title={t('The list is empty.', 'Η λίστα είναι άδεια.')}
              detail={t('Log a milestone or post in a community. The assistant can pick the next move.', 'Καταχώρισε ορόσημο ή γράψε σε μια κοινότητα. Ο βοηθός μπορεί να προτείνει το επόμενο βήμα.')}
            >
              <AskLink prompt="what should I do today" />
            </EmptyHint>
          ) : posts.map((item) => {
            const liked = isDemoMode ? likedPosts.has(item.id) : item.likedBy.includes(user?.uid || '');
            const likeCount = item.likes + (isDemoMode && liked ? 1 : 0);
            return (
              <div key={item.id} className="bg-white rounded-2xl p-4 border border-stone-100">
                <div className="flex items-start gap-3">
                  <button type="button" aria-label={item.authorId === 'assistant' ? t('Open matches', 'Άνοιγμα αντιστοιχίσεων') : t(`View profile: ${item.name}`, `Προβολή προφίλ: ${item.name}`)} className="shrink-0 block" onClick={() => { rememberPerson({ id: item.authorId, fullName: item.name }); navigate(item.authorId === 'assistant' ? '/matches' : `/profile/${item.authorId}`); }}>
                    <Avatar src={item.avatar} fallback={item.name} size="sm" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-900">
                      <span className="font-medium"><PersonHovercard person={item.authorId}>{item.name.split(' ')[0]}</PersonHovercard></span>{' '}
                      <span className="text-stone-400">{t(item.text, item.textEl ?? item.text)}</span>
                    </p>
                    {/^\d{4}-/.test(item.time) ? <RelTime iso={item.time} className="text-xs text-stone-400" /> : <span className="text-xs text-stone-400">{item.time === '2h ago' ? t('2h ago', 'πριν από 2 ώρες') : item.time === '4h ago' ? t('4h ago', 'πριν από 4 ώρες') : item.time}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 ml-12">
                  <button onClick={() => toggleLike(item)} className={cn('flex items-center gap-1 text-xs transition-colors', liked ? 'text-amber-500' : 'text-stone-400 hover:text-stone-600')}>
                    <Star className="w-3.5 h-3.5" fill={liked ? 'currentColor' : 'none'} /> {likeCount}
                  </button>
                  <button onClick={() => navigate('/messages')} className="flex items-center gap-1 text-stone-400 hover:text-stone-600 text-xs">
                    <MessageSquare className="w-3.5 h-3.5" /> {item.comments}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: t('Profile Views', 'Προβολές προφίλ'),
              value: profileViews == null ? '—' : String(profileViews),
              sub: profileViews == null && !isDemoMode ? <Both en="No views yet" el="Καμία προβολή ακόμη" /> : null,
              href: '/profile',
              hint: bothText('How many people opened your profile', 'Πόσοι άνοιξαν το προφίλ σας'),
            },
            {
              label: t('Match Score', 'Σκορ αντιστοίχισης'),
              value: matchScore == null ? '—' : `${matchScore}%`,
              sub: rankedCircles[0] ? rankedCircles[0].name.split(' ')[0] : null,
              href: '/matches',
              hint: bothText('Shared skills and industry with the top match', 'Κοινές δεξιότητες και κλάδος με την πρώτη αντιστοίχιση'),
            },
            {
              label: t('Streak', 'Σερί'),
              value: `${streakDays}d`,
              sub: null,
              href: '/milestones',
              hint: bothText('Days in a row the work kept going', 'Μέρες στη σειρά που η δουλειά συνεχίστηκε'),
            },
            {
              label: t('Messages', 'Μηνύματα'),
              value: unread == null ? '—' : String(unread),
              sub: null,
              href: '/messages',
              hint: bothText('Unread conversations', 'Αδιάβαστες συνομιλίες'),
            },
          ].map((stat) => (
            <div key={stat.label} title={stat.hint} onClick={() => navigate(stat.href)} className="bg-white rounded-2xl border border-stone-100 p-4 cursor-pointer hover:border-stone-300 hover:shadow-sm transition-all">
              <p className="text-xs font-semibold text-stone-400 tracking-wider">{stat.label}</p>
              <p className="text-lg font-semibold text-stone-900 mt-1.5 tracking-tight tabular-nums">{stat.value}</p>
              {stat.sub && <p className="text-xs mt-0.5 text-stone-400">{stat.sub}</p>}
            </div>
          ))}
        </div>

        {chartSeries && chartSeries.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 p-4">
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartSeries}>
                  <Area type="monotone" dataKey="views" stroke="#1c1917" fill="#e7e5e4" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {prospect && (
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
              <p className="text-xs font-semibold text-stone-400 tracking-wider mb-3">
                <Both en="Best match" el="Καλύτερη αντιστοίχιση" />
              </p>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <Avatar src={prospect.avatar || undefined} fallback={prospect.name} size="md" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-stone-50 rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900"><PersonHovercard person={prospect.id}>{prospect.name}</PersonHovercard></p>
                  <FactLine className="text-xs" items={[labelOf(prospect.role)]} label={t('Role', 'Ρόλος')} />
                </div>
                {prospect.match > 0 && (
                  <span className="text-xs font-semibold text-stone-900 bg-white border border-stone-200 px-2 py-1 rounded-lg">{prospect.match}%</span>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (isDemoMode) {
                      saveRequest({ id: prospect.id, fullName: prospect.name, role: prospect.role, industry: '', location: '', note: prospect.role, status: 'pending' });
                    } else {
                      try {
                        await sendConnectionRequest({ id: prospect.id, fullName: prospect.name, headline: prospect.role, avatarUrl: prospect.avatar }, 'Co-Founder');
                      } catch {
                        /* already requested or declined: the profile page explains the state */
                      }
                    }
                    navigate(`/messages?user=${prospect.id}`);
                  }}
                  className="flex-1 min-h-11 py-2 bg-stone-900 text-white rounded-xl text-xs font-medium hover:bg-stone-800 transition-colors"
                >
                  <Both en="Connect" el="Σύνδεση" />
                </button>
                <button onClick={() => { rememberPerson({ id: prospect.id, fullName: prospect.name, headline: prospect.role, role: prospect.role }); navigate(`/profile/${prospect.id}`); }} className="flex-1 min-h-11 py-2 bg-white border border-stone-200 text-stone-900 rounded-xl text-xs font-medium hover:bg-stone-50 transition-colors">{t('View Profile', 'Προφίλ')}</button>
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl p-4 border border-stone-100 flex flex-col justify-between">
            <p className="text-xs font-semibold text-stone-400 tracking-wider">{t('Current Streak', 'Τρέχον σερί')}</p>
            <div>
              <p className="text-sm font-semibold text-stone-900 tracking-tight mt-2">{streakDays}<span className="text-xs font-medium text-stone-400">d</span></p>
              <div className="flex items-center gap-1.5 mt-2">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-xs text-stone-400"><Both en="Keep the work moving today" el="Συνέχισε τη δουλειά σήμερα" /></p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-stone-400" />
              <p className="text-sm font-medium text-stone-900">{t('Complete your profile', 'Συμπλήρωσε το προφίλ')}</p>
            </div>
            <span className="text-xs font-semibold text-stone-900">{score}%</span>
          </div>
          <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-stone-900 rounded-full transition-all" style={{ width: `${score}%` }} />
          </div>
          {missing.length > 0 && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-stone-400">
                {t('Missing:', 'Λείπουν:')} {missing.slice(0, 3).map((item, index) => (
                  <span key={item}>
                    {index > 0 ? ', ' : ''}
                    <Both en={item} el={MISSING_EL[item] || item} />
                  </span>
                ))}
                {missing.length > 3 ? t(` +${missing.length - 3} more`, ` +${missing.length - 3} ακόμα`) : ''}
              </p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'What does my founding team still lack?' } }))} className="text-xs font-medium text-stone-900 hover:underline">{t('Ask', 'Ρώτα')}</button>
                <button onClick={() => navigate('/profile')} className="text-xs font-medium text-stone-900 hover:underline">{t('Edit Profile →', 'Επεξεργασία προφίλ →')}</button>
              </div>
            </div>
          )}
        </div>

        {communities.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 p-4">
            <p className="text-xs font-semibold text-stone-400 tracking-wider mb-3"><Both en="Communities" el="Κοινότητες" /></p>
            <div className="space-y-3">
              {communities.map((community) => (
                <div key={community.id} className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-stone-900">{community.name}</p>
                  <p className="text-xs text-stone-400">{community.members} · {community.newPosts}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-stone-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-stone-400 tracking-wider"><Both en="Upcoming" el="Επόμενα" /></p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => navigate('/events')} className="text-xs text-stone-400 hover:text-stone-900 transition-colors"><Both en="See map" el="Χάρτης" /></button>
              <NavLink to="/calendar" className="text-xs text-stone-400 hover:text-stone-900 transition-colors"><Both en="View all" el="Όλα" /> →</NavLink>
            </div>
          </div>
          {!isDemoMode && !eventsLoaded ? null : schedule.length === 0 ? (
            <p className="text-xs text-stone-400"><Both en="Nothing scheduled. Add a session or event in Calendar." el="Τίποτα προγραμματισμένο. Πρόσθεσε συνάντηση ή εκδήλωση στο Ημερολόγιο." /></p>
          ) : (
            <div className="space-y-4 relative">
              <div className="absolute left-1 top-2 bottom-2 w-px bg-stone-100" />
              {schedule.map((ev) => (
                <div key={ev.id} className="pl-5 relative cursor-pointer hover:bg-stone-50/50 -mx-2 px-2 py-1 rounded-lg transition-colors" onClick={() => navigate(ev.type === 'MILESTONE' ? '/milestones' : '/events')}>
                  <div className="absolute left-[-1px] top-2.5 w-2.5 h-2.5 rounded-full bg-stone-900 border-2 border-white" />
                  <p className="text-sm font-medium text-stone-900 leading-tight">{t(ev.title, ev.titleEl ?? ev.title)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span className="text-xs text-stone-400">{dashTime(ev.time)}</span>
                    {ev.type && <span className="text-xs font-semibold tracking-wider bg-stone-50 border border-stone-100 text-stone-400 px-1.5 py-0.5 rounded">{labelOf(ev.type === 'MEETUP' ? 'Meetup' : ev.type === 'NETWORK' ? 'Networking' : ev.type === 'MILESTONE' ? 'Milestone' : ev.type)}</span>}
                    {ev.attendees > 0 && <span className="text-xs text-stone-400">{t(`${ev.attendees} attending`, `${ev.attendees} συμμετέχουν`)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </PageShell>
  );
}
