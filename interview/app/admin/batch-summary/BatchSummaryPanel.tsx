"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  FileText,
  Layers,
  RefreshCcw,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { SessionCard } from "../components/SessionCard";
import ShinyText from "@/app/components/ui/shiny-text";

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

type SessionInfo = {
  sessionId: string;
  researchGoal?: string;
  participantEmail?: string;
  status?: string;
  updatedAt?: string;
  sessionUrl?: string;
  summaries?: any[];
  summary?: string;
  keyFindings?: string[];
  pains?: string[];
  gains?: string[];
  jobs?: string[];
  transcript?: any[];
  psychometricProfile?: any;
  targetAudience?: string;
  durationMinutes?: number;
  duration?: number;
  endTime?: string;
};

interface BatchSummaryPanelProps {
  embedded?: boolean;
  focusSessionId?: string | null;
  focusGoalId?: string | null;
}

const parseTimestamp = (value?: string) => {
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
};

const formatTimestamp = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : date.toLocaleString();
};

const normalizeSummary = (raw: any): BatchSummary => ({
  id: raw?.id || raw?.researchGoalId || "",
  researchGoalId: raw?.researchGoalId || "",
  interviewIds: Array.isArray(raw?.interviewIds) ? raw.interviewIds : [],
  keyThemes: Array.isArray(raw?.keyThemes) ? raw.keyThemes : [],
  summary: raw?.summary || "",
  overallProfile: raw?.overallProfile || "",
  insights: Array.isArray(raw?.insights) ? raw.insights : [],
  pains: Array.isArray(raw?.pains) ? raw.pains : [],
  gains: Array.isArray(raw?.gains) ? raw.gains : [],
  jobs: Array.isArray(raw?.jobs) ? raw.jobs : [],
  participantCount:
    typeof raw?.participantCount === "number"
      ? raw.participantCount
      : Array.isArray(raw?.interviewIds)
        ? raw.interviewIds.length
        : 0,
  createdAt: typeof raw?.createdAt === "string" ? raw.createdAt : undefined,
  updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : undefined,
  hasSummary:
    typeof raw?.hasSummary === "boolean"
      ? raw.hasSummary
      : Boolean(
          raw?.summary ||
            (Array.isArray(raw?.keyThemes) && raw.keyThemes.length > 0),
        ),
  targetAudience:
    typeof raw?.targetAudience === "string" ? raw.targetAudience : undefined,
});

