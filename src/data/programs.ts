/**
 * Public programs, funding sources and startup perks that exist outside
 * CoFounderBay. They are listed for convenience with their official links;
 * CoFounderBay is not a partner of these organisations unless an admin adds a
 * partner offer. Deadlines and amounts change, so cards send people to the
 * official page instead of printing numbers that may be out of date.
 */

export type ProgramType = 'Accelerator' | 'Incubator' | 'Grant' | 'Competition' | 'Fellowship' | 'Studio' | 'Registry' | 'Fund';

export type ProgramRegion = 'Greece' | 'Europe' | 'Global';

export type CatalogProgram = {
  id: string;
  title: string;
  organizer: string;
  type: ProgramType;
  region: ProgramRegion;
  location: string;
  url: string;
  focus: string[];
  stages: string[];
  summary: string;
  summaryEl: string;
  /** "Rolling", a month, or empty when the official page has the current dates. */
  timing?: string;
  timingEl?: string;
  /** Admin-added entries carry a deadline. */
  deadline?: string;
  funding?: string;
  source: 'curated' | 'admin';
};

export const CURATED_PROGRAMS: CatalogProgram[] = [
  {
    id: 'elevate-greece',
    title: 'Elevate Greece — National Startup Registry',
    organizer: 'Hellenic Ministry of Development',
    type: 'Registry',
    region: 'Greece',
    location: 'Greece',
    url: 'https://elevategreece.gov.gr',
    focus: ['All sectors'],
    stages: ['Idea', 'Pre-seed', 'Seed', 'Series A'],
    summary: 'The official registry of Greek startups. Registration gives access to state support measures, events and visibility to investors.',
    summaryEl: 'Το επίσημο μητρώο νεοφυών επιχειρήσεων της Ελλάδας. Η εγγραφή δίνει πρόσβαση σε δημόσια μέτρα στήριξης, εκδηλώσεις και ορατότητα σε επενδυτές.',
    timing: 'Rolling',
    timingEl: 'Συνεχής υποβολή',
    source: 'curated',
  },
  {
    id: 'egg',
    title: 'EGG — Enter, Grow, Go',
    organizer: 'Eurobank and Corallia',
    type: 'Accelerator',
    region: 'Greece',
    location: 'Athens',
    url: 'https://www.theegg.gr',
    focus: ['Technology', 'All sectors'],
    stages: ['Idea', 'Pre-seed', 'Seed'],
    summary: 'A Greek incubation and acceleration program with mentoring, workspace and access to a network of corporate partners.',
    summaryEl: 'Ελληνικό πρόγραμμα επώασης και επιτάχυνσης με καθοδήγηση, χώρο εργασίας και πρόσβαση σε δίκτυο εταιρικών συνεργατών.',
    source: 'curated',
  },
  {
    id: 'orange-grove',
    title: 'Orange Grove',
    organizer: 'Orange Grove (initiative of the Dutch Embassy in Greece)',
    type: 'Incubator',
    region: 'Greece',
    location: 'Athens, Patras',
    url: 'https://orangegrove.eu',
    focus: ['All sectors'],
    stages: ['Idea', 'Pre-seed'],
    summary: 'Incubation for early-stage founders with workspace, mentoring and international connections.',
    summaryEl: 'Επώαση για ιδρυτές σε πρώιμο στάδιο με χώρο εργασίας, καθοδήγηση και διεθνείς διασυνδέσεις.',
    source: 'curated',
  },
  {
    id: 'okthess',
    title: 'OK!Thess',
    organizer: 'OK!Thess',
    type: 'Incubator',
    region: 'Greece',
    location: 'Thessaloniki',
    url: 'https://okthess.gr',
    focus: ['Technology'],
    stages: ['Idea', 'Pre-seed', 'Seed'],
    summary: 'Thessaloniki-based support organisation running pre-incubation and acceleration programs for tech teams.',
    summaryEl: 'Φορέας στη Θεσσαλονίκη με προγράμματα προ-επώασης και επιτάχυνσης για τεχνολογικές ομάδες.',
    source: 'curated',
  },
  {
    id: 'innovathens',
    title: 'INNOVATHENS',
    organizer: 'City of Athens (Technopolis)',
    type: 'Incubator',
    region: 'Greece',
    location: 'Athens',
    url: 'https://innovathens.gr',
    focus: ['All sectors'],
    stages: ['Idea', 'Pre-seed'],
    summary: 'The innovation hub of the City of Athens, with programs, workshops and events for new founders.',
    summaryEl: 'Ο κόμβος καινοτομίας του Δήμου Αθηναίων, με προγράμματα, εργαστήρια και εκδηλώσεις για νέους ιδρυτές.',
    source: 'curated',
  },
  {
    id: 'endeavor-greece',
    title: 'Endeavor Greece',
    organizer: 'Endeavor',
    type: 'Fellowship',
    region: 'Greece',
    location: 'Athens',
    url: 'https://endeavor.org.gr',
    focus: ['Scale-ups'],
    stages: ['Seed', 'Series A', 'Growth'],
    summary: 'Selects and supports high-impact founders who are already scaling, with mentoring and a global network.',
    summaryEl: 'Επιλέγει και στηρίζει ιδρυτές υψηλού αντίκτυπου που ήδη κλιμακώνονται, με καθοδήγηση και παγκόσμιο δίκτυο.',
    source: 'curated',
  },
  {
    id: 'eic-accelerator',
    title: 'EIC Accelerator',
    organizer: 'European Innovation Council',
    type: 'Grant',
    region: 'Europe',
    location: 'EU',
    url: 'https://eic.ec.europa.eu/eic-funding-opportunities/eic-accelerator_en',
    focus: ['Deep Tech', 'Breakthrough innovation'],
    stages: ['Seed', 'Series A'],
    summary: 'EU funding (grant and optional equity) for startups and SMEs with breakthrough technology. Cut-off dates are published on the official page.',
    summaryEl: 'Ευρωπαϊκή χρηματοδότηση (επιχορήγηση και προαιρετικά συμμετοχή στο κεφάλαιο) για startups και ΜμΕ με πρωτοποριακή τεχνολογία. Οι ημερομηνίες υποβολής δημοσιεύονται στην επίσημη σελίδα.',
    source: 'curated',
  },
  {
    id: 'eit-jumpstarter',
    title: 'EIT Jumpstarter',
    organizer: 'European Institute of Innovation & Technology',
    type: 'Competition',
    region: 'Europe',
    location: 'Central, Eastern and Southern Europe',
    url: 'https://eitjumpstarter.eu',
    focus: ['Health', 'Food', 'Climate', 'Manufacturing', 'Urban mobility', 'Raw materials'],
    stages: ['Idea', 'Pre-seed'],
    summary: 'A pre-acceleration program and competition for teams with an idea or prototype in EIT focus areas.',
    summaryEl: 'Πρόγραμμα προ-επιτάχυνσης και διαγωνισμός για ομάδες με ιδέα ή πρωτότυπο στους τομείς του EIT.',
    source: 'curated',
  },
  {
    id: 'y-combinator',
    title: 'Y Combinator',
    organizer: 'Y Combinator',
    type: 'Accelerator',
    region: 'Global',
    location: 'San Francisco',
    url: 'https://www.ycombinator.com/apply',
    focus: ['All sectors'],
    stages: ['Idea', 'Pre-seed', 'Seed'],
    summary: 'Runs several batches a year with investment, a three-month program and demo day. The standard deal is published on the YC website.',
    summaryEl: 'Τρέχει αρκετούς κύκλους τον χρόνο με επένδυση, τρίμηνο πρόγραμμα και demo day. Οι τυπικοί όροι δημοσιεύονται στον ιστότοπο του YC.',
    source: 'curated',
  },
  {
    id: 'techstars',
    title: 'Techstars Accelerators',
    organizer: 'Techstars',
    type: 'Accelerator',
    region: 'Global',
    location: 'Many cities',
    url: 'https://www.techstars.com/accelerators',
    focus: ['Many sector programs'],
    stages: ['Pre-seed', 'Seed'],
    summary: 'Three-month accelerator programs in many cities and sectors, with investment and mentor-driven support.',
    summaryEl: 'Τρίμηνα προγράμματα επιτάχυνσης σε πολλές πόλεις και κλάδους, με επένδυση και στήριξη από μέντορες.',
    source: 'curated',
  },
  {
    id: 'entrepreneur-first',
    title: 'Entrepreneur First',
    organizer: 'Entrepreneur First',
    type: 'Fellowship',
    region: 'Global',
    location: 'London, Paris, Bangalore, San Francisco',
    url: 'https://www.joinef.com',
    focus: ['Technology'],
    stages: ['Idea'],
    summary: 'Backs individuals before they have a team or idea and helps them find a co-founder inside the cohort.',
    summaryEl: 'Στηρίζει άτομα πριν αποκτήσουν ομάδα ή ιδέα και τα βοηθά να βρουν συνιδρυτή μέσα στον κύκλο.',
    source: 'curated',
  },
  {
    id: 'antler',
    title: 'Antler',
    organizer: 'Antler',
    type: 'Studio',
    region: 'Global',
    location: 'Many cities',
    url: 'https://www.antler.co/apply',
    focus: ['All sectors'],
    stages: ['Idea'],
    summary: 'A day-zero program where founders meet co-founders, test ideas and can receive pre-seed investment.',
    summaryEl: 'Πρόγραμμα «από το μηδέν», όπου οι ιδρυτές γνωρίζουν συνιδρυτές, δοκιμάζουν ιδέες και μπορούν να λάβουν επένδυση pre-seed.',
    source: 'curated',
  },
  {
    id: 'google-accelerator',
    title: 'Google for Startups Accelerator',
    organizer: 'Google',
    type: 'Accelerator',
    region: 'Global',
    location: 'Regional programs',
    url: 'https://startup.google.com/programs/accelerator/',
    focus: ['AI', 'Technology'],
    stages: ['Seed', 'Series A'],
    summary: 'Equity-free accelerator programs with Google mentors and technical support, run per region and theme.',
    summaryEl: 'Προγράμματα επιτάχυνσης χωρίς συμμετοχή στο κεφάλαιο, με μέντορες και τεχνική στήριξη από τη Google, ανά περιοχή και θεματική.',
    source: 'curated',
  },
  {
    id: 'founder-institute',
    title: 'Founder Institute',
    organizer: 'Founder Institute',
    type: 'Accelerator',
    region: 'Global',
    location: 'Many cities, online',
    url: 'https://fi.co',
    focus: ['All sectors'],
    stages: ['Idea', 'Pre-seed'],
    summary: 'A part-time pre-seed accelerator you can follow while keeping your job.',
    summaryEl: 'Επιταχυντής pre-seed μερικής απασχόλησης, που μπορείς να παρακολουθήσεις διατηρώντας τη δουλειά σου.',
    source: 'curated',
  },
  {
    id: 'seedcamp',
    title: 'Seedcamp',
    organizer: 'Seedcamp',
    type: 'Fund',
    region: 'Europe',
    location: 'London, Europe',
    url: 'https://seedcamp.com',
    focus: ['Technology'],
    stages: ['Pre-seed', 'Seed'],
    summary: 'A European seed fund that invests early and supports founders through its platform and network.',
    summaryEl: 'Ευρωπαϊκό seed fund που επενδύει νωρίς και στηρίζει ιδρυτές μέσω της πλατφόρμας και του δικτύου του.',
    source: 'curated',
  },
];

