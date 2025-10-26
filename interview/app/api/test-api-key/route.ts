import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔑 [API KEY TEST] Testing API key format...');
    
    const apiKey = process.env.WEAVIATE_API_KEY;
    const weaviateHost = process.env.WEAVIATE_HOST;
    
    console.log('📊 [API KEY TEST] Key info:', {
      hasKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyPrefix: apiKey?.substring(0, 10) || 'none',
      host: weaviateHost
    });

    // Check if API key format looks correct
    const isValidFormat = apiKey && apiKey.startsWith('sk-') && apiKey.length > 50;
    
    return NextResponse.json({
      success: true,
      message: 'API key format check',
      apiKey: {
        hasKey: !!apiKey,
        length: apiKey?.length || 0,
        prefix: apiKey?.substring(0, 10) || 'none',
        isValidFormat,
        host: weaviateHost
      },
      instructions: {
        message: isValidFormat ? 
          'API key format looks correct. If still getting 401 errors, the key may be expired or invalid.' :
          'API key format appears incorrect. Should start with "sk-" and be longer than 50 characters.',
        nextSteps: [
          '1. Go to https://console.weaviate.cloud',
          '2. Select your cluster',
          '3. Go to API Keys section',
          '4. Generate a new API key',
          '5. Update .env.local with the new key',
          '6. Restart the server'
        ]
      }
    });

  } catch (error) {
    console.error('❌ [API KEY TEST] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
