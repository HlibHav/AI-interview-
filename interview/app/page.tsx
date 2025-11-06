"use client";

import Link from "next/link";
import {
  Activity,
  BarChart3,
  Brain,
  Mic,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";

import ShinyText from "@/app/components/ui/shiny-text";
import SpotlightCard from "@/app/components/ui/spotlight-card";

const features = [
  {
    icon: <Brain className="h-6 w-6 text-cyan-300" />,
    title: "AI-Powered Interviewing",
    description:
      "Agents adapt to every response with empathetic follow-ups, clarifying remarks, and dynamic pacing.",
  },
  {
    icon: <BarChart3 className="h-6 w-6 text-emerald-300" />,
    title: "Psychological Profiling",
    description:
      "Generate Big Five and Enneagram insights backed by transparent evidence pulled from the transcript.",
  },
  {
    icon: <Activity className="h-6 w-6 text-violet-300" />,
    title: "Real-time Analysis",
    description:
      "Live transcription, summaries, and sentiment tracking make it simple to act on interview moments.",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050013] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(76,29,149,0.45),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(14,165,233,0.35),_transparent_60%)]" />
        <div className="absolute inset-0 backdrop-blur-[100px]" />
      </div>

      <div className="container relative mx-auto flex min-h-screen flex-col px-6 pb-32 pt-24 sm:px-10 lg:px-16">
        <header className="mx-auto max-w-3xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2 text-sm font-medium uppercase tracking-[0.3em] text-zinc-300">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            <ShinyText text="Qualitative Research, Reimagined" speed={4} className="text-base" />
          </div>
          <h1 className="bg-gradient-to-r from-white via-cyan-100 to-emerald-100 bg-clip-text text-5xl font-bold text-transparent sm:text-6xl">
            AI Interview Assistant
          </h1>
          <p className="mt-6 text-lg text-zinc-300 sm:text-xl">
            Conduct deep, human interviews without a human moderator. Our agents listen, probe,
            and synthesize insights so your team can ship confident decisions faster.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4 text-sm text-zinc-200">
            <div className="rounded-full border border-zinc-700/60 bg-zinc-900/50 px-4 py-1.5 backdrop-blur">
              <span className="font-semibold text-white">Trusted workshops</span> with product teams
            </div>
            <div className="rounded-full border border-zinc-700/60 bg-zinc-900/50 px-4 py-1.5 backdrop-blur">
              Built on <span className="font-semibold text-white">OpenAI + Weaviate</span>
            </div>
            <div className="rounded-full border border-zinc-700/60 bg-zinc-900/50 px-4 py-1.5 backdrop-blur">
              24/7 <span className="font-semibold text-white">participant experience</span>
            </div>
          </div>
        </header>

        <main className="mt-20 flex flex-1 flex-col gap-16">
          <section className="grid gap-8 md:grid-cols-2">
            <SpotlightCard className="h-full border-zinc-700/60 bg-white/5 p-10 backdrop-blur">
              <Link href="/admin" className="group flex h-full flex-col focus:outline-none">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-10 w-10 rounded-full bg-cyan-500/20 p-2 text-cyan-200" />
                    <h2 className="text-2xl font-semibold text-white">Admin Dashboard</h2>
                  </div>
                  <svg
                    className="h-5 w-5 text-cyan-100 transition-transform duration-300 group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p className="mt-6 text-base text-zinc-300">
                  Design research programs, generate interview scripts, and monitor sentiment at scale. Perfect
                  for product, UX, and insights teams.
                </p>
                <div className="mt-auto flex items-center gap-2 pt-6 text-sm font-medium text-cyan-200 transition-colors group-hover:text-cyan-100">
                  Access dashboard
                  <svg className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </SpotlightCard>

            <SpotlightCard className="h-full border-zinc-700/60 bg-white/5 p-10 backdrop-blur">
              <Link href="/respondent" className="group flex h-full flex-col focus:outline-none">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mic className="h-10 w-10 rounded-full bg-emerald-500/20 p-2 text-emerald-200" />
                    <h2 className="text-2xl font-semibold text-white">Interview Session</h2>
                  </div>
                  <svg
                    className="h-5 w-5 text-emerald-100 transition-transform duration-300 group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p className="mt-6 text-base text-zinc-300">
                  Give participants a comfortable space to share stories with voice, video, and active
                  listening cues powered by AI moderation.
                </p>
                <div className="mt-auto flex items-center gap-2 pt-6 text-sm font-medium text-emerald-200 transition-colors group-hover:text-emerald-100">
                  Start interviewing
                  <svg className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </SpotlightCard>
          </section>

          <section className="mx-auto w-full max-w-5xl">
            <h3 className="text-center text-3xl font-semibold text-white">Key Capabilities</h3>
            <p className="mx-auto mt-3 max-w-2xl text-center text-base text-zinc-300">
              Every component works together: planning agents orchestrate conversations, interviewers record
              nuance, and summarizers surface the signal that matters.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {features.map((feature) => (
                <SpotlightCard
                  key={feature.title}
                  className="border-zinc-700/60 bg-zinc-900/70 p-6 text-left backdrop-blur"
                  spotlightColor="rgba(147, 197, 253, 0.2)"
                >
                  <div className="flex h-full flex-col gap-4">
                    <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-widest text-zinc-400">
                      {feature.icon}
                      <span>{feature.title}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-300">{feature.description}</p>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </section>
        </main>
      </div>

    </div>
  );
}
