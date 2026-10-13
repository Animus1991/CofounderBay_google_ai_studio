import React from "react";

import { NavLink, useNavigate } from "react-router-dom";

import { motion } from "motion/react";

import {

  Zap,

  Users,

  GraduationCap,

  ShieldCheck,

  ArrowRight,

  CheckCircle2,

  Globe,

  TrendingUp,

  MessageSquare,

  Trophy,

} from "lucide-react";

import { useAuth } from "../App";

import { cn } from "../lib/utils";



export default function LandingPage() {

  const { user, isDemoMode, toggleDemoMode } = useAuth();

  const navigate = useNavigate();



  const features = [

    {

      title: "Structured Matching · Αντιστοίχιση",

      description:

        "People with your skills and stage. Άνθρωποι με τις δεξιότητες και το στάδιό σας.",

      icon: Users,

      color: "bg-blue-50 text-blue-600",

    },

    {

      title: "Mentor Ecosystem",

      description:

        "Access a curated network of experienced advisors and industry experts to guide your venture.",

      icon: GraduationCap,

      color: "bg-purple-50 text-purple-600",

    },

    {

      title: "Thematic Communities",

      description:

        "Join industry-specific hubs to discuss trends, share insights, and find collaborators.",

      icon: Zap,

      color: "bg-amber-50 text-amber-600",

    },

    {

      title: "Progress Tracking",

      description:

        "Set milestones and track your startup's development with structured collaboration tools.",

      icon: Trophy,

      color: "bg-emerald-50 text-emerald-600",

    },

  ];



  const stats = [

    { label: "Active Founders", value: "12,000+" },

    { label: "Successful Matches", value: "4,500+" },

    { label: "Verified Mentors", value: "800+" },

    { label: "Startup Hubs", value: "150+" },

  ];



  return (

    <div className="min-h-screen bg-background selection:bg-primary selection:text-primary-foreground">

      {/* Navigation */}

      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-stone-100">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex justify-between h-16 items-center">

            <div className="flex items-center gap-2">

              <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">

                <Zap className="w-5 h-5 text-white" />

              </div>

              <span className="text-lg font-medium text-stone-900 tracking-tight">

                CoFounderBay

              </span>

            </div>



            <div className="hidden md:flex items-center gap-8">

              <a

                href="#features"

                className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"

              >

                Features

              </a>

              <a

                href="#how-it-works"

                className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"

              >

                How it Works

              </a>

              <a

                href="#communities"

                className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"

              >

                Communities

              </a>

              <a

                href="#pricing"

                className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"

              >

                Pricing

              </a>

            </div>



            <div className="flex items-center gap-3 sm:gap-4">

              {isDemoMode ? (

                <div className="flex items-center gap-2 sm:gap-3">

                  <span className="text-[10px] sm:text-xs font-bold text-stone-500 tracking-widest hidden sm:inline-block">

                    Demo View

                  </span>

                  <button

                    onClick={() => toggleDemoMode(false)}

                    className="text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors"

                  >

                    Exit Demo

                  </button>

                  <NavLink

                    to="/dashboard"

                    className="bg-stone-900 text-white px-6 py-2.5 rounded-[2rem] text-sm font-semibold hover:bg-stone-800 transition-all whitespace-nowrap shadow-md"

                  >

                    Go to Dashboard

                  </NavLink>

                </div>

              ) : user ? (

                <div className="flex items-center gap-3 sm:gap-4">

                  <button

                    onClick={() => {

                      toggleDemoMode(true);

                      navigate("/dashboard");

                    }}

                    className="text-[10px] sm:text-xs font-semibold text-stone-400 hover:text-stone-900 flex flex-col sm:flex-row leading-tight items-center justify-center sm:gap-1.5 transition-colors -translate-x-[7px]"

                  >

                    <span className="tracking-widest pl-[0.1em] sm:pl-0">

                      Demo

                    </span>

                    <span>View</span>

                  </button>

                  <NavLink

                    to="/dashboard"

                    className="bg-stone-900 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-[2rem] text-xs sm:text-sm font-semibold hover:bg-stone-800 transition-all whitespace-nowrap shadow-md"

                  >

                    Go to Dashboard

                  </NavLink>

                </div>

              ) : (

                <>

                  <button

                    onClick={() => {

                      toggleDemoMode(true);

                      navigate("/dashboard");

                    }}

                    className="text-[10px] sm:text-xs font-semibold text-stone-400 hover:text-stone-900 flex flex-col sm:flex-row leading-tight items-center justify-center sm:gap-1.5 transition-colors -translate-x-[7px]"

                  >

                    <span className="tracking-widest pl-[0.1em] sm:pl-0">

                      Demo

                    </span>

                    <span>View</span>

                  </button>

                  <NavLink

                    to="/login"

                    className="text-sm font-semibold text-stone-600 hover:text-stone-900 whitespace-nowrap hidden sm:block"

                  >

                    Log in

                  </NavLink>

                  <NavLink

                    to="/signup"

                    className="bg-stone-900 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-[2rem] text-xs sm:text-sm font-semibold hover:bg-stone-800 transition-all whitespace-nowrap shadow-md"

                  >

                    Get Started

                  </NavLink>

                </>

              )}

            </div>

          </div>

        </div>

      </nav>



      {/* Hero Section */}

      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          <div className="text-center max-w-4xl mx-auto">

            <motion.div

              initial={{ opacity: 0, y: 20 }}

              animate={{ opacity: 1, y: 0 }}

              transition={{ duration: 0.5 }}

            >

              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-medium tracking-widest mb-6">

                <TrendingUp className="w-3 h-3" />

                The Future of Team Formation

              </span>

              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-medium text-stone-900 tracking-tight leading-snug mb-8">

                Build your startup team with{" "}

                <span className="text-stone-400 italic">precision.</span>

              </h1>

              <p className="text-sm sm:text-base md:text-lg text-stone-500 leading-relaxed mb-10 max-w-2xl mx-auto">

                CoFounderBay reduces founder risk by connecting you with

                compatible partners, mentors, and resources in a structured

                digital ecosystem.

              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4">

                <NavLink

                  to="/signup"

                  className="w-[60%] sm:w-auto bg-stone-900 text-white px-5 py-3 rounded-full text-sm sm:text-base font-semibold hover:bg-stone-800 transition-all flex items-center justify-center gap-2 group shadow-xl shadow-stone-900/10"

                >

                  Start Building

                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />

                </NavLink>

                <div className="flex items-center gap-2">

                  <button

                    onClick={() => {

                      toggleDemoMode(true);

                      navigate("/dashboard");

                    }}

                    className="-ml-[2px] px-6 py-3.5 rounded-full text-sm sm:text-base font-medium text-stone-500 hover:text-stone-900 transition-all whitespace-nowrap"

                  >

                    Demo View

                  </button>

                  <a

                    href="#features"

                    className="px-6 py-3.5 rounded-full text-sm sm:text-base font-medium text-stone-600 hover:text-stone-900 transition-all whitespace-nowrap"

                  >

                    Explore Features

                  </a>

                </div>

              </div>

            </motion.div>

          </div>

        </div>



        {/* Background Elements */}

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">

          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-stone-100 rounded-full blur-3xl opacity-50" />

          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-stone-50 rounded-full blur-3xl opacity-50" />

        </div>

      </section>



      {/* Stats Section */}

      <section className="py-12 border-y border-stone-100 bg-stone-50/30">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">

            {stats.map((stat, i) => (

              <div

                key={i}

                className="flex flex-col items-center justify-center gap-2"

              >

                <div className="text-lg font-semibold text-stone-900">

                  {stat.value}

                </div>

                <div className="text-[10px] text-stone-500 font-semibold tracking-[0.1em] shrink-0">

                  {stat.label}

                </div>

              </div>

            ))}

          </div>

        </div>

      </section>



      {/* Features Section */}

      <section id="features" className="py-16 md:py-24 lg:py-32">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-3xl mx-auto mb-20">

            <h2 className="text-lg font-medium text-stone-900 tracking-tight mb-4">

              Not just another social network.

            </h2>

            <p className="text-sm sm:text-base lg:text-lg text-stone-500">

              We've replaced random networking with structured discovery and

              explainable matching logic designed for the startup world.

            </p>

          </div>



          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">

            {features.map((feature, i) => (

              <motion.div

                key={i}

                whileHover={{ y: -5 }}

                className="p-8 rounded-3xl bg-white border border-stone-100 shadow-sm hover:shadow-xl hover:border-stone-200 transition-all"

              >

                <div

                  className={cn(

                    "w-12 h-12 rounded-2xl flex items-center justify-center mb-6",

                    feature.color,

                  )}

                >

                  <feature.icon className="w-6 h-6" />

                </div>

                <h3 className="text-base sm:text-lg md:text-xl font-medium text-stone-900 mb-3">

                  {feature.title}

                </h3>

                <p className="text-stone-500 text-xs sm:text-sm leading-relaxed">

                  {feature.description}

                </p>

              </motion.div>

            ))}

          </div>

        </div>

      </section>



      {/* Communities Section */}

      <section id="communities" className="py-16 md:py-24 bg-stone-50">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex flex-col lg:flex-row items-center gap-8 md:gap-16">

            <div className="lg:w-1/2 space-y-8">

              <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-medium text-stone-900 tracking-tight">

                Industry-specific <br />

                <span className="text-stone-400">Startup Hubs.</span>

              </h2>

              <p className="text-sm sm:text-lg lg:text-xl text-stone-500 leading-relaxed">

                Join deep-tech, fintech, or sustainability communities to find

                partners who share your domain expertise and passion.

              </p>

              <div className="flex flex-wrap gap-3">

                {[

                  "#fintech",

                  "#ai-ml",

                  "#saas",

                  "#healthtech",

                  "#web3",

                  "#sustainability",

                ].map((tag) => (

                  <span

                    key={tag}

                    className="px-5 py-2.5 bg-white border-2 border-stone-100 rounded-[1.5rem] text-sm font-medium text-stone-600"

                  >

                    {tag}

                  </span>

                ))}

              </div>

              <NavLink

                to="/communities"

                className="inline-flex items-center gap-2 text-stone-900 font-medium hover:gap-3 transition-all"

              >

                Explore all communities

                <ArrowRight className="w-5 h-5" />

              </NavLink>

            </div>

            <div className="lg:w-1/2 grid grid-cols-2 gap-4">

              <div className="space-y-4">

                <div className="h-48 bg-white rounded-[2rem] border border-stone-100 p-8 shadow-sm flex flex-col justify-between">

                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">

                    <TrendingUp className="w-7 h-7" />

                  </div>

                  <div>

                    <div className="font-semibold text-stone-900 text-sm">

                      Growth Hub

                    </div>

                    <div className="text-xs font-medium text-stone-400 mt-1">

                      1.2k members

                    </div>

                  </div>

                </div>

                <div className="h-64 bg-white rounded-[2rem] border border-stone-100 p-8 shadow-sm flex flex-col justify-between">

                  <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4">

                    <MessageSquare className="w-7 h-7" />

                  </div>

                  <div>

                    <div className="font-semibold text-stone-900 text-sm">

                      Founder Lounge

                    </div>

                    <div className="text-xs font-medium text-stone-400 mt-1">

                      3.4k members

                    </div>

                  </div>

                </div>

              </div>

              <div className="space-y-4 pt-12">

                <div className="h-64 bg-white rounded-[2rem] border border-stone-100 p-8 shadow-sm flex flex-col justify-between">

                  <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4">

                    <Zap className="w-7 h-7" />

                  </div>

                  <div>

                    <div className="font-semibold text-stone-900 text-sm">

                      AI Builders

                    </div>

                    <div className="text-xs font-medium text-stone-400 mt-1">

                      2.1k members

                    </div>

                  </div>

                </div>

                <div className="h-48 bg-white rounded-[2rem] border border-stone-100 p-8 shadow-sm flex flex-col justify-between">

                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">

                    <Globe className="w-7 h-7" />

                  </div>

                  <div>

                    <div className="font-semibold text-stone-900 text-sm">

                      Global Scale

                    </div>

                    <div className="text-xs font-medium text-stone-400 mt-1">

                      850 members

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>



      {/* Trust Section */}

      <section

        id="how-it-works"

        className="py-16 md:py-24 bg-stone-900 text-white overflow-hidden relative"

      >

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          <div className="grid lg:grid-cols-2 gap-8 md:gap-16 items-center">

            <div>

              <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-medium tracking-tight mb-6">

                The ecosystem for{" "}

                <span className="text-stone-400 italic">serious</span> builders.

              </h2>

              <div className="space-y-6">

                {[

                  "Verified profiles and trust indicators",

                  "Explainable compatibility scoring",

                  "Secure, private collaboration spaces",

                  "Multi-tenant ready for organizations",

                ].map((item, i) => (

                  <div key={i} className="flex items-center gap-4">

                    <div className="w-6 h-6 rounded-full bg-stone-800 flex items-center justify-center">

                      <CheckCircle2 className="w-4 h-4 text-stone-400" />

                    </div>

                    <span className="text-xs sm:text-sm md:text-base text-stone-300">

                      {item}

                    </span>

                  </div>

                ))}

              </div>

              <div className="mt-12">

                <NavLink

                  to="/signup"

                  className="inline-flex items-center gap-2 bg-white text-stone-900 px-8 py-3.5 rounded-[2rem] text-sm sm:text-base font-semibold hover:bg-stone-50 transition-all shadow-md shrink-0"

                >

                  Join the Ecosystem

                  <ArrowRight className="w-5 h-5" />

                </NavLink>

              </div>

            </div>

            <div className="relative max-w-[300px] sm:max-w-md mx-auto lg:max-w-none w-full">

              <div className="aspect-[4/3] sm:aspect-square bg-[#1c1917] rounded-[2rem] overflow-hidden border border-stone-800 p-6 sm:p-10 flex flex-col justify-between shadow-2xl relative z-10 w-full">

                <div className="flex justify-between items-start">

                  <div className="space-y-3">

                    <div className="w-32 sm:w-40 h-3 sm:h-4 bg-stone-700/80 rounded-full" />

                    <div className="w-48 sm:w-64 h-3 sm:h-4 bg-stone-800/80 rounded-full" />

                  </div>

                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-stone-800/80 rounded-2xl" />

                </div>

                <div className="flex-1 flex items-center justify-center relative">

                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-stone-500/10 rounded-full blur-2xl flex-shrink-0 animate-pulse" />

                  <Globe className="w-24 h-24 sm:w-40 sm:h-40 text-stone-700 flex-shrink-0 animate-spin-slow relative z-10" />

                </div>

                <div className="grid grid-cols-3 gap-4 sm:gap-6">

                  <div className="h-16 sm:h-24 bg-stone-800/80 rounded-2xl" />

                  <div className="h-16 sm:h-24 bg-stone-800/80 rounded-2xl" />

                  <div className="h-16 sm:h-24 bg-stone-800/80 rounded-2xl" />

                </div>

              </div>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-stone-800/20 rounded-full blur-3xl -z-10" />

            </div>

          </div>

        </div>

      </section>



      {/* CTA Section */}

      <section id="pricing" className="py-16 md:py-24 lg:py-32">

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

          <div className="p-8 md:p-12 lg:p-20 rounded-[2rem] sm:rounded-[3rem] bg-stone-50 border border-stone-100 relative overflow-hidden">

            <div className="relative z-10">

              <h2 className="text-lg font-medium text-stone-900 tracking-tight mb-6">

                Ready to find your <br />

                next co-founder?

              </h2>

              <p className="text-sm sm:text-base md:text-lg text-stone-500 mb-12 max-w-2xl mx-auto">

                Join thousands of founders building the next generation of

                world-changing companies.

              </p>

              <NavLink

                to="/signup"

                className="bg-stone-900 text-white px-8 py-3.5 rounded-[2rem] text-sm sm:text-base font-semibold hover:bg-stone-800 transition-all shadow-xl shadow-stone-900/10 inline-flex items-center gap-3"

              >

                Create Your Profile

                <ArrowRight className="w-6 h-6" />

              </NavLink>

            </div>



            {/* Background pattern */}

            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">

              <Zap className="w-64 h-64 text-stone-900 rotate-12" />

            </div>

          </div>

        </div>

      </section>



      {/* Footer */}

      <footer className="bg-white border-t border-stone-100 py-20">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="grid md:grid-cols-4 gap-12 mb-20">

            <div className="col-span-2">

              <div className="flex items-center gap-2 mb-6">

                <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">

                  <Zap className="w-5 h-5 text-white" />

                </div>

                <span className="text-lg font-medium text-stone-900 tracking-tight">

                  CoFounderBay

                </span>

              </div>

              <p className="text-sm sm:text-base text-stone-500 max-w-xs leading-relaxed">

                The modern startup ecosystem platform designed to reduce founder

                risk and team formation risk.

              </p>

            </div>

            <div>

              <h4 className="font-medium text-stone-900 mb-6 text-xs tracking-widest">

                Platform

              </h4>

              <ul className="space-y-4 text-sm text-stone-500">

                <li>

                  <NavLink

                    to="/matches"

                    className="hover:text-stone-900 transition-colors"

                  >

                    Matching Engine

                  </NavLink>

                </li>

                <li>

                  <NavLink

                    to="/mentors"

                    className="hover:text-stone-900 transition-colors"

                  >

                    Mentor Network

                  </NavLink>

                </li>

                <li>

                  <NavLink

                    to="/communities"

                    className="hover:text-stone-900 transition-colors"

                  >

                    Communities

                  </NavLink>

                </li>

                <li>

                  <NavLink

                    to="/discovery"

                    className="hover:text-stone-900 transition-colors"

                  >

                    Discovery

                  </NavLink>

                </li>

              </ul>

            </div>

            <div>

              <h4 className="font-medium text-stone-900 mb-6 text-xs tracking-widest">

                Company

              </h4>

              <ul className="space-y-4 text-sm text-stone-500">

                <li>

                  <a

                    href="#how-it-works"

                    className="hover:text-stone-900 transition-colors"

                  >

                    About Us · Σχετικά

                  </a>

                </li>

                <li>

                  <NavLink

                    to="/legal"

                    className="hover:text-stone-900 transition-colors"

                  >

                    Privacy Policy · Πολιτική απορρήτου

                  </NavLink>

                </li>

                <li>

                  <NavLink

                    to="/legal"

                    className="hover:text-stone-900 transition-colors"

                  >

                    Terms of Service · Όροι χρήσης

                  </NavLink>

                </li>

                <li>

                  <a

                    href="mailto:support@cofounderbay.com"

                    className="hover:text-stone-900 transition-colors"

                  >

                    Contact · Επικοινωνία

                  </a>

                </li>

              </ul>

            </div>

          </div>

          <div className="pt-8 border-t border-stone-100 flex flex-col md:flex-row justify-between items-center gap-4">

            <p className="text-xs text-stone-400">

              © {new Date().getFullYear()} CoFounderBay. All rights reserved.

            </p>

            <div className="flex gap-6">

              <a

                href="#"

                className="text-stone-400 hover:text-stone-900 transition-colors"

              >

                <Globe className="w-5 h-5" />

              </a>

              <a

                href="#"

                className="text-stone-400 hover:text-stone-900 transition-colors"

              >

                <MessageSquare className="w-5 h-5" />

              </a>

            </div>

          </div>

        </div>

      </footer>

    </div>

  );

}

