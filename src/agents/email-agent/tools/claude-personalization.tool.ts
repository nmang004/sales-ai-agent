// Claude Personalization Tool for Email Agent

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
  EmailTemplate,
  Lead,
  Deal,
  PersonalizationContext,
  EmailTemplateType
} from '@/shared/types';
import { memoize, asyncTimeout, exponentialBackoff } from '@/shared/utils';

export interface ClaudePersonalizationConfig extends ClaudeConfig {
  aiPersonalization: boolean;
  dynamicContentBlocks: boolean;
  industrySpecificContent: boolean;
  timeout: number;
  retries: number;
}

export interface PersonalizationInput {
  template: EmailTemplate;
  leadData: Lead;
  dealData?: Deal;
  personalizationContext: PersonalizationContext;
  aiInsights: any;
  sequenceContext: {
    stepNumber: number;
    totalSteps: number;
    previousEngagement: any;
  };
}

export interface PersonalizedEmail {
  subject: string;
  htmlContent: string;
  textContent: string;
  recipient: {
    email: string;
    name: string;
  };
  personalizationScore: number;
  aiGeneratedElements: string[];
  trackingParameters: any;
}

export class ClaudePersonalizationTool extends AgentTool {
  private client: Anthropic;
  private config: ClaudePersonalizationConfig;
  private cache: Map<string, { value: any; timestamp: number }>;

  constructor(config: ClaudePersonalizationConfig) {
    super('claude-personalization-tool', 'ai-integration');
    
    this.config = {
      timeout: 15000,
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
      this.generatePersonalizationInsights = memoize(
        this.generatePersonalizationInsights.bind(this),
        this.generateCacheKey.bind(this),
        this.config.caching.ttl || 1800000 // 30 minutes
      );
    }
  }

  private generateCacheKey(...args: any[]): string {
    return `personalization:${Buffer.from(JSON.stringify(args)).toString('base64')}`;
  }

  async generatePersonalizationInsights(input: {
    leadData: Lead;
    dealData?: Deal;
    sequenceTemplate: any;
    personalizationContext: PersonalizationContext;
  }): Promise<{
    personalizedSubject: string;
    keyTalkingPoints: string[];
    painPointsIdentified: string[];
    valuePropositionAngles: string[];
    competitorMentions: string[];
    timingFactors: any;
    personalizationScore: number;
    recommendedTone: string;
    callToActionSuggestions: string[];
  }> {
    const startTime = Date.now();

    try {
      logger.debug('Generating personalization insights', {
        leadCompany: input.leadData.company,
        sequenceTemplate: input.sequenceTemplate.name
      });

      const prompt = this.buildPersonalizationInsightsPrompt(input);
      const response = await this.callClaude(prompt);
      const insights = this.parsePersonalizationInsights(response);

      logger.performance('claude-personalization-insights', Date.now() - startTime, {
        tokensUsed: response.usage.totalTokens,
        personalizationScore: insights.personalizationScore
      });

      return insights;

    } catch (error) {
      logger.error('Personalization insights generation failed', error as Error, {
        leadCompany: input.leadData.company,
        duration: Date.now() - startTime
      });
      
      // Return fallback insights
      return this.getFallbackInsights(input.leadData);
    }
  }

  async personalizeEmailContent(input: PersonalizationInput): Promise<PersonalizedEmail> {
    const startTime = Date.now();

    try {
      logger.debug('Personalizing email content', {
        templateType: input.template.type,
        leadCompany: input.leadData.company,
        stepNumber: input.sequenceContext.stepNumber
      });

      // Generate personalized subject line
      const subjectVariations = await this.generateSubjectLineVariations({
        template: input.template,
        leadData: input.leadData,
        aiInsights: input.aiInsights,
        sequenceContext: input.sequenceContext
      });

      // Generate personalized email body
      const personalizedBody = await this.generatePersonalizedEmailBody({
        template: input.template,
        leadData: input.leadData,
        dealData: input.dealData,
        personalizationContext: input.personalizationContext,
        aiInsights: input.aiInsights,
        sequenceContext: input.sequenceContext
      });

      // Calculate personalization score
      const personalizationScore = this.calculatePersonalizationScore(
        input.template,
        personalizedBody,
        input.leadData
      );

      const personalizedEmail: PersonalizedEmail = {
        subject: subjectVariations.bestSubject,
        htmlContent: personalizedBody.htmlContent,
        textContent: personalizedBody.textContent,
        recipient: {
          email: input.leadData.email,
          name: `${input.leadData.firstName} ${input.leadData.lastName}`.trim()
        },
        personalizationScore,
        aiGeneratedElements: personalizedBody.aiGeneratedElements,
        trackingParameters: {
          campaignId: input.sequenceContext.stepNumber,
          leadId: input.leadData.id,
          templateId: input.template.id,
          personalizationVersion: 'claude-v1'
        }
      };

      logger.performance('claude-email-personalization', Date.now() - startTime, {
        personalizationScore,
        aiElementsGenerated: personalizedBody.aiGeneratedElements.length,
        tokensUsed: personalizedBody.tokensUsed
      });

      return personalizedEmail;

    } catch (error) {
      logger.error('Email personalization failed', error as Error, {
        templateId: input.template.id,
        leadId: input.leadData.id,
        duration: Date.now() - startTime
      });
      
      // Return minimally personalized fallback
      return this.getFallbackPersonalizedEmail(input);
    }
  }

