import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [WEAVIATE TEST] Testing Weaviate connection...');
    
    // Check environment variables
    const weaviateHost = process.env.WEAVIATE_HOST || 'localhost:8081';
    const hasApiKey = !!process.env.WEAVIATE_API_KEY;
    
    console.log('📊 [WEAVIATE TEST] Environment:', {
      host: weaviateHost,
      hasApiKey,
      nodeEnv: process.env.NODE_ENV
    });

    // Try to connect to Weaviate
    try {
      const weaviate = (await import('weaviate-ts-client')).default;
      const isCloud = weaviateHost.includes('.weaviate.network') || weaviateHost.includes('.weaviate.cloud');
      
      const client = weaviate.client({
        scheme: isCloud ? 'https' : 'http',
        host: weaviateHost,
        apiKey: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY!),
      });

      // Test connection by getting schema
      const schema = await client.schema.getter().do();
      
      console.log('✅ [WEAVIATE TEST] Connection successful!');
      console.log('📊 [WEAVIATE TEST] Schema classes:', schema.classes?.length || 0);

      return NextResponse.json({
        success: true,
        message: 'Weaviate connection successful',
        host: weaviateHost,
        hasApiKey,
        classesCount: schema.classes?.length || 0,
        classes: schema.classes?.map((cls: any) => ({
          name: cls.class,
          properties: cls.properties?.length || 0
        })) || []
      });

    } catch (weaviateError) {
      console.error('❌ [WEAVIATE TEST] Connection failed:', weaviateError);
      
      return NextResponse.json({
        success: false,
        message: 'Weaviate connection failed',
        host: weaviateHost,
        hasApiKey,
        error: weaviateError instanceof Error ? weaviateError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ [WEAVIATE TEST] General error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to test Weaviate connection' },
      { status: 500 }
    );
  }
}
