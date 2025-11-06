"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

export default function BatchSummaryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const goal = searchParams.get("goal");
    const session = searchParams.get("session");
    
    const params = new URLSearchParams();
    params.set("step", "batch-summary");
    if (goal) params.set("goal", goal);
    if (session) params.set("session", session);
    
    router.replace(`/admin?${params.toString()}`);
  }, [searchParams, router]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050013] text-zinc-100 flex items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/40 border-t-cyan-300 mx-auto mb-4" />
        <p className="text-sm text-zinc-400">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}

