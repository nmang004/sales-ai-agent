// Lead Scoring Agent - AI-powered prospect analysis and scoring

import { Agent, AgentConfig, AgentEvent, AgentTool } from '@voltagent/core';
import { logger, LogPerformance, LogAudit } from '@/shared/utils/logger';
import { 
  Lead, 
  ScoringFactor, 
  ScoringCategory, 
  LeadStatus,
  AgentInstance,
  JobStatus 
} from '@/shared/types';
import { ClaudeAITool } from './tools/claude-ai.tool';
import { DatabaseTool } from './tools/database.tool';
import { EnrichmentTool } from './tools/enrichment.tool';
import { ScoringCalculationTool } from './tools/scoring.tool';
import { ScoringAlgorithms } from './utils/scoring-algorithms';
import { DataValidation } from './utils/data-validation';

export interface LeadScoringConfig extends AgentConfig {
  scoringModel: {
    weights: {
      firmographics: number;
      technicalFit: number;
      engagement: number;
      timing: number;
      decisionMakerAccess: number;
      intentSignals: number;
    };
    thresholds: {
      highValue: number;
      qualified: number;
      nurture: number;
    };
  };
  performance: {
    batchSize: number;
    maxConcurrentScoring: number;
    cacheEnabled: boolean;
    cacheTTL: number;
  };
}

export interface LeadScoringInput {
  leadId: string;
  forceRefresh?: boolean;
  includeInsights?: boolean;
  scoringContext?: {
    campaign?: string;
    source?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  };
}

export interface LeadScoringOutput {
  leadId: string;
  score: number;
  confidence: number;
  factors: ScoringFactor[];
  insights: {
    overallAssessment: string;
    keyStrengths: string[];
    riskFactors: string[];
    personalizationOpportunities: string[];
    recommendedActions: string[];
    nextSteps: string[];
  };
  metadata: {
    scoringModel: string;
    timestamp: Date;
    processingTime: number;
    dataQuality: number;
    enrichmentUsed: boolean;
  };
}

export class LeadScoringAgent extends Agent {
  private claudeAI: ClaudeAITool;
  private database: DatabaseTool;
  private enrichment: EnrichmentTool;
  private scoring: ScoringCalculationTool;
  private algorithms: ScoringAlgorithms;
  private validation: DataValidation;
  private config: LeadScoringConfig;

  constructor(config: LeadScoringConfig) {
    super(config);
    this.config = config;
    this.initializeTools();
    this.algorithms = new ScoringAlgorithms(config.scoringModel);
    this.validation = new DataValidation();
    this.setupEventHandlers();
  }

  private initializeTools(): void {
    this.claudeAI = new ClaudeAITool({
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 2000,
      temperature: 0.3,
      caching: true,
      rateLimiting: true
    });

    this.database = new DatabaseTool({
      primary: 'postgresql',
      cache: 'redis',
      connectionPool: 10,
      queryTimeout: 5000
    });

    this.enrichment = new EnrichmentTool({
      providers: {
        clearbit: {
          apiKey: process.env.CLEARBIT_API_KEY!,
          rateLimit: '100/hour'
        },
        linkedin: {
          apiKey: process.env.LINKEDIN_API_KEY!,
          rateLimit: '500/day'
        }
      }
    });

    this.scoring = new ScoringCalculationTool({
      mlModelsPath: './models',
      cacheResults: true,
      parallelProcessing: true
    });
  }

  private setupEventHandlers(): void {
    this.on('lead.created', this.handleLeadCreated.bind(this));
    this.on('lead.updated', this.handleLeadUpdated.bind(this));
    this.on('enrichment.completed', this.handleEnrichmentCompleted.bind(this));
    this.on('scoring.batch_requested', this.handleBatchScoring.bind(this));
    this.on('scoring.model_updated', this.handleModelUpdated.bind(this));
  }

  @LogPerformance('lead-scoring')
  @LogAudit('score-lead')
  async scoreLead(input: LeadScoringInput): Promise<LeadScoringOutput> {
    const startTime = Date.now();
    
    try {
      // Validate input
      this.validation.validateScoringInput(input);
      
      logger.info('Starting lead scoring', { 
        leadId: input.leadId,
        agentId: this.id,
        operation: 'score-lead'
      });

      // Step 1: Retrieve and validate lead data
      const leadData = await this.gatherLeadData(input.leadId, input.forceRefresh);
      
      // Step 2: Extract scoring features
      const features = await this.extractScoringFeatures(leadData);
      
      // Step 3: Calculate base score using ML models
      const baseScore = await this.calculateBaseScore(features);
      
      // Step 4: Get AI insights from Claude
      const aiInsights = input.includeInsights 
        ? await this.generateAIInsights(leadData, features, baseScore)
        : null;
      
      // Step 5: Apply final scoring logic
      const finalScore = await this.applyFinalScoringLogic(baseScore, aiInsights, features);
      
      // Step 6: Store results and emit events
      const output = await this.finalizeScoring(input.leadId, finalScore, aiInsights, {
        processingTime: Date.now() - startTime,
        features,
        baseScore
      });

      await this.handleScoringComplete(output);
      
      return output;
      
    } catch (error) {
      logger.error('Lead scoring failed', error as Error, {
        leadId: input.leadId,
        agentId: this.id
      });
      
      await this.emit('scoring.error', {
        leadId: input.leadId,
        error: (error as Error).message,
        timestamp: new Date()
      });
      
      throw error;
    }
  }