  async generateSubjectLineVariations(input: {
    template: EmailTemplate;
    leadData: Lead;
    aiInsights: any;
    sequenceContext: any;
  }): Promise<{
    bestSubject: string;
    variations: string[];
    reasoning: string;
  }> {
    const prompt = this.buildSubjectLinePrompt(input);
    const response = await this.callClaude(prompt);
    return this.parseSubjectLineResponse(response);
  }

  async generatePersonalizedEmailBody(input: {
    template: EmailTemplate;
    leadData: Lead;
    dealData?: Deal;
    personalizationContext: PersonalizationContext;
    aiInsights: any;
    sequenceContext: any;
  }): Promise<{
    htmlContent: string;
    textContent: string;
    aiGeneratedElements: string[];
    tokensUsed: number;
  }> {
    const prompt = this.buildEmailBodyPrompt(input);
    const response = await this.callClaude(prompt);
    return this.parseEmailBodyResponse(response, input.template);
  }

  async optimizeCallToAction(
    originalCTA: string,
    leadProfile: Lead,
    sequenceContext: any
  ): Promise<{
    optimizedCTA: string;
    alternatives: string[];
    reasoning: string;
  }> {
    const prompt: ClaudeRequest = {
      model: this.config.model,
      messages: [{
        role: 'user',
        content: `Optimize this call-to-action for maximum engagement:

Original CTA: "${originalCTA}"

Lead Profile:
- Name: ${leadProfile.firstName} ${leadProfile.lastName}
- Title: ${leadProfile.title}
- Company: ${leadProfile.company}
- Industry: ${leadProfile.industry}
- Engagement Level: ${sequenceContext.previousEngagement}

Generate:
1. One optimized CTA (primary recommendation)
2. 3 alternative variations
3. Brief reasoning for the optimization

Focus on:
- Specificity and clarity
- Appropriate urgency for their role/industry
- Value-focused language
- Action-oriented phrasing

Return as JSON: {
  "optimizedCTA": "...",
  "alternatives": ["...", "...", "..."],
  "reasoning": "..."
}`
      }],
      maxTokens: 800,
      temperature: 0.4
    };

    const response = await this.callClaude(prompt);
    return this.parseOptimizedCTAResponse(response);
  }

  async generateDynamicContentBlocks(
    leadData: Lead,
    contentType: 'pain_points' | 'social_proof' | 'value_props' | 'industry_insights'
  ): Promise<string[]> {
    const prompt: ClaudeRequest = {
      model: this.config.model,
      messages: [{
        role: 'user',
        content: `Generate ${contentType} content blocks for this lead:

Lead Information:
- Company: ${leadData.company}
- Industry: ${leadData.industry}
- Title: ${leadData.title}
- Company Size: ${leadData.companySize}
- Location: ${leadData.location}

Generate 3-5 ${contentType} that would be highly relevant and compelling for this specific lead profile. Each should be 1-2 sentences maximum.

Return as a simple array of strings.`
      }],
      maxTokens: 1000,
      temperature: 0.5
    };

    const response = await this.callClaude(prompt);
    return this.parseContentBlocksResponse(response);
  }

