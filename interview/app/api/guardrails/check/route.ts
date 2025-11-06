import { NextRequest, NextResponse } from 'next/server';
import { checkGuardrails } from '@/lib/guardrails/content-monitor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, options = {} } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'text parameter is required' },
        { status: 400 }
      );
    }

    const result = await checkGuardrails(text, options);

    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('[API] Error in guardrail check:', error);
    return NextResponse.json(
      {
        error: 'Failed to check guardrails',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

