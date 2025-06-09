// Email Agent - Intelligent sequence automation and personalization

import { Agent, AgentConfig, AgentEvent } from '@voltagent/core';
import { logger, LogPerformance, LogAudit } from '@/shared/utils/logger';
import { 
  EmailSequence, 
  EmailTemplate, 
  EmailMetrics,
  Lead,
  Deal,
  Activity,
  Priority,
  EmailSequenceStatus,
  EmailTemplateType,
  PersonalizationContext
} from '@/shared/types';
import { ClaudePersonalizationTool } from './tools/claude-personalization.tool';
import { EmailDeliveryTool } from './tools/email-delivery.tool';
import { SequenceManagerTool } from './tools/sequence-manager.tool';
import { PerformanceOptimizerTool } from './tools/performance-optimizer.tool';
import { ResponseDetectorTool } from './tools/response-detector.tool';
import { EmailRepository } from '@/shared/repositories/email.repository';
import { circuitBreaker, retryWithBackoff } from '@/shared/utils/resilience';

export interface EmailAgentConfig extends AgentConfig {
  sequenceAutomation: {
    maxSequencesPerLead: number;
    defaultDelayBetweenEmails: number;
    sendTimeOptimization: boolean;
    autoPersonalization: boolean;
    responseDetection: boolean;
  };
  emailDelivery: {
    provider: 'sendgrid' | 'mailgun' | 'aws-ses';
    rateLimit: number;
    batchSize: number;
    warmupMode: boolean;
  };
  personalization: {
    aiPersonalization: boolean;
    dynamicContentBlocks: boolean;
    imagePersonalization: boolean;
    industrySpecificContent: boolean;
  };
  performance: {
    sendTimeOptimization: boolean;
    openRateTarget: number;
    replyRateTarget: number;
    unsubscribeRateThreshold: number;
    deliverabilityMonitoring: boolean;
  };
}

export interface EmailCampaign {
  id: string;
  name: string;
  leadId: string;
  dealId?: string;
  sequenceId: string;
  currentStep: number;
  status: EmailSequenceStatus;
  startDate: Date;
  lastEmailSent?: Date;
  nextEmailScheduled?: Date;
  metrics: {
    emailsSent: number;
    opensCount: number;
    clicksCount: number;
    repliesCount: number;
    unsubscribes: number;
    bounces: number;
  };
  personalizationData: PersonalizationContext;
  aiInsights: {
    responselikelihood: number;
    bestSendTime: string;
    personalizedSubject: string;
    keyTalkingPoints: string[];
    competitorMentions: string[];
  };
}

export class EmailAgent extends Agent {
  private personalization: ClaudePersonalizationTool;
  private delivery: EmailDeliveryTool;
  private sequenceManager: SequenceManagerTool;
  private performanceOptimizer: PerformanceOptimizerTool;
  private responseDetector: ResponseDetectorTool;
  private emailRepository: EmailRepository;
  private config: EmailAgentConfig;
  private activeCampaigns: Map<string, EmailCampaign>;
  private sendQueue: Map<string, any[]>;

  constructor(config: EmailAgentConfig) {
    super(config);
    this.config = config;
    this.activeCampaigns = new Map();
    this.sendQueue = new Map();
    this.initializeTools();
    this.emailRepository = new EmailRepository();
    this.setupEventHandlers();
    this.startSequenceProcessor();
  }

  private initializeTools(): void {
    this.personalization = new ClaudePersonalizationTool({
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 2000,
      temperature: 0.4,
      aiPersonalization: this.config.personalization.aiPersonalization,
      dynamicContentBlocks: this.config.personalization.dynamicContentBlocks,
      industrySpecificContent: this.config.personalization.industrySpecificContent
    });

    this.delivery = new EmailDeliveryTool({
      provider: this.config.emailDelivery.provider,
      rateLimit: this.config.emailDelivery.rateLimit,
      batchSize: this.config.emailDelivery.batchSize,
      warmupMode: this.config.emailDelivery.warmupMode
    });

    this.sequenceManager = new SequenceManagerTool({
      maxSequencesPerLead: this.config.sequenceAutomation.maxSequencesPerLead,
      defaultDelayBetweenEmails: this.config.sequenceAutomation.defaultDelayBetweenEmails,
      autoPersonalization: this.config.sequenceAutomation.autoPersonalization
    });

    this.performanceOptimizer = new PerformanceOptimizerTool({
      sendTimeOptimization: this.config.performance.sendTimeOptimization,
      openRateTarget: this.config.performance.openRateTarget,
      replyRateTarget: this.config.performance.replyRateTarget,
      deliverabilityMonitoring: this.config.performance.deliverabilityMonitoring
    });

    this.responseDetector = new ResponseDetectorTool({
      responseDetection: this.config.sequenceAutomation.responseDetection,
      autoStopOnReply: true,
      autoStopOnUnsubscribe: true
    });
  }

