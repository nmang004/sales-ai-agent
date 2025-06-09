# Robust Claude Code CLI Prompts for Sales AI Agent with Voltagent.dev

> **Production-ready prompts for building enterprise Sales AI Agent using Voltagent.dev framework and Claude Code CLI**

## 🚀 Project Initialization with Voltagent

### Master Voltagent Project Setup Prompt
```bash
claude-code init-voltagent-project \
  --framework "voltagent" \
  --project-name "sales-ai-agent" \
  --context "Build an enterprise-grade Sales AI Agent platform using Voltagent.dev's multi-agent orchestration framework. This system will handle complex sales workflows through intelligent agent coordination, real-time communication, and AI-powered decision making." \
  --architecture "
    VOLTAGENT ARCHITECTURE:
    - Multi-agent system with specialized sales agents
    - Event-driven communication between agents
    - Shared memory and context management
    - Real-time workflow orchestration
    - Scalable agent deployment and monitoring
    - Tool calling and function execution framework
    - WebSocket-based real-time updates
    
    AGENT ECOSYSTEM:
    - LeadScoringAgent: AI-powered prospect analysis
    - ConversationAgent: Real-time call coaching
    - EmailAgent: Intelligent sequence automation
    - ForecastingAgent: Predictive sales analytics
    - OrchestrationAgent: Workflow coordination
    - IntegrationAgent: External system management
    
    TECHNICAL REQUIREMENTS:
    - TypeScript/Node.js with Voltagent runtime
    - Claude API integration for all agents
    - PostgreSQL + Redis for agent state management
    - WebSocket support for real-time agent communication
    - Docker containerization for agent deployment
    - Kubernetes orchestration for scaling
    - Comprehensive monitoring and logging
  " \
  --voltagent-config "
    agents:
      - name: lead-scoring-agent
        type: data-analysis
        realtime: false
        tools: [database, claude-ai, data-enrichment]
        triggers: [lead.created, lead.updated, enrichment.completed]
        
      - name: conversation-agent
        type: real-time-analysis
        realtime: true
        tools: [audio-processing, transcription, coaching, websockets]
        triggers: [call.started, audio.received, call.ended]
        
      - name: email-agent
        type: automation
        realtime: false
        tools: [email-service, personalization, scheduling, analytics]
        triggers: [sequence.enroll, email.response, schedule.trigger]
        
      - name: forecasting-agent
        type: predictive-analytics
        realtime: false
        tools: [ml-models, data-analysis, risk-assessment]
        triggers: [deal.updated, forecast.requested, daily.analysis]
        
    workflows:
      - name: lead-to-opportunity
        agents: [lead-scoring-agent, email-agent, forecasting-agent]
        
      - name: real-time-coaching
        agents: [conversation-agent]
        realtime: true
        
      - name: pipeline-intelligence
        agents: [forecasting-agent, lead-scoring-agent]
  " \
  --output-structure "
    /agents - Individual agent implementations
      /lead-scoring-agent
      /conversation-agent
      /email-agent
      /forecasting-agent
    /tools - Shared tools and integrations
      /claude-tools
      /database-tools
      /integration-tools
    /workflows - Multi-agent workflows
    /shared - Shared types and utilities
    /config - Voltagent configuration
    /tests - Agent and workflow tests
    /deploy - Deployment configurations
  " \
  --include-monitoring \
  --include-scaling \
  --include-security
```

---

## 🎯 Lead Scoring Agent with Voltagent

