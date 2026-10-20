import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/ui/PageShell";
import {
 Gift,
 Search,
 SlidersHorizontal,
 ArrowRight,
 ExternalLink,
 Zap,
 Cloud,
 CreditCard,
 BarChart3,
 Star
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import FactLine from "../components/ui/FactLine";
import EmptyHint, { AskLink } from "../components/ui/EmptyHint";
import { cn } from "../lib/utils";
import { keys, listKeys, readIds, readValue, writeValue } from "../lib/localLists";
import { useStored } from "../lib/useStored";
import { useT } from "../lib/language";
import { labelOf } from "../lib/labels";
import { useAuth } from "../App";
import { onCatalog, str, type CatalogDoc } from "../lib/catalog";
import { safeWebUrl } from "../lib/webUrl";

const PERK_VALUE_EL: Record<string, string> = {
 "$100,000 Credits": "$100,000 πιστώσεις",
 "$20,000 Fee-free": "$20,000 χωρίς προμήθεια",
 "90% Discount": "90% έκπτωση",
 "6 Months Free": "6 μήνες δωρεάν",
 "$200,000 Credits": "$200,000 πιστώσεις",
 "95% Discount": "95% έκπτωση",
 "80% Discount": "80% έκπτωση",
 "$500 Bonus": "$500 μπόνους",
};

const PERK_DESC_EL: Record<string, string> = {
 aws: "Το AWS Activate παρέχει σε startups τους πόρους που χρειάζονται για να ξεκινήσουν στο AWS.",
 stripe: "Διεκπεραίωσε τα πρώτα $20,000 πληρωμών με μηδενικές προμήθειες μέσω Stripe Atlas.",
 hubspot: "90% έκπτωση στη growth suite του HubSpot για τον πρώτο χρόνο.",
 notion: "Απεριόριστα AI και ομαδικά χαρακτηριστικά για 6 μήνες, για να οργανώσεις το startup σου.",
 gcp: "Το Google for Startups Cloud Program προσφέρει έως $200k σε πιστώσεις μέσα σε 2 χρόνια.",
 intercom: "Η κορυφαία πλατφόρμα εξυπηρέτησης πελατών με μόνο $65/μήνα για τον πρώτο χρόνο.",
 slack: "Φέρε την ομάδα σου κοντά με 80% έκπτωση στα πλάνα Pro ή Business+ του Slack.",
 mercury: "Άνοιξε λογαριασμό Mercury και κέρδισε $500 με κατάθεση $50,000.",
};

type PerkCard = {
 id: string;
 name: string;
 category: string;
 value: string;
 description: string;
 logo: string;
 url?: string;
 featured?: boolean;
};

// Demo-only catalogue — shown to the demo account, never to real members.
const DEMO_PERKS: PerkCard[] = [
 { id: "aws", name: "Amazon Web Services", category: "cloud", value: "$100,000 Credits", description: "AWS Activate provides startups with the resources they need to get started on AWS.", logo: "AWS" },
 { id: "stripe", name: "Stripe", category: "finance", value: "$20,000 Fee-free", description: "Process your first $20,000 in payments with zero fees through Stripe Atlas.", logo: "Stripe" },
 { id: "hubspot", name: "HubSpot", category: "marketing", value: "90% Discount", description: "Get 90% off HubSpot's growth suite for your first year.", logo: "HubSpot" },
 { id: "notion", name: "Notion", category: "productivity", value: "6 Months Free", description: "Unlimited AI and team features for 6 months to organize your startup.", logo: "Notion" },
 { id: "gcp", name: "Google Cloud", category: "cloud", value: "$200,000 Credits", description: "Google for Startups Cloud Program offers up to $200k in credits over 2 years.", logo: "GCP" },
 { id: "intercom", name: "Intercom", category: "marketing", value: "95% Discount", description: "The world's best customer service platform for just $65/month for your first year.", logo: "Intercom" },
 { id: "slack", name: "Slack", category: "productivity", value: "80% Discount", description: "Bring your team together with 80% off Slack's Pro or Business+ plans.", logo: "Slack" },
 { id: "mercury", name: "Mercury", category: "finance", value: "$500 Bonus", description: "Open a Mercury account and get $500 when you deposit $50,000.", logo: "Mercury" },
];

function perkFromDoc(doc: CatalogDoc): PerkCard {
 const name = str(doc.name, str(doc.title, 'Perk'));
 return {
  id: doc.id,
  name,
  category: str(doc.category, 'productivity'),
  value: str(doc.value),
  description: str(doc.description),
  logo: name.split(' ').map((w) => w[0]).join('').slice(0, 4).toUpperCase() || 'PERK',
  url: str(doc.url) || undefined,
  featured: doc.featured === true,
 };
}

export default function Perks() {
 const t = useT();
 const { isDemoMode } = useAuth();
 const [activeCategory, setActiveCategory] = useState<'all' | 'cloud' | 'finance' | 'marketing' | 'productivity'>('all');
 const [perkQuery, setPerkQuery] = useState('');
 const savedPerks = useStored(() => readValue<string[]>('cfb.savedPerks', []), ['cfb.savedPerks']);
 const claimed = useStored(() => readIds(listKeys.perks), [keys.perks]);
 const ask = (prompt: string) => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt } }));

 const [cloud, setCloud] = useState<CatalogDoc[] | null>(isDemoMode ? [] : null);
 useEffect(() => {
  if (isDemoMode) { setCloud([]); return; }
  let unsub: (() => void) | undefined;
  let cancelled = false;
  void (async () => {
   try {
    const stop = await onCatalog('perks', (docs) => { if (!cancelled) setCloud(docs); }, () => setCloud([]));
    if (cancelled) { stop(); return; }
    unsub = stop;
   } catch { if (!cancelled) setCloud([]); }
  })();
  return () => { cancelled = true; unsub?.(); };
 }, [isDemoMode]);

 const perks = useMemo<PerkCard[]>(() => isDemoMode ? DEMO_PERKS : (cloud ?? []).map(perkFromDoc), [isDemoMode, cloud]);

 const toggleSaved = (id: string) => {
  writeValue('cfb.savedPerks', savedPerks.includes(id) ? savedPerks.filter((p) => p !== id) : [...savedPerks, id]);
 };

 const perkClaimId = (name: string) => {
  const map: Record<string, string> = {
   'Amazon Web Services': 'aws', Stripe: 'stripe', HubSpot: 'hubspot', Notion: 'notion',
   'Google Cloud': 'gcp', Intercom: 'intercom', Slack: 'slack', Mercury: 'mercury',
  };
  return map[name] ?? name.toLowerCase();
 };

 const categories = [
  { id: 'all', label: t('All Perks', 'Όλες οι παροχές'), icon: Gift },
  { id: 'cloud', label: t('Cloud & Infrastructure', 'Cloud και υποδομή'), icon: Cloud },
  { id: 'finance', label: t('Finance & Payments', 'Οικονομικά και πληρωμές'), icon: CreditCard },
  { id: 'marketing', label: t('Marketing & Sales', 'Μάρκετινγκ και πωλήσεις'), icon: BarChart3 },
  { id: 'productivity', label: t('Productivity & HR', 'Παραγωγικότητα και HR'), icon: Zap },
 ] as const;

 const filteredPerks = (activeCategory === 'all' ? perks : perks.filter(p => p.category === activeCategory)).filter((perk) => {
  const q = perkQuery.trim().toLowerCase();
  return !q || perk.name.toLowerCase().includes(q) || perk.category.toLowerCase().includes(q) || perk.description.toLowerCase().includes(q);
 });

 const featured = perks.find((perk) => perk.featured) ?? (isDemoMode ? perks.find((p) => p.id === 'aws') : undefined);

 return (
  <PageShell sample={isDemoMode} title={t("Perks", "Παροχές")} description={isDemoMode
   ? t("Exclusive discounts and credits from our ecosystem partners.", "Αποκλειστικές εκπτώσεις και πιστώσεις από τους συνεργάτες του οικοσυστήματος.")
   : t("Founder programs published for members — apply on each provider's site.", "Προγράμματα ιδρυτών που δημοσιεύει η πλατφόρμα — αίτηση στο site του κάθε παρόχου.")}>
   <div className="space-y-6">
    <div className="scroll-tabs gap-2 bg-stone-50 p-1 rounded-xl border border-stone-100">
     {categories.map((cat) => (
      <button
       key={cat.id}
       onClick={() => setActiveCategory(cat.id)}
       className={cn(
        "px-4 py-2 text-sm font-medium tracking-wide rounded-lg transition-all flex items-center gap-2 whitespace-nowrap",
        activeCategory === cat.id
         ? "bg-stone-900 text-white shadow-md"
         : "text-stone-400 hover:text-stone-900 hover:bg-stone-50"
       )}
      >
       <cat.icon className="w-3.5 h-3.5" />
       {cat.label}
      </button>
     ))}
    </div>

   {/* Search & Stats */}
   <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
    <Card className="lg:col-span-3 flex items-center gap-4">
     <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
      <input
       type="text"
       value={perkQuery}
       onChange={(e) => setPerkQuery(e.target.value)}
       placeholder={t('Search perks by name or category…', 'Αναζήτηση παροχών ανά όνομα ή κατηγορία…')}
       className="w-full bg-stone-50 border border-stone-200 rounded-full py-2.5 pl-10 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-stone-200"
      />
     </div>
     <Button type="button" variant="outline" className="h-11 px-6" onClick={() => {
      const ids = ['all', 'cloud', 'finance', 'marketing', 'productivity'] as const;
      const index = ids.indexOf(activeCategory);
      setActiveCategory(ids[(index + 1) % ids.length] ?? 'all');
     }}>
      <SlidersHorizontal className="w-4 h-4 mr-2" /> {activeCategory === 'all' ? t('Filters', 'Φίλτρα') : categories.find((c) => c.id === activeCategory)?.label}
     </Button>
    </Card>
    <Card className="bg-stone-900 text-white border-none flex items-center justify-between p-6">
     <div>
      <p className="text-md font-medium text-white/40 tracking-wide">{isDemoMode ? t('Potential Savings', 'Πιθανή εξοικονόμηση') : t('Published perks', 'Δημοσιευμένες παροχές')}</p>
      <h4 className="text-lg font-semibold">{isDemoMode ? '$450k+' : perks.length}</h4>
     </div>
     <Zap className="w-8 h-8 text-amber-500 fill-current" />
    </Card>
   </div>

   {filteredPerks.length === 0 && (
    <EmptyHint
     title={perkQuery || activeCategory !== 'all'
      ? t("No perks match this search.", "Καμία παροχή δεν ταιριάζει σε αυτή την αναζήτηση.")
      : t("No perks published yet.", "Δεν έχουν δημοσιευτεί παροχές ακόμη.")}
     detail={perkQuery || activeCategory !== 'all'
      ? t("Ask the studio assistant which credits you can claim.", "Ρώτα τον βοηθό ποιες πιστώσεις μπορείς να διεκδικήσεις.")
      : t("New partner programs appear here the moment they are published.", "Νέες παροχές εμφανίζονται εδώ μόλις δημοσιευτούν.")}
    >
     <AskLink prompt="What perks can I claim?" />
    </EmptyHint>
   )}
   {/* Perks Grid */}
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {filteredPerks.map((perk) => {
     const perkUrl = safeWebUrl(perk.url);
     return (
     <Card key={perk.id} className="group hover:border-stone-900 transition-all flex flex-col h-full">
      <div className="flex items-start justify-between mb-6">
       <div className="w-14 h-11 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-900 font-medium text-sm group-hover:bg-stone-900 group-hover:text-white transition-all shadow-sm">
        {perk.logo}
       </div>
       <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 hover:text-amber-500", savedPerks.includes(perk.id) ? "text-amber-500" : "text-stone-300")} onClick={() => toggleSaved(perk.id)} aria-label={t(`Save ${perk.name}`, `Αποθήκευση ${perk.name}`)}>
        <Star className="w-4 h-4" fill={savedPerks.includes(perk.id) ? 'currentColor' : 'none'} />
       </Button>
      </div>
      <div className="space-y-2 flex-1">
       <div className="space-y-1">
        <h4 className="font-medium text-base">{perk.name}</h4>
        <FactLine items={[labelOf(perk.category)]} label={t('Category', 'Κατηγορία')} />
       </div>
       {perk.value ? <p className="text-sm font-medium text-stone-900">{t(perk.value, PERK_VALUE_EL[perk.value] ?? perk.value)}</p> : null}
       <p className="text-sm text-stone-500 leading-relaxed line-clamp-2">{t(perk.description, PERK_DESC_EL[perk.id] ?? perk.description)}</p>
      </div>
      <div className="mt-6 pt-4 border-t border-stone-100">
       {isDemoMode ? (
        <Button type="button" variant="primary" size="sm" className="w-full text-sm py-2" onClick={() => ask(`Claim the ${perk.name} perk`)}>
         {claimed.includes(perkClaimId(perk.name)) ? t('Claimed', 'Εξαργυρώθηκε') : t('Claim Perk', 'Εξαργύρωση παροχής')} <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
       ) : perkUrl ? (
        <a href={perkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-800 transition-all">
         {t('Apply on site', 'Άνοιγμα στον πάροχο')} <ExternalLink className="w-3 h-3 ml-1" />
        </a>
       ) : (
        <Button type="button" variant="primary" size="sm" disabled title={t('This perk has no link yet', 'Αυτή η παροχή δεν έχει ακόμη σύνδεσμο')} className="w-full text-sm py-2">
         {t('Apply on site', 'Άνοιγμα στον πάροχο')} <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
       )}
      </div>
     </Card>
    );})}
   </div>

   {/* Featured perk — demo shows the AWS card, real mode shows the featured catalog entry. */}
   {featured && (
   <Card className="bg-stone-50 border-stone-200 p-8 relative overflow-hidden">
    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
     <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-stone-900 font-medium text-md shadow-xl border border-stone-100">
      {featured.logo}
     </div>
     <div className="flex-1 text-center md:text-left space-y-2">
      <h3 className="text-md font-medium text-stone-900">{isDemoMode ? t('AWS Activate for CoFounderBay', 'AWS Activate για το CoFounderBay') : featured.name}</h3>
      <p className="text-stone-500 max-w-2xl">{isDemoMode
       ? t('Get exclusive access to the AWS Activate program through our partnership. Includes $100,000 in credits, technical support, and training resources.', 'Αποκλειστική πρόσβαση στο πρόγραμμα AWS Activate μέσω της συνεργασίας μας. Περιλαμβάνει $100,000 πιστώσεις, τεχνική υποστήριξη και εκπαιδευτικούς πόρους.')
       : featured.description}</p>
     </div>
     {isDemoMode ? (
      <Button type="button" variant="primary" className="px-8 h-10" onClick={() => ask('Claim the Amazon Web Services perk')}>
       {claimed.includes('aws') ? t('Claimed', 'Διεκδικήθηκε') : t('Apply Now', 'Κάνε αίτηση')}
      </Button>
     ) : safeWebUrl(featured.url) ? (
      <a href={safeWebUrl(featured.url)!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-8 h-10 text-sm font-medium text-white hover:bg-stone-800 transition-all">
       {t('Apply on site', 'Άνοιγμα στον πάροχο')} <ExternalLink className="w-3.5 h-3.5 ml-2" />
      </a>
     ) : (
      <Button type="button" variant="primary" disabled title={t('This perk has no link yet', 'Αυτή η παροχή δεν έχει ακόμη σύνδεσμο')} className="px-8 h-10">
       {t('Apply on site', 'Άνοιγμα στον πάροχο')} <ExternalLink className="w-3.5 h-3.5 ml-2" />
      </Button>
     )}
    </div>
   </Card>
   )}
  </div>
  </PageShell>
 );
}
