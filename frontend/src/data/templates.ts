/**
 * Founder templates that download as real files.
 *
 * The Templates tab used to show a "Download" button that raised a
 * "Downloading…" toast and then opened the assistant, and a "Copy link"
 * button that copied an address that does not exist. Each template now has
 * an actual starter outline the founder can download (Word or CSV) or copy,
 * built in the reader's language and, where it helps, pre-filled with the
 * founder's own data (venture name, round numbers). Outlines are starting
 * points — the legal ones say so plainly.
 */
import { keys, readRound, readValue } from '../lib/localLists';

export type TemplateFormat = 'doc' | 'csv';

export type FounderTemplate = {
  id: number;
  name: { en: string; el: string };
  category: 'Accelerator' | 'Fundraising' | 'Legal' | 'Finance' | 'Product' | 'HR' | 'Marketing';
  format: TemplateFormat;
  /** Markdown body (doc) or CSV rows (csv), in the reader's language. */
  build: (lang: 'en' | 'el') => { markdown?: string; rows?: (string | number)[][] };
};

const NOT_LEGAL_ADVICE = {
  en: '> Starting outline, not legal advice. Use the official documents and have a lawyer review before signing.',
  el: '> Αρχικό περίγραμμα, όχι νομική συμβουλή. Χρησιμοποίησε τα επίσημα έγγραφα και ζήτα έλεγχο από δικηγόρο πριν την υπογραφή.',
};

function venture(): string {
  const startup = readValue<Record<string, unknown>>(keys.startup, {});
  return typeof startup.name === 'string' && startup.name.trim() ? startup.name.trim() : '[Company]';
}

const outline = (title: string, intro: string, sections: [string, string[]][]) =>
  [`# ${title}`, '', intro, '', ...sections.flatMap(([heading, bullets]) => [`## ${heading}`, '', ...bullets.map((b) => `- ${b}`), ''])].join('\n');

