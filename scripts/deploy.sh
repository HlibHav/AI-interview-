#!/bin/bash

# AI Interview Assistant Production Deployment Script
# This script deploys the complete application using Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🚀 Deploying AI Interview Assistant to Production..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    print_error ".env.local file not found. Please create it with your production configuration."
    exit 1
fi

print_status "All required tools are installed."

# Build the application
print_status "Building the application..."
npm run build

# Stop any existing containers
print_status "Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build and start all services
print_status "Building and starting all services..."
docker-compose up -d --build

# Wait for services to be ready
print_status "Waiting for services to be ready..."

# Wait for Weaviate
timeout=60
counter=0
while ! curl -s http://localhost:8081/v1/.well-known/ready > /dev/null 2>&1; do
    if [ $counter -eq $timeout ]; then
        print_error "Weaviate failed to start within $timeout seconds"
        docker-compose logs weaviate
        exit 1
    fi
    sleep 1
    counter=$((counter + 1))
done

print_success "Weaviate is ready!"

# Wait for the application
timeout=60
counter=0
while ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; do
    if [ $counter -eq $timeout ]; then
        print_error "Application failed to start within $timeout seconds"
        docker-compose logs app
        exit 1
    fi
    sleep 1
    counter=$((counter + 1))
done

print_success "Application is ready!"

# Test all endpoints
print_status "Testing application endpoints..."

# Test home page
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200"; then
    print_success "Home page: ✅"
else
    print_error "Home page: ❌"
fi

# Test admin page
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin | grep -q "200"; then
    print_success "Admin page: ✅"
else
    print_error "Admin page: ❌"
fi

# Test respondent page
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/respondent | grep -q "200"; then
    print_success "Respondent page: ✅"
else
    print_error "Respondent page: ❌"
fi

# Test health endpoint
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health | grep -q "200"; then
    print_success "Health endpoint: ✅"
else
    print_error "Health endpoint: ❌"
fi

# Test OpenAI integration
if curl -s http://localhost:3000/api/test-openai | grep -q "success"; then
    print_success "OpenAI integration: ✅"
else
    print_warning "OpenAI integration: ⚠️ (Check your API key in .env.local)"
fi

echo ""
print_success "🎉 Deployment complete!"
echo ""
echo "📱 Application URLs:"
echo "   • Home: http://localhost:3000"
echo "   • Admin: http://localhost:3000/admin"
echo "   • Respondent: http://localhost:3000/respondent"
echo "   • Analytics: http://localhost:3000/admin/analytics"
echo ""
echo "🔧 Services:"
echo "   • Next.js App: http://localhost:3000"
echo "   • Weaviate: http://localhost:8081"
echo "   • Health Check: http://localhost:3000/api/health"
echo ""
echo "📊 Container Status:"
docker-compose ps
echo ""
echo "🛑 To stop the application:"
echo "   • Run 'docker-compose down' to stop all services"
echo "   • Run 'docker-compose down -v' to also remove volumes"
echo ""
echo "📝 Logs:"
echo "   • Application: docker-compose logs app"
echo "   • Weaviate: docker-compose logs weaviate"
echo "   • All services: docker-compose logs"
echo ""
