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
}

export const StartupDealRoomModal: React.FC<StartupDealRoomModalProps> = ({
  startup,
  mode,
  selectedRole,
  onClose,
  onSubmitApplication,
  onCreateStartup,
  lang,
}) => {
  const [activeRole, setActiveRole] = useState(selectedRole || '');
  const [pitchNote, setPitchNote] = useState('');

  // Create Venture State
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [industry, setIndustry] = useState('AI & B2B SaaS');
  const [stage, setStage] = useState<StartupStage>('Prototype / MVP');
  const [location] = useState('Athens, Greece / Remote');
  const [equityOffer, setEquityOffer] = useState('25% - 40%');
  const [fundingRaised, setFundingRaised] = useState('€250,000 Pre-Seed');
  const [tractionMetric, setTractionMetric] = useState('3 enterprise design partners onboarded');
  const [openRolesText, setOpenRolesText] = useState('CTO / Technical Co-Founder, Head of GTM');
  const [description] = useState('');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [marketSize] = useState('€8.5B European addressable market');
  const [businessModel] = useState('Annual B2B SaaS subscription ($18k ACV)');

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
          problem: problem.trim() || description.trim() || tagline.trim(),
          solution: solution.trim() || tagline.trim(),
          marketSize,
          businessModel,
          tractionDetails: tractionMetric,
          useOfFunds: 'Scale core engineering & close initial enterprise pilot contracts.',
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
          aria-modal="true"
          aria-label={lang === 'en' ? 'Launch Startup Venture & Deal Room' : 'Δημοσίευση Νέου Startup Venture & Deal Room'}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">
                {lang === 'en'
                  ? 'Launch Startup Venture & Deal Room'
                  : 'Δημοσίευση Νέου Startup Venture & Deal Room'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={lang === 'en' ? 'Close' : 'Κλείσιμο'}
              className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
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
                  required
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
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
                  required
                  value={equityOffer}
                  onChange={(e) => setEquityOffer(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  {lang === 'en' ? 'Funding / Capital Status' : 'Χρηματοδότηση'}
                </label>
                <input
                  type="text"
                  required
                  value={fundingRaised}
                  onChange={(e) => setFundingRaised(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  {lang === 'en' ? 'Verified Traction Metric' : 'Δείκτης Traction'}
                </label>
                <input
                  type="text"
                  required
                  value={tractionMetric}
                  onChange={(e) => setTractionMetric(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  {lang === 'en' ? 'Open Co-Founder Roles (comma-separated)' : 'Ανοιχτές Θέσεις (με κόμμα)'}
                </label>
                <input
                  type="text"
                  required
                  value={openRolesText}
                  onChange={(e) => setOpenRolesText(e.target.value)}
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
    marketSize: '€10B+ global market opportunity',
    businessModel: 'B2B recurring enterprise licensing',
    tractionDetails: startup.tractionMetric,
    useOfFunds: 'Expand engineering team and accelerate commercial GTM.',
  };

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
        aria-modal="true"
        aria-label={`${startup.name} — Deal Room`}
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 sm:px-6 py-[0.92rem] bg-background/60">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-sm font-extrabold font-mono text-primary overflow-hidden">
              {startup.logo.startsWith('data:image') ? (
                <img src={startup.logo} alt={startup.name} className="h-full w-full object-cover" />
              ) : (
                startup.logo
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="text-sm sm:text-base font-bold text-foreground truncate">{startup.name} — Deal Room</h3>
                <span className="text-xs text-muted-foreground">· {startup.stage}</span>
              </div>
              <FactLine items={[startup.industry, startup.location, `Equity: ${startup.equityOffer}`]} />
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'en' ? 'Close' : 'Κλείσιμο'}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-[1.455rem] space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-background/50 p-4 space-y-1.5">
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-primary" />
                <span>01. {lang === 'en' ? 'Problem Statement' : 'Πρόβλημα Αγοράς'}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">{deck.problem}</p>
            </div>

            <div className="rounded-xl border border-border bg-background/50 p-4 space-y-1.5">
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>02. {lang === 'en' ? 'Product & Solution' : 'Λύση & Προϊόν'}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">{deck.solution}</p>
            </div>

            <div className="rounded-xl border border-border bg-background/50 p-4 space-y-1.5">
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                <span>03. {lang === 'en' ? 'Verified Traction' : 'Επαληθευμένη Δυναμική'}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">{deck.tractionDetails}</p>
            </div>

            <div className="rounded-xl border border-border bg-background/50 p-4 space-y-1.5">
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-amber-400" />
                <span>04. {lang === 'en' ? 'Market & Business Model' : 'Αγορά & Μοντέλο Εσόδων'}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {deck.marketSize} — {deck.businessModel}
              </p>
            </div>
          </div>

          <form
            onSubmit={handleApplySubmit}
            className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-primary" />
                <span>
                  {lang === 'en'
                    ? 'Pitch Yourself for an Open Co-Founder Seat'
                    : 'Υποβολή Υποψηφιότητας για Θέση Συνιδρυτή'}
                </span>
              </span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {startup.applicationsCount || 4} {lang === 'en' ? 'candidates in review' : 'υποψήφιοι'}
              </span>
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
                    ? 'Submit Pitch & Open Chat'
                    : 'Αποστολή Πρότασης & Άνοιγμα Chat'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
