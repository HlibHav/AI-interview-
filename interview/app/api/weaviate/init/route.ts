import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Initialize Weaviate schema for interview sessions
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/weaviate/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create_schema',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to initialize schema');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Weaviate schema initialized successfully'
    });
  } catch (error) {
    console.error('Schema initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize schema' },
      { status: 500 }
    );
  }
}
