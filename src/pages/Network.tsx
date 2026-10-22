import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Check,
  FileText,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  UserPlus,
  UserMinus,
  ChevronRight,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  closeNeed,
  editNeed,
  keys,
  readNeeds,
  readRequests,
  readSaved,
  removeRequest,
  removeSaved,
  setNeedStatus,
  upsertNeed,
  type NeedCard,
  type NeedField,
} from '../lib/localLists';
import { useStored } from '../lib/useStored';
import { usePageControls } from '../lib/pageControls';
import { rememberPerson } from '../lib/people';
import { useLanguage, useT } from '../lib/language';
import { labelOf } from '../lib/labels';
import { formatDate, formatDateTime } from '../lib/dates';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import PageShell from '../components/ui/PageShell';
import FactLine from '../components/ui/FactLine';
import EmptyHint, { AskLink, ClearFiltersButton } from '../components/ui/EmptyHint';
import { ConfirmDialog } from '../components/ui/Modal';
import Tabs from '../components/ui/Tabs';
import Timeline from '../components/ui/Timeline';
import PersonHovercard from '../components/ui/PersonHovercard';
import Avatar from '../components/ui/Avatar';
import { avatarFor, findCast } from '../data/cast';
import { User } from '../types';
import { cn } from '../lib/utils';
import { useAuth } from '../App';
import { useToast } from '../context/ToastContext';
import { avatarOf, findPerson, isOnline, type Person } from '../lib/peopleSource';
import { compatibility, fromCast, fromProfile } from '../lib/compatibility';
import { teamGaps, TEAM_AREAS } from '../lib/teamGaps';
import { shareLink } from '../lib/download';
import {
  endorsementsBy,
  endorsementsFor,
  otherSide,
  removeConnection,
  respondToConnection,
  useConnections,
  withdrawConnection,
  withdrawEndorsement,
  type ConnectionRecord,
  type EndorsementRecord,
} from '../lib/social';

interface NetworkProps {
  user: User;
}

type NetworkTab = 'connections' | 'saved' | 'endorsements' | 'compare' | 'needs';
type ConnectionStatus = 'Connected' | 'Pending' | 'Incoming';

/** One row of the connections grid: a connected member or a request in either direction. */
type NetworkConnection = {
  id: string;
  fullName: string;
  headline: string;
  headlineEl?: string;
  role: string;
  industry: string;
  location: string;
  avatar: string;
  status: ConnectionStatus;
  since: number;
  record?: ConnectionRecord;
  person?: Person;
};

const TABS: NetworkTab[] = ['connections', 'saved', 'endorsements', 'compare', 'needs'];
const FIELD_LABEL: Record<NeedField, { en: string; el: string }> = {
  exists: { en: 'What exists', el: 'Τι υπάρχει' },
  outcome: { en: 'Outcome', el: 'Αποτέλεσμα' },
  missing: { en: 'Who is missing', el: 'Ποιος λείπει' },
  offer: { en: 'Offer', el: 'Προσφορά' },
};

function isTab(value: string | null): value is NetworkTab {
  return TABS.includes(value as NetworkTab);
}

function sampleConnections(): NetworkConnection[] {
  const rows: { id: string; status: ConnectionStatus }[] = [
    { id: 'sarah-chen', status: 'Connected' },
    { id: 'alex-rivera', status: 'Connected' },
    { id: 'james-wilson', status: 'Pending' },
    { id: 'elena-rodriguez', status: 'Connected' },
  ];
  return rows.flatMap(({ id, status }, index) => {
    const person = findPerson(id);
    if (!person) return [];
    return [{ id, fullName: person.fullName, headline: person.headline, headlineEl: person.headlineEl, role: person.role, industry: person.industry, location: person.city, avatar: avatarOf(person), status, since: Date.now() - (index + 1) * 86_400_000 * 3, person }];
  });
}

function sampleEndorsements(recipientId: string): EndorsementRecord[] {
  const rows = [
    { id: 'sarah-chen', skill: 'Product Strategy', comment: "One of the most focused founders I've worked with.", days: 30 },
    { id: 'alex-rivera', skill: 'Full-Stack Dev', comment: 'Incredible technical depth and speed.', days: 25 },
  ];
  return rows.flatMap(({ id, skill, comment, days }) => {
    const person = findCast(id);
    if (!person) return [];
    return [{ id: `e-${id}`, endorserId: id, endorserName: person.fullName, endorserAvatar: avatarFor(id, 200), recipientId, recipientName: '', skillId: skill, comment, createdAt: Date.now() - days * 86_400_000 }];
  });
}