### Comprehensive Lead Scoring Agent Prompt
```bash
claude-code generate voltagent-agent \
  --agent-name "LeadScoringAgent" \
  --framework "voltagent" \
  --agent-type "intelligent-data-processor" \
  --context "Create a sophisticated lead scoring agent using Voltagent framework that analyzes prospects through 50+ data signals, Claude AI insights, and real-time enrichment to predict sales success with high accuracy." \
  --voltagent-specification "
    AGENT CONFIGURATION:
    name: lead-scoring-agent
    type: DataAnalysisAgent
    category: sales-intelligence
    version: 1.0.0
    description: AI-powered lead scoring with multi-source data analysis
    
    CAPABILITIES:
    - Multi-factor lead scoring (0-100 scale)
    - Real-time score updates via agent events
    - Claude AI integration for intelligent insights
    - Batch processing for bulk lead analysis
    - Confidence scoring and explanation generation
    - Industry-specific scoring models
    - Historical trend analysis and learning
    
    AGENT TRIGGERS:
    - lead.created: Score new leads immediately
    - lead.updated: Re-score on data changes
    - enrichment.completed: Update scores with new data
    - scoring.batch_requested: Process bulk scoring jobs
    - scoring.model_updated: Refresh all scores with new model
    
    AGENT EVENTS EMITTED:
    - lead.scored: When lead scoring completes
    - lead.high_value_detected: For leads scoring >90
    - scoring.batch_completed: When bulk processing finishes
    - scoring.error: When scoring fails
    - insights.generated: When Claude analysis completes
  " \
  --tools-configuration "
    VOLTAGENT TOOLS:
    
    claude-ai-tool:
      type: ai-integration
      config:
        model: claude-3-5-sonnet-20241022
        max_tokens: 2000
        temperature: 0.3
        caching: true
        rate_limiting: true
      functions:
        - analyze_lead_quality
        - generate_insights
        - explain_score_factors
        - identify_personalization_opportunities
        - assess_timing_factors
    
    database-tool:
      type: data-access
      config:
        primary: postgresql
        cache: redis
        connection_pool: 10
        query_timeout: 5000
      functions:
        - get_lead_data
        - get_company_data
        - get_activity_history
        - store_score_results
        - update_lead_metadata
    
    enrichment-tool:
      type: external-integration
      config:
        providers:
          clearbit:
            api_key: ${CLEARBIT_API_KEY}
            rate_limit: 100/hour
          linkedin:
            api_key: ${LINKEDIN_API_KEY}
            rate_limit: 500/day
          news_api:
            api_key: ${NEWS_API_KEY}
            rate_limit: 1000/day
      functions:
        - enrich_company_data
        - enrich_contact_data
        - get_trigger_events
        - validate_contact_info
    
    scoring-calculation-tool:
      type: computational
      config:
        ml_models_path: ./models
        cache_results: true
        parallel_processing: true
      functions:
        - calculate_weighted_score
        - generate_confidence_metrics
        - compare_to_benchmarks
        - identify_score_factors
  " \
  --agent-logic "
    AGENT PROCESSING FLOW:
    
    1. INPUT VALIDATION:
       - Validate lead ID and trigger type
       - Check agent permissions and rate limits
       - Verify data availability and quality
    
    2. DATA GATHERING:
       - Retrieve lead and company data from database
       - Fetch recent activity and engagement history
       - Get enrichment data or trigger enrichment if needed
       - Collect industry benchmarks and historical data
    
    3. FEATURE EXTRACTION:
       - Extract 50+ scoring signals from raw data
       - Calculate engagement metrics and trends
       - Identify technology stack compatibility
       - Assess company growth indicators
       - Analyze decision maker accessibility
    
    4. AI ANALYSIS:
       - Send structured data to Claude for intelligent analysis
       - Generate natural language insights and explanations
       - Identify key strengths and risk factors
       - Suggest personalization opportunities
       - Recommend next best actions
    
    5. SCORE CALCULATION:
       - Apply weighted scoring algorithm
       - Calculate confidence intervals
       - Generate detailed score breakdown
       - Compare against industry benchmarks
       - Assess score trend and trajectory
    
    6. RESULT STORAGE & NOTIFICATION:
       - Store score results in database with timestamp
       - Cache key metrics in Redis for fast access
       - Emit appropriate Voltagent events
       - Trigger downstream workflows if needed
       - Log performance metrics and errors
  " \
  --scoring-factors "
    COMPREHENSIVE SCORING FACTORS (50+ signals):
    
    COMPANY FIRMOGRAPHICS (Weight: 25%):
    - Company size (employee count)
    - Annual revenue and growth rate
    - Industry and market segment
    - Geographic location and expansion
    - Funding stage and investor backing
    - Public/private status
    - Years in business and stability
    
    TECHNOLOGY FIT (Weight: 20%):
    - Current technology stack compatibility
    - IT infrastructure maturity
    - Integration requirements complexity
    - Technical decision maker accessibility
    - Implementation timeline feasibility
    - Budget allocation for technology
    
    ENGAGEMENT SIGNALS (Weight: 20%):
    - Website visit frequency and depth
    - Content consumption patterns
    - Email engagement rates
    - Social media interactions
    - Event attendance and participation
    - Demo requests and product inquiries
    - Response rates to outreach
    
    TIMING FACTORS (Weight: 15%):
    - Budget cycle alignment
    - Current contract expiration dates
    - Business initiative timing
    - Market conditions and trends
    - Competitive pressure indicators
    - Regulatory or compliance drivers
    
    DECISION MAKER ACCESS (Weight: 10%):
    - Contact level and authority
    - Stakeholder mapping completeness
    - Champion identification and strength
    - Decision making process clarity
    - Influence network mapping
    - Previous vendor relationships
    
    INTENT SIGNALS (Weight: 10%):
    - Search behavior and keywords
    - Competitor research activity
    - Pricing page visits
    - ROI calculator usage
    - Feature comparison activities
    - Case study consumption
  " \
  --claude-integration "
    CLAUDE AI INTEGRATION PATTERNS:
    
    lead_analysis_prompt:
      context: 'Analyze this sales lead for quality and potential'
      input_structure:
        lead_data: object
        company_data: object
        scoring_factors: object
        industry_benchmarks: object
      output_format:
        overall_assessment: string
        key_strengths: array
        risk_factors: array
        buying_likelihood: number
        personalization_opportunities: array
        recommended_actions: array
        confidence_score: number
      
    insight_generation_prompt:
      context: 'Generate actionable sales insights from lead analysis'
      input_structure:
        lead_profile: object
        score_breakdown: object
        historical_data: object
      output_format:
        primary_insights: array
        conversation_starters: array
        pain_points_identified: array
        value_proposition_angles: array
        timing_recommendations: object
        competitive_considerations: array
    
    score_explanation_prompt:
      context: 'Explain lead score in natural language for sales reps'
      input_structure:
        final_score: number
        factor_breakdown: object
        benchmark_comparison: object
      output_format:
        executive_summary: string
        score_justification: string
        improvement_opportunities: array
        key_talking_points: array
  " \
  --error-handling "
    COMPREHENSIVE ERROR HANDLING:
    
    - Agent-level error recovery with exponential backoff
    - Circuit breaker patterns for external API failures
    - Graceful degradation when enrichment services fail
    - Automatic retry logic for transient failures
    - Dead letter queue for failed scoring requests
    - Comprehensive error logging and alerting
    - Fallback scoring models when AI services unavailable
    - Data validation and sanitization at all entry points
  " \
  --performance-requirements "
    PERFORMANCE SPECIFICATIONS:
    
    - Single lead scoring: <2 seconds end-to-end
    - Batch scoring: 1000 leads in <5 minutes
    - Real-time score updates: <500ms after data change
    - Claude API response caching: 1-hour TTL
    - Database query optimization: <100ms average
    - Memory usage: <512MB per agent instance
    - CPU usage: <50% under normal load
    - Concurrent request handling: 100+ simultaneous
  " \
  --output-files "
    agents/lead-scoring-agent/
      index.ts - Main agent implementation
      config.yml - Agent configuration
      tools/
        claude-ai.tool.ts - Claude integration tool
        database.tool.ts - Database operations tool
        enrichment.tool.ts - Data enrichment tool
        scoring.tool.ts - Score calculation tool
      types/
        lead-data.types.ts - TypeScript interfaces
        scoring.types.ts - Scoring-specific types
      utils/
        scoring-algorithms.ts - Scoring calculation utilities
        data-validation.ts - Input validation functions
      tests/
        agent.test.ts - Agent behavior tests
        tools.test.ts - Tool integration tests
        scoring.test.ts - Scoring algorithm tests
  " \
  --include-monitoring \
  --include-testing \
  --include-documentation
```

---

## 🎙️ Real-Time Conversation Agent

