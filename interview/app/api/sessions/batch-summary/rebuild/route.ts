import { NextResponse } from 'next/server';
import {
  computeAndPersistAllBatchSummaries,
  BatchSummaryBulkResult
} from '@/lib/aggregations/batchSummary';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try {
    const results = await computeAndPersistAllBatchSummaries();
    const total = results.length;
    const updated = results.filter((item) => item.success).length;
    const skipped = results.filter((item) => item.skipped).length;
    const errors = results.filter((item) => !item.success && !item.skipped);

    const response: {
      success: boolean;
      total: number;
      updated: number;
      skipped: number;
      errors: BatchSummaryBulkResult[];
    } = {
      success: true,
      total,
      updated,
      skipped,
      errors
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('POST /api/sessions/batch-summary/rebuild error:', error);
    const message = error instanceof Error ? error.message : 'Failed to rebuild batch summaries';
    return NextResponse.json(
      {
        error: 'Failed to rebuild batch summaries',
        details: message
      },
      { status: 500 }
    );
  }
}

