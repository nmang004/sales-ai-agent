// Forecasting Agent - Predictive analytics and pipeline intelligence

import { Agent, AgentConfig, AgentEvent } from '@voltagent/core';
import { logger, LogPerformance, LogAudit } from '@/shared/utils/logger';
import { 
  Deal,
  Lead,
  Activity,
  ForecastModel,
  PipelineAnalysis,
  RevenueProjection,
  DealProbability,
  ForecastAccuracy,
  PredictiveInsight,
  Priority,
  DealStage,
  TimeRange
} from '@/shared/types';
import { ClaudeForecastingTool } from './tools/claude-forecasting.tool';
import { StatisticalModelingTool } from './tools/statistical-modeling.tool';
import { PipelineAnalyticsTool } from './tools/pipeline-analytics.tool';
import { TrendAnalysisTool } from './tools/trend-analysis.tool';
import { RiskAssessmentTool } from './tools/risk-assessment.tool';
import { ForecastingRepository } from '@/shared/repositories/forecasting.repository';
import { circuitBreaker, retryWithBackoff } from '@/shared/utils/resilience';

export interface ForecastingAgentConfig extends AgentConfig {
  forecasting: {
    predictionHorizon: number;
    confidenceThreshold: number;
    modelRefreshInterval: number;
    historicalDataRange: number;
    enableRealTimePredictions: boolean;
  };
  models: {
    dealProbabilityModel: string;
    revenueProjectionModel: string;
    churnPredictionModel: string;
    leadScoringIntegration: boolean;
  };
  analytics: {
    pipelineAnalysis: boolean;
    seasonalityDetection: boolean;
    trendAnalysis: boolean;
    anomalyDetection: boolean;
    competitiveIntelligence: boolean;
  };
  alerts: {
    forecastVarianceThreshold: number;
    riskThreshold: number;
    opportunityThreshold: number;
    performanceAlerts: boolean;
  };
}

export interface ForecastingContext {
  timeRange: TimeRange;
  salesTeamId?: string;
  productCategory?: string;
  region?: string;
  segment?: string;
  includeHistoricalComparison: boolean;
  confidenceLevels: number[];
}

export interface ForecastOutput {
  id: string;
  generatedAt: Date;
  validUntil: Date;
  context: ForecastingContext;
  revenueProjection: {
    quarterly: RevenueProjection[];
    monthly: RevenueProjection[];
    weekly: RevenueProjection[];
  };
  pipelineAnalysis: PipelineAnalysis;
  dealProbabilities: DealProbability[];
  predictiveInsights: PredictiveInsight[];
  riskFactors: any[];
  opportunities: any[];
  confidenceMetrics: {
    overallConfidence: number;
    modelAccuracy: number;
    dataQuality: number;
  };
  recommendations: {
    priorityActions: string[];
    riskMitigations: string[];
    opportunityCapture: string[];
  };
}

export class ForecastingAgent extends Agent {
  private claudeForecasting: ClaudeForecastingTool;
  private statisticalModeling: StatisticalModelingTool;
  private pipelineAnalytics: PipelineAnalyticsTool;
  private trendAnalysis: TrendAnalysisTool;
  private riskAssessment: RiskAssessmentTool;
  private forecastingRepository: ForecastingRepository;
  private config: ForecastingAgentConfig;
  private activeForecasts: Map<string, ForecastOutput>;
  private modelCache: Map<string, any>;

  constructor(config: ForecastingAgentConfig) {
    super(config);
    this.config = config;
    this.activeForecasts = new Map();
    this.modelCache = new Map();
    this.initializeTools();
    this.forecastingRepository = new ForecastingRepository();
    this.setupEventHandlers();
    this.startPeriodicModelRefresh();
  }

