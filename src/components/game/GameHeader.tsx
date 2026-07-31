import { Timer } from '@/components/ui/Timer';
import type { GameState } from '@/types/game';

interface GameHeaderProps {
  gameState: GameState;
}

const phaseLabel: Record<string, string> = {
  ROLE_REVEAL: 'Role reveal',
  CLUE_SUBMISSION: 'Submit clues',
  REVEAL: 'Clue reveal',
  GUESS: 'Guess the word',
  ROUND_END: 'Round result',
  GAME_OVER: 'Game over',
};

export function GameHeader({ gameState }: GameHeaderProps) {
  const { scores, currentRound, totalRounds, phase, phaseEndsAt, phaseDuration } = gameState;

  return (
    <header className="w-full border-b border-outline/60 bg-bg-surface/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-2.5 sm:gap-4">
        {/* Room ID */}
        <span className="font-mono text-xs text-ink-variant/60 tracking-wide hidden sm:block">
          {gameState.roomId}
        </span>

        <div className="flex-1" />

        {/* Round counter — dot bars on sm+, compact number on mobile */}
        {currentRound > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5">
              {Array.from({ length: totalRounds }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-4 rounded-full transition-colors ${
                    i + 1 < currentRound ? 'bg-primary/50' :
                    i + 1 === currentRound ? 'bg-primary' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-ink-variant font-medium whitespace-nowrap">
              R{currentRound}/{totalRounds}
            </span>
          </div>
        )}

        {/* Score */}
        <div className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-bg-card border border-outline shrink-0">
          <span className="text-accent-red font-bold text-base sm:text-lg leading-none">{scores.A}</span>
          <span className="text-ink-variant/40 text-xs">vs</span>
          <span className="text-accent-blue font-bold text-base sm:text-lg leading-none">{scores.B}</span>
        </div>

        {/* Phase + Timer */}
        <div className="flex items-center gap-3 min-w-[84px] sm:min-w-[140px] shrink-0">
          <div className="text-right flex-1">
            <p className="text-ink-variant text-[11px] font-medium leading-tight">
              {phaseLabel[phase] || phase}
            </p>
            {phaseEndsAt && phaseDuration && (
              <Timer
                endsAt={phaseEndsAt}
                duration={phaseDuration}
                showBar={true}
                className="mt-0.5"
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