export default function BatchSummaryPanel({
  embedded = false,
  focusSessionId = null,
  focusGoalId = null,
}: BatchSummaryPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<BatchSummary[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<string | null>(null);
  const [sessionMap, setSessionMap] = useState<Map<string, SessionInfo>>(new Map());
  const [expandedSessionsByGoal, setExpandedSessionsByGoal] = useState<Record<string, string | null>>({});
  const appliedGoalRef = useRef<string | null>(null);

  const loadSessionsForBatch = useCallback(async (interviewIds: string[]) => {
    if (interviewIds.length === 0) return;

    try {
      const sessionPromises = interviewIds.map(async (sessionId) => {
        try {
          const res = await fetch(
            `/api/sessions?sessionId=${encodeURIComponent(sessionId)}`,
            { cache: "no-store" },
          );
          if (res.ok) {
            const data = await res.json();
            return { sessionId, session: data.session };
          }
          // Silently handle 404s - sessions may have been deleted
          if (res.status === 404) {
            return { sessionId, session: null };
          }
          // Log other errors but don't spam console
          if (res.status >= 500) {
            console.warn(`[BATCH SUMMARY] Server error loading session ${sessionId}:`, res.status);
          }
          return { sessionId, session: null };
        } catch (err) {
          // Only log non-network errors
          if (err instanceof TypeError && err.message.includes('fetch')) {
            // Network error - likely server not responding, skip logging
            return { sessionId, session: null };
          }
          console.warn(`[BATCH SUMMARY] Failed to load session ${sessionId}:`, err);
          return { sessionId, session: null };
        }
      });

      const results = await Promise.all(sessionPromises);
      const newMap = new Map<string, SessionInfo>();

      results.forEach(({ sessionId, session }) => {
        if (session) {
          newMap.set(sessionId, {
            sessionId,
            researchGoal: session.researchGoal,
            participantEmail: session.participantEmail,
            status: session.status,
            updatedAt: session.updatedAt || session.createdAt,
            sessionUrl: session.sessionUrl || `/respondent?session=${sessionId}`,
            summaries: session.summaries,
            summary: session.summary,
            keyFindings: session.keyFindings,
            transcript: session.transcript,
            psychometricProfile: session.psychometricProfile,
            targetAudience: session.targetAudience,
            durationMinutes: session.durationMinutes,
            duration: session.duration,
            endTime: session.endTime,
            pains: session.summaries?.[0]?.pains,
            gains: session.summaries?.[0]?.gains,
            jobs: session.summaries?.[0]?.jobs,
          });
        } else {
          newMap.set(sessionId, {
            sessionId,
            sessionUrl: `/respondent?session=${sessionId}`,
          });
        }
      });

      setSessionMap((prev) => {
        const merged = new Map(prev);
        newMap.forEach((value, key) => merged.set(key, value));
        return merged;
      });
    } catch (err) {
      console.warn("[BATCH SUMMARY] Failed to load sessions:", err);
    }
  }, []);

  const upsertSummary = useCallback((summary: BatchSummary) => {
    setSummaries((prev) => {
      const filtered = prev.filter(
        (item) => item.researchGoalId !== summary.researchGoalId,
      );
      const next = [summary, ...filtered];
      return next.sort(
        (a, b) => parseTimestamp(b.updatedAt) - parseTimestamp(a.updatedAt),
      );
    });
    // Only load sessions if this batch is currently expanded
    if (summary.interviewIds.length > 0 && expandedGoal === summary.researchGoalId) {
      void loadSessionsForBatch(summary.interviewIds);
    }
  }, [loadSessionsForBatch, expandedGoal]);

  const loadBatches = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/batch-summary`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok && Array.isArray(json.batches)) {
        const rows = (json.batches as any[]).map(normalizeSummary);
        const sorted = rows.sort(
          (a, b) => parseTimestamp(b.updatedAt) - parseTimestamp(a.updatedAt),
        );
        setSummaries(sorted);

        const defaultGoal =
          focusGoalId ??
          sorted.find((row) => row.hasSummary)?.researchGoalId ??
          sorted.find((row) =>
            (row.participantCount ?? row.interviewIds.length) > 0,
          )?.researchGoalId ??
          sorted[0]?.researchGoalId ??
          null;

        setExpandedGoal((current) => {
          const goalToExpand = current || defaultGoal;
          if (goalToExpand) {
            // Load sessions only for the expanded/focused batch
            const batchToLoad = sorted.find((row) => row.researchGoalId === goalToExpand);
            if (batchToLoad && batchToLoad.interviewIds.length > 0) {
              void loadSessionsForBatch(batchToLoad.interviewIds);
            }
          }
          return goalToExpand;
        });
      }
    } catch (err) {
      console.warn("[BATCH SUMMARY] Failed to load batches", err);
    }
  }, [focusGoalId, loadSessionsForBatch]);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    if (!focusSessionId) {
      return;
    }
    const containingSummary = summaries.find((summary) =>
      summary.interviewIds.includes(focusSessionId)
    );
    if (containingSummary) {
      setExpandedGoal(containingSummary.researchGoalId);
      setExpandedSessionsByGoal((prev) => ({
        ...prev,
        [containingSummary.researchGoalId]: focusSessionId,
      }));
    }
  }, [focusSessionId, summaries]);

  const rebuildAllSummaries = useCallback(async () => {
    if (bulkLoading) return;
    setBulkStatus(null);
    setBulkLoading(true);
    try {
      const res = await fetch("/api/sessions/batch-summary/rebuild", {
        method: "POST",
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      const failureCount = Array.isArray(json.errors) ? json.errors.length : 0;
      const skippedCount = typeof json.skipped === "number" ? json.skipped : 0;
      const parts = [`Updated ${json.updated} of ${json.total} research goals.`];
      if (skippedCount > 0) parts.push(`${skippedCount} skipped.`);
      if (failureCount > 0) parts.push(`${failureCount} failed.`);
      setBulkStatus({
        type: failureCount > 0 ? "error" : "success",
        message: parts.join(" "),
      });
      await loadBatches();
    } catch (e: any) {
      setBulkStatus({
        type: "error",
        message: e?.message || "Failed to rebuild batch summaries",
      });
    } finally {
      setBulkLoading(false);
    }
  }, [bulkLoading, loadBatches]);

  const handleRefreshGoal = useCallback(
    async (goal: string) => {
      if (!goal) return;
      setError(null);
      setLoading(true);
      try {
        const res = await fetch("/api/sessions/batch-summary/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ researchGoalId: goal }),
          cache: "no-store",
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error || `HTTP ${res.status}`);
        }
        const json = await res.json();
        const summary = normalizeSummary(json.batchSummary);
        setExpandedGoal(summary.researchGoalId);
        upsertSummary(summary);
      } catch (e: any) {
        setError(e?.message || "Failed to refresh batch summary");
      } finally {
        setLoading(false);
      }
    },
    [upsertSummary],
  );

  const handleDelete = useCallback(async (goal: string) => {
    if (!goal) return;
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Delete this batch summary and all related interviews?",
      );
      if (!confirmed) return;
    }
    setError(null);
    setDeletingGoal(goal);
    try {
      const res = await fetch(`/api/sessions/batch-summary/${encodeURIComponent(goal)}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      setSummaries((prev) => prev.filter((item) => item.researchGoalId !== goal));
      setExpandedGoal((prev) => (prev === goal ? null : prev));
      setBulkStatus({
        type: "success",
        message: `Deleted batch summary for “${goal}”.`,
      });
    } catch (e: any) {
      setError(e?.message || "Failed to delete batch summary");
    } finally {
      setDeletingGoal(null);
    }
  }, []);

  const filteredSummaries = useMemo(
    () => summaries.filter((item) => (item.researchGoalId || "").trim().length > 0),
    [summaries],
  );

  const mainHeader = (
    <header className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">
        <Sparkles className="h-4 w-4 text-cyan-300" />
        <ShinyText text="Interview Intelligence" speed={4} className="text-sm" />
      </div>
      <h1 className="text-3xl font-semibold text-white sm:text-4xl">Batch Summaries</h1>
      <p className="max-w-2xl text-sm text-zinc-400">
        Aggregate insights across every interview goal. Regenerate summaries in bulk or refresh a single goal to keep reports aligned with the latest conversations.
      </p>
    </header>
  );

  return (
    <div className={embedded ? "space-y-10" : "space-y-10"}>
      {mainHeader}

      {(error || loading || bulkStatus) && (
        <section className="rounded-2xl border border-zinc-700/40 bg-white/8 p-6 lg:p-8">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/40 border-t-cyan-300" />
              Working…
            </div>
          )}
          {bulkStatus && (
            <div
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
                bulkStatus.type === "error"
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {bulkStatus.type === "success" && (
                <TrendingUp className="h-4 w-4 flex-shrink-0" />
              )}
              {bulkStatus.type === "error" && (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              {bulkStatus.message}
            </div>
          )}
        </section>
      )}

      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Available Batch Summaries</h2>
            <p className="mt-1 text-sm text-zinc-400">
              View and manage aggregated insights across interview sessions
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-zinc-700/60 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200">
              {filteredSummaries.length} {filteredSummaries.length === 1 ? "batch" : "batches"}
            </span>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200">
              {filteredSummaries.filter((s) => s.hasSummary).length} with summaries
            </span>
            <button
              onClick={() => void rebuildAllSummaries()}
              disabled={bulkLoading}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-teal-300 px-4 py-2 text-sm font-semibold text-[#050013] shadow-lg shadow-cyan-900/40 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-cyan-400/60 disabled:from-zinc-600 disabled:via-zinc-500 disabled:to-zinc-600 disabled:text-zinc-200 disabled:opacity-80 disabled:cursor-not-allowed"
            >
              <RefreshCcw className={`h-4 w-4 ${bulkLoading ? "animate-spin" : ""}`} />
              {bulkLoading ? "Generating…" : "Generate all summaries"}
            </button>
          </div>
        </div>

        {filteredSummaries.length === 0 ? (
          <div className="rounded-2xl border border-zinc-700/40 bg-white/8 p-12 text-center">
            <Layers className="mx-auto mb-4 h-12 w-12 text-zinc-500" />
            <p className="text-sm text-zinc-400 mb-2">No completed interview batches yet.</p>
            <p className="text-xs text-zinc-500">Complete some interviews to see batch summaries here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredSummaries.map((summary) => {
              const sessions = summary.interviewIds
                .map((id) => sessionMap.get(id))
                .filter((s): s is SessionInfo => Boolean(s));
              const isExpanded = expandedGoal === summary.researchGoalId;

              return (
                <div
                  key={summary.id || summary.researchGoalId}
                  data-goal-id={summary.researchGoalId}
                  className={`rounded-2xl border border-zinc-700/40 bg-white/8 transition-all duration-200 ${
                    isExpanded ? "border-cyan-400/60 shadow-lg shadow-cyan-900/20" : "hover:border-zinc-600/60"
                  }`}
                >
                  <div className="p-6 lg:p-8">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr] xl:grid-cols-[3fr_2fr]">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">
                          <Layers className="h-4 w-4 text-cyan-300" />
                          Research Goal
                        </div>
                        <h3 className="text-2xl font-semibold text-white break-words leading-tight">
                          {summary.researchGoalId || "Untitled goal"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                              summary.hasSummary
                                ? "border border-emerald-400/60 bg-emerald-400/15 text-emerald-100"
                                : "border border-amber-400/60 bg-amber-400/15 text-amber-100"
                            }`}
                          >
                            {summary.hasSummary ? "Summary ready" : "Needs generation"}
                          </span>
                          {summary.targetAudience && (
                            <span className="inline-flex items-center rounded-full border border-zinc-700/50 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-300">
                              {summary.targetAudience}
                            </span>
                          )}
                          <span className="inline-flex items-center rounded-full border border-zinc-700/50 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-300">
                            {summary.participantCount ?? summary.interviewIds.length ?? 0} interviews
                          </span>
                          {summary.updatedAt && (
                            <span className="inline-flex items-center rounded-full border border-zinc-700/50 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-400">
                              Updated {formatTimestamp(summary.updatedAt)}
                            </span>
                          )}
                        </div>
                        {summary.keyThemes.slice(0, 3).length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {summary.keyThemes.slice(0, 3).map((t, idx) => (
                              <span
                                key={`${t.theme}-${idx}`}
                                className="inline-flex items-center rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200"
                              >
                                {t.theme}
                                <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">
                                  {t.count}
                                </span>
                              </span>
                            ))}
                            {summary.keyThemes.length > 3 && (
                              <span className="inline-flex items-center rounded-full border border-zinc-700/50 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-400">
                                +{summary.keyThemes.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-start lg:items-end gap-3">
                        <div className="flex flex-wrap gap-2 w-full lg:justify-end">
                          <button
                            onClick={() => {
                              setExpandedGoal((prev) => {
                                const newGoal = prev === summary.researchGoalId ? null : summary.researchGoalId;
                                // Load sessions when expanding a batch
                                if (newGoal && summary.interviewIds.length > 0) {
                                  void loadSessionsForBatch(summary.interviewIds);
                                }
                                return newGoal;
                              });
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700/40 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-cyan-400/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                          >
                            {isExpanded ? "Hide details" : "View details"}
                          </button>
                          <button
                            onClick={() => handleRefreshGoal(summary.researchGoalId)}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700/40 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-cyan-400/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Refresh
                          </button>
                          <button
                            onClick={() => handleDelete(summary.researchGoalId)}
                            disabled={deletingGoal === summary.researchGoalId}
                            className="inline-flex items-center gap-2 rounded-full border border-rose-500/60 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20 focus:outline-none focus:ring-2 focus:ring-rose-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {deletingGoal === summary.researchGoalId ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-8 space-y-8">
                        {(summary.summary || summary.overallProfile || summary.insights.length > 0) && (
                          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr] xl:grid-cols-[3fr_2fr]">
                            <div className="space-y-6 min-w-0">
                              <div className="rounded-xl border border-zinc-700/40 bg-white/5 p-6">
                                <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">
                                  <FileText className="h-4 w-4 text-cyan-300" />
                                  Batch Summary
                                </h4>
                                <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-200">
                                  {summary.summary || "No summary text available."}
                                </p>
                              </div>
                              <div className="rounded-xl border border-zinc-700/40 bg-white/5 p-6">
                                <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">
                                  <Sparkles className="h-4 w-4 text-cyan-300" />
                                  Overall Profile
                                </h4>
                                <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-200">
                                  {summary.overallProfile || "No profile available."}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-6">
                              <div className="rounded-xl border border-zinc-700/40 bg-white/5 p-6">
                                <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">
                                  <TrendingUp className="h-4 w-4 text-cyan-300" />
                                  Key Themes
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {summary.keyThemes.length > 0 ? (
                                    summary.keyThemes.map((t, idx) => (
                                      <span
                                        key={`${t.theme}-${idx}`}
                                        className="inline-flex items-center rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200"
                                        title={`${t.count} ${t.count === 1 ? "mention" : "mentions"}`}
                                      >
                                        {t.theme}
                                        <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">
                                          {t.count}
                                        </span>
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-zinc-500 italic">No themes identified yet.</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {sessions.length > 0 && (
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">
                              Interview Sessions
                            </h4>
                            <div className="space-y-4">
                              {sessions.map((session) => {
                                const sessionId = session.sessionId;
                                const expandedSessionId = expandedSessionsByGoal[summary.researchGoalId] ?? null;
                                return (
                                  <SessionCard
                                    key={sessionId}
                                    session={session}
                                    expanded={expandedSessionId === sessionId}
                                    onToggle={() =>
                                      setExpandedSessionsByGoal((prev) => ({
                                        ...prev,
                                        [summary.researchGoalId]: prev[summary.researchGoalId] === sessionId ? null : sessionId,
                                      }))
                                    }
                                    formatDateTime={formatTimestamp}
                                    showRespondentLink={false}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}


