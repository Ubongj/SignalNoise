export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />;
}

/**
 * Lobby-shaped placeholder shown while the game page connects — smoother than a
 * bare spinner, and it hints at what's about to appear.
 */
export function GameSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-bg flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        {/* room code */}
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-16 w-52 rounded-xl" />
        </div>
        {/* two team panels */}
        <div className="grid grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="game-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-8" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-7 w-full" />
                <Skeleton className="h-7 w-3/4" />
              </div>
            </div>
          ))}
        </div>
        {/* action bar */}
        <Skeleton className="h-12 w-full" />
        <p className="text-center text-ink-variant/60 text-xs">Connecting to the room…</p>
      </div>
    </div>
  );
}
