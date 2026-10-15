import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Target,
  TrendingUp,
  Search,
  Plus,
  Star,
  CheckCircle2,
  Clock,
  Flame,
  Filter,
  Sparkles,
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { arrayRemove, arrayUnion, collection, doc, increment, limit, onSnapshot, query, updateDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { Both } from '../lib/both';
import { rememberPerson } from '../lib/people';
import { bothText } from '../lib/labels';
import { useAuth } from '../App';
import PageShell from '../components/ui/PageShell';
import Avatar from '../components/ui/Avatar';
import { readActivity, saveRequest } from '../lib/localLists';
import { useStored } from '../lib/useStored';
import { getNextBestActions, logNudgeConversion, logNudgeExposure, NextBestAction } from '../services/behavioralOptimizer';
import { db } from '../firebase';
import { ReadinessScore, Streak } from '../types';
import { CAST, avatarFor } from '../data/cast';
import { fromProfile, rankPeople } from '../lib/compatibility';

const ACTIVITY_DATA = [
  { name: 'Mon', views: 40, matches: 24 },
  { name: 'Tue', views: 30, matches: 13 },
  { name: 'Wed', views: 20, matches: 98 },
  { name: 'Thu', views: 27, matches: 39 },
  { name: 'Fri', views: 18, matches: 48 },
  { name: 'Sat', views: 23, matches: 38 },
  { name: 'Sun', views: 34, matches: 43 },
];

function circlesFromCast(profile: Parameters<typeof fromProfile>[0]) {
  return rankPeople(
    fromProfile(profile),
    CAST.filter((person) => person.role === 'Founder' || person.role === 'Co-Founder Candidate'),
  ).slice(0, 5).map(({ person, fit }) => ({
    id: person.id,
    name: person.fullName,
    role: person.headline,
    match: fit.score ?? 0,
    avatar: avatarFor(person.id),
  }));
}

const ACTIVE_COMMUNITIES = [
  { id: '1', name: 'Fintech Founders', members: '1.2k', newPosts: 12 },
  { id: '2', name: 'AI & Machine Learning', members: '3.4k', newPosts: 45 },
];

const DEMO_EVENTS = [
  { id: 'downtown', title: 'Downtown Pitch Club', time: 'Tomorrow, 7:00 AM', day: 'Tomorrow', clock: '7:00', type: 'MEETUP', location: '', attendees: 0 },
  { id: 'hackathon', title: 'Weekend Builders Hackathon', time: 'Saturday, 8:00 AM', day: 'Saturday', clock: '8:00', type: 'NETWORK', location: '', attendees: 0 },
  { id: 'deadline', title: 'Pre-Seed Checklist Deadline', time: 'Next Friday', day: 'Friday', clock: '', type: 'MILESTONE', location: '', attendees: 0 },
];

const DEMO_POSTS = [
  {
    id: 'demo-post-sarah',
    authorId: 'sarah-chen',
    name: 'Sarah',
    avatar: avatarFor('sarah-chen'),
    text: 'just reached a Match score of 98',
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
    time: '4h ago',
    likes: 12,
    comments: 3,
    likedBy: [] as string[],
  },
];

const ACTION_EL: Record<string, string> = {
  'complete-profile': 'Συμπληρώστε το προφίλ σας, για να βελτιωθούν οι αντιστοιχίσεις.',
  'send-connection': 'Στείλτε αίτημα σύνδεσης σε πιθανό συνιδρυτή.',
  'request-review': 'Ζητήστε έλεγχο της παρουσίασης από ειδικό.',
  'apply-feedback': 'Εφαρμόστε την ανατροφοδότηση του μέντορα.',
  'resume-research': 'Συνεχίστε την έρευνα για την υπόθεση αγοράς.',
  'daily-discovery': 'Δείτε 5 νέα προφίλ ιδρυτών σήμερα.',
};

const MISSING_EL: Record<string, string> = {
  'Basic Info': 'Βασικά στοιχεία',
  'Full Name': 'Ονοματεπώνυμο',
  Bio: 'Βιογραφικό',
  Role: 'Ρόλος',
  Industry: 'Κλάδος',
  Skills: 'Δεξιότητες',
  Location: 'Τοποθεσία',
  'Social Links': 'Σύνδεσμοι',
};

type Circle = { id: string; name: string; avatar: string };
type CommunityRow = { id: string; name: string; members: string | number; newPosts: number };
type ActivityPoint = { name: string; views: number; matches: number };
type Prospect = { id: string; name: string; role: string; match: number; avatar: string };
type FeedPost = {
  id: string;
  authorId: string;
  name: string;
  avatar: string;
  text: string;
  time: string;
  likes: number;
  comments: number;
  likedBy: string[];
};
type DashEvent = {
  id: string;
  title: string;
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
    const item = row as { id?: unknown; name?: unknown; avatar?: unknown };
    const id = item.id == null ? '' : String(item.id);
    if (!id) return [];
    return [{ id, name: item.name == null ? '' : String(item.name), avatar: typeof item.avatar === 'string' ? item.avatar : '' }];
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
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [live, setLive] = useState<LiveUser>(EMPTY_LIVE);
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [feedLoaded, setFeedLoaded] = useState(false);
  const [events, setEvents] = useState<DashEvent[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const activity = useStored(readActivity, ['cfb.activity']);

  const getProfileCompletion = () => {
    if (!profile) return { score: 0, missing: ['Basic Info'] };
    let score = 0;
    const missing = [];

    if (profile.fullName) score += 20; else missing.push('Full Name');
    if (profile.bio) score += 20; else missing.push('Bio');
    if (profile.role) score += 10; else missing.push('Role');
    if (profile.industry) score += 10; else missing.push('Industry');
    if (profile.skills && profile.skills.length > 0) score += 20; else missing.push('Skills');
    if (profile.location) score += 10; else missing.push('Location');
    if (profile.socialLinks && Object.keys(profile.socialLinks).length > 0) score += 10; else missing.push('Social Links');

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

  const heroAction = nextActions[0];
  const handleActionClick = (action: NextBestAction) => {
    if (user) {
      logNudgeConversion(user.uid, action.id);
    }
    navigate(`/${action.section}`);
  };

  const rankedCircles = useMemo(() => circlesFromCast(profile), [profile]);
  const circles = isDemoMode ? rankedCircles : (live.recentMatches ?? rankedCircles);
  const firstName = user?.displayName?.split(' ')[0] || 'Founder';
  const activityPosts: FeedPost[] = activity.slice(0, 8).map((item) => ({
    id: item.id,
    authorId: item.byAssistant ? 'assistant' : user?.uid || 'you',
    name: item.byAssistant ? 'Studio' : firstName,
    avatar: '',
    text: item.title,
    time: item.at.slice(11, 16) || '',
    likes: 0,
    comments: 0,
    likedBy: [],
  }));
  const posts = isDemoMode ? [...activityPosts, ...DEMO_POSTS] : (activityPosts.length > 0 ? [...activityPosts, ...feed] : feed);
  const schedule = isDemoMode ? DEMO_EVENTS : events;
  const chartSeries = isDemoMode ? ACTIVITY_DATA : live.activitySeries;
  const communities = isDemoMode ? ACTIVE_COMMUNITIES : (live.communities ?? []);
  const prospect = isDemoMode
    ? rankedCircles[0] ?? null
    : live.prospect;
  const streakDays = isDemoMode ? (streak?.currentStreak ?? 12) : (streak?.currentStreak ?? 0);
  const profileViews = isDemoMode ? 124 : live.profileViews;
  const matchScore = isDemoMode ? rankedCircles[0]?.match : live.topMatchScore;
  const unread = isDemoMode ? 3 : live.unreadMessages;

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
          <p className="text-stone-500 font-medium">Loading your ecosystem...</p>
        </div>
      </div>
    );
  }

  return (
    <PageShell
      title={bothText(`Good morning, ${firstName}`, `Καλημέρα, ${firstName}`)}
      description={bothText('Your next step, matches, and what changed.', 'Το επόμενο βήμα, οι αντιστοιχίσεις και τι άλλαξε.')}
      actions={isDemoMode ? (
        <span className="text-xs font-medium text-stone-500 border border-stone-200 rounded-lg px-2.5 py-1.5">
          <Both en="Demo — sample data" el="Δείγμα — ενδεικτικά δεδομένα" />
        </span>
      ) : undefined}
    >
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-stone-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim()) navigate(`/discovery?q=${encodeURIComponent(searchQuery.trim())}`); }}
              className="w-full min-h-11 pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 transition-all"
              placeholder={bothText('Search founders, mentors, communities...', 'Ιδρυτές, μέντορες, κοινότητες...')}
            />
          </div>
          <button title={bothText('Ask the studio assistant', 'Ρωτήστε τον βοηθό του στούντιο')} onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: searchQuery.trim() } }))} className="flex items-center justify-center w-11 h-11 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-all shrink-0">
            <Sparkles className="w-4 h-4" />
          </button>
          <button title={bothText('Open Discovery to narrow this search', 'Ανοίξτε την Εξερεύνηση για να στενέψετε την αναζήτηση')} onClick={() => navigate('/discovery')} className="flex items-center justify-center w-11 h-11 bg-white border border-stone-200 rounded-xl text-stone-400 hover:text-stone-900 hover:border-stone-300 transition-all shrink-0">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {heroAction && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="studio-nudge bg-stone-900 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <p className="text-[12.5px] sm:text-sm font-medium text-white">
                  {ACTION_EL[heroAction.id] ? (
                    <Both en={heroAction.description} el={ACTION_EL[heroAction.id]} />
                  ) : heroAction.description}
                </p>
              </div>
              <button
                onClick={() => handleActionClick(heroAction)}
                className="min-h-11 self-start sm:self-center px-4 bg-white text-stone-900 rounded-xl text-sm font-semibold hover:bg-stone-100 transition-colors whitespace-nowrap shrink-0"
              >
                Go
              </button>
            </motion.div>
          )}
        </AnimatePresence>

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
                <span className="text-[10px] font-medium text-stone-400"><Both en="You" el="Εσείς" /></span>
              </div>
              {circles.map((match) => (
                <div key={match.id} className="flex flex-col items-center gap-1.5 cursor-pointer group" onClick={() => { rememberPerson({ id: match.id, fullName: match.name, headline: ('role' in match ? String(match.role) : ''), role: ('role' in match ? String(match.role) : '') }); navigate(`/profile/${match.id}`); }}>
                  <Avatar src={match.avatar} fallback={match.name} size="lg" className="group-hover:scale-95 transition-transform" />
                  <span className="text-[10px] font-medium text-stone-400">{match.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs font-semibold text-stone-400 tracking-wider">
              <Both en="What changed" el="Τι άλλαξε" />
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => navigate('/milestones')} className="flex items-center gap-2 min-h-11 px-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors">
                <TrendingUp className="w-3 h-3" /> <Both en="Log Update" el="Καταγραφή" />
              </button>
              <button onClick={() => navigate('/communities')} className="flex items-center gap-2 min-h-11 px-4 bg-stone-900 rounded-xl text-sm font-medium text-white hover:bg-stone-800 transition-colors">
                <Plus className="w-3 h-3" /> <Both en="Post" el="Δημοσίευση" />
              </button>
            </div>
          </div>

          {!isDemoMode && feedLoaded && posts.length === 0 ? (
            <p className="text-sm text-stone-400"><Both en="The list is empty." el="Η λίστα είναι άδεια." /></p>
          ) : posts.map((item) => {
            const liked = isDemoMode ? likedPosts.has(item.id) : item.likedBy.includes(user?.uid || '');
            const likeCount = item.likes + (isDemoMode && liked ? 1 : 0);
            return (
              <div key={item.id} className="bg-white rounded-2xl p-4 border border-stone-100">
                <div className="flex items-start gap-3">
                  <button type="button" className="shrink-0" onClick={() => { rememberPerson({ id: item.authorId, fullName: item.name }); navigate(item.authorId === 'assistant' ? '/matches' : `/profile/${item.authorId}`); }}>
                    <Avatar src={item.avatar} fallback={item.name} size="sm" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-900">
                      <span className="font-medium">{item.name.split(' ')[0]}</span>{' '}
                      <span className="text-stone-400">{item.text}</span>
                    </p>
                    <span className="text-xs text-stone-400">{item.time}</span>
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
              label: 'Profile Views',
              value: profileViews == null ? '—' : String(profileViews),
              sub: profileViews == null && !isDemoMode ? <Both en="No views yet" el="Καμία προβολή ακόμη" /> : null,
              href: '/profile',
              hint: bothText('How many people opened your profile', 'Πόσοι άνοιξαν το προφίλ σας'),
            },
            {
              label: 'Match Score',
              value: matchScore == null ? '—' : `${matchScore}%`,
              sub: rankedCircles[0] ? rankedCircles[0].name.split(' ')[0] : null,
              href: '/matches',
              hint: bothText('Shared skills and industry with the top match', 'Κοινές δεξιότητες και κλάδος με την πρώτη αντιστοίχιση'),
            },
            {
              label: 'Streak',
              value: `${streakDays}d`,
              sub: null,
              href: '/milestones',
              hint: bothText('Days in a row the work kept going', 'Μέρες στη σειρά που η δουλειά συνεχίστηκε'),
            },
            {
              label: 'Messages',
              value: unread == null ? '—' : String(unread),
              sub: null,
              href: '/messages',
              hint: bothText('Unread conversations', 'Αδιάβαστες συνομιλίες'),
            },
          ].map((stat) => (
            <div key={stat.label} title={stat.hint} onClick={() => navigate(stat.href)} className="bg-white rounded-2xl border border-stone-100 p-4 cursor-pointer hover:border-stone-300 hover:shadow-sm transition-all">
              <p className="text-[10px] font-semibold text-stone-400 tracking-wider">{stat.label}</p>
              <p className="text-xl font-semibold text-stone-900 mt-1.5 tracking-tight tabular-nums">{stat.value}</p>
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
              <p className="text-[10px] font-semibold text-stone-400 tracking-wider mb-3">
                <Both en="Best match" el="Καλύτερη αντιστοίχιση" />
              </p>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <Avatar src={prospect.avatar || avatarFor(prospect.id)} fallback={prospect.name} size="md" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-stone-50 rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900">{prospect.name}</p>
                  <p className="text-xs text-stone-400">{prospect.role}</p>
                </div>
                {prospect.match > 0 && (
                  <span className="text-xs font-semibold text-stone-900 bg-white border border-stone-200 px-2 py-1 rounded-lg">{prospect.match}%</span>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { saveRequest({ id: prospect.id, fullName: prospect.name, role: prospect.role, industry: '', location: '', note: prospect.role, status: 'pending' }); navigate(`/messages?user=${prospect.id}`); }} className="flex-1 py-2 bg-stone-900 text-white rounded-xl text-xs font-medium hover:bg-stone-800 transition-colors"><Both en="Connect" el="Σύνδεση" /></button>
                <button onClick={() => { rememberPerson({ id: prospect.id, fullName: prospect.name, headline: prospect.role, role: prospect.role }); navigate(`/profile/${prospect.id}`); }} className="flex-1 min-h-11 py-2 bg-white border border-stone-200 text-stone-900 rounded-xl text-xs font-medium hover:bg-stone-50 transition-colors">View Profile</button>
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl p-4 border border-stone-100 flex flex-col justify-between">
            <p className="text-[10px] font-semibold text-stone-400 tracking-wider">Current Streak</p>
            <div>
              <p className="text-[13px] sm:text-[14px] font-semibold text-stone-900 tracking-tight mt-2">{streakDays}<span className="text-[11px] font-medium text-stone-400">d</span></p>
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
              <p className="text-sm font-medium text-stone-900">Complete your profile</p>
            </div>
            <span className="text-xs font-semibold text-stone-900">{score}%</span>
          </div>
          <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-stone-900 rounded-full transition-all" style={{ width: `${score}%` }} />
          </div>
          {missing.length > 0 && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-stone-400">
                Missing: {missing.slice(0, 3).map((item, index) => (
                  <span key={item}>
                    {index > 0 ? ', ' : ''}
                    <Both en={item} el={MISSING_EL[item] || item} />
                  </span>
                ))}
                {missing.length > 3 ? ` +${missing.length - 3} more` : ''}
              </p>
              <button onClick={() => navigate('/profile')} className="text-xs font-medium text-stone-900 hover:underline">Edit Profile →</button>
            </div>
          )}
        </div>

        {communities.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 p-4">
            <p className="text-[10px] font-semibold text-stone-400 tracking-wider mb-3"><Both en="Communities" el="Κοινότητες" /></p>
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
            <p className="text-xs text-stone-400"><Both en="Nothing scheduled." el="Τίποτα προγραμματισμένο." /></p>
          ) : (
            <div className="space-y-4 relative">
              <div className="absolute left-1 top-2 bottom-2 w-px bg-stone-100" />
              {schedule.map((ev) => (
                <div key={ev.id} className="pl-5 relative cursor-pointer hover:bg-stone-50/50 -mx-2 px-2 py-1 rounded-lg transition-colors" onClick={() => navigate(ev.type === 'MILESTONE' ? '/milestones' : '/events')}>
                  <div className="absolute left-[-1px] top-2.5 w-2.5 h-2.5 rounded-full bg-stone-900 border-2 border-white" />
                  <p className="text-sm font-medium text-stone-900 leading-tight">{ev.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span className="text-xs text-stone-400">{ev.time}</span>
                    {ev.type && <span className="text-[10px] font-semibold tracking-wider bg-stone-50 border border-stone-100 text-stone-400 px-1.5 py-0.5 rounded">{ev.type}</span>}
                    {ev.attendees > 0 && <span className="text-xs text-stone-400">{ev.attendees} attending</span>}
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