  private initializeTools(): void {
    this.claudeForecasting = new ClaudeForecastingTool({
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 3000,
      temperature: 0.2,
      predictionHorizon: this.config.forecasting.predictionHorizon,
      confidenceThreshold: this.config.forecasting.confidenceThreshold
    });

    this.statisticalModeling = new StatisticalModelingTool({
      dealProbabilityModel: this.config.models.dealProbabilityModel,
      revenueProjectionModel: this.config.models.revenueProjectionModel,
      churnPredictionModel: this.config.models.churnPredictionModel,
      historicalDataRange: this.config.forecasting.historicalDataRange
    });

    this.pipelineAnalytics = new PipelineAnalyticsTool({
      enableRealTimeAnalysis: this.config.forecasting.enableRealTimePredictions,
      seasonalityDetection: this.config.analytics.seasonalityDetection,
      trendAnalysis: this.config.analytics.trendAnalysis,
      anomalyDetection: this.config.analytics.anomalyDetection
    });

    this.trendAnalysis = new TrendAnalysisTool({
      lookbackPeriod: this.config.forecasting.historicalDataRange,
      seasonalityDetection: this.config.analytics.seasonalityDetection,
      competitiveIntelligence: this.config.analytics.competitiveIntelligence
    });

    this.riskAssessment = new RiskAssessmentTool({
      riskThreshold: this.config.alerts.riskThreshold,
      opportunityThreshold: this.config.alerts.opportunityThreshold,
      forecastVarianceThreshold: this.config.alerts.forecastVarianceThreshold
    });
  }

  private setupEventHandlers(): void {
    this.on('deal.stage_changed', this.handleDealStageChange.bind(this));
    this.on('deal.value_updated', this.handleDealValueUpdate.bind(this));
    this.on('lead.converted', this.handleLeadConversion.bind(this));
    this.on('deal.closed_won', this.handleDealWon.bind(this));
    this.on('deal.closed_lost', this.handleDealLost.bind(this));
    this.on('forecast.requested', this.handleForecastRequest.bind(this));
    this.on('model.retrain_requested', this.handleModelRetrain.bind(this));
  }

