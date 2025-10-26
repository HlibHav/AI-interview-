#!/bin/bash

# Create .env.local file for Weaviate Cloud configuration
cat > .env.local << 'EOF'
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_APIKEY=your_openai_api_key_here

# Weaviate Cloud Configuration - UPDATE THESE VALUES
WEAVIATE_HOST=your-weaviate-cloud-url.weaviate.network
WEAVIATE_API_KEY=your-weaviate-cloud-api-key

# Application Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
EOF

echo "✅ Created .env.local file"
echo "⚠️  Please update WEAVIATE_HOST and WEAVIATE_API_KEY with your Weaviate Cloud credentials"
echo ""
echo "To get your Weaviate Cloud credentials:"
echo "1. Go to https://console.weaviate.cloud"
echo "2. Create a new cluster or select existing one"
echo "3. Copy the cluster URL and API key"
echo "4. Update the .env.local file"
