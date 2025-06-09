#!/bin/bash

# Sales AI Agent Platform Deployment Script
# This script handles deployment to different environments

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-development}"
BUILD_NUMBER="${BUILD_NUMBER:-$(date +%Y%m%d-%H%M%S)}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGISTRY:-sales-ai-agent}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
Sales AI Agent Platform Deployment Script

Usage: $0 [ENVIRONMENT] [OPTIONS]

ENVIRONMENTS:
    development     Deploy to development environment (default)
    staging         Deploy to staging environment
    production      Deploy to production environment

OPTIONS:
    --build-only    Only build images, don't deploy
    --deploy-only   Only deploy, don't build images
    --skip-tests    Skip running tests before deployment
    --skip-migrate  Skip database migrations
    --force         Force deployment even if health checks fail
    --rollback      Rollback to previous deployment
    --help          Show this help message

ENVIRONMENT VARIABLES:
    BUILD_NUMBER    Build identifier (default: timestamp)
    IMAGE_TAG       Docker image tag (default: latest)
    REGISTRY        Docker registry (default: sales-ai-agent)
    KUBECONFIG      Kubernetes config file path

EXAMPLES:
    $0 development
    $0 production --skip-tests
    $0 staging --build-only
    BUILD_NUMBER=v1.2.3 $0 production

EOF
}

# Parse command line arguments
BUILD_ONLY=false
DEPLOY_ONLY=false
SKIP_TESTS=false
SKIP_MIGRATE=false
FORCE_DEPLOY=false
ROLLBACK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --build-only)
            BUILD_ONLY=true
            shift
            ;;
        --deploy-only)
            DEPLOY_ONLY=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-migrate)
            SKIP_MIGRATE=true
            shift
            ;;
        --force)
            FORCE_DEPLOY=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        -*)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
        *)
            # First non-option argument is environment
            if [[ -z "${ENVIRONMENT_SET:-}" ]]; then
                ENVIRONMENT="$1"
                ENVIRONMENT_SET=true
            else
                log_error "Unknown argument: $1"
                show_help
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate environment
case $ENVIRONMENT in
    development|staging|production)
        log_info "Deploying to $ENVIRONMENT environment"
        ;;
    *)
        log_error "Invalid environment: $ENVIRONMENT"
        log_error "Valid environments: development, staging, production"
        exit 1
        ;;
esac

# Environment-specific configuration
case $ENVIRONMENT in
    development)
        NAMESPACE="sales-ai-agent-dev"
        REPLICAS_MAIN=1
        REPLICAS_AGENTS=1
        RESOURCES_REQUESTS_CPU="100m"
        RESOURCES_REQUESTS_MEMORY="256Mi"
        RESOURCES_LIMITS_CPU="500m"
        RESOURCES_LIMITS_MEMORY="512Mi"
        ;;
    staging)
        NAMESPACE="sales-ai-agent-staging"
        REPLICAS_MAIN=2
        REPLICAS_AGENTS=1
        RESOURCES_REQUESTS_CPU="250m"
        RESOURCES_REQUESTS_MEMORY="512Mi"
        RESOURCES_LIMITS_CPU="1000m"
        RESOURCES_LIMITS_MEMORY="1Gi"
        ;;
    production)
        NAMESPACE="sales-ai-agent"
        REPLICAS_MAIN=3
        REPLICAS_AGENTS=2
        RESOURCES_REQUESTS_CPU="500m"
        RESOURCES_REQUESTS_MEMORY="1Gi"
        RESOURCES_LIMITS_CPU="2000m"
        RESOURCES_LIMITS_MEMORY="2Gi"
        ;;
esac

