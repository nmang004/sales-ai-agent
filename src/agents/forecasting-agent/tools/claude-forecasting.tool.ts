// Claude Forecasting Tool for Forecasting Agent

import { AgentTool } from '@voltagent/tools';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/shared/utils/logger';
import { 
  ClaudeConfig, 
  ClaudeRequest, 
  ClaudeResponse,
  ClaudeError,
  ClaudeErrorType
} from '@/shared/types/claude.types';
import { 
  Deal,
  TimeRange,
  PredictiveInsight,
  ForecastModel
} from '@/shared/types';
import { memoize, asyncTimeout, exponentialBackoff } from '@/shared/utils';

export interface ClaudeForecastingConfig extends ClaudeConfig {
  predictionHorizon: number;
  confidenceThreshold: number;
  timeout: number;
  retries: number;
}

export interface PredictiveInsightsInput {
  historicalData: any;
  pipelineData: any;
  statisticalForecast: any;
  marketContext: any;
  timeRange: TimeRange;
}

export interface PredictiveInsightsOutput {
  insights: PredictiveInsight[];
  confidenceScore: number;
  marketFactors: any[];
  recommendations: {
    priorityActions: string[];
    opportunityCapture: string[];
    riskMitigations: string[];
  };
  scenarioOutlook: {
    optimistic: any;
    realistic: any;
    pessimistic: any;
  };
}

export interface DealProbabilityInput {
  deal: Deal;
  similarDeals: Deal[];
  statisticalProbability: number;
  marketContext: any;
}

export interface DealProbabilityOutput {
  probability: number;
  confidence: number;
  positiveFactors: string[];
  negativeFactors: string[];
  neutralFactors: string[];
  recommendations: string[];
  expectedCloseDate: Date;
  riskFactors: string[];
}

export class ClaudeForecastingTool extends AgentTool {
  private client: Anthropic;
  private config: ClaudeForecastingConfig;
  private cache: Map<string, { value: any; timestamp: number }>;

