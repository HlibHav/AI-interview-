#!/bin/bash

# AI Interview Assistant Setup Script
# This script sets up the complete development environment

set -e

echo "🚀 Setting up AI Interview Assistant..."

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

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

print_status "All required tools are installed."

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    print_status "Creating .env.local from template..."
    cp env.example .env.local
    print_warning "Please update .env.local with your actual API keys and configuration."
else
    print_status ".env.local already exists."
fi

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
npm install --legacy-peer-deps

# Build the application
print_status "Building the application..."
npm run build

# Stop any existing containers
print_status "Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Start Weaviate
print_status "Starting Weaviate vector database..."
docker-compose up -d weaviate

# Wait for Weaviate to be ready
print_status "Waiting for Weaviate to be ready..."
timeout=60
counter=0
while ! curl -s http://localhost:8081/v1/.well-known/ready > /dev/null 2>&1; do
    if [ $counter -eq $timeout ]; then
        print_error "Weaviate failed to start within $timeout seconds"
        exit 1
    fi
    sleep 1
    counter=$((counter + 1))
done

print_success "Weaviate is ready!"

# Start the Next.js application
print_status "Starting Next.js application..."
npm run dev &
DEV_PID=$!

# Wait for the application to be ready
print_status "Waiting for application to be ready..."
timeout=30
counter=0
while ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; do
    if [ $counter -eq $timeout ]; then
        print_error "Application failed to start within $timeout seconds"
        kill $DEV_PID 2>/dev/null || true
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
print_success "🎉 Setup complete!"
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
echo "📝 Next Steps:"
echo "   1. Update your API keys in .env.local"
echo "   2. Visit http://localhost:3000/admin to start creating interviews"
echo "   3. Use http://localhost:3000/respondent to test the interview flow"
echo ""
echo "🛑 To stop the application:"
echo "   • Press Ctrl+C to stop the dev server"
echo "   • Run 'docker-compose down' to stop Weaviate"
echo ""

# Keep the script running to show the dev server output
print_status "Development server is running. Press Ctrl+C to stop."
wait $DEV_PID
