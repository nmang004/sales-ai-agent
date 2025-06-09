// Claude Coaching Tool for Conversation Agent

import { AgentTool } from '@voltagent/tools';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/shared/utils/logger';
import { 
  ClaudeConfig, 
  ClaudeRequest, 
  ClaudeResponse,
  ConversationAnalysisPrompt,
  ConversationAnalysisResponse,
  ClaudeError,
  ClaudeErrorType
} from '@/shared/types/claude.types';
import { 
  CallSession, 
  TranscriptSegment, 
  CoachingEvent,
  CoachingType 
} from '@/shared/types';
import { memoize, asyncTimeout, exponentialBackoff } from '@/shared/utils';

export interface ClaudeCoachingConfig extends ClaudeConfig {
  streamResponses: boolean;
  contextWindow: 'small' | 'medium' | 'large';
  timeout: number;
  retries: number;
  coachingPrompts: Record<string, string>;
}

export class ClaudeCoachingTool extends AgentTool {
  private client: Anthropic;
  private config: ClaudeCoachingConfig;
  private responseCache: Map<string, { value: any; timestamp: number }>;

  constructor(config: ClaudeCoachingConfig) {
    super('claude-coaching-tool', 'ai-integration');
    
    this.config = {
      timeout: 10000,
      retries: 2,
      coachingPrompts: {},
      ...config
    };

    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY
    });

    this.responseCache = new Map();
    this.setupMemoizedMethods();
  }

  private setupMemoizedMethods(): void {
    if (this.config.caching?.enabled) {
      this.generateObjectionHandling = memoize(
        this.generateObjectionHandling.bind(this),
        this.generateCacheKey.bind(this),
        this.config.caching.ttl || 300000
      );

      this.generateCompetitorResponse = memoize(
        this.generateCompetitorResponse.bind(this),
        this.generateCacheKey.bind(this),
        this.config.caching.ttl || 300000
      );
    }
  }

  private generateCacheKey(...args: any[]): string {
    return `coaching:${Buffer.from(JSON.stringify(args)).toString('base64')}`;
  }

  async analyzeConversationSegment(
    segment: TranscriptSegment,
    context: {
      sessionHistory: TranscriptSegment[];
      participantRoles: any[];
      currentMetrics: any;
    }
  ): Promise<{
    sentiment: string;
    intent: string;
    coachingNeeded: boolean;
    urgency: 'low' | 'medium' | 'high';
    suggestions: string[];
  }> {
    const startTime = Date.now();

    try {
      const prompt = this.buildSegmentAnalysisPrompt(segment, context);
      const response = await this.callClaude(prompt);
      const analysis = this.parseSegmentAnalysis(response);

      logger.performance('claude-segment-analysis', Date.now() - startTime, {
        segmentLength: segment.text.length,
        tokensUsed: response.usage.totalTokens
      });

      return analysis;

    } catch (error) {
      logger.error('Segment analysis failed', error as Error, {
        segmentId: segment.id,
        duration: Date.now() - startTime
      });
      
      // Return fallback analysis
      return {
        sentiment: 'neutral',
        intent: 'unknown',
        coachingNeeded: false,
        urgency: 'low',
        suggestions: []
      };
    }
  }

  async generateObjectionHandling(prompt: {
    objectionText: string;
    sessionContext: {
      leadId: string;
      participantRoles: any[];
      recentTranscript: string;
    };
  }): Promise<{
    message: string;
    suggestions: string[];
    framework: {
      acknowledge: string;
      clarify: string;
      reframe: string;
    };
  }> {
    const startTime = Date.now();

    try {
      const claudePrompt = this.buildObjectionHandlingPrompt(prompt);
      const response = await this.callClaude(claudePrompt);
      const coaching = this.parseObjectionResponse(response);

      logger.performance('claude-objection-coaching', Date.now() - startTime, {
        objectionLength: prompt.objectionText.length,
        tokensUsed: response.usage.totalTokens
      });

      return coaching;

    } catch (error) {
      logger.error('Objection coaching generation failed', error as Error);
      
      return {
        message: 'Objection detected. Use the feel-felt-found framework.',
        suggestions: [
          'I understand how you feel about that',
          'Others have felt similarly',
          'What they found was...'
        ],
        framework: {
          acknowledge: 'I understand your concern about that',
          clarify: 'Can you tell me more about what specifically concerns you?',
          reframe: 'Let me show you how we\'ve helped others with similar concerns'
        }
      };
    }
  }

  async generateCompetitorResponse(prompt: {
    competitorName: string;
    sessionContext: {
      leadId: string;
      transcript: string;
    };
  }): Promise<{
    message: string;
    suggestions: string[];
    talkingPoints: string[];
    questions: string[];
  }> {
    const startTime = Date.now();

    try {
      const claudePrompt = this.buildCompetitorResponsePrompt(prompt);
      const response = await this.callClaude(claudePrompt);
      const coaching = this.parseCompetitorResponse(response);

      logger.performance('claude-competitor-coaching', Date.now() - startTime, {
        competitor: prompt.competitorName,
        tokensUsed: response.usage.totalTokens
      });

      return coaching;

    } catch (error) {
      logger.error('Competitor coaching generation failed', error as Error);
      
      return {
        message: 'Competitor mentioned. Focus on differentiation.',
        suggestions: [
          'Ask about their experience with that solution',
          'Understand what they liked and didn\'t like',
          'Highlight our unique advantages'
        ],
        talkingPoints: [
          'Different approach to solving the problem',
          'Superior customer support',
          'Better integration capabilities'
        ],
        questions: [
          'What has your experience been with them?',
          'What made you consider other options?',
          'What\'s most important to you in a solution?'
        ]
      };
    }
  }

  async generateBuyingSignalCoaching(
    signalText: string,
    signalStrength: number,
    context: any
  ): Promise<{
    message: string;
    suggestions: string[];
    nextSteps: string[];
    urgency: 'immediate' | 'soon' | 'followup';
  }> {
    if (signalStrength > 0.8) {
      return {
        message: 'Strong buying signal! Time to advance the conversation.',
        suggestions: [
          'Ask about timeline and decision process',
          'Discuss implementation and next steps',
          'Identify other stakeholders involved'
        ],
        nextSteps: [
          'Schedule follow-up with decision makers',
          'Prepare proposal or demo',
          'Discuss pricing and terms'
        ],
        urgency: 'immediate'
      };
    } else if (signalStrength > 0.5) {
      return {
        message: 'Moderate buying interest detected.',
        suggestions: [
          'Ask qualifying questions about needs',
          'Understand their evaluation process',
          'Provide relevant case studies'
        ],
        nextSteps: [
          'Send additional information',
          'Schedule product demonstration',
          'Connect with technical team'
        ],
        urgency: 'soon'
      };
    } else {
      return {
        message: 'Weak buying signal. Continue discovery.',
        suggestions: [
          'Ask more discovery questions',
          'Understand pain points better',
          'Build value proposition'
        ],
        nextSteps: [
          'Schedule follow-up call',
          'Send educational content',
          'Nurture the relationship'
        ],
        urgency: 'followup'
      };
    }
  }

  async generateConversationInsights(prompt: {
    transcript: TranscriptSegment[];
    analysis: any;
    sessionMetadata: {
      leadId: string;
      dealId?: string;
      duration: number;
    };
  }): Promise<{
    insights: {
      overallSentiment: string;
      keyTopics: string[];
      painPoints: string[];
      buyingSignals: string[];
      objections: string[];
      nextSteps: string[];
    };
    recommendations: {
      followUpActions: string[];
      proposalFocus: string[];
      stakeholdersToEngage: string[];
    };
    summary: string;
  }> {
    const startTime = Date.now();

    try {
      const claudePrompt = this.buildInsightsPrompt(prompt);
      const response = await this.callClaude(claudePrompt);
      const insights = this.parseInsightsResponse(response);

      logger.performance('claude-conversation-insights', Date.now() - startTime, {
        transcriptLength: prompt.transcript.length,
        duration: prompt.sessionMetadata.duration,
        tokensUsed: response.usage.totalTokens
      });

      return insights;

    } catch (error) {
      logger.error('Conversation insights generation failed', error as Error);
      
      return {
        insights: {
          overallSentiment: 'neutral',
          keyTopics: ['General discussion'],
          painPoints: ['To be identified in follow-up'],
          buyingSignals: ['None detected'],
          objections: ['None raised'],
          nextSteps: ['Schedule follow-up']
        },
        recommendations: {
          followUpActions: ['Send meeting summary', 'Schedule next call'],
          proposalFocus: ['Standard value proposition'],
          stakeholdersToEngage: ['Current participants']
        },
        summary: 'Call completed with basic discussion. Follow-up needed for deeper discovery.'
      };
    }
  }

  async generateSpecificCoaching(
    session: CallSession,
    requestType: string
  ): Promise<CoachingEvent | null> {
    try {
      let coaching: any;

      switch (requestType) {
        case 'discovery_questions':
          coaching = await this.generateDiscoveryCoaching(session);
          break;
        case 'closing_techniques':
          coaching = await this.generateClosingCoaching(session);
          break;
        case 'value_proposition':
          coaching = await this.generateValuePropCoaching(session);
          break;
        case 'objection_prevention':
          coaching = await this.generateObjectionPreventionCoaching(session);
          break;
        default:
          return null;
      }

      if (coaching) {
        return {
          id: `specific-${Date.now()}`,
          timestamp: Date.now(),
          type: CoachingType.QUESTION_OPPORTUNITY,
          priority: 'medium',
          message: coaching.message,
          suggestions: coaching.suggestions,
          context: requestType,
          acknowledged: false
        };
      }

      return null;

    } catch (error) {
      logger.error('Specific coaching generation failed', error as Error, {
        sessionId: session.sessionId,
        requestType
      });
      return null;
    }
  }

  async generateGenericCoaching(
    session: CallSession,
    segment: TranscriptSegment
  ): Promise<{
    message: string;
    suggestions: string[];
  }> {
    const recentTranscript = session.transcriptBuffer
      .slice(-5)
      .map(s => s.text)
      .join(' ');

    const prompt = {
      model: this.config.model,
      messages: [{
        role: 'user',
        content: `Based on this recent conversation segment, provide helpful sales coaching:

Recent transcript: "${recentTranscript}"
Current segment: "${segment.text}"
Talk time ratio: ${session.currentMetrics.talkTimeRatio}
Questions asked: ${session.currentMetrics.questionCount}

Provide brief, actionable coaching in JSON format:
{
  "message": "Brief coaching message",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`
      }],
      maxTokens: 500,
      temperature: this.config.temperature
    };

    try {
      const response = await this.callClaude(prompt);
      return this.parseGenericCoaching(response);
    } catch (error) {
      return {
        message: 'Continue building rapport and understanding their needs.',
        suggestions: [
          'Ask open-ended questions',
          'Listen actively',
          'Summarize what you hear'
        ]
      };
    }
  }

  // Private helper methods for prompt building
  private buildSegmentAnalysisPrompt(
    segment: TranscriptSegment,
    context: any
  ): ClaudeRequest {
    return {
      model: this.config.model,
      messages: [{
        role: 'user',
        content: `Analyze this conversation segment for sales coaching insights:

SEGMENT: "${segment.text}"
SPEAKER: ${segment.speakerId}
CONFIDENCE: ${segment.confidence}

CONTEXT:
- Talk time ratio: ${context.currentMetrics?.talkTimeRatio || 0}
- Recent conversation: ${context.sessionHistory?.slice(-3).map(s => s.text).join(' ') || 'No history'}

Analyze for:
1. Sentiment (positive/neutral/negative)
2. Intent (discovery/objection/buying_signal/general)
3. Whether coaching is needed
4. Urgency level
5. Specific suggestions

Return JSON: {"sentiment": "", "intent": "", "coachingNeeded": bool, "urgency": "", "suggestions": []}`
      }],
      maxTokens: 800,
      temperature: this.config.temperature
    };
  }

  private buildObjectionHandlingPrompt(prompt: any): ClaudeRequest {
    return {
      model: this.config.model,
      messages: [{
        role: 'user',
        content: `The prospect raised this objection: "${prompt.objectionText}"

Context:
- Recent conversation: ${prompt.sessionContext.recentTranscript}
- Lead ID: ${prompt.sessionContext.leadId}

Provide a structured response framework in JSON:
{
  "message": "Brief coaching message for the rep",
  "suggestions": ["immediate response 1", "response 2", "response 3"],
  "framework": {
    "acknowledge": "How to acknowledge the concern",
    "clarify": "Clarifying question to ask",
    "reframe": "How to reframe positively"
  }
}`
      }],
      maxTokens: 1000,
      temperature: this.config.temperature
    };
  }

  private buildCompetitorResponsePrompt(prompt: any): ClaudeRequest {
    return {
      model: this.config.model,
      messages: [{
        role: 'user',
        content: `Prospect mentioned competitor: "${prompt.competitorName}"

Context: ${prompt.sessionContext.transcript}

Generate coaching for competitive positioning in JSON:
{
  "message": "Coaching message for handling competitor mention",
  "suggestions": ["response approach 1", "approach 2", "approach 3"],
  "talkingPoints": ["differentiator 1", "differentiator 2", "differentiator 3"],
  "questions": ["discovery question 1", "question 2", "question 3"]
}`
      }],
      maxTokens: 1000,
      temperature: this.config.temperature
    };
  }

  private buildInsightsPrompt(prompt: any): ClaudeRequest {
    const transcriptText = prompt.transcript
      .map(s => `[${s.speakerId}]: ${s.text}`)
      .join('\n');

    return {
      model: this.config.model,
      messages: [{
        role: 'user',
        content: `Analyze this sales conversation for insights and recommendations:

CONVERSATION TRANSCRIPT:
${transcriptText}

METADATA:
- Duration: ${Math.round(prompt.sessionMetadata.duration / 1000 / 60)} minutes
- Lead ID: ${prompt.sessionMetadata.leadId}
- Deal ID: ${prompt.sessionMetadata.dealId || 'None'}

Provide comprehensive analysis in JSON:
{
  "insights": {
    "overallSentiment": "positive/neutral/negative",
    "keyTopics": ["topic 1", "topic 2", "topic 3"],
    "painPoints": ["pain 1", "pain 2"],
    "buyingSignals": ["signal 1", "signal 2"],
    "objections": ["objection 1", "objection 2"],
    "nextSteps": ["step 1", "step 2"]
  },
  "recommendations": {
    "followUpActions": ["action 1", "action 2"],
    "proposalFocus": ["focus 1", "focus 2"],
    "stakeholdersToEngage": ["stakeholder 1", "stakeholder 2"]
  },
  "summary": "2-3 sentence executive summary"
}`
      }],
      maxTokens: 1500,
      temperature: 0.2
    };
  }

  // Coaching generators for specific scenarios
  private async generateDiscoveryCoaching(session: CallSession): Promise<any> {
    return {
      message: 'Focus on discovery questions to understand their needs better.',
      suggestions: [
        'What challenges are you facing with your current solution?',
        'What would success look like for your team?',
        'Who else would be involved in this decision?',
        'What\'s driving the urgency to find a solution now?'
      ]
    };
  }

  private async generateClosingCoaching(session: CallSession): Promise<any> {
    const buyingSignals = session.currentMetrics.buyingSignalCount;
    
    if (buyingSignals > 2) {
      return {
        message: 'Strong buying signals detected. Time to guide toward next steps.',
        suggestions: [
          'What questions do you have about moving forward?',
          'What would need to happen for you to feel confident in this solution?',
          'When would be ideal to implement this?'
        ]
      };
    } else {
      return {
        message: 'Continue building value before closing.',
        suggestions: [
          'Focus on understanding their pain points',
          'Demonstrate clear ROI',
          'Address any concerns they might have'
        ]
      };
    }
  }

  private async generateValuePropCoaching(session: CallSession): Promise<any> {
    return {
      message: 'Tailor your value proposition to their specific needs.',
      suggestions: [
        'Connect features to their stated pain points',
        'Use specific examples and case studies',
        'Quantify the benefits in their terms',
        'Focus on outcomes, not just features'
      ]
    };
  }

  private async generateObjectionPreventionCoaching(session: CallSession): Promise<any> {
    return {
      message: 'Address potential objections proactively.',
      suggestions: [
        'Acknowledge common concerns upfront',
        'Provide social proof and references',
        'Explain your implementation process',
        'Discuss ROI and value clearly'
      ]
    };
  }

  // Response parsing methods
  private parseSegmentAnalysis(response: ClaudeResponse): any {
    try {
      const content = response.content[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No JSON found in response');
    } catch (error) {
      logger.warn('Failed to parse segment analysis', { error: (error as Error).message });
      return {
        sentiment: 'neutral',
        intent: 'unknown',
        coachingNeeded: false,
        urgency: 'low',
        suggestions: []
      };
    }
  }

  private parseObjectionResponse(response: ClaudeResponse): any {
    try {
      const content = response.content[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No JSON found in response');
    } catch (error) {
      return {
        message: 'Objection detected. Handle with care.',
        suggestions: ['Listen actively', 'Ask clarifying questions', 'Provide reassurance'],
        framework: {
          acknowledge: 'I understand your concern',
          clarify: 'Can you tell me more about that?',
          reframe: 'Here\'s how we\'ve helped others with similar concerns'
        }
      };
    }
  }

  private parseCompetitorResponse(response: ClaudeResponse): any {
    try {
      const content = response.content[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No JSON found in response');
    } catch (error) {
      return {
        message: 'Competitor mentioned. Focus on differentiation.',
        suggestions: ['Ask about their experience', 'Understand decision criteria', 'Highlight unique value'],
        talkingPoints: ['Our unique approach', 'Superior support', 'Better ROI'],
        questions: ['What\'s your experience with them?', 'What\'s most important to you?', 'What challenges do you face?']
      };
    }
  }

  private parseInsightsResponse(response: ClaudeResponse): any {
    try {
      const content = response.content[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No JSON found in response');
    } catch (error) {
      return {
        insights: {
          overallSentiment: 'neutral',
          keyTopics: ['General discussion'],
          painPoints: ['To be identified'],
          buyingSignals: ['None detected'],
          objections: ['None raised'],
          nextSteps: ['Follow up']
        },
        recommendations: {
          followUpActions: ['Send summary', 'Schedule next call'],
          proposalFocus: ['Value proposition'],
          stakeholdersToEngage: ['Current participants']
        },
        summary: 'Basic conversation completed. Needs follow-up for detailed discovery.'
      };
    }
  }

  private parseGenericCoaching(response: ClaudeResponse): any {
    try {
      const content = response.content[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No JSON found in response');
    } catch (error) {
      return {
        message: 'Continue the conversation naturally.',
        suggestions: ['Ask questions', 'Listen actively', 'Build rapport']
      };
    }
  }

  // Claude API call wrapper
  private async callClaude(request: ClaudeRequest): Promise<ClaudeResponse> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        const response = await asyncTimeout(
          this.client.messages.create(request as any),
          this.config.timeout,
          'Claude coaching timeout'
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
          cacheSize: this.responseCache.size
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
    this.responseCache.clear();
    logger.info('Claude coaching tool cleaned up');
  }
}

export default ClaudeCoachingTool;