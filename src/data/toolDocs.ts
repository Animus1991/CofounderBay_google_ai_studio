/**
 * What each document tool in Founder Tools covers.
 *
 * The 25 tool tiles used to record a "recently used" entry and nothing else.
 * Calculators now open in a panel (components/founderTools); the document
 * tools open the outline below — the sections a professional version of that
 * document has — with three honest actions: download the outline as a Word
 * file, copy it, or ask the assistant to draft it from the venture's own data.
 * Legal outlines say plainly that they are not legal advice.
 */
export type Bilingual = { en: string; el: string };

export type ToolDoc = {
  summary: Bilingual;
  sections: { heading: Bilingual; items: Bilingual[] }[];
  /** What the assistant is asked to draft (English; the assistant answers in the active language). */
  prompt: string;
  legal?: boolean;
  /** A ready template in data/templates that covers the same document. */
  templateId?: number;
  /** The studio page where this work continues. */
  related?: { href: string; label: Bilingual };
};

const b = (en: string, el: string): Bilingual => ({ en, el });

export const TOOL_DOCS: Record<string, ToolDoc> = {
  incorporation: {
    summary: b('Forming a Delaware C-Corp, the structure most US and international venture investors expect.', 'Σύσταση Delaware C-Corp, της δομής που περιμένουν οι περισσότεροι επενδυτές venture.'),
    legal: true,
    prompt: 'Draft an incorporation checklist for my startup as a Delaware C-Corp',
    related: { href: '/legal', label: b('Open Legal Hub', 'Άνοιγμα Νομικού κέντρου') },
    sections: [
      { heading: b('Formation', 'Σύσταση'), items: [b('Certificate of Incorporation filed with the Delaware Division of Corporations', 'Καταστατικό (Certificate of Incorporation) στο Delaware Division of Corporations'), b('Registered agent in Delaware', 'Εκπρόσωπος (registered agent) στο Delaware'), b('Authorized shares (commonly 10,000,000) and par value', 'Εγκεκριμένες μετοχές (συνήθως 10.000.000) και ονομαστική αξία')] },
      { heading: b('Founders and equity', 'Ιδρυτές και μετοχές'), items: [b('Restricted stock purchase agreements with 4-year vesting and a 1-year cliff', 'Συμβάσεις restricted stock με 4ετή κατοχύρωση και 1 έτος cliff'), b('83(b) elections filed within 30 days of the stock grant', 'Δηλώσεις 83(b) εντός 30 ημερών από την απόκτηση μετοχών'), b('IP assignment from each founder to the company', 'Εκχώρηση IP από κάθε ιδρυτή στην εταιρεία')] },
      { heading: b('Governance', 'Διακυβέρνηση'), items: [b('Bylaws and initial board consent', 'Καταστατικό λειτουργίας (bylaws) και αρχική απόφαση ΔΣ'), b('Officers appointed (CEO, Secretary)', 'Ορισμός στελεχών (CEO, Secretary)'), b('Equity incentive plan and option pool approved', 'Έγκριση προγράμματος κινήτρων και option pool')] },
      { heading: b('Operations', 'Λειτουργία'), items: [b('EIN from the IRS and a business bank account', 'EIN από την IRS και εταιρικός τραπεζικός λογαριασμός'), b('Foreign qualification where the team works', 'Εγγραφή (foreign qualification) όπου εργάζεται η ομάδα'), b('Delaware franchise tax calendar', 'Ημερολόγιο φόρου franchise του Delaware')] },
    ],
  },
  nda: {
    summary: b('A mutual non-disclosure agreement for partner, supplier and hiring conversations.', 'Αμοιβαία συμφωνία εμπιστευτικότητας για συζητήσεις με συνεργάτες, προμηθευτές και υποψηφίους.'),
    legal: true,
    prompt: 'Draft a mutual NDA for my startup',
    related: { href: '/legal', label: b('Open Legal Hub', 'Άνοιγμα Νομικού κέντρου') },
    sections: [
      { heading: b('Scope', 'Πεδίο'), items: [b('Definition of confidential information (written, oral, visual)', 'Ορισμός εμπιστευτικών πληροφοριών (γραπτές, προφορικές, οπτικές)'), b('Purpose the information may be used for', 'Σκοπός για τον οποίο επιτρέπεται η χρήση')] },
      { heading: b('Exclusions', 'Εξαιρέσεις'), items: [b('Already public or known to the recipient', 'Ήδη δημόσια ή γνωστή στον παραλήπτη'), b('Independently developed or received from a third party', 'Ανεξάρτητα αναπτυγμένη ή ληφθείσα από τρίτο'), b('Disclosure required by law, with notice', 'Γνωστοποίηση που απαιτεί ο νόμος, με ειδοποίηση')] },
      { heading: b('Obligations and term', 'Υποχρεώσεις και διάρκεια'), items: [b('Standard of care and who may receive the information', 'Επίπεδο προστασίας και ποιοι μπορούν να λάβουν τις πληροφορίες'), b('Term (commonly 2–3 years) and return or destruction', 'Διάρκεια (συνήθως 2–3 έτη) και επιστροφή ή καταστροφή'), b('Remedies, governing law and jurisdiction', 'Ένδικα μέσα, εφαρμοστέο δίκαιο και δικαιοδοσία')] },
    ],
  },
  ip: {
    summary: b('Moves every founder\'s work on the product into the company — investors check this first in due diligence.', 'Μεταφέρει στην εταιρεία τη δουλειά κάθε ιδρυτή στο προϊόν — οι επενδυτές το ελέγχουν πρώτο στη δέουσα επιμέλεια.'),
    legal: true,
    prompt: 'Draft a founder IP assignment agreement for my startup',
    related: { href: '/fundraising?tab=dd', label: b('Open due diligence', 'Άνοιγμα δέουσας επιμέλειας') },
    sections: [
      { heading: b('Assignment', 'Εκχώρηση'), items: [b('Prior work related to the business assigned to the company', 'Προηγούμενη δουλειά σχετική με την επιχείρηση εκχωρείται στην εταιρεία'), b('Future inventions made during the relationship', 'Μελλοντικές εφευρέσεις κατά τη συνεργασία'), b('Excluded prior inventions listed in a schedule', 'Εξαιρούμενες προηγούμενες εφευρέσεις σε παράρτημα')] },
      { heading: b('Protection', 'Προστασία'), items: [b('Confidentiality of company information', 'Εμπιστευτικότητα πληροφοριών της εταιρείας'), b('Moral rights waiver where the law allows', 'Παραίτηση από ηθικά δικαιώματα όπου επιτρέπεται'), b('Cooperation with patent and copyright filings', 'Συνεργασία σε καταθέσεις διπλωμάτων και πνευματικών δικαιωμάτων')] },
    ],
  },
  terms: {
    summary: b('Terms of service for your website or app.', 'Όροι χρήσης για τον ιστότοπο ή την εφαρμογή σου.'),
    legal: true,
    prompt: 'Draft terms of service for my startup\'s product',
    sections: [
      { heading: b('Use of the service', 'Χρήση της υπηρεσίας'), items: [b('Accounts, eligibility and acceptable use', 'Λογαριασμοί, επιλεξιμότητα και αποδεκτή χρήση'), b('Fees, billing, renewals and refunds', 'Χρεώσεις, τιμολόγηση, ανανεώσεις και επιστροφές'), b('User content licence and ownership', 'Άδεια και κυριότητα του περιεχομένου χρηστών')] },
      { heading: b('Risk', 'Κίνδυνος'), items: [b('Disclaimers and limitation of liability', 'Αποποίηση ευθύνης και περιορισμός ευθύνης'), b('Indemnification', 'Αποζημίωση'), b('Termination and suspension', 'Καταγγελία και αναστολή')] },
      { heading: b('Legal', 'Νομικά'), items: [b('Governing law and dispute resolution', 'Εφαρμοστέο δίκαιο και επίλυση διαφορών'), b('Changes to the terms and notice', 'Αλλαγές όρων και ειδοποίηση'), b('Consumer rights that cannot be waived (EU)', 'Δικαιώματα καταναλωτή που δεν αίρονται (ΕΕ)')] },
    ],
  },
  privacy: {
    summary: b('A privacy notice covering the information GDPR Articles 13–14 require (and CCPA where it applies).', 'Ενημέρωση απορρήτου με όσα απαιτούν τα άρθρα 13–14 του GDPR (και ο CCPA όπου ισχύει).'),
    legal: true,
    prompt: 'Draft a GDPR-compliant privacy policy for my startup',
    related: { href: '/settings', label: b('Open privacy settings', 'Άνοιγμα ρυθμίσεων απορρήτου') },
    sections: [
      { heading: b('What and why', 'Τι και γιατί'), items: [b('Controller identity and contact (and DPO if appointed)', 'Ταυτότητα και στοιχεία υπευθύνου επεξεργασίας (και DPO αν υπάρχει)'), b('Categories of personal data and their sources', 'Κατηγορίες προσωπικών δεδομένων και πηγές τους'), b('Purposes and the legal basis for each (Art. 6)', 'Σκοποί και νομική βάση για τον καθένα (άρθρο 6)')] },
      { heading: b('Sharing and retention', 'Κοινοποίηση και διατήρηση'), items: [b('Processors and recipients', 'Εκτελούντες την επεξεργασία και αποδέκτες'), b('International transfers and safeguards (SCCs)', 'Διεθνείς διαβιβάσεις και εγγυήσεις (SCCs)'), b('Retention period per category', 'Διάρκεια διατήρησης ανά κατηγορία')] },
      { heading: b('Rights', 'Δικαιώματα'), items: [b('Access, rectification, erasure, restriction, portability, objection', 'Πρόσβαση, διόρθωση, διαγραφή, περιορισμός, φορητότητα, εναντίωση'), b('Withdrawing consent and complaining to a supervisory authority', 'Ανάκληση συγκατάθεσης και καταγγελία σε εποπτική αρχή'), b('Cookies and analytics choices', 'Επιλογές για cookies και analytics')] },
    ],
  },
  roadmap: {
    summary: b('A Now / Next / Later roadmap tied to outcomes, not dates alone.', 'Roadmap Τώρα / Επόμενο / Αργότερα, δεμένο με αποτελέσματα και όχι μόνο ημερομηνίες.'),
    templateId: 5,
    prompt: 'Draft a quarterly product roadmap for my startup',
    related: { href: '/milestones', label: b('Open Milestones', 'Άνοιγμα Ορόσημων') },
    sections: [
      { heading: b('Now (this quarter)', 'Τώρα (αυτό το τρίμηνο)'), items: [b('The one outcome the team is accountable for', 'Το ένα αποτέλεσμα για το οποίο λογοδοτεί η ομάδα'), b('Committed bets with owners', 'Δεσμευμένες κινήσεις με υπεύθυνους')] },
      { heading: b('Next and later', 'Επόμενο και αργότερα'), items: [b('Candidate bets ranked by impact and confidence', 'Υποψήφιες κινήσεις με σειρά επίδρασης και βεβαιότητας'), b('Assumptions each bet tests', 'Υποθέσεις που ελέγχει κάθε κίνηση')] },
      { heading: b('Measures', 'Μετρήσεις'), items: [b('North Star metric and input metrics', 'North Star metric και μετρικές εισόδου'), b('What would make us stop or change course', 'Τι θα μας έκανε να σταματήσουμε ή να αλλάξουμε κατεύθυνση')] },
    ],
  },
  prd: {
    summary: b('A product requirements document: the problem, who has it, what success looks like and what is out of scope.', 'Έγγραφο απαιτήσεων προϊόντος: το πρόβλημα, ποιος το έχει, πώς μοιάζει η επιτυχία και τι μένει εκτός.'),
    prompt: 'Draft a PRD for my startup\'s next feature',
    sections: [
      { heading: b('Problem', 'Πρόβλημα'), items: [b('User and job to be done', 'Χρήστης και ανάγκη (job to be done)'), b('Evidence: interviews, data, support tickets', 'Τεκμήρια: συνεντεύξεις, δεδομένα, αιτήματα υποστήριξης')] },
      { heading: b('Solution', 'Λύση'), items: [b('User stories with acceptance criteria', 'User stories με κριτήρια αποδοχής'), b('Non-goals and out of scope', 'Μη στόχοι και εκτός πεδίου'), b('Open questions and risks', 'Ανοιχτά ερωτήματα και κίνδυνοι')] },
      { heading: b('Success', 'Επιτυχία'), items: [b('Primary metric and target', 'Κύρια μετρική και στόχος'), b('Guardrail metrics', 'Μετρικές προστασίας (guardrails)'), b('Launch and review plan', 'Πλάνο κυκλοφορίας και αξιολόγησης')] },
    ],
  },
  'user-research': {
    summary: b('An interview script that asks about past behaviour, not opinions about your idea (The Mom Test).', 'Σενάριο συνέντευξης που ρωτά για πραγματική συμπεριφορά, όχι γνώμες για την ιδέα σου (The Mom Test).'),
    prompt: 'Draft a customer interview script and tracker for my startup',
    related: { href: '/founder-tools?step=3', label: b('Open Market Analysis', 'Άνοιγμα Ανάλυσης αγοράς') },
    sections: [
      { heading: b('Before', 'Πριν'), items: [b('Who to interview and how to recruit them', 'Ποιους θα ρωτήσεις και πώς θα τους βρεις'), b('The three things you want to learn', 'Τα τρία πράγματα που θέλεις να μάθεις')] },
      { heading: b('Questions', 'Ερωτήσεις'), items: [b('"Tell me about the last time this happened."', '«Πες μου για την τελευταία φορά που συνέβη αυτό.»'), b('"What did you try? What did it cost you?"', '«Τι δοκίμασες; Πόσο σου κόστισε;»'), b('"Who else is involved in that decision?"', '«Ποιος άλλος συμμετέχει σε αυτή την απόφαση;»')] },
      { heading: b('After', 'Μετά'), items: [b('Notes within the hour, quotes kept verbatim', 'Σημειώσεις μέσα σε μία ώρα, αυτούσια αποσπάσματα'), b('Tracker: segment, pain intensity, current solution, willingness to pay', 'Καταγραφή: τμήμα, ένταση προβλήματος, τρέχουσα λύση, διάθεση πληρωμής')] },
    ],
  },
  specs: {
    summary: b('An engineering design document reviewed before the build starts.', 'Τεχνικό έγγραφο σχεδιασμού που ελέγχεται πριν ξεκινήσει η υλοποίηση.'),
    templateId: 8,
    prompt: 'Draft a technical spec for my startup\'s next feature',
    sections: [
      { heading: b('Design', 'Σχεδιασμός'), items: [b('Context, goals and non-goals', 'Πλαίσιο, στόχοι και μη στόχοι'), b('Architecture and data model', 'Αρχιτεκτονική και μοντέλο δεδομένων'), b('Alternatives considered', 'Εναλλακτικές που εξετάστηκαν')] },
      { heading: b('Quality', 'Ποιότητα'), items: [b('Security, privacy and failure modes', 'Ασφάλεια, απόρρητο και τρόποι αποτυχίας'), b('Testing and rollout plan', 'Δοκιμές και πλάνο σταδιακής κυκλοφορίας'), b('Observability: logs, metrics, alerts', 'Παρατηρησιμότητα: logs, μετρικές, ειδοποιήσεις')] },
    ],
  },
  launch: {
    summary: b('A go-to-market launch checklist from two weeks before to two weeks after.', 'Λίστα ελέγχου κυκλοφορίας από δύο εβδομάδες πριν έως δύο μετά.'),
    prompt: 'Draft a launch checklist for my startup',
    related: { href: '/milestones', label: b('Open Milestones', 'Άνοιγμα Ορόσημων') },
    sections: [
      { heading: b('Before', 'Πριν'), items: [b('Positioning and one-line message tested with customers', 'Τοποθέτηση και μήνυμα μιας γραμμής δοκιμασμένα με πελάτες'), b('Pricing page, onboarding and support ready', 'Σελίδα τιμών, onboarding και υποστήριξη έτοιμα'), b('Analytics events for the activation funnel', 'Μετρήσεις analytics για τη διαδρομή ενεργοποίησης')] },
      { heading: b('Launch day', 'Ημέρα κυκλοφορίας'), items: [b('Announcement channels and owners', 'Κανάλια ανακοίνωσης και υπεύθυνοι'), b('Status page and on-call rota', 'Σελίδα κατάστασης και βάρδιες'), b('Customers and press briefed in advance', 'Ενημέρωση πελατών και Τύπου εκ των προτέρων')] },
      { heading: b('After', 'Μετά'), items: [b('Activation and retention reviewed at day 7 and day 14', 'Ενεργοποίηση και διατήρηση την 7η και 14η ημέρα'), b('Feedback triage and the next iteration', 'Ταξινόμηση σχολίων και επόμενη επανάληψη')] },
    ],
  },
  gtm: {
    summary: b('A go-to-market playbook: who buys, why now, through which channel and at what cost.', 'Playbook go-to-market: ποιος αγοράζει, γιατί τώρα, από ποιο κανάλι και με ποιο κόστος.'),
    templateId: 7,
    prompt: 'Draft a go-to-market strategy for my startup',
    sections: [
      { heading: b('Market', 'Αγορά'), items: [b('Ideal customer profile and buyer persona', 'Ιδανικό προφίλ πελάτη και persona αγοραστή'), b('TAM / SAM / SOM, bottom-up', 'TAM / SAM / SOM, από κάτω προς τα πάνω')] },
      { heading: b('Motion', 'Κίνηση'), items: [b('Sales motion: self-serve, sales-assisted or enterprise', 'Τρόπος πώλησης: self-serve, με υποστήριξη ή enterprise'), b('Channels ranked by CAC and speed', 'Κανάλια ταξινομημένα κατά CAC και ταχύτητα'), b('Pricing and packaging', 'Τιμολόγηση και πακέτα')] },
      { heading: b('Economics', 'Οικονομικά'), items: [b('CAC payback and LTV:CAC targets (see Growth Metrics)', 'Στόχοι CAC payback και LTV:CAC (δες Μετρικές ανάπτυξης)'), b('First 90-day plan with weekly metrics', 'Πλάνο πρώτων 90 ημερών με εβδομαδιαίες μετρικές')] },
    ],
  },
  content: {
    summary: b('A content calendar with one theme a month and a cadence you can keep.', 'Ημερολόγιο περιεχομένου με ένα θέμα τον μήνα και ρυθμό που μπορείς να κρατήσεις.'),
    prompt: 'Draft a one-month content calendar for my startup',
    related: { href: '/calendar', label: b('Open Calendar', 'Άνοιγμα Ημερολογίου') },
    sections: [
      { heading: b('Plan', 'Σχέδιο'), items: [b('Audience and the problem each piece addresses', 'Κοινό και το πρόβλημα που απαντά κάθε κομμάτι'), b('Pillars: education, proof, behind the scenes', 'Πυλώνες: εκπαίδευση, αποδείξεις, παρασκήνιο')] },
      { heading: b('Cadence', 'Ρυθμός'), items: [b('Channel, format and day for each post', 'Κανάλι, μορφή και ημέρα για κάθε ανάρτηση'), b('Owner and review step', 'Υπεύθυνος και βήμα ελέγχου'), b('One metric per channel', 'Μία μετρική ανά κανάλι')] },
    ],
  },
  'one-pager': {
    summary: b('An executive summary an investor can read in two minutes.', 'Σύνοψη που ένας επενδυτής διαβάζει σε δύο λεπτά.'),
    prompt: 'Draft an investor one-pager for my startup',
    related: { href: '/founder-tools?tab=pitch', label: b('Open the pitch deck', 'Άνοιγμα pitch deck') },
    sections: [
      { heading: b('The company', 'Η εταιρεία'), items: [b('One-line description and the problem', 'Περιγραφή μιας γραμμής και το πρόβλημα'), b('Solution and why now', 'Λύση και γιατί τώρα'), b('Market size', 'Μέγεθος αγοράς')] },
      { heading: b('Proof', 'Αποδείξεις'), items: [b('Traction: revenue, users, growth rate', 'Traction: έσοδα, χρήστες, ρυθμός ανάπτυξης'), b('Team and why this team', 'Ομάδα και γιατί αυτή η ομάδα')] },
      { heading: b('The ask', 'Το αίτημα'), items: [b('Round size, instrument and terms', 'Μέγεθος γύρου, εργαλείο και όροι'), b('Use of funds and milestones it buys', 'Χρήση κεφαλαίων και ορόσημα που εξασφαλίζει'), b('Contact', 'Επικοινωνία')] },
    ],
  },
  hiring: {
    summary: b('A 12-month hiring plan tied to milestones and runway.', 'Πλάνο προσλήψεων 12 μηνών δεμένο με ορόσημα και runway.'),
    prompt: 'Draft a 12-month hiring plan for my startup',
    related: { href: '/fundraising', label: b('Check runway on Fundraising', 'Δες το runway στη Χρηματοδότηση') },
    sections: [
      { heading: b('Roles', 'Ρόλοι'), items: [b('Role, start month and the milestone it unlocks', 'Ρόλος, μήνας έναρξης και ορόσημο που ξεκλειδώνει'), b('Cash compensation and equity range', 'Αμοιβή και εύρος equity')] },
      { heading: b('Cost', 'Κόστος'), items: [b('Fully loaded cost (salary × 1.2–1.4)', 'Πλήρες κόστος (μισθός × 1,2–1,4)'), b('Effect on monthly burn and runway', 'Επίδραση στο μηνιαίο burn και το runway')] },
      { heading: b('Process', 'Διαδικασία'), items: [b('Scorecard per role and structured interviews', 'Κάρτα αξιολόγησης ανά ρόλο και δομημένες συνεντεύξεις'), b('Sourcing channels and referral plan', 'Κανάλια εύρεσης και πλάνο συστάσεων')] },
    ],
  },
  offer: {
    summary: b('An offer letter covering role, pay, equity and conditions.', 'Επιστολή πρόσληψης με ρόλο, αμοιβή, equity και όρους.'),
    legal: true,
    templateId: 6,
    prompt: 'Draft an offer letter for my startup\'s first hire',
    sections: [
      { heading: b('The offer', 'Η προσφορά'), items: [b('Title, manager, start date and location', 'Τίτλος, προϊστάμενος, ημερομηνία έναρξης και τοποθεσία'), b('Base salary and benefits', 'Βασικός μισθός και παροχές'), b('Option grant: shares, strike, 4-year vesting, 1-year cliff', 'Δικαιώματα προαίρεσης: μετοχές, τιμή άσκησης, 4ετής κατοχύρωση, 1 έτος cliff')] },
      { heading: b('Conditions', 'Όροι'), items: [b('At-will or notice period (by country)', 'Καθεστώς απασχόλησης ή περίοδος προειδοποίησης (ανά χώρα)'), b('Confidentiality and IP assignment agreement', 'Συμφωνία εμπιστευτικότητας και εκχώρησης IP'), b('Offer expiry date', 'Ημερομηνία λήξης της προσφοράς')] },
    ],
  },
  handbook: {
    summary: b('An employee handbook: how the team works, decides and treats each other.', 'Εγχειρίδιο εργαζομένων: πώς δουλεύει, αποφασίζει και συμπεριφέρεται η ομάδα.'),
    prompt: 'Draft an employee handbook outline for my startup',
    sections: [
      { heading: b('Culture', 'Κουλτούρα'), items: [b('Mission and values with examples', 'Αποστολή και αξίες με παραδείγματα'), b('How decisions are made and written down', 'Πώς παίρνονται και καταγράφονται οι αποφάσεις')] },
      { heading: b('Policies', 'Πολιτικές'), items: [b('Working hours, remote work and leave', 'Ωράριο, εξ αποστάσεως εργασία και άδειες'), b('Code of conduct, harassment and reporting', 'Κώδικας δεοντολογίας, παρενόχληση και αναφορά'), b('Security and data handling', 'Ασφάλεια και διαχείριση δεδομένων')] },
    ],
  },
  reviews: {
    summary: b('A review cycle with clear expectations, two-way feedback and written outcomes.', 'Κύκλος αξιολόγησης με σαφείς προσδοκίες, αμφίδρομη ανατροφοδότηση και γραπτά αποτελέσματα.'),
    prompt: 'Draft a performance review template for my startup',
    sections: [
      { heading: b('Cycle', 'Κύκλος'), items: [b('Cadence (commonly every 6 months) and calendar', 'Συχνότητα (συνήθως κάθε 6 μήνες) και ημερολόγιο'), b('Self-review, peer and manager input', 'Αυτοαξιολόγηση, συναδέλφων και προϊσταμένου')] },
      { heading: b('Content', 'Περιεχόμενο'), items: [b('Goals met, with evidence', 'Στόχοι που επιτεύχθηκαν, με τεκμήρια'), b('Strengths and one growth area', 'Δυνατά σημεία και ένα πεδίο ανάπτυξης'), b('Next-period goals and support needed', 'Στόχοι επόμενης περιόδου και απαιτούμενη υποστήριξη')] },
    ],
  },
};

/** The outline as Markdown in one language, with the legal disclaimer where it applies. */
export function toolDocMarkdown(doc: ToolDoc, title: string, lang: 'en' | 'el', venture: string): string {
  const pick = (text: Bilingual) => (lang === 'el' ? text.el : text.en);
  const lines = [`# ${title}${venture ? ` — ${venture}` : ''}`, '', pick(doc.summary), ''];
  if (doc.legal) {
    lines.push(
      lang === 'el'
        ? '> Αρχικό περίγραμμα, όχι νομική συμβουλή. Χρησιμοποίησε τα επίσημα έγγραφα και ζήτα έλεγχο από δικηγόρο πριν την υπογραφή.'
        : '> Starting outline, not legal advice. Use the official documents and have a lawyer review before signing.',
      '',
    );
  }
  for (const section of doc.sections) {
    lines.push(`## ${pick(section.heading)}`, '', ...section.items.map((item) => `- ${pick(item)}`), '');
  }
  return lines.join('\n');
}
