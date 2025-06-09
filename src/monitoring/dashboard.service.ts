// Dashboard Service for Real-time Monitoring and Analytics

import { EventEmitter } from 'events';
import { logger } from '@/shared/utils/logger';
import MetricsService, { PerformanceMetrics, BusinessMetrics, SystemMetrics } from './metrics.service';
import HealthService, { SystemHealthStatus } from './health.service';
import AutoScalerService from '@/scaling/auto-scaler.service';
import SecurityService from '@/security/security.service';

export interface DashboardConfig {
  refreshInterval: number; // milliseconds
  dataRetention: number; // hours
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    cpuUsage: number;
    memoryUsage: number;
  };
  enableRealTimeUpdates: boolean;
  maxConnections: number;
}

export interface DashboardData {
  timestamp: Date;
  system: SystemHealthStatus;
  performance: PerformanceMetrics;
  business: BusinessMetrics;
  systemMetrics: SystemMetrics;
  security: {
    activeThreats: number;
    securityEvents: number;
    authFailures: number;
    apiKeyUsage: number;
  };
  scaling: {
    activeInstances: Record<string, number>;
    scalingActions: number;
    resourceUtilization: Record<string, number>;
  };
  agents: {
    leadScoring: AgentStatus;
    conversation: AgentStatus;
    email: AgentStatus;
    forecasting: AgentStatus;
  };
  workflows: {
    active: number;
    completed: number;
    failed: number;
    avgExecutionTime: number;
  };
  alerts: ActiveAlert[];
}

export interface AgentStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  instances: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  lastActivity: Date;
  queueDepth: number;
}

export interface ActiveAlert {
  id: string;
  type: 'performance' | 'security' | 'system' | 'business';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface TimeSeriesData {
  metric: string;
  data: Array<{
    timestamp: Date;
    value: number;
    tags?: Record<string, string>;
  }>;
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count';
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'status' | 'alert_list';
  title: string;
  config: {
    metrics?: string[];
    timeRange?: string;
    chartType?: 'line' | 'bar' | 'pie' | 'gauge';
    refreshInterval?: number;
    size?: 'small' | 'medium' | 'large';
  };
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export class DashboardService extends EventEmitter {
  private config: DashboardConfig;
  private metricsService: MetricsService;
  private healthService: HealthService;
  private autoScalerService: AutoScalerService;
  private securityService: SecurityService;
  
  private currentData: DashboardData | null = null;
  private historicalData: DashboardData[] = [];
  private activeAlerts: Map<string, ActiveAlert> = new Map();
  private refreshInterval: NodeJS.Timeout | null = null;
  private connectedClients: Set<any> = new Set();

  constructor(
    metricsService: MetricsService,
    healthService: HealthService,
    autoScalerService: AutoScalerService,
    securityService: SecurityService,
    config?: Partial<DashboardConfig>
  ) {
    super();
    
    this.config = {
      refreshInterval: 5000, // 5 seconds
      dataRetention: 24, // 24 hours
      alertThresholds: {
        responseTime: 5000, // 5 seconds
        errorRate: 0.05, // 5%
        cpuUsage: 0.80, // 80%
        memoryUsage: 0.85 // 85%
      },
      enableRealTimeUpdates: true,
      maxConnections: 100,
      ...config
    };

    this.metricsService = metricsService;
    this.healthService = healthService;
    this.autoScalerService = autoScalerService;
    this.securityService = securityService;

    this.setupEventListeners();
    this.startDataCollection();
  }

  // Main dashboard data collection
  async collectDashboardData(): Promise<DashboardData> {
    const timestamp = new Date();
    
    try {
      // Collect data from all services
      const [
        systemHealth,
        performanceMetrics,
        businessMetrics,
        systemMetrics,
        securityData,
        scalingData,
        agentStatuses,
        workflowData
      ] = await Promise.all([
        this.healthService.checkSystemHealth(),
        this.metricsService.getCurrentPerformanceMetrics(),
        this.metricsService.getCurrentBusinessMetrics(),
        this.metricsService.getCurrentSystemMetrics(),
        this.collectSecurityData(),
        this.collectScalingData(),
        this.collectAgentStatuses(),
        this.collectWorkflowData()
      ]);

      const dashboardData: DashboardData = {
        timestamp,
        system: systemHealth,
        performance: performanceMetrics,
        business: businessMetrics,
        systemMetrics,
        security: securityData,
        scaling: scalingData,
        agents: agentStatuses,
        workflows: workflowData,
        alerts: Array.from(this.activeAlerts.values())
      };

      // Check for new alerts
      this.checkForAlerts(dashboardData);

      // Store current data
      this.currentData = dashboardData;

      // Store historical data
      this.historicalData.push(dashboardData);
      this.cleanupHistoricalData();

      // Emit update event
      this.emit('data_updated', dashboardData);

      // Send to connected clients if real-time updates are enabled
      if (this.config.enableRealTimeUpdates) {
        this.broadcastUpdate(dashboardData);
      }

      return dashboardData;

    } catch (error) {
      logger.error('Failed to collect dashboard data', error as Error);
      throw error;
    }
  }

  // Get current dashboard data
  getCurrentData(): DashboardData | null {
    return this.currentData;
  }

  // Get historical data
  getHistoricalData(timeRange?: { start: Date; end: Date }): DashboardData[] {
    if (!timeRange) {
      return this.historicalData;
    }

    return this.historicalData.filter(data => 
      data.timestamp >= timeRange.start && data.timestamp <= timeRange.end
    );
  }

  // Get time series data for specific metrics
  getTimeSeriesData(metrics: string[], timeRange: { start: Date; end: Date }, aggregation: 'avg' | 'sum' | 'min' | 'max' = 'avg'): TimeSeriesData[] {
    return metrics.map(metric => {
      const data = this.metricsService.getMetrics(metric, timeRange);
      
      return {
        metric,
        data: data.map(d => ({
          timestamp: d.timestamp,
          value: d.value,
          tags: d.tags
        })),
        aggregation,
        timeRange
      };
    });
  }

  // Alert management
  createAlert(alert: Omit<ActiveAlert, 'id' | 'timestamp' | 'acknowledged'>): ActiveAlert {
    const fullAlert: ActiveAlert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      acknowledged: false
    };

    this.activeAlerts.set(fullAlert.id, fullAlert);

    // Record alert metric
    this.metricsService.recordMetric(
      'dashboard.alerts.created',
      1,
      'count',
      { 
        type: alert.type,
        severity: alert.severity,
        source: alert.source
      }
    );

    // Emit alert event
    this.emit('alert_created', fullAlert);

    logger.warn('Dashboard alert created', {
      alertId: fullAlert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title
    });

    return fullAlert;
  }

  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date();

      this.metricsService.recordMetric(
        'dashboard.alerts.acknowledged',
        1,
        'count',
        { 
          type: alert.type,
          severity: alert.severity
        }
      );

      this.emit('alert_acknowledged', alert);
      
      logger.info('Alert acknowledged', {
        alertId,
        acknowledgedBy,
        type: alert.type
      });

      return true;
    }

