// Agent-specific types for Voltagent framework integration

export interface AgentConfig {
  id: string;
  name: string;
  type: AgentType;
  category: string;
  version: string;
  description: string;
  realtime: boolean;
  maxInstances: number;
  memoryLimit: string;
  cpuLimit: string;
  tools: string[];
  triggers: string[];
  eventsEmitted: string[];
  performanceRequirements: PerformanceRequirements;
}

export enum AgentType {
  DATA_ANALYSIS = 'DataAnalysisAgent',
  REAL_TIME_ANALYSIS = 'RealTimeAnalysisAgent',
  AUTOMATION = 'AutomationAgent',
  PREDICTIVE_ANALYTICS = 'PredictiveAnalyticsAgent',
  ORCHESTRATION = 'OrchestrationAgent',
  INTEGRATION = 'IntegrationAgent'
}

export interface PerformanceRequirements {
  responseTime: string;
  throughput: string;
  memoryUsage?: string;
  cpuUsage?: string;
  concurrentConnections?: string;
}

// Agent Instance and Runtime Types
export interface AgentInstance {
  id: string;
  agentId: string;
  status: AgentStatus;
  startTime: Date;
  lastHeartbeat: Date;
  currentLoad: number;
  memoryUsage: number;
  cpuUsage: number;
  activeJobs: number;
  version: string;
  metadata: AgentMetadata;
}

export enum AgentStatus {
  STARTING = 'starting',
  RUNNING = 'running',
  IDLE = 'idle',
  BUSY = 'busy',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error',
  MAINTENANCE = 'maintenance'
}

export interface AgentMetadata {
  nodeId: string;
  region: string;
  capabilities: string[];
  lastUpdate: Date;
  configuration: Record<string, any>;
}

// Agent Communication Types
export interface AgentMessage {
  id: string;
  fromAgent: string;
  toAgent?: string;
  broadcast?: boolean;
  type: MessageType;
  payload: any;
  timestamp: Date;
  correlationId?: string;
  replyTo?: string;
  priority: MessagePriority;
  ttl?: number;
}

export enum MessageType {
  REQUEST = 'request',
  RESPONSE = 'response',
  EVENT = 'event',
  NOTIFICATION = 'notification',
  COMMAND = 'command',
  ERROR = 'error'
}

export enum MessagePriority {
  URGENT = 'urgent',
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low'
}

// Agent Tool Interfaces
export interface AgentTool {
  id: string;
  name: string;
  type: ToolType;
  version: string;
  config: ToolConfig;
  functions: ToolFunction[];
  dependencies: string[];
  rateLimits?: RateLimit[];
}

export enum ToolType {
  AI_INTEGRATION = 'ai-integration',
  DATA_ACCESS = 'data-access',
  EXTERNAL_INTEGRATION = 'external-integration',
  COMPUTATIONAL = 'computational',
  COMMUNICATION_SERVICE = 'communication-service',
  MEDIA_PROCESSOR = 'media-processor',
  AI_SERVICE = 'ai-service',
  REAL_TIME_COMMUNICATION = 'real-time-communication',
  ANALYTICS_PROCESSOR = 'analytics-processor',
  WORKFLOW_ORCHESTRATOR = 'workflow-orchestrator',
  AI_ANALYZER = 'ai-analyzer',
  MACHINE_LEARNING = 'machine-learning',
  DATA_PROCESSOR = 'data-processor',
  BUSINESS_ANALYTICS = 'business-analytics'
}

export interface ToolConfig {
  [key: string]: any;
  timeout?: number;
  retries?: number;
  caching?: boolean;
  authentication?: AuthConfig;
}

export interface AuthConfig {
  type: 'api_key' | 'oauth' | 'basic' | 'jwt';
  credentials: Record<string, string>;
}

export interface ToolFunction {
  name: string;
  description: string;
  parameters: FunctionParameter[];
  returnType: string;
  async: boolean;
  caching?: boolean;
  rateLimit?: RateLimit;
}

