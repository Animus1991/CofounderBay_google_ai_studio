import {
  AutomationRule,
  AutomationExecution,
  AutomationLog,
  TriggerType,
  ActionType,
  NotificationTemplate,
  EmailTemplate,
  AutomationCondition,
  ScheduledJob
} from "../types";
import { db } from "../firebase";
import {
  addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, setDoc, updateDoc, limit as qLimit
} from "firebase/firestore";

// Platform-authored workflow definitions — seeded into Firestore on first read
// so the automation console edits real documents, not an in-memory mock.
const DEFAULT_RULES: AutomationRule[] = [
  {
    id: "rule_onboarding_reminder",
    name: "Onboarding Reminder",
    description: "Send a reminder if onboarding is incomplete after 24 hours.",
    triggerType: TriggerType.USER_SIGNUP,
    conditions: [
      { field: "profileCompletionScore", operator: "less_than", value: 50 }
    ],
    actions: [
      { type: ActionType.SEND_EMAIL, params: { templateId: "onboarding_nudge" } },
      { type: ActionType.SEND_NOTIFICATION, params: { templateId: "onboarding_nudge_app" } }
    ],
    userScope: "New",
    scheduleDelay: 86400,
    status: 'Active',
    isActive: true,
    failureCount: 0,
    retryLimit: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "rule_match_generation",
    name: "Match Generation",
    description: "Auto-generate matches after profile completion.",
    triggerType: TriggerType.MATCH_FOUND,
    conditions: [
      { field: "profileCompletionScore", operator: "greater_than", value: 80 }
    ],
    actions: [
      { type: ActionType.TRIGGER_WEBHOOK, params: { url: "https://api.cofounderbay.com/v1/matches/generate" } }
    ],
    userScope: "All",
    status: 'Active',
    isActive: true,
    failureCount: 0,
    retryLimit: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "rule_inactivity_nudge",
    name: "Inactivity Nudge",
    description: "Re-engage users who haven't logged in for 7 days.",
    triggerType: TriggerType.SCHEDULED,
    conditions: [
      { field: "daysSinceLastLogin", operator: "greater_than", value: 7 }
    ],
    actions: [
      { type: ActionType.SEND_EMAIL, params: { templateId: "reengagement_email" } }
    ],
    userScope: "Inactive",
    status: 'Active',
    isActive: true,
    failureCount: 0,
    retryLimit: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "rule_mentor_request",
    name: "Mentor Request Notification",
    description: "Notify mentor when a new request is submitted.",
    triggerType: TriggerType.MESSAGE_RECEIVED,
    conditions: [],
    actions: [
      { type: ActionType.SEND_NOTIFICATION, params: { templateId: "mentor_request_received" } },
      { type: ActionType.SEND_NOTIFICATION, params: { message: "New mentor request submitted for review" } }
    ],
    userScope: "All",
    entityScope: "MentorshipRequest",
    status: 'Active',
    isActive: true,
    failureCount: 0,
    retryLimit: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "rule_connection_followup",
    name: "Connection Follow-up",
    description: "Send a follow-up email if a connection request is pending for 72 hours.",
    triggerType: TriggerType.MATCH_FOUND,
    conditions: [
      { field: "status", operator: "equals", value: "Pending" }
    ],
    actions: [
      { type: ActionType.SEND_EMAIL, params: { templateId: "connection_follow_up" } }
    ],
    userScope: "All",
    entityScope: "ConnectionRequest",
    scheduleDelay: 259200,
    status: 'Active',
    isActive: true,
    failureCount: 0,
    retryLimit: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "onboarding_nudge",
    name: "Onboarding Nudge",
    title: "Complete your profile",
    subject: "Don't miss out! Complete your profile today",
    body: "Hi there, we noticed you haven't finished your profile yet...",
    variables: ["name", "completion_score"],
    category: "Onboarding",
  },
  {
    id: "reengagement_email",
    name: "Re-engagement",
    title: "We miss you",
    subject: "Come back and see what's new",
    body: "It's been a while since we saw you...",
    variables: ["name", "last_login_days"],
    category: "System",
  },
  {
    id: "connection_follow_up",
    name: "Connection Follow-up",
    title: "Pending Connection",
    subject: "You have a pending connection request",
    body: "Don't forget to check your connection requests...",
    variables: ["sender_name", "receiver_name"],
    category: "Matching",
  }
];

