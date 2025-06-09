// Claude AI integration types for Sales AI Agent Platform

export interface ClaudeConfig {
  apiKey: string;
  model: ClaudeModel;
  maxTokens: number;
  temperature: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  stream?: boolean;
  caching?: CachingConfig;
  rateLimiting?: RateLimitConfig;
}

export enum ClaudeModel {
  CLAUDE_3_5_SONNET = 'claude-3-5-sonnet-20241022',
  CLAUDE_3_OPUS = 'claude-3-opus-20240229',
  CLAUDE_3_SONNET = 'claude-3-sonnet-20240229',
  CLAUDE_3_HAIKU = 'claude-3-haiku-20240307'
}

export interface CachingConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  keyGenerator?: (prompt: string, config: ClaudeConfig) => string;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  burstLimit: number;
  retryConfig: ClaudeRetryConfig;
}

export interface ClaudeRetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  retryableErrors: string[];
}

// Claude Request and Response Types
export interface ClaudeRequest {
  model: ClaudeModel;
  messages: ClaudeMessage[];
  maxTokens: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  stream?: boolean;
  system?: string;
  metadata?: RequestMetadata;
}

export interface ClaudeMessage {
  role: MessageRole;
  content: MessageContent;
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export type MessageContent = string | ContentBlock[];

export interface ContentBlock {
  type: 'text' | 'image';
  text?: string;
  source?: ImageSource;
}

export interface ImageSource {
  type: 'base64';
  mediaType: string;
  data: string;
}

export interface ClaudeResponse {
  id: string;
  type: 'message';
  role: MessageRole;
  content: ContentBlock[];
  model: ClaudeModel;
  stopReason: StopReason;
  stopSequence?: string;
  usage: TokenUsage;
  metadata?: ResponseMetadata;
}

export enum StopReason {
  END_TURN = 'end_turn',
  MAX_TOKENS = 'max_tokens',
  STOP_SEQUENCE = 'stop_sequence'
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
}

export interface RequestMetadata {
  userId?: string;
  sessionId?: string;
  agentId: string;
  operation: string;
  timestamp: Date;
  traceId: string;
}

export interface ResponseMetadata {
  requestId: string;
  processingTime: number;
  cached: boolean;
  retryCount: number;
  modelVersion: string;
}

// Claude Prompt Templates and Structures
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: PromptCategory;
  template: string;
  variables: PromptVariable[];
  examples: PromptExample[];
  validation: PromptValidation;
  performance: PromptPerformance;
}

export enum PromptCategory {
  LEAD_ANALYSIS = 'lead_analysis',
  CONVERSATION_COACHING = 'conversation_coaching',
  EMAIL_PERSONALIZATION = 'email_personalization',
  FORECASTING_INSIGHTS = 'forecasting_insights',
  RISK_ASSESSMENT = 'risk_assessment',
  RESPONSE_ANALYSIS = 'response_analysis'
}

export interface PromptVariable {
  name: string;
  type: VariableType;
  required: boolean;
  description: string;
  validation?: VariableValidation;
  defaultValue?: any;
  examples: any[];
}

export enum VariableType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
  DATE = 'date'
}

export interface VariableValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  enum?: any[];
}

export interface PromptExample {
  input: Record<string, any>;
  expectedOutput: any;
  notes?: string;
}

export interface PromptValidation {
  maxTokens: number;
  requiredOutputFormat: OutputFormat;
  validationRules: ValidationRule[];
}

export interface OutputFormat {
  type: 'json' | 'text' | 'structured';
  schema?: any;
  template?: string;
}

export interface ValidationRule {
  field: string;
  rule: string;
  message: string;
}

export interface PromptPerformance {
  averageTokens: number;
  averageResponseTime: number;
  successRate: number;
  lastOptimized: Date;
  version: string;
}

// Specific Claude Integration Types for Each Agent

// Lead Scoring Agent Claude Types
export interface LeadAnalysisPrompt {
  leadData: {
    email: string;
    company?: string;
    title?: string;
    industry?: string;
    companySize?: string;
    activityHistory: ActivitySummary[];
  };
  companyData?: {
    revenue?: number;
    employees?: number;
    technologies?: string[];
    fundingStage?: string;
    recentNews?: string[];
  };
  scoringFactors: {
    firmographics: number;
    technicalFit: number;
    engagement: number;
    timing: number;
    decisionMakerAccess: number;
    intentSignals: number;
  };
  industryBenchmarks: {
    averageScore: number;
    topPerformers: number;
    conversionRates: Record<string, number>;
  };
}

export interface LeadAnalysisResponse {
  overallAssessment: string;
  keyStrengths: string[];
  riskFactors: string[];
  buyingLikelihood: number;
  personalizationOpportunities: string[];
  recommendedActions: string[];
  confidenceScore: number;
  scoreJustification: string;
  nextSteps: string[];
}

// Conversation Agent Claude Types
export interface ConversationAnalysisPrompt {
  transcript: TranscriptSegment[];
  context: {
    leadInfo: LeadContext;
    callObjective: string;
    previousInteractions: InteractionSummary[];
  };
  realTimeMetrics: {
    talkTimeRatio: number;
    sentimentTrend: number[];
    keywordMentions: string[];
    questionCount: number;
  };
}

