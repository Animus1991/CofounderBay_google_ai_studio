import { useState, useEffect } from "react";

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

 RefreshCw,

 Info,

 ChevronRight,

 ChevronDown

} from "lucide-react";

import { motion, AnimatePresence } from "motion/react";

import Button from "../../components/ui/Button";

import Card from "../../components/ui/Card";

import { automationService } from "../../services/automationService";

import { AutomationRule, AutomationExecution, AutomationLog, User, EmailTemplate, NotificationTemplate } from "../../types";

import { cn } from "../../lib/utils";



interface AutomationDashboardProps {

 user: User;

}



export default function AutomationDashboard({ user }: AutomationDashboardProps) {

 const [activeTab, setActiveTab] = useState<'rules' | 'executions' | 'logs' | 'templates'>('rules');

 const [rules, setRules] = useState<AutomationRule[]>([]);

 const [executions, setExecutions] = useState<AutomationExecution[]>([]);

 const [logs, setLogs] = useState<AutomationLog[]>([]);

 const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);

 const [notificationTemplates, setNotificationTemplates] = useState<NotificationTemplate[]>([]);

 const [loading, setLoading] = useState(true);

 const [searchQuery, setSearchQuery] = useState("");

 const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Inactive'>('All');

 const [selectedRule, setSelectedRule] = useState<string | null>(null);

 const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);



 useEffect(() => {

  const fetchData = async () => {

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

 }, []);



 const handleToggleRule = async (ruleId: string) => {

  try {

   const updatedRule = await automationService.toggleRule(ruleId);

   setRules(rules.map(r => r.id === ruleId ? updatedRule : r));

  } catch (error) {

   console.error("Failed to toggle rule", error);

  }

 };



 const handleRunNow = async (ruleId: string) => {

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

  <div className="space-y-6 max-w-7xl mx-auto">

   <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">

    <div>

     <div className="flex items-center gap-2.5 mb-1.5">

      <div className="p-1.5 bg-stone-900 text-white rounded-lg">

       <Zap className="w-4 h-4" />

      </div>

      <h2 className="section-header">Automation Engine</h2>

     </div>

     <p className="text-sm text-stone-500">Orchestrate intelligent workflows and event-driven logic across the platform.</p>

    </div>

    <div className="flex gap-2">

     <Button variant="outline" className="gap-2 h-9 px-4 text-xs font-medium">

      <Activity className="w-3.5 h-3.5" /> System Health

     </Button>

     <Button className="gap-2 h-9 px-4 text-xs font-medium" onClick={() => setIsCreateModalOpen(true)}>

      <Plus className="w-3.5 h-3.5" /> Create Workflow

     </Button>

    </div>

   </div>



   {/* Stats Overview */}

   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

    {[

     { label: "Active Workflows", value: rules.filter(r => r.status === 'Active').length, icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },

     { label: "Total Executions", value: executions.length, icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },

     { label: "Success Rate", value: "98.2%", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },

     { label: "Failed (24h)", value: rules.reduce((acc, r) => acc + (r.failureCount ?? 0), 0), icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },

    ].map((stat) => (

     <Card key={stat.label} className="p-4 border border-stone-100">

      <div className="flex items-center justify-between">

       <div className={cn("p-1.5 rounded-lg", stat.bg)}>

        <stat.icon className={cn("w-4 h-4", stat.color)} />

       </div>

       <span className="text-xl font-medium tracking-tight text-stone-900">{stat.value}</span>

      </div>

      <p className="text-micro mt-3">{stat.label}</p>

     </Card>

    ))}

   </div>



   {/* Tabs */}

   <div className="scroll-tabs p-1 bg-stone-100/80 rounded-lg">

    {[

     { id: 'rules', label: 'Workflow Rules', icon: Settings2 },

     { id: 'executions', label: 'Recent Executions', icon: Activity },

     { id: 'logs', label: 'System Logs', icon: History },

     { id: 'templates', label: 'Templates', icon: Mail },

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

           placeholder="Search workflows..."

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

           <option value="All">All Status</option>

           <option value="Active">Active Only</option>

           <option value="Inactive">Inactive Only</option>

          </select>

          <Button variant="outline" className="gap-2 h-9 px-4 text-xs font-medium">

           <Filter className="w-3.5 h-3.5" /> Advanced

          </Button>

         </div>

        </div>



        {/* Rules List */}

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

                <h3 className="text-base font-medium text-stone-900">{rule.name}</h3>

                <span className={cn(

                 "px-2 py-0.5 rounded text-xs font-medium tracking-wider",

                 rule.status === 'Active' ? "bg-green-50 text-green-700 border border-green-100" : "bg-stone-50 text-stone-500 border border-stone-100"

                )}>

                 {rule.status}

                </span>

               </div>

               <p className="text-xs text-stone-500">{rule.description}</p>

              </div>

              <div className="flex items-center gap-1.5">

               <button 

                onClick={() => handleToggleRule(rule.id)}

                className={cn(

                 "p-1.5 rounded-md transition-colors",

                 rule.status === 'Active' ? "text-amber-600 hover:bg-amber-50" : "text-green-600 hover:bg-green-50"

                )}

                title={rule.status === 'Active' ? "Pause Workflow" : "Resume Workflow"}

               >

                {rule.status === 'Active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}

               </button>

               <button 

                onClick={() => handleRunNow(rule.id)}

                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"

                title="Run Now"

               >

                <Play className="w-4 h-4" />

               </button>

               <button 

                onClick={() => handleDeleteRule(rule.id)}

                className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"

                title="Delete Workflow"

               >

                <MoreVertical className="w-4 h-4" />

               </button>

              </div>

             </div>



             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-stone-100">

              <div className="space-y-2">

               <p className="text-micro">Trigger</p>

               <div className="flex items-center gap-2 text-xs font-medium text-stone-700">

                <div className="p-1.5 bg-stone-100 rounded-lg">

                 {getTriggerIcon(rule.triggerType)}

                </div>

                {rule.triggerType}

               </div>

              </div>

              <div className="space-y-2">

               <p className="text-micro">Conditions</p>

               <div className="flex flex-wrap gap-1.5">

                {rule.conditions.length > 0 ? rule.conditions.map((c, idx) => (

                 <span key={idx} className="px-2 py-1 bg-stone-50 border border-stone-100 rounded text-xs font-mono text-stone-600">

                  {c.field} {c.operator} {c.value}

                 </span>

                )) : (

                 <span className="text-xs text-stone-400 italic">No conditions</span>

                )}

               </div>

              </div>

              <div className="space-y-2">

               <p className="text-micro">Actions</p>

               <div className="flex flex-wrap gap-2">

                {rule.actions.map((a, idx) => (

                 <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-stone-900 text-white rounded text-xs font-medium tracking-wider">

                  {getActionIcon(a.type)}

                  {a.type}

                 </div>

                ))}

               </div>

              </div>

             </div>



             <div className="flex items-center justify-between pt-4">

              <div className="flex items-center gap-6 text-micro">

               <div className="flex items-center gap-1.5">

                <Activity className="w-3 h-3 text-stone-300" />

                Last Run: {rule.lastRunAt ? new Date(rule.lastRunAt).toLocaleTimeString() : "Never"}

               </div>

               <div className="flex items-center gap-1.5">

                <AlertCircle className="w-3 h-3 text-red-300" />

                Failures: {rule.failureCount || 0}

               </div>

              </div>

              <Button variant="ghost" size="sm" className="text-xs font-medium tracking-wider gap-1.5 h-8 px-3">

               View Logs <ChevronRight className="w-3 h-3" />

              </Button>

             </div>

            </div>

           </div>

          </Card>

         ))}

        </div>

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

             <th className="px-5 py-3 text-micro">Execution ID</th>

             <th className="px-5 py-3 text-micro">Workflow</th>

             <th className="px-5 py-3 text-micro">Target Entity</th>

             <th className="px-5 py-3 text-micro">Status</th>

             <th className="px-5 py-3 text-micro">Started At</th>

             <th className="px-5 py-3 text-micro text-right">Actions</th>

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

                 {rules.find(r => r.id === exec.ruleId)?.name || "Unknown Rule"}

                </span>

               </div>

              </td>

              <td className="px-5 py-3 text-xs text-stone-600">{exec.triggerEntityId}</td>

              <td className="px-5 py-3">

               <span className={cn(

                "px-2 py-0.5 rounded text-xs font-medium tracking-wider",

                exec.status === 'Success' ? "bg-green-50 text-green-700 border border-green-100" : 

                exec.status === 'Failure' ? "bg-red-50 text-red-700 border border-red-100" : "bg-blue-50 text-blue-700 border border-blue-100"

               )}>

                {exec.status}

               </span>

              </td>

              <td className="px-5 py-3 text-xs text-stone-500">

               {exec.startedAt ? new Date(exec.startedAt).toLocaleString() : "-"}

              </td>

              <td className="px-5 py-3 text-right">

               <Button variant="ghost" size="icon" className="h-7 w-7 text-stone-400 hover:text-stone-900">

                <Info className="w-3.5 h-3.5" />

               </Button>

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

            <p className="text-sm font-medium text-stone-900">{log.message}</p>

            <span className="text-xs font-medium text-stone-400 tracking-wide">

             {new Date(log.createdAt ?? 0).toLocaleTimeString()}

            </span>

           </div>

           <div className="flex items-center gap-4 text-xs font-medium text-stone-400 tracking-wide">

            <span>Rule: {rules.find(r => r.id === log.ruleId)?.name}</span>

            <span>Execution: {log.executionId}</span>

           </div>

           {log.metadata && (

            <div className="mt-4 space-y-4">

             {log.metadata.trigger && (

              <div className="p-3 bg-stone-50 rounded-lg border border-stone-100">

               <p className="text-xs font-medium text-stone-400 tracking-wide mb-2">Trigger Details</p>

               <div className="flex items-center gap-4 text-xs">

                <span className="font-medium text-stone-700">{log.metadata.trigger.type}</span>

                <span className="text-stone-500">Entity: {log.metadata.trigger.entityId}</span>

               </div>

              </div>

             )}

             

             {log.metadata.conditionsMet && (

              <div className="p-3 bg-stone-50 rounded-lg border border-stone-100">

               <p className="text-xs font-medium text-stone-400 tracking-wide mb-2">Conditions Met</p>

               <div className="space-y-1">

                {log.metadata.conditionsMet.map((c: any, i: number) => (

                 <div key={i} className="flex items-center gap-2 text-xs">

                  <CheckCircle2 className="w-3 h-3 text-green-500" />

                  <span className="text-stone-600">{c.field} {c.operator} {c.value}</span>

                  <span className="text-stone-400">(Actual: {c.actual})</span>

                 </div>

                ))}

               </div>

              </div>

             )}



             {log.metadata.actionsTaken && (

              <div className="p-3 bg-stone-50 rounded-lg border border-stone-100">

               <p className="text-xs font-medium text-stone-400 tracking-wide mb-2">Actions Performed</p>

               <div className="space-y-2">

                {log.metadata.actionsTaken.map((a: any, i: number) => (

                 <div key={i} className="flex items-center justify-between text-xs">

                  <div className="flex items-center gap-2">

                   <ArrowRight className="w-3 h-3 text-stone-400" />

                   <span className="font-medium text-stone-700">{a.type}</span>

                   {a.templateId && <span className="text-stone-500">Template: {a.templateId}</span>}

                  </div>

                  <span className={cn(

                   "px-1.5 py-0.5 rounded text-xs font-medium tracking-wider",

                   a.status === 'success' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"

                  )}>

                   {a.status}

                  </span>

                 </div>

                ))}

               </div>

              </div>

             )}



             {log.metadata.error && (

              <div className="p-3 bg-red-50 rounded-lg border border-red-100">

               <p className="text-xs font-medium text-red-400 tracking-wide mb-2">Error Details</p>

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

               Raw Payload

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

          <h3 className="text-lg font-medium flex items-center gap-2">

           <Mail className="w-5 h-5 text-blue-500" />

           Email Templates

          </h3>

          <div className="grid gap-4">

           {emailTemplates.map(template => (

            <Card key={template.id} className="p-4 hover:border-stone-300 transition-all cursor-pointer group">

             <div className="flex items-start justify-between">

              <div>

               <h4 className="font-medium text-stone-900">{template.name}</h4>

               <p className="text-xs text-stone-500 mt-1">{template.subject}</p>

              </div>

              <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-xs font-medium tracking-wider">

               {template.category}

              </span>

             </div>

             <div className="mt-4 p-3 bg-stone-50 rounded-lg border border-stone-100 text-xs text-stone-600 line-clamp-2">

              {template.body}

             </div>

            </Card>

           ))}

          </div>

         </div>



         <div className="space-y-4">

          <h3 className="text-lg font-medium flex items-center gap-2">

           <Bell className="w-5 h-5 text-amber-500" />

           In-App Notifications

          </h3>

          <div className="grid gap-4">

           {notificationTemplates.map(template => (

            <Card key={template.id} className="p-4 hover:border-stone-300 transition-all cursor-pointer group">

             <div className="flex items-start justify-between">

              <div>

               <h4 className="font-medium text-stone-900">{template.name}</h4>

               <p className="text-xs text-stone-500 mt-1">{template.title}</p>

              </div>

              <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-xs font-medium tracking-wider">

               {template.category}

              </span>

             </div>

             <div className="mt-4 p-3 bg-stone-50 rounded-lg border border-stone-100 text-xs text-stone-600 line-clamp-2">

              {template.body}

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

           <h3 className="text-lg font-medium tracking-tight">New Automation Workflow</h3>

           <p className="text-xs text-stone-500">Define triggers and actions for your platform.</p>

          </div>

         </div>

         <button 

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

          <label className="text-micro">Workflow Name</label>

          <input 

           type="text" 

           placeholder="e.g. Welcome Series"

           className="w-full px-3 py-2.5 bg-stone-50/50 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all"

          />

         </div>

         <div className="space-y-1.5">

          <label className="text-micro">Trigger Type</label>

          <select className="w-full px-3 py-2.5 bg-stone-50/50 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all font-medium">

           <option>UserSignup</option>

           <option>ProfileCompleted</option>

           <option>InactivityDetected</option>

           <option>MatchGenerated</option>

          </select>

         </div>

        </div>



        <div className="space-y-1.5">

         <label className="text-micro">Description</label>

         <textarea 

          placeholder="What does this workflow do?"

          rows={3}

          className="w-full px-3 py-2.5 bg-stone-50/50 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all"

         />

        </div>



        <div className="space-y-3">

         <div className="flex items-center justify-between">

          <label className="text-micro">Actions</label>

          <Button variant="ghost" size="sm" className="h-7 text-xs font-medium tracking-wider gap-1 px-2">

           <Plus className="w-3 h-3" /> Add Action

          </Button>

         </div>

         <div className="p-3.5 bg-stone-50/50 border border-stone-200 rounded-xl flex items-center justify-between">

          <div className="flex items-center gap-3">

           <div className="p-1.5 bg-white rounded-lg border border-stone-100 shadow-sm">

            <Mail className="w-3.5 h-3.5 text-blue-500" />

           </div>

           <div>

            <p className="text-xs font-medium text-stone-900">Send Email</p>

            <p className="text-xs text-stone-500">Template: onboarding_nudge</p>

           </div>

          </div>

          <Button variant="ghost" size="icon" className="h-7 w-7 text-stone-400 hover:text-red-500">

           <MoreVertical className="w-3.5 h-3.5" />

          </Button>

         </div>

        </div>

       </div>



       <div className="p-6 bg-stone-50/50 border-t border-stone-100 flex justify-end gap-2">

        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="h-10 px-6 text-xs font-medium">Cancel</Button>

        <Button onClick={() => setIsCreateModalOpen(false)} className="h-10 px-6 text-xs font-medium">Create Workflow</Button>

       </div>

      </motion.div>

     </div>

    )}

   </AnimatePresence>

  </div>

 );

}