  private buildPersonalizationInsightsPrompt(input: any): ClaudeRequest {
    return {
      model: this.config.model,
      messages: [{
        role: 'user',
        content: `Analyze this lead profile and generate comprehensive personalization insights:

LEAD DATA:
- Name: ${input.leadData.firstName} ${input.leadData.lastName}
- Title: ${input.leadData.title}
- Company: ${input.leadData.company}
- Industry: ${input.leadData.industry}
- Company Size: ${input.leadData.companySize}
- Location: ${input.leadData.location}
- Recent Activity: ${JSON.stringify(input.leadData.activityHistory?.slice(-3))}

DEAL DATA: ${input.dealData ? JSON.stringify(input.dealData) : 'No active deal'}

SEQUENCE CONTEXT:
- Template: ${input.sequenceTemplate.name}
- Purpose: ${input.sequenceTemplate.description}

PERSONALIZATION CONTEXT:
- Lead Quality: ${input.personalizationContext.leadQuality}
- Urgency: ${input.personalizationContext.urgency}
- Score Factors: ${JSON.stringify(input.personalizationContext.scoreFactors)}

Generate insights in JSON format:
{
  "personalizedSubject": "Suggested subject line",
  "keyTalkingPoints": ["point 1", "point 2", "point 3"],
  "painPointsIdentified": ["pain 1", "pain 2", "pain 3"],
  "valuePropositionAngles": ["angle 1", "angle 2", "angle 3"],
  "competitorMentions": ["competitor 1", "competitor 2"],
  "timingFactors": {
    "urgency": "high/medium/low",
    "bestContactTime": "time recommendation",
    "seasonalFactors": ["factor 1", "factor 2"]
  },
  "personalizationScore": 0.0-1.0,
  "recommendedTone": "professional/casual/consultative/urgent",
  "callToActionSuggestions": ["cta 1", "cta 2", "cta 3"]
}`
      }],
      maxTokens: 2000,
      temperature: 0.4
    };
  }

  private buildSubjectLinePrompt(input: any): ClaudeRequest {
    return {
      model: this.config.model,
      messages: [{
        role: 'user',
        content: `Generate compelling subject lines for this email:

TEMPLATE SUBJECT: "${input.template.subject}"

LEAD PROFILE:
- Name: ${input.leadData.firstName}
- Company: ${input.leadData.company}
- Title: ${input.leadData.title}
- Industry: ${input.leadData.industry}

SEQUENCE CONTEXT:
- Step ${input.sequenceContext.stepNumber} of ${input.sequenceContext.totalSteps}
- Previous Engagement: ${JSON.stringify(input.sequenceContext.previousEngagement)}

AI INSIGHTS:
- Key Talking Points: ${input.aiInsights.keyTalkingPoints?.join(', ')}
- Pain Points: ${input.aiInsights.painPointsIdentified?.join(', ')}
- Recommended Tone: ${input.aiInsights.recommendedTone}

Generate 5 subject line variations, then select the best one. Requirements:
- Under 50 characters
- Personalized with company/name where appropriate
- Professional but engaging tone
- Avoid spam trigger words
- Relevant to their industry/role

Return as JSON:
{
  "bestSubject": "Primary recommendation",
  "variations": ["option 1", "option 2", "option 3", "option 4", "option 5"],
  "reasoning": "Why the best subject was chosen"
}`
      }],
      maxTokens: 1200,
      temperature: 0.5
    };
  }

  private buildEmailBodyPrompt(input: any): ClaudeRequest {
    const templateContent = input.template.htmlContent || input.template.textContent;
    
    return {
      model: this.config.model,
      messages: [{
        role: 'user',
        content: `Personalize this email template for maximum engagement:

ORIGINAL TEMPLATE:
${templateContent}

LEAD PROFILE:
- Name: ${input.leadData.firstName} ${input.leadData.lastName}
- Title: ${input.leadData.title}
- Company: ${input.leadData.company}
- Industry: ${input.leadData.industry}
- Company Size: ${input.leadData.companySize}
- Location: ${input.leadData.location}

DEAL CONTEXT: ${input.dealData ? `Stage: ${input.dealData.stage}, Value: $${input.dealData.value}` : 'No active deal'}

SEQUENCE CONTEXT:
- Email ${input.sequenceContext.stepNumber} of ${input.sequenceContext.totalSteps}
- Previous Opens: ${input.sequenceContext.previousEngagement.opensCount}
- Previous Clicks: ${input.sequenceContext.previousEngagement.clicksCount}

AI INSIGHTS:
- Pain Points: ${input.aiInsights.painPointsIdentified?.join(', ')}
- Value Props: ${input.aiInsights.valuePropositionAngles?.join(', ')}
- Timing Factors: ${JSON.stringify(input.aiInsights.timingFactors)}
- Recommended Tone: ${input.aiInsights.recommendedTone}

Personalization Requirements:
1. Replace all placeholder variables with actual data
2. Add industry-specific pain points and solutions
3. Include relevant social proof or case studies
4. Optimize the call-to-action for their role
5. Maintain professional but personal tone
6. Keep it concise and scannable

Generate both HTML and text versions. Mark AI-generated elements with [AI] tags for tracking.

Return as JSON:
{
  "htmlContent": "Complete HTML email content",
  "textContent": "Plain text version",
  "aiGeneratedElements": ["element 1", "element 2", "element 3"]
}`
      }],
      maxTokens: 2500,
      temperature: 0.4
    };
  }