  private async gatherLeadData(leadId: string, forceRefresh = false): Promise<Lead> {
    logger.debug('Gathering lead data', { leadId, forceRefresh });
    
    // Get lead from database
    let lead = await this.database.getLeadData(leadId);
    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    // Check if enrichment is needed
    const needsEnrichment = this.shouldEnrichLead(lead, forceRefresh);
    
    if (needsEnrichment) {
      logger.info('Enriching lead data', { leadId });
      const enrichmentData = await this.enrichment.enrichLeadData(lead);
      
      // Update lead with enrichment data
      lead = await this.database.updateLeadWithEnrichment(leadId, enrichmentData);
      
      await this.emit('enrichment.completed', {
        leadId,
        enrichmentData,
        timestamp: new Date()
      });
    }

    return lead;
  }

  private shouldEnrichLead(lead: Lead, forceRefresh: boolean): boolean {
    if (forceRefresh) return true;
    if (!lead.enrichmentData) return true;
    
    const enrichmentAge = Date.now() - lead.enrichmentData.timestamp.getTime();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    return enrichmentAge > maxAge;
  }

  private async extractScoringFeatures(lead: Lead): Promise<Record<string, number>> {
    logger.debug('Extracting scoring features', { leadId: lead.id });
    
    const features: Record<string, number> = {};
    
    // Firmographics features (25% weight)
    features.companySize = this.algorithms.calculateCompanySizeScore(lead);
    features.industry = this.algorithms.calculateIndustryScore(lead);
    features.revenue = this.algorithms.calculateRevenueScore(lead);
    features.location = this.algorithms.calculateLocationScore(lead);
    features.fundingStage = this.algorithms.calculateFundingScore(lead);
    
    // Technical fit features (20% weight)
    features.technologyStack = this.algorithms.calculateTechStackScore(lead);
    features.itMaturity = this.algorithms.calculateITMaturityScore(lead);
    features.integrationComplexity = this.algorithms.calculateIntegrationScore(lead);
    
    // Engagement features (20% weight)
    features.websiteEngagement = this.algorithms.calculateWebsiteEngagementScore(lead);
    features.emailEngagement = this.algorithms.calculateEmailEngagementScore(lead);
    features.contentConsumption = this.algorithms.calculateContentScore(lead);
    features.socialEngagement = this.algorithms.calculateSocialScore(lead);
    
    // Timing features (15% weight)
    features.budgetCycle = this.algorithms.calculateBudgetCycleScore(lead);
    features.contractExpiration = this.algorithms.calculateContractScore(lead);
    features.businessInitiatives = this.algorithms.calculateInitiativeScore(lead);
    
    // Decision maker access (10% weight)
    features.contactLevel = this.algorithms.calculateContactLevelScore(lead);
    features.stakeholderMapping = this.algorithms.calculateStakeholderScore(lead);
    features.championStrength = this.algorithms.calculateChampionScore(lead);
    
    // Intent signals (10% weight)
    features.searchBehavior = this.algorithms.calculateSearchScore(lead);
    features.competitorResearch = this.algorithms.calculateCompetitorScore(lead);
    features.pricingInterest = this.algorithms.calculatePricingScore(lead);
    
    return features;
  }