export type PerkCategory = 'cloud' | 'finance' | 'marketing' | 'productivity' | 'developer';

export type CatalogPerk = {
  id: string;
  name: string;
  program: string;
  category: PerkCategory;
  url: string;
  value: string;
  valueEl: string;
  summary: string;
  summaryEl: string;
  eligibility: string;
  eligibilityEl: string;
  /** Admin-added partner offers may carry a code or instructions. */
  code?: string;
  source: 'curated' | 'admin';
};

export const CURATED_PERKS: CatalogPerk[] = [
  {
    id: 'aws',
    name: 'Amazon Web Services',
    program: 'AWS Activate',
    category: 'cloud',
    url: 'https://aws.amazon.com/activate/',
    value: 'Cloud credits and technical support',
    valueEl: 'Πιστώσεις cloud και τεχνική υποστήριξη',
    summary: 'Credits for AWS services, training and support for early-stage startups. The amount depends on the tier you qualify for.',
    summaryEl: 'Πιστώσεις για υπηρεσίες AWS, εκπαίδευση και υποστήριξη για startups σε πρώιμο στάδιο. Το ποσό εξαρτάται από τη βαθμίδα για την οποία πληροίς τα κριτήρια.',
    eligibility: 'Early-stage startups; see the program page for criteria.',
    eligibilityEl: 'Startups σε πρώιμο στάδιο· τα κριτήρια είναι στη σελίδα του προγράμματος.',
    source: 'curated',
  },
  {
    id: 'gcp',
    name: 'Google Cloud',
    program: 'Google for Startups Cloud Program',
    category: 'cloud',
    url: 'https://cloud.google.com/startup',
    value: 'Cloud credits, with a dedicated track for AI startups',
    valueEl: 'Πιστώσεις cloud, με ξεχωριστή διαδρομή για startups AI',
    summary: 'Google Cloud and Firebase credits plus technical training for eligible startups.',
    summaryEl: 'Πιστώσεις για Google Cloud και Firebase και τεχνική εκπαίδευση για επιλέξιμες startups.',
    eligibility: 'Early-stage startups; some tiers need backing from an investor or accelerator.',
    eligibilityEl: 'Startups σε πρώιμο στάδιο· ορισμένες βαθμίδες απαιτούν στήριξη από επενδυτή ή επιταχυντή.',
    source: 'curated',
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    program: 'Microsoft for Startups',
    category: 'cloud',
    url: 'https://www.microsoft.com/en-us/startups',
    value: 'Azure credits and developer tools',
    valueEl: 'Πιστώσεις Azure και εργαλεία ανάπτυξης',
    summary: 'Azure credits, Microsoft software and technical guidance for startups building software.',
    summaryEl: 'Πιστώσεις Azure, λογισμικό Microsoft και τεχνική καθοδήγηση για startups που χτίζουν λογισμικό.',
    eligibility: 'Startups building a software product.',
    eligibilityEl: 'Startups που χτίζουν προϊόν λογισμικού.',
    source: 'curated',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    program: 'Cloudflare for Startups',
    category: 'developer',
    url: 'https://www.cloudflare.com/forstartups/',
    value: 'Credits for Cloudflare products',
    valueEl: 'Πιστώσεις για προϊόντα Cloudflare',
    summary: 'Credits for Cloudflare’s developer platform, security and performance products.',
    summaryEl: 'Πιστώσεις για την πλατφόρμα ανάπτυξης, την ασφάλεια και την απόδοση της Cloudflare.',
    eligibility: 'Startups backed by participating investors or accelerators.',
    eligibilityEl: 'Startups με στήριξη από συμμετέχοντες επενδυτές ή επιταχυντές.',
    source: 'curated',
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    program: 'MongoDB for Startups',
    category: 'developer',
    url: 'https://www.mongodb.com/startups',
    value: 'Atlas credits and technical advice',
    valueEl: 'Πιστώσεις Atlas και τεχνικές συμβουλές',
    summary: 'Credits for MongoDB Atlas and access to technical advisors.',
    summaryEl: 'Πιστώσεις για MongoDB Atlas και πρόσβαση σε τεχνικούς συμβούλους.',
    eligibility: 'Early-stage startups.',
    eligibilityEl: 'Startups σε πρώιμο στάδιο.',
    source: 'curated',
  },
  {
    id: 'github',
    name: 'GitHub',
    program: 'GitHub for Startups',
    category: 'developer',
    url: 'https://github.com/enterprise/startups',
    value: 'Discounted GitHub Enterprise seats',
    valueEl: 'Θέσεις GitHub Enterprise με έκπτωση',
    summary: 'GitHub Enterprise and security features at a startup price.',
    summaryEl: 'GitHub Enterprise και λειτουργίες ασφαλείας σε τιμή για startups.',
    eligibility: 'Startups backed by participating partners.',
    eligibilityEl: 'Startups με στήριξη από συμμετέχοντες συνεργάτες.',
    source: 'curated',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    program: 'Stripe Atlas',
    category: 'finance',
    url: 'https://stripe.com/atlas',
    value: 'Company formation in the US plus partner offers',
    valueEl: 'Σύσταση εταιρείας στις ΗΠΑ και προσφορές συνεργατών',
    summary: 'Forms a Delaware company online and includes discounts from Stripe’s partners.',
    summaryEl: 'Συστήνει εταιρεία στο Delaware online και περιλαμβάνει εκπτώσεις από συνεργάτες της Stripe.',
    eligibility: 'Founders who choose a US company.',
    eligibilityEl: 'Ιδρυτές που επιλέγουν εταιρεία στις ΗΠΑ.',
    source: 'curated',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    program: 'HubSpot for Startups',
    category: 'marketing',
    url: 'https://www.hubspot.com/startups',
    value: 'Discount on HubSpot software',
    valueEl: 'Έκπτωση στο λογισμικό HubSpot',
    summary: 'Discounted CRM, marketing and sales software for startups in partner programs.',
    summaryEl: 'CRM, λογισμικό μάρκετινγκ και πωλήσεων με έκπτωση για startups σε συνεργαζόμενα προγράμματα.',
    eligibility: 'Startups in an affiliated accelerator, incubator or VC portfolio.',
    eligibilityEl: 'Startups σε συνεργαζόμενο επιταχυντή, θερμοκοιτίδα ή χαρτοφυλάκιο VC.',
    source: 'curated',
  },
  {
    id: 'intercom',
    name: 'Intercom',
    program: 'Intercom Early Stage',
    category: 'marketing',
    url: 'https://www.intercom.com/early-stage',
    value: 'Discounted customer messaging',
    valueEl: 'Εργαλεία επικοινωνίας με πελάτες με έκπτωση',
    summary: 'Intercom’s support and messaging tools at an early-stage price.',
    summaryEl: 'Τα εργαλεία υποστήριξης και μηνυμάτων της Intercom σε τιμή για πρώιμο στάδιο.',
    eligibility: 'Early-stage startups; see the program page.',
    eligibilityEl: 'Startups σε πρώιμο στάδιο· δες τη σελίδα του προγράμματος.',
    source: 'curated',
  },
  {
    id: 'notion',
    name: 'Notion',
    program: 'Notion for Startups',
    category: 'productivity',
    url: 'https://www.notion.com/startups',
    value: 'Free or discounted Notion plan',
    valueEl: 'Δωρεάν ή εκπτωτικό πλάνο Notion',
    summary: 'Notion workspace credits for startups, including AI features where offered.',
    summaryEl: 'Πιστώσεις χώρου εργασίας Notion για startups, μαζί με λειτουργίες AI όπου προσφέρονται.',
    eligibility: 'Startups in partner programs.',
    eligibilityEl: 'Startups σε συνεργαζόμενα προγράμματα.',
    source: 'curated',
  },
  {
    id: 'miro',
    name: 'Miro',
    program: 'Miro for Startups',
    category: 'productivity',
    url: 'https://miro.com/startups/',
    value: 'Credits for Miro plans',
    valueEl: 'Πιστώσεις για πλάνα Miro',
    summary: 'Online whiteboard credits for early teams.',
    summaryEl: 'Πιστώσεις για online πίνακα συνεργασίας για νέες ομάδες.',
    eligibility: 'Startups in partner programs.',
    eligibilityEl: 'Startups σε συνεργαζόμενα προγράμματα.',
    source: 'curated',
  },
];

