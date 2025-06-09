// Security Service for Sales AI Agent Platform

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { logger } from '@/shared/utils/logger';
import MetricsService from '@/monitoring/metrics.service';

export interface SecurityConfig {
  encryption: {
    algorithm: string;
    keySize: number;
    ivSize: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
    issuer: string;
    audience: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  cors: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    credentials: boolean;
  };
  audit: {
    enabled: boolean;
    sensitiveFields: string[];
    retentionDays: number;
  };
  apiKey: {
    keyLength: number;
    prefix: string;
    expirationDays: number;
  };
}

export interface UserPermissions {
  userId: string;
  role: string;
  permissions: string[];
  restrictions: {
    ipWhitelist?: string[];
    timeRestrictions?: {
      allowedHours: number[];
      timezone: string;
    };
    resourceLimits?: {
      maxRequests: number;
      maxDataAccess: number;
    };
  };
  metadata: Record<string, any>;
}

export interface SecurityEvent {
  id: string;
  type: 'authentication' | 'authorization' | 'encryption' | 'audit' | 'threat_detection';
  subType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  success: boolean;
  details: Record<string, any>;
  timestamp: Date;
}

export interface ApiKey {
  id: string;
  key: string;
  hashedKey: string;
  name: string;
  userId: string;
  permissions: string[];
  expiresAt: Date;
  lastUsed?: Date;
  usageCount: number;
  isActive: boolean;
  ipRestrictions?: string[];
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface EncryptedData {
  data: string;
  iv: string;
  tag?: string;
  algorithm: string;
  keyId?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  error?: string;
  timestamp: Date;
  sessionId?: string;
}

export class SecurityService extends EventEmitter {
  private config: SecurityConfig;
  private metricsService: MetricsService;
  private encryptionKeys: Map<string, Buffer>;
  private userPermissions: Map<string, UserPermissions>;
  private apiKeys: Map<string, ApiKey>;
  private auditLogs: AuditLog[] = [];
  private rateLimitStore: Map<string, { count: number; resetTime: number }>;
  private securityEvents: SecurityEvent[] = [];

  constructor(
    metricsService: MetricsService,
    config?: Partial<SecurityConfig>
  ) {
    super();
    
    this.config = {
      encryption: {
        algorithm: 'aes-256-gcm',
        keySize: 32,
        ivSize: 16
      },
      jwt: {
        secret: process.env.JWT_SECRET || this.generateSecureKey(),
        expiresIn: '1h',
        refreshExpiresIn: '7d',
        issuer: 'sales-ai-agent',
        audience: 'sales-ai-agent-users'
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
        skipSuccessfulRequests: false
      },
      cors: {
        allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
        credentials: true
      },
      audit: {
        enabled: true,
        sensitiveFields: ['password', 'apiKey', 'token', 'ssn', 'creditCard'],
        retentionDays: 90
      },
      apiKey: {
        keyLength: 32,
        prefix: 'sai_',
        expirationDays: 365
      },
      ...config
    };

    this.metricsService = metricsService;
    this.encryptionKeys = new Map();
    this.userPermissions = new Map();
    this.apiKeys = new Map();
    this.rateLimitStore = new Map();

    this.initializeEncryptionKeys();
    this.setupDefaultPermissions();
    this.startAuditLogCleanup();
  }

  // Encryption methods
  encrypt(data: string, keyId: string = 'default'): EncryptedData {
    const key = this.encryptionKeys.get(keyId);
    if (!key) {
      throw new Error(`Encryption key not found: ${keyId}`);
    }

    const iv = crypto.randomBytes(this.config.encryption.ivSize);
    const cipher = crypto.createCipher(this.config.encryption.algorithm, key);
    
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // For GCM mode, get the auth tag
    const tag = (cipher as any).getAuthTag?.() || undefined;

    this.recordSecurityEvent({
      type: 'encryption',
      subType: 'data_encrypted',
      severity: 'low',
      success: true,
      details: { keyId, algorithm: this.config.encryption.algorithm }
    });

    return {
      data: encrypted,
      iv: iv.toString('base64'),
      tag: tag?.toString('base64'),
      algorithm: this.config.encryption.algorithm,
      keyId
    };
  }