  private setupEventHandlers(): void {
    this.on('lead.scored', this.handleLeadScored.bind(this));
    this.on('sequence.trigger', this.handleSequenceTrigger.bind(this));
    this.on('email.delivered', this.handleEmailDelivered.bind(this));
    this.on('email.opened', this.handleEmailOpened.bind(this));
    this.on('email.clicked', this.handleEmailClicked.bind(this));
    this.on('email.replied', this.handleEmailReplied.bind(this));
    this.on('email.unsubscribed', this.handleEmailUnsubscribed.bind(this));
    this.on('sequence.completed', this.handleSequenceCompleted.bind(this));
  }

  @LogPerformance('create-email-sequence')
  @LogAudit('create-sequence')
  async createEmailSequence(input: {
    leadId: string;
    dealId?: string;
    sequenceTemplateId: string;
    personalizationContext: PersonalizationContext;
    triggerConditions?: any;
    customization?: any;
  }): Promise<EmailCampaign> {
    const startTime = Date.now();

    try {
      logger.info('Creating email sequence', {
        leadId: input.leadId,
        sequenceTemplate: input.sequenceTemplateId
      });

      // Fetch lead data for personalization
      const leadData = await this.emailRepository.getLeadData(input.leadId);
      if (!leadData) {
        throw new Error(`Lead not found: ${input.leadId}`);
      }

      // Get sequence template
      const sequenceTemplate = await this.sequenceManager.getSequenceTemplate(input.sequenceTemplateId);
      
      // Generate AI-powered personalization insights
      const aiInsights = await this.personalization.generatePersonalizationInsights({
        leadData,
        dealData: input.dealId ? await this.emailRepository.getDealData(input.dealId) : undefined,
        sequenceTemplate,
        personalizationContext: input.personalizationContext
      });

      // Optimize send timing
      const optimalSendTime = await this.performanceOptimizer.calculateOptimalSendTime(
        leadData,
        aiInsights.timingFactors
      );

      // Create campaign
      const campaign: EmailCampaign = {
        id: `campaign-${Date.now()}-${input.leadId}`,
        name: `${sequenceTemplate.name} - ${leadData.company}`,
        leadId: input.leadId,
        dealId: input.dealId,
        sequenceId: input.sequenceTemplateId,
        currentStep: 0,
        status: EmailSequenceStatus.ACTIVE,
        startDate: new Date(),
        nextEmailScheduled: optimalSendTime,
        metrics: {
          emailsSent: 0,
          opensCount: 0,
          clicksCount: 0,
          repliesCount: 0,
          unsubscribes: 0,
          bounces: 0
        },
        personalizationData: input.personalizationContext,
        aiInsights
      };

      // Store campaign
      this.activeCampaigns.set(campaign.id, campaign);
      await this.emailRepository.storeCampaign(campaign);

      // Schedule first email
      await this.scheduleNextEmail(campaign);

      // Emit sequence creation event
      await this.emit('sequence.created', {
        campaignId: campaign.id,
        leadId: input.leadId,
        sequenceId: input.sequenceTemplateId,
        scheduledSendTime: optimalSendTime,
        timestamp: new Date()
      });

      logger.performance('email-sequence-creation', Date.now() - startTime, {
        campaignId: campaign.id,
        aiInsightsGenerated: true
      });

      return campaign;

    } catch (error) {
      logger.error('Email sequence creation failed', error as Error, {
        leadId: input.leadId,
        duration: Date.now() - startTime
      });
      throw error;
    }
  }

