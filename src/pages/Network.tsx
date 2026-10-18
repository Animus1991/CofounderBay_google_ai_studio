import { useMemo, useState } from 'react';
import {
  BarChart3,
  FileText,
  Globe,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  UserPlus,
  ChevronRight,
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
  removeSaved,
  setNeedStatus,
  upsertNeed,
  type NeedCard,
  type NeedField,
} from '../lib/localLists';
import { useStored } from '../lib/useStored';
import { rememberPerson } from '../lib/people';
import { useT } from '../lib/language';
import { labelOf } from '../lib/labels';
import { formatDate, formatDateTime } from '../lib/dates';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import PageShell from '../components/ui/PageShell';
import FactLine from '../components/ui/FactLine';
import EmptyHint, { AskLink } from '../components/ui/EmptyHint';
import Tabs from '../components/ui/Tabs';
import Timeline from '../components/ui/Timeline';
import PersonHovercard from '../components/ui/PersonHovercard';
import { avatarFor } from '../data/cast';
import { User, Endorsement, UserRole } from '../types';
import { cn } from '../lib/utils';

interface NetworkProps {
  user: User;
}

type NetworkTab = 'connections' | 'saved' | 'endorsements' | 'compare' | 'needs';

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

export default function Network({ user }: NetworkProps) {
  const t = useT();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const activeTab: NetworkTab = isTab(params.get('tab')) ? params.get('tab') as NetworkTab : 'connections';
  const setActiveTab = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === 'connections') next.delete('tab');
    else next.set('tab', id);
    setParams(next, { replace: true });
  };
  const saved = useStored(readSaved, [keys.saved]);
  const requests = useStored(readRequests, [keys.requests]);
  const needs = useStored(readNeeds, [keys.needs]);
  const [networkQuery, setNetworkQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Connected' | 'Pending'>('All');
  const [picked, setPicked] = useState<string[]>([]);
  const [compared, setCompared] = useState(false);
  const [draft, setDraft] = useState({ exists: '', outcome: '', missing: '', offer: '' });
  const [editing, setEditing] = useState<string | null>(null);

  const mockConnections = [
    { id: 'sarah-chen', fullName: 'Sarah Chen', role: UserRole.FOUNDER, industry: 'FinTech', status: 'Connected', location: 'New York' },
    { id: 'alex-rivera', fullName: 'Alex Rivera', role: UserRole.FOUNDER, industry: 'AI', status: 'Connected', location: 'San Francisco' },
    { id: 'james-wilson', fullName: 'James Wilson', role: UserRole.ADVISOR, industry: 'SaaS', status: 'Pending', location: 'London' },
    { id: 'elena-rodriguez', fullName: 'Elena Rodriguez', role: UserRole.CO_FOUNDER_CANDIDATE, industry: 'CleanTech', status: 'Connected', location: 'Barcelona' },
  ];
  const visibleConnections = [...mockConnections, ...requests.filter((item) => !mockConnections.some((conn) => conn.id === item.id))].filter((conn) => {
    const q = networkQuery.trim().toLowerCase();
    const matchesQuery = !q || conn.fullName.toLowerCase().includes(q) || String(conn.role).toLowerCase().includes(q) || String(conn.industry ?? '').toLowerCase().includes(q);
    const status = 'status' in conn ? String(conn.status) : 'Pending';
    const matchesStatus = statusFilter === 'All' || status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const mockEndorsements: Endorsement[] = [
    { id: 'e1', endorserId: 'sarah-chen', recipientId: user.id, skillId: 'Product Strategy', comment: "One of the most focused founders I've worked with.", createdAt: '2026-03-15' },
    { id: 'e2', endorserId: 'alex-rivera', recipientId: user.id, skillId: 'Full-Stack Dev', comment: 'Incredible technical depth and speed.', createdAt: '2026-03-20' },
  ];

  const openNeeds = needs.filter((item) => item.status === 'open').length;
  const tabItems = [
    { id: 'connections', label: t('Connections', 'Συνδέσεις'), count: visibleConnections.length },
    { id: 'saved', label: t('Saved', 'Αποθηκευμένα'), count: saved.length },
    { id: 'endorsements', label: t('Endorsements', 'Συστάσεις'), count: mockEndorsements.length },
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

  return (
    <PageShell title={t('Network', 'Δίκτυο')} description={t('Manage connections, endorsements, and saved profiles.', 'Συνδέσεις, συστάσεις και αποθηκευμένα προφίλ.')}>
      <div className="space-y-6">
        <button
          type="button"
          className="text-xs font-medium text-stone-500 hover:text-stone-900"
          onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'Invite 3 founders' } }))}
        >
          {t('Invite 3 founders · the assistant prepares the same fit-check link', 'Προσκάλεσε 3 ιδρυτές · ο βοηθός ετοιμάζει τον ίδιο σύνδεσμο fit check')}
        </button>
        <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} variant="segment" />

        {activeTab === 'connections' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="relative w-full min-w-0 sm:max-w-xs sm:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder={t('Search network...', 'Αναζήτηση δικτύου...')}
                  value={networkQuery}
                  onChange={(e) => setNetworkQuery(e.target.value)}
                  className="w-full min-h-11 bg-stone-50 border border-stone-200 rounded-xl py-2 pl-9 pr-4 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300 transition-all"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-8 px-3 text-sm rounded-lg border-stone-200"
                onClick={() => setStatusFilter((prev) => (prev === 'All' ? 'Connected' : prev === 'Connected' ? 'Pending' : 'All'))}
              >
                <SlidersHorizontal className="w-3 h-3 mr-1.5" /> {statusFilter === 'All' ? t('Filter', 'Φίλτρο') : t(statusFilter, statusFilter === 'Connected' ? 'Συνδεδεμένα' : 'Σε εκκρεμότητα')}
              </Button>
              <span className="text-sm text-stone-400 ml-auto">{t(`${visibleConnections.length} connections`, `${visibleConnections.length} συνδέσεις`)}</span>
            </div>

            {visibleConnections.length === 0 && (
              <EmptyHint title={t('No connections match this filter.', 'Καμία σύνδεση δεν ταιριάζει σε αυτό το φίλτρο.')} detail={t('Ask the studio assistant who your best match is, then save them here.', 'Ρώτα τον βοηθό ποια είναι η καλύτερη αντιστοίχιση και αποθήκευσέ την εδώ.')}>
                <AskLink prompt="who is my best match">{t('Ask assistant', 'Ρώτα τον βοηθό')}</AskLink>
              </EmptyHint>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleConnections.map((conn, i) => (
                <motion.div
                  key={conn.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                >
                  <Card className="group hover:border-stone-300 hover:shadow-md transition-all p-5 border-stone-100">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-stone-100 overflow-hidden border border-stone-200">
                          <img src={avatarFor(conn.id, 200)} alt={conn.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className={cn(
                          'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white',
                          conn.status === 'Connected' ? 'bg-emerald-500' : 'bg-amber-400',
                        )} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-semibold text-stone-900">
                          <PersonHovercard person={conn.id}>{conn.fullName}</PersonHovercard>
                        </h4>
                        <FactLine className="justify-center text-sm" items={[labelOf(String(conn.role)), conn.industry, conn.location]} />
                      </div>
                      <div className="flex items-center gap-2 w-full pt-1">
                        <Button type="button" variant="ghost" className="h-8 px-2 text-xs rounded-lg" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Tell me about ${conn.fullName}`, context: conn.fullName } }))}>
                          {t('Ask', 'Ρώτα')}
                        </Button>
                        <Button onClick={() => navigate(`/messages?user=${conn.id}`)} className="flex-1 h-8 rounded-lg bg-stone-900 text-white hover:bg-stone-700 text-sm font-medium transition-all">
                          {t('Message', 'Μήνυμα')}
                        </Button>
                        <Button onClick={() => { rememberPerson({ id: conn.id, fullName: conn.fullName, headline: String(conn.role), role: String(conn.role), industry: conn.industry, location: conn.location }); navigate(`/profile/${conn.id}`); }} variant="outline" size="icon" className="h-11 w-11 sm:h-8 sm:w-8 rounded-lg border-stone-200 text-stone-400 hover:text-stone-900">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
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
              <EmptyHint title={t('No saved profiles yet.', 'Δεν υπάρχουν αποθηκευμένα προφίλ.')} detail={t('Open Matches and save a person. The same list the assistant reads.', 'Άνοιξε τις Αντιστοιχίσεις και αποθήκευσε ένα πρόσωπο. Η ίδια λίστα με τον βοηθό.')}>
                <button type="button" className="text-xs font-medium text-stone-900 hover:underline" onClick={() => navigate('/matches')}>{t('Open matches', 'Άνοιγμα αντιστοιχίσεων')}</button>
              </EmptyHint>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {saved.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                  <Card className="p-5 border-stone-100 hover:border-stone-300 transition-all group">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-stone-100 overflow-hidden border border-stone-200 shrink-0">
                        <img src={avatarFor(p.id, 200)} alt={p.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-stone-900">
                          <PersonHovercard person={p.id}>{p.fullName}</PersonHovercard>
                        </h4>
                        <FactLine className="text-sm" items={[labelOf(p.role), p.industry, p.location]} />
                        {p.note ? <p className="text-sm text-stone-500 mt-1">{p.note}</p> : null}
                      </div>
                      <Button variant="ghost" size="icon" title={t('Remove from saved', 'Αφαίρεση από τα αποθηκευμένα')} onClick={() => { removeSaved(p.id); }} className="w-7 h-7 rounded-lg text-stone-300 hover:text-stone-900 shrink-0">
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </Button>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button onClick={() => navigate(`/messages?user=${p.id}`)} className="flex-1 h-7 text-sm rounded-lg bg-stone-900 text-white hover:bg-stone-700">{t('Connect', 'Σύνδεση')}</Button>
                      <Button onClick={() => { rememberPerson({ id: p.id, fullName: p.fullName, headline: p.role, role: p.role, industry: p.industry, location: p.location, bio: p.note }); navigate(`/profile/${p.id}`); }} variant="outline" className="flex-1 h-11 sm:h-7 text-sm rounded-lg border-stone-200">{t('View Profile', 'Προφίλ')}</Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
            <button type="button" onClick={() => navigate('/matches')} className="w-full p-4 rounded-xl border-2 border-dashed border-stone-200 hover:border-stone-400 transition-all text-stone-400 hover:text-stone-700 flex items-center justify-center gap-2 text-sm font-medium">
              <UserPlus className="w-3.5 h-3.5" /> {t('Browse to save more profiles', 'Περισσότερα προφίλ στις Αντιστοιχίσεις')}
            </button>
          </div>
        )}

        {activeTab === 'endorsements' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              {mockEndorsements.map((e, i) => {
                const who = e.endorserId === 'sarah-chen' ? 'Sarah Chen' : 'Alex Rivera';
                return (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card className="p-4 border-stone-100 hover:border-stone-200 transition-all group">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-stone-100 overflow-hidden border border-stone-200 shrink-0">
                          <img src={avatarFor(e.endorserId, 200)} alt={who} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-stone-900">{t('Endorsed for', 'Σύσταση για')}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-semibold">{e.skillId}</span>
                          </div>
                          <p className="text-xs text-stone-400 mb-1.5">
                            {t('by', 'από')} <PersonHovercard person={e.endorserId}>{who}</PersonHovercard> · {formatDate(e.createdAt)}
                          </p>
                          <p className="text-sm text-stone-500 leading-relaxed">"{e.comment}"</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
              <button type="button" onClick={() => navigate('/messages')} className="w-full p-4 rounded-xl border-2 border-dashed border-stone-200 hover:border-stone-400 transition-all text-stone-400 hover:text-stone-700 flex items-center justify-center gap-2 text-sm font-medium">
                <Plus className="w-3.5 h-3.5" /> {t('Request New Endorsement', 'Αίτημα νέας σύστασης')}
              </button>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <Card className="p-4 border-stone-100">
                <h3 className="text-xs font-semibold text-stone-500 tracking-wider mb-3">{t('Skill Distribution', 'Κατανομή δεξιοτήτων')}</h3>
                <div className="space-y-2.5">
                  {[
                    { skill: 'Product Strategy', count: 12 },
                    { skill: 'Full-Stack Dev', count: 8 },
                    { skill: 'UI/UX Design', count: 5 },
                    { skill: 'Growth Marketing', count: 3 },
                  ].map((item, i) => (
                    <div key={item.skill} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-stone-600">{item.skill}</span>
                        <span className="text-xs font-semibold text-stone-400">{item.count}</span>
                      </div>
                      <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.count / 12) * 100}%` }}
                          transition={{ duration: 1, delay: i * 0.1 }}
                          className="h-full rounded-full bg-stone-900"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="studio-nudge bg-amber-50 border border-amber-100 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                  <span className="text-sm font-semibold text-stone-900">{t('Expert Badge', 'Σήμα ειδικού')}</span>
                </div>
                <p className="text-sm text-stone-600 leading-relaxed">
                  {t('You are in the ', 'Είσαι στο ')}
                  <span className="font-semibold text-stone-900">{t('top 5%', 'κορυφαίο 5%')}</span>
                  {t(' of founders endorsed for Product Strategy this month.', ' των ιδρυτών με σύσταση για Product Strategy αυτόν τον μήνα.')}
                </p>
                <Button type="button" onClick={() => { void navigator.clipboard?.writeText('Endorsed for Product Strategy on CoFounderBay'); window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'Tell me about readiness score' } })); }} className="w-full h-7 rounded-lg bg-stone-900 text-white text-sm hover:bg-stone-700">
                  {t('Share Achievement', 'Κοινοποίηση')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'compare' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="p-6 text-center space-y-5 border-stone-100">
              <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto text-stone-400">
                <BarChart3 className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-base font-semibold text-stone-900">{t('Compare Profiles', 'Σύγκριση προφίλ')}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">
                  {t('Select up to 3 connections to compare skills, experience, and co-founder compatibility side-by-side.', 'Διάλεξε έως 3 συνδέσεις για σύγκριση δεξιοτήτων, εμπειρίας και συμβατότητας συνιδρυτή.')}
                </p>
              </div>
              <div className="flex items-center justify-center gap-4">
                {[0, 1, 2].map((i) => {
                  const person = mockConnections.find((conn) => conn.id === picked[i]);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setCompared(false);
                        if (person) {
                          setPicked((prev) => prev.filter((id) => id !== person.id));
                          return;
                        }
                        const next = mockConnections.find((conn) => !picked.includes(conn.id));
                        if (next) setPicked((prev) => [...prev, next.id]);
                      }}
                      className="w-24 h-24 rounded-2xl border-2 border-dashed border-stone-200 flex items-center justify-center text-stone-300 hover:border-stone-400 hover:text-stone-500 transition-all cursor-pointer group"
                    >
                      {person ? <span className="text-xs font-medium text-stone-900 px-2">{person.fullName.split(' ')[0]}</span> : <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />}
                    </button>
                  );
                })}
              </div>
              <Button onClick={() => picked.length >= 2 && setCompared(true)} className="h-9 px-6 rounded-xl bg-stone-900 text-white text-sm hover:bg-stone-700">
                {t('Start Comparison', 'Έναρξη σύγκρισης')}
              </Button>
              {compared && picked.length >= 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  {picked.map((id) => {
                    const person = mockConnections.find((conn) => conn.id === id);
                    if (!person) return null;
                    return (
                      <div key={id} className="rounded-xl border border-stone-100 p-3 space-y-1">
                        <p className="text-sm font-semibold text-stone-900">
                          <PersonHovercard person={person.id}>{person.fullName}</PersonHovercard>
                        </p>
                        <FactLine className="text-sm" items={[labelOf(String(person.role)), person.industry, person.location]} />
                        <p className="text-sm text-stone-500">{t(person.status, person.status === 'Connected' ? 'Συνδεδεμένο' : 'Σε εκκρεμότητα')}</p>
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
          <Card key={card.id} className="p-5 border-stone-100 space-y-3">
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
                      <dt className="text-[11px] font-medium text-stone-400">{t(FIELD_LABEL[field].en, FIELD_LABEL[field].el)}</dt>
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
                    {card.status === 'open' ? t('Close', 'Κλείσιμο') : t('Reopen', 'Επανάνοιγμα')}
                  </Button>
                  <AskLink prompt={`Change the outcome of my need card about ${card.missing}`}>{t('Ask', 'Ρώτα')}</AskLink>
                </>
              )}
            </div>
            {(card.history?.length || card.version) && (
              <div>
                <p className="text-[11px] font-medium text-stone-400 mb-2">{t('Versions', 'Εκδόσεις')}</p>
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
      <Card className="p-5 border-dashed border-stone-200 space-y-3">
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
          <span className="text-[11px] font-medium text-stone-400">{t(FIELD_LABEL[field].en, FIELD_LABEL[field].el)}</span>
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
