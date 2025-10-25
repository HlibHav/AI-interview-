import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get Weaviate configuration from environment variables
    const weaviateUrl = process.env.WEAVIATE_URL || 'qh9p8wwvscu5gubcno0tzg.c0.europe-west3.gcp.weaviate.cloud';
    const weaviateApiKey = process.env.WEAVIATE_API_KEY || 'a2p0Um1kVEo1M3lNeklEQ19qM3FMY2hZL2RiektkRXFoZ3BxK3Bmb2xMSXMrVVVnaWpiUXFyWHFwVFlNPV92MjAw';

    // Ensure URL has proper protocol
    const fullUrl = weaviateUrl.startsWith('http') ? weaviateUrl : `https://${weaviateUrl}`;

    // Test connection by making a simple request
    const response = await fetch(`${fullUrl}/v1/meta`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${weaviateApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Weaviate connection failed: ${response.status}`);
    }

    const meta = await response.json();

    return NextResponse.json({
      success: true,
      connected: true,
      version: meta.version,
      hostname: meta.hostname,
    });
  } catch (error) {
    console.error('Weaviate connection error:', error);
    return NextResponse.json({
      success: false,
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
