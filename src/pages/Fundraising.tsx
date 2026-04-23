import { useState } from "react";
import { 
 DollarSign, 
 Search, 
 Filter, 
 SlidersHorizontal, 
 ArrowRight, 
 CheckCircle2, 
 Clock, 
 TrendingUp, 
 Users, 
 Briefcase, 
 Target, 
 BarChart3, 
 Plus, 
 ChevronRight, 
 Star, 
 AlertCircle, 
 FileText, 
 Globe, 
 PieChart, 
 Zap 
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageContainer from "../components/layout/PageContainer";
import { User, FundraisingTracker } from "../types";
import { cn } from "../lib/utils";

interface FundraisingProps {
 user: User;
}

export default function Fundraising({ user }: FundraisingProps) {
 const [activeTab, setActiveTab] = useState<'tracker' | 'investors' | 'programs' | 'opportunities'>('tracker');

 const mockTracker: FundraisingTracker = {
  id: "tracker_1",
  startupId: "startup_1",
  targetAmount: 1500000,
  raisedAmount: 450000,
  currency: "USD",
  stage: "Seed",
  investors: ["inv_1", "inv_2"],
  status: "Active",
  investorPipeline: [
   { investorId: "inv_1", stage: "Due Diligence", notes: "Requested financial projections for 2027." },
   { investorId: "inv_2", stage: "Meeting", notes: "Second meeting scheduled for next Tuesday." },
   { investorId: "inv_3", stage: "Contacted", notes: "Intro sent via Alex." },
   { investorId: "inv_4", stage: "Identified", notes: "Fits our thesis perfectly." },
   { investorId: "inv_5", stage: "Passed", notes: "Too early for their current fund." }
  ]
 };

 const mockInvestors: any[] = [
  { id: "inv_1", name: "Sequoia Capital", type: "VC", focus: ["SaaS", "FinTech", "AI"], stage: ["Seed", "Series A"], location: "Menlo Park, CA" },
  { id: "inv_2", name: "Naval Ravikant", type: "Angel", focus: ["Crypto", "Marketplaces", "DeepTech"], stage: ["Pre-Seed", "Seed"], location: "San Francisco, CA" },
  { id: "inv_3", name: "Andreessen Horowitz", type: "VC", focus: ["Consumer", "Enterprise", "Bio"], stage: ["Seed", "Series A", "Series B"], location: "Menlo Park, CA" },
  { id: "inv_4", name: "First Round Capital", type: "VC", focus: ["Early Stage", "Generalist"], stage: ["Seed"], location: "Philadelphia, PA" }
 ];

 const mockPrograms = [
  { id: "prog_1", title: "Y Combinator S26", deadline: "2026-04-15", type: "Accelerator", grant: "$500k", location: "Remote/SF" },
  { id: "prog_2", title: "Techstars Sustainability", deadline: "2026-05-01", type: "Accelerator", grant: "$120k", location: "NYC" },
  { id: "prog_3", title: "NSF SBIR Phase I", deadline: "2026-06-10", type: "Grant", grant: "$275k", location: "US Only" }
 ];

 return (
  <PageContainer>
   <div className="space-y-8">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
    <div>
     <h2 className="text-xl font-medium tracking-tight mb-1">Fundraising Hub</h2>
     <p className="text-sm text-stone-500">Track your round, discover investors, and apply for programs.</p>
    </div>
    <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-stone-200 shadow-sm">
     {(['tracker', 'investors', 'programs', 'opportunities'] as const).map((tab) => (
      <button
       key={tab}
       onClick={() => setActiveTab(tab)}
       className={cn(
        "px-4 py-2 text-xs font-medium uppercase tracking-widest rounded-lg transition-all",
        activeTab === tab 
         ? "bg-stone-900 text-white shadow-md" 
         : "text-stone-400 hover:text-stone-900 hover:bg-stone-50"
       )}
      >
       {tab}
      </button>
     ))}
    </div>
   </div>

   {activeTab === 'tracker' && (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
     {/* Round Summary */}
     <Card className="lg:col-span-1 space-y-8">
      <div className="space-y-4">
       <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">Seed Round Progress</p>
        <div className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium uppercase tracking-widest rounded-full">
         {mockTracker.status}
        </div>
       </div>
       <div className="space-y-2">
        <div className="flex items-end gap-2">
         <h3 className="text-xl font-medium">${(mockTracker.raisedAmount / 1000).toFixed(0)}k</h3>
         <p className="text-stone-400 text-xs font-medium mb-1">of ${(mockTracker.targetAmount / 1000000).toFixed(1)}M</p>
        </div>
        <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
         <div 
          className="h-full bg-stone-900 transition-all duration-1000" 
          style={{ width: `${(mockTracker.raisedAmount / mockTracker.targetAmount) * 100}%` }}
         ></div>
        </div>
        <p className="text-xs font-medium text-stone-400 text-right uppercase tracking-widest">
         {((mockTracker.raisedAmount / mockTracker.targetAmount) * 100).toFixed(0)}% Raised
        </p>
       </div>
      </div>

      <div className="grid grid-cols-2 gap-4 py-6 border-y border-stone-100">
       <div className="space-y-1">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">Active Leads</p>
        <p className="text-lg font-medium">3</p>
       </div>
       <div className="space-y-1">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">Days in Round</p>
        <p className="text-lg font-medium">42</p>
       </div>
       <div className="space-y-1">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">Meetings</p>
        <p className="text-lg font-medium">18</p>
       </div>
       <div className="space-y-1">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">Burn Rate</p>
        <p className="text-lg font-medium text-red-600">$12k/mo</p>
       </div>
      </div>

      <div className="space-y-4">
       <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">Quick Actions</p>
       <div className="grid grid-cols-1 gap-2">
        <Button variant="outline" className="justify-start gap-3 text-xs h-10">
         <FileText className="w-4 h-4" /> Update Data Room
        </Button>
        <Button variant="outline" className="justify-start gap-3 text-xs h-10">
         <Users className="w-4 h-4" /> Log New Meeting
        </Button>
        <Button variant="primary" className="justify-start gap-3 text-xs h-10">
         <DollarSign className="w-4 h-4" /> Record Investment
        </Button>
       </div>
      </div>
     </Card>

     {/* Pipeline Tracker */}
     <div className="lg:col-span-2 space-y-8">
      <Card title="Investor Pipeline" subtitle="Manage your investor relationships and deal stages">
       <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
         <thead>
          <tr className="bg-stone-50 border-b border-stone-100">
           <th className="px-6 py-3 text-xs font-medium text-stone-400 uppercase tracking-widest">Investor</th>
           <th className="px-6 py-3 text-xs font-medium text-stone-400 uppercase tracking-widest">Stage</th>
           <th className="px-6 py-3 text-xs font-medium text-stone-400 uppercase tracking-widest">Latest Note</th>
           <th className="px-6 py-3 text-xs font-medium text-stone-400 uppercase tracking-widest">Actions</th>
          </tr>
         </thead>
         <tbody className="divide-y divide-stone-100">
          {mockTracker.investorPipeline.map((item, i) => (
           <tr key={i} className="hover:bg-stone-50/50 transition-colors">
            <td className="px-4 py-2">
             <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400">
               <Briefcase className="w-4 h-4" />
              </div>
              <p className="text-sm font-medium text-stone-900">Investor {i + 1}</p>
             </div>
            </td>
            <td className="px-4 py-2">
             <span className={cn(
              "px-2 py-1 rounded-full text-xs font-medium uppercase tracking-widest",
              item.stage === 'Closed' ? "bg-green-50 text-green-700" :
              item.stage === 'Passed' ? "bg-red-50 text-red-700" :
              "bg-stone-100 text-stone-600"
             )}>
              {item.stage}
             </span>
            </td>
            <td className="px-4 py-2">
             <p className="text-xs text-stone-500 max-w-[200px] truncate">{item.notes}</p>
            </td>
            <td className="px-4 py-2">
             <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronRight className="w-4 h-4" />
             </Button>
            </td>
           </tr>
          ))}
         </tbody>
        </table>
       </div>
       <div className="p-4 bg-stone-50 border-t border-stone-100 flex justify-center">
        <Button variant="ghost" size="sm" className="text-xs font-medium uppercase tracking-widest text-stone-400 hover:text-stone-900">
         View Full CRM
        </Button>
       </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
       <Card title="Fundraising Insights" subtitle="Round analytics and benchmarks">
        <div className="space-y-6">
         <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium uppercase tracking-widest">
           <span className="text-stone-400">Investor Interest</span>
           <span className="text-green-600">+15% vs last week</span>
          </div>
          <div className="h-16 flex items-end gap-1">
           {[40, 60, 45, 80, 55, 90, 70].map((h, i) => (
            <div key={i} className="flex-1 bg-stone-100 rounded-t-sm hover:bg-stone-900 transition-colors" style={{ height: `${h}%` }}></div>
           ))}
          </div>
         </div>
         <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 space-y-2">
          <p className="text-xs font-medium text-stone-900 flex items-center gap-2">
           <Zap className="w-4 h-4 text-amber-500" /> Hot Take
          </p>
          <p className="text-xs text-stone-500 leading-relaxed">
           Your "Due Diligence" stage is moving 20% faster than the industry average for Seed rounds.
          </p>
         </div>
        </div>
       </Card>

       <Card title="Upcoming Deadlines" subtitle="Don't miss these opportunities">
        <div className="space-y-4">
         {mockPrograms.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100 group cursor-pointer hover:border-stone-300 transition-all">
           <div>
            <p className="text-xs font-medium text-stone-900">{p.title}</p>
            <p className="text-xs text-stone-400 uppercase tracking-widest">Due: {p.deadline}</p>
           </div>
           <div className="text-right">
            <p className="text-xs font-medium text-stone-900">{p.grant}</p>
            <p className="text-xs text-stone-400 uppercase tracking-widest">{p.type}</p>
           </div>
          </div>
         ))}
        </div>
        <Button variant="outline" size="sm" className="w-full mt-4 text-xs">Explore All Programs</Button>
       </Card>
      </div>
     </div>
    </div>
   )}

   {activeTab === 'investors' && (
    <div className="space-y-8">
     <div className="flex items-center justify-between">
      <h3 className="text-base font-medium">Investor Discovery</h3>
      <div className="flex items-center gap-2">
       <Button variant="outline" size="sm" className="h-10">
        <SlidersHorizontal className="w-4 h-4 mr-2" /> Filters
       </Button>
       <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input 
         type="text" 
         placeholder="Search investors..." 
         className="bg-white border border-stone-200 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-stone-200"
        />
       </div>
      </div>
     </div>

     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {mockInvestors.map((inv) => (
       <Card key={inv.id} className="group hover:shadow-xl transition-all border-stone-200 hover:border-stone-900 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
         <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all">
          <Briefcase className="w-6 h-6" />
         </div>
         <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-300 hover:text-amber-500">
          <Star className="w-4 h-4" />
         </Button>
        </div>
        <div className="space-y-2 flex-1">
         <h4 className="font-medium text-base">{inv.name}</h4>
         <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-stone-100 text-stone-500 rounded text-xs font-medium uppercase tracking-wider">{inv.type}</span>
          <span className="text-xs text-stone-400 font-medium">{inv.location}</span>
         </div>
         <div className="pt-4 space-y-2">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">Focus</p>
          <div className="flex flex-wrap gap-1">
           {inv.focus.map((f: string) => (
            <span key={f} className="px-2 py-0.5 bg-stone-50 border border-stone-100 text-stone-600 rounded text-xs font-medium">{f}</span>
           ))}
          </div>
         </div>
        </div>
        <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
         <div className="space-y-1">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">Stage</p>
          <p className="text-xs font-medium text-stone-900">{inv.stage.join(", ")}</p>
         </div>
         <Button variant="outline" size="sm" className="h-8 text-xs">Request Intro</Button>
        </div>
       </Card>
      ))}
     </div>
    </div>
   )}
  </div>
 </PageContainer>
 );
}