  private async callClaude(request: ClaudeRequest): Promise<ClaudeResponse> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        const response = await asyncTimeout(
          this.client.messages.create(request as any),
          this.config.timeout,
          'Claude personalization timeout'
        );

        return response as ClaudeResponse;
        
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.config.retries - 1) {
          throw error;
        }
        
        const delay = exponentialBackoff(attempt, 1000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  private parsePersonalizationInsights(response: ClaudeResponse): any {
    try {
      const content = response.content[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No JSON found in response');
    } catch (error) {
      logger.warn('Failed to parse personalization insights', { error: (error as Error).message });
      return this.getFallbackInsights();
    }
  }

  private parseSubjectLineResponse(response: ClaudeResponse): any {
    try {
      const content = response.content[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No JSON found in response');
    } catch (error) {
      return {
        bestSubject: 'Quick question',
        variations: ['Quick question', 'Checking in', 'Thought this might help'],
        reasoning: 'Using fallback subject lines'
      };
    }
  }

  private parseEmailBodyResponse(response: ClaudeResponse, template: EmailTemplate): any {
    try {
      const content = response.content[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          tokensUsed: response.usage?.totalTokens || 0
        };
      }
      
      throw new Error('No JSON found in response');
    } catch (error) {
      return {
        htmlContent: template.htmlContent || template.textContent,
        textContent: template.textContent || template.htmlContent,
        aiGeneratedElements: [],
        tokensUsed: 0
      };
    }
  }

  private parseOptimizedCTAResponse(response: ClaudeResponse): any {
    try {
      const content = response.content[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No JSON found in response');
    } catch (error) {
      return {
        optimizedCTA: 'Schedule a 15-minute call',
        alternatives: ['Book a demo', 'Learn more', 'Get started'],
        reasoning: 'Using fallback CTA options'
      };
    }
  }

  private parseContentBlocksResponse(response: ClaudeResponse): string[] {
    try {
      const content = response.content[0]?.text || '';
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      return lines.slice(0, 5).map(line => line.replace(/^[\d\-\*\•]\s*/, '').trim());
    } catch (error) {
      return ['Generic content block'];
    }
  }

  private calculatePersonalizationScore(
    template: EmailTemplate,
    personalizedContent: any,
    leadData: Lead
  ): number {
    let score = 0;
    
    // Check for name personalization
    if (personalizedContent.htmlContent.includes(leadData.firstName)) score += 0.2;
    
    // Check for company personalization
    if (personalizedContent.htmlContent.includes(leadData.company)) score += 0.2;
    
    // Check for industry-specific content
    if (personalizedContent.htmlContent.includes(leadData.industry)) score += 0.15;
    
    // Check for AI-generated elements
    score += Math.min(personalizedContent.aiGeneratedElements.length * 0.1, 0.3);
    
    // Check for role-specific content
    if (personalizedContent.htmlContent.includes(leadData.title)) score += 0.15;
    
    return Math.min(score, 1.0);
  }

  private getFallbackInsights(leadData?: Lead): any {
    return {
      personalizedSubject: 'Quick question',
      keyTalkingPoints: ['Product benefits', 'Cost savings', 'Implementation'],
      painPointsIdentified: ['Efficiency challenges', 'Cost concerns', 'Integration complexity'],
      valuePropositionAngles: ['Save time', 'Reduce costs', 'Improve efficiency'],
      competitorMentions: [],
      timingFactors: {
        urgency: 'medium',
        bestContactTime: 'Business hours',
        seasonalFactors: []
      },
      personalizationScore: 0.3,
      recommendedTone: 'professional',
      callToActionSuggestions: ['Schedule a call', 'Learn more', 'Get demo']
    };
  }

  private getFallbackPersonalizedEmail(input: PersonalizationInput): PersonalizedEmail {
    const basicPersonalization = input.template.htmlContent
      ?.replace('{firstName}', input.leadData.firstName)
      ?.replace('{company}', input.leadData.company)
      || input.template.textContent;

    return {
      subject: input.template.subject.replace('{firstName}', input.leadData.firstName),
      htmlContent: basicPersonalization || '',
      textContent: input.template.textContent || basicPersonalization || '',
      recipient: {
        email: input.leadData.email,
        name: `${input.leadData.firstName} ${input.leadData.lastName}`.trim()
      },
      personalizationScore: 0.2,
      aiGeneratedElements: [],
      trackingParameters: {
        fallback: true,
        templateId: input.template.id
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
          personalizationEnabled: this.config.aiPersonalization
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
    logger.info('Claude personalization tool cleaned up');
  }
}

export default ClaudePersonalizationTool;