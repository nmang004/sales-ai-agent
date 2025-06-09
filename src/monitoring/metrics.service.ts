// Comprehensive Metrics Service for Sales AI Agent Platform

import { EventEmitter } from 'events';
import { logger } from '@/shared/utils/logger';
import { performance } from 'perf_hooks';

export interface MetricData {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // milliseconds
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  cooldown: number; // milliseconds between alerts
}

export interface PerformanceMetrics {
  agentResponseTime: number;
  claudeApiLatency: number;
  databaseQueryTime: number;
  workflowExecutionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  errorRate: number;
  throughput: number;
}

export interface BusinessMetrics {
  leadsProcessed: number;
  leadsScored: number;
  emailsSent: number;
  callsAnalyzed: number;
  forecastsGenerated: number;
  workflowsCompleted: number;
  averageLeadScore: number;
  conversionRate: number;
}

export interface SystemMetrics {
  activeConnections: number;
  queueDepth: number;
  cacheHitRate: number;
  diskUsage: number;
  networkLatency: number;
  uptime: number;
}

export class MetricsService extends EventEmitter {
  private metrics: Map<string, MetricData[]>;
  private alertRules: Map<string, AlertRule>;
  private activeAlerts: Map<string, Date>;
  private metricBuffers: Map<string, MetricData[]>;
  private flushInterval: NodeJS.Timeout;
  private config: {
    bufferSize: number;
    flushIntervalMs: number;
    retentionPeriodMs: number;
    alertCooldownMs: number;
  };

  constructor(config?: Partial<typeof MetricsService.prototype.config>) {
    super();
    this.config = {
      bufferSize: 1000,
      flushIntervalMs: 30000, // 30 seconds
      retentionPeriodMs: 86400000, // 24 hours
      alertCooldownMs: 300000, // 5 minutes
      ...config
    };

    this.metrics = new Map();
    this.alertRules = new Map();
    this.activeAlerts = new Map();
    this.metricBuffers = new Map();

    this.setupDefaultAlertRules();
    this.startPeriodicFlush();
    this.startMetricCollection();
  }

  // Core metric recording methods
  recordMetric(name: string, value: number, unit: string = 'count', tags: Record<string, string> = {}): void {
    const metric: MetricData = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags,
      metadata: {}
    };

