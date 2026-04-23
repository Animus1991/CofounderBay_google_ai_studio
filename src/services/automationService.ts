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

class AutomationService {
  private rules: AutomationRule[] = [
    {
      id: "rule_1",
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
      scheduleDelay: 86400, // 24 hours in seconds
      status: 'Active',
      isActive: true,
      failureCount: 0,
      retryLimit: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "rule_2",
      name: "Match Generation",
      description: "Auto-generate matches after profile completion.",
      triggerType: TriggerType.MATCH_FOUND, // Using MATCH_FOUND as a placeholder for ProfileCompleted if not in enum
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
      id: "rule_3",
      name: "Inactivity Nudge",
      description: "Re-engage users who haven't logged in for 7 days.",
      triggerType: TriggerType.SCHEDULED, // Using SCHEDULED as a placeholder for InactivityDetected
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
      id: "rule_4",
      name: "Mentor Request Notification",
      description: "Notify mentor when a new request is submitted.",
      triggerType: TriggerType.MESSAGE_RECEIVED, // Using MESSAGE_RECEIVED as a placeholder for MentorRequestSubmitted
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
      id: "rule_5",
      name: "Connection Follow-up",
      description: "Send a follow-up email if a connection request is pending for 72 hours.",
      triggerType: TriggerType.MATCH_FOUND, // Using MATCH_FOUND as a placeholder for ConnectionRequestSent
      conditions: [
        { field: "status", operator: "equals", value: "Pending" }
      ],
      actions: [
        { type: ActionType.SEND_EMAIL, params: { templateId: "connection_follow_up" } }
      ],
      userScope: "All",
      entityScope: "ConnectionRequest",
      scheduleDelay: 259200, // 72 hours in seconds
      status: 'Active',
      isActive: true,
      failureCount: 0,
      retryLimit: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  
  private emailTemplates: EmailTemplate[] = [
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

  private notificationTemplates: NotificationTemplate[] = [
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

  private executions: AutomationExecution[] = [
    {
      id: "exec_1",
      ruleId: "rule_1",
      triggerEntityId: "user_123",
      status: "Success",
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() - 3590000).toISOString(),
      logs: []
    },
    {
      id: "exec_2",
      ruleId: "rule_2",
      triggerEntityId: "user_456",
      status: "Failure",
      startTime: new Date(Date.now() - 7200000).toISOString(),
      error: "Webhook timeout after 30s",
      logs: []
    }
  ];

  private logs: AutomationLog[] = [
    {
      id: "log_1",
      executionId: "exec_1",
      ruleId: "rule_1",
      level: "Info",
      message: "Workflow 'Onboarding Reminder' executed successfully for user_123",
      metadata: {
        trigger: { type: TriggerType.USER_SIGNUP, entityId: "user_123", timestamp: new Date(Date.now() - 3600000).toISOString() },
        conditionsMet: [
          { field: "profileCompletionScore", operator: "less_than", value: 50, actual: 25 },
          { field: "accountAgeHours", operator: "greater_than", value: 24, actual: 24.5 }
        ],
        actionsTaken: [
          { type: ActionType.SEND_EMAIL, templateId: "onboarding_nudge", status: "success" },
          { type: ActionType.SEND_NOTIFICATION, templateId: "onboarding_nudge_app", status: "success" }
        ]
      },
      timestamp: new Date(Date.now() - 3595000).toISOString()
    },
    {
      id: "log_2",
      executionId: "exec_2",
      ruleId: "rule_2",
      level: "Error",
      message: "Workflow 'Match Generation' failed for user_456",
      metadata: {
        trigger: { type: TriggerType.MATCH_FOUND, entityId: "user_456" },
        conditionsMet: [
          { field: "profileCompletionScore", operator: "greater_than", value: 80, actual: 85 }
        ],
        actionsTaken: [
          { type: ActionType.TRIGGER_WEBHOOK, url: "https://api.cofounderbay.com/v1/matches/generate", status: "failed", error: "Webhook timeout after 30s" }
        ],
        error: "Webhook timeout after 30s",
        stackTrace: "Error: Webhook timeout\n    at WebhookAction.execute (actions.ts:45:12)\n    at WorkflowEngine.run (engine.ts:120:25)"
      },
      timestamp: new Date(Date.now() - 7195000).toISOString()
    },
    {
      id: "log_3",
      executionId: "exec_3",
      ruleId: "rule_5",
      level: "Info",
      message: "Workflow 'Connection Follow-up' scheduled for request_789",
      metadata: {
        trigger: { type: TriggerType.MATCH_FOUND, entityId: "request_789" },
        scheduledFor: new Date(Date.now() + 259200000).toISOString()
      },
      timestamp: new Date().toISOString()
    }
  ];

  private scheduledJobs: ScheduledJob[] = [];

  constructor() {
    // Start the scheduler
    if (typeof window !== 'undefined') {
      setInterval(() => this.processScheduledJobs(), 60000); // Check every minute
    }
  }

  async getRules(tenantId?: string): Promise<AutomationRule[]> {
    return this.rules.filter(r => !tenantId || r.tenantId === tenantId);
  }

  async getExecutions(ruleId?: string): Promise<AutomationExecution[]> {
    return ruleId ? this.executions.filter(e => e.ruleId === ruleId) : this.executions;
  }

  async getLogs(executionId?: string): Promise<AutomationLog[]> {
    return executionId ? this.logs.filter(l => l.executionId === executionId) : this.logs;
  }

  async toggleRule(ruleId: string): Promise<AutomationRule> {
    const rule = this.rules.find(r => r.id === ruleId);
    if (!rule) throw new Error("Rule not found");
    rule.isActive = !rule.isActive;
    rule.updatedAt = new Date().toISOString();
    return rule;
  }

  /**
   * Processes an event and triggers matching automation rules.
   */
  async processEvent(triggerType: TriggerType, entityId: string, context: any = {}): Promise<void> {
    console.log(`[AutomationEngine] Processing event: ${triggerType} for entity: ${entityId}`);
    
    const matchingRules = this.rules.filter(rule => 
      rule.isActive && rule.triggerType === triggerType
    );

    for (const rule of matchingRules) {
      const conditionsMet = this.evaluateConditions(rule.conditions, context);
      
      if (conditionsMet) {
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
    console.log(`[AutomationEngine] Scheduled job ${job.id} for rule ${rule.name} at ${scheduledFor}`);
    
    // Log the scheduling
    this.logs.push({
      id: `log_${Math.random().toString(36).substr(2, 9)}`,
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
      job.status === 'Scheduled' && job.scheduledFor <= now
    );

    for (const job of jobsToRun) {
      const rule = this.rules.find(r => r.id === job.ruleId);
      if (rule && rule.isActive) {
        job.status = 'Executed';
        // In a real app, we'd fetch the latest context for the entity here
        await this.executeRule(rule, job.targetEntityId, { profileCompletionScore: 25 }); // Mock context
      }
    }
  }

  private async executeRule(rule: AutomationRule, entityId: string, context: any) {
    const execution: AutomationExecution = {
      id: `exec_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      triggerEntityId: entityId,
      status: "Running",
      startTime: new Date().toISOString(),
      logs: []
    };

    this.executions.push(execution);
    console.log(`[AutomationEngine] Executing rule: ${rule.name} for ${entityId}`);

    try {
      // Simulate action execution
      const actionsTaken = rule.actions.map(action => ({
        type: action.type,
        templateId: action.params?.templateId,
        status: "success"
      }));

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work

      execution.status = "Success";
      execution.endTime = new Date().toISOString();
      rule.lastRunAt = execution.endTime;

      this.logs.push({
        id: `log_${Math.random().toString(36).substr(2, 9)}`,
        executionId: execution.id,
        ruleId: rule.id,
        level: "Info",
        message: `Workflow '${rule.name}' executed successfully for ${entityId}`,
        metadata: {
          actionsTaken,
          context
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      execution.status = "Failure";
      execution.error = error.message;
      if (rule.failureCount !== undefined) rule.failureCount++;

      this.logs.push({
        id: `log_${Math.random().toString(36).substr(2, 9)}`,
        executionId: execution.id,
        ruleId: rule.id,
        level: "Error",
        message: `Workflow '${rule.name}' failed for ${entityId}`,
        metadata: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return this.emailTemplates;
  }

  async getNotificationTemplates(): Promise<NotificationTemplate[]> {
    return this.notificationTemplates;
  }

  async createRule(rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'failureCount'>): Promise<AutomationRule> {
    const newRule: AutomationRule = {
      ...rule,
      id: `rule_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      failureCount: 0
    };
    this.rules.push(newRule);
    return newRule;
  }

  async deleteRule(ruleId: string): Promise<void> {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  async triggerRuleManually(ruleId: string, entityId: string): Promise<AutomationExecution> {
    const execution: AutomationExecution = {
      id: `exec_${Math.random().toString(36).substr(2, 9)}`,
      ruleId,
      triggerEntityId: entityId,
      status: "Running",
      startTime: new Date().toISOString(),
      logs: []
    };
    this.executions.push(execution);
    return execution;
  }
}

export const automationService = new AutomationService();