export default function Network({ user }: NetworkProps) {
  const t = useT();
  const { mode } = useLanguage();
  const { isDemoMode, profile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const real = !isDemoMode;
  const activeTab: NetworkTab = isTab(params.get('tab')) ? params.get('tab') as NetworkTab : 'connections';
  const setActiveTab = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === 'connections') next.delete('tab');
    else next.set('tab', id);
    setParams(next, { replace: true });
  };
  const saved = useStored(readSaved, [keys.saved]);
  const localRequests = useStored(readRequests, [keys.requests]);
  const needs = useStored(readNeeds, [keys.needs]);
  const connections = useConnections();
  const [networkQuery, setNetworkQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ConnectionStatus>('All');
  const [pendingDisconnect, setPendingDisconnect] = useState<NetworkConnection | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [compared, setCompared] = useState(false);
  const [draft, setDraft] = useState({ exists: '', outcome: '', missing: '', offer: '' });
  const [editing, setEditing] = useState<string | null>(null);
  const [received, setReceived] = useState<EndorsementRecord[]>([]);
  const [given, setGiven] = useState<EndorsementRecord[]>([]);
  const [endorsementsLoaded, setEndorsementsLoaded] = useState(false);

  usePageControls(() => [
    { id: 'show-connections', en: 'Show connections', el: 'Εμφάνιση συνδέσεων', run: () => setActiveTab('connections') },
    { id: 'show-saved', en: 'Show saved', el: 'Εμφάνιση αποθηκευμένων', run: () => setActiveTab('saved') },
    { id: 'show-intros', en: 'Show endorsements', el: 'Εμφάνιση συστάσεων', run: () => setActiveTab('endorsements') },
    { id: 'show-compare', en: 'Compare profiles', el: 'Σύγκριση προφίλ', run: () => setActiveTab('compare') },
    { id: 'show-need-cards', en: 'Show need cards', el: 'Εμφάνιση καρτών ανάγκης', run: () => setActiveTab('needs') },
    { id: 'status-all', en: 'All statuses', el: 'Όλες οι καταστάσεις', run: () => setStatusFilter('All') },
    { id: 'status-connected', en: 'Connected only', el: 'Μόνο συνδεδεμένοι', run: () => setStatusFilter('Connected') },
    { id: 'status-pending', en: 'Pending only', el: 'Μόνο σε αναμονή', run: () => setStatusFilter('Pending') },
    { id: 'status-incoming', en: 'Incoming only', el: 'Μόνο εισερχόμενα', run: () => setStatusFilter('Incoming') },
  ], []);

  // Endorsements come from Firestore for a real account; the demo shows the sample set.
  useEffect(() => {
    let cancelled = false;
    if (!real) {
      setReceived(sampleEndorsements(user.id));
      setGiven([]);
      setEndorsementsLoaded(true);
      return undefined;
    }
    setEndorsementsLoaded(false);
    void Promise.all([endorsementsFor(user.id), endorsementsBy(user.id)]).then(([mine, theirs]) => {
      if (cancelled) return;
      setReceived(mine);
      setGiven(theirs);
      setEndorsementsLoaded(true);
    });
    return () => { cancelled = true; };
  }, [real, user.id]);

  const connectionPool = useMemo<NetworkConnection[]>(() => {
    if (!real) {
      const sample = sampleConnections();
      const extras = localRequests
        .filter((item) => !sample.some((conn) => conn.id === item.id))
        .map((item) => {
          const person = findPerson(item.id);
          return { id: item.id, fullName: item.fullName, headline: item.note, role: item.role, industry: item.industry, location: item.location, avatar: person ? avatarOf(person) : avatarFor(item.id, 200), status: 'Pending' as const, since: Date.parse(item.sentAt || '') || Date.now(), person };
        });
      return [...sample, ...extras];
    }
    return connections.items
      .filter((record) => record.status === 'Accepted' || record.status === 'Pending')
      .map((record) => {
        const other = otherSide(record, user.id);
        const person = findPerson(other.id);
        const status: ConnectionStatus = record.status === 'Accepted' ? 'Connected' : record.senderId === user.id ? 'Pending' : 'Incoming';
        return {
          id: other.id,
          fullName: person?.fullName || other.name || t('Member', 'Μέλος'),
          headline: person?.headline || other.headline || '',
          headlineEl: person?.headlineEl,
          role: person?.role || record.requestType,
          industry: person?.industry || '',
          location: person?.city || person?.location || '',
          avatar: (person ? avatarOf(person) : '') || other.avatar,
          status,
          since: record.respondedAt || record.createdAt,
          record,
          person,
        };
      })
      .sort((a, b) => (a.status === 'Incoming' ? -1 : b.status === 'Incoming' ? 1 : b.since - a.since));
  }, [real, connections.items, localRequests, user.id, t]);

  const visibleConnections = connectionPool.filter((conn) => {
    const q = networkQuery.trim().toLowerCase();
    const matchesQuery = !q || `${conn.fullName} ${conn.role} ${conn.industry} ${conn.headline} ${conn.location}`.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'All' || conn.status === statusFilter;
    return matchesQuery && matchesStatus;
  });
  const connectedCount = connectionPool.filter((conn) => conn.status === 'Connected').length;
  const incomingCount = connectionPool.filter((conn) => conn.status === 'Incoming').length;

  const statusLabel = (status: ConnectionStatus) =>
    status === 'Connected' ? t('Connected', 'Συνδεδεμένοι') : status === 'Incoming' ? t('Awaiting your answer', 'Περιμένει απάντησή σου') : t('Request sent', 'Αίτημα σταλμένο');

  const act = async (work: () => Promise<unknown>, okTitle: string, okBody?: string) => {
    try {
      await work();
      toast.success(okTitle, okBody);
    } catch {
      toast.error(t('Something went wrong', 'Κάτι πήγε στραβά'), t('Please try again.', 'Δοκίμασε ξανά.'));
    }
  };

  const acceptIncoming = (conn: NetworkConnection) => conn.record && act(() => respondToConnection(conn.record!, true), t('Connected', 'Η σύνδεση ολοκληρώθηκε'), t(`You and ${conn.fullName} can message each other now.`, `Μπορείς πλέον να ανταλλάσσεις μηνύματα με ${conn.fullName}.`));
  const declineIncoming = (conn: NetworkConnection) => conn.record && act(() => respondToConnection(conn.record!, false), t('Request declined', 'Το αίτημα απορρίφθηκε'));
  const withdraw = (conn: NetworkConnection) => {
    if (conn.record) return act(() => withdrawConnection(conn.record!), t('Request withdrawn', 'Το αίτημα ανακλήθηκε'));
    removeRequest(conn.id);
    return undefined;
  };
  const disconnect = (conn: NetworkConnection) => {
    if (!conn.record) return;
    setPendingDisconnect(conn);
  };

  // Skill distribution across received endorsements (real numbers, not a sample bar chart).
  const skillCounts = useMemo(() => {
    const counts = new Map<string, number>();
    received.forEach((item) => counts.set(item.skillId, (counts.get(item.skillId) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [received]);
  const topSkill = skillCounts[0];

  const openNeeds = needs.filter((item) => item.status === 'open').length;
  const tabItems = [
    { id: 'connections', label: t('Connections', 'Συνδέσεις'), count: connectionPool.length, attention: incomingCount > 0 },
    { id: 'saved', label: t('Saved', 'Αποθηκευμένα'), count: saved.length },
    { id: 'endorsements', label: t('Endorsements', 'Συστάσεις'), count: received.length },
    { id: 'compare', label: t('Compare', 'Σύγκριση') },
    { id: 'needs', label: t('Need cards', 'Κάρτες ανάγκης'), count: needs.length, attention: openNeeds > 0 },
  ];

  const saveNeed = (card?: NeedCard) => {
    const payload = {
      exists: draft.exists.trim(),
      outcome: draft.outcome.trim(),
      missing: draft.missing.trim(),
      offer: draft.offer.trim() || undefined,
    };
    if (!payload.exists || !payload.outcome || !payload.missing) return;
    if (card) {
      editNeed(card.id, payload);
    } else {
      upsertNeed({
        id: `need-${Date.now().toString(36)}`,
        ...payload,
        status: 'open',
        at: new Date().toISOString(),
      });
    }
    setDraft({ exists: '', outcome: '', missing: '', offer: '' });
    setEditing(null);
  };

  const me = fromProfile(profile);
  const comparePool = connectionPool.filter((conn) => conn.status === 'Connected' || !real);
  const compareRows = picked.map((id) => comparePool.find((conn) => conn.id === id)).filter((conn): conn is NetworkConnection => Boolean(conn));

  return (
    <PageShell sample={isDemoMode} title={t('Network', 'Δίκτυο')} description={t('Your connections, saved people, endorsements and need cards.', 'Οι συνδέσεις σου, αποθηκευμένες επαφές, συστάσεις και κάρτες ανάγκης.')}>
      <div className="space-y-6">
        <button
          type="button"
          className="text-xs font-medium text-stone-500 hover:text-stone-900 min-h-11"
          onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'Invite 3 founders' } }))}
        >
          {t('Invite 3 founders · the assistant prepares the fit-check link for you', 'Προσκάλεσε 3 ιδρυτές · ο βοηθός ετοιμάζει τον σύνδεσμο fit check για εσένα')}
        </button>
        <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} variant="segment" />

        {activeTab === 'connections' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="relative w-full min-w-0 sm:max-w-xs sm:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="search"
                  placeholder={t('Search your network…', 'Αναζήτηση στο δίκτυό σου…')}
                  aria-label={t('Search your network', 'Αναζήτηση στο δίκτυό σου')}
                  value={networkQuery}
                  onChange={(e) => setNetworkQuery(e.target.value)}
                  className="w-full min-h-11 bg-stone-50 border border-stone-200 rounded-xl py-2 pl-9 pr-4 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300 transition-all"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 px-3 text-sm rounded-lg border-stone-200"
                onClick={() => setStatusFilter((prev) => (prev === 'All' ? 'Connected' : prev === 'Connected' ? 'Pending' : prev === 'Pending' ? 'Incoming' : 'All'))}
              >
                <SlidersHorizontal className="w-3 h-3 mr-1.5" /> {statusFilter === 'All' ? t('All statuses', 'Όλες οι καταστάσεις') : statusLabel(statusFilter)}
              </Button>
              <span className="text-sm text-stone-400 sm:ml-auto">{t(`${connectedCount} connected`, connectedCount === 1 ? '1 συνδεδεμένος' : `${connectedCount} συνδεδεμένοι`)}{incomingCount ? ` · ${t(`${incomingCount} waiting`, `${incomingCount} σε αναμονή`)}` : ''}</span>
            </div>

            {real && !connections.loaded ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-56 rounded-2xl bg-stone-100 animate-pulse" />)}
              </div>
            ) : visibleConnections.length === 0 ? (
              <EmptyHint
                title={connectionPool.length === 0 ? t('No connections yet.', 'Δεν υπάρχουν συνδέσεις ακόμη.') : t('No connection matches this filter.', 'Καμία σύνδεση δεν ταιριάζει σε αυτό το φίλτρο.')}
                detail={connectionPool.length === 0 ? t('Open Matches, pick a person and send a connection request. Accepted requests appear here.', 'Άνοιξε τις Αντιστοιχίσεις, διάλεξε ένα άτομο και στείλε αίτημα σύνδεσης. Τα αποδεκτά αιτήματα εμφανίζονται εδώ.') : t('Try another status or search term.', 'Δοκίμασε άλλη κατάσταση ή όρο αναζήτησης.')}
              >
                {connectionPool.length > 0 && (
                  <ClearFiltersButton onClick={() => { setStatusFilter('All'); setNetworkQuery(''); }} />
                )}
                <button type="button" className="text-xs font-medium text-stone-900 hover:underline min-h-11" onClick={() => navigate('/matches')}>{t('Open matches', 'Άνοιγμα αντιστοιχίσεων')}</button>
              </EmptyHint>
            ) : null}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleConnections.map((conn, i) => (
                <motion.div key={conn.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05, duration: 0.4 }}>
                  <Card className={cn('group hover:border-stone-300 hover:shadow-md transition-all p-5 border-stone-100 h-full', conn.status === 'Incoming' && 'border-stone-900/20 bg-stone-50/40')}>
                    <div className="flex flex-col items-center text-center space-y-4 h-full">
                      <button type="button" className="relative flex flex-col items-center mb-3 shrink-0" onClick={() => { rememberPerson({ id: conn.id, fullName: conn.fullName, headline: conn.headline, headlineEl: conn.headlineEl, role: conn.role, industry: conn.industry, location: conn.location }); navigate(`/profile/${conn.id}`); }} aria-label={t('View profile', 'Προβολή προφίλ')}>
                        <Avatar src={conn.avatar} fallback={conn.fullName} size="xl" className="rounded-2xl" />
                        <div className={cn('absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white', conn.status === 'Connected' ? (isOnline(conn.person) ? 'bg-emerald-500' : 'bg-stone-300') : 'bg-amber-400')} />
                      </button>
                      <div className="space-y-1 min-w-0 w-full">
                        <h4 className="text-base font-semibold text-stone-900 truncate">
                          <PersonHovercard person={conn.id}>{conn.fullName}</PersonHovercard>
                        </h4>
                        <FactLine className="justify-center text-sm" items={[labelOf(conn.role), conn.industry, conn.location]} />
                        <p className={cn('text-xs', conn.status === 'Incoming' ? 'text-stone-900 font-medium' : 'text-stone-400')}>{statusLabel(conn.status)}</p>
                      </div>
                      <div className="flex items-center gap-2 w-full pt-1 mt-auto">
                        {conn.status === 'Incoming' ? (
                          <>
                            <Button type="button" onClick={() => void acceptIncoming(conn)} className="flex-1 min-h-10 rounded-lg bg-stone-900 text-white hover:bg-stone-700 text-sm font-medium"><Check className="w-3.5 h-3.5 mr-1" /> {t('Accept', 'Αποδοχή')}</Button>
                            <Button type="button" variant="outline" aria-label={t(`Decline request from ${conn.fullName}`, `Απόρριψη αιτήματος από ${conn.fullName}`)} title={t('Decline request', 'Απόρριψη αιτήματος')} onClick={() => void declineIncoming(conn)} className="min-h-10 px-3 rounded-lg border-stone-200 text-sm"><X className="w-3.5 h-3.5" /></Button>
                          </>
                        ) : conn.status === 'Pending' ? (
                          <>
                            <Button type="button" variant="outline" onClick={() => void withdraw(conn)} className="flex-1 min-h-10 rounded-lg border-stone-200 text-sm">{t('Withdraw', 'Ανάκληση')}</Button>
                            <Button type="button" variant="outline" size="icon" aria-label={t('View profile', 'Προβολή προφίλ')} onClick={() => navigate(`/profile/${conn.id}`)} className="h-10 w-10 rounded-lg border-stone-200 text-stone-400 hover:text-stone-900"><ChevronRight className="w-3.5 h-3.5" /></Button>
                          </>
                        ) : (
                          <>
                            <Button type="button" onClick={() => navigate(`/messages?user=${conn.id}`)} className="flex-1 min-h-10 rounded-lg bg-stone-900 text-white hover:bg-stone-700 text-sm font-medium transition-all">{t('Message', 'Μήνυμα')}</Button>
                            {conn.record && (
                              <Button type="button" variant="outline" size="icon" aria-label={t('Remove connection', 'Αφαίρεση σύνδεσης')} title={t('Remove connection', 'Αφαίρεση σύνδεσης')} onClick={() => disconnect(conn)} className="h-10 w-10 rounded-lg border-stone-200 text-stone-400 hover:text-red-600"><UserMinus className="w-3.5 h-3.5" /></Button>
                            )}
                            <Button type="button" variant="outline" size="icon" aria-label={t('View profile', 'Προβολή προφίλ')} onClick={() => { rememberPerson({ id: conn.id, fullName: conn.fullName, headline: conn.headline, headlineEl: conn.headlineEl, role: conn.role, industry: conn.industry, location: conn.location }); navigate(`/profile/${conn.id}`); }} className="h-10 w-10 rounded-lg border-stone-200 text-stone-400 hover:text-stone-900"><ChevronRight className="w-3.5 h-3.5" /></Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="space-y-4">
            {saved.length === 0 && (
              <EmptyHint title={t('No saved profiles yet.', 'Δεν υπάρχουν αποθηκευμένα προφίλ ακόμη.')} detail={t('Save a person from Matches or Explore and they will wait for you here.', 'Αποθήκευσε ένα άτομο από τις Αντιστοιχίσεις ή την Εξερεύνηση και θα σε περιμένει εδώ.')}>
                <button type="button" className="text-xs font-medium text-stone-900 hover:underline min-h-11" onClick={() => navigate('/matches')}>{t('Open matches', 'Άνοιγμα αντιστοιχίσεων')}</button>
              </EmptyHint>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {saved.map((p, i) => {
                const person = findPerson(p.id);
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05 }}>
                    <Card className="p-5 border-stone-100 hover:border-stone-300 transition-all group h-full">
                      <div className="flex items-start gap-4">
                        <Avatar src={person ? avatarOf(person) : isDemoMode ? avatarFor(p.id, 200) : ''} fallback={p.fullName} size="lg" className="rounded-xl" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-semibold text-stone-900 truncate">
                            <PersonHovercard person={p.id}>{p.fullName}</PersonHovercard>
                          </h4>
                          <FactLine className="text-sm" items={[labelOf(p.role), p.industry, p.location]} />
                          {p.note ? <p className="text-sm text-stone-500 mt-1 line-clamp-2">{p.note}</p> : null}
                        </div>
                        <Button variant="ghost" size="icon" aria-label={t('Remove from saved', 'Αφαίρεση από τα αποθηκευμένα')} title={t('Remove from saved', 'Αφαίρεση από τα αποθηκευμένα')} onClick={() => { removeSaved(p.id); }} className="w-9 h-9 rounded-lg text-stone-400 hover:text-stone-900 shrink-0">
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </Button>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button onClick={() => navigate(`/messages?user=${p.id}`)} className="flex-1 min-h-10 text-sm rounded-lg bg-stone-900 text-white hover:bg-stone-700">{t('Message', 'Μήνυμα')}</Button>
                        <Button onClick={() => { rememberPerson({ id: p.id, fullName: p.fullName, headline: p.role, role: p.role, industry: p.industry, location: p.location, bio: p.note }); navigate(`/profile/${p.id}`); }} variant="outline" className="flex-1 min-h-10 text-sm rounded-lg border-stone-200">{t('View profile', 'Προβολή προφίλ')}</Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
            <button type="button" onClick={() => navigate('/matches')} className="w-full p-4 min-h-12 rounded-xl border-2 border-dashed border-stone-200 hover:border-stone-400 transition-all text-stone-400 hover:text-stone-700 flex items-center justify-center gap-2 text-sm font-medium">
              <UserPlus className="w-3.5 h-3.5" /> {t('Find more people to save', 'Βρες περισσότερα άτομα για αποθήκευση')}
            </button>
          </div>
        )}

        {activeTab === 'endorsements' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              {!endorsementsLoaded ? (
                [0, 1].map((i) => <div key={i} className="h-24 rounded-2xl bg-stone-100 animate-pulse" />)
              ) : received.length === 0 ? (
                <EmptyHint title={t('No endorsements yet.', 'Δεν υπάρχουν συστάσεις ακόμη.')} detail={t('Members you have worked with can confirm your skills from your profile. Ask a connection to endorse you.', 'Μέλη με τα οποία έχεις συνεργαστεί μπορούν να επιβεβαιώσουν τις δεξιότητές σου από το προφίλ σου. Ζήτησε από μια σύνδεση να σε συστήσει.')}>
                  <button type="button" className="text-xs font-medium text-stone-900 hover:underline min-h-11" onClick={() => navigate('/messages')}>{t('Ask a connection', 'Ζήτα από μια σύνδεση')}</button>
                </EmptyHint>
              ) : received.map((e, i) => {
                const person = findPerson(e.endorserId);
                const who = person?.fullName || e.endorserName || t('A member', 'Ένα μέλος');
                return (
                  <motion.div key={e.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 8) * 0.06 }}>
                    <Card className="p-4 border-stone-100 hover:border-stone-200 transition-all group">
                      <div className="flex items-start gap-3">
                        <Avatar src={(person ? avatarOf(person) : '') || e.endorserAvatar} fallback={who} size="md" className="rounded-xl" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold text-stone-900">{t('Endorsed for', 'Σύσταση για')}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-semibold">{labelOf(e.skillId)}</span>
                          </div>
                          <p className="text-xs text-stone-400 mb-1.5">
                            {t('by', 'από')} <PersonHovercard person={e.endorserId}>{who}</PersonHovercard>{e.createdAt ? ` · ${formatDate(e.createdAt)}` : ''}
                          </p>
                          {e.comment ? <p className="text-sm text-stone-500 leading-relaxed">“{e.comment}”</p> : null}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
              <button type="button" onClick={() => navigate('/messages')} className="w-full p-4 min-h-12 rounded-xl border-2 border-dashed border-stone-200 hover:border-stone-400 transition-all text-stone-400 hover:text-stone-700 flex items-center justify-center gap-2 text-sm font-medium">
                <Plus className="w-3.5 h-3.5" /> {t('Ask a connection for an endorsement', 'Ζήτησε σύσταση από μια σύνδεση')}
              </button>

              {given.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-semibold text-stone-500 tracking-wider">{t('Endorsements you gave', 'Συστάσεις που έδωσες')}</h3>
                  {given.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl border border-stone-100 bg-white">
                      <div className="flex-1 min-w-0 text-sm text-stone-700">
                        <PersonHovercard person={e.recipientId}>{e.recipientName || t('A member', 'Ένα μέλος')}</PersonHovercard> · <span className="text-stone-500">{labelOf(e.skillId)}</span>
                      </div>
                      <button type="button" onClick={() => void act(async () => { await withdrawEndorsement(e.id); setGiven((prev) => prev.filter((item) => item.id !== e.id)); }, t('Endorsement withdrawn', 'Η σύσταση ανακλήθηκε'))} className="min-h-9 px-2 text-xs text-stone-400 hover:text-red-600">{t('Withdraw', 'Ανάκληση')}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 space-y-4">
              <Card className="p-4 border-stone-100">
                <h3 className="text-xs font-semibold text-stone-500 tracking-wider mb-3">{t('Endorsed skills', 'Δεξιότητες με σύσταση')}</h3>
                {skillCounts.length === 0 ? (
                  <p className="text-sm text-stone-400">{t('The distribution appears once you receive endorsements.', 'Η κατανομή εμφανίζεται μόλις λάβεις συστάσεις.')}</p>
                ) : (
                  <div className="space-y-2.5">
                    {skillCounts.map(([skill, count], i) => (
                      <div key={skill} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-stone-600">{labelOf(skill)}</span>
                          <span className="text-xs font-semibold text-stone-400 tabular-nums">{count}</span>
                        </div>
                        <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(count / (topSkill?.[1] || 1)) * 100}%` }} transition={{ duration: 1, delay: i * 0.1 }} className="h-full rounded-full bg-stone-900" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {topSkill && (
                <div className="studio-nudge bg-amber-50 border border-amber-100 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                    <span className="text-sm font-semibold text-stone-900">{t('Your strongest signal', 'Το πιο δυνατό σου σημείο')}</span>
                  </div>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    {t(`${topSkill[1]} ${topSkill[1] === 1 ? 'member has' : 'members have'} endorsed you for `, `${topSkill[1]} ${topSkill[1] === 1 ? 'μέλος σε έχει συστήσει' : 'μέλη σε έχουν συστήσει'} για `)}
                    <span className="font-semibold text-stone-900">{labelOf(topSkill[0])}</span>.
                  </p>
                  <Button
                    type="button"
                    onClick={() => void shareLink({ title: 'CoFounderBay', text: t(`Endorsed for ${topSkill[0]} on CoFounderBay`, `Σύσταση για ${labelOf(topSkill[0])} στο CoFounderBay`), url: `${window.location.origin}/profile/${user.id}` }).then((result) => { if (result === 'copied') toast.success(t('Link copied', 'Ο σύνδεσμος αντιγράφηκε')); })}
                    className="w-full min-h-10 rounded-lg bg-stone-900 text-white text-sm hover:bg-stone-700"
                  >
                    {t('Share your profile', 'Κοινοποίηση προφίλ')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'compare' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="p-6 border-stone-100" contentClassName="space-y-5">
              <div className="text-center space-y-2 max-w-md mx-auto">
                <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto text-stone-400"><BarChart3 className="w-8 h-8" /></div>
                <h3 className="text-base font-semibold text-stone-900">{t('Compare connections', 'Σύγκριση συνδέσεων')}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">
                  {t('Pick up to 3 connections to compare skills, stage, commitment and fit with your profile side by side.', 'Διάλεξε έως 3 συνδέσεις για να συγκρίνεις δεξιότητες, στάδιο, δέσμευση και συμβατότητα με το προφίλ σου, δίπλα-δίπλα.')}
                </p>
              </div>
              {comparePool.length === 0 ? (
                <EmptyHint title={t('Nothing to compare yet.', 'Δεν υπάρχει τίποτα για σύγκριση ακόμη.')} detail={t('Comparison works with your accepted connections.', 'Η σύγκριση λειτουργεί με τις αποδεκτές συνδέσεις σου.')} />
              ) : (
                <div className="flex flex-wrap justify-center gap-2">
                  {comparePool.map((conn) => {
                    const selected = picked.includes(conn.id);
                    return (
                      <button key={conn.id} type="button" aria-pressed={selected} disabled={!selected && picked.length >= 3}
                        onClick={() => { setCompared(false); setPicked((prev) => (selected ? prev.filter((id) => id !== conn.id) : [...prev, conn.id])); }}
                        className={cn('flex items-center gap-2 min-h-11 pl-1.5 pr-3 rounded-full border text-sm transition-all disabled:opacity-40', selected ? 'border-stone-400 bg-stone-200 text-stone-900' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400')}>
                        <Avatar src={conn.avatar} fallback={conn.fullName} size="xs" />
                        {conn.fullName.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-center">
                <Button onClick={() => picked.length >= 2 && setCompared(true)} disabled={picked.length < 2} className="min-h-11 px-6 rounded-xl bg-stone-900 text-white text-sm hover:bg-stone-700">
                  {t('Compare', 'Σύγκριση')}{picked.length ? ` (${picked.length})` : ''}
                </Button>
              </div>
              {compared && compareRows.length >= 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  {compareRows.map((conn) => {
                    const person = conn.person;
                    const fit = person ? compatibility(me, fromCast({ skills: person.skills, lookingFor: person.lookingFor, interests: person.interests, industry: person.industry, stage: person.stage, commitment: person.commitment, city: person.city, timezone: person.timezone })) : null;
                    const gaps = person ? teamGaps(person.skills) : null;
                    return (
                      <div key={conn.id} className="rounded-xl border border-stone-100 p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={conn.avatar} fallback={conn.fullName} size="md" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-stone-900 truncate"><PersonHovercard person={conn.id}>{conn.fullName}</PersonHovercard></p>
                            <FactLine className="text-xs" items={[labelOf(conn.role), conn.industry]} />
                          </div>
                        </div>
                        {fit?.score != null && (
                          <div>
                            <div className="flex items-center justify-between text-xs"><span className="text-stone-500">{t('Fit with you', 'Συμβατότητα μαζί σου')}</span><span className="font-semibold text-stone-900 tabular-nums">{fit.score}%</span></div>
                            <div className="h-1.5 bg-stone-100 rounded-full mt-1 overflow-hidden"><div className="h-full bg-stone-900 rounded-full" style={{ width: `${fit.score}%` }} /></div>
                            {fit.headline && <p className="text-xs text-stone-500 mt-1">{mode === 'el' ? fit.headline.el : fit.headline.en}</p>}
                          </div>
                        )}
                        <dl className="space-y-1.5 text-xs">
                          <div className="flex justify-between gap-2"><dt className="text-stone-400">{t('Stage', 'Στάδιο')}</dt><dd className="text-stone-800 text-right">{labelOf(person?.stage) || '—'}</dd></div>
                          <div className="flex justify-between gap-2"><dt className="text-stone-400">{t('Commitment', 'Δέσμευση')}</dt><dd className="text-stone-800 text-right">{labelOf(person?.commitment) || '—'}</dd></div>
                          <div className="flex justify-between gap-2"><dt className="text-stone-400">{t('Location', 'Τοποθεσία')}</dt><dd className="text-stone-800 text-right">{conn.location || '—'}</dd></div>
                        </dl>
                        {person && person.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">{person.skills.slice(0, 6).map((skill) => <span key={skill} className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-xs">{labelOf(skill)}</span>)}</div>
                        )}
                        {gaps && (
                          <p className="text-xs text-stone-500">
                            {t('Covers', 'Καλύπτει')}: {gaps.covered.length ? gaps.covered.map((area) => (mode === 'el' ? TEAM_AREAS[area].el : TEAM_AREAS[area].en)).join(', ') : '—'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {activeTab === 'needs' && (
          <NeedsTab
            needs={needs}
            draft={draft}
            setDraft={setDraft}
            editing={editing}
            setEditing={setEditing}
            saveNeed={saveNeed}
          />
        )}
      </div>
      <ConfirmDialog
        open={pendingDisconnect !== null}
        onClose={() => setPendingDisconnect(null)}
        onConfirm={() => {
          const conn = pendingDisconnect;
          setPendingDisconnect(null);
          if (conn?.record) void act(() => removeConnection(conn.record!), t('Connection removed', 'Η σύνδεση αφαιρέθηκε'));
        }}
        title={pendingDisconnect ? t(`Remove ${pendingDisconnect.fullName} from your connections?`, `Αφαίρεση του μέλους ${pendingDisconnect.fullName} από τις συνδέσεις σου;`) : t('Remove connection', 'Αφαίρεση σύνδεσης')}
        description={t('You can send a new request later from Matches or their profile.', 'Μπορείς να στείλεις νέο αίτημα αργότερα από τις Αντιστοιχίσεις ή το προφίλ τους.')}
        confirmLabel={t('Remove', 'Αφαίρεση')}
        variant="danger"
      />
    </PageShell>
  );
}

function NeedsTab({
  needs,
  draft,
  setDraft,
  editing,
  setEditing,
  saveNeed,
}: {
  needs: NeedCard[];
  draft: { exists: string; outcome: string; missing: string; offer: string };
  setDraft: (next: { exists: string; outcome: string; missing: string; offer: string }) => void;
  editing: string | null;
  setEditing: (id: string | null) => void;
  saveNeed: (card?: NeedCard) => void;
}) {
  const t = useT();
  const fieldRows = useMemo(() => (['exists', 'outcome', 'missing', 'offer'] as NeedField[]), []);
  const startEdit = (card: NeedCard) => {
    setEditing(card.id);
    setDraft({ exists: card.exists, outcome: card.outcome, missing: card.missing, offer: card.offer ?? '' });
  };
  return (
    <div className="space-y-4">
      {needs.length === 0 && (
        <EmptyHint
          title={t('No need cards yet.', 'Δεν υπάρχουν κάρτες ανάγκης.')}
          detail={t('One card, three sentences: what exists, the outcome, who is missing. The assistant stores the same list.', 'Μία κάρτα, τρεις προτάσεις: τι υπάρχει, το αποτέλεσμα, ποιος λείπει. Ο βοηθός κρατά την ίδια λίστα.')}
        >
          <AskLink prompt="Draft a need card for a co-founder">{t('Draft with assistant', 'Πρόχειρο από τον βοηθό')}</AskLink>
        </EmptyHint>
      )}
      {needs.map((card) => {
        const isEditing = editing === card.id;
        return (
          <Card key={card.id} className="p-5 border-stone-100" contentClassName="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-stone-900">
                {t('Need card', 'Κάρτα ανάγκης')} · v{card.version ?? 1}
              </p>
              <span className="text-sm text-stone-500">{card.status === 'open' ? t('Open', 'Ανοιχτή') : t('Closed', 'Κλειστή')}</span>
            </div>
            {isEditing ? (
              <NeedFields draft={draft} setDraft={setDraft} />
            ) : (
              <dl className="space-y-2">
                {fieldRows.map((field) => {
                  const value = card[field];
                  if (!value) return null;
                  return (
                    <div key={field}>
                      <dt className="text-xs font-medium text-stone-400">{t(FIELD_LABEL[field].en, FIELD_LABEL[field].el)}</dt>
                      <dd className="text-sm leading-snug text-stone-800">{value}</dd>
                    </div>
                  );
                })}
              </dl>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {isEditing ? (
                <>
                  <Button type="button" className="h-8 px-3 text-sm rounded-lg bg-stone-900 text-white" onClick={() => saveNeed(card)}>{t('Save', 'Αποθήκευση')}</Button>
                  <Button type="button" variant="outline" className="h-8 px-3 text-sm rounded-lg" onClick={() => { setEditing(null); setDraft({ exists: '', outcome: '', missing: '', offer: '' }); }}>{t('Cancel', 'Ακύρωση')}</Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" className="h-8 px-3 text-sm rounded-lg" onClick={() => startEdit(card)}>{t('Edit', 'Επεξεργασία')}</Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-3 text-sm rounded-lg"
                    onClick={() => (card.status === 'open' ? closeNeed(card.id) : setNeedStatus(card.id, 'open'))}
                  >
                    {card.status === 'open' ? t('Close', 'Κλείσιμο') : t('Reopen', 'Επαναφορά')}
                  </Button>
                  <AskLink prompt={`Change the outcome of my need card about ${card.missing}`}>{t('Ask', 'Ρώτα')}</AskLink>
                </>
              )}
            </div>
            {(card.history?.length || card.version) && (
              <div>
                <p className="text-xs font-medium text-stone-400 mb-2">{t('Versions', 'Εκδόσεις')}</p>
                <Timeline
                  items={[
                    {
                      id: `${card.id}-now`,
                      current: true,
                      title: t(`v${card.version ?? 1} · current`, `v${card.version ?? 1} · τρέχουσα`),
                      meta: formatDateTime(card.at),
                    },
                    ...(card.history ?? []).map((entry) => ({
                      id: `${card.id}-v${entry.version}`,
                      title: t(
                        `v${entry.version} · ${entry.changed.map((field) => FIELD_LABEL[field].en).join(', ')}`,
                        `v${entry.version} · ${entry.changed.map((field) => FIELD_LABEL[field].el).join(', ')}`,
                      ),
                      meta: formatDateTime(entry.replacedAt),
                    })),
                  ]}
                />
              </div>
            )}
          </Card>
        );
      })}
      <Card className="p-5 border-dashed border-stone-200" contentClassName="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <FileText className="w-4 h-4" /> {t('New need card', 'Νέα κάρτα ανάγκης')}
          </p>
          <AskLink prompt="Draft a need card for a co-founder">{t('Draft with assistant', 'Πρόχειρο από τον βοηθό')}</AskLink>
        </div>
        <NeedFields draft={editing ? { exists: '', outcome: '', missing: '', offer: '' } : draft} setDraft={editing ? () => undefined : setDraft} />
        <Button
          type="button"
          className="h-8 px-3 text-sm rounded-lg bg-stone-900 text-white"
          disabled={Boolean(editing)}
          onClick={() => saveNeed()}
        >
          {t('Save card', 'Αποθήκευση κάρτας')}
        </Button>
      </Card>
    </div>
  );
}

function NeedFields({
  draft,
  setDraft,
}: {
  draft: { exists: string; outcome: string; missing: string; offer: string };
  setDraft: (next: { exists: string; outcome: string; missing: string; offer: string }) => void;
}) {
  const t = useT();
  const rows: { field: NeedField; rows: number }[] = [
    { field: 'exists', rows: 2 },
    { field: 'outcome', rows: 2 },
    { field: 'missing', rows: 2 },
    { field: 'offer', rows: 2 },
  ];
  return (
    <div className="grid gap-3">
      {rows.map(({ field, rows: lineRows }) => (
        <label key={field} className="block space-y-1">
          <span className="text-xs font-medium text-stone-400">{t(FIELD_LABEL[field].en, FIELD_LABEL[field].el)}</span>
          <textarea
            rows={lineRows}
            value={draft[field]}
            onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-200"
          />
        </label>
      ))}
    </div>
  );
}
