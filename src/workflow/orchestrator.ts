// Workflow Orchestrator - Coordinates multi-agent interactions

import { EventEmitter } from 'events';
import { logger } from '@/shared/utils/logger';
import { 
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowStep,
  WorkflowContext,
  AgentWorkflowConfig,
  ExecutionStatus,
  WorkflowTrigger,
  WorkflowRule
} from '@/shared/types/workflow.types';
import { LeadScoringAgent } from '@/agents/lead-scoring-agent';
import { ConversationAgent } from '@/agents/conversation-agent';
import { EmailAgent } from '@/agents/email-agent';
import { ForecastingAgent } from '@/agents/forecasting-agent';
import { WorkflowRepository } from '@/shared/repositories/workflow.repository';
import { circuitBreaker, retryWithBackoff } from '@/shared/utils/resilience';

export interface OrchestatorConfig {
  agents: {
    leadScoring: AgentWorkflowConfig;
    conversation: AgentWorkflowConfig;
    email: AgentWorkflowConfig;
    forecasting: AgentWorkflowConfig;
  };
  execution: {
    maxConcurrentWorkflows: number;
    stepTimeoutMs: number;
    retryAttempts: number;
    errorHandling: 'stop' | 'continue' | 'skip';
  };
  monitoring: {
    enableMetrics: boolean;
    enableTracing: boolean;
    alertOnFailures: boolean;
  };
}

export class WorkflowOrchestrator extends EventEmitter {
  private leadScoringAgent: LeadScoringAgent;
  private conversationAgent: ConversationAgent;
  private emailAgent: EmailAgent;
  private forecastingAgent: ForecastingAgent;
  private workflowRepository: WorkflowRepository;
  private config: OrchestatorConfig;
  private activeWorkflows: Map<string, WorkflowExecution>;
  private workflowDefinitions: Map<string, WorkflowDefinition>;

  constructor(
    config: OrchestatorConfig,
    agents: {
      leadScoring: LeadScoringAgent;
      conversation: ConversationAgent;
      email: EmailAgent;
      forecasting: ForecastingAgent;
    }
  ) {
    super();
    this.config = config;
    this.leadScoringAgent = agents.leadScoring;
    this.conversationAgent = agents.conversation;
    this.emailAgent = agents.email;
    this.forecastingAgent = agents.forecasting;
    this.workflowRepository = new WorkflowRepository();
    this.activeWorkflows = new Map();
    this.workflowDefinitions = new Map();
    
    this.setupEventHandlers();
    this.initializeWorkflowDefinitions();
  }

  private setupEventHandlers(): void {
    // Lead Scoring Agent Events
    this.leadScoringAgent.on('lead.scored', (event) => {
      this.handleEvent('lead.scored', event);
    });
    this.leadScoringAgent.on('lead.high_value_detected', (event) => {
      this.handleEvent('lead.high_value_detected', event);
    });

    // Conversation Agent Events  
    this.conversationAgent.on('call.analysis_completed', (event) => {
      this.handleEvent('call.analysis_completed', event);
    });
    this.conversationAgent.on('buying_signal.detected', (event) => {
      this.handleEvent('buying_signal.detected', event);
    });
    this.conversationAgent.on('objection.detected', (event) => {
      this.handleEvent('objection.detected', event);
    });

    // Email Agent Events
    this.emailAgent.on('sequence.completed', (event) => {
      this.handleEvent('sequence.completed', event);
    });
    this.emailAgent.on('lead.reply_received', (event) => {
      this.handleEvent('lead.reply_received', event);
    });

    // Forecasting Agent Events
    this.forecastingAgent.on('forecast.generated', (event) => {
      this.handleEvent('forecast.generated', event);
    });
    this.forecastingAgent.on('deal.probability_updated', (event) => {
      this.handleEvent('deal.probability_updated', event);
    });
  }

