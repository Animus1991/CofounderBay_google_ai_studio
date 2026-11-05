import React, { useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  Briefcase,
  Send,
  PlusCircle,
  Target,
  Layers,
  DollarSign,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StartupVenture, StartupStage } from '../types';
import { FactLine } from './FactLine';

interface StartupDealRoomModalProps {
  startup: StartupVenture | null;
  mode: 'view' | 'apply' | 'create' | null;
  selectedRole?: string;
  onClose: () => void;
  onSubmitApplication: (startupId: string, role: string, pitchNote: string) => void;
  onCreateStartup: (startupData: Partial<StartupVenture>) => void;
  lang: 'en' | 'el';
  /** The founder's own Deal Room: shown for review, with no "apply" form. */
  isOwn?: boolean;
  /** Prefills Location in "Launch a venture". */
  defaultLocation?: string;
}

export const StartupDealRoomModal: React.FC<StartupDealRoomModalProps> = ({
  startup,
  mode,
  selectedRole,
  onClose,
  onSubmitApplication,
  onCreateStartup,
  lang,
  isOwn = false,
  defaultLocation = '',
}) => {
  const [activeRole, setActiveRole] = useState(selectedRole || '');
  const [pitchNote, setPitchNote] = useState('');

  // Create Venture State: empty fields with examples as placeholders; only what the founder types is published.
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [industry, setIndustry] = useState('');
  const [stage, setStage] = useState<StartupStage>('Prototype / MVP');
  const [location, setLocation] = useState(defaultLocation);
  const [equityOffer, setEquityOffer] = useState('');
  const [fundingRaised, setFundingRaised] = useState('');
  const [tractionMetric, setTractionMetric] = useState('');
  const [openRolesText, setOpenRolesText] = useState('');
  const [description] = useState('');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [marketSize, setMarketSize] = useState('');
  const [businessModel, setBusinessModel] = useState('');

  useEffect(() => {
    if (startup) {
      setActiveRole(selectedRole || startup.openRoles[0] || 'Co-Founder');
      setPitchNote(
        lang === 'en'
          ? `Hi ${startup.founderName.split(' ')[0]}! I reviewed the ${startup.name} Deal Room and would love to discuss the ${
              selectedRole || startup.openRoles[0] || 'Co-Founder'
            } seat.`
          : `Γεια σου ${startup.founderName.split(' ')[0]}! Είδα το Deal Room του ${startup.name} και ενδιαφέρομαι για τη θέση "${
              selectedRole || startup.openRoles[0] || 'Co-Founder'
            }".`
      );
    }
  }, [startup, selectedRole, lang]);

  if (!mode) return null;

  if (mode === 'create') {
    const handleCreate = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !tagline.trim()) return;
      onCreateStartup({
        name: name.trim(),
        tagline: tagline.trim(),
        industry,
        stage,
        location,
        equityOffer,
        fundingRaised,
        tractionMetric,
        description: description.trim() || tagline.trim(),
        openRoles: openRolesText
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean),
        pitchDeck: {
          problem: problem.trim() || description.trim(),
          solution: solution.trim() || tagline.trim(),
          marketSize: marketSize.trim(),
          businessModel: businessModel.trim(),
          tractionDetails: tractionMetric.trim(),
          useOfFunds: '',
        },
      });
      onClose();
    };

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          data-type-scale="app"
          aria-modal="true"
          aria-label={lang === 'en' ? 'Launch Startup Venture & Deal Room' : 'Δημοσίευση Νέου Startup Venture & Deal Room'}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">
                {lang === 'en'
                  ? 'Launch Startup Venture & Deal Room'
                  : 'Δημοσίευση Νέου Startup Venture & Deal Room'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={lang === 'en' ? 'Close' : 'Κλείσιμο'}
              className="rounded-lg p-1 text-muted-foreground hover:text-foreground tap-area"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="mt-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  {lang === 'en' ? 'Venture Name' : 'Όνομα Startup'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. QuantFlow AI"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  {lang === 'en' ? 'Industry Sector' : 'Κλάδος'}
                </label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder={lang === 'en' ? 'e.g. FinTech' : 'π.χ. FinTech'}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-foreground mb-1">
                {lang === 'en' ? 'One-Line Value Proposition (Tagline)' : 'Σύντομο Tagline'}
              </label>
              <input
                type="text"
                required
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Autonomous treasury & cashflow forecasting for multi-currency CFOs"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  {lang === 'en' ? 'Venture Stage' : 'Στάδιο'}
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as StartupStage)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="Idea / Concept">Idea / Concept</option>
                  <option value="Prototype / MVP">Prototype / MVP</option>
                  <option value="Pre-Seed (Traction)">Pre-Seed (Traction)</option>
                  <option value="Seed Funded">Seed Funded</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  {lang === 'en' ? 'Founding Equity Offer' : 'Προσφερόμενο Equity'}
                </label>
                <input
                  type="text"
                  value={equityOffer}
                  onChange={(e) => setEquityOffer(e.target.value)}
                  placeholder="25% – 40%"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  {lang === 'en' ? 'Funding / Capital Status' : 'Χρηματοδότηση'}
                </label>
                <input
                  type="text"
                  value={fundingRaised}
                  onChange={(e) => setFundingRaised(e.target.value)}
                  placeholder={lang === 'en' ? 'e.g. Bootstrapped' : 'π.χ. Ίδια κεφάλαια'}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  {lang === 'en' ? 'Traction so far' : 'Traction μέχρι τώρα'}
                </label>
                <input
                  type="text"
                  value={tractionMetric}
                  onChange={(e) => setTractionMetric(e.target.value)}
                  placeholder={lang === 'en' ? 'e.g. 3 design partners' : 'π.χ. 3 πιλοτικοί πελάτες'}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  {lang === 'en' ? 'Open Co-Founder Roles (comma-separated)' : 'Ανοιχτές Θέσεις (με κόμμα)'}
                </label>
                <input
                  type="text"
                  value={openRolesText}
                  onChange={(e) => setOpenRolesText(e.target.value)}
                  placeholder={lang === 'en' ? 'e.g. CTO, Head of Growth' : 'π.χ. CTO, Υπεύθυνος Ανάπτυξης'}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="venture-location" className="block font-semibold text-foreground mb-1">
                  {lang === 'en' ? 'Location' : 'Τοποθεσία'}
                </label>
                <input
                  id="venture-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={lang === 'en' ? 'e.g. Athens / Remote' : 'π.χ. Αθήνα / Remote'}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="venture-market" className="block font-semibold text-foreground mb-1">
                  {lang === 'en' ? 'Market size' : 'Μέγεθος αγοράς'}
                </label>
                <input
                  id="venture-market"
                  type="text"
                  value={marketSize}
                  onChange={(e) => setMarketSize(e.target.value)}
                  placeholder={lang === 'en' ? 'Your own estimate' : 'Η δική σου εκτίμηση'}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="venture-model" className="block font-semibold text-foreground mb-1">
                  {lang === 'en' ? 'Business model' : 'Επιχειρηματικό μοντέλο'}
                </label>
                <input
                  id="venture-model"
                  type="text"
                  value={businessModel}
                  onChange={(e) => setBusinessModel(e.target.value)}
                  placeholder={lang === 'en' ? 'e.g. B2B subscription' : 'π.χ. Συνδρομή B2B'}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-foreground mb-1">
                {lang === 'en' ? 'Problem & Market Pain' : 'Πρόβλημα Αγοράς (Pitch Deck)'}
              </label>
              <textarea
                rows={2}
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="What hair-on-fire problem are you solving?"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-foreground mb-1">
                {lang === 'en' ? 'Solution & Technical Moat' : 'Λύση & Ανταγωνιστικό Πλεονέκτημα'}
              </label>
              <textarea
                rows={2}
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                placeholder="How does your architecture or product solve it 10x better?"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-lg border border-border px-4 font-medium text-muted-foreground hover:text-foreground"
              >
                {lang === 'en' ? 'Cancel' : 'Ακύρωση'}
              </button>
              <button
                type="submit"
                className="h-9 rounded-lg bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {lang === 'en' ? 'Publish Startup Venture' : 'Δημοσίευση Startup'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!startup) return null;

  const deck = startup.pitchDeck || {
    problem: startup.description,
    solution: startup.tagline,
    marketSize: '',
    businessModel: '',
    tractionDetails: startup.tractionMetric,
    useOfFunds: '',
  };
  const notShared = lang === 'en' ? 'Not shared yet' : 'Δεν έχει κοινοποιηθεί ακόμη';
  const shown = (text: string | undefined) => (text && text.trim() ? text : null);
  const marketLine = [deck.marketSize, deck.businessModel].filter((part) => part && part.trim()).join(' — ');

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitApplication(startup.id, activeRole, pitchNote);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 pt-14 sm:pt-16 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        data-type-scale="app"
        aria-modal="true"
        aria-label={`${startup.name} — Deal Room`}
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 sm:px-6 py-[0.92rem] bg-background/60">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-sm font-semibold font-mono text-primary overflow-hidden">
              {startup.logo.startsWith('data:image') ? (
                <img src={startup.logo} alt={startup.name} className="h-full w-full object-cover" />
              ) : (
                startup.logo
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="text-sm sm:text-base font-semibold text-foreground truncate">{startup.name} — Deal Room</h3>
                {startup.stage && <span className="text-xs text-muted-foreground">· {startup.stage}</span>}
              </div>
              <FactLine items={[startup.industry, startup.location, startup.fundingRaised, startup.equityOffer ? `Equity: ${startup.equityOffer}` : null]} />
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'en' ? 'Close' : 'Κλείσιμο'}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground shrink-0 tap-area"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-[1.455rem] space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-background/50 p-4 space-y-1.5">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-primary" />
                <span>01. {lang === 'en' ? 'Problem Statement' : 'Πρόβλημα Αγοράς'}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">{shown(deck.problem) ?? <span className="italic">{notShared}</span>}</p>
            </div>

            <div className="rounded-xl border border-border bg-background/50 p-4 space-y-1.5">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>02. {lang === 'en' ? 'Product & Solution' : 'Λύση & Προϊόν'}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">{shown(deck.solution) ?? <span className="italic">{notShared}</span>}</p>
            </div>

            <div className="rounded-xl border border-border bg-background/50 p-4 space-y-1.5">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                <span>03. Traction</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">{shown(deck.tractionDetails) ?? <span className="italic">{notShared}</span>}</p>
            </div>

            <div className="rounded-xl border border-border bg-background/50 p-4 space-y-1.5">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-amber-400" />
                <span>04. {lang === 'en' ? 'Market & Business Model' : 'Αγορά & Μοντέλο Εσόδων'}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {marketLine || <span className="italic">{notShared}</span>}
              </p>
            </div>
          </div>

          {isOwn ? (
            <div className="rounded-xl border border-border bg-background/50 p-4 space-y-2" data-testid="own-deal-room">
              <p className="font-semibold text-foreground">
                {lang === 'en' ? 'This is your Deal Room' : 'Αυτό είναι το Deal Room σου'}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {lang === 'en'
                  ? 'It is drawn from your pitch deck, your round and your open Need Cards. Empty sections show what investors and candidates would miss.'
                  : 'Προκύπτει από το pitch deck, τον γύρο και τις ανοιχτές Κάρτες Ανάγκης σου. Οι κενές ενότητες δείχνουν τι θα έλειπε σε επενδυτές και υποψηφίους.'}
              </p>
              {startup.openRoles.length > 0 && (
                <FactLine items={startup.openRoles} label={lang === 'en' ? 'Open roles' : 'Ανοιχτοί ρόλοι'} />
              )}
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Link to="/network?tab=needs" onClick={onClose} className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-3.5 text-xs font-medium text-foreground hover:bg-accent">
                  {lang === 'en' ? 'Edit open roles' : 'Επεξεργασία ρόλων'}
                </Link>
                <Link to="/founder-tools" onClick={onClose} className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                  {lang === 'en' ? 'Edit pitch deck' : 'Επεξεργασία pitch deck'}
                </Link>
              </div>
            </div>
          ) : (
          <form
            onSubmit={handleApplySubmit}
            className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-primary" />
                <span>
                  {lang === 'en'
                    ? 'Pitch Yourself for an Open Co-Founder Seat'
                    : 'Υποβολή Υποψηφιότητας για Θέση Συνιδρυτή'}
                </span>
              </span>
              {(startup.applicationsCount ?? 0) > 0 && (
                <span className="font-mono tabular-nums text-muted-foreground">
                  {startup.applicationsCount} {lang === 'en' ? 'candidates in review' : 'υποψήφιοι σε αξιολόγηση'}
                </span>
              )}
            </div>

            <div>
              <label className="block font-semibold text-foreground mb-1.5">
                {lang === 'en' ? 'Select Founding Seat' : 'Επίλεξε Θέση Συνιδρυτή'}
              </label>
              <div className="flex flex-wrap gap-2">
                {startup.openRoles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setActiveRole(role)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeRole === role
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-foreground hover:bg-accent'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-foreground mb-1">
                {lang === 'en'
                  ? `Direct Intro Note to ${startup.founderName}`
                  : `Μήνυμα Γνωριμίας προς ${startup.founderName}`}
              </label>
              <textarea
                rows={3}
                required
                value={pitchNote}
                onChange={(e) => setPitchNote(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-lg border border-border bg-card px-3.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {lang === 'en' ? 'Close' : 'Κλείσιμο'}
              </button>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
                <span>
                  {lang === 'en'
                    ? 'Send application'
                    : 'Αποστολή αίτησης'}
                </span>
              </button>
            </div>
          </form>
          )}
        </div>
      </div>
    </div>
  );
};
