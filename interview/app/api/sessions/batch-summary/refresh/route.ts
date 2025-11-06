import { NextRequest, NextResponse } from 'next/server';
import { computeAndPersistBatchSummary } from '@/lib/aggregations/batchSummary';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { researchGoalId } = await request.json();

    if (!researchGoalId || typeof researchGoalId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'researchGoalId is required' },
        { status: 400 }
      );
    }

    const batch = await computeAndPersistBatchSummary(researchGoalId.trim());

    if (!batch) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate batch summary' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, batchSummary: batch });
  } catch (error: any) {
    console.error('POST /api/sessions/batch-summary/refresh error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to refresh batch summary' },
      { status: 500 }
    );
  }
}

