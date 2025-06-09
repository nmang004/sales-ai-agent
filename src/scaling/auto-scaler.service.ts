// Auto-Scaling Service for Sales AI Agent Platform

import { EventEmitter } from 'events';
import { logger } from '@/shared/utils/logger';
import MetricsService from '@/monitoring/metrics.service';

export interface ScalingPolicy {
  id: string;
  name: string;
  targetService: string;
  enabled: boolean;
  
  // Scale up conditions
  scaleUpMetric: string;
  scaleUpThreshold: number;
  scaleUpCooldown: number; // milliseconds
  scaleUpBy: number;
  
  // Scale down conditions
  scaleDownMetric: string;
  scaleDownThreshold: number;
  scaleDownCooldown: number; // milliseconds
  scaleDownBy: number;
  
  // Limits
  minInstances: number;
  maxInstances: number;
  
  // Advanced settings
  evaluationPeriods: number; // number of periods metric must be above/below threshold
  periodDuration: number; // milliseconds
  scalingStrategy: 'linear' | 'exponential' | 'target_tracking';
  
  // Target tracking specific
  targetValue?: number;
  
  // Custom conditions
  customConditions?: {
    scaleUp?: (metrics: any) => boolean;
    scaleDown?: (metrics: any) => boolean;
  };
}

export interface ScalingAction {
  id: string;
  policyId: string;
  service: string;
  action: 'scale_up' | 'scale_down';
  currentInstances: number;
  targetInstances: number;
  reason: string;
  timestamp: Date;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  error?: string;
}

export interface ServiceInstance {
  id: string;
  service: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped';
  startTime: Date;
  endTime?: Date;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  resourceUsage: {
    cpu: number;
    memory: number;
    connections: number;
  };
  metadata: Record<string, any>;
}

export interface AutoScalerConfig {
  enabled: boolean;
  evaluationInterval: number; // milliseconds
  defaultCooldown: number; // milliseconds
  maxConcurrentActions: number;
  enablePredictiveScaling: boolean;
  
  // Safety limits
  globalMaxInstances: number;
  emergencyThreshold: number; // CPU/memory threshold to trigger emergency scaling
  
  // Kubernetes integration
  kubernetesEnabled: boolean;
  namespace: string;
  
  // Monitoring
  enableDetailedLogging: boolean;
  metricsRetention: number; // days
}

export class AutoScalerService extends EventEmitter {
  private config: AutoScalerConfig;
  private metricsService: MetricsService;
  private scalingPolicies: Map<string, ScalingPolicy>;
  private activeActions: Map<string, ScalingAction>;
  private serviceInstances: Map<string, ServiceInstance[]>;
  private lastScalingActions: Map<string, Date>; // Track cooldowns
  private evaluationInterval: NodeJS.Timeout | null = null;
  private actionQueue: ScalingAction[] = [];

  constructor(
    metricsService: MetricsService,
    config?: Partial<AutoScalerConfig>
  ) {
    super();
    
    this.config = {
      enabled: true,
      evaluationInterval: 30000, // 30 seconds
      defaultCooldown: 300000, // 5 minutes
      maxConcurrentActions: 3,
      enablePredictiveScaling: true,
      globalMaxInstances: 50,
      emergencyThreshold: 0.90, // 90%
      kubernetesEnabled: false,
      namespace: 'sales-ai-agent',
      enableDetailedLogging: true,
      metricsRetention: 7,
      ...config
    };

    this.metricsService = metricsService;
    this.scalingPolicies = new Map();
    this.activeActions = new Map();
    this.serviceInstances = new Map();
    this.lastScalingActions = new Map();

    this.setupDefaultPolicies();
    this.startEvaluationLoop();
  }

  // Policy management
  addScalingPolicy(policy: ScalingPolicy): void {
    this.scalingPolicies.set(policy.id, policy);
    logger.info('Scaling policy added', { 
      policyId: policy.id, 
      service: policy.targetService 
    });
  }

  removeScalingPolicy(policyId: string): void {
    this.scalingPolicies.delete(policyId);
    logger.info('Scaling policy removed', { policyId });
  }

  updateScalingPolicy(policyId: string, updates: Partial<ScalingPolicy>): void {
    const policy = this.scalingPolicies.get(policyId);
    if (policy) {
      this.scalingPolicies.set(policyId, { ...policy, ...updates });
      logger.info('Scaling policy updated', { policyId, updates });
    }
  }