  decrypt(encryptedData: EncryptedData): string {
    const key = this.encryptionKeys.get(encryptedData.keyId || 'default');
    if (!key) {
      throw new Error(`Encryption key not found: ${encryptedData.keyId}`);
    }

    const iv = Buffer.from(encryptedData.iv, 'base64');
    const decipher = crypto.createDecipher(encryptedData.algorithm, key);

    // For GCM mode, set the auth tag
    if (encryptedData.tag) {
      const tag = Buffer.from(encryptedData.tag, 'base64');
      (decipher as any).setAuthTag?.(tag);
    }

    let decrypted = decipher.update(encryptedData.data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    this.recordSecurityEvent({
      type: 'encryption',
      subType: 'data_decrypted',
      severity: 'low',
      success: true,
      details: { keyId: encryptedData.keyId, algorithm: encryptedData.algorithm }
    });

    return decrypted;
  }

  // JWT methods
  generateToken(payload: Record<string, any>, options?: { expiresIn?: string }): string {
    const tokenPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      iss: this.config.jwt.issuer,
      aud: this.config.jwt.audience
    };

    const token = jwt.sign(
      tokenPayload,
      this.config.jwt.secret,
      {
        expiresIn: options?.expiresIn || this.config.jwt.expiresIn
      }
    );

    this.recordSecurityEvent({
      type: 'authentication',
      subType: 'token_generated',
      severity: 'low',
      userId: payload.userId,
      success: true,
      details: { expiresIn: options?.expiresIn || this.config.jwt.expiresIn }
    });

    return token;
  }

  verifyToken(token: string): any {
    try {
      const decoded = jwt.verify(token, this.config.jwt.secret, {
        issuer: this.config.jwt.issuer,
        audience: this.config.jwt.audience
      });

      this.recordSecurityEvent({
        type: 'authentication',
        subType: 'token_verified',
        severity: 'low',
        userId: (decoded as any).userId,
        success: true,
        details: {}
      });

      return decoded;
    } catch (error) {
      this.recordSecurityEvent({
        type: 'authentication',
        subType: 'token_verification_failed',
        severity: 'medium',
        success: false,
        details: { error: (error as Error).message }
      });

      throw error;
    }
  }

  generateRefreshToken(userId: string): string {
    return this.generateToken({ userId, type: 'refresh' }, { 
      expiresIn: this.config.jwt.refreshExpiresIn 
    });
  }

  // API Key management
  generateApiKey(name: string, userId: string, permissions: string[], options?: {
    expirationDays?: number;
    ipRestrictions?: string[];
    metadata?: Record<string, any>;
  }): ApiKey {
    const keyId = crypto.randomUUID();
    const rawKey = crypto.randomBytes(this.config.apiKey.keyLength).toString('hex');
    const fullKey = `${this.config.apiKey.prefix}${rawKey}`;
    const hashedKey = crypto.createHash('sha256').update(fullKey).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (options?.expirationDays || this.config.apiKey.expirationDays));

    const apiKey: ApiKey = {
      id: keyId,
      key: fullKey,
      hashedKey,
      name,
      userId,
      permissions,
      expiresAt,
      usageCount: 0,
      isActive: true,
      ipRestrictions: options?.ipRestrictions,
      metadata: options?.metadata || {},
      createdAt: new Date()
    };

    this.apiKeys.set(keyId, apiKey);

    this.recordSecurityEvent({
      type: 'authentication',
      subType: 'api_key_generated',
      severity: 'medium',
      userId,
      success: true,
      details: { keyId, name, permissions }
    });

    return apiKey;
  }

