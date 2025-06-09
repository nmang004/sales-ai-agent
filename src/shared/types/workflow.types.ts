// Workflow orchestration types for Voltagent multi-agent coordination

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  errorHandling?: WorkflowErrorHandling;
}

export interface WorkflowTrigger {
  event: string;
  conditions?: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  agent: string;
  action: string;
  parameters?: Record<string, any>;
  dependsOn?: string[];
  conditions?: Record<string, any>;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  critical?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
}

export interface WorkflowErrorHandling {
  onStepFailure: 'stop' | 'continue' | 'skip';
  onCriticalFailure: 'stop' | 'continue';
  notificationChannels?: string[];
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  context: WorkflowContext;
  stepResults: Map<string, StepResult>;
  currentStep?: number;
  triggeredBy?: string;
  errors: WorkflowError[];
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface WorkflowContext {
  [key: string]: any;
  leadId?: string;
  dealId?: string;
  userId?: string;
  sessionId?: string;
  campaignId?: string;
}

export interface StepResult {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime: Date;
  endTime?: Date;
  output?: any;
  error?: string;
}

export interface WorkflowError {
  step?: string;
  error: string;
  timestamp: Date;
}

export interface WorkflowRule {
  id: string;
  name: string;
  condition: string;
  action: WorkflowRuleAction;
  enabled: boolean;
}

export interface WorkflowRuleAction {
  type: 'trigger_workflow' | 'send_notification' | 'update_data';
  parameters: Record<string, any>;
}

export interface AgentWorkflowConfig {
  id: string;
  name: string;
  enabled: boolean;
  maxConcurrentActions: number;
  defaultTimeout: number;
  supportedActions: string[];
}