export const FOUNDER_TEMPLATES: FounderTemplate[] = [
  {
    id: 1,
    name: { en: 'Accelerator application', el: 'Αίτηση σε επιταχυντή' },
    category: 'Accelerator',
    format: 'doc',
    build: (lang) => ({
      markdown: lang === 'el'
        ? outline(`Αίτηση επιταχυντή — ${venture()}`, 'Οι ερωτήσεις που κάνουν σχεδόν όλοι οι επιταχυντές. Απάντησε σύντομα και με αριθμούς.', [
            ['Η εταιρεία', ['Τι κάνει η εταιρεία, σε μία γραμμή.', 'Τι φτιάχνετε και για ποιον.', 'Πού βρίσκεστε σήμερα (ιδέα, πρωτότυπο, χρήστες, έσοδα).']],
            ['Οι ιδρυτές', ['Ποιος κάνει τι — και ποιος γράφει κώδικα.', 'Πόσο καιρό γνωρίζεστε και πώς έχετε δουλέψει μαζί.', 'Ποσοστά μετοχών ανά ιδρυτή.']],
            ['Πρόοδος', ['Χρήστες ή πελάτες σήμερα και ρυθμός ανάπτυξης.', 'Τι μάθατε από τις πρώτες συζητήσεις με πελάτες.']],
            ['Η ιδέα', ['Γιατί αυτή η ιδέα, γιατί τώρα.', 'Ποιοι είναι οι ανταγωνιστές και τι καταλαβαίνετε που δεν καταλαβαίνουν.', 'Πώς βγάζετε ή θα βγάλετε χρήματα.']],
          ])
        : outline(`Accelerator application — ${venture()}`, 'The questions almost every accelerator asks. Answer briefly and with numbers.', [
            ['Company', ['What the company does, in one line.', 'What you are making and for whom.', 'Where you are today (idea, prototype, users, revenue).']],
            ['Founders', ['Who does what — and who writes the code.', 'How long you have known each other and how you have worked together.', 'Equity split per founder.']],
            ['Progress', ['Users or customers today and growth rate.', 'What the first customer conversations taught you.']],
            ['Idea', ['Why this idea, why now.', 'Who the competitors are and what you understand that they do not.', 'How you make, or will make, money.']],
          ]),
    }),
  },
  {
    id: 2,
    name: { en: 'Series A pitch deck outline', el: 'Περίγραμμα pitch deck Series A' },
    category: 'Fundraising',
    format: 'doc',
    build: (lang) => ({
      markdown: lang === 'el'
        ? outline(`Pitch deck — ${venture()}`, 'Δώδεκα διαφάνειες, μία ιδέα η καθεμία.', [
            ['Διαφάνειες', ['Εξώφυλλο: όνομα, μία φράση, επαφή.', 'Πρόβλημα: ποιος πονάει και πόσο κοστίζει.', 'Λύση: τι αλλάζει για τον πελάτη.', 'Γιατί τώρα.', 'Αγορά: TAM, SAM, SOM με την πηγή.', 'Προϊόν: μία εικόνα που δείχνει την αξία.', 'Έλξη: έσοδα, ανάπτυξη, διατήρηση.', 'Επιχειρηματικό μοντέλο και unit economics.', 'Go-to-market.', 'Ανταγωνισμός.', 'Ομάδα.', 'Αίτημα: ποσό, χρήση κεφαλαίων, ορόσημα που θα πιάσετε.']],
          ])
        : outline(`Pitch deck — ${venture()}`, 'Twelve slides, one idea each.', [
            ['Slides', ['Cover: name, one line, contact.', 'Problem: who hurts and what it costs.', 'Solution: what changes for the customer.', 'Why now.', 'Market: TAM, SAM, SOM with the source.', 'Product: one picture that shows the value.', 'Traction: revenue, growth, retention.', 'Business model and unit economics.', 'Go-to-market.', 'Competition.', 'Team.', 'Ask: amount, use of funds, milestones it buys.']],
          ]),
    }),
  },
  {
    id: 3,
    name: { en: 'SAFE term checklist', el: 'Λίστα όρων SAFE' },
    category: 'Legal',
    format: 'doc',
    build: (lang) => ({
      markdown: lang === 'el'
        ? `${outline(`SAFE — ${venture()}`, NOT_LEGAL_ADVICE.el, [
            ['Όροι που συμφωνείτε', ['Ποσό επένδυσης.', 'Ανώτατη αποτίμηση (valuation cap), post-money ή pre-money.', 'Έκπτωση στον επόμενο γύρο (αν υπάρχει).', 'Most-favoured-nation (MFN).', 'Δικαίωμα pro rata.']],
            ['Πριν την υπογραφή', ['Υπολογίστε την αραίωση στο cap table.', 'Βεβαιωθείτε ότι η εταιρεία κατέχει την πνευματική ιδιοκτησία.', 'Κρατήστε αρχείο όλων των SAFE σε ένα σημείο.']],
          ])}`
        : `${outline(`SAFE — ${venture()}`, NOT_LEGAL_ADVICE.en, [
            ['Terms you agree', ['Investment amount.', 'Valuation cap, post-money or pre-money.', 'Discount on the next round (if any).', 'Most-favoured-nation (MFN).', 'Pro rata right.']],
            ['Before signing', ['Model the dilution on the cap table.', 'Make sure the company owns its IP.', 'Keep every SAFE in one place.']],
          ])}`,
    }),
  },
  {
    id: 4,
    name: { en: 'Financial model (12 months)', el: 'Οικονομικό μοντέλο (12 μήνες)' },
    category: 'Finance',
    format: 'csv',
    build: (lang) => {
      const round = readRound();
      const head = lang === 'el'
        ? ['Μήνας', 'Νέοι πελάτες', 'Πελάτες', 'Έσοδα / πελάτη', 'Έσοδα', 'Μισθοί', 'Λοιπά κόστη', 'Burn', 'Διαθέσιμα']
        : ['Month', 'New customers', 'Customers', 'Revenue / customer', 'Revenue', 'Payroll', 'Other costs', 'Burn', 'Cash'];
      const rows: (string | number)[][] = [head];
      // Row 2 holds the founder's own opening cash and burn when the round has them; the rest are formulas.
      for (let month = 1; month <= 12; month += 1) {
        const r = month + 1;
        rows.push([
          month,
          0,
          month === 1 ? `=B${r}` : `=C${r - 1}+B${r}`,
          0,
          `=C${r}*D${r}`,
          month === 1 ? Math.round((round.monthlyBurn || 0) * 0.7) : `=F${r - 1}`,
          month === 1 ? Math.round((round.monthlyBurn || 0) * 0.3) : `=G${r - 1}`,
          `=F${r}+G${r}-E${r}`,
          month === 1 ? `=${round.cashOnHand || 0}-H${r}` : `=I${r - 1}-H${r}`,
        ]);
      }
      return { rows };
    },
  },
  {
    id: 5,
    name: { en: 'Product roadmap (Now / Next / Later)', el: 'Product roadmap (Τώρα / Επόμενο / Αργότερα)' },
    category: 'Product',
    format: 'doc',
    build: (lang) => ({
      markdown: lang === 'el'
        ? outline(`Roadmap — ${venture()}`, 'Κάθε γραμμή: το αποτέλεσμα για τον πελάτη, όχι η λειτουργία.', [
            ['Τώρα (αυτό το τρίμηνο)', ['Αποτέλεσμα · μετρική επιτυχίας · υπεύθυνος.']],
            ['Επόμενο', ['Αποτέλεσμα · τι πρέπει να ισχύει πρώτα.']],
            ['Αργότερα', ['Στοιχήματα που θα ξαναδείτε σε 90 ημέρες.']],
          ])
        : outline(`Roadmap — ${venture()}`, 'Each line: the outcome for the customer, not the feature.', [
            ['Now (this quarter)', ['Outcome · success metric · owner.']],
            ['Next', ['Outcome · what has to be true first.']],
            ['Later', ['Bets you will revisit in 90 days.']],
          ]),
    }),
  },
  {
    id: 6,
    name: { en: 'Offer letter outline', el: 'Περίγραμμα επιστολής πρόσληψης' },
    category: 'HR',
    format: 'doc',
    build: (lang) => ({
      markdown: lang === 'el'
        ? outline(`Επιστολή πρόσληψης — ${venture()}`, NOT_LEGAL_ADVICE.el, [
            ['Περιεχόμενο', ['Ρόλος, έναρξη, τόπος εργασίας.', 'Αποδοχές και συχνότητα πληρωμής.', 'Μετοχές ή options: πλήθος, vesting, cliff.', 'Παροχές.', 'Προθεσμία αποδοχής.']],
          ])
        : outline(`Offer letter — ${venture()}`, NOT_LEGAL_ADVICE.en, [
            ['Contents', ['Role, start date, place of work.', 'Salary and pay frequency.', 'Equity or options: number, vesting, cliff.', 'Benefits.', 'Deadline to accept.']],
          ]),
    }),
  },
  {
    id: 7,
    name: { en: 'Go-to-market playbook', el: 'Playbook go-to-market' },
    category: 'Marketing',
    format: 'doc',
    build: (lang) => ({
      markdown: lang === 'el'
        ? outline(`Go-to-market — ${venture()}`, 'Ένα κανάλι, ένα ICP, ένα πείραμα την εβδομάδα.', [
            ['Ποιος αγοράζει', ['Ideal customer profile: κλάδος, μέγεθος, ρόλος αγοραστή.', 'Το γεγονός που τον κάνει να ψάξει λύση.']],
            ['Κανάλια', ['Κύριο κανάλι και γιατί.', 'Πείραμα 2 εβδομάδων: υπόθεση, μετρική, όριο κόστους.']],
            ['Πώλησης βήματα', ['Πρώτη επαφή → demo → πιλότος → συμβόλαιο.']],
          ])
        : outline(`Go-to-market — ${venture()}`, 'One channel, one ICP, one experiment a week.', [
            ['Who buys', ['Ideal customer profile: industry, size, buyer role.', 'The event that makes them look for a solution.']],
            ['Channels', ['Primary channel and why.', 'Two-week experiment: hypothesis, metric, cost cap.']],
            ['Sales steps', ['First touch → demo → pilot → contract.']],
          ]),
    }),
  },
  {
    id: 8,
    name: { en: 'Technical spec', el: 'Τεχνικές προδιαγραφές' },
    category: 'Product',
    format: 'doc',
    build: (lang) => ({
      markdown: lang === 'el'
        ? outline('Τεχνική προδιαγραφή', 'Μία σελίδα πριν γραφτεί κώδικας.', [
            ['Πλαίσιο', ['Πρόβλημα και ποιον αφορά.', 'Τι είναι εκτός εύρους.']],
            ['Σχέδιο', ['Αρχιτεκτονική και δεδομένα.', 'Εναλλακτικές που απορρίφθηκαν και γιατί.']],
            ['Ρίσκα', ['Ασφάλεια, απόδοση, κόστος.', 'Πώς θα ξέρουμε ότι πέτυχε.']],
          ])
        : outline('Technical spec', 'One page before code is written.', [
            ['Context', ['The problem and who it is for.', 'What is out of scope.']],
            ['Design', ['Architecture and data.', 'Alternatives rejected and why.']],
            ['Risks', ['Security, performance, cost.', 'How we will know it worked.']],
          ]),
    }),
  },
];
