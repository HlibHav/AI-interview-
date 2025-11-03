import { NextRequest, NextResponse } from 'next/server';
import { computeAndPersistBatchSummary } from '@/lib/aggregations/batchSummary';
import { fetchBatchSummary } from '@/lib/weaviate/weaviate-batch-summary';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const researchGoalId = (body?.researchGoalId || '').trim();

    if (!researchGoalId) {
      return NextResponse.json({ error: 'researchGoalId is required' }, { status: 400 });
    }

    // Simple rate-limit: prevent refresh if last update < 60s ago
    const existing = await fetchBatchSummary(researchGoalId);
    if (existing?.updatedAt) {
      const last = Date.parse(existing.updatedAt);
      if (!Number.isNaN(last) && Date.now() - last < 60_000) {
        return NextResponse.json(
          { error: 'Refresh too soon; try again shortly' },
          { status: 429 }
        );
      }
    }

    const doc = await computeAndPersistBatchSummary(researchGoalId);
    if (!doc) {
      return NextResponse.json({ error: 'No interviews found for researchGoalId' }, { status: 404 });
    }

    return NextResponse.json({ success: true, batchSummary: doc });
  } catch (error) {
    console.error('POST /api/sessions/batch-summary/refresh error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to refresh batch summary';
    return NextResponse.json({ 
      error: 'Failed to refresh batch summary',
      details: errorMessage 
    }, { status: 500 });
  }
}


