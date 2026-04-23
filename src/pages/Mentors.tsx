import { useState, useMemo } from "react";
import { 
 Search, 
 Filter, 
 Star, 
 Globe, 
 Briefcase, 
 Clock, 
 CheckCircle2, 
 ChevronRight, 
 MessageSquare, 
 Calendar as CalendarIcon, 
 ArrowRight, 
 Sparkles, 
 ShieldCheck, 
 Trophy, 
 Activity, 
 Users, 
 Target, 
 Zap, 
 X, 
 Check, 
 Plus, 
 MoreVertical, 
 Layout, 
 MapPin, 
 SlidersHorizontal, 
 Grid, 
 List as ListIcon, 
 Award, 
 BookOpen, 
 Heart, 
 Share2, 
 Bookmark, 
 ExternalLink, 
 ChevronDown, 
 Info, 
 Send
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageContainer from "../components/layout/PageContainer";
import { User } from "../types";
import { cn } from "../lib/utils";

interface MentorsProps {
 user: User;
}

interface Mentor {
 id: string;
 name: string;
 role: string;
 company: string;
 photo: string;
 rating: number;
 reviews: number;
 expertise: string[];
 bio: string;
 location: string;
 availability: string;
 isVerified: boolean;
 achievements: string[];
}

const MOCK_MENTORS: Mentor[] = [
 {
  id: "m1",
  name: "Dr. Elena Vance",
  role: "Former VP of Engineering",
  company: "Stripe",
  photo: "https://picsum.photos/seed/elena/400/400",
  rating: 4.9,
  reviews: 124,
  expertise: ["Scaling", "Infrastructure", "Leadership"],
  bio: "Helping technical founders scale their engineering organizations from seed to Series C.",
  location: "San Francisco, CA",
  availability: "2 slots left",
  isVerified: true,
  achievements: ["Scaled Stripe Eng from 50 to 500+", "Ex-Google Staff Engineer"]
 },
 {
  id: "m2",
  name: "Marcus Thorne",
  role: "Managing Partner",
  company: "Thorne Ventures",
  photo: "https://picsum.photos/seed/marcus/400/400",
  rating: 4.8,
  reviews: 89,
  expertise: ["Fundraising", "GTM Strategy", "Fintech"],
  bio: "Serial entrepreneur turned investor. I focus on helping founders navigate the fundraising landscape.",
  location: "London, UK",
  availability: "Available next week",
  isVerified: true,
  achievements: ["3x Successful Exits", "Invested in 40+ Startups"]
 },
 {
  id: "m3",
  name: "Sarah Jenkins",
  role: "Head of Product",
  company: "Airbnb",
  photo: "https://picsum.photos/seed/sarah/400/400",
  rating: 5.0,
  reviews: 56,
  expertise: ["Product Design", "Growth", "Marketplace"],
  bio: "Passionate about building products people love. Expert in marketplace dynamics and user growth.",
  location: "Remote",
  availability: "1 slot left",
  isVerified: true,
  achievements: ["Led Airbnb Experiences Launch", "Product Hunt Mentor of the Year"]
 }
];

export default function Mentors({ user }: MentorsProps) {
 const [searchQuery, setSearchQuery] = useState("");
 const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
 const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
 const [requestFocus, setRequestFocus] = useState("");
 const [requestAvailability, setRequestAvailability] = useState("");

 const filteredMentors = MOCK_MENTORS.filter(m => 
  m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  m.expertise.some(e => e.toLowerCase().includes(searchQuery.toLowerCase()))
 );

 const handleRequestMentorship = (mentor: Mentor) => {
  setSelectedMentor(mentor);
  setIsRequestModalOpen(true);
 };

 const submitRequest = () => {
  // Mock submission
  console.log("Requesting mentorship from", selectedMentor?.name, { focus: requestFocus, availability: requestAvailability });
  setIsRequestModalOpen(false);
  // In a real app, show a toast success message
 };

 return (
  <PageContainer className="space-y-10 pb-20">
   {/* Mentors Header */}
   <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
    <div className="space-y-3">
     <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="inline-flex items-center gap-2 text-micro"
     >
      <Award className="w-3 h-3" />
      Elite Mentor Network
     </motion.div>
     <h2 className="text-2xl font-medium tracking-tight">
      Learn from the <span className="text-stone-400 font-light italic font-serif">Best</span>.
     </h2>
    </div>

    <div className="flex items-center gap-3">
     <div className="relative group w-full md:w-80">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
      <input 
       type="text" 
       placeholder="Search by name or expertise..." 
       value={searchQuery}
       onChange={(e) => setSearchQuery(e.target.value)}
       className="w-full bg-white border border-stone-100 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 transition-all shadow-sm"
      />
     </div>
     <Button variant="outline" size="icon" className="w-12 h-10 rounded-2xl border-stone-100 bg-white shadow-sm">
      <SlidersHorizontal className="w-5 h-5" />
     </Button>
    </div>
   </header>

   {/* Expertise Quick Filters */}
   <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-1">
    {["All Expertise", "Scaling", "Fundraising", "Product Strategy", "Technical Architecture", "GTM", "Leadership"].map((exp) => (
     <button
      key={exp}
      className="px-6 py-2.5 rounded-full text-xs font-medium uppercase tracking-widest border border-stone-100 bg-white hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-all whitespace-nowrap"
     >
      {exp}
     </button>
    ))}
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
    {/* Main Mentor List */}
    <div className="lg:col-span-8 space-y-8">
     {filteredMentors.map((mentor, i) => (
      <motion.div 
       key={mentor.id}
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ delay: i * 0.1 }}
       className="card-minimal p-8 flex flex-col md:flex-row gap-8 group hover:bg-stone-50/50 transition-all"
      >
       <div className="w-full md:w-40 h-40 rounded-3xl overflow-hidden border border-stone-100 shrink-0 shadow-xl shadow-stone-900/5">
        <img src={mentor.photo} alt="" className="w-full h-full object-cover" />
       </div>
       <div className="flex-1 space-y-6">
        <div className="flex items-start justify-between">
         <div className="space-y-1">
          <div className="flex items-center gap-2">
           <h4 className="text-xl font-medium text-stone-900">{mentor.name}</h4>
           {mentor.isVerified && <ShieldCheck className="w-4 h-4 text-stone-900" />}
          </div>
          <p className="text-sm text-stone-500 font-medium">{mentor.role} @ {mentor.company}</p>
         </div>
         <div className="flex items-center gap-1.5 bg-stone-50 px-2 py-1 rounded-lg border border-stone-100">
          <Star className="w-3.5 h-3.5 text-stone-900 fill-stone-900" />
          <span className="text-xs font-medium text-stone-900">{mentor.rating}</span>
          <span className="text-xs text-stone-400 font-medium uppercase tracking-widest">({mentor.reviews})</span>
         </div>
        </div>

        <p className="text-sm text-stone-600 leading-relaxed">{mentor.bio}</p>

        <div className="flex flex-wrap gap-2">
         {mentor.expertise.map(exp => (
          <span key={exp} className="text-xs font-medium text-stone-500 uppercase tracking-widest bg-white border border-stone-100 px-3 py-1 rounded-full">
           {exp}
          </span>
         ))}
        </div>

        <div className="flex items-center justify-between pt-2">
         <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs text-stone-400 font-medium uppercase tracking-widest">
           <MapPin className="w-3.5 h-3.5" /> {mentor.location}
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400 font-medium uppercase tracking-widest">
           <Clock className="w-3.5 h-3.5" /> {mentor.availability}
          </div>
         </div>
         <Button 
          onClick={() => handleRequestMentorship(mentor)}
          className="rounded-xl px-8 h-11 bg-stone-900 text-white font-medium text-xs hover:scale-[1.02] transition-transform"
         >
          Request Mentorship
         </Button>
        </div>
       </div>
      </motion.div>
     ))}
    </div>

    {/* Right Column - Stats & AI */}
    <div className="lg:col-span-4 space-y-10">
     {/* Mentorship Stats */}
     <section className="card-minimal p-8 space-y-8">
      <h3 className="text-sm font-medium uppercase tracking-widest text-stone-400">Your Mentorship</h3>
      <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div className="space-y-1">
         <p className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900">4</p>
         <p className="text-xs text-stone-400 font-medium uppercase tracking-widest">Active Mentors</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-stone-50 flex items-center justify-center text-stone-900">
         <Users className="w-6 h-6" />
        </div>
       </div>
       <div className="flex items-center justify-between">
        <div className="space-y-1">
         <p className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900">12h</p>
         <p className="text-xs text-stone-400 font-medium uppercase tracking-widest">Sessions Completed</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-stone-50 flex items-center justify-center text-stone-900">
         <Clock className="w-6 h-6" />
        </div>
       </div>
      </div>
      <Button variant="outline" className="w-full h-11 rounded-xl text-xs font-medium uppercase tracking-widest border-stone-100">
       View Session History
      </Button>
     </section>

     {/* AI Matching Insight */}
     <section className="rounded-3xl bg-stone-900 p-8 text-center space-y-6 shadow-xl shadow-stone-900/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 blur-2xl" />
      <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
       <Sparkles className="w-8 h-8 text-white" />
      </div>
      <div className="space-y-2">
       <h4 className="text-xl font-medium text-white">AI Mentor Match</h4>
       <p className="text-xs text-stone-400 leading-relaxed">
        Based on your current "Venture Readiness" score, we recommend connecting with **Dr. Elena Vance** to scale your engineering team.
       </p>
      </div>
      <Button className="w-full rounded-xl h-11 bg-white text-stone-900 font-medium text-xs hover:bg-stone-100 transition-all">
       View Recommendation
      </Button>
     </section>
    </div>
   </div>

   {/* Request Mentorship Modal */}
   <AnimatePresence>
    {isRequestModalOpen && selectedMentor && (
     <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       exit={{ opacity: 0 }}
       onClick={() => setIsRequestModalOpen(false)}
       className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
      />
      <motion.div 
       initial={{ opacity: 0, scale: 0.95, y: 20 }}
       animate={{ opacity: 1, scale: 1, y: 0 }}
       exit={{ opacity: 0, scale: 0.95, y: 20 }}
       className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
       <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-stone-100">
           <img src={selectedMentor.photo} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
           <h3 className="text-lg font-medium text-stone-900">Request Mentorship</h3>
           <p className="text-xs text-stone-400 font-medium">with {selectedMentor.name}</p>
          </div>
         </div>
         <Button variant="ghost" size="icon" onClick={() => setIsRequestModalOpen(false)} className="text-stone-400">
          <X className="w-5 h-5" />
         </Button>
        </div>

        <div className="space-y-6">
         <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-widest text-stone-400">Focus Areas</label>
          <textarea 
           placeholder="What specific challenges would you like to discuss?"
           value={requestFocus}
           onChange={(e) => setRequestFocus(e.target.value)}
           className="w-full bg-stone-50 border border-stone-100 rounded-2xl p-4 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-stone-900/5 transition-all"
          />
         </div>
         <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-widest text-stone-400">Your Availability</label>
          <input 
           type="text" 
           placeholder="e.g., Tuesday afternoons, Friday mornings"
           value={requestAvailability}
           onChange={(e) => setRequestAvailability(e.target.value)}
           className="w-full bg-stone-50 border border-stone-100 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 transition-all"
          />
         </div>
        </div>

        <div className="flex items-center gap-4 pt-4">
         <Button 
          onClick={submitRequest}
          className="flex-1 rounded-2xl h-10 bg-stone-900 text-white font-medium text-sm hover:scale-[1.02] transition-transform"
         >
          Send Request
         </Button>
         <Button 
          variant="ghost" 
          onClick={() => setIsRequestModalOpen(false)}
          className="flex-1 rounded-2xl h-12 text-stone-900 font-medium text-sm hover:bg-stone-50"
         >
          Cancel
         </Button>
        </div>

        <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
         <Info className="w-4 h-4 text-stone-400 shrink-0" />
         <p className="text-xs text-stone-500 leading-relaxed font-medium">
          Mentors typically respond within 48 hours. Your profile and "Venture Readiness" score will be shared with the mentor.
         </p>
        </div>
       </div>
      </motion.div>
     </div>
    )}
   </AnimatePresence>
  </PageContainer>
 );
}