    return false;
  }

  dismissAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      this.activeAlerts.delete(alertId);

      this.metricsService.recordMetric(
        'dashboard.alerts.dismissed',
        1,
        'count',
        { 
          type: alert.type,
          severity: alert.severity
        }
      );

      this.emit('alert_dismissed', alert);
      
      logger.info('Alert dismissed', {
        alertId,
        type: alert.type
      });

      return true;
    }

    return false;
  }

  getActiveAlerts(filters?: {
    type?: string;
    severity?: string;
    acknowledged?: boolean;
  }): ActiveAlert[] {
    let alerts = Array.from(this.activeAlerts.values());

    if (filters) {
      if (filters.type) {
        alerts = alerts.filter(alert => alert.type === filters.type);
      }
      if (filters.severity) {
        alerts = alerts.filter(alert => alert.severity === filters.severity);
      }
      if (filters.acknowledged !== undefined) {
        alerts = alerts.filter(alert => alert.acknowledged === filters.acknowledged);
      }
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // WebSocket connection management
  addClient(client: any): void {
    if (this.connectedClients.size >= this.config.maxConnections) {
      throw new Error('Maximum dashboard connections reached');
    }

    this.connectedClients.add(client);
    
    // Send current data to new client
    if (this.currentData) {
      client.send(JSON.stringify({
        type: 'dashboard_data',
        data: this.currentData
      }));
    }

    this.metricsService.recordMetric(
      'dashboard.clients.connected',
      this.connectedClients.size,
      'count'
    );

    logger.debug('Dashboard client connected', {
      totalClients: this.connectedClients.size
    });
  }

  removeClient(client: any): void {
    this.connectedClients.delete(client);
    
    this.metricsService.recordMetric(
      'dashboard.clients.connected',
      this.connectedClients.size,
      'count'
    );

    logger.debug('Dashboard client disconnected', {
      totalClients: this.connectedClients.size
    });
  }

  // Private methods
  private setupEventListeners(): void {
    // Listen for scaling events
    this.autoScalerService.on('scaling_action_completed', (action) => {
      this.createAlert({
        type: 'system',
        severity: 'info',
        title: 'Auto-scaling Action Completed',
        description: `${action.service} scaled ${action.action} to ${action.targetInstances} instances`,
        source: 'auto-scaler'
      });
    });

    // Listen for security events
    this.securityService.on('security_event', (event) => {
      if (event.severity === 'high' || event.severity === 'critical') {
        this.createAlert({
          type: 'security',
          severity: event.severity === 'critical' ? 'critical' : 'warning',
          title: 'Security Event Detected',
          description: `${event.subType}: ${event.details?.error || 'Security incident detected'}`,
          source: 'security-service'
        });
      }
    });

    // Listen for metrics service alerts
    this.metricsService.on('alert', (alert) => {
      this.createAlert({
        type: 'performance',
        severity: alert.severity === 'critical' ? 'critical' : 'warning',
        title: `Metric Alert: ${alert.ruleName}`,
        description: `${alert.metric} ${alert.condition} ${alert.threshold} (current: ${alert.value})`,
        source: 'metrics-service'
      });
    });
  }

  private startDataCollection(): void {
    // Initial data collection
    this.collectDashboardData().catch(error => {
      logger.error('Initial dashboard data collection failed', error);
    });

    // Start periodic data collection
    this.refreshInterval = setInterval(() => {
      this.collectDashboardData().catch(error => {
        logger.error('Periodic dashboard data collection failed', error);
      });
    }, this.config.refreshInterval);

    logger.info('Dashboard data collection started', {
      refreshInterval: this.config.refreshInterval
    });
  }

  private async collectSecurityData(): Promise<DashboardData['security']> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);

    const securityEvents = this.securityService.getSecurityEvents({
      startDate: oneHourAgo,
      endDate: now
    });

    const authFailures = securityEvents.filter(e => 
      e.type === 'authentication' && !e.success
    ).length;

    const activeThreats = securityEvents.filter(e => 
      e.severity === 'high' || e.severity === 'critical'
    ).length;

    return {
      activeThreats,
      securityEvents: securityEvents.length,
      authFailures,
      apiKeyUsage: securityEvents.filter(e => e.subType?.includes('api_key')).length
    };
  }

  private async collectScalingData(): Promise<DashboardData['scaling']> {
    const healthCheck = await this.autoScalerService.healthCheck();
    const activeActions = this.autoScalerService.getActiveScalingActions();

    return {
      activeInstances: {
        'lead-scoring-agent': this.autoScalerService.getServiceInstanceCount('lead-scoring-agent'),
        'conversation-agent': this.autoScalerService.getServiceInstanceCount('conversation-agent'),
        'email-agent': this.autoScalerService.getServiceInstanceCount('email-agent'),
        'forecasting-agent': this.autoScalerService.getServiceInstanceCount('forecasting-agent')
      },
      scalingActions: activeActions.length,
      resourceUtilization: {
        'lead-scoring-agent': this.calculateResourceUtilization('lead-scoring-agent'),
        'conversation-agent': this.calculateResourceUtilization('conversation-agent'),
        'email-agent': this.calculateResourceUtilization('email-agent'),
        'forecasting-agent': this.calculateResourceUtilization('forecasting-agent')
      }
    };
  }

  private async collectAgentStatuses(): Promise<DashboardData['agents']> {
    const agents = ['lead-scoring', 'conversation', 'email', 'forecasting'];
    const statuses: Record<string, AgentStatus> = {};

    for (const agent of agents) {
      const health = this.healthService.getServiceHealth(agent);
      const instances = this.autoScalerService.getServiceInstanceCount(`${agent}-agent`);
      
      statuses[agent.replace('-', '')] = {
        status: health?.status || 'unknown',
        instances,
        responseTime: health?.responseTime || 0,
        throughput: this.getAgentThroughput(agent),
        errorRate: this.getAgentErrorRate(agent),
        lastActivity: new Date(),
        queueDepth: this.getAgentQueueDepth(agent)
      };
    }

    return statuses as DashboardData['agents'];
  }

  private async collectWorkflowData(): Promise<DashboardData['workflows']> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);

    const activeWorkflows = this.metricsService.getAggregatedMetrics(
      'workflow.active',
      'sum',
      { start: oneHourAgo, end: now }
    );

    const completedWorkflows = this.metricsService.getAggregatedMetrics(
      'workflow.completed',
      'sum',
      { start: oneHourAgo, end: now }
    );

    const failedWorkflows = this.metricsService.getAggregatedMetrics(
      'workflow.failed',
      'sum',
      { start: oneHourAgo, end: now }
    );

    const avgExecutionTime = this.metricsService.getAggregatedMetrics(
      'workflow.execution_time',
      'avg',
      { start: oneHourAgo, end: now }
    );

    return {
      active: activeWorkflows,
      completed: completedWorkflows,
      failed: failedWorkflows,
      avgExecutionTime
    };
  }

  private checkForAlerts(data: DashboardData): void {
    // Check performance thresholds
    if (data.performance.agentResponseTime > this.config.alertThresholds.responseTime) {
      this.createAlert({
        type: 'performance',
        severity: 'warning',
        title: 'High Response Time',
        description: `Agent response time is ${data.performance.agentResponseTime}ms (threshold: ${this.config.alertThresholds.responseTime}ms)`,
        source: 'dashboard-monitor'
      });
    }

    if (data.performance.errorRate > this.config.alertThresholds.errorRate) {
      this.createAlert({
        type: 'performance',
        severity: 'critical',
        title: 'High Error Rate',
        description: `Error rate is ${(data.performance.errorRate * 100).toFixed(2)}% (threshold: ${(this.config.alertThresholds.errorRate * 100)}%)`,
        source: 'dashboard-monitor'
      });
    }

    // Check system thresholds
    if (data.systemMetrics.cpuUsage > this.config.alertThresholds.cpuUsage) {
      this.createAlert({
        type: 'system',
        severity: 'warning',
        title: 'High CPU Usage',
        description: `CPU usage is ${(data.systemMetrics.cpuUsage * 100).toFixed(1)}% (threshold: ${(this.config.alertThresholds.cpuUsage * 100)}%)`,
        source: 'dashboard-monitor'
      });
    }

    if (data.systemMetrics.memoryUsage > this.config.alertThresholds.memoryUsage) {
      this.createAlert({
        type: 'system',
        severity: 'warning',
        title: 'High Memory Usage',
        description: `Memory usage is ${(data.systemMetrics.memoryUsage * 100).toFixed(1)}% (threshold: ${(this.config.alertThresholds.memoryUsage * 100)}%)`,
        source: 'dashboard-monitor'
      });
    }

    // Check system health
    if (data.system.overall === 'unhealthy') {
      this.createAlert({
        type: 'system',
        severity: 'critical',
        title: 'System Unhealthy',
        description: `${data.system.summary.unhealthy} services are unhealthy`,
        source: 'health-service'
      });
    }

    // Check for security threats
    if (data.security.activeThreats > 0) {
      this.createAlert({
        type: 'security',
        severity: 'critical',
        title: 'Active Security Threats',
        description: `${data.security.activeThreats} active security threats detected`,
        source: 'security-service'
      });
    }
  }

  private cleanupHistoricalData(): void {
    const cutoffTime = new Date(Date.now() - (this.config.dataRetention * 3600000));
    this.historicalData = this.historicalData.filter(data => data.timestamp > cutoffTime);
  }

  private broadcastUpdate(data: DashboardData): void {
    const message = JSON.stringify({
      type: 'dashboard_update',
      data
    });

    for (const client of this.connectedClients) {
      try {
        client.send(message);
      } catch (error) {
        logger.warn('Failed to send update to client', error);
        this.connectedClients.delete(client);
      }
    }
  }

  // Helper methods for agent metrics
  private calculateResourceUtilization(service: string): number {
    // Simplified calculation - in reality would aggregate instance resource usage
    return Math.random() * 100; // Placeholder
  }

  private getAgentThroughput(agent: string): number {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 300000);
    
    return this.metricsService.getAggregatedMetrics(
      `${agent}.throughput`,
      'sum',
      { start: fiveMinutesAgo, end: now }
    );
  }

  private getAgentErrorRate(agent: string): number {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 300000);
    
    return this.metricsService.getAggregatedMetrics(
      `${agent}.error_rate`,
      'avg',
      { start: fiveMinutesAgo, end: now }
    );
  }

  private getAgentQueueDepth(agent: string): number {
    return this.metricsService.getAggregatedMetrics(
      `${agent}.queue_depth`,
      'avg'
    ) || 0;
  }

  // Cleanup
  async shutdown(): Promise<void> {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    // Close all client connections
    for (const client of this.connectedClients) {
      try {
        client.close();
      } catch (error) {
        // Ignore errors during shutdown
      }
    }
    this.connectedClients.clear();

    logger.info('Dashboard service shut down');
  }

  // Health check
  async healthCheck(): Promise<{ status: string; details: any }> {
    return {
      status: 'healthy',
      details: {
        dataCollectionActive: this.refreshInterval !== null,
        connectedClients: this.connectedClients.size,
        activeAlerts: this.activeAlerts.size,
        historicalDataPoints: this.historicalData.length,
        lastDataUpdate: this.currentData?.timestamp
      }
    };
  }
}

export default DashboardService;