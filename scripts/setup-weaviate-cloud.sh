#!/bin/bash

# Create .env.local file for Weaviate Cloud configuration
cat > .env.local << 'EOF'
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_APIKEY=your_openai_api_key_here  # Note: Weaviate requires this spelling (no underscore)

# Weaviate Cloud Configuration - UPDATE THESE VALUES
WEAVIATE_HOST=cartoon-leech0p.weaviate.network
WEAVIATE_API_KEY=your_weaviate_cloud_api_key_here

# Beyond Presence Configuration
BEY_API_KEY=your_beyond_presence_api_key_here
BEY_API_URL=https://api.bey.dev
BEY_AVATAR_ID=your_avatar_id_here

# Application Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Phoenix Observability (Optional)
PHOENIX_API_KEY=your_phoenix_api_key_here
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006

# Database Configuration (if using external database)
DATABASE_URL=your_database_url_here

# Security
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here
EOF

echo "✅ Created .env.local file in current directory"
echo "⚠️  Please update WEAVIATE_HOST and WEAVIATE_API_KEY with your Weaviate Cloud credentials"
echo ""
echo "To get your Weaviate Cloud credentials:"
echo "1. Go to https://console.weaviate.cloud"
echo "2. Select your cluster: cartoon-leech0p"
echo "3. Copy the cluster URL and API key"
echo "4. Update the .env.local file"
echo ""
echo "After updating credentials, restart your Next.js server:"
echo "npm run dev"
