import {
 useState,
 useEffect } from "react";
import { 
 Zap,
 Play,
 Pause,
 Settings2,
 History,
 AlertCircle,
 CheckCircle2,
 Search,
 Filter,
 Plus,
 MoreVertical,
 ArrowRight,
 Clock,
 BarChart3,
 Activity,
 ShieldCheck,
 Mail,
 Bell,
 Webhook,
 UserPlus,
 Users,
 Info,
 ChevronRight,
 ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyHint from "../../components/ui/EmptyHint";
import { SkeletonList } from "../../components/ui/Skeleton";
import { automationService } from "../../services/automationService";
import { AutomationRule, AutomationExecution, AutomationLog, User, EmailTemplate, NotificationTemplate } from "../../types";
import { cn } from "../../lib/utils";
import { useT } from "../../lib/language";
import { labelOf } from "../../lib/labels";
import { formatDateTime, formatTime } from "../../lib/dates";
import { useAuth } from "../../App";

interface AutomationDashboardProps {
 user: User;
}

export default function AutomationDashboard({ user: _user }: AutomationDashboardProps) {
 const t = useT();
 const [activeTab, setActiveTab] = useState<'rules' | 'executions' | 'logs' | 'templates'>('rules');
 const [rules, setRules] = useState<AutomationRule[]>([]);
 const [executions, setExecutions] = useState<AutomationExecution[]>([]);
 const [logs, setLogs] = useState<AutomationLog[]>([]);
 const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
 const [notificationTemplates, setNotificationTemplates] = useState<NotificationTemplate[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState("");
 const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
 const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
 const { isDemoMode } = useAuth();

 useEffect(() => {
  const fetchData = async () => {
   // Sample account: automation collections deny signed-out reads — show the empty state.
   if (isDemoMode) { setLoading(false); return; }
   setLoading(true);
   try {
    const [rulesData, execsData, logsData, emailTemplatesData, notificationTemplatesData] = await Promise.all([
     automationService.getRules(),
     automationService.getExecutions(),
     automationService.getLogs(),
     automationService.getEmailTemplates(),
     automationService.getNotificationTemplates()
    ]);
    setRules(rulesData);
    setExecutions(execsData);
    setLogs(logsData);
    setEmailTemplates(emailTemplatesData);
    setNotificationTemplates(notificationTemplatesData);
   } catch (error) {
    console.error("Failed to fetch automation data", error);
   } finally {
    setLoading(false);
   }
  };
  fetchData();
 }, [isDemoMode]);

 const handleToggleRule = async (ruleId: string) => {
  if (isDemoMode) return;
  try {
   const updatedRule = await automationService.toggleRule(ruleId);
   setRules(rules.map(r => r.id === ruleId ? updatedRule : r));
  } catch (error) {
   console.error("Failed to toggle rule", error);
  }
 };

 const handleRunNow = async (ruleId: string) => {
  if (isDemoMode) return;
  try {
   await automationService.triggerRuleManually(ruleId, "user_demo_" + Math.floor(Math.random() * 1000));
   const updatedExecs = await automationService.getExecutions();
   setExecutions(updatedExecs);
   setActiveTab('executions');
  } catch (error) {
   console.error("Failed to trigger rule", error);
  }
 };

 const handleDeleteRule = async (ruleId: string) => {
  if (isDemoMode) return;
  try {
   await automationService.deleteRule(ruleId);
   setRules(rules.filter(r => r.id !== ruleId));
  } catch (error) {
   console.error("Failed to delete rule", error);
  }
 };

 const filteredRules = rules.filter(rule => {
  const matchesSearch = rule.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             rule.description.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesFilter = filterStatus === 'All' || (filterStatus === 'Active' ? rule.status === 'Active' : rule.status === 'Inactive');
  return matchesSearch && matchesFilter;
 });

 const rulesFiltersActive = Boolean(searchQuery) || filterStatus !== 'All';

 const workflowName = (name: string) => {
  if (name === 'Onboarding Reminder') return t('Onboarding Reminder', 'Υπενθύμιση onboarding');
  if (name === 'Match Generation') return t('Match Generation', 'Δημιουργία αντιστοιχίσεων');
  if (name === 'Inactivity Nudge') return t('Inactivity Nudge', 'Υπενθύμιση αδράνειας');
  if (name === 'Mentor Request Notification') return t('Mentor Request Notification', 'Ειδοποίηση αιτήματος μέντορα');
  if (name === 'Connection Follow-up') return t('Connection Follow-up', 'Follow-up σύνδεσης');
  return name;
 };
 const workflowDescription = (text: string) => {
  if (text === 'Send a reminder if onboarding is incomplete after 24 hours.') return t('Send a reminder if onboarding is incomplete after 24 hours.', 'Στείλε υπενθύμιση αν το onboarding μείνει ημιτελές μετά από 24 ώρες.');
  if (text === 'Auto-generate matches after profile completion.') return t('Auto-generate matches after profile completion.', 'Αυτόματη δημιουργία αντιστοιχίσεων μετά την ολοκλήρωση προφίλ.');
  if (text === "Re-engage users who haven't logged in for 7 days.") return t("Re-engage users who haven't logged in for 7 days.", 'Επανενεργοποίησε μέλη χωρίς είσοδο για 7 ημέρες.');
  if (text === 'Notify mentor when a new request is submitted.') return t('Notify mentor when a new request is submitted.', 'Ειδοποίησε τον μέντορα όταν υποβάλλεται νέο αίτημα.');
  if (text === 'Send a follow-up email if a connection request is pending for 72 hours.') return t('Send a follow-up email if a connection request is pending for 72 hours.', 'Στείλε follow-up email αν ένα αίτημα σύνδεσης μείνει σε αναμονή για 72 ώρες.');
  return text;
 };
 const triggerName = (type: string) => {
  if (type === 'User Signup' || type === 'UserSignup') return t('User signup', 'Εγγραφή μέλους');
  if (type === 'ProfileCompleted') return t('Profile completed', 'Ολοκλήρωση προφίλ');
  if (type === 'InactivityDetected') return t('Inactivity detected', 'Ανίχνευση αδράνειας');
  if (type === 'Match Found' || type === 'MatchGenerated') return t('Match generated', 'Δημιουργία αντιστοίχισης');
  if (type === 'MentorRequestSubmitted') return t('Mentor request submitted', 'Υποβολή αιτήματος μέντορα');
  if (type === 'SubscriptionTrialEnding') return t('Subscription trial ending', 'Λήξη δοκιμαστικής συνδρομής');
  if (type === 'Message Received') return t('Message received', 'Λήψη μηνύματος');
  if (type === 'Milestone Completed') return t('Milestone completed', 'Ολοκλήρωση ορόσημου');
  if (type === 'Scheduled') return t('Scheduled', 'Προγραμματισμένο');
  return type;
 };
 const actionName = (type: string) => {
  if (type === 'Send Email' || type === 'SendEmail') return t('Send Email', 'Αποστολή email');
  if (type === 'Send Notification' || type === 'SendInAppNotification') return t('Send in-app notification', 'Ειδοποίηση στην εφαρμογή');
  if (type === 'Trigger Webhook' || type === 'TriggerWebhook') return t('Trigger webhook', 'Εκτέλεση webhook');
  if (type === 'AlertAdmin') return t('Alert admin', 'Ειδοποίηση διαχειριστή');
  if (type === 'Update User Status') return t('Update user status', 'Ενημέρωση κατάστασης μέλους');
  return type;
 };
 const templateName = (name: string) => {
  if (name === 'Onboarding Nudge') return t('Onboarding Nudge', 'Υπενθύμιση onboarding');
  if (name === 'Re-engagement') return t('Re-engagement', 'Επανενεργοποίηση');
  if (name === 'Connection Follow-up') return t('Connection Follow-up', 'Follow-up σύνδεσης');
  if (name === 'Onboarding App Nudge') return t('Onboarding App Nudge', 'Υπενθύμιση onboarding στην εφαρμογή');
  if (name === 'Mentor Request Received') return t('Mentor Request Received', 'Λήψη αιτήματος μέντορα');
  return name;
 };
 const templateLine = (text: string) => {
  if (text === 'Complete your profile') return t('Complete your profile', 'Ολοκλήρωσε το προφίλ σου');
  if (text === "Don't miss out! Complete your profile today") return t("Don't miss out! Complete your profile today", 'Μην το χάσεις. Ολοκλήρωσε το προφίλ σου σήμερα');
  if (text === "Hi there, we noticed you haven't finished your profile yet...") return t("Hi there, we noticed you haven't finished your profile yet...", 'Είδαμε ότι το προφίλ σου δεν έχει ολοκληρωθεί ακόμη...');
  if (text === 'We miss you') return t('We miss you', 'Μας λείπεις');
  if (text === "Come back and see what's new") return t("Come back and see what's new", 'Γύρνα να δεις τι νέο υπάρχει');
  if (text === "It's been a while since we saw you...") return t("It's been a while since we saw you...", 'Έχει περάσει καιρός από την τελευταία επίσκεψη...');
  if (text === 'Pending Connection') return t('Pending Connection', 'Σύνδεση σε αναμονή');
  if (text === 'You have a pending connection request') return t('You have a pending connection request', 'Έχεις αίτημα σύνδεσης σε αναμονή');
  if (text === "Don't forget to check your connection requests...") return t("Don't forget to check your connection requests...", 'Μην ξεχάσεις τα αιτήματα σύνδεσης...');
  if (text === 'Profile Incomplete') return t('Profile Incomplete', 'Ημιτελές προφίλ');
  if (text === 'Finish your profile to start matching with co-founders!') return t('Finish your profile to start matching with co-founders!', 'Ολοκλήρωσε το προφίλ για να ξεκινήσεις αντιστοιχίσεις με συνιδρυτές.');
  if (text === 'New Mentor Request') return t('New Mentor Request', 'Νέο αίτημα μέντορα');
  if (text === 'You have received a new mentorship request. Review it now.') return t('You have received a new mentorship request. Review it now.', 'Έλαβες νέο αίτημα καθοδήγησης. Δες το τώρα.');
  if (text === 'Onboarding') return t('Onboarding', 'Onboarding');
  if (text === 'System') return t('System', 'Σύστημα');
  if (text === 'Matching') return t('Matching', 'Αντιστοιχίσεις');
  return text;
 };
 const RULE_NAME_EL: Record<string, string> = {
 'Onboarding Reminder': 'Υπενθύμιση onboarding',
 'Match Generation': 'Δημιουργία αντιστοιχίσεων',
 'Inactivity Nudge': 'Υπενθύμιση αδράνειας',
 'Mentor Request Notification': 'Ειδοποίηση αιτήματος μέντορα',
 'Connection Follow-up': 'Follow-up σύνδεσης',
};
const logMessage = (message: string) => {
  let out = message;
  for (const [en, el] of Object.entries(RULE_NAME_EL)) if (out.includes(en)) out = out.replace(en, el);
  return out;
 };
 const getTriggerIcon = (type: string) => {
  switch (type) {
   case 'UserSignup': return <UserPlus className="w-4 h-4" />;
   case 'ProfileCompleted': return <CheckCircle2 className="w-4 h-4" />;
   case 'InactivityDetected': return <Clock className="w-4 h-4" />;
   case 'MatchGenerated': return <Users className="w-4 h-4" />;
   case 'MentorRequestSubmitted': return <Activity className="w-4 h-4" />;
   case 'SubscriptionTrialEnding': return <BarChart3 className="w-4 h-4" />;
   default: return <Zap className="w-4 h-4" />;
  }
 };

 const getActionIcon = (type: string) => {
  switch (type) {
   case 'SendInAppNotification': return <Bell className="w-4 h-4" />;
   case 'SendEmail': return <Mail className="w-4 h-4" />;
   case 'TriggerWebhook': return <Webhook className="w-4 h-4" />;
   case 'AlertAdmin': return <ShieldCheck className="w-4 h-4" />;
   default: return <Settings2 className="w-4 h-4" />;
  }
 };

 return (
  <div className="w-full px-2 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-24 space-y-6">
   <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-4">
    <div>
     <div className="flex items-center gap-2.5 mb-1.5">
      <div className="p-1.5 bg-stone-900 text-white rounded-lg">
       <Zap className="w-4 h-4" />
      </div>
      <h1 className="section-header">{t('Automation Engine', 'Αυτοματισμοί')}</h1>
     </div>
     <p className="text-sm text-stone-500">{t('Orchestrate intelligent workflows and event-driven logic across the platform.', 'Οργάνωσε έξυπνες ροές και λογική με βάση γεγονότα σε όλη την πλατφόρμα.')}</p>
     {isDemoMode && <p className="text-xs text-stone-500 mt-1">{t('Sample account — automation data appears for real accounts.', 'Δοκιμαστικός λογαριασμός — τα δεδομένα αυτοματισμών εμφανίζονται σε πραγματικούς λογαριασμούς.')}</p>}
    </div>
    <div className="flex gap-2">
     <Button variant="outline" className="gap-2 h-9 px-4 text-xs font-medium">
      <Activity className="w-3.5 h-3.5" /> {t('System Health', 'Υγεία συστήματος')}
     </Button>
     <Button className="gap-2 h-9 px-4 text-xs font-medium" onClick={() => setIsCreateModalOpen(true)}>
      <Plus className="w-3.5 h-3.5" /> {t('Create Workflow', 'Δημιουργία ροής')}
     </Button>
    </div>
   </div>

   {/* Stats Overview */}
   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    {[
     { label: t('Active Workflows', 'Ενεργές ροές'), value: rules.filter(r => r.status === 'Active').length, icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
     { label: t('Total Executions', 'Σύνολο εκτελέσεων'), value: executions.length, icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
     { label: t('Success Rate', 'Ποσοστό επιτυχίας'), value: executions.length ? `${Math.round((100 * executions.filter((item) => item.status === 'Success').length) / executions.length)}%` : '—', icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
     { label: t('Failed (24h)', 'Αποτυχίες (24ω)'), value: rules.reduce((acc, r) => acc + (r.failureCount ?? 0), 0), icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
    ].map((stat) => (
     <Card key={stat.label} className="p-4 border border-stone-100">
      <div className="flex items-center justify-between">
       <div className={cn("p-1.5 rounded-lg", stat.bg)}>
        <stat.icon className={cn("w-4 h-4", stat.color)} />
       </div>
       <span className="text-lg font-semibold tracking-tight text-stone-900">{stat.value}</span>
      </div>
      <p className="text-micro mt-3">{stat.label}</p>
     </Card>
    ))}
   </div>

   {/* Tabs */}
   <div className="scroll-tabs p-1 bg-stone-100/80 rounded-lg">
    {[
     { id: 'rules', label: t('Workflow Rules', 'Κανόνες ροών'), icon: Settings2 },
     { id: 'executions', label: t('Recent Executions', 'Πρόσφατες εκτελέσεις'), icon: Activity },
     { id: 'logs', label: t('System Logs', 'Καταγραφές συστήματος'), icon: History },
     { id: 'templates', label: t('Templates', 'Πρότυπα'), icon: Mail },
    ].map((tab) => (
     <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id as any)}
      className={cn(
       "flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all",
       activeTab === tab.id 
        ? "bg-white text-stone-900 shadow-sm" 
        : "text-stone-400 hover:text-stone-600"
      )}
     >
      <tab.icon className="w-3.5 h-3.5" />
      {tab.label}
     </button>
    ))}
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
    <div className="lg:col-span-12">
     <AnimatePresence mode="wait">
      {activeTab === 'rules' && (
       <motion.div
        key="rules"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-6"
       >
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
         <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
          <input 
           type="text" 
           placeholder={t('Search workflows...', 'Αναζήτηση ροών...')}
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
           className="w-full pl-10 pr-4 py-2 bg-stone-50/50 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all"
          />
         </div>
         <div className="flex gap-2">
          <select 
           value={filterStatus}
           onChange={(e) => setFilterStatus(e.target.value as any)}
           className="px-3 py-2 bg-stone-50/50 border border-stone-200 rounded-lg focus:ring-2 ring-stone-900/5 focus:border-stone-400 outline-none transition-all font-medium text-xs"
          >
           <option value="All">{t('All Status', 'Όλες οι καταστάσεις')}</option>
           <option value="Active">{t('Active Only', 'Μόνο ενεργές')}</option>
           <option value="Inactive">{t('Inactive Only', 'Μόνο ανενεργές')}</option>
          </select>
          <Button
           variant="outline"
           className="gap-2 h-9 px-4 text-xs font-medium"
           disabled={!rulesFiltersActive}
           onClick={() => { setSearchQuery(''); setFilterStatus('All'); }}
          >
           <Filter className="w-3.5 h-3.5" /> {t('Clear filters', 'Καθάρισε τα φίλτρα')}
          </Button>
         </div>
        </div>

        {/* Rules List */}
        {loading ? (
         <div className="bg-white rounded-2xl border border-stone-100 p-3">
          <SkeletonList count={4} />
         </div>
        ) : filteredRules.length === 0 ? (
         <EmptyHint
          title={rulesFiltersActive
           ? t('No workflow matches these filters', 'Καμία ροή δεν ταιριάζει με αυτά τα φίλτρα')
           : isDemoMode
            ? t('Workflows are not part of the sample', 'Οι ροές δεν περιλαμβάνονται στο δείγμα')
            : t('No workflows yet', 'Δεν υπάρχουν ροές ακόμη')}
          detail={rulesFiltersActive
           ? t('Clear the filters to see every workflow.', 'Καθάρισε τα φίλτρα για να δεις όλες τις ροές.')
           : isDemoMode
            ? t('Sign in with an admin account to create and run real workflows.', 'Συνδέσου με λογαριασμό διαχειριστή για να δημιουργήσεις και να εκτελέσεις πραγματικές ροές.')
            : t('Create a workflow to send reminders and follow-ups automatically.', 'Δημιούργησε μια ροή για να στέλνονται υπενθυμίσεις και follow-up αυτόματα.')}
         >
          {rulesFiltersActive ? (
           <button type="button" onClick={() => { setSearchQuery(''); setFilterStatus('All'); }} className="text-xs font-medium text-stone-900 hover:underline">
            {t('Clear filters', 'Καθάρισε τα φίλτρα')}
           </button>
          ) : !isDemoMode ? (
           <button type="button" onClick={() => setIsCreateModalOpen(true)} className="text-xs font-medium text-stone-900 hover:underline">
            {t('New workflow', 'Νέα ροή')}
           </button>
          ) : null}
         </EmptyHint>
        ) : (
        <div className="grid grid-cols-1 gap-3">
         {filteredRules.map((rule) => (
          <Card key={rule.id} className={cn(
           "p-5 border transition-all hover:border-stone-300",
           rule.status === 'Active' ? "border-stone-100" : "border-stone-50 opacity-75"
          )}>
           <div className="flex flex-col lg:flex-row gap-5">
            <div className="flex-1 space-y-4">
             <div className="flex items-start justify-between">
              <div className="space-y-0.5">
               <div className="flex items-center gap-2.5">
                <h3 className="text-base font-medium text-stone-900">{workflowName(rule.name)}</h3>
                <span className={cn(
                 "px-2 py-0.5 rounded text-xs font-medium tracking-wider",
                 rule.status === 'Active' ? "bg-green-50 text-green-700 border border-green-100" : "bg-stone-50 text-stone-500 border border-stone-100"
                )}>
                 {labelOf(rule.status)}
                </span>
               </div>
               <p className="text-xs text-stone-500">{workflowDescription(rule.description)}</p>
              </div>
              <div className="flex items-center gap-1.5">
               <button 
                onClick={() => handleToggleRule(rule.id)}
                className={cn(
                 "p-1.5 rounded-md transition-colors",
                 rule.status === 'Active' ? "text-amber-600 hover:bg-amber-50" : "text-green-600 hover:bg-green-50"
                )}
                title={rule.status === 'Active' ? t('Pause Workflow', 'Παύση ροής') : t('Resume Workflow', 'Συνέχεια ροής')}
               >
                {rule.status === 'Active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
               </button>
               <button 
                onClick={() => handleRunNow(rule.id)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title={t('Run Now', 'Εκτέλεση τώρα')}
               >
                <Play className="w-4 h-4" />
               </button>
               <button 
                onClick={() => handleDeleteRule(rule.id)}
                className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title={t('Delete Workflow', 'Διαγραφή ροής')}
               >
                <MoreVertical className="w-4 h-4" />
               </button>
              </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-stone-100">
              <div className="space-y-2">
               <p className="text-micro">{t('Trigger', 'Εκδήλωση')}</p>
               <div className="flex items-center gap-2 text-xs font-medium text-stone-700">
                <div className="p-1.5 bg-stone-100 rounded-lg">
                 {getTriggerIcon(rule.triggerType)}
                </div>
                {triggerName(rule.triggerType)}
               </div>
              </div>
              <div className="space-y-2">
               <p className="text-micro">{t('Conditions', 'Συνθήκες')}</p>
               <div className="flex flex-wrap gap-1.5">
                {rule.conditions.length > 0 ? rule.conditions.map((c, idx) => (
                 <span key={idx} className="px-2 py-1 bg-stone-50 border border-stone-100 rounded text-xs font-mono text-stone-600">
                  {c.field} {c.operator} {c.value}
                 </span>
                )) : (
                 <span className="text-xs text-stone-400 italic">{t('No conditions', 'Χωρίς συνθήκες')}</span>
                )}
               </div>
              </div>
              <div className="space-y-2">
               <p className="text-micro">{t('Actions', 'Ενέργειες')}</p>
               <div className="flex flex-wrap gap-2">
                {rule.actions.map((a, idx) => (
                 <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-stone-900 text-white rounded text-xs font-medium tracking-wider">
                  {getActionIcon(a.type)}
                  {actionName(a.type)}
                 </div>
                ))}
               </div>
              </div>
             </div>

             <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-6 text-micro">
               <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-stone-300" />
                {t('Last Run:', 'Τελευταία εκτέλεση:')} {rule.lastRunAt ? formatTime(rule.lastRunAt) : t('Never', 'Ποτέ')}
               </div>
               <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3 text-red-300" />
                {t('Failures:', 'Αποτυχίες:')} {rule.failureCount || 0}
               </div>
              </div>
              <Button
               variant="ghost"
               size="sm"
               className="text-xs font-medium tracking-wider gap-1.5 h-8 px-3"
               onClick={() => setActiveTab('logs')}
              >
               {t('View Logs', 'Προβολή καταγραφών')} <ChevronRight className="w-3 h-3" />
              </Button>
             </div>
            </div>
           </div>
          </Card>
         ))}
        </div>
        )}
       </motion.div>
      )}

      {activeTab === 'executions' && (
       <motion.div
        key="executions"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-6"
       >
        <Card noPadding className="border border-stone-100 overflow-hidden">
         <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
           <thead>
            <tr className="bg-stone-50/50 border-b border-stone-100">
             <th className="px-5 py-3 text-micro">{t('Execution ID', 'ID εκτέλεσης')}</th>
             <th className="px-5 py-3 text-micro">{t('Workflow', 'Ροή')}</th>
             <th className="px-5 py-3 text-micro">{t('Target Entity', 'Οντότητα στόχος')}</th>
             <th className="px-5 py-3 text-micro">{t('Status', 'Κατάσταση')}</th>
             <th className="px-5 py-3 text-micro">{t('Started At', 'Έναρξη')}</th>
             <th className="px-5 py-3 text-micro text-right">{t('Actions', 'Ενέργειες')}</th>
            </tr>
           </thead>
           <tbody className="divide-y divide-stone-100">
            {executions.map((exec) => (
             <tr key={exec.id} className="hover:bg-stone-50/50 transition-colors">
              <td className="px-5 py-3 text-xs font-mono text-stone-500">{exec.id}</td>
              <td className="px-5 py-3">
               <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium text-stone-900">
                 {workflowName(rules.find(r => r.id === exec.ruleId)?.name || "") || t('Unknown Rule', 'Άγνωστος κανόνας')}
                </span>
               </div>
              </td>
              <td className="px-5 py-3 text-xs text-stone-600">{exec.triggerEntityId}</td>
              <td className="px-5 py-3">
               <span className={cn(
                "px-2 py-0.5 rounded text-xs font-medium tracking-wider",
                exec.status === 'Success' ? "text-green-700" : 
                exec.status === 'Failure' ? "text-red-700" : "text-blue-700"
               )}>
                {labelOf(exec.status)}
               </span>
              </td>
              <td className="px-5 py-3 text-xs text-stone-500">
               {exec.startedAt ? formatDateTime(exec.startedAt) : "-"}
              </td>
              <td className="px-5 py-3 text-right">
               <span className="inline-flex h-7 w-7 items-center justify-center text-stone-400" title={t('Execution details are not available yet', 'Οι λεπτομέρειες εκτέλεσης δεν είναι διαθέσιμες ακόμη')}>
                <Info className="w-3.5 h-3.5" aria-hidden="true" />
               </span>
              </td>
             </tr>
            ))}
           </tbody>
          </table>
         </div>
        </Card>
       </motion.div>
      )}

      {activeTab === 'logs' && (
       <motion.div
        key="logs"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-4"
       >
        {loading ? (
         <div className="bg-white rounded-2xl border border-stone-100 p-3"><SkeletonList count={3} /></div>
        ) : logs.length === 0 ? (
         <EmptyHint
          title={t('No log entries', 'Δεν υπάρχουν καταγραφές')}
          detail={isDemoMode
           ? t('Logs appear once real workflows start running.', 'Οι καταγραφές εμφανίζονται μόλις αρχίσουν να εκτελούνται πραγματικές ροές.')
           : t('Every workflow run will be recorded here, with its trigger, conditions and result.', 'Κάθε εκτέλεση ροής καταγράφεται εδώ, με την εκδήλωση, τις συνθήκες και το αποτέλεσμα.')}
         />
        ) : null}
        {logs.map((log) => (
         <div key={log.id} className={cn(
          "p-4 rounded-xl border flex items-start gap-4 transition-all hover:shadow-sm",
          log.level === 'Error' ? "bg-red-50 border-red-100" : 
          log.level === 'Warning' ? "bg-amber-50 border-amber-100" : "bg-white border-stone-100"
         )}>
          <div className={cn(
           "p-2 rounded-lg shrink-0",
           log.level === 'Error' ? "bg-red-100 text-red-600" : 
           log.level === 'Warning' ? "bg-amber-100 text-amber-600" : "bg-stone-100 text-stone-600"
          )}>
           {log.level === 'Error' ? <AlertCircle className="w-4 h-4" /> : 
            log.level === 'Warning' ? <AlertCircle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          </div>
          <div className="flex-1 space-y-1">
           <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-stone-900">{logMessage(log.message)}</p>
            <span className="text-xs font-medium text-stone-400 tracking-wide">
             {formatTime(log.createdAt ?? 0)}
            </span>
           </div>
           <div className="flex items-center gap-4 text-xs font-medium text-stone-400 tracking-wide">
            <span>{t('Rule:', 'Κανόνας:')} {workflowName(rules.find(r => r.id === log.ruleId)?.name || '')}</span>
            <span>{t('Execution:', 'Εκτέλεση:')} {log.executionId}</span>
           </div>
           {log.metadata && (
            <div className="mt-4 space-y-4">
             {log.metadata.trigger && (
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-100">
               <p className="text-xs font-medium text-stone-400 tracking-wide mb-2">{t('Trigger Details', 'Στοιχεία εκδήλωσης')}</p>
               <div className="flex items-center gap-4 text-xs">
                <span className="font-medium text-stone-700">{triggerName(log.metadata.trigger.type)}</span>
                <span className="text-stone-500">{t('Entity:', 'Οντότητα:')} {log.metadata.trigger.entityId}</span>
               </div>
              </div>
             )}

             {log.metadata.conditionsMet && (
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-100">
               <p className="text-xs font-medium text-stone-400 tracking-wide mb-2">{t('Conditions Met', 'Συνθήκες που πληρούνται')}</p>
               <div className="space-y-1">
                {log.metadata.conditionsMet.map((c: any, i: number) => (
                 <div key={i} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <span className="text-stone-600">{c.field} {c.operator} {c.value}</span>
                  <span className="text-stone-400">({t('Actual:', 'Πραγματική:')} {c.actual})</span>
                 </div>
                ))}
               </div>
              </div>
             )}

             {log.metadata.actionsTaken && (
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-100">
               <p className="text-xs font-medium text-stone-400 tracking-wide mb-2">{t('Actions Performed', 'Ενέργειες που έγιναν')}</p>
               <div className="space-y-2">
                {log.metadata.actionsTaken.map((a: any, i: number) => (
                 <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                   <ArrowRight className="w-3 h-3 text-stone-400" />
                   <span className="font-medium text-stone-700">{actionName(a.type)}</span>
                   {a.templateId && <span className="text-stone-500">{t('Template:', 'Πρότυπο:')} {a.templateId}</span>}
                  </div>
                  <span className={cn(
                   "px-1.5 py-0.5 rounded text-xs font-medium tracking-wider",
                   a.status === 'success' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                   {a.status === 'success' ? t('success', 'επιτυχία') : a.status === 'failed' ? t('failed', 'αποτυχία') : a.status}
                  </span>
                 </div>
                ))}
               </div>
              </div>
             )}

             {log.metadata.error && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-100">
               <p className="text-xs font-medium text-red-400 tracking-wide mb-2">{t('Error Details', 'Στοιχεία σφάλματος')}</p>
               <p className="text-xs text-red-700 font-medium">{log.metadata.error}</p>
               {log.metadata.stackTrace && (
                <pre className="mt-2 p-2 bg-red-900/10 text-red-800 rounded text-xs overflow-x-auto font-mono">
                 {log.metadata.stackTrace}
                </pre>
               )}
              </div>
             )}

             <details className="group">
              <summary className="text-xs font-medium text-stone-400 tracking-wide cursor-pointer hover:text-stone-600 transition-colors flex items-center gap-1">
               <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
               {t('Raw Payload', 'Ακατέργαστο payload')}
              </summary>
              <pre className="mt-2 p-2 bg-stone-900 text-stone-300 rounded-lg text-xs overflow-x-auto">
               {JSON.stringify(log.metadata, null, 2)}
              </pre>
             </details>
            </div>
           )}
          </div>
         </div>
        ))}
       </motion.div>
      )}
      {activeTab === 'templates' && (
       <motion.div
        key="templates"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-8"
       >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="space-y-4">
          <h3 className="text-base font-semibold flex items-center gap-2">
           <Mail className="w-5 h-5 text-blue-500" />
           {t('Email Templates', 'Πρότυπα email')}
          </h3>
          <div className="grid gap-4">
           {emailTemplates.map(template => (
            <Card key={template.id} className="p-4 hover:border-stone-300 transition-all cursor-pointer group">
             <div className="flex items-start justify-between">
              <div>
               <h4 className="font-medium text-stone-900">{templateName(template.name)}</h4>
               <p className="text-xs text-stone-500 mt-1">{templateLine(template.subject)}</p>
              </div>
              <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-xs font-medium tracking-wider">
               {labelOf(template.category) || templateLine(template.category ?? '')}
              </span>
             </div>
             <div className="mt-4 p-3 bg-stone-50 rounded-lg border border-stone-100 text-xs text-stone-600 line-clamp-2">
              {templateLine(template.body)}
             </div>
            </Card>
           ))}
          </div>
         </div>

         <div className="space-y-4">
          <h3 className="text-base font-semibold flex items-center gap-2">
           <Bell className="w-5 h-5 text-amber-500" />
           {t('In-App Notifications', 'Ειδοποιήσεις στην εφαρμογή')}
          </h3>
          <div className="grid gap-4">
           {notificationTemplates.map(template => (
            <Card key={template.id} className="p-4 hover:border-stone-300 transition-all cursor-pointer group">
             <div className="flex items-start justify-between">
              <div>
               <h4 className="font-medium text-stone-900">{templateName(template.name)}</h4>
               <p className="text-xs text-stone-500 mt-1">{templateLine(template.title)}</p>
              </div>
              <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-xs font-medium tracking-wider">
               {labelOf(template.category) || templateLine(template.category ?? '')}
              </span>
             </div>
             <div className="mt-4 p-3 bg-stone-50 rounded-lg border border-stone-100 text-xs text-stone-600 line-clamp-2">
              {templateLine(template.body)}
             </div>
            </Card>
           ))}
          </div>
         </div>
        </div>
       </motion.div>
      )}
     </AnimatePresence>
    </div>
   </div>

   {/* Create Workflow Modal */}
   <AnimatePresence>
    {isCreateModalOpen && (
     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/20 backdrop-blur-[2px]">
      <motion.div
       initial={{ opacity: 0, scale: 0.98, y: 10 }}
       animate={{ opacity: 1, scale: 1, y: 0 }}
       exit={{ opacity: 0, scale: 0.98, y: 10 }}
       className="relative w-full max-w-xl bg-white rounded-2xl shadow-sm overflow-hidden border border-stone-100"
      >
       <div className="p-6 border-b border-stone-100">
        <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
          <div className="p-1.5 bg-stone-900 text-white rounded-lg">
           <Plus className="w-4 h-4" />
          </div>
          <div>
           <h3 className="text-base font-semibold tracking-tight">{t('New Automation Workflow', 'Νέα ροή αυτοματισμού')}</h3>
           <p className="text-xs text-stone-500">{t('Define triggers and actions for your platform.', 'Όρισε εκδηλώσεις και ενέργειες για την πλατφόρμα.')}</p>
          </div>
         </div>
         <button 
          type="button"
          aria-label={t('Close', 'Κλείσιμο')}
          onClick={() => setIsCreateModalOpen(false)}
          className="p-1.5 hover:bg-stone-100 rounded-md transition-colors text-stone-400 hover:text-stone-900"
         >
          <ChevronDown className="w-5 h-5" />
         </button>
        </div>
       </div>

       <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-5">
         <div className="space-y-1.5">
          <label className="text-micro">{t('Workflow Name', 'Όνομα ροής')}</label>
          <input 
           type="text" 
           placeholder={t('e.g. Welcome Series', 'π.χ. Σειρά καλωσορίσματος')}
           className="w-full px-3 py-2.5 bg-stone-50/50 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all"
          />
         </div>
         <div className="space-y-1.5">
          <label className="text-micro">{t('Trigger Type', 'Τύπος εκδήλωσης')}</label>
          <select className="w-full px-3 py-2.5 bg-stone-50/50 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all font-medium">
           <option value="UserSignup">{triggerName('UserSignup')}</option>
           <option value="ProfileCompleted">{triggerName('ProfileCompleted')}</option>
           <option value="InactivityDetected">{triggerName('InactivityDetected')}</option>
           <option value="MatchGenerated">{triggerName('MatchGenerated')}</option>
          </select>
         </div>
        </div>

        <div className="space-y-1.5">
         <label className="text-micro">{t('Description', 'Περιγραφή')}</label>
         <textarea 
          placeholder={t('What does this workflow do?', 'Τι κάνει αυτή η ροή;')}
          rows={3}
          className="w-full px-3 py-2.5 bg-stone-50/50 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all"
         />
        </div>

        <div className="space-y-3">
         <div className="flex items-center justify-between">
          <label className="text-micro">{t('Actions', 'Ενέργειες')}</label>
          <Button variant="ghost" size="sm" className="h-7 text-xs font-medium tracking-wider gap-1 px-2">
           <Plus className="w-3 h-3" /> {t('Add Action', 'Προσθήκη ενέργειας')}
          </Button>
         </div>
         <div className="p-3.5 bg-stone-50/50 border border-stone-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
           <div className="p-1.5 bg-white rounded-lg border border-stone-100 shadow-sm">
            <Mail className="w-3.5 h-3.5 text-blue-500" />
           </div>
           <div>
            <p className="text-xs font-medium text-stone-900">{t('Send Email', 'Αποστολή email')}</p>
            <p className="text-xs text-stone-500">{t('Template:', 'Πρότυπο:')} onboarding_nudge</p>
           </div>
          </div>
          <span className="inline-flex h-7 w-7 items-center justify-center text-stone-300" title={t('Sample step. Editing steps is not available yet.', 'Δείγμα βήματος. Η επεξεργασία βημάτων δεν είναι διαθέσιμη ακόμη.')}>
           <MoreVertical className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
         </div>
        </div>
       </div>

       <div className="p-6 bg-stone-50/50 border-t border-stone-100 flex justify-end gap-2">
        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="h-10 px-6 text-xs font-medium">{t('Cancel', 'Ακύρωση')}</Button>
        <Button onClick={() => setIsCreateModalOpen(false)} className="h-10 px-6 text-xs font-medium">{t('Create Workflow', 'Δημιουργία ροής')}</Button>
       </div>
      </motion.div>
     </div>
    )}
   </AnimatePresence>
  </div>
 );
}