### Conversation Intelligence Agent Prompt
```bash
claude-code generate voltagent-agent \
  --agent-name "ConversationAgent" \
  --framework "voltagent" \
  --agent-type "real-time-processor" \
  --context "Build a real-time conversation intelligence agent using Voltagent that provides live coaching during sales calls through audio analysis, sentiment tracking, and AI-powered suggestions." \
  --voltagent-specification "
    AGENT CONFIGURATION:
    name: conversation-agent
    type: RealTimeAnalysisAgent
    category: conversation-intelligence
    version: 1.0.0
    realtime: true
    description: Live conversation analysis and coaching for sales calls
    
    REAL-TIME CAPABILITIES:
    - Live audio stream processing
    - Real-time transcription and analysis
    - Instant coaching suggestion generation
    - WebSocket-based live updates
    - Sub-second response times
    - Concurrent call handling (50+ simultaneous)
    - Stream buffering and quality optimization
    
    AGENT TRIGGERS:
    - call.started: Initialize conversation session
    - audio.chunk_received: Process real-time audio
    - transcription.completed: Analyze speech segment
    - call.ended: Generate final analysis
    - coaching.requested: Provide specific guidance
    
    AGENT EVENTS EMITTED:
    - transcription.live_update: Real-time transcript
    - coaching.suggestion_generated: Live coaching tip
    - sentiment.changed: Sentiment shift detected
    - objection.detected: Sales objection identified
    - buying_signal.detected: Interest signal found
    - call.analysis_completed: Final call summary
  " \
  --tools-configuration "
    VOLTAGENT TOOLS:
    
    audio-processing-tool:
      type: media-processor
      config:
        supported_formats: [webm, mp3, wav, ogg]
        sample_rate: 16000
        channels: mono
        chunk_size: 3000ms
        quality_enhancement: true
        noise_reduction: true
      functions:
        - process_audio_chunk
        - enhance_audio_quality
        - detect_speaker_segments
        - extract_audio_features
    
    transcription-tool:
      type: ai-service
      config:
        provider: deepgram
        model: nova-2
        language: en-US
        real_time: true
        speaker_diarization: true
        punctuation: true
        confidence_threshold: 0.7
      functions:
        - transcribe_audio_real_time
        - identify_speakers
        - detect_speech_patterns
        - calculate_confidence_scores
    
    claude-coaching-tool:
      type: ai-integration
      config:
        model: claude-3-5-sonnet-20241022
        max_tokens: 1000
        temperature: 0.3
        stream_responses: true
        context_window: large
      functions:
        - analyze_conversation_segment
        - generate_coaching_suggestions
        - detect_objections_and_responses
        - assess_talk_time_balance
        - identify_question_opportunities
    
    websocket-tool:
      type: real-time-communication
      config:
        max_connections: 1000
        heartbeat_interval: 30000
        message_compression: true
        authentication_required: true
      functions:
        - broadcast_to_session
        - send_coaching_tip
        - update_live_transcript
        - notify_status_change
    
    conversation-analytics-tool:
      type: analytics-processor
      config:
        sentiment_analysis: true
        keyword_detection: true
        engagement_scoring: true
        performance_benchmarking: true
      functions:
        - calculate_talk_time_ratio
        - analyze_sentiment_trends
        - detect_conversation_patterns
        - score_conversation_quality
  " \
  --real-time-processing "
    REAL-TIME PROCESSING PIPELINE:
    
    1. AUDIO STREAM INGESTION:
       - Accept WebSocket audio chunks from client
       - Validate audio format and quality
       - Buffer chunks for optimal processing
       - Handle network interruptions gracefully
       - Maintain session state across connections
    
    2. LIVE TRANSCRIPTION:
       - Process audio chunks in real-time
       - Generate incremental transcription updates
       - Identify speaker changes and segments
       - Calculate transcription confidence scores
       - Handle overlapping speech and interruptions
    
    3. INSTANT ANALYSIS:
       - Analyze each speech segment immediately
       - Detect sentiment changes and patterns
       - Identify objections, questions, and buying signals
       - Calculate running conversation metrics
       - Track talk-time ratios and engagement
    
    4. COACHING GENERATION:
       - Generate contextual coaching suggestions
       - Prioritize suggestions by urgency and impact
       - Avoid overwhelming with too many suggestions
       - Personalize coaching based on rep performance
       - Provide specific, actionable recommendations
    
    5. LIVE BROADCAST:
       - Send real-time updates via WebSocket
       - Optimize message size and frequency
       - Handle client disconnections and reconnections
       - Maintain message ordering and delivery
       - Provide typing indicators and status updates
  " \
  --coaching-intelligence "
    INTELLIGENT COACHING SYSTEM:
    
    COACHING TRIGGER CONDITIONS:
    - Talk time ratio exceeds 70%
    - Sentiment drops below neutral
    - Objection detected in prospect speech
    - Competitor mentioned by prospect
    - Buying signal identified
    - Long silence periods (>10 seconds)
    - Missed question opportunities
    - Weak value proposition delivery
    
    COACHING SUGGESTION TYPES:
    
    talk_time_coaching:
      trigger: talk_time_ratio > 0.7
      priority: high
      message: 'You\'re talking too much. Ask an open-ended question.'
      action_suggestions:
        - 'What\'s your biggest challenge with [topic]?'
        - 'How are you handling this currently?'
        - 'What would success look like for you?'
    
    objection_handling:
      trigger: objection_detected
      priority: urgent
      message: 'Objection detected. Handle carefully.'
      claude_prompt: |
        The prospect just raised this concern: '{objection_text}'
        Provide a specific response framework:
        1. Acknowledge their concern
        2. Ask a clarifying question
        3. Reframe with value proposition
        
    buying_signal_coaching:
      trigger: buying_signal_detected
      priority: high
      message: 'Strong buying signal detected!'
      action_suggestions:
        - 'Ask about timeline and decision process'
        - 'Discuss next steps and implementation'
        - 'Introduce additional stakeholders'
    
    competitor_mention:
      trigger: competitor_mentioned
      priority: medium
      message: 'Competitor mentioned. Use battlecard.'
      claude_prompt: |
        Prospect mentioned competitor: '{competitor_name}'
        Generate talking points for differentiation:
        1. Acknowledge their consideration
        2. Ask about their experience/concerns
        3. Highlight our unique advantages
  " \
  --performance-optimization "
    PERFORMANCE OPTIMIZATIONS:
    
    - Audio chunk processing: <200ms latency
    - Coaching suggestion generation: <500ms
    - WebSocket message delivery: <100ms
    - Concurrent session handling: 50+ calls
    - Memory usage per session: <100MB
    - CPU usage optimization with worker threads
    - Intelligent caching of coaching responses
    - Batch processing for non-urgent analysis
  " \
  --output-files "
    agents/conversation-agent/
      index.ts - Main real-time agent
      config.yml - Agent configuration
      processors/
        audio-processor.ts - Audio handling
        transcription-processor.ts - Speech-to-text
        coaching-processor.ts - AI coaching engine
      tools/
        audio-processing.tool.ts - Audio manipulation
        transcription.tool.ts - Speech recognition
        claude-coaching.tool.ts - AI coaching
        websocket.tool.ts - Real-time communication
        analytics.tool.ts - Conversation analysis
      types/
        conversation.types.ts - Conversation interfaces
        coaching.types.ts - Coaching data types
        audio.types.ts - Audio processing types
      utils/
        session-manager.ts - Session state management
        coaching-rules.ts - Coaching logic rules
        performance-metrics.ts - Performance tracking
      tests/
        real-time-processing.test.ts - Real-time tests
        coaching-generation.test.ts - Coaching tests
        websocket-communication.test.ts - Socket tests
  "
```