  @LogPerformance('send-email')
  @LogAudit('send-email')
  async sendEmail(campaignId: string, forceOverride: boolean = false): Promise<void> {
    const campaign = this.activeCampaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    if (campaign.status !== EmailSequenceStatus.ACTIVE && !forceOverride) {
      logger.warn('Attempted to send email for inactive campaign', { campaignId });
      return;
    }

    try {
      // Get sequence template and current step
      const sequenceTemplate = await this.sequenceManager.getSequenceTemplate(campaign.sequenceId);
      const currentEmailTemplate = sequenceTemplate.emails[campaign.currentStep];

      if (!currentEmailTemplate) {
        await this.completeSequence(campaign, 'All emails sent');
        return;
      }

      // Generate personalized email content
      const personalizedEmail = await this.personalization.personalizeEmailContent({
        template: currentEmailTemplate,
        leadData: await this.emailRepository.getLeadData(campaign.leadId),
        dealData: campaign.dealId ? await this.emailRepository.getDealData(campaign.dealId) : undefined,
        personalizationContext: campaign.personalizationData,
        aiInsights: campaign.aiInsights,
        sequenceContext: {
          stepNumber: campaign.currentStep + 1,
          totalSteps: sequenceTemplate.emails.length,
          previousEngagement: campaign.metrics
        }
      });

      // Apply send-time optimization
      const optimizedSendTime = await this.performanceOptimizer.optimizeSendTime(
        campaign,
        personalizedEmail
      );

      // Send email through delivery service
      const deliveryResult = await circuitBreaker(
        () => this.delivery.sendEmail({
          to: personalizedEmail.recipient.email,
          subject: personalizedEmail.subject,
          htmlContent: personalizedEmail.htmlContent,
          textContent: personalizedEmail.textContent,
          campaignId: campaign.id,
          trackingEnabled: true,
          scheduledSendTime: optimizedSendTime
        }),
        3,
        5000
      );

      // Update campaign metrics
      campaign.metrics.emailsSent++;
      campaign.currentStep++;
      campaign.lastEmailSent = new Date();

      // Calculate next email timing
      if (campaign.currentStep < sequenceTemplate.emails.length) {
        const delay = this.calculateEmailDelay(
          sequenceTemplate.emails[campaign.currentStep],
          campaign.aiInsights,
          campaign.metrics
        );
        campaign.nextEmailScheduled = new Date(Date.now() + delay);
        await this.scheduleNextEmail(campaign);
      } else {
        await this.completeSequence(campaign, 'Sequence completed successfully');
      }

      // Store updated campaign
      await this.emailRepository.updateCampaign(campaign);

      // Emit email sent event
      await this.emit('email.sent', {
        campaignId: campaign.id,
        emailId: deliveryResult.emailId,
        leadId: campaign.leadId,
        stepNumber: campaign.currentStep,
        deliveryResult,
        timestamp: new Date()
      });

      logger.info('Email sent successfully', {
        campaignId: campaign.id,
        emailId: deliveryResult.emailId,
        stepNumber: campaign.currentStep
      });

    } catch (error) {
      logger.error('Email sending failed', error as Error, {
        campaignId: campaign.id,
        currentStep: campaign.currentStep
      });

      // Handle delivery failures
      await this.handleEmailFailure(campaign, error as Error);
    }
  }

  private async scheduleNextEmail(campaign: EmailCampaign): Promise<void> {
    if (!campaign.nextEmailScheduled) return;

    const delay = campaign.nextEmailScheduled.getTime() - Date.now();
    
    if (delay <= 0) {
      // Send immediately
      await this.sendEmail(campaign.id);
    } else {
      // Schedule for later
      setTimeout(async () => {
        try {
          await this.sendEmail(campaign.id);
        } catch (error) {
          logger.error('Scheduled email sending failed', error as Error, {
            campaignId: campaign.id
          });
        }
      }, delay);

      logger.debug('Email scheduled', {
        campaignId: campaign.id,
        scheduledTime: campaign.nextEmailScheduled,
        delayMs: delay
      });
    }
  }

  private calculateEmailDelay(
    nextTemplate: EmailTemplate,
    aiInsights: any,
    currentMetrics: any
  ): number {
    let baseDelay = nextTemplate.delayAfterPrevious || this.config.sequenceAutomation.defaultDelayBetweenEmails;

    // AI-driven delay optimization
    if (aiInsights.timingRecommendations) {
      const urgencyMultiplier = aiInsights.timingRecommendations.urgency === 'high' ? 0.7 : 
                               aiInsights.timingRecommendations.urgency === 'low' ? 1.3 : 1.0;
      baseDelay *= urgencyMultiplier;
    }

    // Engagement-based adjustments
    if (currentMetrics.opensCount > 0) {
      baseDelay *= 0.8; // Faster follow-up for engaged leads
    }
    
    if (currentMetrics.clicksCount > 0) {
      baseDelay *= 0.6; // Even faster for highly engaged
    }

    return Math.max(baseDelay, 3600000); // Minimum 1 hour delay
  }