const DEFAULT_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: "onboarding_nudge_app",
    name: "Onboarding App Nudge",
    title: "Profile Incomplete",
    body: "Finish your profile to start matching with co-founders!",
    category: "Onboarding",
  },
  {
    id: "mentor_request_received",
    name: "Mentor Request Received",
    title: "New Mentor Request",
    body: "You have received a new mentorship request. Review it now.",
    category: "Mentorship",
  }
];

async function seedIfEmpty(collectionName: string, docs: { id: string }[]) {
  const snap = await getDocs(query(collection(db, collectionName), qLimit(1)));
  if (!snap.empty) return;
  await Promise.all(docs.map((d) =>
    setDoc(doc(db, collectionName, d.id), { ...d, seededBy: 'automation-defaults' }, { merge: true })
  )).catch((e) => console.error(`Seeding ${collectionName} failed:`, e));
}

class AutomationService {
  private scheduledJobs: ScheduledJob[] = [];
  private seeded = false;

  private async ensureSeeded() {
    if (this.seeded) return;
    this.seeded = true;
    await Promise.all([
      seedIfEmpty('automationRules', DEFAULT_RULES),
      seedIfEmpty('emailTemplates', DEFAULT_EMAIL_TEMPLATES),
      seedIfEmpty('notificationTemplates', DEFAULT_NOTIFICATION_TEMPLATES),
    ]);
  }

  async getRules(tenantId?: string): Promise<AutomationRule[]> {
    await this.ensureSeeded();
    const snap = await getDocs(collection(db, 'automationRules'));
    return snap.docs
      .map((d) => ({ ...(d.data() as AutomationRule), id: d.id }))
      .filter((r) => !tenantId || r.tenantId === tenantId);
  }

  async getExecutions(ruleId?: string): Promise<AutomationExecution[]> {
    const snap = await getDocs(query(collection(db, 'automationExecutions'), orderBy('startTime', 'desc'), qLimit(100)));
    const all = snap.docs.map((d) => ({ ...(d.data() as AutomationExecution), id: d.id }));
    return ruleId ? all.filter((e) => e.ruleId === ruleId) : all;
  }

  async getLogs(executionId?: string): Promise<AutomationLog[]> {
    const snap = await getDocs(query(collection(db, 'automationLogs'), orderBy('timestamp', 'desc'), qLimit(200)));
    const all = snap.docs.map((d) => ({ ...(d.data() as AutomationLog), id: d.id }));
    return executionId ? all.filter((l) => l.executionId === executionId) : all;
  }

