import { NextRequest, NextResponse } from 'next/server';
import { analyzeEmotionAndEnergy, batchAnalyzeEmotion } from '@/lib/analysis/emotion-detection';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, texts, context } = body;

    // Single text analysis
    if (text) {
      if (typeof text !== 'string') {
        return NextResponse.json(
          { error: 'text must be a string' },
          { status: 400 }
        );
      }

      const result = await analyzeEmotionAndEnergy(text, context);

      return NextResponse.json({
        success: true,
        result
      });
    }

    // Batch analysis
    if (texts) {
      if (!Array.isArray(texts) || texts.length === 0) {
        return NextResponse.json(
          { error: 'texts must be a non-empty array' },
          { status: 400 }
        );
      }

      const results = await batchAnalyzeEmotion(texts, context);

      return NextResponse.json({
        success: true,
        results,
        count: results.length
      });
    }

    return NextResponse.json(
      { error: 'Either text or texts parameter is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] Error in emotion analysis:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze emotion',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

