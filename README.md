# Sales AI Agent Platform

> Enterprise-grade Sales AI Dashboard with Voltagent Multi-Agent Orchestration

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Material-UI](https://img.shields.io/badge/Material--UI-0081CB?style=for-the-badge&logo=material-ui&logoColor=white)](https://mui.com/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

## 🚀 Overview

A comprehensive Sales AI platform that combines intelligent agent orchestration with a modern React dashboard. Built on the Voltagent.dev framework, this system provides real-time sales intelligence, automated workflows, and AI-powered insights for enterprise sales teams.

### ✨ Key Features

- **🤖 AI Agent Orchestration**: Real-time coordination of specialized sales agents
- **📊 Intelligent Dashboard**: Modern React interface with live metrics and insights
- **🎯 Lead Scoring**: AI-powered prospect analysis with 50+ scoring signals
- **📞 Call Intelligence**: Real-time coaching with conversation analysis
- **📧 Email Automation**: Smart sequences with AI personalization
- **📈 Sales Forecasting**: Predictive analytics with risk assessment
- **📱 Mobile Support**: PWA with voice capture and business card scanning
- **🔗 LinkedIn Integration**: Browser extension for profile capture
- **🔄 CRM Sync**: Multi-platform integration (Salesforce, HubSpot, Pipedrive)

## 🏗️ Architecture

### Backend Agents (Voltagent Framework)
```
agents/
├── lead-scoring-agent/      # AI-powered prospect analysis
├── conversation-agent/      # Real-time call coaching
├── email-agent/            # Automated email sequences
└── forecasting-agent/      # Pipeline intelligence
```

### Frontend Dashboard (React TypeScript)
```
frontend/
├── src/
│   ├── components/         # Reusable UI components
│   ├── pages/             # Main application pages
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API and agent communication
│   └── types/             # TypeScript definitions
├── extensions/            # Browser extensions
└── mobile/               # Mobile-specific components
```

## 🛠️ Tech Stack

### Backend
- **Framework**: Voltagent.dev multi-agent orchestration
- **Runtime**: TypeScript/Node.js
- **Database**: PostgreSQL + Redis
- **AI**: Claude 3.5 Sonnet
- **Real-time**: WebSocket communication
- **Deployment**: Kubernetes with auto-scaling

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) v5
- **State Management**: Zustand + React Query
- **Charts**: Recharts
- **Build Tool**: Webpack 5
- **Testing**: Jest + React Testing Library
- **Mobile**: Progressive Web App (PWA)

### Integration
- **CRM**: Salesforce, HubSpot, Pipedrive
- **Email**: SendGrid, Mailgun, Amazon SES
- **Enrichment**: Clearbit, ZoomInfo, Apollo
- **Analytics**: Custom metrics + Prometheus

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Docker & Docker Compose
- Git

### 1. Clone Repository
```bash
git clone https://github.com/your-org/sales-ai-agent.git
cd sales-ai-agent
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env.local

# Configure your API keys and endpoints
nano .env.local
```

### 3. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install agent dependencies
cd agents && npm install
```

### 4. Start Development Environment
```bash
# Start all services
docker-compose up -d

# Start frontend development server
npm run dev

# Start agent services
npm run agents:dev
```

### 5. Access the Application
- **Dashboard**: http://localhost:3000
- **API**: http://localhost:8000
- **Agent Status**: http://localhost:8000/status

## 📋 Project Structure

### Core Components

| Component | Description | Lines | Status |
|-----------|-------------|-------|---------|
| **Dashboard Home** | Main dashboard with AI insights | ~400 | ✅ Complete |
| **Agent Communication** | Voltagent WebSocket service | ~300 | ✅ Complete |
| **Lead Management** | AI scoring and management | ~450 | ✅ Complete |
| **Call Intelligence** | Real-time coaching | ~400 | ✅ Complete |
| **Email Automation** | Sequence management | ~350 | ✅ Complete |
| **Forecasting** | Pipeline analytics | ~450 | ✅ Complete |
| **Mobile Quick Add** | Mobile lead capture | ~300 | ✅ Complete |
| **LinkedIn Extension** | Browser profile capture | ~500 | ✅ Complete |

### Agent Specifications

#### LeadScoringAgent
- **Purpose**: AI-powered prospect analysis (0-100 scale)
- **Performance**: <2s single lead, 1000 leads in <5min
- **Features**: 50+ scoring signals, Claude insights, real-time updates

#### ConversationAgent  
- **Purpose**: Real-time call coaching and intelligence
- **Performance**: <200ms audio processing, 50+ concurrent calls
- **Features**: Live transcription, sentiment analysis, coaching suggestions

#### EmailAgent
- **Purpose**: Intelligent email automation
- **Performance**: <15s personalization, 10k+ concurrent sequences  
- **Features**: Multi-step sequences, response analysis, send-time optimization

#### ForecastingAgent
- **Purpose**: Predictive sales analytics
- **Performance**: <30s forecast generation, 1000 deals batch processing
- **Features**: ML models + Claude insights, deal prediction, risk assessment

## 🔧 Development

### Available Scripts
```bash
# Frontend Development
npm run dev              # Start development server
npm run build            # Production build
npm run test             # Run test suite
npm run lint             # Code linting
npm run type-check       # TypeScript checking

