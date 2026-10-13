import React, { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { addSession, listKeys, readIds, toggleId } from '../lib/localLists';

import { 

 Star, 

 MessageSquare, 

 Calendar, 

 Search, 

 Filter, 

 Zap, 

 CheckCircle2, 

 ArrowRight,

 ShieldCheck,

 Globe,

 Plus,

 Bookmark,

 X,

 Briefcase

} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';

import { cn } from '../lib/utils';

import PageShell from '../components/ui/PageShell';



const MENTORS = [

 {

  id: '1',

  name: 'David Hoffman',

  role: 'Ex-VP Product @ Uber',

  company: 'Uber',

  expertise: ['Product', 'Growth', 'Marketplace'],

  rating: 4.9,

  reviews: 124,

  availability: 'Immediate',

  avatar: 'https://picsum.photos/seed/david/200/200',

  verified: true,

  detailedBio: 'David brings 15 years of experience in product management, having led the core marketplace teams at Uber during their hyper-growth phase. He specializes in network effects, scaling operations, and building high-performing product orgs.',

  achievements: ['Scaled Uber marketplace to 50+ cities', 'Angel investor in 12 startups', 'Ex-YCombinator Founder']

 },

 {

  id: '2',

  name: 'Elena Rossi',

  role: 'Venture Partner @ Sequoia',

  company: 'Sequoia',

  expertise: ['Fundraising', 'Pitching', 'Strategy'],

  rating: 5.0,

  reviews: 89,

  availability: 'Flexible',

  avatar: 'https://picsum.photos/seed/elena/200/200',

  verified: true,

  detailedBio: 'Elena is a seasoned venture capitalist with a track record of identifying and supporting unicorn startups across Europe and the US. She focuses on early-stage enterprise SaaS and fintech platforms.',

  achievements: ['Led Series A for 3 unicorn startups', 'Board member at 5 tech companies', 'Former CEO of Fintech Startup']

 },

 {

  id: '3',

  name: 'Samir Patel',

  role: 'CTO @ Fintech Unicorn',

  company: 'Fintech Unicorn',

  expertise: ['Engineering', 'Security', 'Team Building'],

  rating: 4.8,

  reviews: 56,

  availability: '1 month notice',

  avatar: 'https://picsum.photos/seed/samir/200/200',

  verified: true,

  detailedBio: 'Samir has scaled engineering teams from 10 to 500+ engineers. He specializes in transforming monolithic architectures into highly available and secure microservices.',

  achievements: ['Scaled engineering from 10 to 500+', 'Architected highly available payment systems', 'Authored "Scaling Fintech"']

 },

 {

  id: '4',

  name: 'Jessica Wu',

  role: 'Growth Lead @ Airbnb',

  company: 'Airbnb',

  expertise: ['Marketing', 'Retention', 'Virality'],

  rating: 4.9,

  reviews: 210,

  availability: 'Flexible',

  avatar: 'https://picsum.photos/seed/jessica/200/200',

  verified: true,

  detailedBio: 'Jessica is an expert in user acquisition and lifecycle marketing. At Airbnb, she pioneered viral growth loops that resulted in massive exponential adoption.',

  achievements: ['Increased retention by 40% in Q3', 'Pioneered new viral loop strategies', 'Speaker at GrowthHackers Conf']

 }

];



export default function MentorsPage() {

 const [searchQuery, setSearchQuery] = useState('');

 const [availabilityFilter, setAvailabilityFilter] = useState('All');

 const [expertiseFilter, setExpertiseFilter] = useState('All');

 const [selectedMentor, setSelectedMentor] = useState<any>(null);

 const [isMentorshipModalOpen, setIsMentorshipModalOpen] = useState(false);

 const [focusAreas, setFocusAreas] = useState('');

 const [yourAvailability, setYourAvailability] = useState('');

 const [requestError, setRequestError] = useState('');

 const [savedMentors, setSavedMentors] = useState(() => new Set(readIds(listKeys.mentors)));

 const navigate = useNavigate();



 const availableFilters = ['All', 'Immediate', 'Flexible', '1 month notice'];

 const expertiseFilters = ['All', 'Product', 'Growth', 'Fundraising', 'Engineering', 'Marketing'];



 const filteredMentors = MENTORS.filter(mentor => {

  const matchesSearch = mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) || 

             mentor.expertise.some(e => e.toLowerCase().includes(searchQuery.toLowerCase())) ||

             mentor.role.toLowerCase().includes(searchQuery.toLowerCase()) ||

             mentor.company.toLowerCase().includes(searchQuery.toLowerCase());

  

  const matchesAvailability = availabilityFilter === 'All' || mentor.availability === availabilityFilter;

  const matchesExpertise = expertiseFilter === 'All' || mentor.expertise.includes(expertiseFilter);



  return matchesSearch && matchesAvailability && matchesExpertise;

 });



 return (

  <PageShell title="Mentors" description="Connect with world-class mentors who have built and scaled successful startups.">

  <div className="space-y-6">

   {/* Hero Section */}

   <div className="bg-stone-900 rounded-xl p-6 sm:p-8 relative overflow-hidden">

    <div className="relative z-10 max-w-2xl space-y-6">

     <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-full backdrop-blur-md text-sm font-medium tracking-wide">

      <Zap className="w-4 h-4 text-amber-400" />

      Expert Guidance

     </div>

     <h2 className="text-lg font-semibold text-white tracking-tight leading-tight">

      Learn from the <span className="text-stone-400">Best in the World.</span>

     </h2>

     <p className="text-sm text-stone-400 leading-relaxed">

      Connect with world-class mentors who have built, scaled, and exited successful startups.

     </p>

     <div className="flex flex-col sm:flex-row gap-4 pt-4 relative z-20">

      <div className="flex-1 relative group">

       <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-stone-500 group-focus-within:text-white transition-colors" />

       <input 

        type="text"

        placeholder="Search by expertise, company, or name..."

        value={searchQuery}

        onChange={(e) => setSearchQuery(e.target.value)}

        className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3.5 bg-white/10 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-stone-400 outline-none focus:ring-2 focus:ring-white/20 transition-all font-semibold backdrop-blur-sm shadow-sm"

       />

      </div>

      <button 

       onClick={() => document.getElementById('mentor-grid')?.scrollIntoView({ behavior: 'smooth' })}

       className="px-4 sm:px-6 py-2 sm:py-2.5 bg-white text-stone-900 rounded-xl text-xs sm:text-sm font-semibold hover:bg-stone-50 transition-all shadow-md whitespace-nowrap "

      >

       Find Mentor

      </button>

     </div>

     <div className="flex flex-wrap gap-y-3 gap-x-6 pt-2 relative z-20">

      <div className="space-y-2 flex-1">

       <span className="text-xs font-semibold text-stone-400 tracking-wide block">Expertise</span>

       <div className="flex flex-wrap gap-2">

        {expertiseFilters.map(filter => (

         <button

          key={filter}

          onClick={() => setExpertiseFilter(filter)}

          className={cn(

           "px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all",

           expertiseFilter === filter 

            ? "bg-amber-400 text-stone-900" 

            : "bg-white/10 text-stone-300 hover:bg-white/20 hover:text-white"

          )}

         >

          {filter}

         </button>

        ))}

       </div>

      </div>

      

      <div className="space-y-2">

       <span className="text-xs font-semibold text-stone-400 tracking-wide block">Availability</span>

       <div className="flex flex-wrap gap-2">

        {availableFilters.map(filter => (

         <button

          key={filter}

          onClick={() => setAvailabilityFilter(filter)}

          className={cn(

           "px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all",

           availabilityFilter === filter 

            ? "bg-amber-400 text-stone-900" 

            : "bg-white/10 text-stone-300 hover:bg-white/20 hover:text-white"

          )}

         >

          {filter === 'All' ? 'Any Time' : filter}

         </button>

        ))}

       </div>

      </div>

     </div>

    </div>

   </div>



   {/* Stats Bar */}

   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-5 border-y border-stone-100">

    {[

     { label: 'Verified Mentors', value: '500+' },

     { label: 'Sessions Completed', value: '12k+' },

     { label: 'Avg. Rating', value: '4.9/5' },

     { label: 'Success Rate', value: '94%' },

    ].map((stat) => (

     <div key={stat.label} className="text-center space-y-1">

      <div className="text-lg font-semibold text-stone-900">{stat.value}</div>

      <div className="text-[10px] font-medium text-stone-400 tracking-wider">{stat.label}</div>

     </div>

    ))}

   </div>



   {/* Mentor Grid */}

   <div id="mentor-grid" className="space-y-4">

    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">

     <p className="text-xs font-semibold text-stone-400 tracking-wider">Top Rated Mentors</p>

     <div className="flex items-center gap-4">

      <button className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors group">

       View All Mentors

       <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />

      </button>

     </div>

    </div>



    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

     {filteredMentors.map((mentor, idx) => (

      <motion.div 

       key={mentor.id}

       initial={{ opacity: 0, y: 20 }}

       animate={{ opacity: 1, y: 0 }}

       transition={{ delay: idx * 0.1 }}

       onClick={() => setSelectedMentor(mentor)}

       className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm hover:shadow-md  transition-all group cursor-pointer flex flex-col"

      >

       {/* Photo */}

       <div className="relative">

        <img 

         src={mentor.avatar} 

         alt={mentor.name} 

         className="w-full h-44 object-cover"

         referrerPolicy="no-referrer"

        />

        {mentor.verified && (

         <div className="absolute bottom-2 right-2 bg-blue-500 text-white p-1 rounded-md border-2 border-white shadow">

          <ShieldCheck className="w-3 h-3" />

         </div>

        )}

       </div>



       {/* Body */}

       <div className="p-4 flex flex-col flex-1">

        <div className="mb-3">

         <h3 className="text-sm font-semibold text-stone-900 leading-snug">{mentor.name}</h3>

         <p className="text-xs text-stone-400 mt-0.5">{mentor.role}</p>

        </div>



        <div className="flex flex-wrap gap-1 mb-3">

         {mentor.expertise.slice(0, 3).map(skill => (

          <span key={skill} className="px-2 py-0.5 bg-stone-50 text-stone-600 rounded text-[10px] font-medium border border-stone-100">

           {skill}

          </span>

         ))}

        </div>



        <div className="flex items-center justify-between mb-3">

         <div className="flex items-center gap-1">

          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />

          <span className="text-xs font-semibold text-stone-900">{mentor.rating}</span>

          <span className="text-[10px] text-stone-400">({mentor.reviews})</span>

         </div>

         <div className="flex items-center gap-1 text-[10px] font-semibold text-stone-400 tracking-wider">

          <CheckCircle2 className="w-3 h-3 text-green-500" />

          {mentor.availability}

         </div>

        </div>



        <div className="mt-auto flex gap-2">

         <button 

          onClick={(e) => { e.stopPropagation(); navigate('/messages'); }}

          className="flex-1 min-h-11 py-2 bg-stone-900 text-white rounded-lg text-sm font-semibold hover:bg-stone-800 transition-all flex items-center justify-center gap-1.5"

         >

          <MessageSquare className="w-3.5 h-3.5" /> Message

         </button>

         <button 

          aria-label={savedMentors.has(mentor.id) ? "Remove saved mentor" : "Save mentor"}
          onClick={(e) => { e.stopPropagation(); setSavedMentors(new Set(toggleId(listKeys.mentors, mentor.id))); }}

          className="min-h-11 min-w-11 inline-flex items-center justify-center bg-stone-50 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-all border border-stone-100"

         >

          <Bookmark className={savedMentors.has(mentor.id) ? 'w-3.5 h-3.5 fill-current text-stone-900' : 'w-3.5 h-3.5'} />

         </button>

        </div>

       </div>

      </motion.div>

     ))}

    </div>

   </div>



  {/* Become a Mentor CTA */}

  <div className="bg-stone-50 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border border-stone-100">

   <div className="max-w-xl space-y-3">

    <h2 className="text-sm font-semibold text-stone-900 leading-snug">Share your experience. Become a Mentor.</h2>

    <p className="text-xs text-stone-500 leading-relaxed">

     Help the next generation of founders succeed. Join our elite network of mentors and give back to the startup community.

    </p>

    <div className="flex flex-wrap gap-3 mt-1">

     <button 

      onClick={() => navigate('/profile')}

      className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 transition-all"

     >

      Apply to Mentor

     </button>

     <button className="px-4 py-2 bg-white text-stone-900 rounded-lg text-xs font-semibold hover:bg-stone-50 transition-all border border-stone-200">

      Learn More

     </button>

    </div>

   </div>

   <div className="grid grid-cols-2 gap-3">

    {[1, 2, 3, 4].map(i => (

     <img 

      key={i}

      src={`https://picsum.photos/seed/mentor-cta-${i}/150/150`} 

      alt="Mentor" 

      className={cn(

       "w-20 h-20 rounded-2xl object-cover shadow border-2 border-white",

       i % 2 === 0 ? "translate-y-3" : ""

      )}

      referrerPolicy="no-referrer"

     />

    ))}

   </div>

  </div>



  {/* Detail Side Panel */}

  <AnimatePresence>

   {selectedMentor && (

    <>

     <motion.div 

      initial={{ opacity: 0 }}

      animate={{ opacity: 1 }}

      exit={{ opacity: 0 }}

      className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40"

      onClick={() => setSelectedMentor(null)}

     />

     <motion.div 

      initial={{ x: '100%' }}

      animate={{ x: 0 }}

      exit={{ x: '100%' }}

      transition={{ type: "spring", damping: 25, stiffness: 200 }}

      className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-sm z-50 overflow-y-auto"

     >

      <div className="p-6 md:p-8 space-y-8">

       {/* Close Button */}

       <button 

        onClick={() => setSelectedMentor(null)}

        className="absolute top-6 right-6 p-2 text-stone-400 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 rounded-full transition-colors"

       >

        <X className="w-5 h-5" />

       </button>



       {/* Profile Header */}

       <div className="text-center space-y-4 pt-8">

        <img 

         src={selectedMentor.avatar} 

         alt={selectedMentor.name}

         className="w-32 h-32 mx-auto rounded-3xl object-cover shadow-xl border-4 border-white"

        />

        <div>

         <h2 className="text-lg font-semibold text-stone-900 tracking-tight inline-flex items-center gap-2">

          {selectedMentor.name}

          {selectedMentor.verified && <ShieldCheck className="w-5 h-5 text-blue-500" />}

         </h2>

         <p className="text-stone-500 font-medium">{selectedMentor.role}</p>

        </div>

        

        <div className="flex items-center justify-center gap-4 text-sm font-medium">

         <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">

          <Star className="w-4 h-4 fill-amber-500 text-amber-500" />

          {selectedMentor.rating} ({selectedMentor.reviews})

         </div>

         <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">

          <CheckCircle2 className="w-4 h-4" />

          {selectedMentor.availability}

         </div>

        </div>

       </div>



       {/* Expertise */}

       <div className="space-y-3">

        <h3 className="text-sm font-semibold text-stone-400 tracking-wide">Expertise</h3>

        <div className="flex flex-wrap gap-2">

         {selectedMentor.expertise.map((skill: string) => (

          <span key={skill} className="px-3 py-1.5 bg-stone-100 text-stone-700 rounded-xl text-sm font-medium border border-stone-200">

           {skill}

          </span>

         ))}

        </div>

       </div>



       {/* Bio */}

       <div className="space-y-3">

        <h3 className="text-sm font-semibold text-stone-400 tracking-wide">About</h3>

        <p className="text-stone-600 leading-relaxed">

         {selectedMentor.detailedBio || "No detailed bio available."}

        </p>

       </div>



       {/* Achievements */}

       {selectedMentor.achievements && selectedMentor.achievements.length > 0 && (

        <div className="space-y-3">

         <h3 className="text-sm font-semibold text-stone-400 tracking-wide">Achievements</h3>

         <ul className="space-y-3">

          {selectedMentor.achievements.map((achievement: string, idx: number) => (

           <li key={idx} className="flex items-start gap-3">

            <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">

             <Star className="w-3.5 h-3.5 text-amber-500" />

            </div>

            <span className="text-stone-700 font-medium text-sm leading-tight leading-relaxed">{achievement}</span>

           </li>

          ))}

         </ul>

        </div>

       )}



       {/* Action Button */}

       <div className="pt-4 pb-12">

        <button 

         onClick={() => setIsMentorshipModalOpen(true)}

         className="w-full py-2 sm:py-2.5 bg-stone-900 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-stone-800 transition-all shadow-md text-center"

        >

         Request Mentorship

        </button>

       </div>

      </div>

     </motion.div>

    </>

   )}

  </AnimatePresence>



  {/* Mentorship Request Modal */}

  <AnimatePresence>

   {isMentorshipModalOpen && (

    <>

     <motion.div 

      initial={{ opacity: 0 }}

      animate={{ opacity: 1 }}

      exit={{ opacity: 0 }}

      className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[60]"

      onClick={() => setIsMentorshipModalOpen(false)}

     />

     <motion.div 

      initial={{ opacity: 0, scale: 0.95, y: 20 }}

      animate={{ opacity: 1, scale: 1, y: 0 }}

      exit={{ opacity: 0, scale: 0.95, y: 20 }}

      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-xl shadow-sm z-[70] overflow-hidden"

     >

      <div className="p-8 space-y-6">

       <div className="flex items-start justify-between">

        <div>

         <h2 className="text-lg font-semibold text-stone-900">Request Mentorship</h2>

         <p className="text-stone-500 mt-1">Connect with {selectedMentor?.name}</p>

        </div>

       </div>



       <div className="space-y-5">

        {requestError && (

         <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">

          {requestError}

         </div>

        )}

        <div className="space-y-2">

         <label className="text-sm font-semibold text-stone-900">Focus Areas</label>

         <textarea 

          placeholder="What specific challenges are you facing? Example: Fundraising, PMF, Go-to-Market..."

          value={focusAreas}

          onChange={(e) => {

           setFocusAreas(e.target.value);

           setRequestError('');

          }}

          rows={4}

          className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm transition-all"

         />

        </div>

        

        <div className="space-y-2">

         <label className="text-sm font-semibold text-stone-900">Your Availability</label>

         <input 

          type="text"

          placeholder="e.g. Next week, Mon-Wed after 5pm EST"

          value={yourAvailability}

          onChange={(e) => {

           setYourAvailability(e.target.value);

           setRequestError('');

          }}

          className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm transition-all"

         />

        </div>

       </div>



       <div className="flex items-center gap-3 pt-4">

        <button 

         onClick={() => setIsMentorshipModalOpen(false)}

         className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 bg-stone-100 text-stone-900 font-semibold rounded-xl text-xs sm:text-sm hover:bg-stone-200 transition-all border border-stone-200"

        >

         Cancel

        </button>

        <button 

         onClick={() => {

          if (!focusAreas.trim() || !yourAvailability.trim()) {

           setRequestError('Please fill in all fields before sending the request.');

           return;

          }

          addSession({

           id: String(Date.now()),

           title: `Mentorship · ${selectedMentor?.name || 'Mentor'}`,

           type: 'Mentorship',

           time: yourAvailability.trim(),

           duration: '45m',

           location: 'Messages',

           participants: [selectedMentor?.name || 'Mentor'],

           priority: 'Medium',

          });

          setIsMentorshipModalOpen(false);

          setSelectedMentor(null);

          setFocusAreas('');

          setYourAvailability('');

          setRequestError('');

         }}

         className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 bg-stone-900 text-white font-semibold rounded-xl text-xs sm:text-sm hover:bg-stone-800 transition-all shadow-md"

        >

         Send Request

        </button>

       </div>

      </div>

     </motion.div>

    </>

   )}

  </AnimatePresence>

 </div>

 </PageShell>

 );

}