  getScalingPolicy(policyId: string): ScalingPolicy | undefined {
    return this.scalingPolicies.get(policyId);
  }

  getAllPolicies(): ScalingPolicy[] {
    return Array.from(this.scalingPolicies.values());
  }

  // Service instance management
  registerServiceInstance(instance: ServiceInstance): void {
    if (!this.serviceInstances.has(instance.service)) {
      this.serviceInstances.set(instance.service, []);
    }
    
    const instances = this.serviceInstances.get(instance.service)!;
    instances.push(instance);
    
    this.metricsService.recordMetric(
      'autoscaler.instances.registered',
      1,
      'count',
      { service: instance.service }
    );
    
    logger.debug('Service instance registered', {
      instanceId: instance.id,
      service: instance.service
    });
  }

  unregisterServiceInstance(instanceId: string, service: string): void {
    const instances = this.serviceInstances.get(service);
    if (instances) {
      const index = instances.findIndex(i => i.id === instanceId);
      if (index !== -1) {
        instances.splice(index, 1);
        
        this.metricsService.recordMetric(
          'autoscaler.instances.unregistered',
          1,
          'count',
          { service }
        );
        
        logger.debug('Service instance unregistered', { instanceId, service });
      }
    }
  }

  updateInstanceHealth(instanceId: string, service: string, healthStatus: ServiceInstance['healthStatus']): void {
    const instances = this.serviceInstances.get(service);
    if (instances) {
      const instance = instances.find(i => i.id === instanceId);
      if (instance) {
        instance.healthStatus = healthStatus;
        
        this.metricsService.recordMetric(
          'autoscaler.instances.health_update',
          healthStatus === 'healthy' ? 1 : 0,
          'boolean',
          { service, instanceId, healthStatus }
        );
      }
    }
  }

  updateInstanceResourceUsage(instanceId: string, service: string, resourceUsage: ServiceInstance['resourceUsage']): void {
    const instances = this.serviceInstances.get(service);
    if (instances) {
      const instance = instances.find(i => i.id === instanceId);
      if (instance) {
        instance.resourceUsage = resourceUsage;
        
        // Record resource usage metrics
        this.metricsService.recordMetric(
          'autoscaler.instances.cpu_usage',
          resourceUsage.cpu,
          'percentage',
          { service, instanceId }
        );
        
        this.metricsService.recordMetric(
          'autoscaler.instances.memory_usage',
          resourceUsage.memory,
          'percentage',
          { service, instanceId }
        );
        
        this.metricsService.recordMetric(
          'autoscaler.instances.connections',
          resourceUsage.connections,
          'count',
          { service, instanceId }
        );
      }
    }
  }

  // Scaling operations
  async scaleService(service: string, targetInstances: number, reason: string): Promise<ScalingAction> {
    const currentInstances = this.getServiceInstanceCount(service);
    
    if (targetInstances === currentInstances) {
      throw new Error(`Service ${service} already has ${targetInstances} instances`);
    }
    
    const action: ScalingAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      policyId: 'manual',
      service,
      action: targetInstances > currentInstances ? 'scale_up' : 'scale_down',
      currentInstances,
      targetInstances,
      reason,
      timestamp: new Date(),
      status: 'pending'
    };
    
    this.actionQueue.push(action);
    this.activeActions.set(action.id, action);
    
    logger.info('Scaling action queued', {
      actionId: action.id,
      service,
      currentInstances,
      targetInstances,
      reason
    });
    
    // Process the action
    this.processScalingAction(action);
    
