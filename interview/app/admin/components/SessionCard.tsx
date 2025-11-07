"use client";

import { useMemo } from 'react';
import {
  Brain,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  ExternalLink,
  MessageSquare,
  Target,
  TrendingUp,
  User
} from 'lucide-react';
import { PainGainJobsRow } from './PainGainJobsRow';

type SessionCardProps = {
  session: any;
  expanded: boolean;
  onToggle: () => void;
  formatDateTime: (value?: string) => string;
  showRespondentLink?: boolean;
};

const FALLBACK_PROGRESS_DENOMINATOR = 2;

export function SessionCard({
  session,
  expanded,
  onToggle,
  formatDateTime,
  showRespondentLink = true
}: SessionCardProps) {
  const computed = useMemo(() => {
    const statusRaw = session?.status || 'created';
    const normalizedStatus = statusRaw.toString().toLowerCase();
    const isCompleted = ['completed', 'complete', 'finished'].includes(normalizedStatus);
    const isInProgress = normalizedStatus === 'in_progress';

    const statusConfig = isCompleted
      ? {
          icon: CheckCircle2,
          classes: 'border border-emerald-400/40 bg-emerald-400/15 text-emerald-200 shadow-emerald-500/15'
        }
      : isInProgress
        ? {
            icon: Circle,
            classes: 'border border-cyan-400/40 bg-cyan-400/15 text-cyan-200 shadow-cyan-500/15'
          }
        : {
            icon: Clock,
            classes: 'border border-zinc-600/60 bg-zinc-800/50 text-zinc-400'
          };

    const StatusIcon = statusConfig.icon;

    const transcriptEntries = Array.isArray(session?.transcript) ? session.transcript : [];
    const transcriptCount = transcriptEntries.length;

    const summaryRecord =
      session?.summaries?.[0] ||
      (session?.summary
        ? {
            summary: session.summary,
            keyThemes: session.keyThemes,
            insights: session.keyFindings,
            pains: session.pains,
            gains: session.gains,
            jobs: session.jobs
          }
        : null);

    const summaryText = summaryRecord?.summary || 'Summary not yet generated.';
    const keyInsights: string[] = Array.isArray(summaryRecord?.insights)
      ? summaryRecord.insights
      : Array.isArray(session?.keyFindings)
        ? session.keyFindings
        : [];

    const keyThemes: string[] = Array.isArray(summaryRecord?.keyThemes)
      ? summaryRecord.keyThemes
      : Array.isArray(session?.keyThemes)
        ? session.keyThemes
        : [];

    const pains: string[] = Array.isArray(summaryRecord?.pains)
      ? summaryRecord.pains
      : Array.isArray(session?.pains)
        ? session.pains
        : [];
    const gains: string[] = Array.isArray(summaryRecord?.gains)
      ? summaryRecord.gains
      : Array.isArray(session?.gains)
        ? session.gains
        : [];
    const jobs: string[] = Array.isArray(summaryRecord?.jobs)
      ? summaryRecord.jobs
      : Array.isArray(session?.jobs)
        ? session.jobs
        : [];

    const profile = session?.psychometricProfile || null;
    const traitEntries = profile?.traits ? Object.entries(profile.traits) : [];
    const hasPsychometricProfile = profile && traitEntries.length > 0;

    const questionCount = Array.isArray(session?.script?.questions)
      ? session.script.questions.length
      : Array.isArray(session?.script)
        ? session.script.length
        : 0;
    const turnsFromQuestions = questionCount > 0 ? questionCount * 2 : null;
    const durationMinutes = session?.durationMinutes;
    const plannedDuration = session?.duration || 30;
    const durationBasedTurns = Math.max(
      6,
      Math.ceil(((durationMinutes || plannedDuration || 15) / FALLBACK_PROGRESS_DENOMINATOR))
    );
    const expectedTurns = turnsFromQuestions ?? durationBasedTurns;

    const completionPercentage = isCompleted
      ? 100
      : expectedTurns > 0
        ? Math.min(100, (transcriptCount / expectedTurns) * 100)
        : 0;

    const headerStats = [
      {
        icon: MessageSquare,
        label: 'Transcript',
        value: `${transcriptCount} entries`
      },
      {
        icon: TrendingUp,
        label: 'Insights',
        value: `${keyInsights.length}`
      },
      {
        icon: Brain,
        label: 'Profile',
        value: hasPsychometricProfile ? 'Complete' : 'Pending'
      }
    ];

    const participant = session?.participantEmail || 'Unknown participant';
    const researchGoal = session?.researchGoal || 'Untitled research goal';

    const startTime = session?.createdAt;
    const endTime = session?.endTime;

    const traitSummary = traitEntries.map(([key, entry]) => ({
      trait: key,
      score: entry?.score ?? entry,
      descriptor: entry?.descriptor || ''
    }));

    return {
      statusConfig,
      StatusIcon,
      isCompleted,
      isInProgress,
      summaryText,
      keyInsights,
      keyThemes,
      pains,
      gains,
      jobs,
      profile,
      traitEntries,
      traitSummary,
      hasPsychometricProfile,
      durationMinutes,
      plannedDuration,
      completionPercentage,
      headerStats,
      participant,
      researchGoal,
      startTime,
      endTime,
      transcriptCount
    };
  }, [session]);

  const sessionId = session?.sessionId || 'unknown';

  return (
    <div className="rounded-2xl border border-zinc-700/60 bg-white/5 text-white shadow-lg shadow-black/40">
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500 flex items-center gap-2">
              <Target className="h-4 w-4 text-cyan-300" />
              Research Session
            </p>
            <h3 className="text-2xl font-semibold leading-tight text-white break-words">
              {computed.researchGoal}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700/60 px-3 py-1">
                <User className="h-3.5 w-3.5 text-zinc-500" />
                {computed.participant}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700/60 px-3 py-1">
                <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                {formatDateTime(computed.startTime)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${computed.statusConfig.classes}`}>
              <computed.StatusIcon className="h-4 w-4" />
              {computed.isCompleted ? 'Completed' : computed.isInProgress ? 'In Progress' : 'Scheduled'}
            </div>
            {showRespondentLink && session?.sessionUrl && (
              <a
                href={session.sessionUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-100 shadow shadow-cyan-900/30 transition hover:bg-cyan-500/20"
              >
                <ExternalLink className="h-4 w-4" />
                Respondent link
              </a>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {computed.headerStats.map((stat, idx) => {
            const StatIcon = stat.icon;
            return (
              <div
                key={`${sessionId}-stat-${idx}`}
                className="rounded-xl border border-zinc-700/60 bg-zinc-900/40 p-4"
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 mb-2">
                  <StatIcon className="h-4 w-4 text-cyan-300" />
                  {stat.label}
                </div>
                <p className="text-lg font-semibold text-white">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {computed.completionPercentage < 100 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">
              <span>Progress</span>
              <span className="text-zinc-300">{Math.round(computed.completionPercentage)}%</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800/70 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-teal-300 shadow-cyan-500/30"
                style={{ width: `${computed.completionPercentage}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between text-sm font-medium text-cyan-200 hover:text-white transition-colors group"
        >
          <span className="flex items-center gap-2">
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 group-hover:translate-y-[-2px] transition-transform" />
                Hide details
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 group-hover:translate-y-[2px] transition-transform" />
                View full details
              </>
            )}
          </span>
          <span className="text-xs text-zinc-500 group-hover:text-cyan-300 transition-colors">
            {expanded ? 'Collapse' : 'Expand'}
          </span>
        </button>
      </div>

      {expanded && (
        <div className="px-6 lg:px-8 pb-6 lg:pb-8 space-y-6 border-t border-zinc-700/60 bg-gradient-to-b from-white/5 to-transparent">
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr] xl:grid-cols-[3fr_2fr]">
            <div className="space-y-6 min-w-0">
              <div className="rounded-xl border border-zinc-700/40 bg-white/5 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative h-4 w-4">
                    <div className="absolute inset-0 rounded-sm border border-cyan-300/60" />
                    <div className="absolute inset-0 translate-x-[2px] translate-y-[2px] rounded-sm border border-cyan-500/40 bg-cyan-400/20" />
                  </div>
                  <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">Summary</h4>
                </div>
                <p className="text-sm leading-relaxed text-zinc-200">
                  {computed.summaryText}
                </p>
              </div>

              {computed.keyThemes.length > 0 && (
                <div className="rounded-xl border border-zinc-700/40 bg-white/5 p-5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-cyan-300" />
                    <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">Key Themes</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {computed.keyThemes.map((theme, idx) => (
                      <span
                        key={`${sessionId}-theme-${idx}`}
                        className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-200 transition hover:border-cyan-300/50 hover:bg-cyan-400/20"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {computed.keyInsights.length > 0 && (
                <div className="rounded-xl border border-zinc-700/40 bg-white/5 p-5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="h-4 w-4 text-cyan-300" />
                    <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">Key Insights</h4>
                  </div>
                  <ul className="space-y-2.5">
                    {computed.keyInsights.map((insight, idx) => (
                      <li key={`${sessionId}-insight-${idx}`} className="flex items-start gap-3">
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                        <span className="text-sm leading-relaxed text-zinc-200">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <PainGainJobsRow
                pains={computed.pains}
                gains={computed.gains}
                jobs={computed.jobs}
                idPrefix={sessionId}
                layout="vertical"
              />
            </div>

            <div className="space-y-6">
              <div className="rounded-xl border border-zinc-700/40 bg-white/5 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="h-4 w-4 text-cyan-300" />
                  <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Psychometric Profile
                  </h4>
                </div>
                {computed.hasPsychometricProfile ? (
                  <div className="space-y-3">
                    {computed.traitEntries.map(([trait, info]: [string, any]) => {
                      const rawScore = Number(info?.score ?? info ?? 0);
                      const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(rawScore, 100)) : 0;
                      const explanation = info?.explanation || '';
                      const scoreColor = score >= 70 ? 'text-emerald-300' : score >= 40 ? 'text-cyan-300' : 'text-zinc-400';
                      const barColor = score >= 70
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                        : score >= 40
                          ? 'bg-gradient-to-r from-cyan-400 to-cyan-500'
                          : 'bg-gradient-to-r from-zinc-500 to-zinc-600';

                      return (
                        <div
                          key={`${sessionId}-${trait}`}
                          className="rounded-lg border border-zinc-700/60 bg-white/5 p-4 hover:border-zinc-600/60 transition-colors"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-white capitalize">{trait}</span>
                            <span className={`text-sm font-bold ${scoreColor}`}>
                              {Number.isFinite(rawScore) ? Math.round(score) : '—'}
                              <span className="text-xs text-zinc-500 ml-1">/100</span>
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-zinc-800/80 mb-2">
                            <div className={`h-full rounded-full ${barColor} transition-all duration-500 shadow-sm`} style={{ width: `${score}%` }} />
                          </div>
                          {explanation && (
                            <p className="text-xs leading-snug text-zinc-400 mt-2">{explanation}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-zinc-700/60 bg-zinc-900/30 p-6 text-center">
                    <Brain className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">Psychometric analysis is not yet available for this session.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
