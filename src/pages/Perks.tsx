import { useState } from "react";
import PageShell from "../components/ui/PageShell";
import { 
 Gift, 
 Search, 
 Filter, 
 SlidersHorizontal, 
 ArrowRight, 
 CheckCircle2, 
 ExternalLink, 
 Zap, 
 Globe, 
 Shield, 
 BarChart3, 
 Cloud, 
 CreditCard, 
 MessageSquare,
 Star
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import FactLine from "../components/ui/FactLine";
import EmptyHint, { AskLink } from "../components/ui/EmptyHint";
import { cn } from "../lib/utils";
import { keys, listKeys, readIds } from "../lib/localLists";
import { useStored } from "../lib/useStored";

export default function Perks() {
 const [activeCategory, setActiveCategory] = useState<'all' | 'cloud' | 'finance' | 'marketing' | 'productivity'>('all');
 const [perkQuery, setPerkQuery] = useState('');
 const [savedPerks, setSavedPerks] = useState<number[]>([]);
 const claimed = useStored(() => readIds(listKeys.perks), [keys.perks]);
 const ask = (prompt: string) => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt } }));
 const perkClaimId = (name: string) => {
  const map: Record<string, string> = {
   'Amazon Web Services': 'aws', Stripe: 'stripe', HubSpot: 'hubspot', Notion: 'notion',
   'Google Cloud': 'gcp', Intercom: 'intercom', Slack: 'slack', Mercury: 'mercury',
  };
  return map[name] ?? name.toLowerCase();
 };

 const categories = [
  { id: 'all', label: 'All Perks', icon: Gift },
  { id: 'cloud', label: 'Cloud & Infrastructure', icon: Cloud },
  { id: 'finance', label: 'Finance & Payments', icon: CreditCard },
  { id: 'marketing', label: 'Marketing & Sales', icon: BarChart3 },
  { id: 'productivity', label: 'Productivity & HR', icon: Zap },
 ] as const;

 const perks = [
  { id: 1, name: "Amazon Web Services", category: "cloud", value: "$100,000 Credits", description: "AWS Activate provides startups with the resources they need to get started on AWS.", logo: "AWS" },
  { id: 2, name: "Stripe", category: "finance", value: "$20,000 Fee-free", description: "Process your first $20,000 in payments with zero fees through Stripe Atlas.", logo: "Stripe" },
  { id: 3, name: "HubSpot", category: "marketing", value: "90% Discount", description: "Get 90% off HubSpot's growth suite for your first year.", logo: "HubSpot" },
  { id: 4, name: "Notion", category: "productivity", value: "6 Months Free", description: "Unlimited AI and team features for 6 months to organize your startup.", logo: "Notion" },
  { id: 5, name: "Google Cloud", category: "cloud", value: "$200,000 Credits", description: "Google for Startups Cloud Program offers up to $200k in credits over 2 years.", logo: "GCP" },
  { id: 6, name: "Intercom", category: "marketing", value: "95% Discount", description: "The world's best customer service platform for just $65/month for your first year.", logo: "Intercom" },
  { id: 7, name: "Slack", category: "productivity", value: "80% Discount", description: "Bring your team together with 80% off Slack's Pro or Business+ plans.", logo: "Slack" },
  { id: 8, name: "Mercury", category: "finance", value: "$500 Bonus", description: "Open a Mercury account and get $500 when you deposit $50,000.", logo: "Mercury" },
 ];

 const filteredPerks = (activeCategory === 'all' ? perks : perks.filter(p => p.category === activeCategory)).filter((perk) => {
  const q = perkQuery.trim().toLowerCase();
  return !q || perk.name.toLowerCase().includes(q) || perk.category.toLowerCase().includes(q) || perk.description.toLowerCase().includes(q);
 });

 return (
  <PageShell title="Perks" description="Exclusive discounts and credits from our ecosystem partners.">
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
       placeholder="Search perks by name or category..." 
       className="w-full bg-stone-50 border border-stone-200 rounded-full py-2.5 pl-10 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-stone-200"
      />
     </div>
     <Button type="button" variant="outline" className="h-11 px-6" onClick={() => {
      const ids = ['all', 'cloud', 'finance', 'marketing', 'productivity'] as const;
      const index = ids.indexOf(activeCategory);
      setActiveCategory(ids[(index + 1) % ids.length] ?? 'all');
     }}>
      <SlidersHorizontal className="w-4 h-4 mr-2" /> {activeCategory === 'all' ? 'Filters' : categories.find((c) => c.id === activeCategory)?.label}
     </Button>
    </Card>
    <Card className="bg-stone-900 text-white border-none flex items-center justify-between p-6">
     <div>
      <p className="text-md font-medium text-white/40 tracking-wide">Potential Savings</p>
      <h4 className="text-xl font-semibold">$450k+</h4>
     </div>
     <Zap className="w-8 h-8 text-amber-500 fill-current" />
    </Card>
   </div>

   {filteredPerks.length === 0 && (
    <EmptyHint title="No perks match this search." detail="Ask the studio assistant which credits you can claim.">
     <AskLink prompt="What perks can I claim?" />
    </EmptyHint>
   )}
   {/* Perks Grid */}
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {filteredPerks.map((perk) => (
     <Card key={perk.id} className="group hover:border-stone-900 transition-all flex flex-col h-full">
      <div className="flex items-start justify-between mb-6">
       <div className="w-14 h-11 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-900 font-medium text-sm group-hover:bg-stone-900 group-hover:text-white transition-all shadow-sm">
        {perk.logo}
       </div>
       <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 hover:text-amber-500", savedPerks.includes(perk.id) ? "text-amber-500" : "text-stone-300")} onClick={() => setSavedPerks((prev) => prev.includes(perk.id) ? prev.filter((id) => id !== perk.id) : [...prev, perk.id])}>
        <Star className="w-4 h-4" fill={savedPerks.includes(perk.id) ? 'currentColor' : 'none'} />
       </Button>
      </div>
      <div className="space-y-2 flex-1">
       <div className="space-y-1">
        <h4 className="font-medium text-base">{perk.name}</h4>
        <FactLine items={[perk.category]} label="Category" />
       </div>
       <p className="text-sm font-medium text-stone-900">{perk.value}</p>
       <p className="text-sm text-stone-500 leading-relaxed line-clamp-2">{perk.description}</p>
      </div>
      <div className="mt-6 pt-4 border-t border-stone-100">
       <Button type="button" variant="primary" size="sm" className="w-full text-sm py-2" onClick={() => ask(`Claim the ${perk.name} perk`)}>
        {claimed.includes(perkClaimId(perk.name)) ? 'Claimed' : 'Claim Perk'} <ArrowRight className="w-3 h-3 ml-1" />
       </Button>
      </div>
     </Card>
    ))}
   </div>

   {/* Featured Partner */}
   <Card className="bg-stone-50 border-stone-200 p-8 relative overflow-hidden">
    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
     <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-stone-900 font-medium text-md shadow-xl border border-stone-100">
      AWS
     </div>
     <div className="flex-1 text-center md:text-left space-y-2">
      <h3 className="text-md font-medium text-stone-900">AWS Activate for CoFounderBay</h3>
      <p className="text-stone-500 max-w-2xl">Get exclusive access to the AWS Activate program through our partnership. Includes $100,000 in credits, technical support, and training resources.</p>
     </div>
     <Button type="button" variant="primary" className="px-8 h-10" onClick={() => ask('Claim the Amazon Web Services perk')}>
      {claimed.includes('aws') ? 'Claimed' : 'Apply Now'}
     </Button>
    </div>

   </Card>
  </div>
  </PageShell>
 );
}