---

## 📧 Email Automation Agent

### Intelligent Email Agent Prompt
```bash
claude-code generate voltagent-agent \
  --agent-name "EmailAgent" \
  --framework "voltagent" \
  --agent-type "automation-orchestrator" \
  --context "Create a sophisticated email automation agent using Voltagent that manages multi-channel sequences, AI-powered personalization, response detection, and performance optimization." \
  --voltagent-specification "
    AGENT CONFIGURATION:
    name: email-agent
    type: AutomationAgent
    category: marketing-automation
    version: 1.0.0
    description: Intelligent email sequence automation with AI personalization
    
    AUTOMATION CAPABILITIES:
    - Multi-step email sequence orchestration
    - AI-powered content personalization
    - Response detection and routing
    - Send time optimization
    - A/B testing automation
    - Performance tracking and optimization
    - Multi-channel coordination (email, LinkedIn, SMS)
    
    AGENT TRIGGERS:
    - sequence.enroll: Enroll lead in email sequence
    - sequence.step_due: Process next sequence step
    - email.response_received: Handle email responses
    - email.bounced: Process bounce notifications
    - email.opened: Track engagement metrics
    - sequence.optimize_requested: Optimize sequence performance
    
    AGENT EVENTS EMITTED:
    - email.sent: Email successfully delivered
    - email.personalized: Content personalization completed
    - response.analyzed: Email response processed
    - sequence.completed: Lead finished sequence
    - engagement.high: High engagement detected
    - sequence.optimized: Performance improvements applied
  " \
  --tools-configuration "
    VOLTAGENT TOOLS:
    
    email-service-tool:
      type: communication-service
      config:
        provider: sendgrid
        api_key: ${SENDGRID_API_KEY}
        default_from: ${FROM_EMAIL}
        tracking_enabled: true
        bounce_handling: true
        unsubscribe_handling: true
      functions:
        - send_email
        - schedule_email
        - track_email_status
        - handle_bounces
        - manage_unsubscribes
    
    personalization-tool:
      type: ai-content-generator
      config:
        claude_model: claude-3-5-sonnet-20241022
        max_tokens: 1500
        temperature: 0.4
        caching_enabled: true
        personalization_depth: high
      functions:
        - personalize_email_content
        - generate_subject_variations
        - optimize_send_times
        - create_dynamic_content
        - analyze_engagement_patterns
    
    sequence-management-tool:
      type: workflow-orchestrator
      config:
        max_concurrent_sequences: 10000
        step_processing_delay: configurable
        retry_logic: exponential_backoff
        performance_tracking: enabled
      functions:
        - enroll_in_sequence
        - process_sequence_step
        - pause_sequence
        - branch_sequence
        - optimize_sequence_timing
    
    response-analysis-tool:
      type: ai-analyzer
      config:
        claude_model: claude-3-5-sonnet-20241022
        sentiment_analysis: true
        intent_detection: true
        auto_categorization: true
      functions:
        - analyze_email_response
        - detect_response_intent
        - categorize_responses
        - extract_meeting_requests
        - identify_objections
  " \
  --sequence-automation "
    SEQUENCE AUTOMATION LOGIC:
    
    ENROLLMENT PROCESS:
    1. Validate lead eligibility and preferences
    2. Select appropriate sequence based on lead profile
    3. Generate personalization context from lead data
    4. Schedule first email with optimal timing
    5. Set up tracking and analytics
    6. Initialize sequence state and metrics
    
    STEP PROCESSING:
    1. Check sequence conditions and branching rules
    2. Generate personalized content using Claude AI
    3. Optimize send time based on recipient patterns
    4. Execute A/B testing if configured
    5. Send email and set up tracking
    6. Schedule next step based on engagement
    7. Update sequence metrics and analytics
    
    RESPONSE HANDLING:
    1. Detect and categorize email responses
    2. Analyze response sentiment and intent
    3. Determine appropriate sequence action:
       - Pause for positive responses
       - Accelerate for high interest
       - Branch to objection handling
       - Continue with standard flow
    4. Update lead scoring and CRM data
    5. Notify sales reps of important responses
    
    OPTIMIZATION AUTOMATION:
    1. Continuously monitor sequence performance
    2. Identify underperforming steps and content
    3. Generate optimization recommendations
    4. Implement A/B testing for improvements
    5. Update sequence templates based on results
    6. Adjust timing and frequency automatically
  " \
  --personalization-engine "
    AI PERSONALIZATION SYSTEM:
    
    PERSONALIZATION LEVELS:
    
    basic_personalization:
      variables: [first_name, company_name, title]
      processing_time: <100ms
      claude_usage: minimal
      
    standard_personalization:
      variables: [name, company, industry, role, recent_activity]
      processing_time: <500ms
      claude_usage: moderate
      includes:
        - Industry-specific messaging
        - Role-appropriate language
        - Recent activity references
        
    advanced_personalization:
      variables: [full_profile, company_research, pain_points, timing_factors]
      processing_time: <2000ms
      claude_usage: extensive
      includes:
        - Company news and developments
        - Specific pain point addressing
        - Competitive landscape awareness
        - Timing and urgency factors
    
    CLAUDE PERSONALIZATION PROMPTS:
    
    email_personalization_prompt:
      context: 'Personalize this email template for a specific prospect'
      input_structure:
        template: string
        lead_data: object
        company_data: object
        context: object
      requirements:
        - Maintain core message and CTA
        - Add specific company references
        - Use industry-appropriate language
        - Include relevant pain points
        - Optimize for engagement
      output_format:
        subject: string
        body: string
        personalization_notes: array
        confidence_score: number
    
    subject_optimization_prompt:
      context: 'Generate high-performing subject line variations'
      input_structure:
        original_subject: string
        recipient_profile: object
        email_content: string
      requirements:
        - Create 5 variations
        - Optimize for open rates
        - Include personalization
        - Avoid spam triggers
        - Match content tone
      output_format:
        variations: array
        predicted_performance: object
        recommendations: string
  " \
  --performance-optimization "
    PERFORMANCE OPTIMIZATION FEATURES:
    
    SEND TIME OPTIMIZATION:
    - Analyze recipient timezone and patterns
    - Machine learning for optimal send times
    - A/B testing for timing validation
    - Industry-specific timing recommendations
    - Avoid blackout periods and holidays
    
    CONTENT OPTIMIZATION:
    - Continuous A/B testing of subject lines
    - Content length optimization
    - CTA placement and wording testing
    - Image vs text performance analysis
    - Mobile vs desktop optimization
    
    DELIVERABILITY OPTIMIZATION:
    - Monitor sender reputation scores
    - Automatic bounce and complaint handling
    - SPF, DKIM, and DMARC validation
    - Content spam score analysis
    - List hygiene and segmentation
    
    ENGAGEMENT OPTIMIZATION:
    - Real-time engagement scoring
    - Automatic re-engagement campaigns
    - Preference center management
    - Unsubscribe prediction and prevention
    - Cross-channel engagement coordination
  " \
  --response-intelligence "
    INTELLIGENT RESPONSE PROCESSING:
    
    RESPONSE CLASSIFICATION:
    
    positive_responses:
      indicators: [interested, yes, meeting, call, demo, pricing]
      actions:
        - Pause sequence immediately
        - Notify sales rep via Slack/email
        - Create meeting booking opportunity
        - Update lead score significantly
        - Log in CRM as hot lead
    
    negative_responses:
      indicators: [not_interested, no, stop, unsubscribe]
      actions:
        - Remove from sequence immediately
        - Add to suppression list
        - Update lead status to 'not qualified'
        - Respect unsubscribe requests
        - Log feedback for improvement
    
    objection_responses:
      indicators: [too_expensive, no_budget, bad_timing, using_competitor]
      actions:
        - Branch to objection handling sequence
        - Schedule follow-up for better timing
        - Provide competitor comparison content
        - Offer alternative solutions
        - Flag for sales rep attention
    
    information_requests:
      indicators: [more_info, questions, clarification, details]
      actions:
        - Send relevant resources immediately
        - Schedule educational content sequence
        - Offer demo or consultation
        - Track information consumption
        - Follow up based on engagement
    
    CLAUDE RESPONSE ANALYSIS:
    
    response_analysis_prompt:
      context: 'Analyze email response and determine next best action'
      input_structure:
        response_text: string
        original_email: string
        lead_context: object
        sequence_context: object
      analysis_categories:
        - sentiment: positive/neutral/negative
        - intent: interested/objection/info_request/not_interested
        - urgency: high/medium/low
        - buying_signals: 0-10 scale
        - objection_type: price/timing/need/authority/fit
      output_format:
        primary_intent: string
        sentiment_score: number
        recommended_action: string
        priority_level: string
        follow_up_suggestions: array
  " \
  --output-files "
    agents/email-agent/
      index.ts - Main automation agent
      config.yml - Agent configuration
      processors/
        sequence-processor.ts - Sequence orchestration
        personalization-processor.ts - Content personalization
        response-processor.ts - Response analysis
        optimization-processor.ts - Performance optimization
      tools/
        email-service.tool.ts - Email delivery
        personalization.tool.ts - AI personalization
        sequence-management.tool.ts - Sequence control
        response-analysis.tool.ts - Response processing
        performance-tracking.tool.ts - Analytics
      types/
        sequence.types.ts - Sequence data types
        email.types.ts - Email content types
        response.types.ts - Response analysis types
      utils/
        send-time-optimizer.ts - Optimal timing calculation
        content-optimizer.ts - Content improvement
        engagement-scorer.ts - Engagement analysis
      tests/
        sequence-automation.test.ts - Automation tests
        personalization.test.ts - Personalization tests
        response-handling.test.ts - Response processing tests
  "
```