  private async calculateBaseScore(features: Record<string, number>): Promise<{
    score: number;
    confidence: number;
    factors: ScoringFactor[];
  }> {
    logger.debug('Calculating base score using ML models');
    
    const weightedScores = this.algorithms.calculateWeightedScores(features);
    const confidence = this.algorithms.calculateConfidence(features);
    
    const factors: ScoringFactor[] = Object.entries(weightedScores).map(([category, data]) => ({
      category: category as ScoringCategory,
      factor: data.primaryFactor,
      weight: data.weight,
      score: data.score,
      confidence: data.confidence,
      explanation: data.explanation
    }));

    const finalScore = this.algorithms.aggregateScore(weightedScores);
    
    return {
      score: Math.round(finalScore * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      factors
    };
  }

  private async generateAIInsights(
    lead: Lead, 
    features: Record<string, number>, 
    baseScore: { score: number; confidence: number; factors: ScoringFactor[] }
  ): Promise<any> {
    logger.debug('Generating AI insights with Claude', { leadId: lead.id });
    
    const prompt = this.buildLeadAnalysisPrompt(lead, features, baseScore);
    const insights = await this.claudeAI.analyzeLeadQuality(prompt);
    
    return insights;
  }

  private buildLeadAnalysisPrompt(
    lead: Lead,
    features: Record<string, number>,
    baseScore: { score: number; confidence: number; factors: ScoringFactor[] }
  ) {
    return {
      leadData: {
        email: lead.email,
        company: lead.company,
        title: lead.title,
        industry: lead.enrichmentData?.companyData?.industry,
        companySize: lead.enrichmentData?.companyData?.size,
        activityHistory: lead.activityHistory.slice(-10) // Last 10 activities
      },
      companyData: {
        revenue: lead.enrichmentData?.companyData?.revenue,
        employees: lead.enrichmentData?.companyData?.size,
        technologies: lead.enrichmentData?.technicalData?.technologies?.map(t => t.name),
        fundingStage: lead.enrichmentData?.companyData?.fundingStage,
        recentNews: lead.enrichmentData?.companyData?.news?.slice(0, 3)
      },
      scoringFactors: {
        firmographics: features.companySize + features.industry + features.revenue,
        technicalFit: features.technologyStack + features.itMaturity,
        engagement: features.websiteEngagement + features.emailEngagement,
        timing: features.budgetCycle + features.contractExpiration,
        decisionMakerAccess: features.contactLevel + features.stakeholderMapping,
        intentSignals: features.searchBehavior + features.competitorResearch
      },
      industryBenchmarks: {
        averageScore: 65,
        topPerformers: 85,
        conversionRates: {
          '80-100': 0.45,
          '60-79': 0.25,
          '40-59': 0.12,
          '20-39': 0.05
        }
      },
      currentScore: baseScore.score,
      confidence: baseScore.confidence
    };
  }

  private async applyFinalScoringLogic(
    baseScore: { score: number; confidence: number; factors: ScoringFactor[] },
    aiInsights: any,
    features: Record<string, number>
  ): Promise<{ score: number; confidence: number; factors: ScoringFactor[] }> {
    
    let adjustedScore = baseScore.score;
    
    // Apply AI-driven adjustments
    if (aiInsights) {
      const aiAdjustment = this.calculateAIAdjustment(aiInsights);
      adjustedScore += aiAdjustment;
    }
    
    // Apply business rules
    adjustedScore = this.applyBusinessRules(adjustedScore, features);
    
    // Ensure score is within bounds
    adjustedScore = Math.max(0, Math.min(100, adjustedScore));
    
    return {
      ...baseScore,
      score: Math.round(adjustedScore * 100) / 100
    };
  }

  private calculateAIAdjustment(insights: any): number {
    // Extract numerical insights from Claude's analysis
    let adjustment = 0;
    
    if (insights.buyingLikelihood > 0.8) adjustment += 5;
    if (insights.buyingLikelihood < 0.3) adjustment -= 5;
    
    if (insights.riskFactors?.length > 3) adjustment -= 3;
    if (insights.keyStrengths?.length > 3) adjustment += 3;
    
    return adjustment;
  }

  private applyBusinessRules(score: number, features: Record<string, number>): number {
    let adjustedScore = score;
    
    // High-value company boost
    if (features.revenue > 0.8 && features.companySize > 0.7) {
      adjustedScore += 5;
    }
    
    // Low engagement penalty
    if (features.emailEngagement < 0.2 && features.websiteEngagement < 0.2) {
      adjustedScore -= 10;
    }
    
    // Strong intent signals boost
    if (features.searchBehavior > 0.8 || features.pricingInterest > 0.8) {
      adjustedScore += 8;
    }
    
    return adjustedScore;
  }

  private async finalizeScoring(
    leadId: string, 
    finalScore: { score: number; confidence: number; factors: ScoringFactor[] },
    aiInsights: any,
    metadata: any
  ): Promise<LeadScoringOutput> {
    
    const output: LeadScoringOutput = {
      leadId,
      score: finalScore.score,
      confidence: finalScore.confidence,
      factors: finalScore.factors,
      insights: aiInsights || {
        overallAssessment: 'Score calculated using ML models only',
        keyStrengths: [],
        riskFactors: [],
        personalizationOpportunities: [],
        recommendedActions: [],
        nextSteps: []
      },
      metadata: {
        scoringModel: 'v1.0',
        timestamp: new Date(),
        processingTime: metadata.processingTime,
        dataQuality: this.calculateDataQuality(metadata.features),
        enrichmentUsed: metadata.enrichmentUsed || false
      }
    };

    // Store results in database
    await this.database.storeScoreResults(leadId, output);
    
    // Update lead status based on score
    await this.updateLeadStatus(leadId, finalScore.score);
    
    return output;
  }

  private calculateDataQuality(features: Record<string, number>): number {
    const nonZeroFeatures = Object.values(features).filter(f => f > 0).length;
    const totalFeatures = Object.keys(features).length;
    return Math.round((nonZeroFeatures / totalFeatures) * 100);
  }

  private async updateLeadStatus(leadId: string, score: number): Promise<void> {
    let newStatus: LeadStatus;
    
    if (score >= this.config.scoringModel.thresholds.highValue) {
      newStatus = LeadStatus.QUALIFIED;
    } else if (score >= this.config.scoringModel.thresholds.qualified) {
      newStatus = LeadStatus.QUALIFIED;
    } else if (score >= this.config.scoringModel.thresholds.nurture) {
      newStatus = LeadStatus.NURTURING;
    } else {
      newStatus = LeadStatus.NOT_QUALIFIED;
    }

    await this.database.updateLeadStatus(leadId, newStatus);
  }

  private async handleScoringComplete(output: LeadScoringOutput): Promise<void> {
    // Emit scoring completed event
    await this.emit('lead.scored', {
      leadId: output.leadId,
      score: output.score,
      confidence: output.confidence,
      timestamp: new Date()
    });

    // Check for high-value leads
    if (output.score >= this.config.scoringModel.thresholds.highValue) {
      await this.emit('lead.high_value_detected', {
        leadId: output.leadId,
        score: output.score,
        insights: output.insights,
        timestamp: new Date()
      });
    }

    // Log business metrics
    logger.business('lead-scored', output.score, {
      leadId: output.leadId,
      confidence: output.confidence,
      processingTime: output.metadata.processingTime
    });
  }

  // Event Handlers
  private async handleLeadCreated(event: AgentEvent): Promise<void> {
    const { leadId } = event.payload;
    logger.info('Handling lead created event', { leadId });
    
    await this.scoreLead({
      leadId,
      includeInsights: true,
      scoringContext: { priority: 'normal' }
    });
  }

  private async handleLeadUpdated(event: AgentEvent): Promise<void> {
    const { leadId, changes } = event.payload;
    logger.info('Handling lead updated event', { leadId, changes });
    
    // Only re-score if significant changes occurred
    const significantFields = ['company', 'title', 'industry', 'revenue'];
    const hasSignificantChanges = Object.keys(changes).some(field => 
      significantFields.includes(field)
    );
    
    if (hasSignificantChanges) {
      await this.scoreLead({
        leadId,
        forceRefresh: true,
        includeInsights: true
      });
    }
  }

  private async handleEnrichmentCompleted(event: AgentEvent): Promise<void> {
    const { leadId } = event.payload;
    logger.info('Handling enrichment completed event', { leadId });
    
    await this.scoreLead({
      leadId,
      includeInsights: true,
      scoringContext: { priority: 'high' }
    });
  }

  private async handleBatchScoring(event: AgentEvent): Promise<void> {
    const { leadIds, batchId } = event.payload;
    logger.info('Handling batch scoring request', { batchId, count: leadIds.length });
    
    const results = [];
    const batchSize = this.config.performance.batchSize;
    
    for (let i = 0; i < leadIds.length; i += batchSize) {
      const batch = leadIds.slice(i, i + batchSize);
      const batchPromises = batch.map((leadId: string) => 
        this.scoreLead({ leadId, includeInsights: false })
          .catch(error => ({ leadId, error: error.message }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    await this.emit('scoring.batch_completed', {
      batchId,
      results,
      completedAt: new Date()
    });
  }

  private async handleModelUpdated(event: AgentEvent): Promise<void> {
    const { modelVersion } = event.payload;
    logger.info('Handling model update event', { modelVersion });
    
    // Reload scoring algorithms with new model
    this.algorithms = new ScoringAlgorithms(this.config.scoringModel);
    
    await this.emit('model.performance_updated', {
      modelVersion,
      agentId: this.id,
      timestamp: new Date()
    });
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; details: any }> {
    const checks = {
      claude: await this.claudeAI.healthCheck(),
      database: await this.database.healthCheck(),
      enrichment: await this.enrichment.healthCheck(),
      scoring: await this.scoring.healthCheck()
    };
    
    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      details: checks
    };
  }
}

export default LeadScoringAgent;