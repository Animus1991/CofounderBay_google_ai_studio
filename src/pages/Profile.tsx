import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { User as UserIcon, Search, Filter, SlidersHorizontal, ArrowRight, CheckCircle2, XCircle, Star, Plus, Users, Send, Edit3, Globe, Linkedin, Github, ExternalLink, GraduationCap, Zap, ShieldCheck, Award, Briefcase, MapPin, Mail, Share2, Sparkles, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { cn } from "../lib/utils";
import { User } from "../types";

import PageContainer from "../components/layout/PageContainer";

interface ProfileProps {
 user: User;
}

const ProfileSkeleton = () => (
 <PageContainer>
  <div className="space-y-16 animate-pulse">
   {/* Header Skeleton */}
   <div className="bg-stone-100 h-[32rem] rounded-[4rem] border border-stone-200/50"></div>
   
   <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
    <div className="lg:col-span-2 space-y-16">
     {/* About Skeleton */}
     <div className="h-72 bg-stone-100 rounded-[3.5rem] border border-stone-200/30"></div>
     {/* Experience Skeleton */}
     <div className="h-[30rem] bg-stone-100 rounded-[3.5rem] border border-stone-200/30"></div>
     {/* Skills Skeleton */}
     <div className="h-80 bg-stone-100 rounded-[3.5rem] border border-stone-200/30"></div>
    </div>
    <div className="space-y-16">
     {/* Sidebar Skeletons */}
     <div className="h-[28rem] bg-stone-900/5 rounded-[3.5rem] border border-stone-200/30"></div>
     <div className="h-64 bg-stone-100 rounded-[3.5rem] border border-stone-200/30"></div>
     <div className="h-80 bg-stone-100 rounded-[3.5rem] border border-stone-200/30"></div>
    </div>
   </div>
  </div>
 </PageContainer>
);

export default function Profile({ user: currentUser }: ProfileProps) {
 const { id } = useParams();
 const [profile, setProfile] = useState<any>(null);
 const [loading, setLoading] = useState(true);

 const isOwnProfile = !id || id === currentUser.id;
 const profileId = id || currentUser.id;

 const [endorsementModalOpen, setEndorsementModalOpen] = useState(false);
 const [selectedSkillToEndorse, setSelectedSkillToEndorse] = useState<string>("");
 const [endorsementComment, setEndorsementComment] = useState("");
 const [localSkills, setLocalSkills] = useState<any[]>([]);

 useEffect(() => {
  const fetchProfile = async () => {
   try {
    const res = await fetch(`/api/users/${profileId}`);
    const data = await res.json();
    setProfile(data);
    setLocalSkills(data.skills.map((s: any) => ({ ...s, endorsements: s.endorsements || 0 })));
   } catch (err) {
    console.error("Error fetching profile", err);
   } finally {
    // Artificial delay for premium feel
    setTimeout(() => setLoading(false), 800);
   }
  };
  fetchProfile();
 }, [profileId]);

 if (loading) return <ProfileSkeleton />;

 const handleEndorseSubmit = () => {
  if (!selectedSkillToEndorse) return;
  setLocalSkills(prev => prev.map(s => s.id === selectedSkillToEndorse ? { ...s, endorsements: s.endorsements + 1 } : s));
  setEndorsementModalOpen(false);
  setEndorsementComment("");
  setSelectedSkillToEndorse("");
 };

 return (
  <PageContainer className="bg-stone-50/30">
   <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    className="space-y-20 pb-32"
   >
   {/* Profile Header - Immersive Editorial Design */}
   <div className="relative bg-white border border-stone-200/60 rounded-[4rem] overflow-hidden shadow-2xl shadow-stone-200/30">
    {/* Banner Background - Dynamic & Atmospheric */}
    <div className="h-80 md:h-[32rem] bg-stone-950 relative overflow-hidden">
     {/* Mesh Gradient Background */}
     <div className="absolute inset-0 opacity-40">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-stone-500 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-stone-700 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-stone-400 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '4s' }}></div>
     </div>
     
     {/* Technical Grid Overlay */}
     <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>
     
     <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-stone-950 via-stone-950/80 to-transparent"></div>
     
     {isOwnProfile && (
      <Button variant="secondary" size="sm" className="absolute top-12 right-12 bg-white/5 hover:bg-white/10 border-white/10 text-white backdrop-blur-3xl rounded-2xl h-10 px-8 font-medium text-xs uppercase tracking-[0.25em] transition-all group">
       <Edit3 className="w-4 h-4 mr-3 group-hover:rotate-12 transition-transform" /> Edit Environment
      </Button>
     )}

     {/* Status Indicator */}
     <div className="absolute top-12 left-12 flex items-center gap-4 px-6 py-3 bg-white/5 backdrop-blur-3xl rounded-2xl border border-white/10">
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
      <span className="text-xs font-mono font-medium text-white uppercase tracking-wider">Node Active • v4.2.0</span>
     </div>
    </div>

    <div className="px-10 md:px-24 pb-24 relative">
     <div className="flex flex-col md:flex-row md:items-end justify-between gap-16 -mt-32 md:-mt-48">
      <div className="flex flex-col md:flex-row md:items-end gap-16">
       {/* Avatar - High Impact Hardware Style */}
       <div className="relative group">
        <div className="w-56 h-56 md:w-72 md:h-72 rounded-[4.5rem] bg-stone-950 p-1.5 shadow-2xl relative z-10 border border-white/10 transition-transform duration-1000 group-hover:scale-[1.02]">
         <div className="w-full h-full rounded-[4.25rem] overflow-hidden border-4 border-white">
          <img 
           src={profile.profile.profilePhoto || `https://picsum.photos/seed/${profile.id}/400/400`} 
           alt={profile.fullName}
           className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
           referrerPolicy="no-referrer"
          />
         </div>
         {isOwnProfile && (
          <button className="absolute -bottom-4 -right-4 w-18 h-18 bg-stone-950 text-white rounded-[2rem] flex items-center justify-center shadow-2xl border-4 border-white hover:scale-110 transition-all z-20 group/btn">
           <Edit3 className="w-8 h-8 group-hover:rotate-12 transition-transform" />
          </button>
         )}
         
         {/* Decorative Elements */}
         <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-stone-900 rounded-tl-3xl opacity-20 group-hover:opacity-100 transition-opacity"></div>
         <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-2 border-r-2 border-stone-900 rounded-br-3xl opacity-20 group-hover:opacity-100 transition-opacity"></div>
        </div>
       </div>

       <div className="space-y-10 pb-6">
        <div className="flex flex-wrap items-center gap-8">
         <h2 className="text-xl sm:text-3xl xl:text-4xl 2xl:text-6xl font-medium tracking-tight text-stone-950 leading-none">{profile.fullName}</h2>
         {profile.profileCompletionScore > 90 && profile.emailVerified ? (
          <div className="flex items-center gap-4 bg-emerald-50 text-emerald-700 text-xs font-medium px-6 py-3 rounded-2xl border border-emerald-100 uppercase tracking-wider shadow-sm">
           <ShieldCheck className="w-5 h-5" />
           Verified Entity
          </div>
         ) : (
          <div className="flex items-center gap-4 bg-stone-50 text-stone-500 text-xs font-medium px-6 py-3 rounded-2xl border border-stone-200 uppercase tracking-wider shadow-sm">
           <ShieldCheck className="w-5 h-5 opacity-50" />
           Pending Verification
          </div>
         )}
         {profile.roles.includes("Mentor") && (
          <div className="flex items-center gap-4 bg-amber-50 text-amber-700 text-xs font-medium px-6 py-3 rounded-2xl border border-amber-100 uppercase tracking-wider shadow-sm">
           <Star className="w-5 h-5 fill-amber-700" />
           Top Tier Mentor
          </div>
         )}
        </div>
        <p className="text-xl md:text-2xl text-stone-500 font-light leading-tight max-w-4xl tracking-tight">
         {profile.profile.headline}
        </p>
        <div className="flex flex-wrap items-center gap-16 text-xs text-stone-400 font-medium uppercase tracking-wider pt-6 border-t border-stone-100">
         <span className="flex items-center gap-5 group cursor-default">
          <MapPin className="w-6 h-6 text-stone-300 group-hover:text-stone-900 transition-colors" /> 
          {profile.profile.location}
         </span>
         {(profile.roles.includes("Mentor") || profile.roles.includes("Co-Founder Candidate")) && (
          <span className="flex items-center gap-5 group cursor-default">
           <Briefcase className="w-6 h-6 text-stone-300 group-hover:text-stone-900 transition-colors" /> 
           {profile.profile.yearsOfExperience} Years Experience
          </span>
         )}
         <span className="flex items-center gap-5 group cursor-default">
          <Briefcase className="w-6 h-6 text-stone-300 group-hover:text-stone-900 transition-colors" /> 
          {profile.roles[0]}
         </span>
         <span className="flex items-center gap-5 group cursor-default">
          <Users className="w-6 h-6 text-stone-300 group-hover:text-stone-900 transition-colors" /> 
          {profile.profile.commitmentLevel}
         </span>
        </div>
       </div>
      </div>

      <div className="flex items-center gap-8 pb-6">
       {isOwnProfile ? (
        <>
         <Button variant="outline" className="h-18 px-14 rounded-3xl border-stone-200 hover:border-stone-950 hover:bg-stone-50 transition-all gap-6 text-xs font-medium uppercase tracking-wider shadow-sm">
          <Share2 className="w-6 h-6" /> Broadcast
         </Button>
         <Button className="h-18 px-16 rounded-3xl bg-stone-950 text-white hover:bg-stone-900 transition-all gap-6 text-xs font-medium uppercase tracking-wider shadow-2xl shadow-stone-300">
          <Edit3 className="w-6 h-6" /> Edit Profile
         </Button>
        </>
       ) : (
        <>
         <Button variant="outline" onClick={() => setEndorsementModalOpen(true)} className="h-18 px-14 rounded-3xl border-stone-200 hover:border-stone-950 hover:bg-stone-50 transition-all gap-4 text-xs font-medium uppercase tracking-wider shadow-sm">
          <Star className="w-5 h-5" /> Endorse Skills
         </Button>
         <Button variant="outline" className="h-18 px-14 rounded-3xl border-stone-200 hover:border-stone-950 hover:bg-stone-50 transition-all text-xs font-medium uppercase tracking-wider shadow-sm">
          Save Node
         </Button>
         <Button className="h-18 px-16 rounded-3xl bg-stone-950 text-white hover:bg-stone-900 transition-all gap-6 text-xs font-medium uppercase tracking-wider shadow-2xl shadow-stone-300">
          <Send className="w-6 h-6" /> Establish Link
         </Button>
        </>
       )}
      </div>
     </div>
    </div>
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-3 gap-20">
    {/* Left Column */}
    <div className="lg:col-span-2 space-y-20">
     {/* About Section - Editorial Layout */}
     <section className="bg-white border border-stone-100 rounded-[4rem] p-16 md:p-24 shadow-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-96 h-96 bg-stone-50/50 rounded-full -mr-48 -mt-48 blur-[100px] group-hover:bg-stone-100 transition-colors duration-1000"></div>
      
      <div className="flex items-center gap-8 mb-20">
       <div className="w-16 h-16 rounded-3xl bg-stone-950 flex items-center justify-center text-white shadow-xl">
        <UserIcon className="w-8 h-8" />
       </div>
       <div className="space-y-1">
        <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400">Executive Summary</h3>
        <p className="text-xl font-medium text-stone-950">The Visionary <span className="text-stone-300 italic serif">Blueprint</span></p>
       </div>
      </div>

      <div className="relative">
       <div className="absolute -left-12 top-0 bottom-0 w-[1px] bg-stone-100"></div>
       <p className="text-stone-600 leading-snug text-lg font-light whitespace-pre-wrap max-w-5xl">
        {profile.profile.bio}
       </p>
      </div>
      
      {/* Decorative Monospace Label */}
      <div className="absolute bottom-12 right-12 font-mono text-xs text-stone-300 uppercase tracking-wider rotate-90 origin-right">
       Profile.Bio.v4
      </div>
     </section>

     {/* Experience Section - Hardware Timeline */}
     <section className="bg-white border border-stone-100 rounded-[4rem] p-16 md:p-24 shadow-sm relative overflow-hidden">
      <div className="flex items-center gap-8 mb-24">
       <div className="w-16 h-16 rounded-3xl bg-stone-950 flex items-center justify-center text-white shadow-xl">
        <Briefcase className="w-8 h-8" />
       </div>
       <div className="space-y-1">
        <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400">Professional Journey</h3>
        <p className="text-xl font-medium text-stone-950">Operational <span className="text-stone-300 italic serif">History</span></p>
       </div>
      </div>

      <div className="space-y-24">
       {[
        { title: "Senior Product Manager", company: "TechFlow Systems", period: "2021 - Present", description: "Leading the core product team focused on ecosystem growth and user retention. Scaled user base by 40% in 18 months." },
        { title: "Product Strategist", company: "Innovate Labs", period: "2018 - 2021", description: "Developed go-to-market strategies for early-stage startups. Mentored 15+ founders on product-market fit." }
       ].map((exp, i) => (
        <div key={i} className="relative pl-24 group">
         {/* Technical Vertical Line */}
         <div className="absolute left-0 top-4 bottom-0 w-[2px] bg-stone-100 group-last:bottom-auto group-last:h-4">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-stone-950 rounded-full border-4 border-white shadow-lg group-hover:scale-150 transition-transform duration-500"></div>
         </div>
         
         <div className="space-y-10">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-10">
           <div className="space-y-4">
            <div className="inline-flex bg-stone-50 text-xs font-mono font-medium text-stone-400 px-5 py-2 rounded-lg border border-stone-100 uppercase tracking-wider">
             {exp.period}
            </div>
            <h4 className="text-xl font-medium text-stone-950 tracking-tight leading-none">{exp.title}</h4>
            <p className="text-lg font-medium text-stone-400 italic font-serif">{exp.company}</p>
           </div>
           <Button variant="outline" size="sm" className="rounded-2xl border-stone-100 hover:border-stone-950 transition-all text-xs font-medium uppercase tracking-wider h-10 px-8">
            View Artifacts
           </Button>
          </div>
          <p className="text-sm sm:text-base lg:text-lg text-stone-500 leading-relaxed font-light max-w-4xl">{exp.description}</p>
         </div>
        </div>
       ))}
      </div>
     </section>

     {/* Skills Section - Data Grid Style */}
     <section className="bg-white border border-stone-100 rounded-[4rem] p-16 md:p-24 shadow-sm relative overflow-hidden">
      <div className="flex items-center gap-8 mb-24">
       <div className="w-16 h-16 rounded-3xl bg-stone-950 flex items-center justify-center text-white shadow-xl">
        <Zap className="w-8 h-8" />
       </div>
       <div className="space-y-1">
        <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400">Skills & Expertise</h3>
        <p className="text-xl font-medium text-stone-950">Technical <span className="text-stone-300 italic serif">Inventory</span></p>
       </div>
      </div>

      <div className="space-y-24">
       {["Technical", "Business", "Marketing"].map((category) => {
        const categorySkills = localSkills.filter((s: any) => s.category === category);
        if (categorySkills.length === 0) return null;
        
        const getProficiencyLabel = (level: number) => {
         if (level >= 5) return "Expert";
         if (level >= 3) return "Intermediate";
         return "Beginner";
        };

        return (
         <div key={category} className="space-y-12">
          <div className="flex items-center gap-6">
           <h4 className="text-sm font-medium text-stone-950 uppercase tracking-wider">{category}</h4>
           <div className="flex-1 h-[1px] bg-stone-100"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {categorySkills.map((skill: any) => (
            <motion.div 
             key={skill.id} 
             whileHover={{ x: 10 }}
             className="bg-stone-50/50 border border-stone-100 px-10 py-8 rounded-[2.5rem] flex flex-col gap-6 group hover:bg-white hover:border-stone-950 hover:shadow-2xl hover:shadow-stone-200/50 transition-all duration-500"
            >
             <div className="flex items-center justify-between">
              <div className="space-y-1">
               <span className="text-lg font-medium text-stone-950 flex items-center gap-2">
                {skill.name}
                {skill.endorsements > 0 && (
                 <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  +{skill.endorsements}
                 </span>
                )}
               </span>
               <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">{getProficiencyLabel(skill.proficiency)}</span>
                <span className="w-1 h-1 rounded-full bg-stone-200"></span>
                <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">{skill.yearsOfExperience} Years</span>
               </div>
              </div>
              <span className="text-xs font-mono text-stone-300 uppercase tracking-widest">Lvl {skill.proficiency}</span>
             </div>
             <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
               <div 
                key={level} 
                className={cn(
                 "h-1.5 flex-1 rounded-full transition-all duration-700",
                 level <= skill.proficiency ? "bg-stone-950" : "bg-stone-200/50"
                )}
               ></div>
              ))}
             </div>
            </motion.div>
           ))}
          </div>
         </div>
        );
       })}
      </div>
     </section>
    </div>

    {/* Right Column */}
    <div className="space-y-20">
     {/* Match Relevance (Only for others) - Atmospheric Dashboard */}
     {!isOwnProfile && (
      <section className="bg-stone-950 rounded-[4rem] p-16 text-white shadow-2xl shadow-stone-400/20 relative overflow-hidden group">
       {/* Atmospheric Background */}
       <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-stone-500 rounded-full blur-[100px] animate-pulse"></div>
       </div>
       
       <div className="flex items-center gap-6 mb-20 relative z-10">
        <div className="w-14 h-11 rounded-2xl bg-white/10 backdrop-blur-3xl flex items-center justify-center border border-white/10">
         <Sparkles className="w-7 h-7 text-amber-400" />
        </div>
        <div className="space-y-1">
         <h3 className="text-xs font-medium uppercase tracking-wider text-stone-500">Intelligence Match</h3>
         <p className="text-lg font-medium text-white">Strategic <span className="text-stone-600 italic serif">Alignment</span></p>
        </div>
       </div>

       <div className="space-y-16 relative z-10">
        <div className="flex items-center justify-between p-10 bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-inner">
         <div className="flex items-center gap-10">
          <div className="relative">
           <svg className="w-24 h-24 transform -rotate-90">
            <circle
             cx="48"
             cy="48"
             r="44"
             stroke="currentColor"
             strokeWidth="4"
             fill="transparent"
             className="text-white/5"
            />
            <motion.circle
             cx="48"
             cy="48"
             r="44"
             stroke="currentColor"
             strokeWidth="4"
             fill="transparent"
             strokeDasharray={276.46}
             initial={{ strokeDashoffset: 276.46 }}
             animate={{ strokeDashoffset: 276.46 * (1 - 0.84) }}
             transition={{ duration: 2, ease: "easeOut" }}
             className="text-amber-400"
            />
           </svg>
           <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl sm:text-2xl xl:text-3xl font-medium tracking-tighter">84</span>
           </div>
          </div>
          <div>
           <p className="text-xl font-medium tracking-tight">Match Score</p>
           <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">High Compatibility</p>
          </div>
         </div>
         <div className="text-right">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 text-xs font-medium uppercase tracking-wider">
           Top 5%
          </div>
         </div>
        </div>
        
        <div className="space-y-12">
         <div className="space-y-6">
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
           <span className="text-stone-500">Skill Complementarity</span>
           <span className="text-white font-mono">92.4%</span>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
           <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "92.4%" }}
            transition={{ duration: 2, delay: 0.5 }}
            className="h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]"
           ></motion.div>
          </div>
         </div>
         
         <div className="space-y-6">
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
           <span className="text-stone-500">Value Alignment</span>
           <span className="text-white font-mono">78.1%</span>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
           <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "78.1%" }}
            transition={{ duration: 2, delay: 0.7 }}
            className="h-full bg-stone-500 rounded-full"
           ></motion.div>
          </div>
         </div>
        </div>

        <div className="p-10 bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/5 relative group/card">
         <div className="absolute top-4 right-4 font-mono text-[8px] text-stone-700 uppercase tracking-wider">Analysis.v2</div>
         <p className="text-base text-stone-300 leading-relaxed italic font-light">
          "Both of you are mission-driven and have complementary technical and business backgrounds. Sarah's expertise in AI perfectly matches your product roadmap."
         </p>
        </div>

        <Button className="w-full h-20 bg-white text-stone-950 hover:bg-stone-100 rounded-3xl font-medium uppercase tracking-wider text-xs shadow-2xl transition-all hover:-translate-y-1">
         Initialize Link
        </Button>
       </div>
      </section>
     )}

     {/* Profile Completion - Technical Dashboard */}
     {isOwnProfile && (
      <section className="bg-white border border-stone-100 rounded-[4rem] p-16 space-y-20 shadow-sm relative overflow-hidden">
       <div className="flex items-center gap-6 mb-12">
        <div className="w-14 h-11 rounded-2xl bg-stone-950 flex items-center justify-center text-white shadow-xl">
         <TrendingUp className="w-7 h-7" />
        </div>
        <div className="space-y-1">
         <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400">Node Optimization</h3>
         <p className="text-lg font-medium text-stone-950">Profile <span className="text-stone-300 italic serif">Strength</span></p>
        </div>
       </div>
       
       <div className="space-y-20">
        <div className="flex items-center justify-between p-10 bg-stone-50 rounded-[3rem] border border-stone-100">
         <div className="space-y-2">
          <span className="text-xl font-medium tracking-tighter text-stone-950 leading-none">{profile.profileCompletionScore}%</span>
          <p className="text-xs text-stone-400 font-medium uppercase tracking-wider">Current Integrity</p>
         </div>
         <div className="w-48 h-5 bg-white rounded-full overflow-hidden p-1 border border-stone-200">
          <motion.div 
           initial={{ width: 0 }}
           animate={{ width: `${profile.profileCompletionScore}%` }}
           transition={{ duration: 2 }}
           className="h-full bg-stone-950 rounded-full"
          ></motion.div>
         </div>
        </div>

        <div className="space-y-6">
         {[
          { label: 'Basic Identity', done: true },
          { label: 'Technical Inventory', done: true },
          { label: 'Values Assessment', done: false },
          { label: 'Artifact Portfolio', done: false }
         ].map((item) => (
          <div key={item.label} className={cn(
           "flex items-center justify-between p-6 rounded-3xl border transition-all",
           item.done ? "bg-emerald-50/50 border-emerald-100 text-emerald-700" : "bg-stone-50/50 border-stone-100 text-stone-400"
          )}>
           <div className="flex items-center gap-6">
            <div className={cn(
             "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all",
             item.done ? "bg-white border-emerald-200" : "bg-white border-stone-200"
            )}>
             {item.done ? <CheckCircle2 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            </div>
            <span className="text-base font-medium uppercase tracking-widest">{item.label}</span>
           </div>
           {!item.done && (
            <Button variant="ghost" size="sm" className="text-xs font-medium uppercase tracking-widest hover:bg-stone-950 hover:text-white transition-all">
             Add
            </Button>
           )}
          </div>
         ))}
        </div>
        
        <Button variant="outline" className="w-full h-18 rounded-3xl border-stone-200 hover:border-stone-950 hover:bg-stone-50 transition-all font-medium text-xs uppercase tracking-wider">
         Optimize Node Score
        </Button>
       </div>
      </section>
     )}

     {/* Social Links - Premium Cards */}
     <section className="bg-white border border-stone-100 rounded-[4rem] p-16 space-y-16 shadow-sm">
      <div className="flex items-center gap-6 mb-12">
       <div className="w-14 h-11 rounded-2xl bg-stone-950 flex items-center justify-center text-white shadow-xl">
        <Globe className="w-7 h-7" />
       </div>
       <div className="space-y-1">
        <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400">Digital Presence</h3>
        <p className="text-lg font-medium text-stone-950">External <span className="text-stone-300 italic serif">Nodes</span></p>
       </div>
      </div>

      <div className="space-y-6">
       {[
        { label: 'LinkedIn', icon: Linkedin, url: profile.profile.linkedinUrl, color: 'hover:border-blue-500' },
        { label: 'GitHub', icon: Github, url: profile.profile.githubUrl, color: 'hover:border-stone-950' }
       ].map((social) => (
        <motion.a 
         key={social.label}
         whileHover={{ x: 10 }}
         href={social.url} 
         className={cn(
          "flex items-center justify-between p-10 bg-stone-50/30 rounded-[3rem] hover:bg-white transition-all border border-stone-100 group shadow-sm hover:shadow-2xl hover:shadow-stone-200/50",
          social.color
         )}
        >
         <div className="flex items-center gap-10">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-stone-100 group-hover:bg-stone-950 group-hover:text-white transition-all">
           <social.icon className="w-8 h-8" />
          </div>
          <div className="space-y-1">
           <span className="text-xs font-medium text-stone-950 uppercase tracking-wider">{social.label}</span>
           <p className="text-xs text-stone-400 font-mono">Connect.v1</p>
          </div>
         </div>
         <div className="w-12 h-12 rounded-2xl bg-white border border-stone-100 flex items-center justify-center group-hover:bg-stone-950 group-hover:text-white transition-all">
          <ExternalLink className="w-5 h-5" />
         </div>
        </motion.a>
       ))}
      </div>
     </section>

     {/* Trust Signals - Hardware Badges */}
     <section className="bg-white border border-stone-100 rounded-[4rem] p-16 space-y-16 shadow-sm relative overflow-hidden">
      <div className="flex items-center gap-6 mb-12">
       <div className="w-14 h-11 rounded-2xl bg-stone-950 flex items-center justify-center text-white shadow-xl">
        <ShieldCheck className="w-7 h-7" />
       </div>
       <div className="space-y-1">
        <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400">Verification</h3>
        <p className="text-lg font-medium text-stone-950">Trust <span className="text-stone-300 italic serif">Signals</span></p>
       </div>
      </div>

      <div className="grid grid-cols-1 gap-10">
       {[
        { label: 'Identity Verified', sub: 'LinkedIn Auth Protocol', icon: ShieldCheck, status: 'Active' },
        { label: 'Education Verified', sub: 'Stanford University Archive', icon: GraduationCap, status: 'Verified' }
       ].map((signal) => (
        <div key={signal.label} className="flex items-center justify-between p-10 bg-stone-50/50 rounded-[3rem] border border-stone-100 group hover:bg-white hover:border-stone-950 transition-all duration-500">
         <div className="flex items-center gap-10">
          <div className="w-20 h-20 bg-white text-stone-400 rounded-[2rem] flex items-center justify-center border border-stone-100 transition-all group-hover:bg-stone-950 group-hover:text-white group-hover:border-stone-950 shadow-sm">
           <signal.icon className="w-10 h-10" />
          </div>
          <div className="space-y-2">
           <p className="text-lg font-medium text-stone-950 tracking-tight">{signal.label}</p>
           <p className="text-xs text-stone-400 font-medium uppercase tracking-wider">{signal.sub}</p>
          </div>
         </div>
         <div className="flex items-center gap-4 px-6 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-xs font-medium uppercase tracking-wider">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          {signal.status}
         </div>
        </div>
       ))}
      </div>
     </section>
    </div>
   </div>
  </motion.div>
   <AnimatePresence>
    {endorsementModalOpen && (
     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div 
       initial={{ opacity: 0 }} 
       animate={{ opacity: 1 }} 
       exit={{ opacity: 0 }}
       onClick={() => setEndorsementModalOpen(false)}
       className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm"
      />
      <motion.div
       initial={{ opacity: 0, scale: 0.95, y: 20 }}
       animate={{ opacity: 1, scale: 1, y: 0 }}
       exit={{ opacity: 0, scale: 0.95, y: 20 }}
       className="relative w-full max-w-lg bg-white rounded-[3rem] p-8 sm:p-12 shadow-2xl border border-stone-100 z-[60]"
      >
       <button 
        onClick={() => setEndorsementModalOpen(false)}
        className="absolute top-8 right-8 w-10 h-10 bg-stone-50 hover:bg-stone-100 rounded-full flex items-center justify-center transition-colors text-stone-500 hover:text-stone-900"
       >
        <XCircle className="w-6 h-6" />
       </button>
       
       <div className="mb-8">
        <h3 className="text-2xl font-medium text-stone-900 tracking-tight">Endorse {profile.fullName.split(' ')[0]}</h3>
        <p className="text-stone-500 mt-2 text-sm">Select a skill and leave a quick comment to show your support.</p>
       </div>
       
       <div className="space-y-6">
        <div>
         <label className="block text-sm font-medium text-stone-950 uppercase tracking-widest mb-3">Select Skill</label>
         <select 
          value={selectedSkillToEndorse}
          onChange={(e) => setSelectedSkillToEndorse(e.target.value)}
          className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl outline-none focus:border-stone-400 focus:bg-white transition-all appearance-none text-stone-900"
         >
          <option value="" disabled>Choose a skill...</option>
          {localSkills.map((skill: any) => (
           <option key={skill.id} value={skill.id}>{skill.name}</option>
          ))}
         </select>
        </div>
        
        <div>
         <label className="block text-sm font-medium text-stone-950 uppercase tracking-widest mb-3">Add a Comment</label>
         <textarea 
          rows={3}
          value={endorsementComment}
          onChange={(e) => setEndorsementComment(e.target.value)}
          placeholder="e.g. They are fantastic to work with..."
          className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl outline-none focus:border-stone-400 focus:bg-white transition-all text-stone-900 resize-none"
         ></textarea>
        </div>
        
        <Button 
         onClick={handleEndorseSubmit} 
         disabled={!selectedSkillToEndorse || !endorsementComment.trim()}
         className="w-full h-16 rounded-2xl bg-stone-950 hover:bg-stone-900 text-white font-medium uppercase tracking-widest text-sm transition-all"
        >
         Submit Endorsement
        </Button>
       </div>
      </motion.div>
     </div>
    )}
   </AnimatePresence>
  </PageContainer>
 );
}
