/**
 * The sample account's venture, told once.
 *
 * The demo used to tell three stories at the same time: Founder Tools and the
 * Deal Room said "EcoFlow Systems — water purification" (with two different
 * one-liners), the Lean Canvas described an AI workspace for founders, and the
 * Startup Builder described a co-founder matching app. A pitch drafted from
 * them mixed all three. Every page and the assistant now read this one story.
 */
export const DEMO_VENTURE = {
  name: 'EcoFlow Systems',
  oneLiner: 'Bio-filters that let apartment buildings reuse their own grey water.',
  oneLinerEl: 'Βιοφίλτρα που επιτρέπουν στις πολυκατοικίες να ξαναχρησιμοποιούν το γκρίζο νερό τους.',
  description: 'EcoFlow uses proprietary bio-filters to recycle grey water in high-density residential buildings.',
  readinessScore: 68,
} as const;

/** Lean Canvas sample (Workspace → Canvas, the assistant's /canvas). */
export const DEMO_CANVAS = {
  problem: 'Apartment buildings pay for clean water twice: once to use it, once to dispose of it — 40% of it could be reused.',
  solution: 'A basement bio-filter unit that cleans shower and sink water for toilets and irrigation, monitored from one dashboard.',
  keyMetrics: 'Litres recycled per building per month, water-bill savings, units under contract.',
  uvp: 'Cut a building’s water bill by a third without changing a single tap.',
  advantage: 'Patented filter media and three municipal pilot permits already granted.',
} as const;

/** Startup Builder sample answers — modules 1–2 filled, module 3 started — so the staged look is real data. */
export const DEMO_BUILDER_INPUTS: Record<'en' | 'el', Record<string, string>> = {
  en: {
    '1-0': 'Residential buildings throw away grey water they could reuse.',
    '1-1': 'Today they pay utility rates for every litre and treat nothing on site.',
    '1-2': 'Up to 40% of a building’s water bill goes on water that could be reused.',
    '2-0': 'A basement bio-filter that recycles shower and sink water for toilets and irrigation.',
    '2-1': 'Modular units, remote monitoring, a building-manager dashboard.',
    '2-2': 'No plumbing changes in apartments; savings show on the first bill.',
    '3-0': 'Property managers of buildings with 40+ apartments in water-stressed cities.',
  },
  el: {
    '1-0': 'Οι πολυκατοικίες πετούν γκρίζο νερό που θα μπορούσαν να ξαναχρησιμοποιήσουν.',
    '1-1': 'Σήμερα πληρώνουν κάθε λίτρο στην τιμή του δικτύου και δεν επεξεργάζονται τίποτα επί τόπου.',
    '1-2': 'Έως 40% του λογαριασμού νερού αφορά νερό που θα μπορούσε να ξαναχρησιμοποιηθεί.',
    '2-0': 'Βιοφίλτρο στο υπόγειο που ανακυκλώνει το νερό ντους και νεροχύτη για καζανάκια και πότισμα.',
    '2-1': 'Αρθρωτές μονάδες, απομακρυσμένη παρακολούθηση, πίνακας για τον διαχειριστή.',
    '2-2': 'Καμία αλλαγή στις υδραυλικές των διαμερισμάτων· η εξοικονόμηση φαίνεται από τον πρώτο λογαριασμό.',
    '3-0': 'Διαχειριστές πολυκατοικιών 40+ διαμερισμάτων σε πόλεις με λειψυδρία.',
  },
};
