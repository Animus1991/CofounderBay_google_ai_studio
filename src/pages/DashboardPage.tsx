import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { arrayRemove, arrayUnion, collection, doc, increment, limit, onSnapshot, query, updateDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { Both } from '../lib/both';
import { bothText } from '../lib/labels';
import { useAuth } from '../App';
import PageShell from '../components/ui/PageShell';
import { getNextBestActions, logNudgeConversion, logNudgeExposure, NextBestAction } from '../services/behavioralOptimizer';
import { db } from '../firebase';
import { ReadinessScore, Streak } from '../types';

const ACTIVITY_DATA = [
  { name: 'Mon', views: 40, matches: 24 },
  { name: 'Tue', views: 30, matches: 13 },
  { name: 'Wed', views: 20, matches: 98 },
  { name: 'Thu', views: 27, matches: 39 },
  { name: 'Fri', views: 18, matches: 48 },
  { name: 'Sat', views: 23, matches: 38 },
  { name: 'Sun', views: 34, matches: 43 },
];

const DEMO_CIRCLES = [
  { id: '1', name: 'Alex Rivera', role: 'CTO / Full-stack', match: 94, avatar: 'https://picsum.photos/seed/alex/100/100' },
  { id: '2', name: 'Sarah Chen', role: 'Product Designer', match: 88, avatar: 'https://picsum.photos/seed/sarah/100/100' },
  { id: '3', name: 'Marcus Thorne', role: 'Growth Marketer', match: 82, avatar: 'https://picsum.photos/seed/marcus/100/100' },
  { id: '4', name: 'Emma Kim', role: '', match: 0, avatar: 'https://picsum.photos/seed/emma/100/100' },
  { id: '5', name: 'David Park', role: '', match: 0, avatar: 'https://picsum.photos/seed/david/100/100' },
];

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
    authorId: '2',
    name: 'Sarah',
    avatar: DEMO_CIRCLES[1]!.avatar,
    text: 'just reached a Match score of 98',
    time: '2h ago',
    likes: 4,
    comments: 1,
    likedBy: [] as string[],
  },
  {
    id: 'demo-post-alex',
    authorId: '1',
    name: 'Alex',
    avatar: DEMO_CIRCLES[0]!.avatar,
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

  const circles = isDemoMode ? DEMO_CIRCLES : (live.recentMatches ?? []);
  const posts = isDemoMode ? DEMO_POSTS : feed;
  const schedule = isDemoMode ? DEMO_EVENTS : events;
  const chartSeries = isDemoMode ? ACTIVITY_DATA : live.activitySeries;
  const communities = isDemoMode ? ACTIVE_COMMUNITIES : (live.communities ?? []);
  const prospect = isDemoMode
    ? { id: DEMO_CIRCLES[1]!.id, name: DEMO_CIRCLES[1]!.name, role: DEMO_CIRCLES[1]!.role, match: DEMO_CIRCLES[1]!.match, avatar: DEMO_CIRCLES[1]!.avatar }
    : live.prospect;
  const streakDays = isDemoMode ? (streak?.currentStreak ?? 12) : (streak?.currentStreak ?? 0);
  const profileViews = isDemoMode ? 124 : live.profileViews;
  const matchScore = isDemoMode ? DEMO_CIRCLES[0]!.match : live.topMatchScore;
  const unread = isDemoMode ? 3 : live.unreadMessages;
  const firstName = user?.displayName?.split(' ')[0] || 'Founder';

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

  const sampleLabel = <Both en="Sample" el="Δείγμα" />;

  return (
    <PageShell
      title={bothText(`Good morning, ${firstName}`, `Καλημέρα, ${firstName}`)}
      description="Ready to build something great today?"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-stone-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim()) navigate(`/discovery?q=${encodeURIComponent(searchQuery.trim())}`); }}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-[12.5px] sm:text-sm placeholder:text-[12.5px] sm:placeholder:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 transition-all"
              placeholder={bothText('Search founders, mentors, communities...', 'Ιδρυτές, μέντορες, κοινότητες...')}
            />
          </div>
          <button onClick={() => navigate('/discovery')} className="flex items-center justify-center w-10 h-10 bg-white border border-stone-200 rounded-xl text-stone-400 hover:text-stone-900 hover:border-stone-300 transition-all shrink-0">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {heroAction && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-stone-900 rounded-2xl p-4 flex items-center justify-between"
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
                className="px-4 py-2 bg-white text-stone-900 rounded-xl text-xs font-semibold hover:bg-stone-100 transition-colors whitespace-nowrap shrink-0"
              >
                Go
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <p className="text-xs text-stone-400 mb-2"><Both en="Matches" el="Αντιστοιχίσεις" /></p>
          <div className="overflow-x-auto -mx-1 px-1 pb-1">
            <div className="flex items-center gap-3 min-w-max">
              <div className="flex flex-col items-center gap-1.5 cursor-pointer group" onClick={() => navigate('/profile')}>
                <div className="relative">
                  <img src={user?.photoURL || `https://picsum.photos/seed/${user?.uid || 'you'}/100/100`} alt="You" className="w-12 h-12 rounded-full object-cover border-2 border-stone-200 group-hover:scale-105 transition-transform" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-stone-900 border-2 border-white rounded-full flex items-center justify-center">
                    <Plus className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
                <span className="text-[10px] font-medium text-stone-400"><Both en="You" el="Εσείς" /></span>
              </div>
              {circles.map((match) => (
                <div key={match.id} className="flex flex-col items-center gap-1.5 cursor-pointer group" onClick={() => navigate(`/profile/${match.id}`)}>
                  <div className="w-12 h-12 rounded-full p-[2px] bg-stone-100 ring-1 ring-stone-200">
                    <img src={match.avatar || `https://picsum.photos/seed/${match.id}/100/100`} alt={match.name} className="w-full h-full rounded-full object-cover border border-white group-hover:scale-95 transition-transform" />
                  </div>
                  <span className="text-[10px] font-medium text-stone-400">{match.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
          {isDemoMode && <p className="text-xs text-stone-400 mt-1">{sampleLabel}</p>}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className={cn('text-xs font-semibold text-stone-400', !isDemoMode && 'tracking-wider')}>
              {isDemoMode ? sampleLabel : 'Activity Feed'}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/milestones')} className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors">
                <TrendingUp className="w-3 h-3" /> <Both en="Log Update" el="Καταγραφή" />
              </button>
              <button onClick={() => navigate('/communities')} className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 rounded-xl text-xs font-medium text-white hover:bg-stone-800 transition-colors">
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
                  <img src={item.avatar || `https://picsum.photos/seed/${item.authorId}/100/100`} alt={item.name} className="w-9 h-9 rounded-full object-cover shrink-0 border border-stone-100 cursor-pointer hover:ring-2 hover:ring-stone-300 transition-all" onClick={() => navigate(`/profile/${item.authorId}`)} />
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
              sub: isDemoMode ? sampleLabel : profileViews == null ? <Both en="No views yet" el="Καμία προβολή ακόμη" /> : null,
              href: '/profile',
            },
            {
              label: 'Match Score',
              value: matchScore == null ? '—' : `${matchScore}%`,
              sub: isDemoMode ? sampleLabel : null,
              href: '/matches',
            },
            {
              label: 'Streak',
              value: `${streakDays}d`,
              sub: isDemoMode ? sampleLabel : null,
              href: '/milestones',
            },
            {
              label: 'Messages',
              value: unread == null ? '—' : String(unread),
              sub: isDemoMode ? sampleLabel : null,
              href: '/messages',
            },
          ].map((stat) => (
            <div key={stat.label} onClick={() => navigate(stat.href)} className="bg-white rounded-2xl border border-stone-100 p-4 cursor-pointer hover:border-stone-300 hover:shadow-sm transition-all">
              <p className="text-[10px] font-semibold text-stone-400 tracking-wider">{stat.label}</p>
              <p className="text-xl font-semibold text-stone-900 mt-1.5 tracking-tight tabular-nums">{stat.value}</p>
              {stat.sub && <p className="text-xs mt-0.5 text-stone-400">{stat.sub}</p>}
            </div>
          ))}
        </div>

        {chartSeries && chartSeries.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 p-4">
            {isDemoMode && <p className="text-xs text-stone-400 mb-2">{sampleLabel}</p>}
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
                {isDemoMode ? sampleLabel : 'Co-founder Prospect'}
              </p>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <img src={prospect.avatar || `https://picsum.photos/seed/${prospect.id}/100/100`} alt={prospect.name} className="w-11 h-11 rounded-full object-cover border border-stone-200" />
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
                <button onClick={() => navigate('/messages')} className="flex-1 py-2 bg-stone-900 text-white rounded-xl text-xs font-medium hover:bg-stone-800 transition-colors">Connect</button>
                <button onClick={() => navigate(`/profile/${prospect.id}`)} className="flex-1 py-2 bg-white border border-stone-200 text-stone-900 rounded-xl text-xs font-medium hover:bg-stone-50 transition-colors">View Profile</button>
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl p-4 border border-stone-100 flex flex-col justify-between">
            <p className="text-[10px] font-semibold text-stone-400 tracking-wider">Current Streak</p>
            <div>
              <p className="text-[13px] sm:text-[14px] font-semibold text-stone-900 tracking-tight mt-2">{streakDays}<span className="text-[11px] font-medium text-stone-400">d</span></p>
              <div className="flex items-center gap-1.5 mt-2">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                {isDemoMode && <p className="text-xs text-stone-400">{sampleLabel}</p>}
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
            {isDemoMode && <p className="text-xs text-stone-400 mb-2">{sampleLabel}</p>}
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
            <p className="text-xs font-semibold text-stone-400 tracking-wider">Upcoming</p>
            <NavLink to="/calendar" className="text-xs text-stone-400 hover:text-stone-900 transition-colors">View all →</NavLink>
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-stone-400 tracking-wider">Local Meetups</p>
            <button onClick={() => navigate('/events')} className="text-xs text-stone-400 hover:text-stone-900 transition-colors">See Map</button>
          </div>
          {!isDemoMode && !eventsLoaded ? null : schedule.length === 0 ? (
            <p className="text-xs text-stone-400"><Both en="Nothing scheduled." el="Τίποτα προγραμματισμένο." /></p>
          ) : schedule.map((ev) => (
            <div key={ev.id} className="bg-white rounded-2xl border border-stone-100 p-4 flex items-center gap-3 cursor-pointer hover:border-stone-300 hover:shadow-sm transition-all" onClick={() => navigate('/events')}>
              <div className="bg-stone-50 border border-stone-100 rounded-xl p-3 text-center shrink-0 min-w-[60px]">
                <p className="text-[10px] font-semibold text-stone-400 tracking-wider">{ev.day}</p>
                <p className="text-base font-semibold text-stone-900">{ev.clock}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{ev.title}</p>
                <div className="flex items-center gap-3 mt-1">
                  {ev.location && <span className="text-xs text-stone-400">{ev.location}</span>}
                  {ev.attendees > 0 && <span className="text-xs text-stone-400">· {ev.attendees} attending</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
