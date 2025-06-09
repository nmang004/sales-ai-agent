// Health Check Service for Sales AI Agent Platform

import { logger } from '@/shared/utils/logger';
import { LeadScoringAgent } from '@/agents/lead-scoring-agent';
import { ConversationAgent } from '@/agents/conversation-agent';
import { EmailAgent } from '@/agents/email-agent';
import { ForecastingAgent } from '@/agents/forecasting-agent';
import { WorkflowOrchestrator } from '@/workflow/orchestrator';
import MetricsService from './metrics.service';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: any;
  error?: string;
  timestamp: Date;
}

export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthCheckResult[];
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
    total: number;
  };
  timestamp: Date;
  uptime: number;
}

export interface HealthCheckConfig {
  timeout: number;
  interval: number;
  retries: number;
  degradedThreshold: number; // ms
  unhealthyThreshold: number; // ms
}

export class HealthService {
  private config: HealthCheckConfig;
  private metricsService: MetricsService;
  private services: Map<string, () => Promise<HealthCheckResult>>;
  private lastHealthCheck: SystemHealthStatus | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private startTime: Date;

  constructor(
    metricsService: MetricsService,
    config?: Partial<HealthCheckConfig>
  ) {
    this.config = {
      timeout: 5000, // 5 seconds
      interval: 30000, // 30 seconds
      retries: 2,
      degradedThreshold: 2000, // 2 seconds
      unhealthyThreshold: 5000, // 5 seconds
      ...config
    };

    this.metricsService = metricsService;
    this.services = new Map();
    this.startTime = new Date();
    
    this.setupDefaultHealthChecks();
    this.startPeriodicHealthChecks();
  }

  // Register health check services
  registerAgent(name: string, agent: any): void {
    this.services.set(name, async () => {
      const startTime = Date.now();
      try {
        const result = await this.timeoutPromise(
          agent.healthCheck(),
          this.config.timeout,
          `${name} health check timeout`
        );
        
        const responseTime = Date.now() - startTime;
        const status = this.determineStatus(responseTime);
        
        return {
          service: name,
          status,
          responseTime,
          details: result,
          timestamp: new Date()
        };
      } catch (error) {
        const responseTime = Date.now() - startTime;
        return {
          service: name,
          status: 'unhealthy' as const,
          responseTime,
          error: (error as Error).message,
          timestamp: new Date()
        };
      }
    });
  }

  registerWorkflowOrchestrator(orchestrator: WorkflowOrchestrator): void {
    this.services.set('workflow-orchestrator', async () => {
      const startTime = Date.now();
      try {
        const result = await this.timeoutPromise(
          orchestrator.healthCheck(),
          this.config.timeout,
          'Workflow orchestrator health check timeout'
        );
        
        const responseTime = Date.now() - startTime;
        const status = this.determineStatus(responseTime);
        
        return {
          service: 'workflow-orchestrator',
          status,
          responseTime,
          details: result,
          timestamp: new Date()
        };
      } catch (error) {
        const responseTime = Date.now() - startTime;
        return {
          service: 'workflow-orchestrator',
          status: 'unhealthy' as const,
          responseTime,
          error: (error as Error).message,
          timestamp: new Date()
        };
      }
    });
  }

  // Register custom health check
  registerCustomCheck(name: string, checkFunction: () => Promise<any>): void {
    this.services.set(name, async () => {
      const startTime = Date.now();
      try {
        const result = await this.timeoutPromise(
          checkFunction(),
          this.config.timeout,
          `${name} health check timeout`
        );
        
        const responseTime = Date.now() - startTime;
        const status = this.determineStatus(responseTime);
        
        return {
          service: name,
          status,
          responseTime,
          details: result,
          timestamp: new Date()
        };
      } catch (error) {
        const responseTime = Date.now() - startTime;
        return {
          service: name,
          status: 'unhealthy' as const,
          responseTime,
          error: (error as Error).message,
          timestamp: new Date()
        };
      }
    });
  }