# Rollback function
rollback_deployment() {
    log_info "Rolling back deployment in $ENVIRONMENT environment"
    
    # Get previous revision
    PREVIOUS_REVISION=$(kubectl rollout history deployment/sales-ai-server -n "$NAMESPACE" --no-headers | tail -2 | head -1 | awk '{print $1}')
    
    if [[ -z "$PREVIOUS_REVISION" ]]; then
        log_error "No previous revision found for rollback"
        exit 1
    fi
    
    log_info "Rolling back to revision $PREVIOUS_REVISION"
    
    # Rollback main server
    kubectl rollout undo deployment/sales-ai-server -n "$NAMESPACE" --to-revision="$PREVIOUS_REVISION"
    
    # Rollback agents
    kubectl rollout undo deployment/lead-scoring-agent -n "$NAMESPACE" --to-revision="$PREVIOUS_REVISION"
    kubectl rollout undo deployment/conversation-agent -n "$NAMESPACE" --to-revision="$PREVIOUS_REVISION"
    kubectl rollout undo deployment/email-agent -n "$NAMESPACE" --to-revision="$PREVIOUS_REVISION"
    kubectl rollout undo deployment/forecasting-agent -n "$NAMESPACE" --to-revision="$PREVIOUS_REVISION"
    
    # Wait for rollback to complete
    log_info "Waiting for rollback to complete..."
    kubectl rollout status deployment/sales-ai-server -n "$NAMESPACE" --timeout=600s
    kubectl rollout status deployment/lead-scoring-agent -n "$NAMESPACE" --timeout=300s
    kubectl rollout status deployment/conversation-agent -n "$NAMESPACE" --timeout=300s
    kubectl rollout status deployment/email-agent -n "$NAMESPACE" --timeout=300s
    kubectl rollout status deployment/forecasting-agent -n "$NAMESPACE" --timeout=300s
    
    log_success "Rollback completed successfully"
    exit 0
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check required tools
    command -v docker >/dev/null 2>&1 || { log_error "Docker is required but not installed"; exit 1; }
    command -v kubectl >/dev/null 2>&1 || { log_error "kubectl is required but not installed"; exit 1; }
    
    if [[ "$ENVIRONMENT" != "development" ]]; then
        command -v helm >/dev/null 2>&1 || { log_error "Helm is required for $ENVIRONMENT deployment"; exit 1; }
    fi
    
    # Check if we're in the right directory
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        log_error "Not in sales-ai-agent project directory"
        exit 1
    fi
    
    # Check environment file
    if [[ ! -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]] && [[ ! -f "$PROJECT_ROOT/.env" ]]; then
        log_warning "No environment file found (.env.$ENVIRONMENT or .env)"
    fi
    
    # Check Kubernetes connection
    if ! kubectl cluster-info >/dev/null 2>&1; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warning "Skipping tests"
        return 0
    fi
    
    log_info "Running tests..."
    cd "$PROJECT_ROOT"
    
    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        log_info "Installing dependencies..."
        npm ci
    fi
    
    # Run linting
    log_info "Running linter..."
    npm run lint
    
    # Run type checking
    log_info "Running type checking..."
    npm run type-check
    
    # Run unit tests
    log_info "Running unit tests..."
    npm run test
    
    # Run integration tests if available
    if npm run | grep -q "test:integration"; then
        log_info "Running integration tests..."
        npm run test:integration
    fi
    
    log_success "All tests passed"
}

# Build Docker images
build_images() {
    if [[ "$DEPLOY_ONLY" == "true" ]]; then
        log_warning "Skipping image build"
        return 0
    fi
    
    log_info "Building Docker images..."
    cd "$PROJECT_ROOT"
    
    # Build main application image
    log_info "Building main application image..."
    docker build -f Dockerfile -t "${REGISTRY}/sales-ai-agent:${IMAGE_TAG}" .
    docker build -f Dockerfile -t "${REGISTRY}/sales-ai-agent:${BUILD_NUMBER}" .
    
    # Build agent image
    log_info "Building agent image..."
    docker build -f Dockerfile.agent -t "${REGISTRY}/sales-ai-agent-agent:${IMAGE_TAG}" .
    docker build -f Dockerfile.agent -t "${REGISTRY}/sales-ai-agent-agent:${BUILD_NUMBER}" .
    
    # Push images if not local development
    if [[ "$ENVIRONMENT" != "development" ]]; then
        log_info "Pushing images to registry..."
        docker push "${REGISTRY}/sales-ai-agent:${IMAGE_TAG}"
        docker push "${REGISTRY}/sales-ai-agent:${BUILD_NUMBER}"
        docker push "${REGISTRY}/sales-ai-agent-agent:${IMAGE_TAG}"
        docker push "${REGISTRY}/sales-ai-agent-agent:${BUILD_NUMBER}"
    fi
    
    log_success "Images built successfully"
}

# Database migrations
run_migrations() {
    if [[ "$SKIP_MIGRATE" == "true" ]]; then
        log_warning "Skipping database migrations"
        return 0
    fi
    
    log_info "Running database migrations..."
    
    # Check if migration job already exists and is running
    if kubectl get job db-migration -n "$NAMESPACE" >/dev/null 2>&1; then
        log_info "Migration job already exists, deleting..."
        kubectl delete job db-migration -n "$NAMESPACE" --ignore-not-found
    fi
    
    # Create migration job
    cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  namespace: $NAMESPACE
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: migration
        image: ${REGISTRY}/sales-ai-agent:${IMAGE_TAG}
        command: ["npm", "run", "migrate"]
        envFrom:
        - configMapRef:
            name: sales-ai-config
        - secretRef:
            name: sales-ai-secrets
      backoffLimit: 3
EOF
    
    # Wait for migration to complete
    kubectl wait --for=condition=complete job/db-migration -n "$NAMESPACE" --timeout=300s
    
    log_success "Database migrations completed"
}