export interface FunctionParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: any;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: string;
  value: any;
  message: string;
}

export interface RateLimit {
  requests: number;
  window: string;
  burst?: number;
  retry?: RetryConfig;
}

export interface RetryConfig {
  maxAttempts: number;
  backoff: 'linear' | 'exponential';
  baseDelay: number;
  maxDelay: number;
}

// Agent Job and Task Types
export interface AgentJob {
  id: string;
  agentId: string;
  type: string;
  input: any;
  output?: any;
  status: JobStatus;
  priority: JobPriority;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  timeout: number;
  metadata: JobMetadata;
}

export enum JobStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

export enum JobPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low',
  BACKGROUND = 'background'
}

export interface JobMetadata {
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  sourceAgent?: string;
  tags: string[];
  metrics: JobMetrics;
}

export interface JobMetrics {
  queueTime: number;
  processingTime: number;
  memoryUsed: number;
  cpuUsed: number;
  toolCalls: number;
  cacheHits: number;
  cacheMisses: number;
}

// Agent Monitoring and Health Types
export interface AgentHealth {
  agentId: string;
  status: HealthStatus;
  uptime: number;
  lastCheck: Date;
  checks: HealthCheck[];
  performance: PerformanceSnapshot;
  alerts: HealthAlert[];
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown'
}

export interface HealthCheck {
  name: string;
  status: HealthStatus;
  message: string;
  timestamp: Date;
  duration: number;
  metadata?: Record<string, any>;
}

export interface PerformanceSnapshot {
  timestamp: Date;
  responseTime: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: number;
  errorRate: number;
  resourceUsage: ResourceUsage;
}

export interface ResourceUsage {
  memory: {
    used: number;
    limit: number;
    percentage: number;
  };
  cpu: {
    used: number;
    limit: number;
    percentage: number;
  };
  connections: {
    active: number;
    limit: number;
    percentage: number;
  };
}

export interface HealthAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata: Record<string, any>;
}

export enum AlertType {
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  HIGH_ERROR_RATE = 'high_error_rate',
  RESOURCE_EXHAUSTION = 'resource_exhaustion',
  CONNECTIVITY_ISSUE = 'connectivity_issue',
  DEPENDENCY_FAILURE = 'dependency_failure',
  CONFIGURATION_ERROR = 'configuration_error'
}

export enum AlertSeverity {
  CRITICAL = 'critical',
  WARNING = 'warning',
  INFO = 'info'
}

// Agent Event System Types
export interface AgentEventHandler {
  eventType: string;
  handler: (event: AgentEvent) => Promise<void>;
  priority: number;
  async: boolean;
  retryConfig?: RetryConfig;
}

export interface EventSubscription {
  id: string;
  agentId: string;
  eventPattern: string;
  handler: AgentEventHandler;
  isActive: boolean;
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

// Agent Scaling Types
export interface ScalingPolicy {
  agentId: string;
  enabled: boolean;
  minInstances: number;
  maxInstances: number;
  targetMetrics: ScalingMetric[];
  scaleUpPolicy: ScalePolicy;
  scaleDownPolicy: ScalePolicy;
  cooldownPeriod: number;
}

export interface ScalingMetric {
  name: string;
  type: 'cpu' | 'memory' | 'queue_depth' | 'response_time' | 'error_rate';
  targetValue: number;
  weight: number;
}

export interface ScalePolicy {
  threshold: number;
  stepSize: number;
  evaluationPeriod: number;
  stabilizationWindow: number;
}

// Agent Configuration Management
export interface ConfigurationManager {
  get<T>(key: string): T;
  set<T>(key: string, value: T): void;
  watch(pattern: string, callback: (key: string, value: any) => void): void;
  validate(config: Record<string, any>): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  path: string;
  message: string;
  value: any;
}