import { useState } from "react";
import { 
 Shield, 
 FileText, 
 Scale, 
 Gavel, 
 Download, 
 ExternalLink, 
 CheckCircle2, 
 AlertTriangle,
 Lock,
 Users,
 Briefcase,
 Globe
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { cn } from "../lib/utils";

export default function LegalHub() {
 const [activeCategory, setActiveCategory] = useState<'incorporation' | 'ip' | 'employment' | 'fundraising'>('incorporation');

 const categories = [
  { id: 'incorporation', label: 'Incorporation', icon: Globe },
  { id: 'ip', label: 'Intellectual Property', icon: Shield },
  { id: 'employment', label: 'Employment & HR', icon: Users },
  { id: 'fundraising', label: 'Fundraising Legal', icon: Scale },
 ] as const;

 const templates = {
  incorporation: [
   { name: "Articles of Incorporation", description: "Standard template for Delaware C-Corp.", status: "Verified" },
   { name: "Bylaws Template", description: "Corporate governance rules and procedures.", status: "Verified" },
   { name: "Founder Stock Purchase Agreement", description: "Vesting schedules and IP assignment.", status: "Critical" },
  ],
  ip: [
   { name: "Proprietary Information & Inventions Agreement", description: "Ensure the company owns all IP.", status: "Critical" },
   { name: "Mutual NDA", description: "Standard non-disclosure agreement for partnerships.", status: "Verified" },
   { name: "Trademark Assignment", description: "Transfer personal trademarks to the company.", status: "Verified" },
  ],
  employment: [
   { name: "Offer Letter Template", description: "Standard employee offer with equity terms.", status: "Verified" },
   { name: "Independent Contractor Agreement", description: "For freelancers and external consultants.", status: "Verified" },
   { name: "Employee Handbook", description: "Basic policies and code of conduct.", status: "Optional" },
  ],
  fundraising: [
   { name: "SAFE Agreement (Post-Money)", description: "Y Combinator standard for early rounds.", status: "Standard" },
   { name: "Term Sheet (Seed Round)", description: "Summary of key investment terms.", status: "Standard" },
   { name: "Board Consent for Financing", description: "Formal approval for new investment.", status: "Verified" },
  ]
 };

 return (
  <div className="space-y-8 max-w-7xl mx-auto">
   <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
    <div>
     <h2 className="text-xl font-medium tracking-tight mb-2 text-stone-900">Legal & Compliance Hub</h2>
     <p className="text-stone-500">Protect your startup with verified templates and legal resources.</p>
    </div>
    <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-stone-200 shadow-sm overflow-x-auto no-scrollbar">
     {categories.map((cat) => (
      <button
       key={cat.id}
       onClick={() => setActiveCategory(cat.id)}
       className={cn(
        "px-4 py-2 text-xs font-medium uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 whitespace-nowrap",
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
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    {/* Main Content: Templates */}
    <div className="lg:col-span-2 space-y-6">
     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {templates[activeCategory].map((template, i) => (
       <Card key={i} className="group hover:border-stone-400 transition-all">
        <div className="flex items-start justify-between mb-4">
         <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all">
          <FileText className="w-5 h-5" />
         </div>
         <span className={cn(
          "text-xs font-medium uppercase tracking-widest px-2 py-0.5 rounded-full",
          template.status === 'Critical' ? "bg-red-50 text-red-600" : "bg-stone-100 text-stone-500"
         )}>
          {template.status}
         </span>
        </div>
        <h4 className="font-medium text-sm mb-1">{template.name}</h4>
        <p className="text-xs text-stone-500 mb-6 leading-relaxed">{template.description}</p>
        <div className="flex gap-2">
         <Button size="sm" variant="outline" className="flex-1 text-xs py-1.5">
          <Download className="w-3 h-3 mr-1" /> Download
         </Button>
         <Button size="sm" variant="ghost" className="flex-1 text-xs py-1.5">
          Preview
         </Button>
        </div>
       </Card>
      ))}
     </div>

     {/* Legal Checklist */}
     <Card title="Compliance Checklist" subtitle="Ensure your startup meets all legal requirements">
      <div className="space-y-4">
       {[
        { task: "Incorporate the legal entity", done: true },
        { task: "Assign all IP to the company", done: true },
        { task: "Obtain Employer Identification Number (EIN)", done: false },
        { task: "Open a business bank account", done: false },
        { task: "Draft and sign Founder Vesting agreements", done: false },
       ].map((item, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
         {item.done ? (
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
         ) : (
          <div className="w-5 h-5 rounded-full border-2 border-stone-200 shrink-0" />
         )}
         <span className={cn("text-xs font-medium", item.done ? "text-stone-400 line-through" : "text-stone-700")}>
          {item.task}
         </span>
        </div>
       ))}
      </div>
     </Card>
    </div>

    {/* Sidebar: Resources & Experts */}
    <div className="space-y-8">
     <Card className="bg-stone-900 text-white border-none">
      <div className="space-y-4">
       <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
        <Gavel className="w-5 h-5 text-white" />
       </div>
       <div>
        <h4 className="font-medium text-sm">Legal Office Hours</h4>
        <p className="text-xs text-white/60 mt-1">Get 15 minutes of free legal advice from our partner firms.</p>
       </div>
       <Button variant="secondary" size="sm" className="w-full text-xs">
        Book a Session
       </Button>
      </div>
     </Card>

     <section>
      <h3 className="text-sm font-medium text-stone-400 uppercase tracking-widest mb-4">Partner Law Firms</h3>
      <div className="space-y-4">
       {[
        { name: "Wilson Sonsini", specialty: "Tech & Venture", location: "Palo Alto" },
        { name: "Gunderson Dettmer", specialty: "Emerging Companies", location: "Global" },
        { name: "Cooley LLP", specialty: "IP & Litigation", location: "New York" },
       ].map((firm, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-white border border-stone-200 rounded-xl hover:shadow-md transition-all cursor-pointer group">
         <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all">
          <Briefcase className="w-5 h-5" />
         </div>
         <div className="flex-1">
          <h4 className="text-xs font-medium">{firm.name}</h4>
          <p className="text-xs text-stone-500">{firm.specialty} • {firm.location}</p>
         </div>
         <ExternalLink className="w-3 h-3 text-stone-300 group-hover:text-stone-900" />
        </div>
       ))}
      </div>
     </section>

     <Card title="Legal Alerts" noPadding>
      <div className="divide-y divide-stone-100">
       <div className="p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <div className="space-y-1">
         <p className="text-xs font-medium text-stone-900">New Delaware Tax Filing</p>
         <p className="text-xs text-stone-500 leading-tight">Annual franchise tax reports are due by June 1st.</p>
        </div>
       </div>
       <div className="p-4 flex items-start gap-3">
        <Lock className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
        <div className="space-y-1">
         <p className="text-xs font-medium text-stone-900">GDPR Compliance Update</p>
         <p className="text-xs text-stone-500 leading-tight">New guidelines for data processing in the EU.</p>
        </div>
       </div>
      </div>
     </Card>
    </div>
   </div>
  </div>
 );
}