---

## 📊 Forecasting & Analytics Agent

### Predictive Forecasting Agent Prompt
```bash
claude-code generate voltagent-agent \
  --agent-name "ForecastingAgent" \
  --framework "voltagent" \
  --agent-type "predictive-analytics" \
  --context "Build an advanced forecasting agent using Voltagent that combines machine learning models with Claude AI insights to predict deal outcomes, generate sales forecasts, and identify pipeline risks." \
  --voltagent-specification "
    AGENT CONFIGURATION:
    name: forecasting-agent
    type: PredictiveAnalyticsAgent
    category: business-intelligence
    version: 1.0.0
    description: AI-powered sales forecasting and pipeline intelligence
    
    PREDICTIVE CAPABILITIES:
    - Individual deal outcome prediction
    - Pipeline health assessment
    - Revenue forecasting with confidence intervals
    - Risk factor identification and mitigation
    - Win probability scoring
    - Close date prediction
    - Deal size estimation
    - Competitive threat analysis
    
    AGENT TRIGGERS:
    - deal.created: Initial deal prediction
    - deal.updated: Refresh predictions on changes
    - forecast.requested: Generate period forecast
    - pipeline.analysis_requested: Analyze pipeline health
    - risk.assessment_requested: Identify deal risks
    - model.retrain_scheduled: Update ML models
    
    AGENT EVENTS EMITTED:
    - deal.prediction_updated: New deal prediction available
    - forecast.generated: Forecast report completed
    - risk.identified: High-risk deal detected
    - opportunity.acceleration_suggested: Deal acceleration opportunity
    - pipeline.health_alert: Pipeline health concern
    - model.performance_updated: ML model metrics updated
  " \
  --tools-configuration "
    VOLTAGENT TOOLS:
    
    ml-models-tool:
      type: machine-learning
      config:
        model_storage: ./models
        frameworks: [scikit-learn, tensorflow, pytorch]
        auto_retraining: true
        cross_validation: true
        feature_importance: true
      functions:
        - predict_win_probability
        - predict_deal_size
        - predict_close_date
        - calculate_feature_importance
        - retrain_models
        - validate_model_performance
    
    claude-insights-tool:
      type: ai-analyzer
      config:
        model: claude-3-5-sonnet-20241022
        max_tokens: 2000
        temperature: 0.2
        expertise: sales_forecasting
      functions:
        - analyze_deal_risks
        - generate_forecast_insights
        - identify_acceleration_opportunities
        - assess_competitive_threats
        - recommend_next_actions
    
    data-analysis-tool:
      type: data-processor
      config:
        statistical_analysis: true
        trend_analysis: true
        correlation_analysis: true
        anomaly_detection: true
      functions:
        - extract_deal_features
        - calculate_statistical_metrics
        - identify_trends_and_patterns
        - detect_anomalies
        - generate_confidence_intervals
    
    pipeline-intelligence-tool:
      type: business-analytics
      config:
        pipeline_health_metrics: true
        forecasting_accuracy: true
        performance_benchmarking: true
      functions:
        - assess_pipeline_health
        - calculate_forecast_accuracy
        - benchmark_performance
        - identify_pipeline_gaps
        - recommend_optimizations
  " \
  --prediction-models "
    MACHINE LEARNING MODELS:
    
    WIN_PROBABILITY_MODEL:
      algorithm: GradientBoostingClassifier
      features: 45+ signals
      training_data: 3+ years historical deals
      accuracy_target: 85%+
      feature_categories:
        - deal_characteristics: [size, stage, age, discount]
        - company_firmographics: [size, industry, revenue, growth]
        - stakeholder_engagement: [contacts, meetings, email_response]
        - competitive_factors: [competitors, evaluation_criteria]
        - timing_factors: [budget_cycle, urgency, timeline]
        - conversation_intelligence: [sentiment, objections, buying_signals]
    
    DEAL_SIZE_MODEL:
      algorithm: RandomForestRegressor
      features: 35+ signals
      training_data: Won deals with accurate sizing
      accuracy_target: 80% within 20% of actual
      feature_categories:
        - company_budget_indicators: [revenue, funding, employee_count]
        - solution_scope: [modules, users, complexity]
        - competitive_positioning: [premium_vs_budget, feature_comparison]
        - negotiation_factors: [discount_requested, payment_terms]
    
    CLOSE_DATE_MODEL:
      algorithm: XGBoostRegressor
      features: 30+ signals
      training_data: Deals with accurate close dates
      accuracy_target: 75% within 30 days
      feature_categories:
        - deal_velocity: [stage_progression, activity_frequency]
        - decision_process: [stakeholders, approval_steps]
        - implementation_factors: [complexity, resource_availability]
        - timing_constraints: [budget_cycle, contract_expiration]
  " \
  --claude-analysis "
    CLAUDE AI ANALYSIS FRAMEWORK:
    
    deal_risk_analysis_prompt:
      context: 'Analyze this deal for potential risks and challenges'
      input_structure:
        deal_data: object
        stakeholder_info: object
        activity_history: object
        conversation_intelligence: object
        competitive_landscape: object
      analysis_framework:
        competitive_risks:
          - threat_level: high/medium/low
          - specific_competitors: array
          - differentiation_gaps: array
          - mitigation_strategies: array
        stakeholder_risks:
          - decision_maker_access: boolean
          - champion_strength: score
          - stakeholder_alignment: percentage
          - influence_mapping: object
        timing_risks:
          - budget_cycle_alignment: boolean
          - urgency_level: score
          - decision_timeline: assessment
          - external_factors: array
        technical_risks:
          - solution_fit: percentage
          - integration_complexity: level
          - implementation_concerns: array
          - technical_evaluation_status: string
      output_format:
        overall_risk_score: number
        primary_risks: array
        mitigation_strategies: array
        recommended_actions: array
        confidence_level: number
    
    forecast_insights_prompt:
      context: 'Generate strategic insights from sales forecast analysis'
      input_structure:
        forecast_data: object
        historical_performance: object
        pipeline_metrics: object
        team_performance: object
      insight_categories:
        pipeline_health:
          - coverage_ratio: number
          - velocity_trends: object
          - conversion_rates: object
          - stage_bottlenecks: array
        performance_patterns:
          - top_performers: array
          - improvement_opportunities: array
          - seasonal_trends: object
          - market_factors: array
        forecast_confidence:
          - accuracy_assessment: string
          - uncertainty_factors: array
          - confidence_intervals: object
          - risk_adjustments: array
      output_format:
        executive_summary: string
        key_insights: array
        action_recommendations: array
        risk_factors: array
        opportunities: array
  " \
  --forecasting-logic "
    FORECASTING PROCESSING PIPELINE:
    
    1. DATA COLLECTION AND VALIDATION:
       - Gather deal data from CRM and internal systems
       - Validate data quality and completeness
       - Enrich with conversation intelligence data
       - Collect stakeholder and activity information
       - Retrieve historical performance benchmarks
    
    2. FEATURE ENGINEERING:
       - Extract 50+ features from raw deal data
       - Calculate derived metrics and ratios
       - Apply feature scaling and normalization
       - Handle missing values with intelligent imputation
       - Create interaction features for complex patterns
    
    3. ML MODEL PREDICTIONS:
       - Generate win probability using ensemble methods
       - Predict deal size with regression models
       - Estimate close date with time series analysis
       - Calculate confidence intervals for predictions
       - Perform model validation and accuracy checking
    
    4. AI RISK ASSESSMENT:
       - Analyze deal context with Claude AI
       - Identify specific risk factors and challenges
       - Generate mitigation strategies and recommendations
       - Assess competitive threats and positioning
       - Evaluate timing and urgency factors
    
    5. INSIGHT GENERATION:
       - Combine ML predictions with AI analysis
       - Generate actionable insights and recommendations
       - Identify acceleration opportunities
       - Suggest next best actions for sales reps
       - Create executive summaries and reports
    
    6. FORECAST COMPILATION:
       - Aggregate individual deal predictions
       - Calculate portfolio-level forecasts
       - Apply risk adjustments and confidence intervals
       - Generate monthly and quarterly breakdowns
       - Create scenario analysis and sensitivity testing
  " \
  --performance-monitoring "
    MODEL PERFORMANCE MONITORING:
    
    ACCURACY TRACKING:
    - Win rate prediction accuracy (monthly)
    - Deal size prediction variance analysis
    - Close date prediction accuracy tracking
    - Confidence calibration assessment
    - Model drift detection and alerting
    
    BUSINESS IMPACT METRICS:
    - Forecast accuracy improvement over baseline
    - Sales rep adoption and usage rates
    - Decision-making speed improvements
    - Revenue impact from better predictions
    - Risk mitigation effectiveness
    
    CONTINUOUS IMPROVEMENT:
    - Automated model retraining schedules
    - Feature importance tracking and optimization
    - Hyperparameter tuning automation
    - A/B testing for model improvements
    - Feedback loop integration from sales outcomes
  " \
  --output-files "
    agents/forecasting-agent/
      index.ts - Main forecasting agent
      config.yml - Agent configuration
      models/
        win-probability.model.ts - Win prediction model
        deal-size.model.ts - Size prediction model
        close-date.model.ts - Timeline prediction model
        ensemble.model.ts - Combined model logic
      processors/
        feature-extractor.ts - Feature engineering
        prediction-processor.ts - ML predictions
        risk-analyzer.ts - Risk assessment
        insights-generator.ts - AI insights
      tools/
        ml-models.tool.ts - Machine learning operations
        claude-insights.tool.ts - AI analysis
        data-analysis.tool.ts - Statistical analysis
        pipeline-intelligence.tool.ts - Pipeline metrics
      types/
        forecast.types.ts - Forecasting data types
        prediction.types.ts - Prediction interfaces
        risk.types.ts - Risk assessment types
      utils/
        model-trainer.ts - Model training utilities
        feature-engineering.ts - Feature calculation
        performance-metrics.ts - Accuracy tracking
      tests/
        prediction-accuracy.test.ts - Model accuracy tests
        feature-engineering.test.ts - Feature tests
        risk-analysis.test.ts - Risk assessment tests
  "
```

