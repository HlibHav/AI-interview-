import { NextRequest, NextResponse } from 'next/server';
import { fetchBatchSummary, listBatchSummariesWithFallback } from '@/lib/weaviate/weaviate-batch-summary';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const researchGoalId = req.nextUrl.searchParams.get('researchGoalId');

    if (!researchGoalId || !researchGoalId.trim()) {
      const rows = await listBatchSummariesWithFallback(200);
      return NextResponse.json({ success: true, batches: rows });
    }

    const doc = await fetchBatchSummary(researchGoalId.trim());
    if (!doc) {
      return NextResponse.json({ error: 'Batch summary not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, batchSummary: doc });
  } catch (error) {
    console.error('GET /api/sessions/batch-summary error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch batch summary';
    return NextResponse.json({ 
      error: 'Failed to fetch batch summary',
      details: errorMessage 
    }, { status: 500 });
  }
}