  @LogPerformance('generate-revenue-forecast')
  @LogAudit('generate-forecast')
  async generateRevenueForecast(input: {
    timeRange: TimeRange;
    context: ForecastingContext;
    includeConfidenceIntervals: boolean;
    includeScenarioAnalysis: boolean;
    customFilters?: any;
  }): Promise<ForecastOutput> {
    const startTime = Date.now();

    try {
      logger.info('Generating revenue forecast', {
        timeRange: input.timeRange,
        context: input.context.segment
      });

      // Gather historical data
      const historicalData = await this.forecastingRepository.getHistoricalData({
        timeRange: {
          start: new Date(Date.now() - this.config.forecasting.historicalDataRange),
          end: new Date()
        },
        filters: input.customFilters
      });

      // Get current pipeline data
      const pipelineData = await this.forecastingRepository.getCurrentPipelineData(input.context);

      // Generate statistical forecasting models
      const statisticalForecast = await this.statisticalModeling.generateForecast({
        historicalData,
        pipelineData,
        timeRange: input.timeRange,
        modelConfigurations: {
          dealProbability: this.config.models.dealProbabilityModel,
          revenueProjection: this.config.models.revenueProjectionModel
        }
      });

      // Generate AI-enhanced insights
      const aiInsights = await this.claudeForecasting.generatePredictiveInsights({
        historicalData,
        pipelineData,
        statisticalForecast,
        marketContext: await this.getMarketContext(input.context),
        timeRange: input.timeRange
      });

      // Perform pipeline analysis
      const pipelineAnalysis = await this.pipelineAnalytics.analyzePipeline({
        currentPipeline: pipelineData,
        historicalComparison: historicalData,
        timeRange: input.timeRange
      });

      // Generate deal probability assessments
      const dealProbabilities = await this.generateDealProbabilities(
        pipelineData.deals,
        historicalData
      );

      // Perform risk assessment
      const riskAssessment = await this.riskAssessment.assessForecastRisks({
        forecast: statisticalForecast,
        pipelineAnalysis,
        historicalVariance: historicalData.variance,
        marketFactors: aiInsights.marketFactors
      });

      // Generate scenario analysis if requested
      let scenarioAnalysis = null;
      if (input.includeScenarioAnalysis) {
        scenarioAnalysis = await this.generateScenarioAnalysis({
          baseForecast: statisticalForecast,
          riskFactors: riskAssessment.riskFactors,
          opportunities: riskAssessment.opportunities
        });
      }

      // Calculate confidence metrics
      const confidenceMetrics = await this.calculateConfidenceMetrics({
        statisticalForecast,
        historicalAccuracy: historicalData.modelAccuracy,
        dataQuality: pipelineData.qualityScore,
        aiConfidence: aiInsights.confidenceScore
      });

      // Create forecast output
      const forecast: ForecastOutput = {
        id: `forecast-${Date.now()}-${input.context.segment || 'all'}`,
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + (24 * 60 * 60 * 1000)), // 24 hours
        context: input.context,
        revenueProjection: {
          quarterly: statisticalForecast.quarterly,
          monthly: statisticalForecast.monthly,
          weekly: statisticalForecast.weekly
        },
        pipelineAnalysis,
        dealProbabilities,
        predictiveInsights: aiInsights.insights,
        riskFactors: riskAssessment.riskFactors,
        opportunities: riskAssessment.opportunities,
        confidenceMetrics,
        recommendations: {
          priorityActions: aiInsights.recommendations.priorityActions,
          riskMitigations: riskAssessment.mitigationStrategies,
          opportunityCapture: aiInsights.recommendations.opportunityCapture
        }
      };

      // Store forecast
      this.activeForecasts.set(forecast.id, forecast);
      await this.forecastingRepository.storeForecast(forecast);

      // Emit forecast generation event
      await this.emit('forecast.generated', {
        forecastId: forecast.id,
        timeRange: input.timeRange,
        confidenceLevel: confidenceMetrics.overallConfidence,
        keyInsights: aiInsights.insights.slice(0, 3),
        timestamp: new Date()
      });

      // Check for alerts
      await this.checkForecastAlerts(forecast);

      logger.performance('revenue-forecast-generation', Date.now() - startTime, {
        forecastId: forecast.id,
        dealsAnalyzed: pipelineData.deals.length,
        confidenceLevel: confidenceMetrics.overallConfidence
      });

      return forecast;

    } catch (error) {
      logger.error('Revenue forecast generation failed', error as Error, {
        timeRange: input.timeRange,
        duration: Date.now() - startTime
      });
      throw error;
    }
  }

  @LogPerformance('analyze-deal-probability')
  async analyzeDealProbability(dealId: string): Promise<DealProbability> {
    try {
      const deal = await this.forecastingRepository.getDeal(dealId);
      if (!deal) {
        throw new Error(`Deal not found: ${dealId}`);
      }

      // Get historical data for similar deals
      const similarDeals = await this.forecastingRepository.getSimilarDeals(deal);

      // Generate statistical probability
      const statisticalProbability = await this.statisticalModeling.calculateDealProbability(
        deal,
        similarDeals
      );

      // Generate AI-enhanced probability assessment
      const aiAssessment = await this.claudeForecasting.assessDealProbability({
        deal,
        similarDeals,
        statisticalProbability,
        marketContext: await this.getMarketContext({ segment: deal.segment })
      });

      // Combine statistical and AI assessments
      const finalProbability = this.combineProbabilityAssessments(
        statisticalProbability,
        aiAssessment
      );

      const dealProbability: DealProbability = {
        dealId: deal.id,
        probability: finalProbability.probability,
        confidenceLevel: finalProbability.confidence,
        factors: {
          positive: aiAssessment.positiveFactors,
          negative: aiAssessment.negativeFactors,
          neutral: aiAssessment.neutralFactors
        },
        recommendations: aiAssessment.recommendations,
        expectedCloseDate: finalProbability.expectedCloseDate,
        riskFactors: aiAssessment.riskFactors,
        lastUpdated: new Date()
      };

      // Store probability assessment
      await this.forecastingRepository.storeDealProbability(dealProbability);

      // Emit probability update event
      await this.emit('deal.probability_updated', {
        dealId,
        newProbability: finalProbability.probability,
        previousProbability: deal.probability,
        factors: dealProbability.factors,
        timestamp: new Date()
      });

      return dealProbability;

    } catch (error) {
      logger.error('Deal probability analysis failed', error as Error, { dealId });
      throw error;
    }
  }

  private async generateDealProbabilities(
    deals: Deal[],
    historicalData: any
  ): Promise<DealProbability[]> {
    const probabilities: DealProbability[] = [];

    // Process deals in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < deals.length; i += batchSize) {
      const batch = deals.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (deal) => {
        try {
          return await this.analyzeDealProbability(deal.id);
        } catch (error) {
          logger.error(`Failed to analyze deal probability: ${deal.id}`, error as Error);
          // Return basic probability for failed analysis
          return {
            dealId: deal.id,
            probability: 0.5, // Default 50%
            confidenceLevel: 0.3,
            factors: { positive: [], negative: ['Analysis failed'], neutral: [] },
            recommendations: ['Manual review required'],
            expectedCloseDate: deal.expectedCloseDate,
            riskFactors: ['Insufficient data'],
            lastUpdated: new Date()
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      probabilities.push(...batchResults);
    }

    return probabilities;
  }

  private async generateScenarioAnalysis(input: {
    baseForecast: any;
    riskFactors: any[];
    opportunities: any[];
  }): Promise<any> {
    const scenarios = ['optimistic', 'pessimistic', 'realistic'];
    const scenarioAnalysis: any = {};

    for (const scenario of scenarios) {
      scenarioAnalysis[scenario] = await this.claudeForecasting.generateScenarioForecast({
        baseForecast: input.baseForecast,
        scenario,
        adjustmentFactors: {
          riskFactors: input.riskFactors,
          opportunities: input.opportunities
        }
      });
    }

    return scenarioAnalysis;
  }

  private async calculateConfidenceMetrics(input: {
    statisticalForecast: any;
    historicalAccuracy: number;
    dataQuality: number;
    aiConfidence: number;
  }): Promise<any> {
    const overallConfidence = (
      input.historicalAccuracy * 0.4 +
      input.dataQuality * 0.3 +
      input.aiConfidence * 0.3
    );

    return {
      overallConfidence,
      modelAccuracy: input.historicalAccuracy,
      dataQuality: input.dataQuality,
      aiConfidence: input.aiConfidence,
      factors: {
        historicalPerformance: input.historicalAccuracy,
        dataCompleteness: input.dataQuality,
        predictionConsistency: input.aiConfidence
      }
    };
  }

  private combineProbabilityAssessments(statistical: any, ai: any): any {
    // Weighted combination of statistical and AI assessments
    const combinedProbability = (statistical.probability * 0.6) + (ai.probability * 0.4);
    const combinedConfidence = Math.min(statistical.confidence, ai.confidence);

    return {
      probability: combinedProbability,
      confidence: combinedConfidence,
      expectedCloseDate: ai.expectedCloseDate || statistical.expectedCloseDate
    };
  }

  private async getMarketContext(context: any): Promise<any> {
    // Fetch relevant market data and context
    return {
      seasonality: await this.trendAnalysis.getSeasonalityFactors(context),
      marketTrends: await this.trendAnalysis.getMarketTrends(context),
      competitiveLandscape: context.competitiveIntelligence ? 
        await this.trendAnalysis.getCompetitiveIntelligence(context) : null,
      economicIndicators: await this.trendAnalysis.getEconomicIndicators()
    };
  }

  private async checkForecastAlerts(forecast: ForecastOutput): Promise<void> {
    const alerts = [];

    // Check variance from previous forecasts
    const previousForecast = await this.forecastingRepository.getLatestForecast(
      forecast.context
    );

    if (previousForecast) {
      const variance = this.calculateForecastVariance(forecast, previousForecast);
      
      if (variance > this.config.alerts.forecastVarianceThreshold) {
        alerts.push({
          type: 'high_variance',
          severity: 'warning',
          message: `Forecast variance of ${(variance * 100).toFixed(1)}% detected`,
          variance
        });
      }
    }

    // Check for risk factors
    const highRiskDeals = forecast.dealProbabilities.filter(
      dp => dp.riskFactors.length > 0 && dp.probability > 0.7
    );

    if (highRiskDeals.length > 0) {
      alerts.push({
        type: 'high_risk_deals',
        severity: 'warning',
        message: `${highRiskDeals.length} high-probability deals have risk factors`,
        deals: highRiskDeals.map(d => d.dealId)
      });
    }

    // Check confidence levels
    if (forecast.confidenceMetrics.overallConfidence < this.config.forecasting.confidenceThreshold) {
      alerts.push({
        type: 'low_confidence',
        severity: 'info',
        message: `Forecast confidence below threshold: ${(forecast.confidenceMetrics.overallConfidence * 100).toFixed(1)}%`,
        confidence: forecast.confidenceMetrics.overallConfidence
      });
    }

    // Emit alerts
    for (const alert of alerts) {
      await this.emit('forecast.alert', {
        forecastId: forecast.id,
        alert,
        timestamp: new Date()
      });
    }
  }

  private calculateForecastVariance(current: ForecastOutput, previous: ForecastOutput): number {
    const currentTotal = current.revenueProjection.quarterly.reduce((sum, q) => sum + q.amount, 0);
    const previousTotal = previous.revenueProjection.quarterly.reduce((sum, q) => sum + q.amount, 0);
    
    return Math.abs(currentTotal - previousTotal) / previousTotal;
  }

  // Event Handlers
  private async handleDealStageChange(event: AgentEvent): Promise<void> {
    const { dealId, oldStage, newStage } = event.payload;
    
    // Update deal probability when stage changes
    await this.analyzeDealProbability(dealId);
    
    // Trigger forecast refresh if significant stage change
    if (this.isSignificantStageChange(oldStage, newStage)) {
      await this.refreshActiveForecasts();
    }
  }

  private async handleDealValueUpdate(event: AgentEvent): Promise<void> {
    const { dealId, oldValue, newValue } = event.payload;
    
    // Recalculate deal probability with new value
    await this.analyzeDealProbability(dealId);
    
    // Refresh forecasts if significant value change
    const valueChange = Math.abs(newValue - oldValue) / oldValue;
    if (valueChange > 0.2) { // 20% change threshold
      await this.refreshActiveForecasts();
    }
  }

  private async handleLeadConversion(event: AgentEvent): Promise<void> {
    const { leadId, dealId } = event.payload;
    
    // Update conversion tracking data
    await this.forecastingRepository.recordConversion(leadId, dealId);
    
    // Retrain lead-to-deal conversion models
    await this.statisticalModeling.updateConversionModel();
  }

  private async handleDealWon(event: AgentEvent): Promise<void> {
    const { dealId, value, actualCloseDate } = event.payload;
    
    // Update model accuracy metrics
    await this.updateModelAccuracy(dealId, 'won', actualCloseDate);
    
    // Refresh forecasts to reflect closed deal
    await this.refreshActiveForecasts();
  }

  private async handleDealLost(event: AgentEvent): Promise<void> {
    const { dealId, reason, actualCloseDate } = event.payload;
    
    // Update model accuracy metrics
    await this.updateModelAccuracy(dealId, 'lost', actualCloseDate);
    
    // Analyze loss patterns for model improvement
    await this.analyzeChurnPatterns(dealId, reason);
  }

  private async handleForecastRequest(event: AgentEvent): Promise<void> {
    const { requestId, timeRange, context } = event.payload;
    
    try {
      const forecast = await this.generateRevenueForecast({
        timeRange,
        context,
        includeConfidenceIntervals: true,
        includeScenarioAnalysis: true
      });
      
      await this.emit('forecast.completed', {
        requestId,
        forecastId: forecast.id,
        forecast,
        timestamp: new Date()
      });
      
    } catch (error) {
      await this.emit('forecast.failed', {
        requestId,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }

  private async handleModelRetrain(event: AgentEvent): Promise<void> {
    const { modelType, parameters } = event.payload;
    
    await this.retrainModels(modelType, parameters);
  }

  private isSignificantStageChange(oldStage: DealStage, newStage: DealStage): boolean {
    const stageWeights = {
      [DealStage.DISCOVERY]: 1,
      [DealStage.QUALIFICATION]: 2,
      [DealStage.PROPOSAL]: 3,
      [DealStage.NEGOTIATION]: 4,
      [DealStage.CLOSED_WON]: 5,
      [DealStage.CLOSED_LOST]: 0
    };
    
    const oldWeight = stageWeights[oldStage];
    const newWeight = stageWeights[newStage];
    
    return Math.abs(newWeight - oldWeight) >= 2;
  }

  private async refreshActiveForecasts(): Promise<void> {
    const activeKeys = Array.from(this.activeForecasts.keys());
    
    for (const forecastId of activeKeys) {
      const forecast = this.activeForecasts.get(forecastId);
      if (forecast && this.isForecastStale(forecast)) {
        try {
          await this.generateRevenueForecast({
            timeRange: {
              start: new Date(),
              end: new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)) // 90 days
            },
            context: forecast.context,
            includeConfidenceIntervals: true,
            includeScenarioAnalysis: false
          });
        } catch (error) {
          logger.error('Failed to refresh forecast', error as Error, { forecastId });
        }
      }
    }
  }

  private isForecastStale(forecast: ForecastOutput): boolean {
    const ageInHours = (Date.now() - forecast.generatedAt.getTime()) / (1000 * 60 * 60);
    return ageInHours > 12; // Refresh if older than 12 hours
  }

  private async updateModelAccuracy(
    dealId: string,
    outcome: 'won' | 'lost',
    actualCloseDate: Date
  ): Promise<void> {
    const dealProbability = await this.forecastingRepository.getDealProbability(dealId);
    
    if (dealProbability) {
      const accuracy = outcome === 'won' ? dealProbability.probability : (1 - dealProbability.probability);
      await this.forecastingRepository.recordAccuracy(dealId, accuracy);
    }
  }

  private async analyzeChurnPatterns(dealId: string, reason: string): Promise<void> {
    await this.riskAssessment.analyzeChurnPattern({
      dealId,
      reason,
      timestamp: new Date()
    });
  }

  private async retrainModels(modelType?: string, parameters?: any): Promise<void> {
    logger.info('Starting model retraining', { modelType, parameters });
    
    try {
      if (!modelType || modelType === 'deal_probability') {
        await this.statisticalModeling.retrainDealProbabilityModel(parameters);
      }
      
      if (!modelType || modelType === 'revenue_projection') {
        await this.statisticalModeling.retrainRevenueProjectionModel(parameters);
      }
      
      if (!modelType || modelType === 'churn_prediction') {
        await this.statisticalModeling.retrainChurnPredictionModel(parameters);
      }
      
      // Clear model cache after retraining
      this.modelCache.clear();
      
      await this.emit('models.retrained', {
        modelType,
        timestamp: new Date()
      });
      
      logger.info('Model retraining completed successfully', { modelType });
      
    } catch (error) {
      logger.error('Model retraining failed', error as Error, { modelType });
      throw error;
    }
  }

  private startPeriodicModelRefresh(): void {
    setInterval(async () => {
      try {
        // Check if models need refreshing based on performance
        const modelPerformance = await this.statisticalModeling.getModelPerformance();
        
        if (modelPerformance.dealProbability.accuracy < 0.7) {
          await this.retrainModels('deal_probability');
        }
        
        if (modelPerformance.revenueProjection.accuracy < 0.8) {
          await this.retrainModels('revenue_projection');
        }
        
      } catch (error) {
        logger.error('Periodic model refresh failed', error as Error);
      }
    }, this.config.forecasting.modelRefreshInterval);
  }

  async getForecastAccuracy(timeRange: TimeRange): Promise<ForecastAccuracy> {
    return await this.forecastingRepository.getForecastAccuracy(timeRange);
  }

  async getMarketTrends(context: ForecastingContext): Promise<any> {
    return await this.trendAnalysis.getComprehensiveMarketAnalysis(context);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; details: any }> {
    const checks = {
      claudeForecasting: await this.claudeForecasting.healthCheck(),
      statisticalModeling: await this.statisticalModeling.healthCheck(),
      pipelineAnalytics: await this.pipelineAnalytics.healthCheck(),
      trendAnalysis: await this.trendAnalysis.healthCheck(),
      riskAssessment: await this.riskAssessment.healthCheck()
    };
    
    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      details: {
        ...checks,
        activeForecasts: this.activeForecasts.size,
        modelCacheSize: this.modelCache.size,
        lastModelUpdate: await this.forecastingRepository.getLastModelUpdate()
      }
    };
  }
}

export default ForecastingAgent;