    this.bufferMetric(metric);
    this.checkAlertRules(metric);
  }

  recordPerformanceMetric(metricName: string, startTime: number, tags: Record<string, string> = {}): void {
    const duration = performance.now() - startTime;
    this.recordMetric(metricName, duration, 'ms', { ...tags, type: 'performance' });
  }

  recordBusinessMetric(metricName: string, value: number, tags: Record<string, string> = {}): void {
    this.recordMetric(metricName, value, 'count', { ...tags, type: 'business' });
  }

  recordSystemMetric(metricName: string, value: number, unit: string = 'count', tags: Record<string, string> = {}): void {
    this.recordMetric(metricName, value, unit, { ...tags, type: 'system' });
  }

  // Timer utility for measuring execution time
  startTimer(name: string, tags: Record<string, string> = {}): () => void {
    const startTime = performance.now();
    return () => {
      this.recordPerformanceMetric(name, startTime, tags);
    };
  }

  // Counter increment
  increment(metricName: string, value: number = 1, tags: Record<string, string> = {}): void {
    this.recordMetric(metricName, value, 'count', tags);
  }

  // Gauge value setting
  gauge(metricName: string, value: number, unit: string = 'value', tags: Record<string, string> = {}): void {
    this.recordMetric(metricName, value, unit, tags);
  }

  // Histogram for distribution tracking
  histogram(metricName: string, value: number, tags: Record<string, string> = {}): void {
    this.recordMetric(`${metricName}.histogram`, value, 'value', tags);
  }

  // Alert rule management
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    logger.info('Alert rule added', { ruleId: rule.id, metric: rule.metric });
  }

  removeAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
    logger.info('Alert rule removed', { ruleId });
  }

  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): void {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      this.alertRules.set(ruleId, { ...rule, ...updates });
      logger.info('Alert rule updated', { ruleId, updates });
    }
  }

  // Metric retrieval methods
  getMetrics(name: string, timeRange?: { start: Date; end: Date }): MetricData[] {
    const allMetrics = this.metrics.get(name) || [];
    
    if (!timeRange) {
      return allMetrics;
    }

    return allMetrics.filter(metric => 
      metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    );
  }

  getAggregatedMetrics(name: string, aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count', timeRange?: { start: Date; end: Date }): number {
    const metrics = this.getMetrics(name, timeRange);
    const values = metrics.map(m => m.value);

    switch (aggregation) {
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'avg':
        return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
      case 'min':
        return values.length > 0 ? Math.min(...values) : 0;
      case 'max':
        return values.length > 0 ? Math.max(...values) : 0;
      case 'count':
        return values.length;
      default:
        return 0;
    }
  }

  getCurrentPerformanceMetrics(): PerformanceMetrics {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 300000);
    
    return {
      agentResponseTime: this.getAggregatedMetrics('agent.response_time', 'avg', { start: fiveMinutesAgo, end: now }),
      claudeApiLatency: this.getAggregatedMetrics('claude.api_latency', 'avg', { start: fiveMinutesAgo, end: now }),
      databaseQueryTime: this.getAggregatedMetrics('database.query_time', 'avg', { start: fiveMinutesAgo, end: now }),
      workflowExecutionTime: this.getAggregatedMetrics('workflow.execution_time', 'avg', { start: fiveMinutesAgo, end: now }),
      memoryUsage: this.getLatestMetricValue('system.memory_usage') || 0,
      cpuUsage: this.getLatestMetricValue('system.cpu_usage') || 0,
      errorRate: this.getAggregatedMetrics('errors.rate', 'avg', { start: fiveMinutesAgo, end: now }),
      throughput: this.getAggregatedMetrics('requests.throughput', 'sum', { start: fiveMinutesAgo, end: now })
    };
  }

  getCurrentBusinessMetrics(): BusinessMetrics {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 86400000);
    
    return {
      leadsProcessed: this.getAggregatedMetrics('leads.processed', 'sum', { start: oneDayAgo, end: now }),
      leadsScored: this.getAggregatedMetrics('leads.scored', 'sum', { start: oneDayAgo, end: now }),
      emailsSent: this.getAggregatedMetrics('emails.sent', 'sum', { start: oneDayAgo, end: now }),
      callsAnalyzed: this.getAggregatedMetrics('calls.analyzed', 'sum', { start: oneDayAgo, end: now }),
      forecastsGenerated: this.getAggregatedMetrics('forecasts.generated', 'sum', { start: oneDayAgo, end: now }),
      workflowsCompleted: this.getAggregatedMetrics('workflows.completed', 'sum', { start: oneDayAgo, end: now }),
      averageLeadScore: this.getAggregatedMetrics('leads.average_score', 'avg', { start: oneDayAgo, end: now }),
      conversionRate: this.getAggregatedMetrics('leads.conversion_rate', 'avg', { start: oneDayAgo, end: now })
    };
  }

  getCurrentSystemMetrics(): SystemMetrics {
    return {
      activeConnections: this.getLatestMetricValue('system.active_connections') || 0,
      queueDepth: this.getLatestMetricValue('system.queue_depth') || 0,
      cacheHitRate: this.getLatestMetricValue('system.cache_hit_rate') || 0,
      diskUsage: this.getLatestMetricValue('system.disk_usage') || 0,
      networkLatency: this.getLatestMetricValue('system.network_latency') || 0,
      uptime: this.getLatestMetricValue('system.uptime') || 0
    };
  }

  // Private helper methods
  private bufferMetric(metric: MetricData): void {
    if (!this.metricBuffers.has(metric.name)) {
      this.metricBuffers.set(metric.name, []);
    }

    const buffer = this.metricBuffers.get(metric.name)!;
    buffer.push(metric);

    // Immediate flush if buffer is full
    if (buffer.length >= this.config.bufferSize) {
      this.flushMetric(metric.name);
    }
  }

  private flushMetric(metricName: string): void {
    const buffer = this.metricBuffers.get(metricName);
    if (!buffer || buffer.length === 0) return;

    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }

    const existingMetrics = this.metrics.get(metricName)!;
    existingMetrics.push(...buffer);

    // Clear buffer
    this.metricBuffers.set(metricName, []);

    // Clean old metrics
    this.cleanOldMetrics(metricName);

    logger.debug('Metrics flushed', { metricName, count: buffer.length });
  }

  private cleanOldMetrics(metricName: string): void {
    const metrics = this.metrics.get(metricName);
    if (!metrics) return;

    const cutoffTime = new Date(Date.now() - this.config.retentionPeriodMs);
    const filteredMetrics = metrics.filter(metric => metric.timestamp > cutoffTime);
    
    this.metrics.set(metricName, filteredMetrics);
  }

  private checkAlertRules(metric: MetricData): void {
    for (const [ruleId, rule] of this.alertRules) {
      if (rule.metric !== metric.name || !rule.enabled) continue;

      const shouldAlert = this.evaluateAlertCondition(rule, metric.value);
      
      if (shouldAlert && this.canTriggerAlert(ruleId)) {
        this.triggerAlert(rule, metric);
      }
    }
  }

  private evaluateAlertCondition(rule: AlertRule, value: number): boolean {
    switch (rule.condition) {
      case 'gt': return value > rule.threshold;
      case 'gte': return value >= rule.threshold;
      case 'lt': return value < rule.threshold;
      case 'lte': return value <= rule.threshold;
      case 'eq': return value === rule.threshold;
      default: return false;
    }
  }

  private canTriggerAlert(ruleId: string): boolean {
    const lastAlert = this.activeAlerts.get(ruleId);
    if (!lastAlert) return true;
    
    return Date.now() - lastAlert.getTime() > this.config.alertCooldownMs;
  }

  private triggerAlert(rule: AlertRule, metric: MetricData): void {
    this.activeAlerts.set(rule.id, new Date());
    
    const alert = {
      ruleId: rule.id,
      ruleName: rule.name,
      metric: metric.name,
      value: metric.value,
      threshold: rule.threshold,
      condition: rule.condition,
      severity: rule.severity,
      timestamp: metric.timestamp,
      tags: metric.tags
    };

    this.emit('alert', alert);
    
    logger.warn('Alert triggered', alert);
  }

  private getLatestMetricValue(metricName: string): number | null {
    const metrics = this.metrics.get(metricName);
    if (!metrics || metrics.length === 0) return null;
    
    return metrics[metrics.length - 1].value;
  }

  private setupDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-response-time',
        name: 'High Agent Response Time',
        metric: 'agent.response_time',
        condition: 'gt',
        threshold: 5000, // 5 seconds
        duration: 60000, // 1 minute
        severity: 'warning',
        enabled: true,
        cooldown: 300000 // 5 minutes
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        metric: 'errors.rate',
        condition: 'gt',
        threshold: 0.05, // 5%
        duration: 300000, // 5 minutes
        severity: 'critical',
        enabled: true,
        cooldown: 600000 // 10 minutes
      },
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        metric: 'system.memory_usage',
        condition: 'gt',
        threshold: 0.85, // 85%
        duration: 300000, // 5 minutes
        severity: 'warning',
        enabled: true,
        cooldown: 300000 // 5 minutes
      },
      {
        id: 'high-cpu-usage',
        name: 'High CPU Usage',
        metric: 'system.cpu_usage',
        condition: 'gt',
        threshold: 0.80, // 80%
        duration: 300000, // 5 minutes
        severity: 'warning',
        enabled: true,
        cooldown: 300000 // 5 minutes
      },
      {
        id: 'claude-api-timeout',
        name: 'Claude API High Latency',
        metric: 'claude.api_latency',
        condition: 'gt',
        threshold: 10000, // 10 seconds
        duration: 120000, // 2 minutes
        severity: 'critical',
        enabled: true,
        cooldown: 300000 // 5 minutes
      }
    ];

    defaultRules.forEach(rule => this.addAlertRule(rule));
  }

  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      for (const metricName of this.metricBuffers.keys()) {
        this.flushMetric(metricName);
      }
    }, this.config.flushIntervalMs);
  }

  private startMetricCollection(): void {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);
  }

  private collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Memory metrics
    this.gauge('system.memory_usage', memUsage.heapUsed / memUsage.heapTotal, 'ratio');
    this.gauge('system.memory_heap_used', memUsage.heapUsed, 'bytes');
    this.gauge('system.memory_heap_total', memUsage.heapTotal, 'bytes');
    
    // CPU metrics (approximation)
    this.gauge('system.cpu_user', cpuUsage.user / 1000000, 'seconds');
    this.gauge('system.cpu_system', cpuUsage.system / 1000000, 'seconds');
    
    // Uptime
    this.gauge('system.uptime', process.uptime(), 'seconds');
  }

  // Cleanup and shutdown
  async cleanup(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    // Final flush of all metrics
    for (const metricName of this.metricBuffers.keys()) {
      this.flushMetric(metricName);
    }

    logger.info('Metrics service cleaned up');
  }

  // Health check
  async healthCheck(): Promise<{ status: string; details: any }> {
    const metricCount = Array.from(this.metrics.values()).reduce((sum, metrics) => sum + metrics.length, 0);
    const bufferedCount = Array.from(this.metricBuffers.values()).reduce((sum, buffer) => sum + buffer.length, 0);
    
    return {
      status: 'healthy',
      details: {
        totalMetrics: metricCount,
        bufferedMetrics: bufferedCount,
        activeAlertRules: this.alertRules.size,
        activeAlerts: this.activeAlerts.size
      }
    };
  }
}

export default MetricsService;