  constructor(config: ClaudeForecastingConfig) {
    super('claude-forecasting-tool', 'ai-integration');
    
    this.config = {
      timeout: 20000,
      retries: 2,
      ...config
    };

    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY
    });

    this.cache = new Map();
    this.setupMemoizedMethods();
  }

  private setupMemoizedMethods(): void {
    if (this.config.caching?.enabled) {
      this.generatePredictiveInsights = memoize(
        this.generatePredictiveInsights.bind(this),
        this.generateCacheKey.bind(this),
        this.config.caching.ttl || 3600000 // 1 hour
      );
    }
  }

  private generateCacheKey(...args: any[]): string {
    return `forecasting:${Buffer.from(JSON.stringify(args)).toString('base64')}`;
  }

  async generatePredictiveInsights(input: PredictiveInsightsInput): Promise<PredictiveInsightsOutput> {
    const startTime = Date.now();

    try {
      logger.debug('Generating predictive insights', {
        timeRange: input.timeRange,
        operation: 'generate-predictive-insights'
      });

      const prompt = this.buildPredictiveInsightsPrompt(input);
      const response = await this.callClaude(prompt);
      const insights = this.parsePredictiveInsights(response);

      logger.performance('claude-predictive-insights', Date.now() - startTime, {
        tokensUsed: response.usage.totalTokens,
        insightsGenerated: insights.insights.length
      });

      return insights;

    } catch (error) {
      logger.error('Predictive insights generation failed', error as Error, {
        timeRange: input.timeRange,
        duration: Date.now() - startTime
      });
      
      // Return fallback insights
      return this.getFallbackInsights();
    }
  }

  async assessDealProbability(input: DealProbabilityInput): Promise<DealProbabilityOutput> {
    const startTime = Date.now();

    try {
      logger.debug('Assessing deal probability', {
        dealId: input.deal.id,
        dealValue: input.deal.value,
        stage: input.deal.stage
      });

      const prompt = this.buildDealProbabilityPrompt(input);
      const response = await this.callClaude(prompt);
      const assessment = this.parseDealProbabilityResponse(response);

      logger.performance('claude-deal-probability', Date.now() - startTime, {
        dealId: input.deal.id,
        probability: assessment.probability,
        tokensUsed: response.usage.totalTokens
      });

      return assessment;

    } catch (error) {
      logger.error('Deal probability assessment failed', error as Error, {
        dealId: input.deal.id,
        duration: Date.now() - startTime
      });
      
      // Return fallback assessment
      return this.getFallbackDealProbability(input.deal);
    }
  }

  async generateScenarioForecast(input: {
    baseForecast: any;
    scenario: 'optimistic' | 'pessimistic' | 'realistic';
    adjustmentFactors: {
      riskFactors: any[];
      opportunities: any[];
    };
  }): Promise<any> {
    const startTime = Date.now();

    try {
      const prompt = this.buildScenarioForecastPrompt(input);
      const response = await this.callClaude(prompt);
      const scenarioForecast = this.parseScenarioForecast(response);

      logger.performance('claude-scenario-forecast', Date.now() - startTime, {
        scenario: input.scenario,
        tokensUsed: response.usage.totalTokens
      });

      return scenarioForecast;

    } catch (error) {
      logger.error('Scenario forecast generation failed', error as Error, {
        scenario: input.scenario,
        duration: Date.now() - startTime
      });
      
      return this.getFallbackScenarioForecast(input.baseForecast, input.scenario);
    }
  }

  async analyzeMarketTrends(input: {
    historicalData: any;
    industryData: any;
    competitiveData: any;
    economicIndicators: any;
    timeHorizon: number;
  }): Promise<{
    trendAnalysis: any[];
    marketPredictions: any[];
    competitiveOutlook: any[];
    riskFactors: any[];
    opportunities: any[];
    confidence: number;
  }> {
    const prompt = this.buildMarketTrendsPrompt(input);
    const response = await this.callClaude(prompt);
    return this.parseMarketTrendsResponse(response);
  }

  async generateRevenueGuidance(input: {
    currentForecast: any;
    performanceMetrics: any;
    marketConditions: any;
    internalFactors: any;
  }): Promise<{
    guidance: {
      revenue: number;
      confidence: number;
      range: { low: number; high: number };
    };
    keyAssumptions: string[];
    riskFactors: string[];
    upwardDrivers: string[];
    recommendations: string[];
  }> {
    const prompt = this.buildRevenueGuidancePrompt(input);
    const response = await this.callClaude(prompt);
    return this.parseRevenueGuidanceResponse(response);
  }

  async optimizePipelineStrategy(input: {
    pipelineData: any;
    performanceMetrics: any;
    resourceConstraints: any;
    marketOpportunities: any;
  }): Promise<{
    strategicRecommendations: string[];
    resourceAllocation: any[];
    prioritySegments: string[];
    timelineOptimization: any[];
    expectedImpact: any;
  }> {
    const prompt = this.buildPipelineOptimizationPrompt(input);
    const response = await this.callClaude(prompt);
    return this.parsePipelineOptimizationResponse(response);
  }

  private buildPredictiveInsightsPrompt(input: PredictiveInsightsInput): ClaudeRequest {
    return {
      model: this.config.model,
      messages: [{
        role: 'user',
        content: `Analyze this sales forecasting data and generate comprehensive predictive insights:

HISTORICAL PERFORMANCE DATA:
${JSON.stringify(input.historicalData, null, 2)}

CURRENT PIPELINE DATA:
${JSON.stringify(input.pipelineData, null, 2)}

STATISTICAL FORECAST:
${JSON.stringify(input.statisticalForecast, null, 2)}

MARKET CONTEXT:
${JSON.stringify(input.marketContext, null, 2)}

FORECAST TIME RANGE: ${input.timeRange.start.toISOString()} to ${input.timeRange.end.toISOString()}

Generate comprehensive insights in JSON format:
{
  "insights": [
    {
      "type": "revenue_projection" | "pipeline_velocity" | "conversion_optimization" | "risk_assessment" | "market_opportunity",
      "priority": "high" | "medium" | "low",
      "title": "Insight title",
      "description": "Detailed insight description",
      "impact": "Quantified impact if possible",
      "timeframe": "When this insight applies",
      "confidence": 0.0-1.0,
      "actionable": true/false,
      "dataSupport": "Supporting data points"
    }
  ],
  "confidenceScore": 0.0-1.0,
  "marketFactors": [
    {
      "factor": "Factor name",
      "impact": "positive" | "negative" | "neutral",
      "magnitude": 0.0-1.0,
      "description": "How this factor affects the forecast"
    }
  ],
  "recommendations": {
    "priorityActions": ["action 1", "action 2", "action 3"],
    "opportunityCapture": ["opportunity 1", "opportunity 2"],
    "riskMitigations": ["mitigation 1", "mitigation 2"]
  },
  "scenarioOutlook": {
    "optimistic": {
      "probability": 0.0-1.0,
      "revenue_impact": "percentage change",
      "key_drivers": ["driver 1", "driver 2"]
    },
    "realistic": {
      "probability": 0.0-1.0,
      "revenue_impact": "percentage change",
      "key_drivers": ["driver 1", "driver 2"]
    },
    "pessimistic": {
      "probability": 0.0-1.0,
      "revenue_impact": "percentage change",
      "key_drivers": ["driver 1", "driver 2"]
    }
  }
}

Focus on:
1. Revenue predictability and confidence levels
2. Pipeline health and velocity trends
3. Market dynamics affecting sales performance
4. Risk factors that could impact forecasts
5. Specific opportunities for improvement
6. Actionable recommendations for sales leadership`
      }],
      maxTokens: 3000,
      temperature: 0.2
    };
  }

  private buildDealProbabilityPrompt(input: DealProbabilityInput): ClaudeRequest {
    return {
      model: this.config.model,
      messages: [{
        role: 'user',
        content: `Assess the probability of this deal closing successfully:

DEAL INFORMATION:
- ID: ${input.deal.id}
- Value: $${input.deal.value.toLocaleString()}
- Stage: ${input.deal.stage}
- Days in Stage: ${input.deal.daysInStage || 'Unknown'}
- Expected Close Date: ${input.deal.expectedCloseDate}
- Lead Score: ${input.deal.leadScore || 'Unknown'}
- Sales Rep: ${input.deal.assignedTo || 'Unknown'}
- Industry: ${input.deal.industry || 'Unknown'}
- Company Size: ${input.deal.companySize || 'Unknown'}

STATISTICAL PROBABILITY: ${(input.statisticalProbability * 100).toFixed(1)}%

SIMILAR HISTORICAL DEALS:
${input.similarDeals.map(deal => 
  `- ${deal.stage} | $${deal.value.toLocaleString()} | ${deal.outcome || 'Pending'} | ${deal.industry}`
).join('\n')}

MARKET CONTEXT:
${JSON.stringify(input.marketContext, null, 2)}

Provide assessment in JSON format:
{
  "probability": 0.0-1.0,
  "confidence": 0.0-1.0,
  "positiveFactors": [
    "Factor 1: Explanation",
    "Factor 2: Explanation"
  ],
  "negativeFactors": [
    "Risk 1: Explanation",
    "Risk 2: Explanation"
  ],
  "neutralFactors": [
    "Factor 1: Explanation"
  ],
  "recommendations": [
    "Specific action 1",
    "Specific action 2",
    "Specific action 3"
  ],
  "expectedCloseDate": "ISO date string",
  "riskFactors": [
    "Risk factor 1",
    "Risk factor 2"
  ]
}

Consider:
1. Deal stage progression patterns
2. Stakeholder engagement level
3. Competitive positioning
4. Budget and decision-making process
5. Timeline and urgency factors
6. Industry and market conditions
7. Sales rep performance history
8. Company characteristics and fit`
      }],
      maxTokens: 2000,
      temperature: 0.3
    };
  }

  private buildScenarioForecastPrompt(input: any): ClaudeRequest {
    return {
      model: this.config.model,
      messages: [{
        role: 'user',
        content: `Generate a ${input.scenario} scenario forecast based on this data:

BASE FORECAST:
${JSON.stringify(input.baseForecast, null, 2)}

RISK FACTORS:
${input.adjustmentFactors.riskFactors.map(risk => `- ${risk.name}: ${risk.impact}`).join('\n')}

OPPORTUNITIES:
${input.adjustmentFactors.opportunities.map(opp => `- ${opp.name}: ${opp.potential}`).join('\n')}

For the ${input.scenario.toUpperCase()} scenario, adjust the base forecast considering:

OPTIMISTIC SCENARIO:
- Best-case market conditions
- Accelerated deal closure
- Higher conversion rates
- Successful opportunity capture

PESSIMISTIC SCENARIO:
- Market headwinds
- Deal delays and losses
- Lower conversion rates
- Risk factor materialization

REALISTIC SCENARIO:
- Current trend continuation
- Mixed market conditions
- Moderate risk/opportunity balance

Return adjusted forecast in JSON:
{
  "adjustedRevenue": {
    "quarterly": [{"period": "Q1", "amount": 0, "confidence": 0.0}],
    "monthly": [{"period": "Jan", "amount": 0, "confidence": 0.0}]
  },
  "adjustmentFactors": [
    {"factor": "Factor name", "impact": "+/- percentage"}
  ],
  "probability": 0.0-1.0,
  "keyAssumptions": ["assumption 1", "assumption 2"],
  "sensitivityAnalysis": {
    "high_impact_variables": ["variable 1", "variable 2"],
    "variance_range": {"low": 0, "high": 0}
  }
}`
      }],
      maxTokens: 1500,
      temperature: 0.4
    };
  }

  private buildMarketTrendsPrompt(input: any): ClaudeRequest {
    return {
      model: this.config.model,
      messages: [{
        role: 'user',
        content: `Analyze market trends and their impact on sales forecasting:

HISTORICAL DATA: ${JSON.stringify(input.historicalData)}
INDUSTRY DATA: ${JSON.stringify(input.industryData)}
COMPETITIVE DATA: ${JSON.stringify(input.competitiveData)}
ECONOMIC INDICATORS: ${JSON.stringify(input.economicIndicators)}
TIME HORIZON: ${input.timeHorizon} days

Provide market analysis in JSON format with trend insights, predictions, and recommendations.`
      }],
      maxTokens: 2500,
      temperature: 0.3
    };
  }

  private buildRevenueGuidancePrompt(input: any): ClaudeRequest {
    return {
      model: this.config.model,
      messages: [{
        role: 'user',
        content: `Generate revenue guidance based on current forecast and market conditions:

CURRENT FORECAST: ${JSON.stringify(input.currentForecast)}
PERFORMANCE METRICS: ${JSON.stringify(input.performanceMetrics)}
MARKET CONDITIONS: ${JSON.stringify(input.marketConditions)}
INTERNAL FACTORS: ${JSON.stringify(input.internalFactors)}

Provide executive-level revenue guidance with confidence ranges and key assumptions.`
      }],
      maxTokens: 1800,
      temperature: 0.2
    };
  }

  private buildPipelineOptimizationPrompt(input: any): ClaudeRequest {
    return {
      model: this.config.model,
      messages: [{
        role: 'user',
        content: `Analyze pipeline data and recommend optimization strategies:

PIPELINE DATA: ${JSON.stringify(input.pipelineData)}
PERFORMANCE METRICS: ${JSON.stringify(input.performanceMetrics)}
RESOURCE CONSTRAINTS: ${JSON.stringify(input.resourceConstraints)}
MARKET OPPORTUNITIES: ${JSON.stringify(input.marketOpportunities)}

Generate strategic recommendations for pipeline optimization and resource allocation.`
      }],
      maxTokens: 2200,
      temperature: 0.3
    };
  }

  private async callClaude(request: ClaudeRequest): Promise<ClaudeResponse> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        const response = await asyncTimeout(
          this.client.messages.create(request as any),
          this.config.timeout,
          'Claude forecasting timeout'
        );

        return response as ClaudeResponse;
        
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.config.retries - 1) {
          throw error;
        }
        
        const delay = exponentialBackoff(attempt, 1500);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  private parsePredictiveInsights(response: ClaudeResponse): PredictiveInsightsOutput {
    try {
      const content = response.content[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No JSON found in response');
    } catch (error) {
      logger.warn('Failed to parse predictive insights', { error: (error as Error).message });
      return this.getFallbackInsights();
    }
  }

  private parseDealProbabilityResponse(response: ClaudeResponse): DealProbabilityOutput {
    try {
      const content = response.content[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          expectedCloseDate: new Date(parsed.expectedCloseDate)
        };
      }
      
      throw new Error('No JSON found in response');
    } catch (error) {
      return {
        probability: 0.5,
        confidence: 0.3,
        positiveFactors: ['Basic deal progression'],
        negativeFactors: ['Analysis failed'],
        neutralFactors: [],
        recommendations: ['Manual review required'],
        expectedCloseDate: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)),
        riskFactors: ['Insufficient data']
      };
    }
  }

  private parseScenarioForecast(response: ClaudeResponse): any {
    try {
      const content = response.content[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No JSON found in response');
    } catch (error) {
      return {
        adjustedRevenue: { quarterly: [], monthly: [] },
        adjustmentFactors: [],
        probability: 0.33,
        keyAssumptions: ['Fallback scenario'],
        sensitivityAnalysis: { high_impact_variables: [], variance_range: { low: 0, high: 0 } }
      };
    }
  }

  private parseMarketTrendsResponse(response: ClaudeResponse): any {
    try {
      const content = response.content[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No JSON found in response');
    } catch (error) {
      return {
        trendAnalysis: [],
        marketPredictions: [],
        competitiveOutlook: [],
        riskFactors: [],
        opportunities: [],
        confidence: 0.5
      };
    }
  }

  private parseRevenueGuidanceResponse(response: ClaudeResponse): any {
    try {
      const content = response.content[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No JSON found in response');
    } catch (error) {
      return {
        guidance: { revenue: 0, confidence: 0.5, range: { low: 0, high: 0 } },
        keyAssumptions: [],
        riskFactors: [],
        upwardDrivers: [],
        recommendations: []
      };
    }
  }

  private parsePipelineOptimizationResponse(response: ClaudeResponse): any {
    try {
      const content = response.content[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No JSON found in response');
    } catch (error) {
      return {
        strategicRecommendations: [],
        resourceAllocation: [],
        prioritySegments: [],
        timelineOptimization: [],
        expectedImpact: {}
      };
    }
  }

  private getFallbackInsights(): PredictiveInsightsOutput {
    return {
      insights: [
        {
          type: 'revenue_projection',
          priority: 'medium',
          title: 'Baseline Revenue Projection',
          description: 'Standard forecasting model applied due to analysis limitations',
          impact: 'Moderate confidence in projections',
          timeframe: 'Next quarter',
          confidence: 0.5,
          actionable: false,
          dataSupport: 'Historical trends only'
        }
      ],
      confidenceScore: 0.4,
      marketFactors: [
        {
          factor: 'Market conditions',
          impact: 'neutral',
          magnitude: 0.5,
          description: 'Unable to analyze market factors in detail'
        }
      ],
      recommendations: {
        priorityActions: ['Improve data collection', 'Manual forecast review'],
        opportunityCapture: ['Focus on known opportunities'],
        riskMitigations: ['Monitor key metrics closely']
      },
      scenarioOutlook: {
        optimistic: { probability: 0.2, revenue_impact: '+10%', key_drivers: ['Best case scenario'] },
        realistic: { probability: 0.6, revenue_impact: '0%', key_drivers: ['Current trajectory'] },
        pessimistic: { probability: 0.2, revenue_impact: '-10%', key_drivers: ['Downside risks'] }
      }
    };
  }

  private getFallbackDealProbability(deal: Deal): DealProbabilityOutput {
    return {
      probability: 0.5,
      confidence: 0.3,
      positiveFactors: ['Deal in active pipeline'],
      negativeFactors: ['Limited analysis data'],
      neutralFactors: ['Standard sales process'],
      recommendations: ['Follow standard sales methodology', 'Gather more qualification data'],
      expectedCloseDate: deal.expectedCloseDate || new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)),
      riskFactors: ['Insufficient historical data for accurate analysis']
    };
  }

  private getFallbackScenarioForecast(baseForecast: any, scenario: string): any {
    const multiplier = scenario === 'optimistic' ? 1.2 : scenario === 'pessimistic' ? 0.8 : 1.0;
    
    return {
      adjustedRevenue: {
        quarterly: baseForecast.quarterly?.map((q: any) => ({
          ...q,
          amount: q.amount * multiplier
        })) || [],
        monthly: baseForecast.monthly?.map((m: any) => ({
          ...m,
          amount: m.amount * multiplier
        })) || []
      },
      adjustmentFactors: [`${scenario} scenario adjustment: ${((multiplier - 1) * 100).toFixed(0)}%`],
      probability: 0.33,
      keyAssumptions: [`${scenario} market conditions`],
      sensitivityAnalysis: {
        high_impact_variables: ['Market conditions', 'Deal execution'],
        variance_range: { low: baseForecast.amount * 0.8, high: baseForecast.amount * 1.2 }
      }
    };
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      const testPrompt: ClaudeRequest = {
        model: this.config.model,
        messages: [{ role: 'user', content: 'Health check - respond with "OK"' }],
        maxTokens: 10,
        temperature: 0
      };
      
      const response = await asyncTimeout(
        this.client.messages.create(testPrompt as any),
        5000,
        'Health check timeout'
      );
      
      return {
        status: 'healthy',
        details: {
          model: this.config.model,
          cacheSize: this.cache.size,
          predictionHorizon: this.config.predictionHorizon
        }
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: (error as Error).message
        }
      };
    }
  }

  async cleanup(): Promise<void> {
    this.cache.clear();
    logger.info('Claude forecasting tool cleaned up');
  }
}

export default ClaudeForecastingTool;