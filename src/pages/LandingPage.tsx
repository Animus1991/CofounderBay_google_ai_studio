import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Zap,
  Users,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  Globe,
  TrendingUp,
  MessageSquare,
  Trophy,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../App";
import { cn } from "../lib/utils";
import { LanguageToggle, useT } from "../lib/language";
import { Both } from "../lib/both";
import { MOCK_AGENTS } from "../services/aiService";
import { appEnv } from "../config/env";

export default function LandingPage() {
  const t = useT();
  const { user, isDemoMode, toggleDemoMode } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      title: t("Explainable matching", "Αντιστοίχιση με εξήγηση"),
      description: t(
        "People whose skills complement yours, at your stage and commitment — with the reason behind every score.",
        "Άνθρωποι που συμπληρώνουν τις δεξιότητές σου, στο ίδιο στάδιο και με την ίδια δέσμευση — με τον λόγο πίσω από κάθε σκορ.",
      ),
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: t("Mentor Ecosystem", "Οικοσύστημα μεντόρων"),
      description: t(
        "Access a curated network of experienced advisors and industry experts to guide your venture.",
        "Πρόσβαση σε επιλεγμένο δίκτυο έμπειρων συμβούλων και ειδικών του κλάδου για να καθοδηγήσουν το εγχείρημά σου.",
      ),
      icon: GraduationCap,
      color: "bg-purple-50 text-purple-600",
    },
    {
      title: t("Thematic Communities", "Θεματικές κοινότητες"),
      description: t(
        "Join industry-specific hubs to discuss trends, share insights, and find collaborators.",
        "Μπες σε κόμβους ανά κλάδο για τάσεις, γνώσεις και συνεργάτες.",
      ),
      icon: Zap,
      color: "bg-amber-50 text-amber-600",
    },
    {
      title: t("Progress Tracking", "Παρακολούθηση προόδου"),
      description: t(
        "Set milestones and track your startup's development with structured collaboration tools.",
        "Όρισε ορόσημα και παρακολούθησε την εξέλιξη της startup σου με εργαλεία συνεργασίας.",
      ),
      icon: Trophy,
      color: "bg-emerald-50 text-emerald-600",
    },
  ];

  // Product facts a visitor can verify in the app itself — no invented traction numbers.
  const stats = [
    { label: t("Questions in the fit check", "Ερωτήσεις στο fit check"), value: "5" },
    { label: t("Compatibility dimensions, each explained", "Διαστάσεις συμβατότητας, καθεμία με εξήγηση"), value: "5" },
    { label: t("AI specialists for founders", "Ειδικοί AI για ιδρυτές"), value: String(MOCK_AGENTS.length) },
    { label: t("Languages, switch any time", "Γλώσσες, αλλάζεις όποτε θέλεις"), value: "2" },
  ];

  return (
    <div className="min-h-screen bg-white selection:bg-stone-900 selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 min-h-16 py-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="hidden min-[420px]:inline text-base font-medium text-stone-900 tracking-tight">
                CoFounderBay
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
              >
                {t("Features", "Λειτουργίες")}
              </a>
              <NavLink
                to="/quiz"
                className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
              >
                {t("Fit check", "Fit check")}
              </NavLink>
              <a
                href="#how-it-works"
                className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
              >
                {t("How it Works", "Πώς λειτουργεί")}
              </a>
              <a
                href="#communities"
                className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
              >
                {t("Communities", "Κοινότητες")}
              </a>
              <NavLink
                to="/pricing"
                className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
              >
                {t("Pricing", "Πλάνα")}
              </NavLink>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 shrink min-w-0">
              <LanguageToggle />
              {isDemoMode ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => toggleDemoMode(false)}
                    className="min-h-11 px-3 whitespace-nowrap text-sm font-semibold text-stone-700 hover:text-stone-900 transition-colors"
                  >
                    {t("Exit demo", "Έξοδος από τη δοκιμαστική λειτουργία")}
                  </button>
                  <NavLink
                    to="/dashboard"
                    className="inline-flex min-h-11 items-center justify-center bg-stone-900 text-white px-3 sm:px-5 rounded-xl text-sm font-semibold hover:bg-stone-800 transition-all whitespace-nowrap"
                  >
                    <span className="sm:hidden">{t("Dashboard", "Πίνακας ελέγχου")}</span>
                    <span className="hidden sm:inline">{t("Go to dashboard", "Πίνακας ελέγχου")}</span>
                  </NavLink>
                </div>
              ) : user ? (
                <div className="flex items-center gap-3 sm:gap-4">
                  <button
                    onClick={() => {
                      toggleDemoMode(true);
                      navigate("/dashboard");
                    }}
                    className="inline-flex min-h-11 items-center justify-center px-3 text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors whitespace-nowrap"
                  >
                    {t("Demo", "Demo")}
                  </button>
                  <NavLink
                    to="/dashboard"
                    className="inline-flex min-h-11 items-center justify-center bg-stone-900 text-white px-4 sm:px-5 rounded-xl text-sm font-semibold hover:bg-stone-800 transition-all whitespace-nowrap"
                  >
                    {t("Go to dashboard", "Πίνακας ελέγχου")}
                  </NavLink>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      toggleDemoMode(true);
                      navigate("/dashboard");
                    }}
                    className="inline-flex min-h-11 items-center justify-center px-3 text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors whitespace-nowrap"
                  >
                    {t("Demo", "Demo")}
                  </button>
                  <NavLink
                    to="/login"
                    className="inline-flex min-h-11 items-center justify-center px-3 text-sm font-semibold text-stone-600 hover:text-stone-900 whitespace-nowrap"
                  >
                    {t("Log in", "Είσοδος")}
                  </NavLink>
                  <NavLink
                    to="/signup"
                    className="inline-flex min-h-11 items-center justify-center bg-stone-900 text-white px-4 sm:px-5 rounded-xl text-sm font-semibold hover:bg-stone-800 transition-all whitespace-nowrap"
                  >
                    {t("Get Started", "Ξεκίνα")}
                  </NavLink>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-medium tracking-wide mb-6">
                <Sparkles className="w-3 h-3" />
                {t("60 seconds · no account needed", "60 δευτερόλεπτα · χωρίς λογαριασμό")}
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-medium text-stone-900 tracking-tight leading-snug mb-8">
                {t("Build your startup team with", "Φτιάξε την ομάδα της startup σου με")}{" "}
                <span className="text-stone-400 italic">{t("precision.", "ακρίβεια.")}</span>
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-stone-500 leading-relaxed mb-10 max-w-2xl mx-auto">
                {t(
                  "Five questions capture your skills, what you are looking for, stage, commitment and working hours. Matches then ranks people, explains every score, and the assistant helps you take the next step.",
                  "Πέντε ερωτήσεις καταγράφουν τις δεξιότητές σου, τι αναζητάς, το στάδιο, τη δέσμευση και τις ώρες εργασίας. Οι Αντιστοιχίσεις κατατάσσουν ανθρώπους, εξηγούν κάθε σκορ και ο βοηθός σε οδηγεί στο επόμενο βήμα.",
                )}
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mt-4 w-full max-w-xl mx-auto">
                <NavLink
                  to="/quiz"
                  className="w-full sm:w-auto min-h-11 bg-stone-900 text-white px-5 rounded-full text-sm font-semibold hover:bg-stone-800 transition-all inline-flex items-center justify-center gap-2 group"
                >
                  {t("Take the fit check", "Κάνε το fit check")}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </NavLink>
                <button
                  onClick={() => {
                    toggleDemoMode(true);
                    navigate("/dashboard");
                  }}
                  className="w-full sm:w-auto min-h-11 px-5 rounded-full text-sm font-medium text-stone-600 hover:text-stone-900 border border-stone-200 bg-white transition-all"
                >
                  {t("Try the demo", "Δοκίμασε το demo")}
                </button>
                <a
                  href="#features"
                  className="w-full sm:w-auto min-h-11 px-5 rounded-full text-sm font-medium text-stone-600 hover:text-stone-900 inline-flex items-center justify-center transition-all"
                >
                  {t("See the features", "Δες τις λειτουργίες")}
                </a>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">

        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-stone-100 bg-stone-50/30">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
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

      {/* This week: person, session, operator — one glance */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <p className="text-xs font-medium text-stone-400 tracking-wide mb-4">
            <Both en="How it works, in three steps" el="Πώς λειτουργεί, σε τρία βήματα" />
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                n: "1",
                to: "/quiz",
                icon: Sparkles,
                title: t("Take the fit check", "Κάνε το fit check"),
                body: t(
                  "Five questions, no account needed. They capture skills, what you look for, stage, commitment and working hours — the exact fields matching scores.",
                  "Πέντε ερωτήσεις, χωρίς λογαριασμό. Καταγράφουν δεξιότητες, τι αναζητάς, στάδιο, δέσμευση και ώρες εργασίας — ακριβώς τα πεδία που βαθμολογεί η αντιστοίχιση.",
                ),
                dark: false,
              },
              {
                n: "2",
                to: "/signup",
                icon: Users,
                title: t("See who fits, and why", "Δες ποιοι ταιριάζουν, και γιατί"),
                body: t(
                  "Matches ranks members across five dimensions and explains every score in plain words. Save people, send a connection request, start a conversation.",
                  "Οι Αντιστοιχίσεις κατατάσσουν μέλη σε πέντε διαστάσεις και εξηγούν κάθε σκορ με απλά λόγια. Αποθήκευσε άτομα, στείλε αίτημα σύνδεσης, ξεκίνα συνομιλία.",
                ),
                dark: false,
              },
              {
                n: "3",
                to: "/signup",
                icon: MessageSquare,
                title: t("Build with your team", "Χτίσε με την ομάδα σου"),
                body: t(
                  "Private messages, milestones, a shared workspace, fundraising tools and AI specialists — everything in one place, in English or Greek.",
                  "Ιδιωτικά μηνύματα, ορόσημα, κοινός χώρος εργασίας, εργαλεία χρηματοδότησης και ειδικοί AI — όλα σε ένα μέρος, στα ελληνικά ή στα αγγλικά.",
                ),
                dark: true,
              },
            ].map((step) => (
              <NavLink
                key={step.n}
                to={step.to}
                className={cn(
                  "block text-left rounded-2xl border p-5 transition-all",
                  step.dark ? "bg-stone-900 border-stone-900 text-white hover:bg-stone-800" : "bg-white border-stone-100 hover:border-stone-300",
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={cn("text-[10px] font-semibold tracking-wider", step.dark ? "text-stone-400" : "text-stone-400")}>
                    {t(`Step ${step.n}`, `Βήμα ${step.n}`)}
                  </span>
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", step.dark ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-700")}>
                    <step.icon className="w-4 h-4" />
                  </div>
                </div>
                <p className={cn("text-sm font-semibold", step.dark ? "text-white" : "text-stone-900")}>{step.title}</p>
                <p className={cn("text-xs mt-1.5 leading-relaxed", step.dark ? "text-stone-400" : "text-stone-500")}>{step.body}</p>
              </NavLink>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-lg font-medium text-stone-900 tracking-tight mb-4">
              {t("Not just another social network.", "Όχι άλλο ένα κοινωνικό δίκτυο.")}
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-stone-500">
              {t(
                "We've replaced random networking with structured discovery and explainable matching logic designed for the startup world.",
                "Αντικαταστήσαμε την τυχαία δικτύωση με δομημένη εξερεύνηση και εξηγήσιμη λογική αντιστοίχισης, φτιαγμένη για τον κόσμο των startup.",
              )}
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
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-8 md:gap-16">
            <div className="lg:w-1/2 space-y-8">
              <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-medium text-stone-900 tracking-tight">
                {t("Industry-specific", "Κόμβοι startup")} <br />
                <span className="text-stone-400">{t("Startup Hubs.", "ανά κλάδο.")}</span>
              </h2>
              <p className="text-sm sm:text-lg lg:text-xl text-stone-500 leading-relaxed">
                {t(
                  "Join deep-tech, fintech, or sustainability communities to find partners who share your domain expertise and passion.",
                  "Μπες σε κοινότητες deep-tech, fintech ή βιωσιμότητας για να βρεις συνεργάτες με την ίδια εξειδίκευση και πάθος.",
                )}
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
                    className="px-5 py-2.5 bg-white border-2 border-stone-100 rounded-xl text-sm font-medium text-stone-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <NavLink
                to="/communities"
                className="inline-flex items-center gap-2 text-stone-900 font-medium hover:gap-3 transition-all"
              >
                {t("Explore all communities", "Εξερεύνηση όλων των κοινοτήτων")}
                <ArrowRight className="w-5 h-5" />
              </NavLink>
            </div>
            <div className="lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {[
                { icon: TrendingUp, color: "bg-blue-50 text-blue-600", title: t("Growth Hub", "Κόμβος ανάπτυξης"), body: t("Acquisition, retention and pricing experiments, discussed with numbers.", "Απόκτηση πελατών, διατήρηση και πειράματα τιμολόγησης, με αριθμούς.") },
                { icon: MessageSquare, color: "bg-purple-50 text-purple-600", title: t("Founder Lounge", "Στέκι ιδρυτών"), body: t("Ask anything about the first year of a company — honest answers from people living it.", "Ρώτα οτιδήποτε για τον πρώτο χρόνο μιας εταιρείας — ειλικρινείς απαντήσεις από ανθρώπους που το ζουν.") },
                { icon: Zap, color: "bg-amber-50 text-amber-600", title: t("AI Builders", "Δημιουργοί AI"), body: t("Models, evaluation, costs and what actually ships to customers.", "Μοντέλα, αξιολόγηση, κόστη και τι φτάνει πραγματικά στους πελάτες.") },
                { icon: Globe, color: "bg-emerald-50 text-emerald-600", title: t("Global Scale", "Διεθνής επέκταση"), body: t("Entering new markets, remote teams and working across time zones.", "Είσοδος σε νέες αγορές, απομακρυσμένες ομάδες και δουλειά σε διαφορετικές ζώνες ώρας.") },
              ].map((hub) => (
                <NavLink key={hub.title} to="/communities" className="block text-left bg-white rounded-2xl border border-stone-100 p-6 shadow-sm hover:border-stone-300 transition-all">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", hub.color)}>
                    <hub.icon className="w-6 h-6" />
                  </div>
                  <div className="font-semibold text-stone-900 text-sm">{hub.title}</div>
                  <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">{hub.body}</p>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section
        id="how-it-works"
        className="py-16 md:py-24 bg-stone-900 text-white overflow-hidden relative"
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-16 items-center">
            <div>
              <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-medium tracking-tight mb-6">
                {t("The ecosystem for", "Το οικοσύστημα για")}{" "}
                <span className="text-stone-400 italic">{t("serious", "σοβαρούς")}</span> {t("builders.", "δημιουργούς.")}
              </h2>
              <div className="space-y-6">
                {[
                  t("Verified profiles and trust indicators", "Επαληθευμένα προφίλ και δείκτες εμπιστοσύνης"),
                  t("Explainable compatibility scoring", "Εξηγήσιμη βαθμολογία συμβατότητας"),
                  t("Secure, private collaboration spaces", "Ασφαλείς, ιδιωτικοί χώροι συνεργασίας"),
                  t("Multi-tenant ready for organizations", "Έτοιμο για οργανισμούς (multi-tenant)"),
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
                  className="inline-flex items-center gap-2 bg-white text-stone-900 px-8 py-3.5 rounded-xl text-sm sm:text-base font-semibold hover:bg-stone-50 transition-all shadow-md shrink-0"
                >
                  {t("Join the Ecosystem", "Εγγραφή στο οικοσύστημα")}
                  <ArrowRight className="w-5 h-5" />
                </NavLink>
              </div>
            </div>
            <div className="relative w-full max-w-full sm:max-w-md mx-auto lg:max-w-none">
              <div className="aspect-[4/3] sm:aspect-square bg-[#1c1917] rounded-xl overflow-hidden border border-stone-800 p-6 sm:p-10 flex flex-col justify-between shadow-sm relative z-10 w-full">
                <div className="flex justify-between items-start">
                  <div className="space-y-3">
                    <div className="w-32 sm:w-40 h-3 sm:h-4 bg-stone-700/80 rounded-full" />
                    <div className="w-48 sm:w-64 h-3 sm:h-4 bg-stone-800/80 rounded-full" />
                  </div>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-stone-800/80 rounded-2xl" />
                </div>
                <div className="flex-1 flex items-center justify-center relative">
                  <Globe className="w-24 h-24 sm:w-40 sm:h-40 text-stone-700 flex-shrink-0" />
                </div>
                <div className="grid grid-cols-3 gap-4 sm:gap-6">
                  <div className="h-16 sm:h-24 bg-stone-800/80 rounded-2xl" />
                  <div className="h-16 sm:h-24 bg-stone-800/80 rounded-2xl" />
                  <div className="h-16 sm:h-24 bg-stone-800/80 rounded-2xl" />
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="pricing" className="py-16 md:py-24 lg:py-32">
        <div className="max-w-5xl mx-auto px-2 sm:px-6 lg:px-8 text-center">
          <div className="p-8 md:p-12 lg:p-20 rounded-xl sm:rounded-xl bg-stone-50 border border-stone-100 relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-lg font-medium text-stone-900 tracking-tight mb-6">
                {t("Ready to find your", "Ώρα να βρεις τον")} <br />
                {t("next co-founder?", "συνιδρυτή σου;")}
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-stone-500 mb-12 max-w-2xl mx-auto">
                {t(
                  "Create your profile in two minutes. The fit check, matches and messaging are free; paid plans add more when you need it.",
                  "Δημιούργησε το προφίλ σου σε δύο λεπτά. Το fit check, οι αντιστοιχίσεις και τα μηνύματα είναι δωρεάν· τα πλάνα επί πληρωμή προσθέτουν περισσότερα όταν τα χρειαστείς.",
                )}
              </p>
              <NavLink
                to="/signup"
                className="bg-stone-900 text-white px-8 py-3.5 rounded-xl text-sm sm:text-base font-semibold hover:bg-stone-800 transition-all shadow-sm inline-flex items-center gap-3"
              >
                {t("Create Your Profile", "Δημιουργία προφίλ")}
                <ArrowRight className="w-6 h-6" />
              </NavLink>
            </div>

            {/* Background pattern */}

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-100 py-20">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
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
                {t(
                  "The modern startup ecosystem platform designed to reduce founder risk and team formation risk.",
                  "Η σύγχρονη πλατφόρμα οικοσυστήματος startup, σχεδιασμένη να μειώνει τον κίνδυνο του ιδρυτή και της συγκρότησης ομάδας.",
                )}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-stone-900 mb-6 text-xs tracking-wide">
                {t("Platform", "Πλατφόρμα")}
              </h4>
              <ul className="space-y-4 text-sm text-stone-500">
                <li>
                  <NavLink
                    to="/quiz"
                    className="hover:text-stone-900 transition-colors"
                  >
                    {t("Fit check", "Fit check")}
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/matches"
                    className="hover:text-stone-900 transition-colors"
                  >
                    {t("Matching Engine", "Μηχανή αντιστοίχισης")}
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/mentors"
                    className="hover:text-stone-900 transition-colors"
                  >
                    {t("Mentor Network", "Δίκτυο μεντόρων")}
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/communities"
                    className="hover:text-stone-900 transition-colors"
                  >
                    {t("Communities", "Κοινότητες")}
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/discovery"
                    className="hover:text-stone-900 transition-colors"
                  >
                    {t("Discovery", "Εξερεύνηση")}
                  </NavLink>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-stone-900 mb-6 text-xs tracking-wide">
                {t("Company", "Εταιρεία")}
              </h4>
              <ul className="space-y-4 text-sm text-stone-500">
                <li>
                  <a
                    href="#how-it-works"
                    className="hover:text-stone-900 transition-colors"
                  >
                    {t("About Us", "Σχετικά")}
                  </a>
                </li>
                <li>
                  <NavLink
                    to="/legal"
                    className="hover:text-stone-900 transition-colors"
                  >
                    {t("Privacy Policy", "Πολιτική απορρήτου")}
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/legal"
                    className="hover:text-stone-900 transition-colors"
                  >
                    {t("Terms of Service", "Όροι χρήσης")}
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/pricing"
                    className="hover:text-stone-900 transition-colors"
                  >
                    {t("Pricing", "Πλάνα")}
                  </NavLink>
                </li>
                <li>
                  <a
                    href={`mailto:${appEnv.legal.supportEmail}`}
                    className="hover:text-stone-900 transition-colors"
                  >
                    {t("Contact", "Επικοινωνία")}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-stone-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-stone-400">
              © {new Date().getFullYear()} {appEnv.legal.entity}. {t("All rights reserved.", "Με την επιφύλαξη παντός δικαιώματος.")}
            </p>
            <div className="flex items-center gap-4 text-xs text-stone-400">
              <LanguageToggle className="min-h-9" />
              <a href={`mailto:${appEnv.legal.supportEmail}`} className="hover:text-stone-900 transition-colors">{appEnv.legal.supportEmail}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
