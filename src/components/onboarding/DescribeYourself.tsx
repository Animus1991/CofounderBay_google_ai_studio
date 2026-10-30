/**
 * Onboarding's shortcut: describe yourself in a few lines and the form below
 * fills itself. Nothing is kept until "Fill the form"; only empty boxes are
 * filled (what the person already typed wins), and Undo puts the form back.
 */
import { useState } from 'react';
import { Sparkles, Undo2, Wand2 } from 'lucide-react';
import { extractProfileWithModel, type ProfileDraft } from '../../lib/profileFromText';
import { useLanguage, useT } from '../../lib/language';

export type DraftRow = { key: keyof ProfileDraft; label: string; value: string };

export default function DescribeYourself({
  onApply,
  onUndo,
  industryLabel,
}: {
  /** Fills the empty boxes; returns how many it filled. */
  onApply: (draft: ProfileDraft) => number;
  onUndo: () => void;
  industryLabel: (industry: string) => string;
}) {
  const t = useT();
  const { mode } = useLanguage();
  const [text, setText] = useState('');
  const [reading, setReading] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [by, setBy] = useState<'model' | 'offline'>('offline');
  const [filled, setFilled] = useState<number | null>(null);

  const read = async () => {
    if (text.trim().length < 20) return;
    setReading(true);
    setFilled(null);
    try {
      const result = await extractProfileWithModel(text, mode === 'el' ? 'el' : 'en');
      setDraft(result.draft);
      setBy(result.by);
    } finally {
      setReading(false);
    }
  };

  const rows: DraftRow[] = draft
    ? ([
        draft.headline ? { key: 'headline', label: t('Headline', 'Τίτλος'), value: draft.headline } : null,
        draft.skills.length ? { key: 'skills', label: t('Skills', 'Δεξιότητες'), value: draft.skills.join(', ') } : null,
        draft.industry ? { key: 'industry', label: t('Industry', 'Κλάδος'), value: industryLabel(draft.industry) } : null,
        draft.experience ? { key: 'experience', label: t('Experience', 'Εμπειρία'), value: draft.experience } : null,
        draft.location ? { key: 'location', label: t('Location', 'Τοποθεσία'), value: draft.location } : null,
        draft.stage ? { key: 'stage', label: t('Stage', 'Στάδιο'), value: draft.stage } : null,
        draft.commitment ? { key: 'commitment', label: t('Commitment', 'Δέσμευση'), value: draft.commitment } : null,
        draft.bio ? { key: 'bio', label: t('About me', 'Σχετικά με εμένα'), value: draft.bio.length > 120 ? `${draft.bio.slice(0, 117)}…` : draft.bio } : null,
      ].filter(Boolean) as DraftRow[])
    : [];

  return (
    <section data-testid="describe-yourself" className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-semibold text-stone-900">{t('Short on time? Describe yourself and I fill the form', 'Βιάζεσαι; Περιέγραψε τον εαυτό σου και συμπληρώνω τη φόρμα')}</h2>
          <p className="text-xs text-stone-500">{t('A few lines or your LinkedIn “About”. You review everything before it is kept.', 'Λίγες γραμμές ή το «About» του LinkedIn. Ελέγχεις τα πάντα πριν κρατηθούν.')}</p>
        </div>
      </div>
      <label className="sr-only" htmlFor="describe-yourself-text">{t('Describe yourself', 'Περιέγραψε τον εαυτό σου')}</label>
      <textarea
        id="describe-yourself-text"
        rows={3}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={t('e.g. Full-stack engineer, 6 years in payments, based in Athens. React and Node.js. Looking for a co-founder in sales.', 'π.χ. Full-stack μηχανικός, 6 χρόνια σε πληρωμές, στην Αθήνα. React και Node.js. Ψάχνω συνιδρυτή για πωλήσεις.')}
        className="w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-200"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => { void read(); }}
          disabled={reading || text.trim().length < 20}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-stone-900 px-3 text-sm font-medium text-white disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {reading ? t('Reading…', 'Διαβάζω…') : t('Read it', 'Διάβασέ το')}
        </button>
        {text.trim().length > 0 && text.trim().length < 20 && <span className="text-xs text-stone-500">{t('A little more, please.', 'Λίγο ακόμη, παρακαλώ.')}</span>}
      </div>

      {draft && filled === null && (
        <div className="rounded-xl border border-stone-200 bg-white p-3 space-y-2" role="group" aria-label={t('What I found', 'Τι βρήκα')}>
          {rows.length === 0 ? (
            <p className="text-sm text-stone-600">{t('I could not find anything to fill — try naming your skills, field and city.', 'Δεν βρήκα κάτι να συμπληρώσω — δοκίμασε να γράψεις δεξιότητες, αντικείμενο και πόλη.')}</p>
          ) : (
            <>
              <p className="text-xs text-stone-500">{by === 'model' ? t('Read by the AI model. Only empty boxes are filled.', 'Διαβάστηκε από το μοντέλο AI. Συμπληρώνονται μόνο τα κενά πεδία.') : t('Read on this device. Only empty boxes are filled.', 'Διαβάστηκε σε αυτή τη συσκευή. Συμπληρώνονται μόνο τα κενά πεδία.')}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                {rows.map((row) => (
                  <div key={row.key} className="contents">
                    <dt className="text-stone-500">{row.label}</dt>
                    <dd className="text-stone-900 break-words">{row.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex gap-2 pt-1">
                <button type="button" data-testid="describe-apply" onClick={() => setFilled(onApply(draft))} className="min-h-9 rounded-lg bg-stone-900 px-3 text-sm font-medium text-white">{t('Fill the form', 'Συμπλήρωσε τη φόρμα')}</button>
                <button type="button" onClick={() => setDraft(null)} className="min-h-9 rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-700">{t('Discard', 'Απόρριψη')}</button>
              </div>
            </>
          )}
        </div>
      )}

      {filled !== null && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-stone-700" role="status">
          {filled > 0
            ? t(`Filled ${filled} field${filled === 1 ? '' : 's'} — check them below.`, `Συμπληρώθηκαν ${filled} πεδία — έλεγξέ τα παρακάτω.`)
            : t('Every box already had your own words — nothing changed.', 'Όλα τα πεδία είχαν ήδη δικά σου λόγια — δεν άλλαξε τίποτα.')}
          {filled > 0 && (
            <button type="button" onClick={() => { onUndo(); setFilled(null); }} className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 underline underline-offset-2">
              <Undo2 className="h-3 w-3" aria-hidden="true" />{t('Undo', 'Αναίρεση')}
            </button>
          )}
        </p>
      )}
    </section>
  );
}
