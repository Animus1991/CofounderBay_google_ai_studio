import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
 Rocket, 
 Target, 
 FileText, 
 ClipboardCheck, 
 Trophy, 
 BarChart3, 
 Plus, 
 ArrowRight, 
 CheckCircle2, 
 Clock,
 Lightbulb,
 Layers,
 Presentation,
 X,
 Info,
 Activity,
 Cpu,
 ShieldCheck,
 Zap
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageContainer from "../components/layout/PageContainer";
import { User, Startup, FounderStage } from "../types";
import { cn } from "../lib/utils";

interface FounderToolsProps {
 user: User;
}

export default function FounderTools({ user }: FounderToolsProps) {
 const [activeTab, setActiveTab] = useState<'dashboard' | 'builder' | 'pitch' | 'applications'>('dashboard');
 const [showAssessment, setShowAssessment] = useState(false);
 const [assessmentStep, setAssessmentStep] = useState(0);

 const [mockStartup, setMockStartup] = useState<Startup>({
  id: "startup_1",
  ownerId: user.id,
  name: "EcoFlow Systems",
  oneLiner: "Next-gen water purification for urban environments.",
  description: "EcoFlow uses proprietary bio-filters to recycle gray water in high-density residential buildings.",
  industry: ["Sustainability", "CleanTech", "PropTech"],
  stage: FounderStage.PROTOTYPE,
  readinessScore: 68,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
 });

 const readinessMetrics = [
  { label: "Team Composition", score: 85, status: "Strong" },
  { label: "Market Validation", score: 45, status: "In-Progress" },
  { label: "Product/Tech", score: 70, status: "Good" },
  { label: "Financial Planning", score: 30, status: "Critical" },
  { label: "Pitch Readiness", score: 60, status: "Improving" }
 ];

 const builderSteps = [
  { id: 1, title: "Problem Definition", status: "Completed", icon: Lightbulb },
  { id: 2, title: "Solution & Value Prop", status: "Completed", icon: Layers },
  { id: 3, title: "Market Analysis", status: "In-Progress", icon: Target },
  { id: 4, title: "Business Model", status: "Planned", icon: BarChart3 },
  { id: 5, title: "Go-to-Market Strategy", status: "Planned", icon: Rocket },
 ];

 const assessmentQuestions = [
  {
   category: "Market Validation",
   question: "How many potential customers have you interviewed?",
   options: ["0-5", "6-20", "21-50", "50+"],
   impact: 15
  },
  {
   category: "Product/Tech",
   question: "What is the current state of your product?",
   options: ["Idea only", "Mockups/Wireframes", "Functional Prototype", "MVP in Market"],
   impact: 20
  },
  {
   category: "Financial Planning",
   question: "Do you have a detailed 12-month financial projection?",
   options: ["No", "Basic estimates", "Detailed model", "Verified by advisor"],
   impact: 25
  }
 ];

 const handleCompleteAssessment = () => {
  setMockStartup(prev => ({
   ...prev,
   readinessScore: Math.min(100, prev.readinessScore + 12)
  }));
  setShowAssessment(false);
  setAssessmentStep(0);
 };

 const [builderStep, setBuilderStep] = useState(1);

 const builderContent = {
  1: {
   title: "Problem Definition",
   description: "What is the core problem you are solving? Who suffers from it most?",
   questions: [
    "Describe the problem in one sentence.",
    "How do people solve this today?",
    "What is the cost of the problem (time, money, health)?"
   ]
  },
  2: {
   title: "Solution & Value Prop",
   description: "How does your product solve the problem? What makes it unique?",
   questions: [
    "What is your unique solution?",
    "What are the top 3 features?",
    "Why will customers choose you over alternatives?"
   ]
  },
  3: {
   title: "Market Analysis",
   description: "How big is the opportunity? Who are your competitors?",
   questions: [
    "What is your TAM, SAM, and SOM?",
    "Who are your top 3 competitors?",
    "What is your market entry strategy?"
   ]
  }
 };

 return (
  <PageContainer>
   <div className="space-y-10">
    {/* Assessment Modal - Diagnostic Interface Style */}
   <AnimatePresence>
    {showAssessment && (
     <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-xl z-50 flex items-center justify-center p-4 md:p-6">
      <motion.div 
       initial={{ opacity: 0, scale: 0.9, y: 40 }}
       animate={{ opacity: 1, scale: 1, y: 0 }}
       exit={{ opacity: 0, scale: 0.9, y: 40 }}
       className="bg-white rounded-[3rem] w-full max-w-3xl overflow-hidden shadow-[0_80px_150px_-30px_rgba(0,0,0,0.7)] border border-stone-200/60 relative"
      >
       {/* Scanning Effect Overlay */}
       <motion.div 
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute left-0 right-0 h-[2px] bg-amber-500/20 blur-sm z-20 pointer-events-none"
       />

       <div className="p-8 border-b border-stone-100 flex items-center justify-between bg-stone-50/80 backdrop-blur-md relative z-10">
        <div className="space-y-1">
         <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
          <h3 className="text-lg font-medium text-stone-900 tracking-tight flex items-center gap-2">
           Venture Diagnostic <span className="text-stone-300 font-mono text-xs font-medium">v4.2.0</span>
          </h3>
         </div>
         <div className="flex items-center gap-4">
          <p className="text-xs font-mono font-medium text-stone-400 uppercase tracking-wider">Module {assessmentStep + 1} // {assessmentQuestions.length}</p>
          <div className="h-1 w-1 rounded-full bg-stone-300" />
          <p className="text-xs font-mono font-medium text-amber-600 uppercase tracking-wider">Status: Analyzing</p>
         </div>
        </div>
        <button 
         onClick={() => setShowAssessment(false)}
         className="w-12 h-12 rounded-full hover:bg-stone-200 flex items-center justify-center transition-all duration-500 hover:rotate-90 group"
        >
         <X className="w-5 h-5 text-stone-400 group-hover:text-stone-900" />
        </button>
       </div>
       
       <div className="p-10 md:p-16 space-y-12 relative z-10">
        <div className="space-y-6">
         <div className="flex items-center gap-4">
          <div className="px-4 py-1.5 bg-stone-900 rounded-full">
           <span className="text-xs font-mono font-medium text-white uppercase tracking-wider">
            {assessmentQuestions[assessmentStep].category}
           </span>
          </div>
          <div className="h-px flex-1 bg-stone-100" />
          <div className="flex gap-1">
           {assessmentQuestions.map((_, i) => (
            <div key={i} className={cn(
             "w-8 h-1 rounded-full transition-all duration-500",
             i === assessmentStep ? "bg-stone-900 w-12" : i < assessmentStep ? "bg-stone-300" : "bg-stone-100"
            )} />
           ))}
          </div>
         </div>
         <h4 className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900 leading-snug tracking-tight">
          {assessmentQuestions[assessmentStep].question}
         </h4>
        </div>

        <div className="grid grid-cols-1 gap-4">
         {assessmentQuestions[assessmentStep].options.map((option, i) => (
          <motion.button
           key={i}
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: i * 0.1 }}
           onClick={() => {
            if (assessmentStep < assessmentQuestions.length - 1) {
             setAssessmentStep(prev => prev + 1);
            } else {
             handleCompleteAssessment();
            }
           }}
           className="p-8 text-left border border-stone-200 rounded-[2rem] hover:border-stone-900 hover:bg-stone-50 transition-all duration-500 group flex items-center justify-between relative overflow-hidden"
          >
           <div className="absolute inset-0 bg-stone-900 translate-x-[-100%] group-hover:translate-x-[-98%] transition-transform duration-700 opacity-[0.03]" />
           <div className="flex items-center gap-6 relative z-10">
            <span className="text-stone-300 font-mono text-sm font-medium">0{i + 1}</span>
            <span className="text-base font-medium text-stone-600 group-hover:text-stone-900 transition-colors">{option}</span>
           </div>
           <div className="w-6 h-6 rounded-full border-2 border-stone-200 group-hover:border-stone-900 group-hover:scale-110 transition-all duration-500 relative z-10 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-stone-900 scale-0 group-hover:scale-100 transition-transform duration-500" />
           </div>
          </motion.button>
         ))}
        </div>
       </div>

       <div className="p-10 bg-stone-950 border-t border-stone-800 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
        <div className="flex items-center gap-6">
         <div className="w-14 h-11 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center shadow-inner">
          <Cpu className="w-7 h-7 text-stone-400" />
         </div>
         <div className="space-y-1">
          <p className="text-xs text-stone-200 font-medium tracking-tight">Neural Processing Active</p>
          <p className="text-xs text-stone-500 font-mono uppercase tracking-widest">Latency: 14ms // Confidence: 98.4%</p>
         </div>
        </div>
        <div className="flex items-center gap-8">
         <div className="text-right hidden md:block">
          <p className="text-xs font-mono font-medium text-stone-500 uppercase tracking-widest">System Integrity</p>
          <p className="text-xs text-emerald-400 font-medium">VERIFIED</p>
         </div>
         <div className="h-10 w-px bg-stone-800 hidden md:block" />
         <p className="text-xs text-stone-400 leading-relaxed font-light max-w-[240px]">
          Inputs are cross-referenced with <span className="text-white font-medium">2.4M venture data points</span> to ensure diagnostic precision.
         </p>
        </div>
       </div>
      </motion.div>
     </div>
    )}
   </AnimatePresence>

   <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-stone-200/60 pb-10">
    <div className="space-y-4">
     <div className="flex items-center gap-4">
      <div className="h-px w-12 bg-stone-900"></div>
      <span className="text-xs font-medium uppercase tracking-wider text-stone-400">Venture OS</span>
     </div>
     <h2 className="text-xl font-medium tracking-tight text-stone-900">Founder <span className="text-stone-300 italic serif font-light">Tools</span></h2>
     <p className="text-stone-500 text-base font-light max-w-2xl leading-relaxed">
      A comprehensive suite of diagnostic and construction tools designed to accelerate your journey from concept to scale.
     </p>
    </div>
    
    <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-2 rounded-[1.5rem] border border-stone-200/60 shadow-xl shadow-stone-900/5 overflow-x-auto no-scrollbar">
     {(['dashboard', 'builder', 'pitch', 'applications'] as const).map((tab) => (
      <button
       key={tab}
       onClick={() => setActiveTab(tab)}
       className={cn(
        "px-6 py-3 text-xs font-medium uppercase tracking-[0.25em] rounded-xl transition-all duration-300 whitespace-nowrap",
        activeTab === tab 
         ? "bg-stone-900 text-white shadow-2xl shadow-stone-900/20 scale-[1.02]" 
         : "text-stone-400 hover:text-stone-900 hover:bg-stone-50"
       )}
      >
       {tab}
      </button>
     ))}
    </div>
   </div>

   {activeTab === 'dashboard' && (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
     {/* Readiness Score Card - Hardware Style */}
     <Card className="lg:col-span-4 space-y-8 p-10 rounded-[3rem] bg-stone-950 border-stone-800 shadow-2xl relative overflow-hidden group">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
         style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
      
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-1000">
       <Target className="w-48 h-48 -mr-16 -mt-16" />
      </div>

      <div className="text-center space-y-8 relative z-10">
       <div className="flex items-center justify-center gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
        <p className="text-xs font-mono font-medium text-stone-500 uppercase tracking-wider">Venture Readiness Index</p>
       </div>
       
       <div className="relative inline-flex items-center justify-center">
        {/* Hardware Decorative Rings */}
        <div className="absolute inset-[-20px] rounded-full border border-white/[0.03]" />
        <div className="absolute inset-[-40px] rounded-full border border-white/[0.01]" />
        
        {/* Outer Glow Ring */}
        <div className="absolute inset-0 rounded-full blur-3xl bg-white/5 opacity-50" />
        
        <svg className="w-56 h-56 transform -rotate-90">
         <circle
          cx="112"
          cy="112"
          r="100"
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          className="text-stone-900"
         />
         <circle
          cx="112"
          cy="112"
          r="100"
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={628.3}
          strokeDashoffset={628.3 * (1 - mockStartup.readinessScore / 100)}
          strokeLinecap="round"
          className="text-white transition-all duration-[2000ms] ease-out shadow-[0_0_30px_rgba(255,255,255,0.3)]"
         />
        </svg>
        <div className="absolute flex flex-col items-center">
         <span className="text-xl font-medium text-white tracking-tighter leading-none">{mockStartup.readinessScore}</span>
         <span className="text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mt-2">Percentile</span>
        </div>
       </div>
       
       <div className="flex flex-col items-center gap-4">
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
         <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
         <p className="text-xs font-mono font-medium text-white uppercase tracking-wider">{mockStartup.stage} Phase</p>
        </div>
        <p className="text-xs font-mono font-medium text-stone-600 uppercase tracking-widest">Last Sync: 02:14:55 UTC</p>
       </div>
      </div>

      <div className="space-y-6 pt-10 border-t border-white/5 relative z-10">
       {readinessMetrics.map((m, i) => (
        <div key={i} className="space-y-3">
         <div className="flex justify-between items-end">
          <div className="flex items-center gap-2">
           <span className="text-xs font-mono font-medium text-stone-600">0{i+1}</span>
           <span className="text-xs font-mono font-medium text-stone-400 uppercase tracking-wider">{m.label}</span>
          </div>
          <span className={cn(
           "text-xs font-mono font-medium uppercase tracking-widest",
           m.score < 40 ? "text-red-400" : m.score < 70 ? "text-amber-400" : "text-emerald-400"
          )}>{m.status}</span>
         </div>
         <div className="h-1.5 bg-white/5 rounded-full overflow-hidden p-[1px]">
          <motion.div 
           initial={{ width: 0 }}
           animate={{ width: `${m.score}%` }}
           transition={{ duration: 1.5, delay: i * 0.1, ease: "circOut" }}
           className={cn(
            "h-full rounded-full transition-all duration-1000",
            m.score < 40 ? "bg-red-400" : m.score < 70 ? "bg-amber-400" : "bg-white"
           )} 
          />
         </div>
        </div>
       ))}
      </div>

      <Button 
       variant="outline" 
       className="w-full h-16 rounded-2xl bg-white text-stone-900 hover:bg-stone-100 border-transparent transition-all duration-500 font-medium text-xs uppercase tracking-wider relative z-10 group/btn"
       onClick={() => setShowAssessment(true)}
      >
       <span className="flex items-center gap-3">
        Initiate Diagnostic
        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
       </span>
      </Button>
     </Card>

     {/* Startup Builder Overview */}
     <div className="lg:col-span-8 space-y-10">
      <Card className="p-12 rounded-[3rem] border-stone-200/60 shadow-2xl bg-white relative overflow-hidden">
       <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div className="space-y-2">
         <h3 className="text-xl font-medium tracking-tight text-stone-900">Startup Builder Progress</h3>
         <p className="text-sm text-stone-400 font-light">Complete core modules to optimize your venture architecture</p>
        </div>
        <div className="flex items-center gap-3 px-5 py-2.5 bg-stone-50 rounded-2xl border border-stone-200/50">
         <Activity className="w-4 h-4 text-stone-400" />
         <span className="text-xs font-mono font-medium text-stone-500 uppercase tracking-wider">System Status</span>
        </div>
       </div>

       <div className="space-y-6">
        {builderSteps.map((step) => (
         <div key={step.id} className="flex items-center gap-6 group cursor-pointer p-2 rounded-3xl hover:bg-stone-50 transition-all duration-300">
          <div className={cn(
           "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-sm border",
           step.status === "Completed" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
           step.status === "In-Progress" ? "bg-amber-50 text-amber-600 border-amber-100" : 
           "bg-stone-100 text-stone-400 border-stone-200"
          )}>
           <step.icon className="w-7 h-7" />
          </div>
          <div className="flex-1 space-y-3">
           <div className="flex items-center justify-between">
            <h4 className="text-base font-medium text-stone-900 tracking-tight">{step.title}</h4>
            <span className={cn(
             "text-xs font-mono font-medium uppercase tracking-wider px-3 py-1 rounded-full border",
             step.status === "Completed" ? "text-emerald-600 bg-emerald-50 border-emerald-100" : 
             step.status === "In-Progress" ? "text-amber-600 bg-amber-50 border-amber-100" : 
             "text-stone-400 bg-stone-50 border-stone-200"
            )}>{step.status}</span>
           </div>
           <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <motion.div 
             initial={{ width: 0 }}
             animate={{ width: step.status === "Completed" ? "100%" : step.status === "In-Progress" ? "50%" : "0%" }}
             transition={{ duration: 1.5, ease: "circOut" }}
             className={cn(
              "h-full transition-all",
              step.status === "Completed" ? "bg-emerald-500" : 
              step.status === "In-Progress" ? "bg-amber-500" : 
              "bg-stone-200"
             )}
            />
           </div>
          </div>
          <Button 
           variant="ghost" 
           size="icon" 
           className="w-12 h-10 rounded-2xl text-stone-300 group-hover:text-stone-900 group-hover:bg-white group-hover:shadow-xl transition-all duration-500"
           onClick={() => {
            setBuilderStep(step.id);
            setActiveTab('builder');
           }}
          >
           <ArrowRight className="w-5 h-5" />
          </Button>
         </div>
        ))}
       </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
       <Card className="p-10 rounded-[3rem] border-stone-200/60 shadow-2xl bg-white relative overflow-hidden">
        <div className="space-y-8">
         <div className="space-y-2">
          <h3 className="text-lg font-medium tracking-tight text-stone-900">Recent Achievements</h3>
          <p className="text-sm text-stone-400 font-light">Verified venture milestones</p>
         </div>
         <div className="space-y-6">
          {[
           { title: "First 10 Interviews", date: "2 days ago", icon: Trophy, color: "text-amber-500", bg: "bg-amber-50" },
           { title: "Pitch Deck v1.0", date: "1 week ago", icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
          ].map((ach, i) => (
           <div key={i} className="flex items-center gap-5 group cursor-pointer">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-sm border border-transparent group-hover:border-stone-200", ach.bg, ach.color)}>
             <ach.icon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
             <p className="text-base font-medium text-stone-900">{ach.title}</p>
             <p className="text-xs font-mono font-medium text-stone-400 uppercase tracking-widest">{ach.date}</p>
            </div>
           </div>
          ))}
         </div>
        </div>
       </Card>

       <Card className="p-10 rounded-[3rem] border-stone-200/60 shadow-2xl bg-white relative overflow-hidden">
        <div className="space-y-8">
         <div className="space-y-2">
          <h3 className="text-lg font-medium tracking-tight text-stone-900">Upcoming Deadlines</h3>
          <p className="text-sm text-stone-400 font-light">Critical ecosystem windows</p>
         </div>
         <div className="space-y-6">
          {[
           { title: "YC Summer Application", date: "Apr 15", icon: Clock, color: "text-red-500", bg: "bg-red-50" },
           { title: "Techstars Demo Day", date: "May 20", icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
          ].map((dl, i) => (
           <div key={i} className="flex items-center gap-5 group cursor-pointer">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-sm border border-transparent group-hover:border-stone-200", dl.bg, dl.color)}>
             <dl.icon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
             <p className="text-sm font-medium text-stone-900">{dl.title}</p>
             <p className="text-xs font-mono font-medium text-stone-400 uppercase tracking-widest">Due {dl.date}</p>
            </div>
           </div>
          ))}
         </div>
        </div>
       </Card>
      </div>
     </div>
    </div>
   )}

   {activeTab === 'builder' && (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
     {/* Steps Sidebar - Systematic Style */}
     <div className="lg:col-span-4 space-y-4">
      <div className="p-6 bg-stone-900 rounded-[2.5rem] shadow-2xl space-y-4">
       <div className="px-4 py-2 border-b border-white/5">
        <p className="text-xs font-mono font-medium text-stone-500 uppercase tracking-wider">Construction Modules</p>
       </div>
       <div className="space-y-3">
        {builderSteps.map((step) => (
         <button
          key={step.id}
          onClick={() => setBuilderStep(step.id)}
          className={cn(
           "w-full p-5 rounded-2xl border text-left transition-all duration-500 flex items-center gap-5 group relative overflow-hidden",
           builderStep === step.id 
            ? "bg-white border-white text-stone-900 shadow-2xl scale-[1.02]" 
            : "bg-stone-800/50 border-stone-700 text-stone-400 hover:border-stone-500 hover:bg-stone-800"
          )}
         >
          <div className={cn(
           "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500",
           builderStep === step.id ? "bg-stone-900 text-white" : "bg-stone-700 text-stone-500 group-hover:text-stone-300"
          )}>
           <step.icon className="w-6 h-6" />
          </div>
          <div className="flex-1 relative z-10">
           <p className={cn(
            "text-xs font-mono font-medium uppercase tracking-wider mb-1",
            builderStep === step.id ? "text-stone-500" : "text-stone-600"
           )}>Module {step.id}</p>
           <h4 className="text-sm font-medium tracking-tight">{step.title}</h4>
          </div>
          {step.status === "Completed" && (
           <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 relative z-10">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
           </div>
          )}
         </button>
        ))}
       </div>
      </div>
     </div>

     {/* Step Content */}
     <div className="lg:col-span-8 space-y-8">
      <AnimatePresence mode="wait">
       <motion.div
        key={builderStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.5, ease: "circOut" }}
       >
        <Card className="p-12 rounded-[3.5rem] border-stone-200/60 shadow-2xl bg-white relative overflow-hidden">
         {/* Blueprint Background Grid */}
         <div className="absolute inset-0 opacity-[0.015] pointer-events-none" 
            style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
         
         <div className="absolute top-0 right-0 w-80 h-80 bg-stone-50 rounded-full blur-[100px] -mr-40 -mt-40 opacity-60" />
         
         <div className="space-y-12 relative z-10">
          <div className="space-y-6">
           <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-stone-900 flex items-center justify-center shadow-xl shadow-stone-900/20">
              <span className="text-white font-mono font-medium text-sm">0{builderStep}</span>
             </div>
             <div className="space-y-1">
              <p className="text-xs font-mono font-medium text-stone-400 uppercase tracking-wider">Module Architecture</p>
              <h3 className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900 tracking-tight">
               {builderContent[builderStep as keyof typeof builderContent]?.title || "Coming Soon"}
              </h3>
             </div>
            </div>
            <div className="hidden md:flex items-center gap-3 px-5 py-2 bg-stone-50 rounded-full border border-stone-100">
             <ShieldCheck className="w-4 h-4 text-emerald-500" />
             <span className="text-xs font-mono font-medium text-stone-500 uppercase tracking-widest">Secure Environment</span>
            </div>
           </div>
           <p className="text-base sm:text-lg md:text-xl xl:text-2xl text-stone-500 font-light leading-relaxed max-w-2xl">
            {builderContent[builderStep as keyof typeof builderContent]?.description}
           </p>
          </div>

          <div className="space-y-12 pt-12 border-t border-stone-100">
           {builderContent[builderStep as keyof typeof builderContent]?.questions.map((q, i) => (
            <div key={i} className="space-y-5 group">
             <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-stone-800 tracking-tight flex items-center gap-4">
               <span className="w-8 h-8 rounded-xl bg-stone-100 text-stone-400 text-xs flex items-center justify-center font-mono group-focus-within:bg-stone-900 group-focus-within:text-white transition-all duration-500">0{i + 1}</span>
               {q}
              </label>
              <span className="text-xs font-mono font-medium text-stone-300 uppercase tracking-widest opacity-0 group-focus-within:opacity-100 transition-opacity">Input Required</span>
             </div>
             <div className="relative">
              <textarea 
               className="w-full bg-stone-50 border border-stone-200 rounded-[2rem] p-8 text-base text-stone-700 focus:outline-none focus:ring-4 focus:ring-stone-900/5 focus:border-stone-900 transition-all min-h-[180px] font-light leading-relaxed placeholder:text-stone-300"
               placeholder="Enter technical specifications or strategic analysis..."
              />
              {/* Decorative Corner */}
              <div className="absolute bottom-6 right-6 w-4 h-4 border-r-2 border-b-2 border-stone-200 rounded-br-lg group-focus-within:border-stone-900 transition-colors" />
             </div>
            </div>
           ))}
          </div>

          <div className="flex items-center justify-between pt-10">
           <Button 
            variant="ghost" 
            className="h-16 px-10 rounded-2xl text-xs font-medium uppercase tracking-wider text-stone-400 hover:text-stone-900 hover:bg-stone-50 transition-all duration-500"
            disabled={builderStep === 1}
            onClick={() => setBuilderStep(prev => prev - 1)}
           >
            Previous Module
           </Button>
           <Button 
            variant="primary"
            className="h-16 px-12 rounded-2xl text-xs font-medium uppercase tracking-wider bg-stone-900 text-white shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 flex items-center gap-3"
            onClick={() => {
             if (builderStep < builderSteps.length) {
              setBuilderStep(prev => prev + 1);
             }
            }}
           >
            {builderStep === builderSteps.length ? "Finalize Architecture" : "Save & Next Module"}
            <ArrowRight className="w-4 h-4" />
           </Button>
          </div>
         </div>
        </Card>
       </motion.div>
      </AnimatePresence>

      <Card className="bg-amber-50 border-amber-100 p-10 rounded-[3rem] shadow-xl shadow-amber-900/5 relative overflow-hidden group">
       <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity duration-1000">
        <Zap className="w-40 h-40 -mr-12 -mt-12" />
       </div>
       <div className="flex gap-8 relative z-10">
        <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center text-amber-600 shrink-0 shadow-xl shadow-amber-900/10 border border-amber-100">
         <Lightbulb className="w-8 h-8" />
        </div>
        <div className="space-y-3">
         <div className="flex items-center gap-3">
          <h4 className="text-base font-medium text-amber-900 tracking-tight">Strategic Advisory</h4>
          <div className="h-px w-8 bg-amber-200" />
          <span className="text-xs font-mono font-medium text-amber-600 uppercase tracking-widest">Priority: High</span>
         </div>
         <p className="text-sm text-amber-800/80 leading-relaxed font-light max-w-2xl">
          Precision is more valuable than speed at this stage. Ensure your <span className="font-medium text-amber-900">Value Proposition</span> is explicitly linked to a verified market pain point before proceeding to technical architecture.
         </p>
        </div>
       </div>
      </Card>
     </div>
    </div>
   )}
  </div>

 </PageContainer>
 );
}
