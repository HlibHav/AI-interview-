export default function Loading() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050013] text-zinc-100">
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/40 border-t-cyan-300 mx-auto mb-4" />
          <p className="text-sm text-zinc-400">Loading batch summaries...</p>
        </div>
      </div>
    </div>
  );
}

