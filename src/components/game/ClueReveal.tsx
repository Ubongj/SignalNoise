import { useEffect, useState } from 'react';
import type { GameState } from '@/types/game';
import type { Clue } from '@/types/game';
import { ClueCard } from '@/components/game/ClueCard';

interface ClueRevealProps {
  gameState: GameState;
}

export function ClueReveal({ gameState }: ClueRevealProps) {
  const { role, clues, cluesAnnotated, word, players, roundMeta } = gameState;
  const isGuesser = role === 'guesser';
  const guesser = players.find(p => p.id === roundMeta?.guesserId);

  const [revealed, setRevealed] = useState<number[]>([]);

  // Stagger reveal
  useEffect(() => {
    const items = clues?.length || cluesAnnotated?.length || 0;
    for (let i = 0; i < items; i++) {
      setTimeout(() => setRevealed(prev => [...prev, i]), 300 + i * 350);
    }
  }, [clues?.length, cluesAnnotated?.length]);

  const displayClues = isGuesser
    ? (clues || []).map(text => ({ text, type: 'unknown' }))
    : (cluesAnnotated || []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg text-center animate-fade-in">

        <p className="text-ink-variant text-sm mb-2">All clues revealed</p>
        <h2 className="font-display font-bold text-2xl mb-2">
          {isGuesser ? (
            <span className="text-accent-yellow">Can you spot the lies?</span>
          ) : word ? (
            <span>Word: <span className="text-accent-green">{word}</span></span>
          ) : (
            <span className="text-white/60">Watching the reveal...</span>
          )}
        </h2>

        {isGuesser && (
          <p className="text-white/30 text-sm mb-8">
            {guesser?.name}, study these carefully — some are honest, some are traps.
          </p>
        )}

        {!isGuesser && (
          <p className="text-white/30 text-sm mb-8">
            {guesser?.name} is seeing these now. Green = helpful, Red = misleading.
          </p>
        )}

        {/* Clue cards */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {displayClues.map((clue, i) => {
            const isVisible = revealed.includes(i);
            const typed = clue as Clue & { type: string };
            const tone = isGuesser ? 'neutral' : typed.type === 'helpful' ? 'real' : 'fake';
            return (
              <div
                key={i}
                className={`transition-all duration-500 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <ClueCard label={`C${i + 1}`} text={clue.text} tone={tone} />
              </div>
            );
          })}
        </div>

        {/* Count */}
        {!isGuesser && (
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent-green/50" />
              <span className="text-white/40">{displayClues.filter((c: { type?: string }) => c.type === 'helpful').length} helpful</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent-red/50" />
              <span className="text-white/40">{displayClues.filter((c: { type?: string }) => c.type === 'misleading').length} misleading</span>
            </div>
          </div>
        )}

        <p className="text-white/20 text-sm mt-8 animate-pulse">
          {isGuesser ? 'Get ready to guess...' : `${guesser?.name} will guess in a moment...`}
        </p>
      </div>
    </div>
  );
}