---

## 🔄 Multi-Agent Workflow Orchestration

### Comprehensive Workflow Prompt
```bash
claude-code generate voltagent-workflow \
  --workflow-name "SalesIntelligenceOrchestrator" \
  --framework "voltagent" \
  --context "Create a sophisticated multi-agent workflow orchestrator that coordinates all sales agents to provide end-to-end sales intelligence and automation." \
  --workflow-specification "
    WORKFLOW CONFIGURATION:
    name: sales-intelligence-orchestrator
    type: OrchestrationWorkflow
    version: 1.0.0
    description: End-to-end sales process automation with AI intelligence
    
    PARTICIPATING AGENTS:
    - LeadScoringAgent: Lead qualification and scoring
    - ConversationAgent: Real-time call coaching
    - EmailAgent: Automated sequence management
    - ForecastingAgent: Predictive analytics and forecasting
    
    WORKFLOW SCENARIOS:
    - lead_qualification_flow: New lead processing
    - conversation_coaching_flow: Real-time call support
    - email_automation_flow: Sequence management
    - pipeline_intelligence_flow: Forecasting and analysis
    - deal_acceleration_flow: Opportunity optimization
  " \
  --orchestration-patterns "
    WORKFLOW ORCHESTRATION PATTERNS:
    
    SEQUENTIAL_PROCESSING:
      pattern: agent_a -> agent_b -> agent_c
      use_cases:
        - Lead scoring followed by email enrollment
        - Call analysis followed by CRM updates
        - Deal prediction followed by risk assessment
      
    PARALLEL_PROCESSING:
      pattern: agent_a + agent_b + agent_c (concurrent)
      use_cases:
        - Multi-source data enrichment
        - Real-time coaching with transcription
        - Simultaneous forecast generation
      
    CONDITIONAL_BRANCHING:
      pattern: if/then/else logic with agent routing
      use_cases:
        - High-score leads get premium sequences
        - Negative responses trigger objection handling
        - Risk alerts trigger intervention workflows
      
    EVENT_DRIVEN_COORDINATION:
      pattern: agent events trigger other agent actions
      use_cases:
        - Email responses trigger lead re-scoring
        - Call completion triggers follow-up sequences
        - Deal updates trigger forecast refresh
  " \
  --workflow-definitions "
    CORE WORKFLOW IMPLEMENTATIONS:
    
    lead_qualification_workflow:
      trigger: lead.created
      steps:
        1. data_enrichment:
           agent: LeadScoringAgent
           action: enrich_lead_data
           timeout: 30s
           
        2. scoring_analysis:
           agent: LeadScoringAgent
           action: calculate_score
           depends_on: data_enrichment
           timeout: 10s
           
        3. conditional_routing:
           condition: score >= 80
           if_true:
             - agent: EmailAgent
               action: enroll_in_premium_sequence
             - agent: ForecastingAgent
               action: create_initial_prediction
           if_false:
             - agent: EmailAgent
               action: enroll_in_nurture_sequence
               
        4. crm_sync:
           agent: IntegrationAgent
           action: update_crm_record
           parallel: true
    
    real_time_coaching_workflow:
      trigger: call.started
      mode: real_time
      steps:
        1. session_initialization:
           agent: ConversationAgent
           action: initialize_coaching_session
           timeout: 5s
           
        2. live_processing:
           agent: ConversationAgent
           action: process_audio_stream
           mode: continuous
           
        3. coaching_coordination:
           triggers:
             - objection_detected: generate_objection_coaching
             - buying_signal_detected: suggest_closing_questions
             - talk_time_exceeded: provide_talk_time_coaching
           
        4. session_completion:
           agent: ConversationAgent
           action: generate_call_summary
           post_processing:
             - update_lead_score
             - trigger_follow_up_sequence
             - update_deal_prediction
    
    email_automation_workflow:
      trigger: sequence.step_due
      steps:
        1. personalization:
           agent: EmailAgent
           action: generate_personalized_content
           timeout: 15s
           
        2. send_optimization:
           agent: EmailAgent
           action: optimize_send_time
           parallel: true
           
        3. delivery:
           agent: EmailAgent
           action: send_email
           depends_on: [personalization, send_optimization]
           
        4. tracking_setup:
           agent: EmailAgent
           action: setup_engagement_tracking
           
        5. next_step_scheduling:
           agent: EmailAgent
           action: schedule_next_step
           delay: based_on_sequence_config
    
    pipeline_intelligence_workflow:
      trigger: forecast.requested
      steps:
        1. data_collection:
           agents: [LeadScoringAgent, ConversationAgent, EmailAgent]
           action: gather_intelligence_data
           parallel: true
           timeout: 60s
           
        2. prediction_generation:
           agent: ForecastingAgent
           action: generate_deal_predictions
           depends_on: data_collection
           
        3. risk_analysis:
           agent: ForecastingAgent
           action: analyze_pipeline_risks
           parallel: true
           
        4. insight_generation:
           agent: ForecastingAgent
           action: generate_strategic_insights
           depends_on: [prediction_generation, risk_analysis]
           
        5. report_compilation:
           agent: ForecastingAgent
           action: compile_forecast_report
  " \
  --error-handling "
    COMPREHENSIVE ERROR HANDLING:
    
    AGENT_FAILURE_RECOVERY:
    - Automatic retry with exponential backoff
    - Fallback agent selection for critical operations
    - Graceful degradation when agents unavailable
    - Dead letter queue for failed workflows
    - Manual intervention triggers for critical failures
    
    WORKFLOW_RESILIENCE:
    - Checkpoint and resume capability
    - Partial completion handling
    - Timeout management with configurable limits
    - Circuit breaker patterns for external dependencies
    - Comprehensive error logging and alerting
    
    DATA_CONSISTENCY:
    - Transaction-like behavior for critical workflows
    - Rollback mechanisms for failed operations
    - Eventual consistency handling
    - Conflict resolution for concurrent updates
    - Data validation at workflow boundaries
  " \
  --monitoring "
    WORKFLOW MONITORING AND ANALYTICS:
    
    PERFORMANCE_METRICS:
    - Workflow execution time and throughput
    - Agent response times and success rates
    - Error rates and failure patterns
    - Resource utilization and bottlenecks
    - Business outcome correlation
    
    BUSINESS_METRICS:
    - Lead processing velocity
    - Conversion rate improvements
    - Sales rep productivity gains
    - Revenue impact measurements
    - Customer satisfaction scores
    
    REAL_TIME_DASHBOARDS:
    - Live workflow execution status
    - Agent health and performance
    - Queue depths and processing backlogs
    - Error rate trends and alerts
    - Business KPI tracking
  " \
  --output-files "
    workflows/
      sales-intelligence-orchestrator.ts - Main orchestrator
      lead-qualification.workflow.ts - Lead processing workflow
      real-time-coaching.workflow.ts - Coaching workflow
      email-automation.workflow.ts - Email sequence workflow
      pipeline-intelligence.workflow.ts - Forecasting workflow
    coordination/
      workflow-engine.ts - Workflow execution engine
      agent-coordinator.ts - Agent communication
      event-dispatcher.ts - Event routing
      error-handler.ts - Error recovery
    monitoring/
      workflow-monitor.ts - Performance monitoring
      business-metrics.ts - Business KPI tracking
      alerting.ts - Error and performance alerts
    tests/
      workflow-integration.test.ts - End-to-end tests
      error-recovery.test.ts - Failure scenario tests
      performance.test.ts - Load and performance tests
  "
```

