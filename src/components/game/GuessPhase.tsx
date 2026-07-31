import { useState } from 'react';
import type { GameState } from '@/types/game';
import { Timer } from '@/components/ui/Timer';
import { ClueCard } from '@/components/game/ClueCard';

interface GuessPhaseProps {
  gameState: GameState;
  onSubmitGuess: (guess: string) => void;
}

export function GuessPhase({ gameState, onSubmitGuess }: GuessPhaseProps) {
  const { role, clues, cluesAnnotated, word, players, roundMeta, phaseEndsAt, phaseDuration } = gameState;
  const isGuesser = role === 'guesser';
  const guesser = players.find(p => p.id === roundMeta?.guesserId);

  const [guess, setGuess] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!guess.trim()) { setError('Type your answer'); return; }
    setSubmitted(true);
    onSubmitGuess(guess.trim());
  };

  const displayClues = isGuesser
    ? (clues || [])
    : (cluesAnnotated || []).map(c => c.text);

  // Spectator view
  if (!isGuesser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg text-center animate-fade-in space-y-6">
          <div className="game-card p-8">
            <div className="text-4xl mb-4">⏳</div>
            <h2 className="font-display font-bold text-2xl text-accent-yellow mb-2">
              {guesser?.name} is guessing
            </h2>
            {word && (
              <p className="text-ink-variant text-sm mt-1">
                Word: <span className="text-accent-green font-semibold">{word}</span>
              </p>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {(cluesAnnotated || []).map((c, i) => (
                <div
                  key={i}
                  className={`px-4 py-2 rounded-lg border font-mono font-semibold tracking-wide text-sm ${
                    c.type === 'helpful'
                      ? 'bg-accent-green/10 border-accent-green/20 text-accent-green'
                      : 'bg-accent-red/10 border-accent-red/20 text-accent-red'
                  }`}
                >
                  {c.text}
                  <span className={`ml-1.5 text-[9px] opacity-50`}>{c.type === 'helpful' ? '✓' : '✗'}</span>
                </div>
              ))}
            </div>

            <p className="text-ink-variant/60 text-xs mt-4">They can&apos;t see which clues are misleading…</p>
          </div>

          {phaseEndsAt && phaseDuration && (
            <Timer endsAt={phaseEndsAt} duration={phaseDuration} />
          )}
        </div>
      </div>
    );
  }

  // Submitted
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center animate-scale-in game-card p-8 space-y-4">
          <div className="text-5xl">✓</div>
          <h2 className="font-display font-bold text-2xl text-accent-yellow">Answer locked in</h2>
          <div className="font-mono font-bold text-3xl tracking-wide text-ink border border-outline rounded-xl px-6 py-4 bg-white/5">
            {guess.toUpperCase()}
          </div>
          <p className="text-ink-variant text-sm">Waiting for results…</p>
        </div>
      </div>
    );
  }

  // Guess input
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg animate-slide-up space-y-5">

        {/* Header */}
        <div className="text-center">
          <p className="text-ink-variant text-sm mb-1">Your turn to guess</p>
          <h2 className="font-display font-bold text-3xl text-accent-yellow">What&apos;s the word?</h2>
        </div>

        {/* Timer */}
        {phaseEndsAt && phaseDuration && (
          <Timer endsAt={phaseEndsAt} duration={phaseDuration} />
        )}

        {/* Clue cards — labelled C1..Cn, order is already randomized */}
        <div>
          <p className="text-ink-variant text-sm font-medium mb-4 text-center">
            Which clues can you trust?
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {displayClues.map((clue, i) => (
              <ClueCard key={i} label={`C${i + 1}`} text={clue} />
            ))}
          </div>
          <p className="text-ink-variant/60 text-xs mt-4 text-center">
            Some of these clues are honest. Some are designed to mislead you.
          </p>
        </div>

        {/* Guess input */}
        <div className="space-y-3">
          <input
            type="text"
            value={guess}
            onChange={e => { setGuess(e.target.value.replace(/\s+/g, '').toUpperCase()); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Type your answer"
            maxLength={30}
            className="w-full px-6 py-5 bg-bg-surface border border-outline focus:border-accent-yellow rounded-xl text-ink font-mono font-bold text-xl tracking-wider placeholder-ink-variant/30 outline-none transition-colors text-center uppercase"
            autoFocus
          />
          {error && <p className="text-accent-red text-sm text-center">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={!guess.trim()}
            className="w-full py-4 bg-accent-yellow hover:bg-accent-yellow/90 disabled:opacity-30 disabled:cursor-not-allowed text-bg font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] text-lg"
          >
            Lock in answer →
          </button>
        </div>
      </div>
    </div>
  );
}
