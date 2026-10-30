export enum UserRole {
  FOUNDER = 'Founder',
  CO_FOUNDER_CANDIDATE = 'Co-Founder Candidate',
  MENTOR = 'Mentor',
  INVESTOR = 'Investor',
  ADVISOR = 'Advisor',
  ADMIN = 'Admin',
  ORGANIZATION_MANAGER = 'Organization Manager',
  SUPER_ADMIN = 'Super Admin',
}

export enum ProfileStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
  ARCHIVED = 'Archived',
}

export enum VerificationStatus {
  UNVERIFIED = 'Unverified',
  PENDING = 'Pending',
  VERIFIED = 'Verified',
}

export enum AccountStatus {
  ACTIVE = 'Active',
  SUSPENDED = 'Suspended',
  DEACTIVATED = 'Deactivated',
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  roles: UserRole[];
  profileStatus: ProfileStatus;
  verificationStatus: VerificationStatus;
  profileCompletionScore: number;
  accountStatus: AccountStatus;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  userId: string;
  headline: string;
  bio: string;
  location: string;
  country: string;
  languages: string[];
  startupStageInterest: string[];
  commitmentLevel: 'Part-time' | 'Full-time' | 'Exploring';
  availability: string;
  yearsOfExperience: number;
  experience?: string;
  skillsRaw?: string;
  education: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  profileVisibility: 'Public' | 'Private' | 'Connections Only';
  profilePhoto?: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export interface UserSkill {
  userId: string;
  skillId: string;
  proficiency: number; // 1-5
  yearsOfExperience: number;
  priorityLevel: number;
}

export interface ValuesPreferences {
  userId: string;
  missionOrientation: string;
  riskTolerance: 'Low' | 'Medium' | 'High';
  workStyle: string | string[];
  communicationStyle: string;
  preferredIndustries: string[];
  preferredTeamSize: string;
  geographicalOpenness: boolean;
  workPreference: 'Remote' | 'Hybrid' | 'Onsite';
}

export interface StartupInterests {
  userId: string;
  industries: string[];
  businessModels: string[];
  stages: string[];
  preferredRole: string;
  fundraisingInterest: boolean;
  marketOrientation: 'Local' | 'Regional' | 'Global';
}

export interface MatchPreferences {
  userId: string;
  lookingForRoles: string[];
  preferredCoFounderType: string;
  preferredCommitment: string;
  preferredStage: string;
  desiredSkills: string[];
  dealBreakers: string[];
  isVisibleInFeed: boolean;
}

export interface MatchSuggestion {
  id: string;
  userA: string;
  userB: string;
  score: number;
  scoreExplanation: string;
  compatibilityDimensions: {
    skills: number;
    roles: number;
    values: number;
    commitment: number;
  };
  status: 'Suggested' | 'Ignored' | 'Connected';
  createdAt: string;
}

export interface ConnectionRequest {
  id: string;
  senderId: string;
  receiverId: string;
  requestType: 'Co-Founder' | 'Mentor' | 'Collaborator';
  note?: string;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Expired';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isMe: boolean;
}

export interface Conversation {
  id: string;
  participants?: string[];
  status?: 'Active' | 'Archived';
  createdAt?: string;
  updatedAt?: string;
  // Extended fields for real-time ChatDrawer & Startup Deal Room threads
  participantId?: string;
  participantName?: string;
  participantAvatar?: string;
  participantRole?: string;
  lastMessage?: string;
  timestamp?: string;
  unreadCount?: number;
  online?: boolean;
  messages?: ChatMessage[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  attachments?: string[];
  createdAt: string;
  readStatus: boolean;
}

export interface Community {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  ownerId: string;
  createdAt: string;
}

export interface CommunityMembership {
  communityId: string;
  userId: string;
  role: 'Member' | 'Moderator' | 'Admin';
  status: 'Active' | 'Pending' | 'Banned';
}

export interface Post {
  id: string;
  communityId: string;
  authorId: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  reactionsCount: number;
  commentsCount: number;
}

export interface MentorshipAvailability {
  mentorId: string;
  expertiseAreas: string[];
  stagesServed: string[];
  availabilityStatus: 'Available' | 'Busy' | 'Unavailable';
  sessionFormat: 'Video' | 'Chat' | 'In-person';
  sessionFrequency: string;
  maxMentees: number;
}

export interface MentorshipRequest {
  id: string;
  menteeId: string;
  mentorId: string;
  note: string;
  goals: string[];
  status: 'Pending' | 'Accepted' | 'Rejected';
  createdAt: string;
}

export interface MilestoneTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
}

export interface Milestone {
  id: string;
  ownerId: string; // User or Team/Org ID
  title: string;
  description?: string;
  category: string;
  targetDate: string;
  status: 'Planned' | 'In Progress' | 'Completed' | 'Delayed' | 'Overdue';
  priority: 'High' | 'Medium' | 'Low';
  progress: number;
  tasks?: MilestoneTask[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneFilterOptions {
  category?: string;
  status?: Milestone['status'] | 'All' | 'Active';
  priority?: Milestone['priority'];
  search?: string;
  page?: number;
  limit?: number;
}

export enum XPEventType {
  CREATE_ARTIFACT = 'CREATE_ARTIFACT',
  COMPLETE_ARTIFACT = 'COMPLETE_ARTIFACT',
  IMPROVE_ARTIFACT = 'IMPROVE_ARTIFACT',
  CREATE_BOARD = 'CREATE_BOARD',
  SYNTHESIZE_BOARD = 'SYNTHESIZE_BOARD',
  LINK_ARTIFACTS = 'LINK_ARTIFACTS',
  RECEIVE_MENTOR_FEEDBACK = 'RECEIVE_MENTOR_FEEDBACK',
  APPLY_FEEDBACK = 'APPLY_FEEDBACK',
  COMPLETE_MILESTONE = 'COMPLETE_MILESTONE',
  TEAM_CONTRIBUTION = 'TEAM_CONTRIBUTION',
  HIGH_QUALITY_CONTRIBUTION = 'HIGH_QUALITY_CONTRIBUTION',
  INVITE_COLLABORATOR = 'INVITE_COLLABORATOR',
  COMPLETE_REVIEW = 'COMPLETE_REVIEW',
  PROVIDE_FEEDBACK = 'PROVIDE_FEEDBACK',
  VALIDATED_PROGRESS = 'VALIDATED_PROGRESS',
}

export interface XPEvent {
  id: string;
  userId: string;
  workspaceId?: string;
  eventType: XPEventType;
  entityType: string;
  entityId: string;
  xpAmount: number;
  weightMultiplier: number;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: 'Progress' | 'Consistency' | 'Collaboration' | 'Quality' | 'Learning' | 'Execution';
  criteria: Record<string, any>;
  icon: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  createdAt: string;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  awardedAt: string;
  metadata?: Record<string, any>;
}

export interface ReadinessScore {
  id: string;
  workspaceId: string;
  score: number; // 0-100
  dimensionScores: {
    problemClarity: number;
    solutionClarity: number;
    marketUnderstanding: number;
    teamCompleteness: number;
    artifactCompleteness: number;
    executionReadiness: number;
    validation: number;
    integration: number;
  };
  updatedAt: string;
}

export interface Streak {
  id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveAt: string;
  streakType: string;
}

export interface ContributionScore {
  id: string;
  userId: string;
  workspaceId: string;
  score: number;
  breakdown: Record<string, number>;
  updatedAt: string;
}

export interface TeamMomentum {
  id: string;
  workspaceId: string;
  score: number;
  velocity: number;
  recentActivityScore: number;
  collaborationDensity: number;
  updatedAt: string;
}

export interface MentorFeedbackMetric {
  id: string;
  workspaceId: string;
  feedbackCount: number;
  appliedFeedbackRate: number;
  avgResponseTime: number;
  improvementScore: number;
  lastFeedbackAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'Match' | 'Message' | 'Connection' | 'Community' | 'System';
  title: string;
  body: string;
  linkedEntityId?: string;
  readStatus: boolean;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  type: 'Incubator' | 'Accelerator' | 'University' | 'Hub' | 'Innovation Cluster' | 'Public Body';
  description: string;
  logo?: string;
  country: string;
  website?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface OrganizationMembership {
  organizationId: string;
  userId: string;
  role: 'Admin' | 'Member' | 'Guest';
  status: 'Active' | 'Pending';
}

export enum FounderStage {
  IDEA = 'Idea',
  PROTOTYPE = 'Prototype',
  MVP = 'MVP',
  EARLY_TRACTION = 'Early Traction',
  SCALING = 'Scaling',
  EXITED = 'Exited',
}

export enum CommitmentLevel {
  PART_TIME = 'Part-time',
  FULL_TIME = 'Full-time',
  EXPLORING = 'Exploring',
  WEEKENDS = 'Weekends',
}

export interface AIAgent {
  id: string;
  name: string;
  nameEl?: string;
  role: string;
  roleEl?: string;
  description: string;
  descriptionEl?: string;
  capabilities: string[];
  capabilitiesEl?: string[];
  status: 'Active' | 'Inactive';
  avatar?: string;
  icon?: string;
  suggestedPrompts?: string[];
  suggestedPromptsEl?: string[];
}

export interface TenantConfig {
  id: string;
  tenantId?: string;
  name?: string;
  displayName?: string;
  slug?: string;
  logoUrl?: string;
  primaryColor?: string;
  tagline?: string;
  memberCount?: number;
  branding?: {
    logo?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    favicon?: string;
    backgroundStyle?: string;
    heroImageUrl?: string;
  };
  content?: {
    heroTitle?: string;
    heroSubtitle?: string;
    features?: any[];
    footerText?: string;
    communityNamingConvention?: string;
    ctaLabel?: string;
    dashboardWelcomeText?: string;
    emailSignature?: string;
  };
  fullDescription?: string;
  privacyPolicyUrl?: string;
  termsUrl?: string;
  supportEmail?: string;
  features?: string[];
  settings?: Record<string, any>;
}

export interface BillingPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  priceMonthly?: number;
  priceAnnual?: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits?: Record<string, any>;
  customerType?: 'Individual' | 'Organization' | 'Tenant' | 'Enterprise';
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subscription {
  id: string;
  tenantId: string;
  userId?: string;
  planId: string;
  status: 'Active' | 'Canceled' | 'Past Due' | 'Trialing';
  currentPeriodEnd: string;
  billingCycle?: 'Monthly' | 'Annual';
  renewalDate?: string;
  activeSeatCount?: number;
  seatLimit?: number;
}

export interface TenantMembership {
  tenantId: string;
  userId: string;
  role: 'Owner' | 'Admin' | 'Member';
  status: 'Active' | 'Pending';
}

export interface Startup {
  id: string;
  name: string;
  description: string;
  oneLiner?: string;
  ownerId?: string;
  stage: FounderStage;
  industry: string | string[];
  website?: string;
  teamSize?: number;
  founderIds?: string[];
  readinessScore?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FundraisingTracker {
  id: string;
  startupId: string;
  targetAmount: number;
  raisedAmount: number;
  currency: string;
  stage: string;
  investors: string[];
  status?: string;
  investorPipeline?: any[];
}

export interface TenantSSOConfig {
  tenantId: string;
  provider: string;
  clientId: string;
  clientSecret: string;
  issuerUrl: string;
  status: 'Enabled' | 'Disabled';
  isEnabled?: boolean;
  ssoMandatory?: boolean;
  loginButtonLabel?: string;
  allowedDomains?: string[];
  autoProvisionEnabled?: boolean;
  jitEnabled?: boolean;
  defaultRole?: UserRole;
}

export enum TriggerType {
  USER_SIGNUP = 'User Signup',
  MATCH_FOUND = 'Match Found',
  MESSAGE_RECEIVED = 'Message Received',
  MILESTONE_COMPLETED = 'Milestone Completed',
  SCHEDULED = 'Scheduled',
}

export enum ActionType {
  SEND_EMAIL = 'Send Email',
  SEND_NOTIFICATION = 'Send Notification',
  UPDATE_USER_STATUS = 'Update User Status',
  TRIGGER_WEBHOOK = 'Trigger Webhook',
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  triggerType: TriggerType;
  conditions: AutomationCondition[];
  actions: {
    type: ActionType;
    params: Record<string, any>;
  }[];
  status: 'Active' | 'Inactive' | 'Scheduled' | 'Executed';
  isActive?: boolean;
  failureCount?: number;
  lastRunAt?: string;
  tenantId?: string;
  scheduleDelay?: number;
  userScope?: string;
  entityScope?: string;
  retryLimit?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AutomationExecution {
  id: string;
  ruleId: string;
  status: 'Success' | 'Failure' | 'Running';
  startTime: string;
  endTime?: string;
  logs: string[];
  triggerEntityId?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface AutomationLog {
  id: string;
  ruleId: string;
  executionId: string;
  level: 'Info' | 'Warning' | 'Error';
  message: string;
  timestamp: string;
  createdAt?: string;
  metadata?: Record<string, any>;
}

export interface EmailTemplate {
  id: string;
  name: string;
  title?: string;
  subject: string;
  body: string;
  variables: string[];
  category?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  category?: string;
}

export interface TenantDomain {
  id: string;
  tenantId: string;
  domain: string;
  domainName?: string;
  isCustom: boolean;
  isPrimary?: boolean;
  domainType?: 'Subdomain' | 'Custom' | 'subdomain' | 'custom';
  status: 'Verified' | 'Pending' | 'Failed';
  sslStatus?: 'Active' | 'Pending' | 'None';
  verificationStatus?: 'Verified' | 'Pending' | 'Failed';
  verificationToken?: string;
  isActive?: boolean;
  dnsInstructions?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DomainVerification {
  domainId: string;
  type: 'TXT' | 'CNAME';
  name: string;
  value: string;
}

export interface IdentityProvider {
  id: string;
  name: string;
  type: 'OIDC' | 'SAML';
  config: Record<string, any>;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  userId?: string;
  amount: number;
  total?: number;
  number?: string;
  currency: string;
  status: 'Paid' | 'Open' | 'Void' | 'Uncollectible';
  dueDate: string;
  paidAt?: string;
  createdAt?: string;
}

export interface ScheduledJob {
  id: string;
  name: string;
  cronExpression: string;
  lastRun?: string;
  nextRun: string;
  status: 'Active' | 'Paused' | 'Scheduled' | 'Executed';
  scheduledFor?: string;
  ruleId?: string;
  targetEntityId?: string;
}

export interface MatchProfile {
  userId: string;
  score: number;
  reasons: string[];
  lookingForRoles?: string[];
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  type: 'In-Person' | 'Virtual';
  category: 'Workshop' | 'Pitch Night' | 'Networking' | 'Conference';
  organizerId: string;
  organizerName: string;
  capacity: number;
  registeredCount: number;
  tags: string[];
  photo?: string;
  status: 'Open' | 'Filling' | 'Last Call' | 'Closed';
  registrationUrl?: string;
}

export interface Endorsement {
  id: string;
  endorserId: string;
  endorseeId?: string;
  recipientId?: string;
  skillId: string;
  comment?: string;
  createdAt: string;
}

export type Tenant = TenantConfig;

export type UserProfile = User & {
  uid: string;
  headline: string;
  headlineEl?: string;
  bio: string;
  bioEl?: string;
  avatarUrl?: string;
  location: string;
  stage: string;
  company?: string;
  role: string;
  commitment: string;
  industry?: string;
  skills?: string[];
  lookingFor?: string[];
  interests?: string[];
  timezone?: string;
  availability?: string;
  socialLinks?: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    website?: string;
  };
  linkedinUrl?: string;
  githubUrl?: string;
  twitterUrl?: string;
  portfolioUrl?: string;
  profile?: Profile;
};

// ============================================================================
// EXTENDED COFOUNDERBAY 6-AXIS MATCHING & DEAL ROOM TYPES
// ============================================================================

export type RoleCategory =
  | 'Technical Co-Founder'
  | 'Business & Growth'
  | 'Product & Design'
  | 'Domain & Operations'
  | 'Mentor & Advisor'
  | 'Angel / Investor';

export type StartupStage =
  | 'Idea / Concept'
  | 'Prototype / MVP'
  | 'Pre-Seed (Traction)'
  | 'Seed Funded'
  | 'Series A+';

export type CommitmentType =
  | 'Full-Time'
  | 'Part-Time (Transition to FT)'
  | 'Evenings & Weekends'
  | 'Advisory';

export interface MatchScoreBreakdown {
  roleComplementarity: number; // max 25
  skillsOverlap: number;       // max 25
  stageAlignment: number;      // max 20
  commitmentAlignment: number; // max 15
  locationProximity: number;   // max 5
  recencyBonus: number;        // max 10
  reasons: string[];
}

export interface FounderProfile {
  id: string;
  name: string;
  avatar: string;
  headline: string;
  role: RoleCategory;
  location: string;
  isRemote: boolean;
  stage: StartupStage;
  commitment: CommitmentType;
  equityExpectation: string;
  experienceYears: number;
  bio: string;
  skills: string[];
  lookingFor: string[];
  pastExperience: string;
  education?: string;
  verified: boolean;
  matchScore: number;
  matchHighlights: string[];
  matchBreakdown?: MatchScoreBreakdown;
  updatedAtMs?: number;
  socials: {
    github?: string;
    linkedin?: string;
    twitter?: string;
  };
  featuredProject?: {
    title: string;
    description: string;
    url?: string;
  };
}

export interface StartupPitchDeck {
  problem: string;
  solution: string;
  marketSize: string;
  businessModel: string;
  tractionDetails: string;
  useOfFunds: string;
}

export interface StartupVenture {
  id: string;
  name: string;
  logo: string;
  tagline: string;
  description: string;
  industry: string;
  stage: StartupStage;
  location: string;
  openRoles: string[];
  equityOffer: string;
  fundingRaised: string;
  teamSize: string;
  founderName: string;
  founderAvatar: string;
  tractionMetric: string;
  verified: boolean;
  pitchDeck?: StartupPitchDeck;
  applicationsCount?: number;
}

export interface MentorSession {
  id: string;
  mentorName: string;
  mentorAvatar: string;
  mentorTitle: string;
  company: string;
  expertise: string[];
  rating: number;
  reviewsCount: number;
  availableSlots: string[];
  durationMinutes: number;
  isFreeCommunity: boolean;
}

export interface MentorBooking {
  id: string;
  mentorId: string;
  mentorName: string;
  mentorAvatar: string;
  mentorCompany: string;
  slot: string;
  topic: string;
  notes: string;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
  meetingUrl: string;
}

export interface NeedCardItem {
  id: string;
  title: string;
  description: string;
  ventureName: string;
  ventureLogo?: string;
  category: 'Engineering' | 'Growth & GTM' | 'Product' | 'Advisory' | 'Operations';
  location: string;
  isRemote: boolean;
  stage: StartupStage;
  commitment: CommitmentType;
  equityOffered: string;
  skills: string[];
  applicantCount: number;
  createdAt: string;
  status: 'active' | 'in_review' | 'filled';
}

export interface AnalyticsMetric {
  id: string;
  nameEn: string;
  nameEl: string;
  value: string;
  change: string;
  isPositive: boolean;
  periodEn: string;
  periodEl: string;
}

export type ThemeName = 'dark' | 'cyan' | 'mint' | 'apricot' | 'lilac';