  @LogPerformance('pause-sequence')
  async pauseSequence(campaignId: string, reason: string): Promise<void> {
    const campaign = this.activeCampaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    campaign.status = EmailSequenceStatus.PAUSED;
    await this.emailRepository.updateCampaign(campaign);

    await this.emit('sequence.paused', {
      campaignId,
      reason,
      timestamp: new Date()
    });

    logger.info('Email sequence paused', { campaignId, reason });
  }

  @LogPerformance('resume-sequence')
  async resumeSequence(campaignId: string): Promise<void> {
    const campaign = this.activeCampaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    campaign.status = EmailSequenceStatus.ACTIVE;
    
    // Recalculate optimal send time
    const leadData = await this.emailRepository.getLeadData(campaign.leadId);
    const optimalSendTime = await this.performanceOptimizer.calculateOptimalSendTime(
      leadData,
      campaign.aiInsights.timingFactors
    );
    
    campaign.nextEmailScheduled = optimalSendTime;
    await this.emailRepository.updateCampaign(campaign);
    await this.scheduleNextEmail(campaign);

    await this.emit('sequence.resumed', {
      campaignId,
      nextScheduledSend: optimalSendTime,
      timestamp: new Date()
    });

    logger.info('Email sequence resumed', { campaignId });
  }

  private async completeSequence(campaign: EmailCampaign, reason: string): Promise<void> {
    campaign.status = EmailSequenceStatus.COMPLETED;
    await this.emailRepository.updateCampaign(campaign);

    // Generate sequence performance analysis
    const performanceAnalysis = await this.performanceOptimizer.analyzeSequencePerformance(campaign);

    await this.emit('sequence.completed', {
      campaignId: campaign.id,
      leadId: campaign.leadId,
      finalMetrics: campaign.metrics,
      performanceAnalysis,
      completionReason: reason,
      timestamp: new Date()
    });

    logger.info('Email sequence completed', {
      campaignId: campaign.id,
      reason,
      finalMetrics: campaign.metrics
    });
  }