  verifyApiKey(key: string, ipAddress?: string): ApiKey | null {
    const hashedKey = crypto.createHash('sha256').update(key).digest('hex');
    
    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.hashedKey === hashedKey) {
        // Check if key is active and not expired
        if (!apiKey.isActive || apiKey.expiresAt < new Date()) {
          this.recordSecurityEvent({
            type: 'authentication',
            subType: 'api_key_expired_or_inactive',
            severity: 'medium',
            userId: apiKey.userId,
            ipAddress,
            success: false,
            details: { keyId: apiKey.id }
          });
          return null;
        }

        // Check IP restrictions
        if (apiKey.ipRestrictions && ipAddress) {
          if (!apiKey.ipRestrictions.includes(ipAddress)) {
            this.recordSecurityEvent({
              type: 'authentication',
              subType: 'api_key_ip_restricted',
              severity: 'high',
              userId: apiKey.userId,
              ipAddress,
              success: false,
              details: { keyId: apiKey.id, allowedIps: apiKey.ipRestrictions }
            });
            return null;
          }
        }

        // Update usage
        apiKey.lastUsed = new Date();
        apiKey.usageCount++;

        this.recordSecurityEvent({
          type: 'authentication',
          subType: 'api_key_verified',
          severity: 'low',
          userId: apiKey.userId,
          ipAddress,
          success: true,
          details: { keyId: apiKey.id, usageCount: apiKey.usageCount }
        });

        return apiKey;
      }
    }

    this.recordSecurityEvent({
      type: 'authentication',
      subType: 'api_key_invalid',
      severity: 'high',
      ipAddress,
      success: false,
      details: { providedKeyHash: hashedKey.substring(0, 8) + '...' }
    });

    return null;
  }

  revokeApiKey(keyId: string, userId: string): boolean {
    const apiKey = this.apiKeys.get(keyId);
    if (apiKey && apiKey.userId === userId) {
      apiKey.isActive = false;
      
      this.recordSecurityEvent({
        type: 'authentication',
        subType: 'api_key_revoked',
        severity: 'medium',
        userId,
        success: true,
        details: { keyId }
      });

      return true;
    }

    return false;
  }

  // Permission management
  setUserPermissions(userId: string, permissions: UserPermissions): void {
    this.userPermissions.set(userId, permissions);
    
    this.recordSecurityEvent({
      type: 'authorization',
      subType: 'permissions_updated',
      severity: 'medium',
      userId,
      success: true,
      details: { role: permissions.role, permissions: permissions.permissions }
    });
  }

  getUserPermissions(userId: string): UserPermissions | null {
    return this.userPermissions.get(userId) || null;
  }

  hasPermission(userId: string, permission: string): boolean {
    const userPerms = this.userPermissions.get(userId);
    if (!userPerms) return false;

    const hasPermission = userPerms.permissions.includes(permission) || 
                         userPerms.permissions.includes('*');

    this.recordSecurityEvent({
      type: 'authorization',
      subType: 'permission_check',
      severity: 'low',
      userId,
      success: hasPermission,
      details: { permission, result: hasPermission }
    });

    return hasPermission;
  }

  // Rate limiting
  checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const windowStart = now - this.config.rateLimit.windowMs;
    
    let rateLimitData = this.rateLimitStore.get(identifier);
    
    if (!rateLimitData || rateLimitData.resetTime < now) {
      // Reset window
      rateLimitData = {
        count: 0,
        resetTime: now + this.config.rateLimit.windowMs
      };
      this.rateLimitStore.set(identifier, rateLimitData);
    }

    rateLimitData.count++;
    const allowed = rateLimitData.count <= this.config.rateLimit.maxRequests;
    const remaining = Math.max(0, this.config.rateLimit.maxRequests - rateLimitData.count);

    if (!allowed) {
      this.recordSecurityEvent({
        type: 'threat_detection',
        subType: 'rate_limit_exceeded',
        severity: 'medium',
        success: false,
        details: { 
          identifier, 
          count: rateLimitData.count, 
          limit: this.config.rateLimit.maxRequests 
        }
      });
    }

    this.metricsService.recordMetric(
      'security.rate_limit.check',
      1,
      'count',
      { identifier, allowed: allowed.toString() }
    );

    return {
      allowed,
      remaining,
      resetTime: rateLimitData.resetTime
    };
  }

  // Audit logging
  logAuditEvent(auditLog: Omit<AuditLog, 'id' | 'timestamp'>): void {
    if (!this.config.audit.enabled) return;

    const log: AuditLog = {
      ...auditLog,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      details: this.sanitizeAuditDetails(auditLog.details)
    };

    this.auditLogs.push(log);

    this.recordSecurityEvent({
      type: 'audit',
      subType: 'audit_logged',
      severity: 'low',
      userId: auditLog.userId,
      success: true,
      details: { action: auditLog.action, resource: auditLog.resource }
    });

    this.metricsService.recordMetric(
      'security.audit.event_logged',
      1,
      'count',
      { 
        action: auditLog.action, 
        resource: auditLog.resource,
        success: auditLog.success.toString()
      }
    );
  }

  getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): AuditLog[] {
    let filteredLogs = this.auditLogs;

    if (filters) {
      if (filters.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
      }
      if (filters.action) {
        filteredLogs = filteredLogs.filter(log => log.action === filters.action);
      }
      if (filters.resource) {
        filteredLogs = filteredLogs.filter(log => log.resource === filters.resource);
      }
      if (filters.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!);
      }
    }

    const limit = filters?.limit || 1000;
    return filteredLogs.slice(-limit);
  }

  // Security event management
  private recordSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };

    this.securityEvents.push(securityEvent);

    // Emit event for real-time monitoring
    this.emit('security_event', securityEvent);

    // Record metrics
    this.metricsService.recordMetric(
      'security.events.recorded',
      1,
      'count',
      { 
        type: event.type,
        subType: event.subType,
        severity: event.severity,
        success: event.success.toString()
      }
    );

    // Log critical and high severity events
    if (event.severity === 'critical' || event.severity === 'high') {
      logger.warn('High severity security event', securityEvent);
    }
  }

  getSecurityEvents(filters?: {
    type?: string;
    severity?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): SecurityEvent[] {
    let filteredEvents = this.securityEvents;

    if (filters) {
      if (filters.type) {
        filteredEvents = filteredEvents.filter(event => event.type === filters.type);
      }
      if (filters.severity) {
        filteredEvents = filteredEvents.filter(event => event.severity === filters.severity);
      }
      if (filters.userId) {
        filteredEvents = filteredEvents.filter(event => event.userId === filters.userId);
      }
      if (filters.startDate) {
        filteredEvents = filteredEvents.filter(event => event.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        filteredEvents = filteredEvents.filter(event => event.timestamp <= filters.endDate!);
      }
    }

    const limit = filters?.limit || 1000;
    return filteredEvents.slice(-limit).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Utility methods
  hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  verifyPassword(password: string, hashedPassword: string): boolean {
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }

  generateSecureKey(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Private methods
  private initializeEncryptionKeys(): void {
    // Initialize default encryption key
    const defaultKey = process.env.ENCRYPTION_KEY || this.generateSecureKey();
    this.encryptionKeys.set('default', Buffer.from(defaultKey, 'hex'));
    
    logger.info('Encryption keys initialized');
  }

  private setupDefaultPermissions(): void {
    // Setup default admin permissions
    const adminPermissions: UserPermissions = {
      userId: 'admin',
      role: 'admin',
      permissions: ['*'],
      restrictions: {},
      metadata: {}
    };
    
    this.setUserPermissions('admin', adminPermissions);
  }

  private sanitizeAuditDetails(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details };
    
    for (const field of this.config.audit.sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private startAuditLogCleanup(): void {
    // Clean up old audit logs daily
    setInterval(() => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.audit.retentionDays);
      
      const initialCount = this.auditLogs.length;
      this.auditLogs = this.auditLogs.filter(log => log.timestamp > cutoffDate);
      
      const removedCount = initialCount - this.auditLogs.length;
      if (removedCount > 0) {
        logger.info('Audit logs cleaned up', { removedCount, remaining: this.auditLogs.length });
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  // Health check
  async healthCheck(): Promise<{ status: string; details: any }> {
    return {
      status: 'healthy',
      details: {
        encryptionKeysLoaded: this.encryptionKeys.size,
        activeApiKeys: Array.from(this.apiKeys.values()).filter(k => k.isActive).length,
        totalApiKeys: this.apiKeys.size,
        userPermissions: this.userPermissions.size,
        auditLogsCount: this.auditLogs.length,
        securityEventsCount: this.securityEvents.length,
        rateLimitEntries: this.rateLimitStore.size
      }
    };
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // Clear sensitive data
    this.encryptionKeys.clear();
    this.apiKeys.clear();
    this.rateLimitStore.clear();
    
    logger.info('Security service cleaned up');
  }
}

export default SecurityService;