    return action;
  }

  // Manual scaling methods
  async scaleUp(service: string, instances: number = 1): Promise<ScalingAction> {
    const currentCount = this.getServiceInstanceCount(service);
    return this.scaleService(service, currentCount + instances, `Manual scale up by ${instances}`);
  }

  async scaleDown(service: string, instances: number = 1): Promise<ScalingAction> {
    const currentCount = this.getServiceInstanceCount(service);
    const targetCount = Math.max(1, currentCount - instances); // Ensure at least 1 instance
    return this.scaleService(service, targetCount, `Manual scale down by ${instances}`);
  }

  async setDesiredInstances(service: string, instances: number): Promise<ScalingAction> {
    return this.scaleService(service, instances, `Set desired instances to ${instances}`);
  }

  // Query methods
  getServiceInstanceCount(service: string): number {
    const instances = this.serviceInstances.get(service) || [];
    return instances.filter(i => i.status === 'running' || i.status === 'starting').length;
  }

  getServiceInstances(service: string): ServiceInstance[] {
    return this.serviceInstances.get(service) || [];
  }

  getHealthyInstanceCount(service: string): number {
    const instances = this.serviceInstances.get(service) || [];
    return instances.filter(i => 
      (i.status === 'running' || i.status === 'starting') && 
      i.healthStatus === 'healthy'
    ).length;
  }

  getActiveScalingActions(): ScalingAction[] {
    return Array.from(this.activeActions.values());
  }

  getScalingHistory(service?: string, limit: number = 50): ScalingAction[] {
    // This would typically query a persistent store
    // For now, return empty array as this is in-memory
    return [];
  }

  // Private methods
  private setupDefaultPolicies(): void {
    // Lead Scoring Agent scaling policy
    this.addScalingPolicy({
      id: 'lead-scoring-cpu-scaling',
      name: 'Lead Scoring Agent CPU-based Scaling',
      targetService: 'lead-scoring-agent',
      enabled: true,
      scaleUpMetric: 'autoscaler.instances.cpu_usage',
      scaleUpThreshold: 70, // 70% CPU
      scaleUpCooldown: 300000, // 5 minutes
      scaleUpBy: 1,
      scaleDownMetric: 'autoscaler.instances.cpu_usage',
      scaleDownThreshold: 30, // 30% CPU
      scaleDownCooldown: 600000, // 10 minutes
      scaleDownBy: 1,
      minInstances: 2,
      maxInstances: 10,
      evaluationPeriods: 2,
      periodDuration: 60000, // 1 minute
      scalingStrategy: 'linear'
    });

    // Conversation Agent scaling policy
    this.addScalingPolicy({
      id: 'conversation-connection-scaling',
      name: 'Conversation Agent Connection-based Scaling',
      targetService: 'conversation-agent',
      enabled: true,
      scaleUpMetric: 'autoscaler.instances.connections',
      scaleUpThreshold: 40, // 40 connections per instance
      scaleUpCooldown: 180000, // 3 minutes
      scaleUpBy: 2, // Scale up by 2 for faster response
      scaleDownMetric: 'autoscaler.instances.connections',
      scaleDownThreshold: 10, // 10 connections per instance
      scaleDownCooldown: 600000, // 10 minutes
      scaleDownBy: 1,
      minInstances: 3,
      maxInstances: 20,
      evaluationPeriods: 1, // Faster response for real-time service
      periodDuration: 30000, // 30 seconds
      scalingStrategy: 'exponential'
    });

    // Email Agent scaling policy
    this.addScalingPolicy({
      id: 'email-queue-scaling',
      name: 'Email Agent Queue-based Scaling',
      targetService: 'email-agent',
      enabled: true,
      scaleUpMetric: 'email.queue_depth',
      scaleUpThreshold: 100, // 100 emails in queue
      scaleUpCooldown: 300000, // 5 minutes
      scaleUpBy: 1,
      scaleDownMetric: 'email.queue_depth',
      scaleDownThreshold: 10, // 10 emails in queue
      scaleDownCooldown: 600000, // 10 minutes
      scaleDownBy: 1,
      minInstances: 2,
      maxInstances: 8,
      evaluationPeriods: 2,
      periodDuration: 60000, // 1 minute
      scalingStrategy: 'target_tracking',
      targetValue: 50 // Target 50 emails per instance
    });

    // Forecasting Agent scaling policy
    this.addScalingPolicy({
      id: 'forecasting-schedule-scaling',
      name: 'Forecasting Agent Schedule-based Scaling',
      targetService: 'forecasting-agent',
      enabled: true,
      scaleUpMetric: 'forecasting.requests_pending',
      scaleUpThreshold: 10, // 10 pending requests
      scaleUpCooldown: 600000, // 10 minutes
      scaleUpBy: 1,
      scaleDownMetric: 'forecasting.requests_pending',
      scaleDownThreshold: 2, // 2 pending requests
      scaleDownCooldown: 1200000, // 20 minutes
      scaleDownBy: 1,
      minInstances: 1,
      maxInstances: 5,
      evaluationPeriods: 3,
      periodDuration: 120000, // 2 minutes
      scalingStrategy: 'linear'
    });
  }

  private startEvaluationLoop(): void {
    if (!this.config.enabled) return;

    this.evaluationInterval = setInterval(() => {
      this.evaluateScalingPolicies().catch(error => {
        logger.error('Scaling evaluation failed', error);
      });
    }, this.config.evaluationInterval);

    logger.info('Auto-scaling evaluation loop started', {
      interval: this.config.evaluationInterval
    });
  }

  private async evaluateScalingPolicies(): Promise<void> {
    if (!this.config.enabled) return;

    for (const [policyId, policy] of this.scalingPolicies) {
      if (!policy.enabled) continue;

      try {
        await this.evaluatePolicy(policy);
      } catch (error) {
        logger.error('Policy evaluation failed', error, { policyId });
      }
    }
  }

  private async evaluatePolicy(policy: ScalingPolicy): Promise<void> {
    const service = policy.targetService;
    const currentInstances = this.getServiceInstanceCount(service);
    
    // Check cooldown
    if (this.isInCooldown(policy.id)) {
      return;
    }
    
    // Get recent metrics for evaluation
    const now = new Date();
    const evaluationWindow = new Date(now.getTime() - (policy.evaluationPeriods * policy.periodDuration));
    
    const scaleUpMetrics = this.metricsService.getMetrics(policy.scaleUpMetric, {
      start: evaluationWindow,
      end: now
    });
    
    const scaleDownMetrics = this.metricsService.getMetrics(policy.scaleDownMetric, {
      start: evaluationWindow,
      end: now
    });
    
    // Evaluate scale up conditions
    if (this.shouldScaleUp(policy, scaleUpMetrics, currentInstances)) {
      const targetInstances = this.calculateTargetInstances(
        policy,
        'scale_up',
        currentInstances
      );
      
      await this.triggerScaling(policy, 'scale_up', currentInstances, targetInstances);
    }
    // Evaluate scale down conditions
    else if (this.shouldScaleDown(policy, scaleDownMetrics, currentInstances)) {
      const targetInstances = this.calculateTargetInstances(
        policy,
        'scale_down',
        currentInstances
      );
      
      await this.triggerScaling(policy, 'scale_down', currentInstances, targetInstances);
    }
  }

  private shouldScaleUp(policy: ScalingPolicy, metrics: any[], currentInstances: number): boolean {
    if (currentInstances >= policy.maxInstances) return false;
    
    // Check if we have enough metrics
    if (metrics.length < policy.evaluationPeriods) return false;
    
    // Custom conditions
    if (policy.customConditions?.scaleUp) {
      return policy.customConditions.scaleUp(metrics);
    }
    
    // Check if all recent periods exceed threshold
    const recentMetrics = metrics.slice(-policy.evaluationPeriods);
    return recentMetrics.every(metric => metric.value > policy.scaleUpThreshold);
  }

  private shouldScaleDown(policy: ScalingPolicy, metrics: any[], currentInstances: number): boolean {
    if (currentInstances <= policy.minInstances) return false;
    
    // Check if we have enough metrics
    if (metrics.length < policy.evaluationPeriods) return false;
    
    // Custom conditions
    if (policy.customConditions?.scaleDown) {
      return policy.customConditions.scaleDown(metrics);
    }
    
    // Check if all recent periods are below threshold
    const recentMetrics = metrics.slice(-policy.evaluationPeriods);
    return recentMetrics.every(metric => metric.value < policy.scaleDownThreshold);
  }

  private calculateTargetInstances(
    policy: ScalingPolicy,
    action: 'scale_up' | 'scale_down',
    currentInstances: number
  ): number {
    let targetInstances: number;
    
    switch (policy.scalingStrategy) {
      case 'linear':
        targetInstances = action === 'scale_up' 
          ? currentInstances + policy.scaleUpBy
          : currentInstances - policy.scaleDownBy;
        break;
        
      case 'exponential':
        const multiplier = action === 'scale_up' ? 1.5 : 0.7;
        targetInstances = Math.round(currentInstances * multiplier);
        break;
        
      case 'target_tracking':
        if (policy.targetValue) {
          // This would require more sophisticated calculation based on current load
          targetInstances = Math.round(currentInstances * 1.2); // Simplified
        } else {
          targetInstances = action === 'scale_up' 
            ? currentInstances + policy.scaleUpBy
            : currentInstances - policy.scaleDownBy;
        }
        break;
        
      default:
        targetInstances = action === 'scale_up' 
          ? currentInstances + policy.scaleUpBy
          : currentInstances - policy.scaleDownBy;
    }
    
    // Apply limits
    return Math.max(
      policy.minInstances,
      Math.min(policy.maxInstances, targetInstances)
    );
  }

  private async triggerScaling(
    policy: ScalingPolicy,
    action: 'scale_up' | 'scale_down',
    currentInstances: number,
    targetInstances: number
  ): Promise<void> {
    const scalingAction: ScalingAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      policyId: policy.id,
      service: policy.targetService,
      action,
      currentInstances,
      targetInstances,
      reason: `Policy ${policy.name} triggered ${action}`,
      timestamp: new Date(),
      status: 'pending'
    };
    
    this.actionQueue.push(scalingAction);
    this.activeActions.set(scalingAction.id, scalingAction);
    this.lastScalingActions.set(policy.id, new Date());
    
    // Record metrics
    this.metricsService.recordMetric(
      'autoscaler.actions.triggered',
      1,
      'count',
      { 
        service: policy.targetService,
        action,
        policyId: policy.id
      }
    );
    
    logger.info('Scaling action triggered', {
      actionId: scalingAction.id,
      policyId: policy.id,
      service: policy.targetService,
      action,
      currentInstances,
      targetInstances
    });
    
    // Process the action
    await this.processScalingAction(scalingAction);
  }

  private async processScalingAction(action: ScalingAction): Promise<void> {
    try {
      action.status = 'executing';
      this.emit('scaling_action_started', action);
      
      // Simulate scaling operation
      // In a real implementation, this would:
      // - Create/destroy Kubernetes pods
      // - Update load balancer configuration
      // - Wait for instances to be ready
      
      logger.info('Executing scaling action', {
        actionId: action.id,
        service: action.service,
        action: action.action,
        targetInstances: action.targetInstances
      });
      
      // Simulate scaling delay
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
      
      // Update action status
      action.status = 'completed';
      
      // Record metrics
      this.metricsService.recordMetric(
        'autoscaler.actions.completed',
        1,
        'count',
        { 
          service: action.service,
          action: action.action
        }
      );
      
      this.emit('scaling_action_completed', action);
      
      logger.info('Scaling action completed', {
        actionId: action.id,
        service: action.service,
        duration: Date.now() - action.timestamp.getTime()
      });
      
    } catch (error) {
      action.status = 'failed';
      action.error = (error as Error).message;
      
      this.metricsService.recordMetric(
        'autoscaler.actions.failed',
        1,
        'count',
        { 
          service: action.service,
          action: action.action
        }
      );
      
      this.emit('scaling_action_failed', action);
      
      logger.error('Scaling action failed', error, {
        actionId: action.id,
        service: action.service
      });
    } finally {
      // Remove from active actions after a delay
      setTimeout(() => {
        this.activeActions.delete(action.id);
      }, 60000); // Keep for 1 minute for status queries
    }
  }

  private isInCooldown(policyId: string): boolean {
    const lastAction = this.lastScalingActions.get(policyId);
    if (!lastAction) return false;
    
    const policy = this.scalingPolicies.get(policyId);
    if (!policy) return false;
    
    const cooldownPeriod = Math.max(policy.scaleUpCooldown, policy.scaleDownCooldown);
    return Date.now() - lastAction.getTime() < cooldownPeriod;
  }

  // Public control methods
  enableAutoScaling(): void {
    this.config.enabled = true;
    if (!this.evaluationInterval) {
      this.startEvaluationLoop();
    }
    logger.info('Auto-scaling enabled');
  }

  disableAutoScaling(): void {
    this.config.enabled = false;
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
    }
    logger.info('Auto-scaling disabled');
  }

  // Cleanup
  async shutdown(): Promise<void> {
    this.disableAutoScaling();
    
    // Wait for active actions to complete
    const activeActions = Array.from(this.activeActions.values());
    if (activeActions.length > 0) {
      logger.info('Waiting for active scaling actions to complete', {
        count: activeActions.length
      });
      
      // Wait up to 30 seconds for actions to complete
      let attempts = 0;
      while (this.activeActions.size > 0 && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }
    
    logger.info('Auto-scaler service shut down');
  }

  // Health check
  async healthCheck(): Promise<{ status: string; details: any }> {
    return {
      status: 'healthy',
      details: {
        enabled: this.config.enabled,
        activePolicies: this.scalingPolicies.size,
        activeActions: this.activeActions.size,
        queuedActions: this.actionQueue.length,
        totalServices: this.serviceInstances.size,
        totalInstances: Array.from(this.serviceInstances.values())
          .reduce((sum, instances) => sum + instances.length, 0)
      }
    };
  }
}

export default AutoScalerService;