export interface ConversationAnalysisResponse {
  sentiment: SentimentAnalysis;
  keyInsights: string[];
  objections: ObjectionAnalysis[];
  buyingSignals: BuyingSignal[];
  coachingSuggestions: CoachingSuggestion[];
  nextBestActions: string[];
  conversationScore: number;
  improvements: string[];
}

export interface ObjectionAnalysis {
  type: string;
  text: string;
  severity: 'low' | 'medium' | 'high';
  suggestedResponse: string;
  context: string;
}

export interface BuyingSignal {
  type: string;
  text: string;
  confidence: number;
  recommendedAction: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface CoachingSuggestion {
  type: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  message: string;
  actionSuggestions: string[];
  context: string;
}

// Email Agent Claude Types
export interface EmailPersonalizationPrompt {
  template: {
    subject: string;
    body: string;
    variables: string[];
  };
  leadData: {
    name: string;
    company: string;
    title: string;
    industry: string;
    recentActivity: string[];
  };
  companyData: {
    size: string;
    revenue?: string;
    recentNews?: string[];
    technologies?: string[];
  };
  context: {
    sequenceStep: number;
    previousEmails: EmailHistory[];
    engagement: EngagementMetrics;
  };
}

export interface EmailPersonalizationResponse {
  subject: string;
  body: string;
  personalizationNotes: string[];
  confidenceScore: number;
  alternativeVersions: EmailVariation[];
  sendTimeRecommendation: string;
  expectedEngagement: EngagementPrediction;
}

export interface EmailVariation {
  variant: string;
  subject: string;
  body: string;
  useCase: string;
  expectedPerformance: number;
}

// Forecasting Agent Claude Types
export interface DealRiskAnalysisPrompt {
  dealData: {
    value: number;
    stage: string;
    daysInStage: number;
    closeDate: string;
    probability: number;
  };
  stakeholderInfo: {
    decisionMakers: StakeholderSummary[];
    champions: StakeholderSummary[];
    influencers: StakeholderSummary[];
  };
  activityHistory: {
    meetings: number;
    emails: number;
    proposals: number;
    lastActivity: string;
  };
  conversationIntelligence: {
    sentimentTrend: number[];
    objectionCount: number;
    buyingSignalStrength: number;
    competitorMentions: string[];
  };
  competitiveLandscape: {
    knownCompetitors: string[];
    competitiveThreats: string[];
    differentiationGaps: string[];
  };
}

export interface DealRiskAnalysisResponse {
  overallRiskScore: number;
  primaryRisks: RiskFactor[];
  mitigationStrategies: string[];
  recommendedActions: string[];
  confidenceLevel: number;
  probabilityAdjustment: number;
  timelineRisk: string;
  competitiveRisk: string;
  stakeholderRisk: string;
}

export interface RiskFactor {
  category: 'competitive' | 'stakeholder' | 'timing' | 'technical' | 'budget';
  description: string;
  impact: 'low' | 'medium' | 'high';
  likelihood: number;
  mitigation: string;
}

// Claude Error and Status Types
export interface ClaudeError {
  type: ClaudeErrorType;
  message: string;
  code?: string;
  details?: Record<string, any>;
  retryable: boolean;
  timestamp: Date;
}

export enum ClaudeErrorType {
  AUTHENTICATION_ERROR = 'authentication_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  INVALID_REQUEST_ERROR = 'invalid_request_error',
  API_ERROR = 'api_error',
  OVERLOADED_ERROR = 'overloaded_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  PARSING_ERROR = 'parsing_error'
}

// Claude Usage Analytics
export interface ClaudeUsageMetrics {
  timestamp: Date;
  agentId: string;
  operation: string;
  tokensUsed: number;
  responseTime: number;
  cached: boolean;
  success: boolean;
  error?: ClaudeErrorType;
  cost: number;
}

export interface ClaudeUsageSummary {
  period: string;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  successRate: number;
  cacheHitRate: number;
  topOperations: OperationUsage[];
  errorBreakdown: Record<ClaudeErrorType, number>;
}

export interface OperationUsage {
  operation: string;
  requests: number;
  tokens: number;
  cost: number;
  averageResponseTime: number;
}

// Helper types for common data structures
export interface ActivitySummary {
  type: string;
  count: number;
  lastOccurrence: Date;
  engagement: number;
}

export interface LeadContext {
  id: string;
  name: string;
  company: string;
  title: string;
  score: number;
  stage: string;
}

export interface InteractionSummary {
  date: Date;
  type: string;
  outcome: string;
  sentiment: number;
  keyPoints: string[];
}

export interface SentimentAnalysis {
  overall: number;
  trend: 'improving' | 'declining' | 'stable';
  confidence: number;
  keyFactors: string[];
}

export interface EmailHistory {
  subject: string;
  sentDate: Date;
  opened: boolean;
  clicked: boolean;
  replied: boolean;
}

export interface EngagementMetrics {
  openRate: number;
  clickRate: number;
  replyRate: number;
  lastEngagement: Date;
}

export interface EngagementPrediction {
  openProbability: number;
  clickProbability: number;
  replyProbability: number;
  bestSendTime: string;
}

export interface StakeholderSummary {
  name: string;
  title: string;
  influence: number;
  sentiment: number;
  lastContact: Date;
}