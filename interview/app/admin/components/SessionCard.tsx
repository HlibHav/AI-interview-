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

    const durationMinutes = session?.durationMinutes;
    const plannedDuration = session?.duration || 30;

    const completionPercentage = transcriptCount > 0
      ? Math.min(100, (transcriptCount / (plannedDuration * FALLBACK_PROGRESS_DENOMINATOR)) * 100)
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
        value: hasPsychometricProfile ? 'Ready' : 'Pending'
      },
      {
        icon: Clock,
        label: 'Duration',
        value: durationMinutes ? `${durationMinutes} min` : `${plannedDuration} min planned`
      }
    ];

    return {
      StatusIcon,
      statusConfig,
      isCompleted,
      isInProgress,
      transcriptCount,
      summaryText,
      keyInsights,
      keyThemes,
      pains,
      gains,
      jobs,
      traitEntries,
      hasPsychometricProfile,
      completionPercentage,
      headerStats
    };
  }, [session]);

  const sessionId = session?.sessionId || session?.id;
  const targetAudience = session?.targetAudience || 'Audience n/a';
  const participantEmail = session?.participantEmail;
  const sessionUrl = session?.sessionUrl;

  return (
    <div
      data-session-id={sessionId}
      className={`group relative rounded-2xl border border-zinc-700/40 bg-[#0c0a1a]/70 backdrop-blur transition-all duration-200 ${
        expanded ? 'shadow-xl shadow-cyan-900/20 border-cyan-400/50' : 'hover:shadow-lg hover:shadow-cyan-900/10 hover:border-cyan-400/40'
      }`}
    >
      <div className="p-6 lg:p-7 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${computed.statusConfig.classes}`}>
              <computed.StatusIcon className="h-3 w-3" />
              {(session?.status || 'created').replace(/_/g, ' ').toUpperCase()}
            </span>
            {computed.hasPsychometricProfile && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                Analyzed
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Calendar className="h-3.5 w-3.5" />
            <span>Updated {formatDateTime(session?.updatedAt)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-white leading-snug">
            {session?.researchGoal || 'Untitled research goal'}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              {targetAudience}
            </span>
            {participantEmail && (
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {participantEmail}
              </span>
            )}
            {sessionId && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-zinc-900/60 border border-zinc-700/40 font-mono">
                ID: {sessionId.slice(0, 10)}
              </span>
            )}
          </div>
        </div>

        {computed.isInProgress && computed.transcriptCount > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
              <span>Progress</span>
              <span>{Math.round(computed.completionPercentage)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-800/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${computed.completionPercentage}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {computed.headerStats.map((stat, idx) => {
            const StatIcon = stat.icon;
            return (
              <div
                key={`${sessionId}-stat-${idx}`}
                className="flex items-center gap-2 rounded-lg border border-zinc-700/40 bg-zinc-900/40 px-3 py-2"
              >
                <StatIcon className="h-4 w-4 text-cyan-300" />
                <div className="text-left">
                  <div className="text-xs text-zinc-500">{stat.label}</div>
                  <div className="text-sm font-medium text-zinc-100">{stat.value}</div>
                </div>
              </div>
            );
          })}
        </div>

        {showRespondentLink && sessionUrl && (
          <a
            href={sessionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 text-xs text-cyan-300 hover:text-white transition"
          >
            Open respondent link
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="border-t border-zinc-700/40 bg-white/2 px-6 lg:px-8 py-4">
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

              <PainGainJobsSection pains={computed.pains} gains={computed.gains} jobs={computed.jobs} sessionId={sessionId} />
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

type PainGainJobsProps = {
  pains: string[];
  gains: string[];
  jobs: string[];
  sessionId?: string;
};

function PainGainJobsSection({ pains, gains, jobs, sessionId }: PainGainJobsProps) {
  const sections = [
    {
      title: 'Pains',
      items: pains,
      border: 'border-rose-500/30',
      bg: 'bg-rose-500/10',
      text: 'text-rose-50/90',
      badge: 'bg-rose-500/30 text-rose-100'
    },
    {
      title: 'Gains',
      items: gains,
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-50/90',
      badge: 'bg-emerald-500/30 text-emerald-50'
    },
    {
      title: 'Jobs to be Done',
      items: jobs,
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-50/90',
      badge: 'bg-cyan-500/30 text-cyan-50'
    }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-1 xl:grid-cols-3">
      {sections.map((section, idx) => (
        <div
          key={`${sessionId || 'session'}-pgj-${idx}`}
          className={`rounded-xl border ${section.border} ${section.bg} p-5`}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">{section.title}</h4>
            <span className={`rounded-full px-2 py-0.5 text-xs ${section.badge}`}>{section.items.length}</span>
          </div>
          {section.items.length > 0 ? (
            <ul className={`space-y-2 text-sm ${section.text}`}>
              {section.items.map((item, itemIdx) => (
                <li key={`${sessionId || 'session'}-${section.title}-${itemIdx}`} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-white/70" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-white/60">No {section.title.toLowerCase()} captured.</p>
          )}
        </div>
      ))}
    </div>
  );
}