  private async handleEmailFailure(campaign: EmailCampaign, error: Error): Promise<void> {
    const retryable = this.isRetryableError(error);
    
    if (retryable) {
      // Implement exponential backoff retry
      await retryWithBackoff(
        () => this.sendEmail(campaign.id, true),
        3,
        1000
      );
    } else {
      // Pause sequence for manual review
      await this.pauseSequence(campaign.id, `Non-retryable error: ${error.message}`);
    }
  }

  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'timeout',
      'rate limit',
      'temporary failure',
      'network error',
      'service unavailable'
    ];
    
    return retryableErrors.some(keyword => 
      error.message.toLowerCase().includes(keyword)
    );
  }

  // Event Handlers
  private async handleLeadScored(event: AgentEvent): Promise<void> {
    const { leadId, score, scoreBreakdown } = event.payload;
    
    // Auto-trigger sequences based on lead score
    if (score >= 80) {
      await this.autoTriggerHighValueSequence(leadId, scoreBreakdown);
    } else if (score >= 60) {
      await this.autoTriggerNurtureSequence(leadId, scoreBreakdown);
    }
  }

  private async handleSequenceTrigger(event: AgentEvent): Promise<void> {
    const { leadId, sequenceId, triggerData } = event.payload;
    
    await this.createEmailSequence({
      leadId,
      sequenceTemplateId: sequenceId,
      personalizationContext: triggerData.personalizationContext,
      triggerConditions: triggerData.conditions
    });
  }

  private async handleEmailDelivered(event: AgentEvent): Promise<void> {
    const { campaignId, emailId } = event.payload;
    // Update delivery tracking metrics
    await this.performanceOptimizer.recordDeliveryEvent(campaignId, emailId, 'delivered');
  }

  private async handleEmailOpened(event: AgentEvent): Promise<void> {
    const { campaignId, emailId } = event.payload;
    const campaign = this.activeCampaigns.get(campaignId);
    
    if (campaign) {
      campaign.metrics.opensCount++;
      await this.emailRepository.updateCampaign(campaign);
      await this.performanceOptimizer.recordEngagementEvent(campaignId, emailId, 'opened');
    }
  }

  private async handleEmailClicked(event: AgentEvent): Promise<void> {
    const { campaignId, emailId, linkUrl } = event.payload;
    const campaign = this.activeCampaigns.get(campaignId);
    
    if (campaign) {
      campaign.metrics.clicksCount++;
      await this.emailRepository.updateCampaign(campaign);
      await this.performanceOptimizer.recordEngagementEvent(campaignId, emailId, 'clicked', { linkUrl });
    }
  }

  private async handleEmailReplied(event: AgentEvent): Promise<void> {
    const { campaignId, emailId, replyData } = event.payload;
    const campaign = this.activeCampaigns.get(campaignId);
    
    if (campaign) {
      campaign.metrics.repliesCount++;
      
      // Auto-pause sequence on reply
      if (this.config.sequenceAutomation.responseDetection) {
        await this.pauseSequence(campaignId, 'Lead replied to email');
      }
      
      await this.emailRepository.updateCampaign(campaign);
      
      // Notify sales team about reply
      await this.emit('lead.reply_received', {
        campaignId,
        leadId: campaign.leadId,
        replyData,
        timestamp: new Date()
      });
    }
  }

  private async handleEmailUnsubscribed(event: AgentEvent): Promise<void> {
    const { campaignId, emailId } = event.payload;
    const campaign = this.activeCampaigns.get(campaignId);
    
    if (campaign) {
      campaign.metrics.unsubscribes++;
      campaign.status = EmailSequenceStatus.STOPPED;
      await this.emailRepository.updateCampaign(campaign);
      
      await this.emit('lead.unsubscribed', {
        campaignId,
        leadId: campaign.leadId,
        timestamp: new Date()
      });
    }
  }

  private async handleSequenceCompleted(event: AgentEvent): Promise<void> {
    const { campaignId } = event.payload;
    this.activeCampaigns.delete(campaignId);
    logger.info('Campaign removed from active campaigns', { campaignId });
  }

  private async autoTriggerHighValueSequence(leadId: string, scoreBreakdown: any): Promise<void> {
    await this.createEmailSequence({
      leadId,
      sequenceTemplateId: 'high-value-prospect-sequence',
      personalizationContext: {
        leadQuality: 'high',
        scoreFactors: scoreBreakdown,
        urgency: 'high'
      }
    });
  }

  private async autoTriggerNurtureSequence(leadId: string, scoreBreakdown: any): Promise<void> {
    await this.createEmailSequence({
      leadId,
      sequenceTemplateId: 'nurture-sequence',
      personalizationContext: {
        leadQuality: 'medium',
        scoreFactors: scoreBreakdown,
        urgency: 'medium'
      }
    });
  }

  // Background sequence processor
  private startSequenceProcessor(): void {
    setInterval(async () => {
      try {
        await this.processScheduledEmails();
        await this.performanceOptimizer.optimizeActiveSequences(Array.from(this.activeCampaigns.values()));
      } catch (error) {
        logger.error('Sequence processor error', error as Error);
      }
    }, 60000); // Run every minute
  }

  private async processScheduledEmails(): Promise<void> {
    const now = Date.now();
    
    for (const campaign of this.activeCampaigns.values()) {
      if (
        campaign.status === EmailSequenceStatus.ACTIVE &&
        campaign.nextEmailScheduled &&
        campaign.nextEmailScheduled.getTime() <= now
      ) {
        await this.sendEmail(campaign.id);
      }
    }
  }

  async getSequencePerformanceMetrics(campaignId: string): Promise<any> {
    const campaign = this.activeCampaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    return this.performanceOptimizer.getPerformanceMetrics(campaign);
  }

  async getBulkSequenceMetrics(leadIds: string[]): Promise<any> {
    const campaigns = Array.from(this.activeCampaigns.values())
      .filter(campaign => leadIds.includes(campaign.leadId));

    return this.performanceOptimizer.getBulkPerformanceMetrics(campaigns);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; details: any }> {
    const checks = {
      personalization: await this.personalization.healthCheck(),
      delivery: await this.delivery.healthCheck(),
      sequenceManager: await this.sequenceManager.healthCheck(),
      performanceOptimizer: await this.performanceOptimizer.healthCheck(),
      responseDetector: await this.responseDetector.healthCheck()
    };
    
    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      details: {
        ...checks,
        activeCampaigns: this.activeCampaigns.size,
        queueSize: Array.from(this.sendQueue.values()).reduce((total, queue) => total + queue.length, 0)
      }
    };
  }
}

export default EmailAgent;