  // Perform health check for a specific service
  async checkService(serviceName: string): Promise<HealthCheckResult> {
    const checkFunction = this.services.get(serviceName);
    if (!checkFunction) {
      throw new Error(`Health check not found for service: ${serviceName}`);
    }

    let lastError: Error | null = null;
    
    // Retry logic
    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        const result = await checkFunction();
        
        // Record metrics
        this.metricsService.recordMetric(
          'health.check.response_time',
          result.responseTime,
          'ms',
          { service: serviceName, status: result.status }
        );
        
        this.metricsService.recordMetric(
          'health.check.status',
          result.status === 'healthy' ? 1 : 0,
          'boolean',
          { service: serviceName }
        );
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retries - 1) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }
    
    // All retries failed
    return {
      service: serviceName,
      status: 'unhealthy',
      responseTime: this.config.timeout,
      error: lastError?.message || 'Health check failed after retries',
      timestamp: new Date()
    };
  }

  // Perform comprehensive system health check
  async checkSystemHealth(): Promise<SystemHealthStatus> {
    const startTime = Date.now();
    
    try {
      // Run all health checks in parallel
      const healthCheckPromises = Array.from(this.services.keys()).map(
        serviceName => this.checkService(serviceName)
      );
      
      const results = await Promise.all(healthCheckPromises);
      
      // Calculate summary
      const summary = {
        healthy: results.filter(r => r.status === 'healthy').length,
        degraded: results.filter(r => r.status === 'degraded').length,
        unhealthy: results.filter(r => r.status === 'unhealthy').length,
        total: results.length
      };
      
      // Determine overall status
      let overall: 'healthy' | 'degraded' | 'unhealthy';
      if (summary.unhealthy > 0) {
        overall = 'unhealthy';
      } else if (summary.degraded > 0) {
        overall = 'degraded';
      } else {
        overall = 'healthy';
      }
      
      const systemHealth: SystemHealthStatus = {
        overall,
        services: results,
        summary,
        timestamp: new Date(),
        uptime: (Date.now() - this.startTime.getTime()) / 1000
      };
      
      this.lastHealthCheck = systemHealth;
      
      // Record system-level metrics
      this.metricsService.recordMetric(
        'health.system.overall',
        overall === 'healthy' ? 1 : overall === 'degraded' ? 0.5 : 0,
        'score',
        { overall }
      );
      
      this.metricsService.recordMetric(
        'health.system.check_duration',
        Date.now() - startTime,
        'ms'
      );
      
      this.metricsService.recordMetric(
        'health.system.services_healthy',
        summary.healthy,
        'count'
      );
      
      this.metricsService.recordMetric(
        'health.system.services_unhealthy',
        summary.unhealthy,
        'count'
      );
      
      logger.info('System health check completed', {
        overall,
        summary,
        duration: Date.now() - startTime
      });
      
      return systemHealth;
      
    } catch (error) {
      logger.error('System health check failed', error as Error);
      
      const failedHealth: SystemHealthStatus = {
        overall: 'unhealthy',
        services: [],
        summary: { healthy: 0, degraded: 0, unhealthy: 0, total: 0 },
        timestamp: new Date(),
        uptime: (Date.now() - this.startTime.getTime()) / 1000
      };
      
      this.lastHealthCheck = failedHealth;
      return failedHealth;
    }
  }

  // Get the last health check result
  getLastHealthCheck(): SystemHealthStatus | null {
    return this.lastHealthCheck;
  }

  // Get health status for a specific service
  getServiceHealth(serviceName: string): HealthCheckResult | null {
    if (!this.lastHealthCheck) return null;
    
    return this.lastHealthCheck.services.find(s => s.service === serviceName) || null;
  }

  // Check if system is healthy
  isSystemHealthy(): boolean {
    return this.lastHealthCheck?.overall === 'healthy' || false;
  }

  // Get system uptime
  getUptime(): number {
    return (Date.now() - this.startTime.getTime()) / 1000;
  }

  // Private helper methods
  private determineStatus(responseTime: number): 'healthy' | 'degraded' | 'unhealthy' {
    if (responseTime >= this.config.unhealthyThreshold) {
      return 'unhealthy';
    } else if (responseTime >= this.config.degradedThreshold) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  private async timeoutPromise<T>(
    promise: Promise<T>,
    timeout: number,
    timeoutMessage: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeout);
      
      promise
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private setupDefaultHealthChecks(): void {
    // Database health check
    this.registerCustomCheck('database', async () => {
      // This would typically check database connectivity
      // For now, we'll simulate a simple check
      const startTime = Date.now();
      
      try {
        // Simulate database ping
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        
        return {
          status: 'connected',
          responseTime: Date.now() - startTime,
          connections: {
            active: 10,
            idle: 5,
            total: 15
          }
        };
      } catch (error) {
        throw error;
      }
    });

    // Redis health check
    this.registerCustomCheck('redis', async () => {
      const startTime = Date.now();
      
      try {
        // Simulate Redis ping
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        
        return {
          status: 'connected',
          responseTime: Date.now() - startTime,
          memoryUsage: '156MB',
          connectedClients: 8
        };
      } catch (error) {
        throw error;
      }
    });

    // Claude API health check
    this.registerCustomCheck('claude-api', async () => {
      const startTime = Date.now();
      
      try {
        // Simulate Claude API ping
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
        
        return {
          status: 'available',
          responseTime: Date.now() - startTime,
          rateLimits: {
            remaining: 1000,
            resetTime: new Date(Date.now() + 3600000)
          }
        };
      } catch (error) {
        throw error;
      }
    });

    // External integrations health check
    this.registerCustomCheck('external-integrations', async () => {
      const integrations = ['sendgrid', 'clearbit', 'linkedin', 'deepgram'];
      const results = {};
      
      for (const integration of integrations) {
        try {
          // Simulate integration check
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
          results[integration] = { status: 'available', responseTime: Math.random() * 100 };
        } catch (error) {
          results[integration] = { status: 'unavailable', error: (error as Error).message };
        }
      }
      
      return {
        integrations: results,
        summary: {
          total: integrations.length,
          available: Object.values(results).filter(r => r['status'] === 'available').length
        }
      };
    });
  }

  private startPeriodicHealthChecks(): void {
    // Initial health check
    this.checkSystemHealth().catch(error => {
      logger.error('Initial health check failed', error);
    });
    
    // Periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.checkSystemHealth().catch(error => {
        logger.error('Periodic health check failed', error);
      });
    }, this.config.interval);
  }

  // Shutdown and cleanup
  async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Perform final health check
    try {
      await this.checkSystemHealth();
    } catch (error) {
      logger.error('Final health check failed during shutdown', error);
    }
    
    logger.info('Health service shut down');
  }

  // Health check endpoint response
  async getHealthResponse(): Promise<{
    status: number;
    data: SystemHealthStatus;
  }> {
    const health = await this.checkSystemHealth();
    
    let statusCode: number;
    switch (health.overall) {
      case 'healthy':
        statusCode = 200;
        break;
      case 'degraded':
        statusCode = 200; // Still operational
        break;
      case 'unhealthy':
        statusCode = 503; // Service unavailable
        break;
      default:
        statusCode = 500;
    }
    
    return {
      status: statusCode,
      data: health
    };
  }
}

export default HealthService;