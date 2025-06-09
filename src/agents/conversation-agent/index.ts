// Conversation Agent - Real-time call coaching and conversation intelligence

import { Agent, AgentConfig, AgentEvent } from '@voltagent/core';
import { WebSocket } from 'ws';
import { logger, LogPerformance } from '@/shared/utils/logger';
import { 
  ConversationSession, 
  TranscriptSegment, 
  CoachingEvent, 
  CoachingType,
  Priority,
  SentimentLevel,
  ParticipantRole
} from '@/shared/types';
import { AudioProcessingTool } from './tools/audio-processing.tool';
import { TranscriptionTool } from './tools/transcription.tool';
import { ClaudeCoachingTool } from './tools/claude-coaching.tool';
import { WebSocketTool } from './tools/websocket.tool';
import { ConversationAnalyticsTool } from './tools/analytics.tool';
import { SessionManager } from './utils/session-manager';
import { CoachingRules } from './utils/coaching-rules';
import { PerformanceMetrics } from './utils/performance-metrics';

export interface ConversationConfig extends AgentConfig {
  audioProcessing: {
    sampleRate: number;
    channels: 'mono' | 'stereo';
    chunkSize: number;
    qualityEnhancement: boolean;
    noiseReduction: boolean;
  };
  transcription: {
    provider: 'deepgram' | 'whisper' | 'azure';
    model: string;
    language: string;
    realTime: boolean;
    speakerDiarization: boolean;
    confidenceThreshold: number;
  };
  coaching: {
    enableRealTimeCoaching: boolean;
    maxSuggestionsPerMinute: number;
    priorityThresholds: {
      urgent: number;
      high: number;
      medium: number;
    };
    coachingTypes: CoachingType[];
  };
  performance: {
    maxConcurrentSessions: number;
    audioLatencyTarget: number;
    coachingLatencyTarget: number;
    sessionTimeout: number;
  };
}

export interface CallSession {
  sessionId: string;
  callId?: string;
  leadId: string;
  dealId?: string;
  participants: Array<{
    id: string;
    name: string;
    role: ParticipantRole;
    speakerId: string;
  }>;
  startTime: Date;
  audioStream?: WebSocket;
  transcriptBuffer: TranscriptSegment[];
  coachingHistory: CoachingEvent[];
  currentMetrics: {
    talkTimeRatio: number;
    sentimentTrend: number[];
    keywordMentions: string[];
    questionCount: number;
    objectionCount: number;
    buyingSignalCount: number;
  };
  status: 'initializing' | 'active' | 'paused' | 'ended';
}

export class ConversationAgent extends Agent {
  private audioProcessor: AudioProcessingTool;
  private transcription: TranscriptionTool;
  private coaching: ClaudeCoachingTool;
  private websocket: WebSocketTool;
  private analytics: ConversationAnalyticsTool;
  private sessionManager: SessionManager;
  private coachingRules: CoachingRules;
  private performanceMetrics: PerformanceMetrics;
  private config: ConversationConfig;
  private activeSessions: Map<string, CallSession>;

  constructor(config: ConversationConfig) {
    super(config);
    this.config = config;
    this.activeSessions = new Map();
    this.initializeTools();
    this.sessionManager = new SessionManager(config.performance);
    this.coachingRules = new CoachingRules(config.coaching);
    this.performanceMetrics = new PerformanceMetrics();
    this.setupEventHandlers();
  }

  private initializeTools(): void {
    this.audioProcessor = new AudioProcessingTool({
      supportedFormats: ['webm', 'mp3', 'wav', 'ogg'],
      sampleRate: this.config.audioProcessing.sampleRate,
      channels: this.config.audioProcessing.channels,
      chunkSize: this.config.audioProcessing.chunkSize,
      qualityEnhancement: this.config.audioProcessing.qualityEnhancement,
      noiseReduction: this.config.audioProcessing.noiseReduction
    });

    this.transcription = new TranscriptionTool({
      provider: this.config.transcription.provider,
      model: this.config.transcription.model,
      language: this.config.transcription.language,
      realTime: this.config.transcription.realTime,
      speakerDiarization: this.config.transcription.speakerDiarization,
      confidenceThreshold: this.config.transcription.confidenceThreshold
    });

    this.coaching = new ClaudeCoachingTool({
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 1000,
      temperature: 0.3,
      streamResponses: true,
      contextWindow: 'large'
    });

    this.websocket = new WebSocketTool({
      maxConnections: this.config.performance.maxConcurrentSessions,
      heartbeatInterval: 30000,
      messageCompression: true,
      authenticationRequired: true
    });

    this.analytics = new ConversationAnalyticsTool({
      sentimentAnalysis: true,
      keywordDetection: true,
      engagementScoring: true,
      performanceBenchmarking: true
    });
  }