/** Official sources for the legal and company basics, by topic. */
export type OfficialLink = { id: string; title: string; titleEl: string; url: string; summary: string; summaryEl: string; region: 'Greece' | 'EU' | 'US' | 'Global' };

export const OFFICIAL_LINKS: OfficialLink[] = [
  { id: 'businessportal', title: 'Business Portal (one-stop company formation)', titleEl: 'Ενιαία Ψηφιακή Πύλη Επιχειρήσεων (Υπηρεσία Μιας Στάσης)', url: 'https://www.businessportal.gr', summary: 'Set up a Greek company (e.g. an IKE) online through the One-Stop Service.', summaryEl: 'Σύσταση ελληνικής εταιρείας (π.χ. ΙΚΕ) online μέσω της Υπηρεσίας Μιας Στάσης.', region: 'Greece' },
  { id: 'gemi', title: 'General Commercial Registry (G.E.MI.)', titleEl: 'Γενικό Εμπορικό Μητρώο (Γ.Ε.ΜΗ.)', url: 'https://www.businessregistry.gr', summary: 'Public search of registered companies and their filings.', summaryEl: 'Δημόσια αναζήτηση εταιρειών και των καταχωρίσεών τους.', region: 'Greece' },
  { id: 'aade', title: 'Independent Authority for Public Revenue (AADE)', titleEl: 'Ανεξάρτητη Αρχή Δημοσίων Εσόδων (ΑΑΔΕ)', url: 'https://www.aade.gr', summary: 'Tax registration, VAT and electronic books (myDATA).', summaryEl: 'Φορολογική εγγραφή, ΦΠΑ και ηλεκτρονικά βιβλία (myDATA).', region: 'Greece' },
  { id: 'elevate', title: 'Elevate Greece', titleEl: 'Elevate Greece', url: 'https://elevategreece.gov.gr', summary: 'Register as a Greek startup to access support measures.', summaryEl: 'Εγγραφή ως ελληνική νεοφυής επιχείρηση για πρόσβαση σε μέτρα στήριξης.', region: 'Greece' },
  { id: 'obi', title: 'Hellenic Industrial Property Organisation (OBI)', titleEl: 'Οργανισμός Βιομηχανικής Ιδιοκτησίας (ΟΒΙ)', url: 'https://www.obi.gr', summary: 'Greek patents and utility models.', summaryEl: 'Ελληνικά διπλώματα ευρεσιτεχνίας και πιστοποιητικά υποδείγματος χρησιμότητας.', region: 'Greece' },
  { id: 'dpa', title: 'Hellenic Data Protection Authority', titleEl: 'Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα', url: 'https://www.dpa.gr', summary: 'Guidance on GDPR for organisations in Greece.', summaryEl: 'Οδηγίες για τον GDPR για οργανισμούς στην Ελλάδα.', region: 'Greece' },
  { id: 'euipo', title: 'EU Intellectual Property Office (EUIPO)', titleEl: 'Γραφείο Διανοητικής Ιδιοκτησίας της ΕΕ (EUIPO)', url: 'https://euipo.europa.eu', summary: 'EU trade marks and designs; includes support for SMEs.', summaryEl: 'Εμπορικά σήματα και σχέδια της ΕΕ· περιλαμβάνει στήριξη για ΜμΕ.', region: 'EU' },
  { id: 'gdpr', title: 'GDPR — official text', titleEl: 'GDPR — επίσημο κείμενο', url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj', summary: 'Regulation (EU) 2016/679 on data protection.', summaryEl: 'Κανονισμός (ΕΕ) 2016/679 για την προστασία δεδομένων.', region: 'EU' },
  { id: 'yc-safe', title: 'Y Combinator SAFE documents', titleEl: 'Έγγραφα SAFE του Y Combinator', url: 'https://www.ycombinator.com/documents', summary: 'The standard post-money SAFE and its user guide.', summaryEl: 'Το τυποποιημένο post-money SAFE και ο οδηγός χρήσης του.', region: 'US' },
  { id: 'series-seed', title: 'Series Seed documents', titleEl: 'Έγγραφα Series Seed', url: 'https://www.seriesseed.com', summary: 'Open-source documents for a simple priced seed round.', summaryEl: 'Ανοιχτά έγγραφα για απλό γύρο seed με αποτίμηση.', region: 'US' },
];
