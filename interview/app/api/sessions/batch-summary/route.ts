import { NextRequest, NextResponse } from 'next/server';
import { fetchBatchSummary, listBatchSummariesWithFallback } from '@/lib/weaviate/weaviate-batch-summary';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const researchGoalId = searchParams.get('researchGoalId');

    if (researchGoalId) {
      const doc = await fetchBatchSummary(researchGoalId.trim());
      if (!doc) {
        return NextResponse.json({ success: false, error: 'Batch summary not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, batchSummary: doc });
    }

    const batches = await listBatchSummariesWithFallback();
    return NextResponse.json({ success: true, batches });
  } catch (error: any) {
    console.error('GET /api/sessions/batch-summary error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch batch summaries' },
      { status: 500 }
    );
  }
}

