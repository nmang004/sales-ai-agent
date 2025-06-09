// Claude AI Tool for Lead Scoring Agent

import { AgentTool } from '@voltagent/tools';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/shared/utils/logger';
import { 
  ClaudeConfig, 
  ClaudeRequest, 
  ClaudeResponse, 
  LeadAnalysisPrompt, 
  LeadAnalysisResponse,
  ClaudeError,
  ClaudeErrorType
} from '@/shared/types/claude.types';
import { memoize, asyncTimeout, exponentialBackoff } from '@/shared/utils';

export interface ClaudeAIToolConfig extends ClaudeConfig {
  timeout: number;
  retries: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}

export class ClaudeAITool extends AgentTool {
  private client: Anthropic;
  private config: ClaudeAIToolConfig;
  private cache: Map<string, { value: any; timestamp: number }>;

  constructor(config: ClaudeAIToolConfig) {
    super('claude-ai-tool', 'ai-integration');
    
    this.config = {
      timeout: 30000,
      retries: 3,
      cacheEnabled: true,
      cacheTTL: 3600000, // 1 hour
      ...config
    };

    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY
    });

    this.cache = new Map();
    this.setupMemoizedMethods();
  }

  private setupMemoizedMethods(): void {
    if (this.config.cacheEnabled) {
      this.analyzeLeadQuality = memoize(
        this.analyzeLeadQuality.bind(this),
        this.generateCacheKey.bind(this),
        this.config.cacheTTL
      );
    }
  }

  private generateCacheKey(prompt: LeadAnalysisPrompt): string {
    // Create a deterministic cache key based on lead data
    const key = {
      company: prompt.leadData.company,
      industry: prompt.leadData.industry,
      companySize: prompt.leadData.companySize,
      scoringFactors: prompt.scoringFactors
    };
    
    return `lead-analysis:${Buffer.from(JSON.stringify(key)).toString('base64')}`;
  }

  async analyzeLeadQuality(prompt: LeadAnalysisPrompt): Promise<LeadAnalysisResponse> {
    const startTime = Date.now();
    
    try {
      logger.debug('Analyzing lead quality with Claude AI', {
        leadCompany: prompt.leadData.company,
        operation: 'analyze-lead-quality'
      });

      const claudePrompt = this.buildLeadAnalysisPrompt(prompt);
      const response = await this.callClaude(claudePrompt);
      
      const analysis = this.parseLeadAnalysisResponse(response);
      
      logger.performance('claude-lead-analysis', Date.now() - startTime, {
        tokensUsed: response.usage.totalTokens,
        cached: false
      });

      return analysis;
      
    } catch (error) {
      logger.error('Claude lead analysis failed', error as Error, {
        leadCompany: prompt.leadData.company,
        duration: Date.now() - startTime
      });
      throw error;
    }
  }

  async generateInsights(
    leadProfile: any,
    scoreBreakdown: any,
    historicalData: any
  ): Promise<{
    primaryInsights: string[];
    conversationStarters: string[];
    painPointsIdentified: string[];
    valuePropositionAngles: string[];
    timingRecommendations: any;
    competitiveConsiderations: string[];
  }> {
    const startTime = Date.now();
    
    try {
      const prompt = this.buildInsightGenerationPrompt(leadProfile, scoreBreakdown, historicalData);
      const response = await this.callClaude(prompt);
      
      const insights = this.parseInsightsResponse(response);
      
      logger.performance('claude-insights-generation', Date.now() - startTime, {
        tokensUsed: response.usage.totalTokens
      });

      return insights;
      
    } catch (error) {
      logger.error('Claude insights generation failed', error as Error);
      throw error;
    }
  }

  async explainScoreFactors(
    finalScore: number,
    factorBreakdown: any,
    benchmarkComparison: any
  ): Promise<{
    executiveSummary: string;
    scoreJustification: string;
    improvementOpportunities: string[];
    keyTalkingPoints: string[];
  }> {
    const startTime = Date.now();
    
    try {
      const prompt = this.buildScoreExplanationPrompt(finalScore, factorBreakdown, benchmarkComparison);
      const response = await this.callClaude(prompt);
      
      const explanation = this.parseScoreExplanationResponse(response);
      
      logger.performance('claude-score-explanation', Date.now() - startTime, {
        tokensUsed: response.usage.totalTokens
      });

      return explanation;
      
    } catch (error) {
      logger.error('Claude score explanation failed', error as Error);
      throw error;
    }
  }

  async identifyPersonalizationOpportunities(leadData: any): Promise<string[]> {
    const prompt = {
      model: this.config.model,
      messages: [{
        role: 'user',
        content: `Based on this lead data, identify specific personalization opportunities for sales outreach:

Lead Information:
- Company: ${leadData.company}
- Industry: ${leadData.industry}
- Title: ${leadData.title}
- Company Size: ${leadData.companySize}
- Recent Activity: ${JSON.stringify(leadData.activityHistory?.slice(-3))}
- Technology Stack: ${leadData.technologies?.join(', ')}

Provide 3-5 specific personalization opportunities that a sales rep could use in their outreach.`
      }],
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature
    };

    const response = await this.callClaude(prompt);
    return this.parsePersonalizationResponse(response);
  }

  async assessTimingFactors(leadData: any): Promise<{
    urgency: 'low' | 'medium' | 'high';
    bestContactTime: string;
    seasonalFactors: string[];
    businessCycleAlignment: string;
  }> {
    const prompt = {
      model: this.config.model,
      messages: [{
        role: 'user',
        content: `Analyze timing factors for this lead:

Company: ${leadData.company}
Industry: ${leadData.industry}
Budget Cycle: ${leadData.budgetCycle}
Contract Expiration: ${leadData.contractExpiration}
Business Initiatives: ${leadData.businessInitiatives}
Recent Activity: ${JSON.stringify(leadData.activityHistory?.slice(-5))}

Assess:
1. Overall urgency level
2. Best time to contact (considering time zones and business cycles)
3. Seasonal factors that might affect their buying decision
4. How well our outreach aligns with their business cycle

Return as JSON with structure: {urgency, bestContactTime, seasonalFactors, businessCycleAlignment}`
      }],
      maxTokens: 1000,
      temperature: 0.2
    };

    const response = await this.callClaude(prompt);
    return this.parseTimingResponse(response);
  }

  private buildLeadAnalysisPrompt(prompt: LeadAnalysisPrompt): ClaudeRequest {
    const systemPrompt = `You are an expert sales intelligence analyst. Analyze leads for sales potential and provide actionable insights. Always respond in valid JSON format.`;

    const userPrompt = `Analyze this sales lead for quality and potential:

LEAD DATA:
- Email: ${prompt.leadData.email}
- Company: ${prompt.leadData.company || 'Unknown'}
- Title: ${prompt.leadData.title || 'Unknown'}
- Industry: ${prompt.leadData.industry || 'Unknown'}
- Company Size: ${prompt.leadData.companySize || 'Unknown'}

COMPANY DATA:
- Revenue: ${prompt.companyData?.revenue ? `$${prompt.companyData.revenue.toLocaleString()}` : 'Unknown'}
- Employees: ${prompt.companyData?.employees || 'Unknown'}
- Technologies: ${prompt.companyData?.technologies?.join(', ') || 'Unknown'}
- Funding Stage: ${prompt.companyData?.fundingStage || 'Unknown'}
- Recent News: ${prompt.companyData?.recentNews?.join('; ') || 'None'}

SCORING FACTORS:
- Firmographics Score: ${prompt.scoringFactors.firmographics}/100
- Technical Fit Score: ${prompt.scoringFactors.technicalFit}/100
- Engagement Score: ${prompt.scoringFactors.engagement}/100
- Timing Score: ${prompt.scoringFactors.timing}/100
- Decision Maker Access: ${prompt.scoringFactors.decisionMakerAccess}/100
- Intent Signals: ${prompt.scoringFactors.intentSignals}/100

INDUSTRY BENCHMARKS:
- Average Score: ${prompt.industryBenchmarks.averageScore}
- Top Performers: ${prompt.industryBenchmarks.topPerformers}
- Conversion Rates: ${JSON.stringify(prompt.industryBenchmarks.conversionRates)}

RECENT ACTIVITY:
${prompt.leadData.activityHistory?.map(activity => 
  `- ${activity.type}: ${activity.description} (${activity.timestamp})`
).join('\n') || 'No recent activity'}

Provide a comprehensive analysis in this exact JSON format:
{
  "overallAssessment": "2-3 sentence executive summary",
  "keyStrengths": ["strength 1", "strength 2", "strength 3"],
  "riskFactors": ["risk 1", "risk 2", "risk 3"],
  "buyingLikelihood": 0.0-1.0,
  "personalizationOpportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "recommendedActions": ["action 1", "action 2", "action 3"],
  "confidenceScore": 0.0-1.0,
  "scoreJustification": "Explanation of why this score makes sense",
  "nextSteps": ["step 1", "step 2", "step 3"]
}`;

    return {
      model: this.config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature
    };
  }

  private buildInsightGenerationPrompt(leadProfile: any, scoreBreakdown: any, historicalData: any): ClaudeRequest {
    return {
      model: this.config.model,
      messages: [{
        role: 'user',
        content: `Generate actionable sales insights from this lead analysis:

LEAD PROFILE: ${JSON.stringify(leadProfile)}
SCORE BREAKDOWN: ${JSON.stringify(scoreBreakdown)}
HISTORICAL DATA: ${JSON.stringify(historicalData)}

Provide insights in JSON format:
{
  "primaryInsights": ["insight 1", "insight 2", "insight 3"],
  "conversationStarters": ["starter 1", "starter 2", "starter 3"],
  "painPointsIdentified": ["pain 1", "pain 2", "pain 3"],
  "valuePropositionAngles": ["angle 1", "angle 2", "angle 3"],
  "timingRecommendations": {"bestTime": "...", "urgency": "...", "factors": []},
  "competitiveConsiderations": ["consideration 1", "consideration 2"]
}`
      }],
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature
    };
  }

  private buildScoreExplanationPrompt(finalScore: number, factorBreakdown: any, benchmarkComparison: any): ClaudeRequest {
    return {
      model: this.config.model,
      messages: [{
        role: 'user',
        content: `Explain this lead score in natural language for sales reps:

FINAL SCORE: ${finalScore}/100
FACTOR BREAKDOWN: ${JSON.stringify(factorBreakdown)}
BENCHMARK COMPARISON: ${JSON.stringify(benchmarkComparison)}

Provide explanation in JSON format:
{
  "executiveSummary": "One paragraph summary for executives",
  "scoreJustification": "Detailed explanation of the score",
  "improvementOpportunities": ["opportunity 1", "opportunity 2"],
  "keyTalkingPoints": ["point 1", "point 2", "point 3"]
}`
      }],
      maxTokens: 1500,
      temperature: 0.2
    };
  }

  private async callClaude(request: ClaudeRequest): Promise<ClaudeResponse> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        const response = await asyncTimeout(
          this.client.messages.create(request as any),
          this.config.timeout,
          'Claude API timeout'
        );

        return response as ClaudeResponse;
        
      } catch (error) {
        lastError = error as Error;
        
        const claudeError = this.mapError(error as Error);
        
        if (!claudeError.retryable || attempt === this.config.retries - 1) {
          throw claudeError;
        }
        
        const delay = exponentialBackoff(attempt);
        logger.warn(`Claude API call failed, retrying in ${delay}ms`, {
          attempt: attempt + 1,
          error: claudeError.message
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  private mapError(error: Error): ClaudeError {
    const message = error.message.toLowerCase();
    
    let type: ClaudeErrorType;
    let retryable = false;
    
    if (message.includes('authentication') || message.includes('unauthorized')) {
      type = ClaudeErrorType.AUTHENTICATION_ERROR;
    } else if (message.includes('rate limit') || message.includes('too many requests')) {
      type = ClaudeErrorType.RATE_LIMIT_ERROR;
      retryable = true;
    } else if (message.includes('timeout')) {
      type = ClaudeErrorType.TIMEOUT_ERROR;
      retryable = true;
    } else if (message.includes('overloaded') || message.includes('busy')) {
      type = ClaudeErrorType.OVERLOADED_ERROR;
      retryable = true;
    } else if (message.includes('network') || message.includes('connection')) {
      type = ClaudeErrorType.NETWORK_ERROR;
      retryable = true;
    } else if (message.includes('invalid request') || message.includes('bad request')) {
      type = ClaudeErrorType.INVALID_REQUEST_ERROR;
    } else {
      type = ClaudeErrorType.API_ERROR;
      retryable = true;
    }
    
    return {
      type,
      message: error.message,
      retryable,
      timestamp: new Date()
    };
  }

  private parseLeadAnalysisResponse(response: ClaudeResponse): LeadAnalysisResponse {
    try {
      const content = response.content[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      const required = ['overallAssessment', 'keyStrengths', 'riskFactors', 'buyingLikelihood'];
      for (const field of required) {
        if (!(field in parsed)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      return parsed as LeadAnalysisResponse;
      
    } catch (error) {
      logger.error('Failed to parse Claude lead analysis response', error as Error, {
        responseContent: response.content[0]?.text?.substring(0, 500)
      });
      
      // Return fallback response
      return {
        overallAssessment: 'Analysis parsing failed, using fallback assessment',
        keyStrengths: ['Data analysis completed'],
        riskFactors: ['Unable to generate detailed insights'],
        buyingLikelihood: 0.5,
        personalizationOpportunities: ['Generic outreach recommended'],
        recommendedActions: ['Follow standard sales process'],
        confidenceScore: 0.3,
        scoreJustification: 'Automated scoring only',
        nextSteps: ['Contact lead with standard approach']
      };
    }
  }

  private parseInsightsResponse(response: ClaudeResponse): any {
    try {
      const content = response.content[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in insights response');
      }
      
      return JSON.parse(jsonMatch[0]);
      
    } catch (error) {
      logger.error('Failed to parse Claude insights response', error as Error);
      return {
        primaryInsights: ['Insights generation failed'],
        conversationStarters: ['How can we help your business?'],
        painPointsIdentified: ['Generic business challenges'],
        valuePropositionAngles: ['Cost savings and efficiency'],
        timingRecommendations: { bestTime: 'Business hours', urgency: 'medium', factors: [] },
        competitiveConsiderations: ['Standard competitive landscape']
      };
    }
  }

  private parseScoreExplanationResponse(response: ClaudeResponse): any {
    try {
      const content = response.content[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in explanation response');
      }
      
      return JSON.parse(jsonMatch[0]);
      
    } catch (error) {
      logger.error('Failed to parse Claude explanation response', error as Error);
      return {
        executiveSummary: 'Score calculated using automated analysis',
        scoreJustification: 'Multiple factors considered in scoring algorithm',
        improvementOpportunities: ['Increase engagement', 'Provide more data'],
        keyTalkingPoints: ['Value proposition', 'ROI benefits', 'Implementation timeline']
      };
    }
  }

  private parsePersonalizationResponse(response: ClaudeResponse): string[] {
    try {
      const content = response.content[0]?.text || '';
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      return lines.slice(0, 5).map(line => line.replace(/^\d+\.\s*/, '').trim());
    } catch (error) {
      logger.error('Failed to parse personalization response', error as Error);
      return ['Generic personalization approach'];
    }
  }

  private parseTimingResponse(response: ClaudeResponse): any {
    try {
      const content = response.content[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in timing response');
      }
      
      return JSON.parse(jsonMatch[0]);
      
    } catch (error) {
      logger.error('Failed to parse Claude timing response', error as Error);
      return {
        urgency: 'medium',
        bestContactTime: 'Business hours',
        seasonalFactors: ['Standard business cycle'],
        businessCycleAlignment: 'Moderate alignment'
      };
    }
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      const testRequest: ClaudeRequest = {
        model: this.config.model,
        messages: [{ role: 'user', content: 'Health check - respond with "OK"' }],
        maxTokens: 10,
        temperature: 0
      };
      
      const response = await asyncTimeout(
        this.client.messages.create(testRequest as any),
        5000,
        'Health check timeout'
      );
      
      return {
        status: 'healthy',
        details: {
          model: this.config.model,
          responseTime: 'OK',
          cacheSize: this.cache.size
        }
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: (error as Error).message,
          cacheSize: this.cache.size
        }
      };
    }
  }

  // Clean up resources
  async cleanup(): Promise<void> {
    this.cache.clear();
    logger.info('Claude AI tool cleaned up');
  }
}

export default ClaudeAITool;