---

## 🚀 Deployment & Production

### Production Deployment Prompt
```bash
claude-code generate voltagent-deployment \
  --deployment-target "aws-kubernetes" \
  --context "Create production-ready deployment configuration for Sales AI Agent platform using Voltagent framework with enterprise-grade scalability, monitoring, and security." \
  --deployment-specification "
    PRODUCTION REQUIREMENTS:
    - Kubernetes-based container orchestration
    - Auto-scaling based on agent workload
    - High availability with 99.9% uptime
    - Comprehensive monitoring and alerting
    - Security hardening and compliance
    - CI/CD pipeline integration
    - Multi-environment support (staging, production)
    
    VOLTAGENT-SPECIFIC REQUIREMENTS:
    - Agent runtime optimization
    - Inter-agent communication scaling
    - Event bus performance tuning
    - Tool and integration reliability
    - Real-time processing capabilities
    - Memory and CPU optimization per agent
  " \
  --scaling-configuration "
    AGENT SCALING POLICIES:
    
    lead-scoring-agent:
      min_replicas: 2
      max_replicas: 10
      target_cpu: 70%
      target_memory: 80%
      scale_up_threshold: queue_depth > 100
      scale_down_threshold: queue_depth < 10
      
    conversation-agent:
      min_replicas: 3
      max_replicas: 20
      target_cpu: 60%
      target_memory: 75%
      real_time: true
      connection_limit: 50_per_replica
      
    email-agent:
      min_replicas: 2
      max_replicas: 8
      target_cpu: 50%
      target_memory: 70%
      queue_based_scaling: true
      
    forecasting-agent:
      min_replicas: 1
      max_replicas: 5
      target_cpu: 80%
      target_memory: 85%
      schedule_based: true
  " \
  --monitoring-stack "
    COMPREHENSIVE MONITORING:
    
    - Prometheus for metrics collection
    - Grafana for dashboards and visualization
    - Jaeger for distributed tracing
    - ELK stack for centralized logging
    - AlertManager for intelligent alerting
    - Custom Voltagent metrics and dashboards
  " \
  --security-hardening "
    SECURITY CONFIGURATION:
    
    - Network policies for inter-agent communication
    - RBAC for Kubernetes access control
    - Secrets management with Vault integration
    - Image vulnerability scanning
    - Runtime security monitoring
    - Compliance auditing and reporting
  " \
  --output-files "
    deploy/kubernetes/
      namespace.yaml - Kubernetes namespace
      configmaps/ - Configuration management
      secrets/ - Secret management
      deployments/ - Agent deployments
      services/ - Service definitions
      ingress/ - External access configuration
      hpa/ - Horizontal pod autoscaling
      networkpolicies/ - Network security
    deploy/monitoring/
      prometheus/ - Metrics configuration
      grafana/ - Dashboard definitions
      alerting/ - Alert rules and notifications
    deploy/security/
      rbac/ - Role-based access control
      policies/ - Security policies
      vault/ - Secret management
    scripts/
      deploy.sh - Deployment automation
      rollback.sh - Rollback procedures
      health-check.sh - Health validation
  "
```

This comprehensive set of robust Claude Code CLI prompts provides everything needed to build a production-ready Sales AI Agent platform using Voltagent.dev. Each prompt is designed to generate complete, enterprise-grade implementations with proper error handling, monitoring, and scalability considerations.