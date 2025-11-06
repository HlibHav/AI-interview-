import { NextRequest, NextResponse } from 'next/server';
import {
  fetchBatchSummary,
  recordBatchSummaryDeletion
} from '@/lib/weaviate/weaviate-batch-summary';
import { deleteObjectCascade } from '@/lib/weaviate/weaviate-helpers';
import { canonicalizeGoalId } from '@/lib/weaviate/weaviate-utils';
import { v5 as uuidv5 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { researchGoalId: string } }
) {
  try {
    const researchGoalId = decodeURIComponent(params.researchGoalId);
    const summary = await fetchBatchSummary(researchGoalId);

    if (!summary) {
      return NextResponse.json(
        { success: false, error: 'Batch summary not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, batchSummary: summary });
  } catch (error: any) {
    console.error('GET /api/sessions/batch-summary/[researchGoalId] error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch batch summary' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { researchGoalId: string } }
) {
  try {
    const researchGoalId = decodeURIComponent(params.researchGoalId);
    const trimmed = researchGoalId.trim();

    if (!trimmed) {
      return NextResponse.json(
        { success: false, error: 'Research goal ID is required' },
        { status: 400 }
      );
    }

    const canonical = canonicalizeGoalId(trimmed);
    if (canonical) {
      await recordBatchSummaryDeletion({
        canonicalGoalId: canonical,
        goalLabel: trimmed
      });
    }

    const summary = await fetchBatchSummary(trimmed);
    if (!summary) {
      return NextResponse.json({ success: true, message: 'Batch summary already deleted' });
    }

    const batchSummaryIds = new Set<string>();
    if (summary.id) {
      batchSummaryIds.add(summary.id);
    }

    if (canonical) {
      batchSummaryIds.add(uuidv5(`batch:${canonical}`, uuidv5.URL));
    }

    const failedDeletes: Array<{ className: string; id: string; error: string }> = [];
    const recordCleanup = (className: string, count: number) => {
      console.log(`[BATCH SUMMARY DELETE] Cleaned up ${count} ${className} object(s)`);
    };

    for (const summaryId of batchSummaryIds) {
      try {
        await deleteObjectCascade('BatchSummary', summaryId);
        recordCleanup('BatchSummary', 1);
      } catch (deleteError: any) {
        const message = deleteError?.message || String(deleteError);
        console.error(`[BATCH SUMMARY DELETE] Failed to delete ${summaryId}:`, message);
        failedDeletes.push({ className: 'BatchSummary', id: summaryId, error: message });
      }
    }

    if (failedDeletes.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Some batch summaries could not be deleted',
        failedDeletes
      }, { status: 207 });
    }

    return NextResponse.json({
      success: true,
      message: 'Batch summary deleted successfully'
    });
  } catch (error: any) {
    console.error('DELETE /api/sessions/batch-summary/[researchGoalId] error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete batch summary' },
      { status: 500 }
    );
  }
}

