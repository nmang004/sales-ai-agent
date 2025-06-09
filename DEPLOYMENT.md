# Sales AI Agent Platform - Deployment Guide

This comprehensive guide covers all deployment options for the Sales AI Agent platform, from local development to production Kubernetes clusters.

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Deployment Options](#deployment-options)
  - [Local Development](#local-development)
  - [Docker Compose](#docker-compose)
  - [Kubernetes Production](#kubernetes-production)
- [Infrastructure Requirements](#infrastructure-requirements)
- [Security Configuration](#security-configuration)
- [Monitoring Setup](#monitoring-setup)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

## Quick Start

For the impatient developer who wants to get up and running immediately:

```bash
# Clone and setup
git clone <repository-url>
cd sales-ai-agent
cp .env.example .env

# Edit .env with your API keys
nano .env

# Deploy with Docker Compose
./scripts/deploy.sh development

# Access the application
open http://localhost:3000
```

## Prerequisites

### Required Software

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **Docker** | 20+ | Containerization |
| **Docker Compose** | 2.0+ | Local orchestration |
| **kubectl** | 1.25+ | Kubernetes management |
| **Helm** | 3.10+ | Kubernetes package manager |

### Required API Keys

Before deployment, obtain these API keys:

- **Anthropic API Key** - For Claude AI integration
- **SendGrid API Key** - For email functionality
- **Deepgram API Key** - For speech transcription
- **Clearbit API Key** - For lead enrichment (optional)

### System Requirements

#### Development Environment
- **CPU**: 4 cores minimum
- **RAM**: 8GB minimum
- **Storage**: 20GB available space
- **Network**: Stable internet connection

#### Production Environment
- **CPU**: 16+ cores recommended
- **RAM**: 32GB+ recommended
- **Storage**: 100GB+ SSD storage
- **Network**: High-bandwidth, low-latency connection

## Environment Configuration

### 1. Create Environment File

```bash
cp .env.example .env
```

### 2. Configure Required Variables

Edit `.env` and set these critical variables:

```bash
# Security Keys (Generate secure random strings)
JWT_SECRET=your_super_secret_jwt_key_make_it_64_characters_long_random
ENCRYPTION_KEY=your_64_character_hex_encryption_key_for_sensitive_data_here

# Database
POSTGRES_PASSWORD=your_secure_database_password_here
REDIS_PASSWORD=your_secure_redis_password_here

# External API Keys
ANTHROPIC_API_KEY=sk-ant-api03-your-anthropic-key-here
SENDGRID_API_KEY=SG.your-sendgrid-key-here
DEEPGRAM_API_KEY=your-deepgram-key-here
CLEARBIT_API_KEY=sk_your-clearbit-key-here
```

### 3. Generate Secure Keys

```bash
# Generate JWT Secret (64 characters)
openssl rand -hex 32

# Generate Encryption Key (64 hex characters)
openssl rand -hex 32

# Generate Database Passwords
openssl rand -base64 32
```

## Deployment Options

## Local Development

Perfect for development and testing:

### Quick Setup

```bash
# Install dependencies
npm install

# Setup database (using Docker)
docker run -d \
  --name sales-ai-postgres \
  -e POSTGRES_DB=sales_ai_agent \
  -e POSTGRES_USER=sales_ai_user \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  postgres:15-alpine

# Setup Redis
docker run -d \
  --name sales-ai-redis \
  -p 6379:6379 \
  redis:7-alpine

# Run migrations
npm run migrate

# Start development server
npm run dev
```

### Development Features

- **Hot reload** for code changes
- **Debug logging** enabled
- **API documentation** at `/api/docs`
- **Health checks** at `/health`

## Docker Compose

Recommended for staging and simple production deployments:

### Deploy Everything

```bash
# Deploy complete stack
./scripts/deploy.sh development

# Or manually with Docker Compose
docker-compose up -d
```

### Service Architecture

The Docker Compose setup includes:

```yaml
services:
  - sales-ai-server      # Main API server (3 replicas)
  - lead-scoring-agent   # Lead scoring service (2 replicas)
  - conversation-agent   # Real-time conversation AI (3 replicas)
  - email-agent         # Email automation (2 replicas)
  - forecasting-agent   # Predictive analytics (1 replica)
  - postgres            # Primary database
  - redis              # Cache and sessions
  - nginx              # Load balancer and reverse proxy
  - prometheus         # Metrics collection
  - grafana           # Monitoring dashboards
  - elasticsearch     # Log aggregation
  - kibana           # Log visualization
```

### Accessing Services

| Service | URL | Purpose |
|---------|-----|---------|
| **Main App** | http://localhost:3000 | Primary application |
| **API** | http://localhost:3000/api | REST API endpoints |
| **WebSocket** | ws://localhost:3001/ws | Real-time connections |
| **Grafana** | http://localhost:3001 | Monitoring dashboards |
| **Prometheus** | http://localhost:9090 | Metrics collection |
| **Kibana** | http://localhost:5601 | Log analysis |

### Configuration Override

Create `docker-compose.override.yml` for custom settings:

```yaml
version: '3.8'

services:
  sales-ai-server:
    environment:
      - LOG_LEVEL=debug
      - ENABLE_API_DOCS=true
    ports:
      - "3000:3000"
      - "9229:9229"  # Debug port
```

## Kubernetes Production

Enterprise-grade deployment with auto-scaling and high availability:

### Prerequisites

1. **Kubernetes Cluster** (1.25+)
2. **kubectl** configured and connected
3. **Helm** installed
4. **Ingress Controller** (NGINX recommended)
5. **Cert-Manager** for SSL certificates
6. **Persistent Volume** storage class

### 1. Cluster Preparation

```bash
# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml

# Install Cert-Manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create storage class (example for AWS EKS)
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  encrypted: "true"
allowVolumeExpansion: true
EOF
```

### 2. Deploy Application

```bash
# Build and push images (if using custom registry)
export REGISTRY=your-registry.com/sales-ai-agent
export IMAGE_TAG=v1.0.0

# Deploy to production
./scripts/deploy.sh production

# Or manually step by step
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/secrets.yaml
kubectl apply -f kubernetes/database.yaml
kubectl apply -f kubernetes/applications.yaml
kubectl apply -f kubernetes/autoscaling.yaml
kubectl apply -f kubernetes/ingress.yaml
```

### 3. Domain Configuration

Configure DNS records:

```bash
# A records pointing to your ingress load balancer IP
api.sales-ai-agent.com      -> <INGRESS_IP>
app.sales-ai-agent.com      -> <INGRESS_IP>
ws.sales-ai-agent.com       -> <INGRESS_IP>
monitoring.sales-ai-agent.com -> <INGRESS_IP>
```

### 4. SSL Certificate Setup

The deployment automatically requests SSL certificates via cert-manager:

```yaml
# Certificates are automatically managed
tls:
  - hosts:
    - api.sales-ai-agent.com
    - app.sales-ai-agent.com
    - ws.sales-ai-agent.com
    secretName: sales-ai-tls-secret
```

### 5. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n sales-ai-agent

# Check services
kubectl get services -n sales-ai-agent

# Check ingress
kubectl get ingress -n sales-ai-agent

# View logs
kubectl logs -f deployment/sales-ai-server -n sales-ai-agent
```

### Auto-Scaling Configuration

The platform includes intelligent auto-scaling:

```yaml
# Horizontal Pod Autoscaler
minReplicas: 3
maxReplicas: 20
metrics:
  - CPU: 70%
  - Memory: 80%
  - Custom: http_requests_per_second: 100
```

## Infrastructure Requirements

### Production Kubernetes Cluster

#### Minimum Specifications

```yaml
Nodes: 3 (for high availability)
CPU: 8 cores per node (24 total)
Memory: 16GB per node (48GB total)
Storage: 100GB SSD per node
Network: 1Gbps bandwidth
```

#### Recommended Specifications

```yaml
Nodes: 5-10 (for auto-scaling)
CPU: 16 cores per node
Memory: 32GB per node
Storage: 200GB SSD per node
Network: 10Gbps bandwidth
```

### Database Requirements

#### PostgreSQL

```yaml
CPU: 4 cores minimum
Memory: 8GB minimum
Storage: 100GB SSD
Backup: Daily automated backups
Replication: Read replicas for scaling
```

#### Redis

```yaml
CPU: 2 cores
Memory: 4GB
Storage: 20GB SSD
Persistence: AOF enabled
Clustering: Redis Cluster for HA
```

### Monitoring Stack

```yaml
Prometheus:
  Memory: 4GB
  Storage: 50GB (retention: 15 days)
  
Grafana:
  Memory: 1GB
  Storage: 10GB
  
Elasticsearch:
  Memory: 8GB
  Storage: 100GB (logs retention: 30 days)
```

## Security Configuration

### Network Security

1. **Network Policies**: Restrict pod-to-pod communication
2. **Ingress Control**: Rate limiting and DDoS protection
3. **TLS Encryption**: All external communications encrypted
4. **VPC/Firewall**: Database access restricted to cluster

### Application Security

1. **JWT Authentication**: Secure API access
2. **API Key Management**: Rotating keys with expiration
3. **Data Encryption**: Sensitive data encrypted at rest
4. **Audit Logging**: All actions logged and monitored

### Secrets Management

```bash
# Kubernetes secrets (production)
kubectl create secret generic sales-ai-secrets \
  --from-literal=ANTHROPIC_API_KEY=your-key \
  --from-literal=JWT_SECRET=your-secret \
  --namespace sales-ai-agent

# For enhanced security, use External Secrets Operator
# or cloud-native secret managers (AWS Secrets Manager, etc.)
```

### Security Best Practices

1. **Regular Updates**: Keep all dependencies updated
2. **Vulnerability Scanning**: Scan container images
3. **Access Control**: Implement RBAC
4. **Monitoring**: Real-time security monitoring
5. **Backup Encryption**: Encrypt all backups

## Monitoring Setup

### Grafana Dashboards

Access Grafana at `https://monitoring.sales-ai-agent.com/grafana`

**Pre-configured dashboards:**

1. **System Overview**: CPU, memory, network, disk usage
2. **Application Metrics**: Response times, error rates, throughput
3. **Business Metrics**: Leads processed, emails sent, forecasts generated
4. **Agent Performance**: Individual agent statistics
5. **Security Dashboard**: Authentication events, failed requests

### Prometheus Alerts

**Critical alerts configured:**

```yaml
- HighErrorRate: >5% error rate for 5 minutes
- HighResponseTime: >5s response time for 5 minutes
- ServiceDown: Service unavailable for 1 minute
- HighMemoryUsage: >85% memory usage for 10 minutes
- DiskSpaceHigh: >90% disk usage
- CertificateExpiring: SSL certificate expires in 7 days
```

### Log Analysis

**Kibana dashboards available:**

1. **Application Logs**: Error tracking and debugging
2. **Security Logs**: Authentication and authorization events
3. **Performance Logs**: Slow queries and bottlenecks
4. **Business Logs**: User actions and workflows

### Custom Metrics

The platform exposes custom metrics:

```yaml
# Business Metrics
- leads_processed_total
- emails_sent_total
- calls_analyzed_total
- forecasts_generated_total

# Performance Metrics
- agent_response_time_seconds
- claude_api_latency_seconds
- database_query_duration_seconds
- workflow_execution_time_seconds

# System Metrics
- active_connections
- queue_depth
- cache_hit_rate
- error_rate
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

```bash
# Check database pod status
kubectl get pods -l app.kubernetes.io/name=postgres -n sales-ai-agent

# Check database logs
kubectl logs -l app.kubernetes.io/name=postgres -n sales-ai-agent

# Test connection
kubectl exec -it deployment/sales-ai-server -n sales-ai-agent -- \
  psql postgresql://sales_ai_user:password@postgres-service:5432/sales_ai_agent
```

#### 2. API Key Issues

```bash
# Verify secrets
kubectl get secrets -n sales-ai-agent
kubectl describe secret sales-ai-secrets -n sales-ai-agent

# Check environment variables
kubectl exec -it deployment/sales-ai-server -n sales-ai-agent -- env | grep API_KEY
```

#### 3. Agent Performance Issues

```bash
# Check agent logs
kubectl logs -f deployment/lead-scoring-agent -n sales-ai-agent

# Check resource usage
kubectl top pods -n sales-ai-agent

# Check auto-scaling status
kubectl get hpa -n sales-ai-agent
```

#### 4. SSL Certificate Issues

```bash
# Check certificate status
kubectl get certificates -n sales-ai-agent
kubectl describe certificate sales-ai-tls-secret -n sales-ai-agent

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager
```

### Health Checks

**Built-in health endpoints:**

```bash
# Overall health
curl https://api.sales-ai-agent.com/health

# Detailed health check
curl https://api.sales-ai-agent.com/health/detailed

# Individual agent health
curl https://api.sales-ai-agent.com/health/agents
```

### Performance Debugging

#### 1. Slow Response Times

```bash
# Check Grafana "Response Time" dashboard
# Look for bottlenecks in:
- Database queries
- Claude API calls
- Inter-service communication

# Scale up if needed
kubectl scale deployment sales-ai-server --replicas=5 -n sales-ai-agent
```

#### 2. High Memory Usage

```bash
# Check memory usage
kubectl top pods -n sales-ai-agent

# Check for memory leaks
kubectl exec -it deployment/sales-ai-server -n sales-ai-agent -- \
  node --expose-gc -e "global.gc(); console.log(process.memoryUsage())"
```

#### 3. Queue Backlogs

```bash
# Check queue depths
curl https://api.sales-ai-agent.com/metrics | grep queue_depth

# Scale specific agents
kubectl scale deployment email-agent --replicas=4 -n sales-ai-agent
```

## Maintenance

### Regular Maintenance Tasks

#### Daily
- [ ] Check system health dashboards
- [ ] Review error logs
- [ ] Monitor resource usage
- [ ] Verify backup completion

#### Weekly
- [ ] Update dependency security patches
- [ ] Review performance metrics
- [ ] Clean up old logs and metrics
- [ ] Test disaster recovery procedures

#### Monthly
- [ ] Update container images
- [ ] Review and rotate secrets
- [ ] Performance optimization review
- [ ] Security audit

### Backup Procedures

#### Database Backup

```bash
# Automated daily backups
kubectl create job manual-backup --from=cronjob/postgres-backup -n sales-ai-agent

# Manual backup
kubectl exec -it deployment/postgres -n sales-ai-agent -- \
  pg_dump -U sales_ai_user -d sales_ai_agent > backup-$(date +%Y%m%d).sql
```

#### Configuration Backup

```bash
# Backup Kubernetes configurations
kubectl get all,configmap,secret,pvc -n sales-ai-agent -o yaml > k8s-backup-$(date +%Y%m%d).yaml
```

### Scaling Procedures

#### Manual Scaling

```bash
# Scale specific components
kubectl scale deployment sales-ai-server --replicas=5 -n sales-ai-agent
kubectl scale deployment conversation-agent --replicas=10 -n sales-ai-agent

# Update HPA limits
kubectl patch hpa sales-ai-server-hpa -n sales-ai-agent -p '{"spec":{"maxReplicas":25}}'
```

#### Resource Limits Update

```bash
# Update resource limits
kubectl patch deployment sales-ai-server -n sales-ai-agent -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "sales-ai-server",
          "resources": {
            "limits": {"memory": "4Gi", "cpu": "2000m"},
            "requests": {"memory": "2Gi", "cpu": "1000m"}
          }
        }]
      }
    }
  }
}'
```

### Update Procedures

#### Application Updates

```bash
# Deploy new version
export IMAGE_TAG=v1.1.0
./scripts/deploy.sh production

# Monitor rollout
kubectl rollout status deployment/sales-ai-server -n sales-ai-agent

# Rollback if needed
kubectl rollout undo deployment/sales-ai-server -n sales-ai-agent
```

#### Infrastructure Updates

```bash
# Update Kubernetes cluster (cluster-specific)
# Update ingress controller
# Update cert-manager
# Update monitoring stack

# Test in staging first
./scripts/deploy.sh staging
```

### Disaster Recovery

#### Recovery Procedures

1. **Database Recovery**
   ```bash
   # Restore from backup
   kubectl exec -it deployment/postgres -n sales-ai-agent -- \
     psql -U sales_ai_user -d sales_ai_agent < backup-20240101.sql
   ```

2. **Full System Recovery**
   ```bash
   # Redeploy entire stack
   kubectl apply -f k8s-backup-20240101.yaml
   ```

3. **Configuration Recovery**
   ```bash
   # Restore from git
   git checkout production
   ./scripts/deploy.sh production
   ```

### Monitoring and Alerting

#### Alert Channels

Configure alert destinations in Grafana:

```yaml
# Slack notifications
- Channel: #sales-ai-alerts
- Webhook: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Email notifications
- SMTP: smtp.gmail.com:587
- Recipients: ops-team@company.com

# PagerDuty integration
- Service Key: YOUR_PAGERDUTY_SERVICE_KEY
```

#### Custom Alerts

Add business-specific alerts:

```yaml
# Lead processing delays
- Alert: lead_processing_delay
  Condition: lead_queue_depth > 1000
  Severity: warning

# Revenue forecast accuracy
- Alert: forecast_accuracy_drop
  Condition: forecast_accuracy < 0.8
  Severity: critical

# API rate limit approaching
- Alert: api_rate_limit_high
  Condition: api_requests_per_minute > 8000
  Severity: warning
```

---

## Support and Resources

### Documentation Links

- [API Documentation](./docs/api/README.md)
- [Architecture Overview](./docs/architecture/overview.md)
- [Security Guidelines](./docs/development/SECURITY_GUIDELINES.md)
- [Development Setup](./docs/development/ENVIRONMENT_SETUP.md)

### Community

- **Issues**: [GitHub Issues](https://github.com/your-org/sales-ai-agent/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/sales-ai-agent/discussions)
- **Slack**: [#sales-ai-agent](https://your-org.slack.com)

### Getting Help

1. **Check logs**: Start with application and system logs
2. **Health checks**: Use built-in health endpoints
3. **Monitoring**: Review Grafana dashboards
4. **Documentation**: Search this guide and API docs
5. **Community**: Post in GitHub discussions
6. **Support**: Contact enterprise support team

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Next Review**: January 2025