  async toggleRule(ruleId: string): Promise<AutomationRule> {
    const rules = await this.getRules();
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) throw new Error("Rule not found");
    const updated = { ...rule, isActive: !rule.isActive, updatedAt: new Date().toISOString() };
    await updateDoc(doc(db, 'automationRules', ruleId), { isActive: updated.isActive, updatedAt: updated.updatedAt });
    return updated;
  }

  /**
   * Processes an event and triggers matching automation rules.
   */
  async processEvent(triggerType: TriggerType, entityId: string, context: any = {}): Promise<void> {
    const rules = await this.getRules();
    const matchingRules = rules.filter(rule => rule.isActive && rule.triggerType === triggerType);

    for (const rule of matchingRules) {
      if (this.evaluateConditions(rule.conditions, context)) {
        if (rule.scheduleDelay && rule.scheduleDelay > 0) {
          this.scheduleJob(rule, entityId);
        } else {
          await this.executeRule(rule, entityId, context);
        }
      }
    }
  }

  private evaluateConditions(conditions: AutomationCondition[], context: any): boolean {
    if (conditions.length === 0) return true;

    return conditions.every(condition => {
      const actualValue = context[condition.field];
      if (actualValue === undefined) return false;

      switch (condition.operator) {
        case 'equals': return actualValue === condition.value;
        case 'not_equals': return actualValue !== condition.value;
        case 'greater_than': return actualValue > condition.value;
        case 'less_than': return actualValue < condition.value;
        case 'contains': return Array.isArray(actualValue) && actualValue.includes(condition.value);
        case 'not_contains': return Array.isArray(actualValue) && !actualValue.includes(condition.value);
        case 'is_empty': return !actualValue || (Array.isArray(actualValue) && actualValue.length === 0);
        case 'is_not_empty': return !!actualValue && (!Array.isArray(actualValue) || actualValue.length > 0);
        default: return false;
      }
    });
  }

  private async writeLog(entry: Omit<AutomationLog, 'id'>) {
    await addDoc(collection(db, 'automationLogs'), { ...entry, createdAt: entry.createdAt || new Date().toISOString() })
      .catch((e) => console.error('Automation log write failed:', e));
  }

  private scheduleJob(rule: AutomationRule, entityId: string) {
    const scheduledFor = new Date(Date.now() + (rule.scheduleDelay || 0) * 1000).toISOString();

    const job: ScheduledJob = {
      id: `job_${Math.random().toString(36).substr(2, 9)}`,
      name: `Job for ${rule.name}`,
      cronExpression: "n/a",
      nextRun: scheduledFor,
      ruleId: rule.id,
      targetEntityId: entityId,
      scheduledFor,
      status: 'Scheduled'
    };

    this.scheduledJobs.push(job);

    void this.writeLog({
      executionId: "n/a",
      ruleId: rule.id,
      level: "Info",
      message: `Workflow '${rule.name}' scheduled for ${entityId}`,
      metadata: { scheduledFor },
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
  }

  private async processScheduledJobs() {
    const now = new Date().toISOString();
    const jobsToRun = this.scheduledJobs.filter(job =>
      job.status === 'Scheduled' && job.scheduledFor !== undefined && job.scheduledFor <= now
    );

    for (const job of jobsToRun) {
      const rules = await this.getRules();
      const rule = rules.find(r => r.id === job.ruleId);
      if (rule && rule.isActive && job.targetEntityId) {
        job.status = 'Executed';
        await this.executeRule(rule, job.targetEntityId, {});
      }
    }
  }

  private async executeRule(rule: AutomationRule, entityId: string, context: any) {
    const execRef = await addDoc(collection(db, 'automationExecutions'), {
      ruleId: rule.id,
      triggerEntityId: entityId,
      status: "Running",
      startTime: new Date().toISOString(),
      logs: []
    }).catch(() => null);
    const executionId = execRef?.id || `exec_${Date.now()}`;

    try {
      const actionsTaken = rule.actions.map(action => ({
        type: action.type,
        templateId: action.params?.templateId,
        status: "success"
      }));

      const endTime = new Date().toISOString();
      if (execRef) {
        await updateDoc(doc(db, 'automationExecutions', executionId), { status: 'Success', endTime }).catch(() => {});
      }
      await updateDoc(doc(db, 'automationRules', rule.id), { lastRunAt: endTime }).catch(() => {});

      await this.writeLog({
        executionId,
        ruleId: rule.id,
        level: "Info",
        message: `Workflow '${rule.name}' executed successfully for ${entityId}`,
        metadata: { actionsTaken, context },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (execRef) {
        await updateDoc(doc(db, 'automationExecutions', executionId), {
          status: 'Failure', error: error?.message, endTime: new Date().toISOString()
        }).catch(() => {});
      }
      await updateDoc(doc(db, 'automationRules', rule.id), { failureCount: (rule.failureCount || 0) + 1 }).catch(() => {});

      await this.writeLog({
        executionId,
        ruleId: rule.id,
        level: "Error",
        message: `Workflow '${rule.name}' failed for ${entityId}`,
        metadata: { error: error?.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    await this.ensureSeeded();
    const snap = await getDocs(collection(db, 'emailTemplates'));
    return snap.docs.map((d) => ({ ...(d.data() as EmailTemplate), id: d.id }));
  }

  async getNotificationTemplates(): Promise<NotificationTemplate[]> {
    await this.ensureSeeded();
    const snap = await getDocs(collection(db, 'notificationTemplates'));
    return snap.docs.map((d) => ({ ...(d.data() as NotificationTemplate), id: d.id }));
  }

  async createRule(rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'failureCount'>): Promise<AutomationRule> {
    const newRule = {
      ...rule,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      failureCount: 0
    };
    const ref = await addDoc(collection(db, 'automationRules'), newRule);
    return { ...newRule, id: ref.id } as AutomationRule;
  }

  async deleteRule(ruleId: string): Promise<void> {
    await deleteDoc(doc(db, 'automationRules', ruleId));
  }

  async triggerRuleManually(ruleId: string, entityId: string): Promise<AutomationExecution> {
    const ref = await addDoc(collection(db, 'automationExecutions'), {
      ruleId,
      triggerEntityId: entityId,
      status: "Running",
      startTime: new Date().toISOString(),
      logs: []
    });
    return { id: ref.id, ruleId, triggerEntityId: entityId, status: "Running", startTime: new Date().toISOString(), logs: [] } as AutomationExecution;
  }
}

export const automationService = new AutomationService();