  private setupEventHandlers(): void {
    this.on('call.started', this.handleCallStarted.bind(this));
    this.on('audio.chunk_received', this.handleAudioChunk.bind(this));
    this.on('transcription.completed', this.handleTranscription.bind(this));
    this.on('call.ended', this.handleCallEnded.bind(this));
    this.on('coaching.requested', this.handleCoachingRequest.bind(this));
  }

  @LogPerformance('initialize-coaching-session')
  async initializeCoachingSession(sessionData: {
    sessionId: string;
    callId?: string;
    leadId: string;
    dealId?: string;
    participants: Array<{
      id: string;
      name: string;
      role: ParticipantRole;
    }>;
    websocketConnection: WebSocket;
  }): Promise<CallSession> {
    const startTime = Date.now();

    try {
      logger.info('Initializing coaching session', {
        sessionId: sessionData.sessionId,
        leadId: sessionData.leadId,
        participantCount: sessionData.participants.length
      });

      // Create session object
      const session: CallSession = {
        sessionId: sessionData.sessionId,
        callId: sessionData.callId,
        leadId: sessionData.leadId,
        dealId: sessionData.dealId,
        participants: sessionData.participants.map((p, index) => ({
          ...p,
          speakerId: `speaker_${index}`
        })),
        startTime: new Date(),
        transcriptBuffer: [],
        coachingHistory: [],
        currentMetrics: {
          talkTimeRatio: 0,
          sentimentTrend: [],
          keywordMentions: [],
          questionCount: 0,
          objectionCount: 0,
          buyingSignalCount: 0
        },
        status: 'initializing'
      };

      // Setup WebSocket connection
      await this.websocket.setupSession(sessionData.sessionId, sessionData.websocketConnection);

      // Initialize audio processing pipeline
      await this.audioProcessor.initializeSession(sessionData.sessionId);

      // Store session
      this.activeSessions.set(sessionData.sessionId, session);
      this.sessionManager.addSession(session);

      // Update session status
      session.status = 'active';

      // Emit session initialization event
      await this.emit('session.initialized', {
        sessionId: sessionData.sessionId,
        leadId: sessionData.leadId,
        timestamp: new Date()
      });

      // Send initial coaching setup to client
      await this.websocket.sendCoachingTip(sessionData.sessionId, {
        type: 'session_start',
        priority: 'medium',
        message: 'Coaching session active. Best practices: Listen more than you speak, ask open-ended questions.',
        suggestions: [
          'Start with rapport building',
          'Understand their current challenges',
          'Listen for buying signals'
        ],
        context: 'session_initialization'
      });

      logger.performance('session-initialization', Date.now() - startTime, {
        sessionId: sessionData.sessionId
      });

      return session;

    } catch (error) {
      logger.error('Failed to initialize coaching session', error as Error, {
        sessionId: sessionData.sessionId
      });
      throw error;
    }
  }