  private initializeWorkflowDefinitions(): void {
    // High-Value Lead Processing Workflow
    this.workflowDefinitions.set('high-value-lead-processing', {
      id: 'high-value-lead-processing',
      name: 'High-Value Lead Processing',
      description: 'Automated processing for high-value leads including scoring, personalization, and outreach',
      version: '1.0.0',
      triggers: [
        { event: 'lead.created', conditions: { leadScore: { gte: 80 } } },
        { event: 'lead.high_value_detected' }
      ],
      steps: [
        {
          id: 'enrich-lead',
          name: 'Enrich Lead Data',
          agent: 'lead-scoring',
          action: 'enrichLead',
          timeout: 30000,
          retryPolicy: { maxRetries: 2, backoffMs: 1000 }
        },
        {
          id: 'analyze-fit',
          name: 'Analyze Technical & Business Fit',
          agent: 'lead-scoring',
          action: 'analyzeFit',
          dependsOn: ['enrich-lead'],
          timeout: 15000
        },
        {
          id: 'create-email-sequence',
          name: 'Create Personalized Email Sequence',
          agent: 'email',
          action: 'createEmailSequence',
          dependsOn: ['analyze-fit'],
          timeout: 20000,
          parameters: {
            sequenceType: 'high-value-prospect',
            personalizationLevel: 'high'
          }
        },
        {
          id: 'update-forecast',
          name: 'Update Pipeline Forecast',
          agent: 'forecasting',
          action: 'updatePipelineForecast',
          dependsOn: ['analyze-fit'],
          timeout: 10000
        }
      ],
      errorHandling: {
        onStepFailure: 'continue',
        onCriticalFailure: 'stop',
        notificationChannels: ['sales-ops', 'engineering']
      }
    });

    // Call Analysis Workflow
    this.workflowDefinitions.set('call-analysis-workflow', {
      id: 'call-analysis-workflow',
      name: 'Sales Call Analysis & Follow-up',
      description: 'Process call recordings, generate insights, and trigger follow-up actions',
      version: '1.0.0',
      triggers: [
        { event: 'call.analysis_completed' }
      ],
      steps: [
        {
          id: 'extract-insights',
          name: 'Extract Call Insights',
          agent: 'conversation',
          action: 'generateCallSummary',
          timeout: 45000
        },
        {
          id: 'update-lead-score',
          name: 'Update Lead Score Based on Call',
          agent: 'lead-scoring',
          action: 'updateScoreFromCall',
          dependsOn: ['extract-insights'],
          timeout: 15000
        },
        {
          id: 'trigger-follow-up',
          name: 'Trigger Follow-up Sequence',
          agent: 'email',
          action: 'triggerFollowUpSequence',
          dependsOn: ['extract-insights'],
          timeout: 20000,
          conditions: {
            callOutcome: 'positive',
            followUpRequired: true
          }
        },
        {
          id: 'update-deal-probability',
          name: 'Update Deal Probability',
          agent: 'forecasting',
          action: 'analyzeDealProbability',
          dependsOn: ['extract-insights'],
          timeout: 25000
        }
      ],
      errorHandling: {
        onStepFailure: 'continue',
        onCriticalFailure: 'continue'
      }
    });

    // Buying Signal Response Workflow
    this.workflowDefinitions.set('buying-signal-response', {
      id: 'buying-signal-response',
      name: 'Buying Signal Response',
      description: 'Immediate response to strong buying signals detected in conversations or emails',
      version: '1.0.0',
      triggers: [
        { event: 'buying_signal.detected', conditions: { strength: { gte: 0.7 } } }
      ],
      steps: [
        {
          id: 'escalate-opportunity',
          name: 'Escalate to Sales Manager',
          agent: 'conversation',
          action: 'escalateOpportunity',
          timeout: 5000,
          priority: 'urgent'
        },
        {
          id: 'pause-email-sequences',
          name: 'Pause Automated Sequences',
          agent: 'email',
          action: 'pauseSequence',
          timeout: 5000
        },
        {
          id: 'schedule-demo',
          name: 'Auto-Schedule Demo',
          agent: 'email',
          action: 'scheduleDemo',
          dependsOn: ['escalate-opportunity'],
          timeout: 15000,
          conditions: {
            autoSchedulingEnabled: true,
            availableSlots: true
          }
        },
        {
          id: 'update-forecast-urgency',
          name: 'Update Forecast with Urgency',
          agent: 'forecasting',
          action: 'updateDealUrgency',
          timeout: 10000
        }
      ],
      errorHandling: {
        onStepFailure: 'continue',
        onCriticalFailure: 'continue'
      }
    });

    // Weekly Forecast Update Workflow
    this.workflowDefinitions.set('weekly-forecast-update', {
      id: 'weekly-forecast-update',
      name: 'Weekly Forecast Update',
      description: 'Comprehensive weekly forecast generation and distribution',
      version: '1.0.0',
      triggers: [
        { event: 'schedule.weekly', conditions: { day: 'monday', hour: 9 } }
      ],
      steps: [
        {
          id: 'generate-forecast',
          name: 'Generate Weekly Forecast',
          agent: 'forecasting',
          action: 'generateRevenueForecast',
          timeout: 120000,
          parameters: {
            timeRange: 'next_quarter',
            includeScenarios: true,
            confidenceIntervals: true
          }
        },
        {
          id: 'analyze-pipeline-health',
          name: 'Analyze Pipeline Health',
          agent: 'forecasting',
          action: 'analyzePipelineHealth',
          dependsOn: ['generate-forecast'],
          timeout: 60000
        },
        {
          id: 'identify-at-risk-deals',
          name: 'Identify At-Risk Deals',
          agent: 'forecasting',
          action: 'identifyAtRiskDeals',
          dependsOn: ['analyze-pipeline-health'],
          timeout: 30000
        },
        {
          id: 'send-forecast-report',
          name: 'Send Forecast Report',
          agent: 'email',
          action: 'sendForecastReport',
          dependsOn: ['identify-at-risk-deals'],
          timeout: 20000
        }
      ],
      errorHandling: {
        onStepFailure: 'continue',
        onCriticalFailure: 'stop'
      }
    });
  }

