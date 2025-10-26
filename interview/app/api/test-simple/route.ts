import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [SIMPLE TEST] Testing basic functionality...');
    
    // Check environment variables
    const weaviateHost = process.env.WEAVIATE_HOST || 'localhost:8081';
    const hasApiKey = !!process.env.WEAVIATE_API_KEY;
    
    console.log('📊 [SIMPLE TEST] Environment check:', {
      host: weaviateHost,
      hasApiKey,
      nodeEnv: process.env.NODE_ENV,
      openaiKey: !!process.env.OPENAI_API_KEY
    });

    return NextResponse.json({
      success: true,
      message: 'Basic test successful',
      environment: {
        weaviateHost,
        hasApiKey,
        nodeEnv: process.env.NODE_ENV,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY
      }
    });

  } catch (error) {
    console.error('❌ [SIMPLE TEST] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
