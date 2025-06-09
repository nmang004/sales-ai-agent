// Core shared types for Sales AI Agent Platform

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

// Lead Management Types
export interface Lead extends BaseEntity {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  phone?: string;
  source: string;
  status: LeadStatus;
  score?: number;
  scoreConfidence?: number;
  scoreFactors?: ScoringFactor[];
  enrichmentData?: EnrichmentData;
  activityHistory: ActivityRecord[];
  assignedTo?: string;
  tags: string[];
  customFields: Record<string, any>;
}

export enum LeadStatus {
  NEW = 'new',
  QUALIFIED = 'qualified',
  NOT_QUALIFIED = 'not_qualified',
  NURTURING = 'nurturing',
  OPPORTUNITY = 'opportunity',
  CUSTOMER = 'customer',
  CHURNED = 'churned'
}

export interface ScoringFactor {
  category: ScoringCategory;
  factor: string;
  weight: number;
  score: number;
  confidence: number;
  explanation: string;
}

export enum ScoringCategory {
  FIRMOGRAPHICS = 'firmographics',
  TECHNOLOGY_FIT = 'technology_fit',
  ENGAGEMENT = 'engagement',
  TIMING = 'timing',
  DECISION_MAKER_ACCESS = 'decision_maker_access',
  INTENT_SIGNALS = 'intent_signals'
}

// Company and Enrichment Types
export interface Company extends BaseEntity {
  name: string;
  domain?: string;
  industry?: string;
  size?: CompanySize;
  revenue?: number;
  location?: Location;
  technicalStack?: string[];
  fundingStage?: FundingStage;
  socialProfiles?: SocialProfile[];
  news?: NewsItem[];
}

export enum CompanySize {
  STARTUP = 'startup',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  ENTERPRISE = 'enterprise'
}

export enum FundingStage {
  BOOTSTRAP = 'bootstrap',
  SEED = 'seed',
  SERIES_A = 'series_a',
  SERIES_B = 'series_b',
  SERIES_C = 'series_c',
  IPO = 'ipo',
  ACQUIRED = 'acquired'
}

export interface EnrichmentData {
  source: string;
  timestamp: Date;
  confidence: number;
  companyData?: Partial<Company>;
  contactData?: ContactEnrichment;
  technicalData?: TechnicalEnrichment;
  socialData?: SocialEnrichment;
}

export interface ContactEnrichment {
  verifiedEmail: boolean;
  phoneNumbers: string[];
  socialProfiles: SocialProfile[];
  jobHistory: JobHistoryItem[];
  education: EducationItem[];
}

export interface TechnicalEnrichment {
  technologies: Technology[];
  integrations: Integration[];
  infrastructure: InfrastructureDetail[];
  securityCompliance: string[];
}

// Activity and Engagement Types
export interface ActivityRecord extends BaseEntity {
  leadId: string;
  type: ActivityType;
  channel: Channel;
  description: string;
  metadata: Record<string, any>;
  engagementScore: number;
  timestamp: Date;
}

export enum ActivityType {
  EMAIL_SENT = 'email_sent',
  EMAIL_OPENED = 'email_opened',
  EMAIL_CLICKED = 'email_clicked',
  EMAIL_REPLIED = 'email_replied',
  WEBSITE_VISIT = 'website_visit',
  CONTENT_DOWNLOAD = 'content_download',
  DEMO_REQUEST = 'demo_request',
  CALL_SCHEDULED = 'call_scheduled',
  CALL_COMPLETED = 'call_completed',
  MEETING_ATTENDED = 'meeting_attended',
  PROPOSAL_SENT = 'proposal_sent',
  CONTRACT_SIGNED = 'contract_signed'
}

export enum Channel {
  EMAIL = 'email',
  PHONE = 'phone',
  LINKEDIN = 'linkedin',
  WEBSITE = 'website',
  SOCIAL_MEDIA = 'social_media',
  DIRECT_MAIL = 'direct_mail',
  EVENT = 'event',
  REFERRAL = 'referral'
}

// Deal and Forecasting Types
export interface Deal extends BaseEntity {
  name: string;
  leadId: string;
  value: number;
  stage: DealStage;
  probability: number;
  closeDate: Date;
  source: string;
  assignedTo: string;
  stakeholders: Stakeholder[];
  activities: ActivityRecord[];
  competitorInfo?: CompetitorInfo;
  riskFactors: RiskFactor[];
  nextSteps: NextStep[];
  customFields: Record<string, any>;
}

export enum DealStage {
  QUALIFICATION = 'qualification',
  DISCOVERY = 'discovery',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost'
}

export interface Stakeholder {
  id: string;
  name: string;
  title: string;
  role: StakeholderRole;
  influence: InfluenceLevel;
  sentiment: SentimentLevel;
  contactInfo: ContactInfo;
}