  async startWorkflow(
    workflowId: string,
    context: WorkflowContext,
    triggeredBy?: string
  ): Promise<string> {
    const workflow = this.workflowDefinitions.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: ExecutionStatus.RUNNING,
      startTime: new Date(),
      context,
      stepResults: new Map(),
      currentStep: 0,
      triggeredBy: triggeredBy || 'manual',
      errors: []
    };

    this.activeWorkflows.set(executionId, execution);

    logger.info('Starting workflow execution', {
      executionId,
      workflowId,
      triggeredBy
    });

    // Start execution asynchronously
    this.executeWorkflow(execution, workflow).catch(error => {
      logger.error('Workflow execution failed', error, {
        executionId,
        workflowId
      });
    });

    return executionId;
  }

  private async executeWorkflow(
    execution: WorkflowExecution,
    workflow: WorkflowDefinition
  ): Promise<void> {
    try {
      await this.emit('workflow.started', {
        executionId: execution.id,
        workflowId: workflow.id,
        timestamp: new Date()
      });

      // Execute steps in dependency order
      const stepQueue = this.buildExecutionQueue(workflow.steps);
      
      for (const stepBatch of stepQueue) {
        await this.executeStepBatch(execution, workflow, stepBatch);
      }

      execution.status = ExecutionStatus.COMPLETED;
      execution.endTime = new Date();

      await this.emit('workflow.completed', {
        executionId: execution.id,
        workflowId: workflow.id,
        duration: execution.endTime.getTime() - execution.startTime.getTime(),
        timestamp: new Date()
      });

      logger.info('Workflow completed successfully', {
        executionId: execution.id,
        workflowId: workflow.id,
        duration: execution.endTime.getTime() - execution.startTime.getTime()
      });

    } catch (error) {
      execution.status = ExecutionStatus.FAILED;
      execution.endTime = new Date();
      execution.errors.push({
        step: 'workflow',
        error: (error as Error).message,
        timestamp: new Date()
      });

      await this.emit('workflow.failed', {
        executionId: execution.id,
        workflowId: workflow.id,
        error: (error as Error).message,
        timestamp: new Date()
      });

      logger.error('Workflow execution failed', error as Error, {
        executionId: execution.id,
        workflowId: workflow.id
      });
    } finally {
      // Store execution results
      await this.workflowRepository.storeExecution(execution);
      
      // Clean up from active workflows after a delay
      setTimeout(() => {
        this.activeWorkflows.delete(execution.id);
      }, 300000); // 5 minutes
    }
  }

  private buildExecutionQueue(steps: WorkflowStep[]): WorkflowStep[][] {
    const queue: WorkflowStep[][] = [];
    const completed = new Set<string>();
    const remaining = [...steps];

    while (remaining.length > 0) {
      const batch = remaining.filter(step => {
        if (!step.dependsOn || step.dependsOn.length === 0) {
          return true;
        }
        return step.dependsOn.every(dep => completed.has(dep));
      });

      if (batch.length === 0) {
        throw new Error('Circular dependency detected in workflow steps');
      }

      queue.push(batch);
      
      batch.forEach(step => {
        completed.add(step.id);
        const index = remaining.indexOf(step);
        remaining.splice(index, 1);
      });
    }

    return queue;
  }

  private async executeStepBatch(
    execution: WorkflowExecution,
    workflow: WorkflowDefinition,
    steps: WorkflowStep[]
  ): Promise<void> {
    const promises = steps.map(step => this.executeStep(execution, workflow, step));
    await Promise.all(promises);
  }

  private async executeStep(
    execution: WorkflowExecution,
    workflow: WorkflowDefinition,
    step: WorkflowStep
  ): Promise<void> {
    const stepStartTime = Date.now();
    
    try {
      logger.debug('Executing workflow step', {
        executionId: execution.id,
        stepId: step.id,
        stepName: step.name
      });

      // Check step conditions
      if (step.conditions && !this.evaluateConditions(step.conditions, execution.context)) {
        logger.info('Step skipped due to unmet conditions', {
          executionId: execution.id,
          stepId: step.id
        });
        
        execution.stepResults.set(step.id, {
          stepId: step.id,
          status: 'skipped',
          startTime: new Date(stepStartTime),
          endTime: new Date(),
          output: { skipped: true, reason: 'conditions not met' }
        });
        
        return;
      }

      const agent = this.getAgent(step.agent);
      const timeout = step.timeout || this.config.execution.stepTimeoutMs;

      // Execute step with timeout and retry
      const result = await retryWithBackoff(
        () => this.executeAgentAction(agent, step, execution.context, timeout),
        step.retryPolicy?.maxRetries || this.config.execution.retryAttempts,
        step.retryPolicy?.backoffMs || 1000
      );

      execution.stepResults.set(step.id, {
        stepId: step.id,
        status: 'completed',
        startTime: new Date(stepStartTime),
        endTime: new Date(),
        output: result
      });

      await this.emit('workflow.step_completed', {
        executionId: execution.id,
        stepId: step.id,
        stepName: step.name,
        duration: Date.now() - stepStartTime,
        timestamp: new Date()
      });

      logger.debug('Step completed successfully', {
        executionId: execution.id,
        stepId: step.id,
        duration: Date.now() - stepStartTime
      });

    } catch (error) {
      const stepError = {
        step: step.id,
        error: (error as Error).message,
        timestamp: new Date()
      };

      execution.errors.push(stepError);
      execution.stepResults.set(step.id, {
        stepId: step.id,
        status: 'failed',
        startTime: new Date(stepStartTime),
        endTime: new Date(),
        error: (error as Error).message
      });

      await this.emit('workflow.step_failed', {
        executionId: execution.id,
        stepId: step.id,
        stepName: step.name,
        error: (error as Error).message,
        timestamp: new Date()
      });

      logger.error('Step execution failed', error as Error, {
        executionId: execution.id,
        stepId: step.id
      });

      // Handle step failure based on configuration
      if (step.critical || workflow.errorHandling?.onStepFailure === 'stop') {
        throw error;
      }
    }
  }

  private async executeAgentAction(
    agent: any,
    step: WorkflowStep,
    context: WorkflowContext,
    timeout: number
  ): Promise<any> {
    return await circuitBreaker(
      () => {
        const actionFn = agent[step.action];
        if (typeof actionFn !== 'function') {
          throw new Error(`Action ${step.action} not found on agent ${step.agent}`);
        }

        const params = {
          ...context,
          ...step.parameters
        };

        return actionFn.call(agent, params);
      },
      3, // max failures
      timeout
    );
  }

  private getAgent(agentName: string): any {
    switch (agentName) {
      case 'lead-scoring':
        return this.leadScoringAgent;
      case 'conversation':
        return this.conversationAgent;
      case 'email':
        return this.emailAgent;
      case 'forecasting':
        return this.forecastingAgent;
      default:
        throw new Error(`Unknown agent: ${agentName}`);
    }
  }

  private evaluateConditions(conditions: any, context: WorkflowContext): boolean {
    // Simple condition evaluation - can be extended for complex logic
    for (const [key, condition] of Object.entries(conditions)) {
      const contextValue = this.getNestedValue(context, key);
      
      if (typeof condition === 'object' && condition !== null) {
        const conditionObj = condition as any;
        
        if (conditionObj.gte !== undefined && contextValue < conditionObj.gte) return false;
        if (conditionObj.lte !== undefined && contextValue > conditionObj.lte) return false;
        if (conditionObj.eq !== undefined && contextValue !== conditionObj.eq) return false;
        if (conditionObj.neq !== undefined && contextValue === conditionObj.neq) return false;
        if (conditionObj.in !== undefined && !conditionObj.in.includes(contextValue)) return false;
      } else {
        if (contextValue !== condition) return false;
      }
    }
    
    return true;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async handleEvent(eventType: string, eventData: any): Promise<void> {
    logger.debug('Handling workflow event', { eventType, eventData });

    // Find workflows that should be triggered by this event
    const triggeredWorkflows = Array.from(this.workflowDefinitions.values())
      .filter(workflow => 
        workflow.triggers.some(trigger => 
          trigger.event === eventType && 
          (!trigger.conditions || this.evaluateConditions(trigger.conditions, eventData))
        )
      );

    // Start triggered workflows
    for (const workflow of triggeredWorkflows) {
      try {
        await this.startWorkflow(workflow.id, eventData, eventType);
      } catch (error) {
        logger.error('Failed to start triggered workflow', error as Error, {
          workflowId: workflow.id,
          eventType,
          eventData
        });
      }
    }
  }

  async pauseWorkflow(executionId: string): Promise<void> {
    const execution = this.activeWorkflows.get(executionId);
    if (!execution) {
      throw new Error(`Workflow execution not found: ${executionId}`);
    }

    execution.status = ExecutionStatus.PAUSED;
    
    await this.emit('workflow.paused', {
      executionId,
      timestamp: new Date()
    });

    logger.info('Workflow paused', { executionId });
  }

  async resumeWorkflow(executionId: string): Promise<void> {
    const execution = this.activeWorkflows.get(executionId);
    if (!execution) {
      throw new Error(`Workflow execution not found: ${executionId}`);
    }

    if (execution.status !== ExecutionStatus.PAUSED) {
      throw new Error(`Workflow is not paused: ${executionId}`);
    }

    execution.status = ExecutionStatus.RUNNING;
    
    await this.emit('workflow.resumed', {
      executionId,
      timestamp: new Date()
    });

    logger.info('Workflow resumed', { executionId });
  }

  async cancelWorkflow(executionId: string): Promise<void> {
    const execution = this.activeWorkflows.get(executionId);
    if (!execution) {
      throw new Error(`Workflow execution not found: ${executionId}`);
    }

    execution.status = ExecutionStatus.CANCELLED;
    execution.endTime = new Date();
    
    await this.emit('workflow.cancelled', {
      executionId,
      timestamp: new Date()
    });

    logger.info('Workflow cancelled', { executionId });
  }

  getActiveWorkflows(): WorkflowExecution[] {
    return Array.from(this.activeWorkflows.values());
  }

  getWorkflowStatus(executionId: string): WorkflowExecution | undefined {
    return this.activeWorkflows.get(executionId);
  }

  async getWorkflowHistory(workflowId: string, limit: number = 50): Promise<WorkflowExecution[]> {
    return await this.workflowRepository.getExecutionHistory(workflowId, limit);
  }

  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflowDefinitions.set(workflow.id, workflow);
    logger.info('Workflow registered', { workflowId: workflow.id });
  }

  unregisterWorkflow(workflowId: string): void {
    this.workflowDefinitions.delete(workflowId);
    logger.info('Workflow unregistered', { workflowId });
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    const activeCount = this.activeWorkflows.size;
    const definitionsCount = this.workflowDefinitions.size;
    
    return {
      status: 'healthy',
      details: {
        activeWorkflows: activeCount,
        registeredWorkflows: definitionsCount,
        agentConnections: {
          leadScoring: await this.leadScoringAgent.healthCheck(),
          conversation: await this.conversationAgent.healthCheck(),
          email: await this.emailAgent.healthCheck(),
          forecasting: await this.forecastingAgent.healthCheck()
        }
      }
    };
  }
}

export default WorkflowOrchestrator;