import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart,
  Users,
  X,
  Bell,
  PlusCircle,
  Send,
  Layers,
} from 'lucide-react';
import { NeedCardItem } from '../types';
import { CardHead, CardFoot } from './CardAnatomy';
import { FactLine } from './FactLine';
import { PageHeader } from './PageHeader';
import Badge from './ui/Badge';
import { keys, logActivity, readNeedInterest, readNotificationPrefs, toggleNeedInterest, writeNotificationPrefs } from '../lib/localLists';
import { useStored } from '../lib/useStored';
import { useToast } from '../context/ToastContext';
import { equityRange } from '../lib/studioData';

interface NeedCardWallProps {
  needCards: NeedCardItem[];
  lang: 'en' | 'el';
  onExpressInterest: (card: NeedCardItem) => void;
  onCreateNeedCard: (card: Omit<NeedCardItem, 'id' | 'createdAt' | 'applicantCount' | 'status'>) => void;
  defaultLocation?: string;
  /** The founder's own venture, prefilled in "Write Need Card". */
  defaultVenture?: string;
}

export const NeedCardWall: React.FC<NeedCardWallProps> = ({
  needCards,
  lang,
  onExpressInterest,
  onCreateNeedCard,
  defaultLocation = '',
  defaultVenture = '',
}) => {
  const toast = useToast();
  const interestedIds = useStored(readNeedInterest, [keys.needInterest]);
  const notificationPrefs = useStored(readNotificationPrefs, [keys.notificationPrefs]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedCommitment, setSelectedCommitment] = useState<string>('all');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newVenture, setNewVenture] = useState(defaultVenture);
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<NeedCardItem['category']>('Engineering');
  const [newEquity, setNewEquity] = useState('');
  const [newCommitment, setNewCommitment] = useState<NeedCardItem['commitment']>('Full-Time');
  const [newStage, setNewStage] = useState<NeedCardItem['stage']>('Prototype / MVP');
  const [newSkills, setNewSkills] = useState('');
  const [newOutcome, setNewOutcome] = useState('');
  const [newLocation, setNewLocation] = useState(defaultLocation);
  const [newRemote, setNewRemote] = useState(false);

  const categories = ['all', 'Engineering', 'Growth & GTM', 'Product', 'Advisory', 'Operations'];
  const stages = ['all', 'Idea / Concept', 'Prototype / MVP', 'Pre-Seed (Traction)', 'Seed Funded'];
  const commitments = ['all', 'Full-Time', 'Part-Time (Transition to FT)', 'Evenings & Weekends', 'Advisory'];

  const filteredCards = needCards.filter((card) => {
    if (selectedCategory !== 'all' && card.category !== selectedCategory) return false;
    if (selectedStage !== 'all' && card.stage !== selectedStage) return false;
    if (selectedCommitment !== 'all' && card.commitment !== selectedCommitment) return false;
    if (remoteOnly && !card.isRemote) return false;
    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newVenture.trim()) return;

    onCreateNeedCard({
      title: newTitle,
      ventureName: newVenture,
      description: newDesc,
      category: newCategory,
      location: newLocation,
      isRemote: newRemote,
      stage: newStage,
      commitment: newCommitment,
      equityOffered: newEquity,
      skills: newSkills.split(',').map((s) => s.trim()).filter(Boolean),
      outcome: newOutcome,
    });

    setIsCreateOpen(false);
    setNewTitle('');
    setNewVenture(defaultVenture);
    setNewDesc('');
    setNewOutcome('');
    setNewSkills('');
    setNewEquity('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        headingAs="h3"
        eyebrow="Venture needs"
        eyebrowEl="Ανάγκες startups"
        title="Project Need Cards & Co-Founder Openings"
        titleEl="Κάρτες Αναγκών & Ανοιχτές Θέσεις Συνιδρυτών"
        description="Specific co-founder commitments, equity ranges, and technical or growth capabilities actively sought by founders."
        descriptionEl="Συγκεκριμένες ανάγκες συνιδρυτών, ποσοστά equity και ρόλοι ανάπτυξης που ζητούνται ενεργά από ιδρυτές."
        lang={lang}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={notificationPrefs.needs}
              onClick={() => {
                const on = !notificationPrefs.needs;
                writeNotificationPrefs({ ...notificationPrefs, needs: on });
                if (on) toast.success(
                  lang === 'en'
                    ? 'Alerts on: open cards that ask for a skill on your profile appear in Notifications. Email alerts aren’t available.'
                    : 'Ειδοποιήσεις ενεργές: ανοιχτές κάρτες που ζητούν δεξιότητα του προφίλ σου εμφανίζονται στις Ειδοποιήσεις. Ειδοποιήσεις μέσω email δεν είναι διαθέσιμες.',
                );
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors shadow-2xs"
            >
              <Bell className="h-3.5 w-3.5 text-primary" />
              <span>{notificationPrefs.needs
                ? (lang === 'en' ? 'Alerts on' : 'Ειδοποιήσεις ενεργές')
                : (lang === 'en' ? 'Alert me about matching cards' : 'Ειδοποίησέ με για κάρτες που μου ταιριάζουν')}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>{lang === 'en' ? 'Write Need Card' : 'Δημιουργία Κάρτας'}</span>
            </button>
          </div>
        }
        metrics={[
          { label: 'Active Needs', labelEl: 'Ενεργές Ανάγκες', value: needCards.length },
          { label: 'Applicants', labelEl: 'Υποψήφιοι', value: needCards.reduce((acc, c) => acc + c.applicantCount, 0), color: 'text-primary' },
          { label: 'Equity offered', labelEl: 'Προσφερόμενο equity', value: equityRange(needCards.map((card) => card.equityOffered)), color: 'text-emerald-700' },
          { label: 'Remote Friendly', labelEl: 'Remote Θέσεις', value: `${needCards.filter((c) => c.isRemote).length} / ${needCards.length}` },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
        <span className="text-xs font-medium text-muted-foreground mr-1">
          {lang === 'en' ? 'Filter Needs:' : 'Φιλτράρισμα:'}
        </span>

        <div className="relative">
          <select
            aria-label={lang === 'en' ? 'Category' : 'Κατηγορία'}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-8 rounded-full border border-border bg-card px-3 pr-7 text-xs font-medium text-foreground hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? (lang === 'en' ? 'Category: All' : 'Κατηγορία: Όλες') : c}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <select
            aria-label={lang === 'en' ? 'Stage' : 'Στάδιο'}
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="h-8 rounded-full border border-border bg-card px-3 pr-7 text-xs font-medium text-foreground hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            {stages.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? (lang === 'en' ? 'Stage: All' : 'Στάδιο: Όλα') : s}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <select
            aria-label={lang === 'en' ? 'Commitment' : 'Δέσμευση'}
            value={selectedCommitment}
            onChange={(e) => setSelectedCommitment(e.target.value)}
            className="h-8 rounded-full border border-border bg-card px-3 pr-7 text-xs font-medium text-foreground hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            {commitments.map((cm) => (
              <option key={cm} value={cm}>
                {cm === 'all' ? (lang === 'en' ? 'Commitment: All' : 'Δέσμευση: Όλες') : cm}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setRemoteOnly(!remoteOnly)}
          className={`h-8 rounded-full border px-3 text-xs font-medium transition-colors ${
            remoteOnly
              ? 'border-primary/50 bg-primary/10 text-primary-accessible'
              : 'border-border bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          {lang === 'en' ? 'Remote Only' : 'Μόνο Remote'}
        </button>

        {(selectedCategory !== 'all' || selectedStage !== 'all' || selectedCommitment !== 'all' || remoteOnly) && (
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSelectedStage('all');
              setSelectedCommitment('all');
              setRemoteOnly(false);
            }}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-border/80 bg-card px-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            {lang === 'en' ? 'Clear' : 'Καθαρισμός'}
          </button>
        )}

        <div className="ml-auto text-xs font-medium text-muted-foreground tabular-nums">
          {filteredCards.length} {lang === 'en' ? (filteredCards.length === 1 ? 'card' : 'cards') : (filteredCards.length === 1 ? 'κάρτα' : 'κάρτες')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCards.map((card) => (
          <div
            key={card.id}
            className="card-interactive group flex flex-col justify-between p-5 border border-border bg-card shadow-sm"
          >
            <div className="space-y-3.5">
              <CardHead
                title={
                  <span className="font-semibold text-foreground group-hover:text-primary-accessible transition-colors">
                    {card.title}
                  </span>
                }
                subtitle={
                  <span className="text-primary-accessible font-medium">
                    {card.ventureName}
                  </span>
                }
                meta={
                  <FactLine
                    items={[
                      card.category,
                      card.location,
                      card.commitment,
                      card.isRemote ? (lang === 'en' ? 'Remote' : 'Εξ αποστάσεως') : null,
                    ]}
                  />
                }
                aside={
                  card.equityOffered ? <Badge variant="success">
                    <PieChart className="h-3 w-3" />
                    <span>{card.equityOffered}</span>
                  </Badge> : null
                }
                asideStays={false}
              />

              <p className="card-body line-clamp-2 leading-relaxed text-foreground/80">
                {card.description}
              </p>

              <div className="flex flex-wrap gap-1.5">
                {card.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <CardFoot
              className="mt-4"
              meta={
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {[
                    card.own
                      ? (lang === 'en' ? 'Your card' : 'Η κάρτα σου')
                      : `${card.applicantCount} ${lang === 'en' ? 'applicants' : 'υποψήφιοι'}`,
                    card.createdAt,
                  ].filter(Boolean).join(' · ')}
                </span>
              }
            >
              {card.own ? (
                <Link to="/network?tab=needs" className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground">
                  {lang === 'en' ? 'Open in Network' : 'Άνοιγμα στο Δίκτυο'}
                </Link>
              ) : (
                <button
                  type="button"
                  aria-pressed={interestedIds.includes(card.id)}
                  onClick={() => {
                    const marking = !interestedIds.includes(card.id);
                    toggleNeedInterest(card.id);
                    if (marking) {
                      onExpressInterest(card);
                      logActivity({ kind: 'request', title: `Marked interest in ${card.title}`, titleEl: `Σημείωσες ενδιαφέρον για ${card.title}`, href: '/matches?panel=needs' });
                    }
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Send className="h-3 w-3" />
                  <span>{interestedIds.includes(card.id)
                    ? (lang === 'en' ? 'Interested ✓' : 'Ενδιαφέρομαι ✓')
                    : (lang === 'en' ? 'Express interest' : 'Εκδήλωση ενδιαφέροντος')}</span>
                </button>
              )}
            </CardFoot>
          </div>
        ))}
      </div>

      {filteredCards.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/40">
          <Layers className="mx-auto h-10 w-10 text-muted-foreground" />
          <h4 className="mt-2 text-base font-semibold text-foreground">
            {lang === 'en' ? 'No Need Cards match these filters' : 'Δεν βρέθηκαν κάρτες αναγκών με αυτά τα φίλτρα'}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            {lang === 'en' ? 'Try widening your category or stage selections.' : 'Δοκίμασε να διευρύνεις την κατηγορία ή το στάδιο.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSelectedStage('all');
              setSelectedCommitment('all');
              setRemoteOnly(false);
            }}
            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-accent"
          >
            {lang === 'en' ? 'Reset Filters' : 'Επαναφορά Φίλτρων'}
          </button>
        </div>
      )}

      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setIsCreateOpen(false); }}
          onKeyDown={(e) => {
            // Escape closes only this form; the wall behind it stays open with its filters.
            if (e.key === 'Escape') { e.stopPropagation(); setIsCreateOpen(false); }
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="need-create-title" className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                <h3 id="need-create-title" className="text-base font-semibold text-foreground">
                  {lang === 'en' ? 'Post a Venture Need Card' : 'Δημοσίευση Κάρτας Ανάγκης'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                aria-label={lang === 'en' ? 'Close' : 'Κλείσιμο'}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="need-title" className="block text-xs font-medium text-foreground mb-1">
                  {lang === 'en' ? 'Need Title / Role' : 'Τίτλος Ανάγκης / Ρόλος'}
                </label>
                <input id="need-title" autoFocus
                  type="text"
                  required
                  placeholder={lang === 'en' ? 'e.g. Lead Technical Co-Founder' : 'π.χ. Τεχνικός Συνιδρυτής'}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="need-venture" className="block text-xs font-medium text-foreground mb-1">
                  {lang === 'en' ? 'Venture / Project Name' : 'Όνομα Venture / Project'}
                </label>
                <input id="need-venture"
                  type="text"
                  required
                  placeholder={lang === 'en' ? 'e.g. AgentMesh OS' : 'π.χ. AgentMesh OS'}
                  value={newVenture}
                  onChange={(e) => setNewVenture(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="need-category" className="block text-xs font-medium text-foreground mb-1">
                    {lang === 'en' ? 'Category' : 'Κατηγορία'}
                  </label>
                  <select id="need-category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as NeedCardItem['category'])}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Growth & GTM">Growth & GTM</option>
                    <option value="Product">Product</option>
                    <option value="Advisory">Advisory</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="need-equity" className="block text-xs font-medium text-foreground mb-1">
                    {lang === 'en' ? 'Equity Offered' : 'Προσφερόμενο Equity'}
                  </label>
                  <input id="need-equity"
                    type="text"
                    required
                    placeholder="20% - 35%"
                    value={newEquity}
                    onChange={(e) => setNewEquity(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="need-commitment" className="block text-xs font-medium text-foreground mb-1">
                    {lang === 'en' ? 'Commitment' : 'Δέσμευση'}
                  </label>
                  <select id="need-commitment"
                    value={newCommitment}
                    onChange={(e) => setNewCommitment(e.target.value as NeedCardItem['commitment'])}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time (Transition to FT)">Part-Time</option>
                    <option value="Evenings & Weekends">Evenings & Weekends</option>
                    <option value="Advisory">Advisory</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="need-stage" className="block text-xs font-medium text-foreground mb-1">
                    {lang === 'en' ? 'Stage' : 'Στάδιο'}
                  </label>
                  <select id="need-stage"
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value as NeedCardItem['stage'])}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="Idea / Concept">Idea / Concept</option>
                    <option value="Prototype / MVP">Prototype / MVP</option>
                    <option value="Pre-Seed (Traction)">Pre-Seed</option>
                    <option value="Seed Funded">Seed Funded</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="need-desc" className="block text-xs font-medium text-foreground mb-1">
                  {lang === 'en' ? 'Description & Core Responsibilities' : 'Περιγραφή & Βασικές Αρμοδιότητες'}
                </label>
                <textarea id="need-desc"
                  rows={3}
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder={lang === 'en' ? 'Describe the core mission and what you seek in a co-founder...' : 'Περίγραψε την αποστολή και τι αναζητάς...'}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="need-outcome" className="block text-xs font-medium text-foreground mb-1">
                  {lang === 'en' ? 'Outcome' : 'Αποτέλεσμα'}
                </label>
                <input id="need-outcome"
                  type="text"
                  value={newOutcome}
                  onChange={(e) => setNewOutcome(e.target.value)}
                  placeholder={lang === 'en' ? 'What this person will make happen' : 'Τι θα πετύχει αυτό το άτομο'}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="need-location" className="block text-xs font-medium text-foreground mb-1">
                  {lang === 'en' ? 'Location' : 'Τοποθεσία'}
                </label>
                <input id="need-location"
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
                <label className="mt-2 inline-flex items-center gap-2 text-xs text-foreground">
                  <input type="checkbox" checked={newRemote} onChange={(e) => setNewRemote(e.target.checked)} />
                  {lang === 'en' ? 'Remote' : 'Εξ αποστάσεως'}
                </label>
              </div>

              <div>
                <label htmlFor="need-skills" className="block text-xs font-medium text-foreground mb-1">
                  {lang === 'en' ? 'Required Skills (comma-separated)' : 'Απαιτούμενες Δεξιότητες (με κόμμα)'}
                </label>
                <input id="need-skills"
                  type="text"
                  placeholder="TypeScript, AI, Next.js"
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-9 rounded-lg border border-border px-3.5 text-xs font-medium text-foreground hover:bg-accent"
                >
                  {lang === 'en' ? 'Cancel' : 'Ακύρωση'}
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {lang === 'en' ? 'Publish Need Card' : 'Δημοσίευση Κάρτας'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