  @LogPerformance('process-audio-stream')
  async processAudioStream(sessionId: string, audioChunk: Buffer): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.status !== 'active') {
      throw new Error(`No active session found: ${sessionId}`);
    }

    try {
      // Process audio chunk
      const processedAudio = await this.audioProcessor.processAudioChunk(
        sessionId,
        audioChunk
      );

      // Send to transcription service
      const transcriptionResult = await this.transcription.transcribeAudioRealTime(
        sessionId,
        processedAudio
      );

      if (transcriptionResult) {
        // Process transcription
        await this.handleTranscriptionUpdate(session, transcriptionResult);
      }

    } catch (error) {
      logger.error('Audio processing failed', error as Error, {
        sessionId,
        chunkSize: audioChunk.length
      });

      await this.websocket.notifyStatusChange(sessionId, {
        status: 'audio_processing_error',
        message: 'Temporary audio processing issue'
      });
    }
  }

  private async handleTranscriptionUpdate(
    session: CallSession,
    transcription: {
      text: string;
      speakerId: string;
      confidence: number;
      timestamp: number;
      isFinal: boolean;
    }
  ): Promise<void> {
    const segment: TranscriptSegment = {
      id: `${session.sessionId}-${Date.now()}`,
      timestamp: transcription.timestamp,
      speakerId: transcription.speakerId,
      text: transcription.text,
      confidence: transcription.confidence,
      sentiment: SentimentLevel.NEUTRAL, // Will be updated by analytics
      keywords: [],
      intent: undefined
    };

    // Add to transcript buffer
    session.transcriptBuffer.push(segment);

    // Send live transcript update
    await this.websocket.updateLiveTranscript(session.sessionId, segment);

    // Only process final transcriptions for coaching
    if (transcription.isFinal) {
      await this.processTranscriptionForCoaching(session, segment);
    }

    // Keep buffer manageable
    if (session.transcriptBuffer.length > 100) {
      session.transcriptBuffer = session.transcriptBuffer.slice(-50);
    }
  }

  private async processTranscriptionForCoaching(
    session: CallSession,
    segment: TranscriptSegment
  ): Promise<void> {
    try {
      // Analyze sentiment and extract insights
      const analysis = await this.analytics.analyzeSegment(segment, {
        sessionHistory: session.transcriptBuffer.slice(-10),
        participantRoles: session.participants
      });

      // Update segment with analysis
      segment.sentiment = analysis.sentiment;
      segment.keywords = analysis.keywords;
      segment.intent = analysis.intent;

      // Update session metrics
      this.updateSessionMetrics(session, segment, analysis);

      // Check for coaching triggers
      const coachingTriggers = this.coachingRules.evaluateTriggers(
        session,
        segment,
        analysis
      );

      // Generate and send coaching suggestions
      for (const trigger of coachingTriggers) {
        await this.generateAndSendCoaching(session, trigger, segment);
      }

      // Emit events for detected patterns
      await this.emitConversationEvents(session, segment, analysis);

    } catch (error) {
      logger.error('Transcription coaching analysis failed', error as Error, {
        sessionId: session.sessionId,
        segmentId: segment.id
      });
    }
  }

  private updateSessionMetrics(session: CallSession, segment: TranscriptSegment, analysis: any): void {
    const isRep = this.isFromSalesRep(segment.speakerId, session.participants);
    const now = Date.now();

    // Update talk time ratio
    if (isRep) {
      session.currentMetrics.talkTimeRatio = this.calculateTalkTimeRatio(session);
    }

    // Update sentiment trend
    session.currentMetrics.sentimentTrend.push(this.sentimentToNumber(segment.sentiment));
    if (session.currentMetrics.sentimentTrend.length > 20) {
      session.currentMetrics.sentimentTrend.shift();
    }

    // Update keyword mentions
    session.currentMetrics.keywordMentions.push(...segment.keywords);

    // Update question count
    if (analysis.hasQuestion && isRep) {
      session.currentMetrics.questionCount++;
    }

    // Update objection count
    if (analysis.hasObjection && !isRep) {
      session.currentMetrics.objectionCount++;
    }

    // Update buying signal count
    if (analysis.hasBuyingSignal && !isRep) {
      session.currentMetrics.buyingSignalCount++;
    }
  }

  private async generateAndSendCoaching(
    session: CallSession,
    trigger: { type: CoachingType; priority: Priority; context: any },
    segment: TranscriptSegment
  ): Promise<void> {
    try {
      // Check rate limiting
      if (!this.shouldSendCoaching(session, trigger)) {
        return;
      }

      let coachingSuggestion: any;

      // Generate appropriate coaching based on trigger type
      switch (trigger.type) {
        case CoachingType.TALK_TIME:
          coachingSuggestion = await this.generateTalkTimeCoaching(session, trigger.context);
          break;
        case CoachingType.OBJECTION_HANDLING:
          coachingSuggestion = await this.generateObjectionCoaching(session, segment, trigger.context);
          break;
        case CoachingType.BUYING_SIGNAL:
          coachingSuggestion = await this.generateBuyingSignalCoaching(session, segment, trigger.context);
          break;
        case CoachingType.COMPETITOR_MENTION:
          coachingSuggestion = await this.generateCompetitorCoaching(session, segment, trigger.context);
          break;
        case CoachingType.QUESTION_OPPORTUNITY:
          coachingSuggestion = await this.generateQuestionCoaching(session, trigger.context);
          break;
        default:
          coachingSuggestion = await this.coaching.generateGenericCoaching(session, segment);
      }

      if (coachingSuggestion) {
        const coachingEvent: CoachingEvent = {
          id: `coaching-${Date.now()}`,
          timestamp: Date.now(),
          type: trigger.type,
          priority: trigger.priority,
          message: coachingSuggestion.message,
          suggestions: coachingSuggestion.suggestions || [],
          context: JSON.stringify(trigger.context),
          acknowledged: false
        };

        // Store coaching event
        session.coachingHistory.push(coachingEvent);

        // Send to client
        await this.websocket.sendCoachingTip(session.sessionId, coachingEvent);

        // Emit coaching event
        await this.emit('coaching.suggestion_generated', {
          sessionId: session.sessionId,
          coachingEvent,
          timestamp: new Date()
        });

        logger.info('Coaching suggestion sent', {
          sessionId: session.sessionId,
          type: trigger.type,
          priority: trigger.priority
        });
      }

    } catch (error) {
      logger.error('Failed to generate coaching suggestion', error as Error, {
        sessionId: session.sessionId,
        triggerType: trigger.type
      });
    }
  }

  private async generateTalkTimeCoaching(session: CallSession, context: any): Promise<any> {
    return {
      message: "You're talking too much. Ask an open-ended question to engage the prospect.",
      suggestions: [
        "What's your biggest challenge with [current topic]?",
        "How are you handling this currently?",
        "What would success look like for you?"
      ]
    };
  }

  private async generateObjectionCoaching(session: CallSession, segment: TranscriptSegment, context: any): Promise<any> {
    const objectionText = segment.text;
    
    const prompt = {
      objectionText,
      sessionContext: {
        leadId: session.leadId,
        participantRoles: session.participants,
        recentTranscript: session.transcriptBuffer.slice(-5).map(s => s.text).join(' ')
      }
    };

    return await this.coaching.generateObjectionHandling(prompt);
  }

  private async generateBuyingSignalCoaching(session: CallSession, segment: TranscriptSegment, context: any): Promise<any> {
    return {
      message: "Strong buying signal detected! This is a great opportunity to advance the conversation.",
      suggestions: [
        "Ask about their timeline and decision process",
        "Discuss next steps and implementation",
        "Introduce additional stakeholders if needed"
      ]
    };
  }

  private async generateCompetitorCoaching(session: CallSession, segment: TranscriptSegment, context: any): Promise<any> {
    const competitorName = context.competitorMentioned;
    
    const prompt = {
      competitorName,
      sessionContext: {
        leadId: session.leadId,
        transcript: segment.text
      }
    };

    return await this.coaching.generateCompetitorResponse(prompt);
  }

  private async generateQuestionCoaching(session: CallSession, context: any): Promise<any> {
    return {
      message: "Great opportunity to ask a discovery question.",
      suggestions: [
        "What led you to look for a solution like this?",
        "What's driving the urgency for change?",
        "Who else would be involved in this decision?"
      ]
    };
  }

  private shouldSendCoaching(session: CallSession, trigger: { type: CoachingType; priority: Priority }): boolean {
    const now = Date.now();
    const recentCoaching = session.coachingHistory.filter(
      event => now - event.timestamp < 60000 // Last minute
    );

    // Rate limiting based on priority
    if (trigger.priority === 'urgent' && recentCoaching.length < 5) return true;
    if (trigger.priority === 'high' && recentCoaching.length < 3) return true;
    if (trigger.priority === 'medium' && recentCoaching.length < 2) return true;
    if (trigger.priority === 'low' && recentCoaching.length < 1) return true;

    return false;
  }

  @LogPerformance('generate-call-summary')
  async generateCallSummary(sessionId: string): Promise<ConversationSession> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    try {
      logger.info('Generating call summary', { sessionId });

      // Analyze full conversation
      const conversationAnalysis = await this.analytics.analyzeFullConversation({
        transcript: session.transcriptBuffer,
        participants: session.participants,
        metrics: session.currentMetrics,
        coachingEvents: session.coachingHistory
      });

      // Generate insights with Claude
      const aiInsights = await this.coaching.generateConversationInsights({
        transcript: session.transcriptBuffer,
        analysis: conversationAnalysis,
        sessionMetadata: {
          leadId: session.leadId,
          dealId: session.dealId,
          duration: Date.now() - session.startTime.getTime()
        }
      });

      // Create comprehensive session object
      const conversationSession: ConversationSession = {
        id: session.sessionId,
        sessionId: session.sessionId,
        callId: session.callId,
        leadId: session.leadId,
        dealId: session.dealId,
        participants: session.participants,
        startTime: session.startTime,
        endTime: new Date(),
        duration: Date.now() - session.startTime.getTime(),
        transcript: session.transcriptBuffer,
        summary: conversationAnalysis.summary,
        insights: aiInsights.insights,
        coachingEvents: session.coachingHistory,
        sentimentAnalysis: conversationAnalysis.sentimentAnalysis,
        keyMoments: conversationAnalysis.keyMoments,
        createdAt: session.startTime,
        updatedAt: new Date(),
        version: 1
      };

      // Store conversation session
      await this.sessionManager.storeConversationSession(conversationSession);

      // Emit completion event
      await this.emit('call.analysis_completed', {
        sessionId,
        conversationSession,
        timestamp: new Date()
      });

      return conversationSession;

    } catch (error) {
      logger.error('Call summary generation failed', error as Error, { sessionId });
      throw error;
    }
  }

  // Event Handlers
  private async handleCallStarted(event: AgentEvent): Promise<void> {
    const { sessionId, leadId, participants, websocketConnection } = event.payload;
    
    await this.initializeCoachingSession({
      sessionId,
      leadId,
      participants,
      websocketConnection
    });
  }

  private async handleAudioChunk(event: AgentEvent): Promise<void> {
    const { sessionId, audioData } = event.payload;
    
    await this.processAudioStream(sessionId, Buffer.from(audioData));
  }

  private async handleTranscription(event: AgentEvent): Promise<void> {
    const { sessionId, transcription } = event.payload;
    const session = this.activeSessions.get(sessionId);
    
    if (session) {
      await this.handleTranscriptionUpdate(session, transcription);
    }
  }

  private async handleCallEnded(event: AgentEvent): Promise<void> {
    const { sessionId } = event.payload;
    
    try {
      // Generate final summary
      const conversationSession = await this.generateCallSummary(sessionId);
      
      // Cleanup session
      await this.cleanupSession(sessionId);
      
      logger.info('Call session ended and cleaned up', { sessionId });
      
    } catch (error) {
      logger.error('Error handling call end', error as Error, { sessionId });
    }
  }

  private async handleCoachingRequest(event: AgentEvent): Promise<void> {
    const { sessionId, requestType } = event.payload;
    const session = this.activeSessions.get(sessionId);
    
    if (session) {
      // Generate specific coaching based on request
      const coaching = await this.coaching.generateSpecificCoaching(session, requestType);
      
      if (coaching) {
        await this.websocket.sendCoachingTip(sessionId, coaching);
      }
    }
  }

  // Helper methods
  private isFromSalesRep(speakerId: string, participants: any[]): boolean {
    const participant = participants.find(p => p.speakerId === speakerId);
    return participant?.role === ParticipantRole.SALES_REP;
  }

  private calculateTalkTimeRatio(session: CallSession): number {
    const repSegments = session.transcriptBuffer.filter(s => 
      this.isFromSalesRep(s.speakerId, session.participants)
    );
    
    const totalSegments = session.transcriptBuffer.length;
    return totalSegments > 0 ? repSegments.length / totalSegments : 0;
  }

  private sentimentToNumber(sentiment: SentimentLevel): number {
    switch (sentiment) {
      case SentimentLevel.VERY_POSITIVE: return 1.0;
      case SentimentLevel.POSITIVE: return 0.5;
      case SentimentLevel.NEUTRAL: return 0.0;
      case SentimentLevel.NEGATIVE: return -0.5;
      case SentimentLevel.VERY_NEGATIVE: return -1.0;
      default: return 0.0;
    }
  }

  private async emitConversationEvents(session: CallSession, segment: TranscriptSegment, analysis: any): Promise<void> {
    // Sentiment change events
    if (analysis.sentimentChanged) {
      await this.emit('sentiment.changed', {
        sessionId: session.sessionId,
        oldSentiment: analysis.previousSentiment,
        newSentiment: segment.sentiment,
        timestamp: new Date()
      });
    }

    // Objection detection events
    if (analysis.hasObjection) {
      await this.emit('objection.detected', {
        sessionId: session.sessionId,
        objectionText: segment.text,
        speakerId: segment.speakerId,
        timestamp: new Date()
      });
    }

    // Buying signal events
    if (analysis.hasBuyingSignal) {
      await this.emit('buying_signal.detected', {
        sessionId: session.sessionId,
        signalText: segment.text,
        signalStrength: analysis.buyingSignalStrength,
        timestamp: new Date()
      });
    }
  }

  private async cleanupSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      // Close WebSocket connection
      await this.websocket.closeSession(sessionId);
      
      // Cleanup audio processing
      await this.audioProcessor.cleanupSession(sessionId);
      
      // Remove from active sessions
      this.activeSessions.delete(sessionId);
      this.sessionManager.removeSession(sessionId);
      
      logger.info('Session cleaned up', { sessionId });
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; details: any }> {
    const checks = {
      audioProcessor: await this.audioProcessor.healthCheck(),
      transcription: await this.transcription.healthCheck(),
      coaching: await this.coaching.healthCheck(),
      websocket: await this.websocket.healthCheck(),
      analytics: await this.analytics.healthCheck()
    };
    
    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      details: {
        ...checks,
        activeSessions: this.activeSessions.size,
        maxSessions: this.config.performance.maxConcurrentSessions
      }
    };
  }
}

export default ConversationAgent;