# Deploy to Kubernetes
deploy_kubernetes() {
    if [[ "$BUILD_ONLY" == "true" ]]; then
        log_warning "Skipping deployment"
        return 0
    fi
    
    log_info "Deploying to Kubernetes ($ENVIRONMENT)..."
    
    # Create namespace if it doesn't exist
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply configurations in order
    log_info "Applying configurations..."
    
    # Apply namespace and configmaps first
    kubectl apply -f "$PROJECT_ROOT/kubernetes/namespace.yaml"
    kubectl apply -f "$PROJECT_ROOT/kubernetes/configmap.yaml" -n "$NAMESPACE"
    kubectl apply -f "$PROJECT_ROOT/kubernetes/secrets.yaml" -n "$NAMESPACE"
    
    # Apply database resources
    kubectl apply -f "$PROJECT_ROOT/kubernetes/database.yaml" -n "$NAMESPACE"
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgres -n "$NAMESPACE" --timeout=300s
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=redis -n "$NAMESPACE" --timeout=300s
    
    # Run migrations
    run_migrations
    
    # Update image tags in application manifests
    sed -e "s|sales-ai-agent:latest|${REGISTRY}/sales-ai-agent:${IMAGE_TAG}|g" \
        -e "s|sales-ai-agent-agent:latest|${REGISTRY}/sales-ai-agent-agent:${IMAGE_TAG}|g" \
        "$PROJECT_ROOT/kubernetes/applications.yaml" | kubectl apply -n "$NAMESPACE" -f -
    
    # Apply autoscaling
    kubectl apply -f "$PROJECT_ROOT/kubernetes/autoscaling.yaml" -n "$NAMESPACE"
    
    # Apply ingress
    kubectl apply -f "$PROJECT_ROOT/kubernetes/ingress.yaml" -n "$NAMESPACE"
    
    # Wait for deployments to be ready
    log_info "Waiting for deployments to be ready..."
    kubectl rollout status deployment/sales-ai-server -n "$NAMESPACE" --timeout=600s
    kubectl rollout status deployment/lead-scoring-agent -n "$NAMESPACE" --timeout=300s
    kubectl rollout status deployment/conversation-agent -n "$NAMESPACE" --timeout=300s
    kubectl rollout status deployment/email-agent -n "$NAMESPACE" --timeout=300s
    kubectl rollout status deployment/forecasting-agent -n "$NAMESPACE" --timeout=300s
    
    log_success "Kubernetes deployment completed"
}

# Deploy with Docker Compose (for development)
deploy_docker_compose() {
    log_info "Deploying with Docker Compose..."
    cd "$PROJECT_ROOT"
    
    # Stop existing containers
    docker-compose down
    
    # Start services
    docker-compose up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 30
    
    # Check health
    for i in {1..12}; do
        if curl -f http://localhost:3000/health >/dev/null 2>&1; then
            log_success "Services are healthy"
            break
        fi
        
        if [[ $i -eq 12 ]]; then
            log_error "Services failed to become healthy"
            exit 1
        fi
        
        log_info "Waiting for services... (attempt $i/12)"
        sleep 10
    done
    
    log_success "Docker Compose deployment completed"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    if [[ "$ENVIRONMENT" == "development" ]]; then
        HEALTH_URL="http://localhost:3000/health"
    else
        # Get ingress URL for other environments
        HEALTH_URL="https://api.sales-ai-agent.com/health"
        if [[ "$ENVIRONMENT" == "staging" ]]; then
            HEALTH_URL="https://api-staging.sales-ai-agent.com/health"
        fi
    fi
    
    # Wait for health endpoint to respond
    for i in {1..30}; do
        if curl -f "$HEALTH_URL" >/dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi
        
        log_info "Waiting for health check... (attempt $i/30)"
        sleep 10
    done
    
    if [[ "$FORCE_DEPLOY" == "true" ]]; then
        log_warning "Health check failed but continuing due to --force flag"
        return 0
    else
        log_error "Health check failed"
        return 1
    fi
}

# Clean up old resources
cleanup() {
    log_info "Cleaning up old resources..."
    
    if [[ "$ENVIRONMENT" != "development" ]]; then
        # Clean up old Docker images
        docker image prune -f --filter "label=app=sales-ai-agent"
        
        # Clean up old Kubernetes resources
        kubectl delete pods -l app.kubernetes.io/part-of=sales-ai-platform -n "$NAMESPACE" --field-selector=status.phase=Succeeded
    fi
    
    log_success "Cleanup completed"
}

# Main deployment flow
main() {
    log_info "Starting deployment process..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Build Number: $BUILD_NUMBER"
    log_info "Image Tag: $IMAGE_TAG"
    
    # Handle rollback
    if [[ "$ROLLBACK" == "true" ]]; then
        rollback_deployment
        return 0
    fi
    
    # Check prerequisites
    check_prerequisites
    
    # Run tests
    run_tests
    
    # Build images
    build_images
    
    # Deploy based on environment
    if [[ "$ENVIRONMENT" == "development" ]]; then
        deploy_docker_compose
    else
        deploy_kubernetes
    fi
    
    # Health check
    health_check
    
    # Cleanup
    cleanup
    
    log_success "Deployment completed successfully!"
    log_info "Environment: $ENVIRONMENT"
    log_info "Build Number: $BUILD_NUMBER"
    
    if [[ "$ENVIRONMENT" == "development" ]]; then
        log_info "Application URL: http://localhost:3000"
    else
        case $ENVIRONMENT in
            staging)
                log_info "Application URL: https://app-staging.sales-ai-agent.com"
                log_info "API URL: https://api-staging.sales-ai-agent.com"
                ;;
            production)
                log_info "Application URL: https://app.sales-ai-agent.com"
                log_info "API URL: https://api.sales-ai-agent.com"
                ;;
        esac
    fi
}

# Run main function
main "$@"