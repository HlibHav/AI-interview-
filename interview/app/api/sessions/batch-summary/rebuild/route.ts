import { NextRequest, NextResponse } from 'next/server';
import {
  computeAndPersistAllBatchSummaries,
  BatchSummaryBulkResult
} from '@/lib/aggregations/batchSummary';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const results = await computeAndPersistAllBatchSummaries();
    const updated = results.filter((r) => r.success).length;
    const errors = results.filter((r) => !r.success);
    const skipped = results.filter((r) => r.skipped).length;
    const total = results.length;

    return NextResponse.json({
      success: true,
      updated,
      total,
      skipped,
      errors: errors.map((e) => ({
        researchGoalId: e.researchGoalId,
        error: e.error || 'Unknown error'
      }))
    });
  } catch (error: any) {
    console.error('POST /api/sessions/batch-summary/rebuild error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to rebuild batch summaries' },
      { status: 500 }
    );
  }
}

