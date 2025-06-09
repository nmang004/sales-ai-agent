// Advanced logging utility for Sales AI Agent Platform

import winston from 'winston';
import { format } from 'winston';

export interface LogContext {
  agentId?: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  requestId?: string;
  operation?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface LoggerConfig {
  level: string;
  format: 'json' | 'text';
  outputs: LogOutput[];
  sampling?: number;
  masking?: MaskingConfig;
}

export interface LogOutput {
  type: 'console' | 'file' | 'elasticsearch' | 'cloudwatch';
  config: Record<string, any>;
}

export interface MaskingConfig {
  enabled: boolean;
  fields: string[];
  strategy: 'redact' | 'hash' | 'partial';
}

class Logger {
  private winston: winston.Logger;
  private config: LoggerConfig;
  private maskingConfig?: MaskingConfig;

  constructor(config: LoggerConfig) {
    this.config = config;
    this.maskingConfig = config.masking;
    this.winston = this.createWinstonLogger();
  }

  private createWinstonLogger(): winston.Logger {
    const logFormat = this.config.format === 'json' 
      ? format.combine(
          format.timestamp(),
          format.errors({ stack: true }),
          format.json(),
          format.printf(this.customFormatter.bind(this))
        )
      : format.combine(
          format.timestamp(),
          format.errors({ stack: true }),
          format.colorize(),
          format.printf(this.textFormatter.bind(this))
        );

    const transports: winston.transport[] = [];

    this.config.outputs.forEach(output => {
      switch (output.type) {
        case 'console':
          transports.push(new winston.transports.Console(output.config));
          break;
        case 'file':
          transports.push(new winston.transports.File(output.config));
          break;
        // Add other transport types as needed
      }
    });

    return winston.createLogger({
      level: this.config.level,
      format: logFormat,
      transports,
      exitOnError: false
    });
  }

  private customFormatter(info: winston.Logform.TransformableInfo): string {
    const { timestamp, level, message, ...meta } = info;
    
    const logEntry = {
      timestamp,
      level,
      message,
      service: 'sales-ai-agent',
      ...this.maskSensitiveData(meta)
    };

    return JSON.stringify(logEntry);
  }

  private textFormatter(info: winston.Logform.TransformableInfo): string {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  }

  private maskSensitiveData(data: any): any {
    if (!this.maskingConfig?.enabled || !data) return data;

    const masked = { ...data };
    
    this.maskingConfig.fields.forEach(field => {
      if (this.hasNestedProperty(masked, field)) {
        this.setNestedProperty(masked, field, this.maskValue(this.getNestedProperty(masked, field)));
      }
    });

    return masked;
  }

  private maskValue(value: any): string {
    if (typeof value !== 'string') return value;
    
    switch (this.maskingConfig?.strategy) {
      case 'redact':
        return '[REDACTED]';
      case 'hash':
        return this.hashValue(value);
      case 'partial':
        return this.partialMask(value);
      default:
        return value;
    }
  }

  private hashValue(value: string): string {
    // Simple hash for demonstration - use proper crypto in production
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `[HASH:${Math.abs(hash).toString(16)}]`;
  }

  private partialMask(value: string): string {
    if (value.length <= 4) return '****';
    return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
  }

  private hasNestedProperty(obj: any, path: string): boolean {
    return path.split('.').reduce((current, key) => current && current[key] !== undefined, obj);
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => current[key] = current[key] || {}, obj);
    target[lastKey] = value;
  }

  private shouldSample(): boolean {
    if (!this.config.sampling) return true;
    return Math.random() < this.config.sampling;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldSample()) {
      this.winston.debug(message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldSample()) {
      this.winston.info(message, context);
    }
  }

  warn(message: string, context?: LogContext): void {
    this.winston.warn(message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error as any).metadata
      } : undefined
    };
    this.winston.error(message, errorContext);
  }

  // Performance logging
  performance(operation: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${operation}`, {
      ...context,
      operation,
      duration,
      performanceLog: true
    });
  }

  // Business metrics logging
  business(metric: string, value: number, context?: LogContext): void {
    this.info(`Business metric: ${metric}=${value}`, {
      ...context,
      metric,
      value,
      businessMetric: true
    });
  }

  // Audit logging
  audit(action: string, userId: string, resource: string, context?: LogContext): void {
    this.info(`Audit: ${action}`, {
      ...context,
      action,
      userId,
      resource,
      auditLog: true,
      timestamp: new Date().toISOString()
    });
  }

  // Security logging
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void {
    const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    this.winston.log(logLevel, `Security event: ${event}`, {
      ...context,
      event,
      severity,
      securityLog: true
    });
  }

  // Agent-specific logging
  agent(agentId: string, event: string, context?: LogContext): void {
    this.info(`Agent ${agentId}: ${event}`, {
      ...context,
      agentId,
      event,
      agentLog: true
    });
  }

  // Workflow logging
  workflow(workflowId: string, step: string, status: string, context?: LogContext): void {
    this.info(`Workflow ${workflowId} - ${step}: ${status}`, {
      ...context,
      workflowId,
      step,
      status,
      workflowLog: true
    });
  }

  // Create child logger with persistent context
  child(persistentContext: LogContext): Logger {
    const childLogger = Object.create(this);
    const originalMethods = ['debug', 'info', 'warn', 'error', 'performance', 'business', 'audit', 'security', 'agent', 'workflow'];
    
    originalMethods.forEach(method => {
      childLogger[method] = (message: string, ...args: any[]) => {
        const context = args[args.length - 1] as LogContext || {};
        const mergedContext = { ...persistentContext, ...context };
        this[method as keyof this](message, ...args.slice(0, -1), mergedContext);
      };
    });

    return childLogger;
  }
}

// Default logger instance
let defaultLogger: Logger;

export const createLogger = (config: LoggerConfig): Logger => {
  return new Logger(config);
};

export const getLogger = (): Logger => {
  if (!defaultLogger) {
    const config: LoggerConfig = {
      level: process.env.LOG_LEVEL || 'info',
      format: (process.env.LOG_FORMAT as 'json' | 'text') || 'json',
      outputs: [
        {
          type: 'console',
          config: {}
        }
      ],
      sampling: process.env.LOG_SAMPLING ? parseFloat(process.env.LOG_SAMPLING) : undefined,
      masking: {
        enabled: process.env.LOG_MASKING === 'true',
        fields: [
          'password',
          'apiKey',
          'token',
          'authorization',
          'credit_card',
          'ssn',
          'email'
        ],
        strategy: 'redact'
      }
    };
    
    defaultLogger = new Logger(config);
  }
  
  return defaultLogger;
};

export const logger = getLogger();

// Performance measurement decorator
export function LogPerformance(operation?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operationName = operation || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const context: LogContext = {
        operation: operationName,
        agentId: (this as any).agentId,
        correlationId: (this as any).correlationId
      };

      try {
        logger.debug(`Starting ${operationName}`, context);
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        
        logger.performance(operationName, duration, context);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Error in ${operationName}`, error as Error, { ...context, duration });
        throw error;
      }
    };

    return descriptor;
  };
}

// Audit logging decorator
export function LogAudit(action?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const actionName = action || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const context: LogContext = {
        operation: actionName,
        agentId: (this as any).agentId,
        userId: (this as any).userId
      };

      logger.audit(actionName, context.userId || 'system', 'agent', context);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

export { Logger };