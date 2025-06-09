# Sales AI Agent Platform - Claude Reference

## Project Overview
Enterprise-grade Sales AI Agent platform using Voltagent.dev multi-agent orchestration framework. Handles complex sales workflows through intelligent agent coordination, real-time communication, and AI-powered decision making.

## Architecture
- **Framework**: Voltagent.dev multi-agent system
- **Runtime**: TypeScript/Node.js
- **Database**: PostgreSQL + Redis
- **AI**: Claude 3.5 Sonnet for all intelligent processing
- **Real-time**: WebSocket for live communication
- **Deployment**: Kubernetes with auto-scaling

## Core Agents

### 1. LeadScoringAgent (`agents/lead-scoring-agent/`)
- **Purpose**: AI-powered prospect analysis and scoring (0-100 scale)
- **Type**: DataAnalysisAgent
- **Key Features**: 50+ scoring signals, Claude insights, real-time updates
- **Performance**: <2s single lead, 1000 leads in <5min
- **Tools**: database, claude-ai, data-enrichment, scoring-calculation

### 2. ConversationAgent (`agents/conversation-agent/`)
- **Purpose**: Real-time call coaching and conversation intelligence
- **Type**: RealTimeAnalysisAgent
- **Key Features**: Live transcription, sentiment analysis, coaching suggestions
- **Performance**: <200ms audio processing, 50+ concurrent calls
- **Tools**: audio-processing, transcription, claude-coaching, websockets

### 3. EmailAgent (`agents/email-agent/`)
- **Purpose**: Intelligent email sequence automation with AI personalization
- **Type**: AutomationAgent
- **Key Features**: Multi-step sequences, response analysis, send-time optimization
- **Performance**: <15s personalization, 10k+ concurrent sequences
- **Tools**: email-service, personalization, sequence-management, response-analysis

### 4. ForecastingAgent (`agents/forecasting-agent/`)
- **Purpose**: Predictive sales analytics and pipeline intelligence
- **Type**: PredictiveAnalyticsAgent
- **Key Features**: ML models + Claude insights, deal prediction, risk assessment
- **Performance**: <30s forecast generation, 1000 deals batch processing
- **Tools**: ml-models, claude-insights, data-analysis, pipeline-intelligence

## Key Workflows

### 1. Lead Qualification (`workflows/lead-qualification.workflow.ts`)
- Trigger: `lead.created`
- Flow: Data enrichment → Scoring → Conditional routing → CRM sync
- Branching: High scores (≥80) get premium sequences, others get nurture

### 2. Real-time Coaching (`workflows/real-time-coaching.workflow.ts`)
- Trigger: `call.started`
- Flow: Session init → Live processing → Coaching coordination → Summary
- Mode: Continuous real-time streaming

### 3. Pipeline Intelligence (`workflows/pipeline-intelligence.workflow.ts`)
- Trigger: `forecast.requested`
- Flow: Data collection → Prediction → Risk analysis → Insights → Report
- Mode: Parallel aggregation

## Tool Categories

### Claude Tools (`tools/claude-tools/`)
- Lead analysis and scoring insights
- Conversation coaching generation
- Email personalization and optimization
- Deal risk assessment and forecasting insights

### Database Tools (`tools/database-tools/`)
- PostgreSQL operations with connection pooling
- Redis caching and session management
- Query optimization and data validation

### Integration Tools (`tools/integration-tools/`)
- External API integrations (Clearbit, LinkedIn, etc.)
- Email service providers (SendGrid)
- Audio processing (Deepgram)
- CRM synchronization

## Development Commands
```bash
npm run dev          # Development with hot reload
npm run build        # Production build
npm run test         # Run test suite
npm run lint         # Code linting
npm run deploy:dev   # Deploy to development
npm run deploy:prod  # Deploy to production
```

## Performance Requirements
- **Lead Scoring**: <2s single, <5min for 1000 leads
- **Conversation**: <200ms audio processing, <500ms coaching
- **Email**: <15s personalization, <100ms delivery decisions
- **Forecasting**: <30s generation, <60s data collection

## Scaling Configuration
- **Auto-scaling**: Based on queue depth and resource utilization
- **Lead Agent**: 2-10 replicas, 70% CPU target
- **Conversation Agent**: 3-20 replicas, 50 connections per replica
- **Email Agent**: 2-8 replicas, queue-based scaling
- **Forecasting Agent**: 1-5 replicas, schedule-based

## Environment Variables
Key variables: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `REDIS_URL`, `SENDGRID_API_KEY`
See `.env.example` for complete list.

## Testing Strategy
- Unit tests for individual agent logic
- Integration tests for agent coordination
- End-to-end tests for complete workflows
- Performance tests for scaling validation

## Monitoring & Alerts
- Prometheus metrics collection
- Grafana dashboards for visualization
- Custom Voltagent agent performance metrics
- Business KPI tracking and alerting

## Security
- JWT authentication for API access
- RBAC for agent permissions
- Network policies for inter-agent communication
- Secrets management with Vault integration
- Encryption for sensitive data

## Common Issues & Solutions
1. **Agent timeout**: Check resource limits and scaling policies
2. **Claude rate limits**: Implement proper caching and retry logic
3. **Database connection**: Verify connection pool configuration
4. **Real-time latency**: Optimize audio processing and WebSocket handling

## File Structure
```
src/
├── agents/           # Individual agent implementations
├── tools/            # Shared tools and integrations
├── workflows/        # Multi-agent workflow orchestration
├── shared/           # Common types and utilities
└── config/           # Configuration management
```

## Next Development Priorities
1. Complete agent implementations with full Claude integration
2. Implement robust error handling and retry mechanisms
3. Add comprehensive monitoring and alerting
4. Optimize performance for high-throughput scenarios
5. Enhance security and compliance features