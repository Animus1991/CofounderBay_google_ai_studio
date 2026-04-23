import { Zap, Users, ShieldCheck, ArrowRight, Globe, GraduationCap, Sparkles, Activity, Target, Rocket, ChevronRight, Star } from "lucide-react";
import { motion } from "motion/react";
import { useTenant } from "../context/TenantContext";
import { cn } from "../lib/utils";

export default function Landing() {
 const { tenant } = useTenant();

 return (
  <div className="min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden font-sans">
   {/* Navigation - Ultra Minimal */}
   <nav className="h-24 flex items-center justify-between px-8 md:px-16 border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50">
    <div className="flex items-center gap-4">
     {tenant?.branding.logoUrl ? (
      <img src={tenant.branding.logoUrl} alt={tenant.displayName} className="h-7 w-auto" />
     ) : (
      <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-2xl shadow-white/10">
       <Zap className="w-5 h-5 text-black fill-current" />
      </div>
     )}
     <span className="text-xl font-medium tracking-tighter uppercase">{tenant?.displayName || "CoFounderBay"}</span>
    </div>
    
    <div className="hidden lg:flex items-center gap-12 text-xs font-medium text-stone-500 uppercase tracking-wider">
     <a href="#vision" className="hover:text-white transition-all">Vision</a>
     <a href="#ecosystem" className="hover:text-white transition-all">Ecosystem</a>
     <a href="#network" className="hover:text-white transition-all">Network</a>
    </div>

    <div className="flex items-center gap-6">
     <button className="text-xs font-medium text-stone-500 hover:text-white uppercase tracking-wider transition-all px-4">Log In</button>
     <button className="bg-white text-black px-8 h-10 rounded-full text-xs font-medium uppercase tracking-wider hover:bg-stone-200 transition-all shadow-[0_15px_30px_-10px_rgba(255,255,255,0.2)]">
      {tenant ? "Join Ecosystem" : "Join Platform"}
     </button>
    </div>
   </nav>

   {/* Hero Section - Editorial Split Layout */}
   <section className="relative min-h-[90vh] flex flex-col lg:flex-row items-center">
    {/* Background Atmosphere */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_rgba(255,255,255,0.03)_0%,_transparent_60%)] pointer-events-none" />
    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
    
    <div className="w-full lg:w-1/2 px-6 sm:px-8 md:px-16 py-16 md:py-24 lg:py-0 flex flex-col justify-center space-y-8 md:space-y-12 relative z-10">
     <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-10"
     >
      <div className="inline-flex items-center gap-4 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-stone-400 uppercase tracking-wider backdrop-blur-xl">
       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
       {tenant ? tenant.name : "The Future of Venture Building"}
      </div>
      
      <h1 className="text-2xl lg:text-3xl font-light tracking-tight leading-snug text-white">
       {tenant?.content?.heroTitle ? (
        <>
         {tenant.content.heroTitle.split(' ').slice(0, -1).join(' ')}{' '}
         <span className="font-serif italic text-stone-500">{tenant.content.heroTitle.split(' ').slice(-1)}</span>
        </>
       ) : (
        <>
         Build your startup team with <span className="font-serif italic text-stone-500">absolute precision.</span>
        </>
       )}
      </h1>
      
      <p className="text-lg text-stone-400 leading-relaxed max-w-xl font-light">
       {tenant ? tenant.content.heroSubtitle : "We've replaced random networking with a structured, data-driven ecosystem designed to reduce founder risk and accelerate venture maturity."}
      </p>
      
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 pt-4">
       <button className="w-full sm:w-auto bg-white text-black px-12 h-20 rounded-[2rem] text-sm font-medium uppercase tracking-wider hover:bg-stone-200 transition-all flex items-center justify-center gap-4 shadow-[0_25px_50px_-12px_rgba(255,255,255,0.15)] hover:-translate-y-1">
        {tenant ? tenant.content.ctaLabel : "Get Started"} <ArrowRight className="w-5 h-5" />
       </button>
       <button className="w-full sm:w-auto text-stone-400 hover:text-white text-sm font-medium uppercase tracking-wider flex items-center gap-3 transition-all group">
        Explore Network <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
       </button>
      </div>
     </motion.div>
    </div>

    <div className="w-full lg:w-1/2 h-[60vh] lg:h-screen relative overflow-hidden">
     {/* Immersive Visual Element */}
     <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm z-10" />
     <img 
      src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000" 
      alt="Modern Workspace" 
      className="absolute inset-0 w-full h-full object-cover scale-110"
      referrerPolicy="no-referrer"
     />
     
     {/* Floating Data Cards - Hardware Style */}
     <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 z-20 flex items-center justify-center p-8"
     >
      <div className="w-full max-w-2xl bg-black/60 backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] border border-white/10 p-6 sm:p-8 md:p-12 shadow-2xl space-y-8 md:space-y-10 relative overflow-hidden group">
       <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-[100px]" />
       
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
         <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
          <Activity className="w-8 h-8 text-white" />
         </div>
         <div>
          <h4 className="text-xl font-medium text-white">Ecosystem Pulse</h4>
          <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">Live Network Activity</p>
         </div>
        </div>
        <div className="text-right">
         <p className="text-xl sm:text-2xl xl:text-3xl font-medium text-white tracking-tighter">99.9%</p>
         <p className="text-xs text-emerald-500 font-medium uppercase tracking-widest">Stability Index</p>
        </div>
       </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
        <div className="bg-white/5 rounded-3xl p-8 border border-white/5 space-y-4">
         <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">Active Nodes</p>
         <p className="text-xl font-medium text-white tracking-tighter">2,482</p>
        </div>
        <div className="bg-white/5 rounded-3xl p-8 border border-white/5 space-y-4">
         <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">Venture Matches</p>
         <p className="text-xl font-medium text-white tracking-tighter">156</p>
        </div>
       </div>

       <div className="space-y-4">
        <div className="flex justify-between text-xs font-medium uppercase tracking-wider text-stone-500">
         <span>Network Integrity</span>
         <span className="text-white">88%</span>
        </div>
        <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden p-1 border border-white/5">
         <div className="h-full w-[88%] bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
        </div>
       </div>
      </div>
     </motion.div>
    </div>
   </section>

   {/* Stats Section - Minimal & Precise */}
   <section className="py-16 md:py-24 border-y border-white/5 bg-[#0D0D0D]">
    <div className="max-w-7xl mx-auto px-6 sm:px-8 md:px-16 grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-16">
     {[
      { label: "Active Founders", value: "2.5k+", icon: Users },
      { label: "Teams Formed", value: "850+", icon: Target },
      { label: "Expert Mentors", value: "120+", icon: Star },
      { label: "Ecosystem Hubs", value: "15+", icon: Globe }
     ].map((stat, i) => (
      <div key={i} className="space-y-4 text-center lg:text-left">
       <div className="flex items-center justify-center lg:justify-start gap-4 text-stone-600">
        <stat.icon className="w-5 h-5" />
        <span className="text-xs font-medium uppercase tracking-wider">{stat.label}</span>
       </div>
       <p className="text-xl font-medium text-white tracking-tighter">{stat.value}</p>
      </div>
     ))}
    </div>
   </section>

   {/* Features Grid - Hardware Specialist Style */}
   <section id="features" className="py-40 px-8 md:px-16 max-w-7xl mx-auto space-y-32">
    <div className="max-w-3xl space-y-8">
     <h2 className="text-2xl font-medium text-white tracking-tight leading-tight">
      Built for the next generation of <span className="font-serif italic text-stone-500">builders.</span>
     </h2>
     <p className="text-lg text-stone-400 font-light leading-relaxed">
      We've replaced random networking with structured, data-driven matching and institutional-grade ecosystem support.
     </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
     {[
      { 
       icon: Users, 
       title: "Smart Matching", 
       desc: "Our weighted compatibility engine analyzes 42+ data points including skills, values, and commitment levels to find your perfect co-founder.",
       tag: "Analysis.v4"
      },
      { 
       icon: GraduationCap, 
       title: "Mentor Network", 
       desc: "Access a curated directory of verified founders and advisors ready to help you navigate the complexities of early-stage venture building.",
       tag: "Expertise.v2"
      },
      { 
       icon: Globe, 
       title: "Thematic Hubs", 
       desc: "Join industry-specific environments to share knowledge, find collaborators, and stay updated on specialized ecosystem opportunities.",
       tag: "Network.v3"
      }
     ].map((feature, i) => (
      <div key={i} className="bg-stone-950 border border-white/5 p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] space-y-8 md:space-y-10 hover:border-white/20 transition-all duration-700 group relative overflow-hidden">
       <div className="absolute top-8 right-8 text-xs font-mono font-medium text-stone-700 uppercase tracking-widest group-hover:text-stone-400 transition-colors">
        {feature.tag}
       </div>
       <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-700">
        <feature.icon className="w-8 h-8 text-white" />
       </div>
       <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">{feature.title}</h3>
        <p className="text-base text-stone-500 leading-relaxed font-light group-hover:text-stone-400 transition-colors">
         {feature.desc}
        </p>
       </div>
       <div className="pt-8 flex items-center gap-3 text-xs font-medium text-stone-600 uppercase tracking-wider group-hover:text-white transition-colors cursor-pointer">
        Learn More <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
       </div>
      </div>
     ))}
    </div>
   </section>

   {/* CTA Section - Atmospheric & Immersive */}
   <section className="px-8 md:px-16 pb-40">
    <div className="max-w-7xl mx-auto bg-stone-950 rounded-[4rem] p-24 md:p-40 text-center space-y-16 relative overflow-hidden border border-white/5 shadow-[0_60px_120px_-20px_rgba(0,0,0,0.6)]">
     <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.05)_0%,_transparent_70%)] pointer-events-none" />
     <div className="absolute -top-48 -left-48 w-96 h-96 bg-white/5 rounded-full blur-[120px]" />
     
     <div className="space-y-8 relative z-10">
      <h2 className="text-xl sm:text-3xl xl:text-4xl 2xl:text-6xl font-medium text-white tracking-tight leading-tight max-w-4xl mx-auto">
       Ready to build your next <span className="font-serif italic text-stone-500">venture?</span>
      </h2>
      <p className="text-lg text-stone-400 max-w-2xl mx-auto font-light">
       Join thousands of founders and candidates already building the future on CoFounderBay.
      </p>
     </div>

     <div className="relative z-10">
      <button className="bg-white text-black px-16 h-24 rounded-[2.5rem] text-[14px] font-medium uppercase tracking-wider hover:bg-stone-200 transition-all shadow-[0_30px_60px_-10px_rgba(255,255,255,0.2)] hover:-translate-y-2">
       Create Your Profile
      </button>
     </div>
     
     <div className="pt-12 flex items-center justify-center gap-12 relative z-10">
      <div className="flex flex-col items-center gap-2">
       <p className="text-lg font-medium text-white">4.9/5</p>
       <p className="text-xs text-stone-600 font-medium uppercase tracking-widest">Founder Rating</p>
      </div>
      <div className="w-px h-12 bg-white/10" />
      <div className="flex flex-col items-center gap-2">
       <p className="text-lg font-medium text-white">12k+</p>
       <p className="text-xs text-stone-600 font-medium uppercase tracking-widest">Monthly Matches</p>
      </div>
     </div>
    </div>
   </section>

   {/* Footer - Ultra Clean */}
   <footer className="py-12 md:py-24 border-t border-white/5 px-6 sm:px-8 md:px-16 bg-black">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 items-center gap-16">
     <div className="flex items-center gap-4 justify-center md:justify-start">
      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
       <Zap className="w-4 h-4 text-black fill-current" />
      </div>
      <span className="text-lg font-medium tracking-tighter uppercase">CoFounderBay</span>
     </div>
     
     <div className="flex justify-center gap-12 text-xs font-medium text-stone-600 uppercase tracking-wider">
      <a href="#" className="hover:text-white transition-colors">Privacy</a>
      <a href="#" className="hover:text-white transition-colors">Terms</a>
      <a href="#" className="hover:text-white transition-colors">Contact</a>
     </div>
     
     <p className="text-xs text-stone-700 text-center md:text-right font-medium uppercase tracking-wider">
      © 2026 CoFounderBay. All rights reserved.
     </p>
    </div>
   </footer>
  </div>
 );
}