# Agent Development  
npm run agents:dev       # Start all agents in development
npm run agents:build     # Build agents for production
npm run agents:test      # Test agent functionality

# Deployment
npm run deploy:dev       # Deploy to development
npm run deploy:prod      # Deploy to production
docker-compose up        # Start with Docker
```

### File Organization
- **Components**: Max 300 lines each
- **Pages**: Max 500 lines each
- **Services**: Max 400 lines each
- **Documentation**: Max 1500 lines per file

### Code Quality
- TypeScript strict mode enabled
- ESLint + Prettier configured
- Jest unit testing
- E2E testing with Playwright
- 80%+ test coverage requirement

## 📊 Performance Metrics

### Target Performance
- **Initial Load**: < 3s
- **Page Navigation**: < 200ms  
- **Real-time Updates**: < 100ms latency
- **Mobile Performance**: Lighthouse score > 90

### Agent Performance
- **Lead Scoring**: <2s single, <5min for 1000 leads
- **Conversation**: <200ms audio processing, <500ms coaching
- **Email**: <15s personalization, <100ms delivery decisions
- **Forecasting**: <30s generation, <60s data collection

## 🔐 Security

- JWT authentication for API access
- RBAC for agent permissions  
- Network policies for inter-agent communication
- Secrets management with Vault integration
- Encryption for sensitive data
- OWASP security guidelines compliance

## 📈 Monitoring & Analytics

### Built-in Monitoring
- Prometheus metrics collection
- Grafana dashboards for visualization
- Custom Voltagent agent performance metrics
- Business KPI tracking and alerting

### Key Metrics
- Agent response times and success rates
- User engagement and conversion metrics
- System performance and resource utilization
- Business metrics (leads, deals, revenue)

## 🚀 Deployment

### Docker Deployment
```bash
# Build and start all services
docker-compose up --build

# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment
```bash
# Apply Kubernetes manifests
kubectl apply -f kubernetes/

# Monitor deployment
kubectl get pods -n sales-ai
```

### Environment Variables
Key configuration variables:
- `ANTHROPIC_API_KEY`: Claude AI API access
- `DATABASE_URL`: PostgreSQL connection
- `REDIS_URL`: Redis cache connection
- `SENDGRID_API_KEY`: Email service integration
- `VOLTAGENT_API_URL`: Agent orchestration endpoint

## 🧪 Testing

### Test Coverage
- **Unit Tests**: Individual component and function testing
- **Integration Tests**: Agent communication and API integration  
- **E2E Tests**: Complete user workflow testing
- **Performance Tests**: Load testing and scaling validation

### Running Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests  
npm run test:e2e

# Run performance tests
npm run test:performance
```

## 📚 Documentation

### Implementation Guides
- [Dashboard Components](./docs/components/) - UI component documentation
- [Agent Services](./docs/services/) - Backend agent implementation
- [API Integration](./docs/services/api-services.md) - External service integration
- [Mobile Features](./docs/mobile/) - PWA and mobile functionality
- [Browser Extensions](./docs/extensions/) - LinkedIn capture extension

### Setup & Deployment
- [Package Dependencies](./docs/setup/package-dependencies.md) - Required packages and versions
- [Build Configuration](./docs/setup/build-configuration.md) - Webpack and deployment setup
- [Environment Setup](./docs/setup/) - Development and production configuration

## 🤝 Contributing

### Development Process
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following our coding standards
4. Add tests for new functionality
5. Run the test suite (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Coding Standards
- Follow TypeScript strict mode
- Use ESLint and Prettier configurations
- Write comprehensive tests
- Document new features and APIs
- Follow semantic commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- 📖 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/your-org/sales-ai-agent/issues)
- 💬 [Discussions](https://github.com/your-org/sales-ai-agent/discussions)
- 📧 [Email Support](mailto:support@your-org.com)

### Common Issues
- [Troubleshooting Guide](./docs/troubleshooting.md)
- [FAQ](./docs/faq.md)
- [Performance Optimization](./docs/performance.md)

---

<div align="center">

**Built with ❤️ by the Sales AI Team**

[Website](https://your-sales-ai-platform.com) • [Documentation](./docs/) • [API Reference](./docs/api/) • [Changelog](./CHANGELOG.md)

</div>