export enum StakeholderRole {
  DECISION_MAKER = 'decision_maker',
  INFLUENCER = 'influencer',
  CHAMPION = 'champion',
  BLOCKER = 'blocker',
  TECHNICAL_EVALUATOR = 'technical_evaluator',
  BUDGET_HOLDER = 'budget_holder'
}

export enum InfluenceLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum SentimentLevel {
  VERY_POSITIVE = 'very_positive',
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
  VERY_NEGATIVE = 'very_negative'
}

// Conversation Intelligence Types
export interface ConversationSession extends BaseEntity {
  sessionId: string;
  callId?: string;
  leadId: string;
  dealId?: string;
  participants: Participant[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
  transcript: TranscriptSegment[];
  summary: ConversationSummary;
  insights: ConversationInsight[];
  coachingEvents: CoachingEvent[];
  sentimentAnalysis: SentimentAnalysis;
  keyMoments: KeyMoment[];
}

export interface Participant {
  id: string;
  name: string;
  role: ParticipantRole;
  speakerId: string;
}

export enum ParticipantRole {
  SALES_REP = 'sales_rep',
  PROSPECT = 'prospect',
  STAKEHOLDER = 'stakeholder'
}

export interface TranscriptSegment {
  id: string;
  timestamp: number;
  speakerId: string;
  text: string;
  confidence: number;
  sentiment: SentimentLevel;
  keywords: string[];
  intent?: Intent;
}

export interface CoachingEvent {
  id: string;
  timestamp: number;
  type: CoachingType;
  priority: Priority;
  message: string;
  suggestions: string[];
  context: string;
  acknowledged: boolean;
}

export enum CoachingType {
  TALK_TIME = 'talk_time',
  OBJECTION_HANDLING = 'objection_handling',
  BUYING_SIGNAL = 'buying_signal',
  COMPETITOR_MENTION = 'competitor_mention',
  QUESTION_OPPORTUNITY = 'question_opportunity',
  VALUE_PROPOSITION = 'value_proposition',
  SILENCE_ALERT = 'silence_alert'
}

export enum Priority {
  URGENT = 'urgent',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// Email Automation Types
export interface EmailSequence extends BaseEntity {
  name: string;
  description: string;
  type: SequenceType;
  steps: EmailStep[];
  enrollmentCriteria: EnrollmentCriteria;
  performance: SequencePerformance;
  isActive: boolean;
  targetAudience: string[];
}

export enum SequenceType {
  COLD_OUTREACH = 'cold_outreach',
  NURTURE = 'nurture',
  ONBOARDING = 'onboarding',
  RE_ENGAGEMENT = 're_engagement',
  OBJECTION_HANDLING = 'objection_handling',
  PREMIUM = 'premium'
}

export interface EmailStep {
  id: string;
  stepNumber: number;
  template: EmailTemplate;
  delay: DelayConfig;
  conditions: StepCondition[];
  personalizationLevel: PersonalizationLevel;
  abTestConfig?: ABTestConfig;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: TemplateVariable[];
  personalizationPrompts: PersonalizationPrompt[];
}

export enum PersonalizationLevel {
  BASIC = 'basic',
  STANDARD = 'standard',
  ADVANCED = 'advanced'
}

// Agent Event Types
export interface AgentEvent {
  id: string;
  agentId: string;
  type: string;
  timestamp: Date;
  payload: Record<string, any>;
  correlationId?: string;
  parentEventId?: string;
  metadata: EventMetadata;
}

export interface EventMetadata {
  source: string;
  version: string;
  traceId: string;
  userId?: string;
  sessionId?: string;
}

// Performance and Monitoring Types
export interface PerformanceMetrics {
  agentId: string;
  timestamp: Date;
  responseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  queueDepth: number;
  activeConnections?: number;
}

export interface BusinessMetrics {
  timestamp: Date;
  leadsProcessed: number;
  conversionsGenerated: number;
  emailsSent: number;
  callsAnalyzed: number;
  dealsForecasted: number;
  revenueImpact: number;
  accuracyRates: AccuracyMetrics;
}

export interface AccuracyMetrics {
  leadScoringAccuracy: number;
  forecastAccuracy: number;
  sentimentAccuracy: number;
  responseClassificationAccuracy: number;
}

// Error and Validation Types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
  message?: string;
  timestamp: Date;
  requestId: string;
}

// Helper Types
export interface Location {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  linkedin?: string;
  twitter?: string;
}

export interface SocialProfile {
  platform: string;
  url: string;
  followers?: number;
  verified?: boolean;
}

export interface NewsItem {
  title: string;
  url: string;
  publishedAt: Date;
  source: string;
  sentiment: SentimentLevel;
  relevanceScore: number;
}

export interface Technology {
  name: string;
  category: string;
  version?: string;
  confidence: number;
}

export interface Integration {
  name: string;
  type: string;
  status: string;
  lastSync?: Date;
}

// Export all types for easy importing
export * from './agent.types';
export * from './claude.types';
export * from './workflow.types';