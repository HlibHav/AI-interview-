"use client";

import { useCallback, useEffect, useState } from "react";

// Force dynamic rendering - skip static generation
export const dynamic = 'force-dynamic';

type KeyTheme = { theme: string; count: number };

type BatchSummary = {
  id: string;
  researchGoalId: string;
  interviewIds: string[];
  keyThemes: KeyTheme[];
  summary: string;
  overallProfile: string;
  insights: string[];
  pains: string[];
  gains: string[];
  jobs: string[];
  participantCount?: number;
  createdAt?: string;
  updatedAt?: string;
  hasSummary?: boolean;
  targetAudience?: string;
};

export default function BatchSummaryPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<BatchSummary[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<string | null>(null);

  const parseTimestamp = (value?: string) => {
    if (!value) return 0;
    const time = Date.parse(value);
    return Number.isNaN(time) ? 0 : time;
  };

  const formatTimestamp = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? '' : date.toLocaleString();
  };

  const normalizeSummary = (raw: any): BatchSummary => ({
    id: raw?.id || raw?.researchGoalId || '',
    researchGoalId: raw?.researchGoalId || '',
    interviewIds: Array.isArray(raw?.interviewIds) ? raw.interviewIds : [],
    keyThemes: Array.isArray(raw?.keyThemes) ? raw.keyThemes : [],
    summary: raw?.summary || '',
    overallProfile: raw?.overallProfile || '',
    insights: Array.isArray(raw?.insights) ? raw.insights : [],
    pains: Array.isArray(raw?.pains) ? raw.pains : [],
    gains: Array.isArray(raw?.gains) ? raw.gains : [],
    jobs: Array.isArray(raw?.jobs) ? raw.jobs : [],
    participantCount: typeof raw?.participantCount === 'number'
      ? raw.participantCount
      : (Array.isArray(raw?.interviewIds) ? raw.interviewIds.length : 0),
    createdAt: typeof raw?.createdAt === 'string' ? raw.createdAt : undefined,
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : undefined,
    hasSummary: typeof raw?.hasSummary === 'boolean'
      ? raw.hasSummary
      : Boolean(raw?.summary || (Array.isArray(raw?.keyThemes) && raw.keyThemes.length > 0)),
    targetAudience: typeof raw?.targetAudience === 'string' ? raw.targetAudience : undefined,
  });

  const upsertSummary = (summary: BatchSummary) => {
    setSummaries((prev) => {
      const filtered = prev.filter((item) => item.researchGoalId !== summary.researchGoalId);
      const next = [summary, ...filtered];
      return next.sort((a, b) => parseTimestamp(b.updatedAt) - parseTimestamp(a.updatedAt));
    });
  };

  const loadBatches = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/batch-summary`, { cache: 'no-store' });
      const j = await res.json();
      if (res.ok && Array.isArray(j.batches)) {
        const rows = (j.batches as any[]).map(normalizeSummary);
        const sorted = rows.sort((a, b) => parseTimestamp(b.updatedAt) - parseTimestamp(a.updatedAt));

      setSummaries(sorted);
      const defaultGoal =
        sorted.find((row) => row.hasSummary)?.researchGoalId ||
        sorted.find((row) => (row.participantCount ?? row.interviewIds.length) > 0)?.researchGoalId ||
        sorted[0]?.researchGoalId ||
        null;

      setExpandedGoal((current) => {
        if (current && sorted.some((row) => row.researchGoalId === current)) {
          return current;
        }
        return defaultGoal;
      });
    }
    } catch (error) {
      console.warn('[BATCH SUMMARY] Failed to load batches', error);
    }
  }, []);

  const rebuildAllSummaries = useCallback(async () => {
    if (bulkLoading) return;
    setBulkStatus(null);

    setBulkLoading(true);
    try {
      const res = await fetch('/api/sessions/batch-summary/rebuild', {
        method: 'POST',
        cache: 'no-store'
      });
      const j = await res.json();
      if (!res.ok) {
        throw new Error(j?.error || `HTTP ${res.status}`);
      }

      const failureCount = Array.isArray(j.errors) ? j.errors.length : 0;
      const skippedCount = typeof j.skipped === 'number' ? j.skipped : 0;
      const parts = [`Updated ${j.updated} of ${j.total} research goals.`];
      if (skippedCount > 0) {
        parts.push(`${skippedCount} skipped.`);
      }
      if (failureCount > 0) {
        parts.push(`${failureCount} failed.`);
      }
      setBulkStatus({
        type: failureCount > 0 ? 'error' : 'success',
        message: parts.join(' ')
      });

      await loadBatches();
    } catch (e: any) {
      setBulkStatus({
        type: 'error',
        message: e?.message || 'Failed to rebuild batch summaries'
      });
    } finally {
      setBulkLoading(false);
    }
  }, [bulkLoading, loadBatches]);

  const handleDeleteBatch = useCallback(async (goalId: string) => {
    if (!goalId) return;
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Delete this batch summary and all related interviews?');
      if (!confirmed) return;
    }

    setError(null);
    setDeletingGoal(goalId);
    try {
      const res = await fetch(`/api/sessions/batch-summary/${encodeURIComponent(goalId)}`, {
        method: 'DELETE'
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j?.error || `HTTP ${res.status}`);
      }

      setSummaries((prev) => prev.filter((item) => item.researchGoalId !== goalId));
      setExpandedGoal((prev) => (prev === goalId ? null : prev));

      try {
        await loadBatches();
      } catch (refreshError) {
        console.warn('[BATCH SUMMARY] Failed to refresh after delete:', refreshError);
      }

      setBulkStatus({
        type: 'success',
        message: `Deleted batch summary for “${goalId}”.`
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to delete batch summary');
    } finally {
      setDeletingGoal(null);
    }
  }, []);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  async function handleRefreshGoal(goalToRefresh: string) {
    if (!goalToRefresh) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/batch-summary/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ researchGoalId: goalToRefresh }),
        cache: 'no-store'
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      const j = await res.json();
      const summary = normalizeSummary(j.batchSummary);
      setExpandedGoal(summary.researchGoalId);
      upsertSummary(summary);
    } catch (e: any) {
      setError(e?.message || 'Failed to refresh batch summary');
    } finally {
      setLoading(false);
    }
  }

  const SummaryCard = ({
    summary,
    expanded,
    onToggle,
    onRefresh,
    onDelete,
    deleting
  }: {
    summary: BatchSummary;
    expanded: boolean;
    onToggle: () => void;
    onRefresh: () => void;
    onDelete: () => void;
    deleting: boolean;
  }) => {
    const keyThemes = summary.keyThemes ?? [];
    const insights = summary.insights ?? [];
    const pains = summary.pains ?? [];
    const gains = summary.gains ?? [];
    const jobs = summary.jobs ?? [];
    const updatedLabel = formatTimestamp(summary.updatedAt);
    const hasSummary = summary.hasSummary !== false && (
      Boolean(summary.summary && summary.summary.trim()) ||
      keyThemes.length > 0 ||
      insights.length > 0 ||
      pains.length > 0 ||
      gains.length > 0 ||
      jobs.length > 0
    );

    const topThemes = keyThemes.slice(0, 3);
    const maxThemeCount =
      keyThemes.reduce((max, theme) => {
        const count = typeof theme.count === 'number' ? theme.count : 0;
        return count > max ? count : max;
      }, 0) || 0;
    const statusLabel = hasSummary ? 'Summary ready' : 'Needs generation';
    const statusStyles = hasSummary
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-amber-100 text-amber-800 border-amber-200';

    return (
      <div className={`bg-white rounded-lg shadow border ${expanded ? 'border-blue-300 ring-1 ring-blue-200' : 'border-transparent'} transition`}> 
        <div className="p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Research Goal</p>
              <h3 className="text-lg font-semibold text-gray-900 break-words">
                {summary.researchGoalId || 'Untitled goal'}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${statusStyles}`}>
                  {statusLabel}
                </span>
                {summary.targetAudience && (
                  <span className="text-xs text-gray-500">Audience: {summary.targetAudience}</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {(summary.participantCount ?? summary.interviewIds.length ?? 0)} interviews
                {updatedLabel ? ` • ${updatedLabel}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="flex flex-wrap gap-2 justify-end">
                {topThemes.length > 0 ? (
                  topThemes.map((t, idx) => (
                    <span
                      key={`${t.theme}-${idx}`}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${
                        t.count === maxThemeCount && maxThemeCount > 0
                          ? 'bg-yellow-100 border-yellow-300 text-yellow-900'
                          : 'bg-gray-100 border-gray-200 text-gray-700'
                      }`}
                    >
                      {t.theme} ({t.count})
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">No key themes yet</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onToggle}
                  className="px-3 py-1 text-xs rounded border border-gray-300 hover:border-blue-400 hover:text-blue-700"
                >
                  {expanded ? 'Hide details' : 'View details'}
                </button>
                <button
                  onClick={onDelete}
                  disabled={deleting}
                  className="px-3 py-1 text-xs rounded border border-red-300 text-red-600 hover:border-red-500 hover:text-red-700 disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>

          {expanded && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {hasSummary ? (
                <>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
                    <p className="text-gray-700 whitespace-pre-line">
                      {summary.summary || 'No summary text available.'}
                    </p>
                    <h4 className="font-semibold text-gray-900 mt-4 mb-2">Overall Profile</h4>
                    <p className="text-gray-700 whitespace-pre-line">
                      {summary.overallProfile || 'No profile available.'}
                    </p>
                    <h4 className="font-semibold text-gray-900 mt-4 mb-2">Insights</h4>
                    <ul className="list-disc pl-5 text-gray-700 space-y-1">
                      {insights.length > 0 ? (
                        insights.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))
                      ) : (
                        <li className="text-gray-500 italic">No insights recorded.</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Key Themes</h4>
                    <div className="flex flex-wrap gap-2">
                      {keyThemes.length > 0 ? (
                        keyThemes.map((t, idx) => (
                          <span
                            key={`${t.theme}-${idx}`}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${
                              t.count === maxThemeCount && maxThemeCount > 0
                                ? 'bg-yellow-100 border-yellow-300 text-yellow-900'
                                : 'bg-gray-100 border-gray-300 text-gray-800'
                            }`}
                            title={`${t.count} ${t.count === 1 ? 'mention' : 'mentions'}`}
                          >
                            {t.theme} ({t.count})
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500 italic">No themes identified yet.</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <h5 className="font-medium text-gray-900">Pains</h5>
                        <ul className="list-disc pl-5 text-gray-700 space-y-1">
                          {pains.length > 0 ? (
                            pains.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))
                          ) : (
                            <li className="text-gray-500 italic">No pains captured.</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">Gains</h5>
                        <ul className="list-disc pl-5 text-gray-700 space-y-1">
                          {gains.length > 0 ? (
                            gains.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))
                          ) : (
                            <li className="text-gray-500 italic">No gains captured.</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">Jobs</h5>
                        <ul className="list-disc pl-5 text-gray-700 space-y-1">
                          {jobs.length > 0 ? (
                            jobs.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))
                          ) : (
                            <li className="text-gray-500 italic">No jobs captured.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="col-span-full text-sm text-gray-500 italic">
                  Summary has not been generated yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const filteredSummaries = summaries.filter((item) => (item.researchGoalId || '').trim().length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Batch Summary</h1>
          <p className="text-gray-600">View aggregated insights across interviews for a research goal.</p>
        </div>

        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Batch Actions</h2>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              All research goals with activity are listed below. Use the status indicator to see which batches still need a summary.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => void rebuildAllSummaries()}
                disabled={bulkLoading}
                className="text-xs px-2 py-1 border rounded bg-blue-600 text-white disabled:opacity-50"
              >
                {bulkLoading ? 'Generating…' : 'Generate all summaries'}
              </button>
              <button
                onClick={() => void loadBatches()}
                className="text-xs px-2 py-1 border rounded"
              >
                Refresh list
              </button>
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-600 mt-3">{error}</p>
          )}
          {loading && (
            <p className="text-sm text-gray-500 mt-3">Working…</p>
          )}
          {bulkStatus && (
            <p
              className={`text-xs mt-2 ${
                bulkStatus.type === 'error' ? 'text-red-600' : 'text-gray-600'
              }`}
            >
              {bulkStatus.message}
            </p>
          )}
        </div>

        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Available Batch Summaries</h2>
            <span className="text-sm text-gray-500">{filteredSummaries.length} total</span>
          </div>
          {filteredSummaries.length === 0 ? (
            <p className="text-sm text-gray-500">No completed interview batches yet.</p>
          ) : (
            <div className="space-y-6">
              {filteredSummaries.map((summary) => {
                const isExpanded = expandedGoal === summary.researchGoalId;
                const detail = summary;
                return (
                  <SummaryCard
                    key={summary.id || summary.researchGoalId}
                    summary={detail}
                    expanded={isExpanded}
                    onToggle={() => {
                      setExpandedGoal((prev) => (prev === summary.researchGoalId ? null : summary.researchGoalId));
                      setError(null);
                    }}
                    onRefresh={() => handleRefreshGoal(summary.researchGoalId)}
                    onDelete={() => handleDeleteBatch(summary.researchGoalId)}
                    deleting={deletingGoal === summary.researchGoalId}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
