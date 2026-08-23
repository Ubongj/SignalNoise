import { useState } from 'react';
import type { GameState } from '@/types/game';
import { Timer } from '@/components/ui/Timer';

interface ClueSubmissionProps {
  gameState: GameState;
  onSubmitClues: (clues: string[]) => void | Promise<void>;
}

export function ClueSubmission({ gameState, onSubmitClues }: ClueSubmissionProps) {
  const { role, word, cluesSubmitted, helperSubmitted, saboteurSubmitted, phaseEndsAt, phaseDuration, players, roundMeta } = gameState;
  const isHelper = role === 'helper';
  const isSaboteur = role === 'saboteur';
  const canSubmit = (isHelper || isSaboteur) && !cluesSubmitted;

  const clueCount = isHelper ? 3 : 2;
  const [clues, setClues] = useState<string[]>(Array(clueCount).fill(''));
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const updateClue = (i: number, value: string) => {
    const next = [...clues];
    next[i] = value.replace(/\s+/g, '').toUpperCase();
    setClues(next);
    setError('');
  };

  const validate = () => {
    const filled = clues.filter(c => c.trim().length > 0);
    if (filled.length < clueCount) {
      setError(`Fill in all ${clueCount} clues.`);
      return false;
    }
    const W = (word || '').toUpperCase();
    for (const c of filled) {
      const C = c.trim().toUpperCase();
      if (!/^[A-Z]+$/.test(C)) { setError('Single word, letters only — no spaces, numbers or symbols.'); return false; }
      if (C.length < 3) { setError('Each clue must be at least 3 letters — no initials or abbreviations.'); return false; }
      if (W && C === W) {
        setError('You cannot use the word itself as a clue.'); return false;
      }
      // Reject any clue that shares a chunk with the word, in either direction.
      // e.g. TELESCOPE → "tele"/"scope", CRAFTSMAN → "craft"/"man".
      if (W && C.length >= 3 && (W.includes(C) || C.includes(W))) {
        setError(`"${c}" is part of the word — pick a different clue.`); return false;
      }
      // No giving away the start of the word.
      if (W && W.length >= 2 && C.slice(0, 2) === W.slice(0, 2)) {
        setError(`Clue can't start with the word's first two letters.`); return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitted(true);
    try {
      await onSubmitClues(clues.filter(c => c.trim()));
    } catch (e) {
      // Server rejected a clue (e.g. not a real word) — let them fix it.
      setSubmitted(false);
      setError(e instanceof Error ? e.message : 'A clue was rejected — pick different words.');
    }
  };

  const guesser = players.find(p => p.id === roundMeta?.guesserId);

  // Waiting views for guesser + observer
  if (role === 'guesser' || role === 'observer') {
    const total = 2;
    const done = (helperSubmitted ? 1 : 0) + (saboteurSubmitted ? 1 : 0);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center animate-fade-in space-y-6">
          <div className="game-card p-8">
            {role === 'guesser' ? (
              <>
                <div className="text-6xl mb-4 animate-pulse">👁</div>
                <h2 className="font-display font-bold text-2xl text-accent-yellow mb-2">Stand by, guesser</h2>
                <p className="text-ink-variant text-sm">Your clues are being prepared…</p>
                <p className="text-ink-variant/60 text-xs mt-1">Some may be honest. Some may not be.</p>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">👀</div>
                <h2 className="font-display font-bold text-2xl text-ink-variant mb-2">Observing</h2>
                <p className="text-ink-variant text-sm">
                  Word: <span className="text-accent-green font-semibold">{word}</span>
                </p>
                <p className="text-ink-variant/60 text-xs mt-1">Watching the clue phase unfold…</p>
              </>
            )}

            {/* Progress */}
            <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-variant">Helper</span>
                <span className={helperSubmitted ? 'text-accent-green font-semibold' : 'text-ink-variant/50'}>
                  {helperSubmitted ? '✓ Submitted' : 'typing…'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-variant">Saboteur</span>
                <span className={saboteurSubmitted ? 'text-accent-red font-semibold' : 'text-ink-variant/50'}>
                  {saboteurSubmitted ? '✓ Submitted' : 'typing…'}
                </span>
              </div>
            </div>

            <div className="mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-blue rounded-full transition-all duration-500"
                style={{ width: `${(done / total) * 100}%` }}
              />
            </div>
          </div>

          {phaseEndsAt && phaseDuration && (
            <Timer endsAt={phaseEndsAt} duration={phaseDuration} />
          )}
        </div>
      </div>
    );
  }

  // Submitted confirmation
  if (submitted || cluesSubmitted) {
    const waitingFor = (isHelper && !saboteurSubmitted) || (isSaboteur && !helperSubmitted);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center animate-scale-in space-y-4">
          <div className="game-card p-8">
            <div className="text-5xl mb-4">✓</div>
            <h2 className="font-display font-bold text-2xl text-accent-green mb-2">Clues submitted</h2>
            <p className="text-ink-variant text-sm">
              {waitingFor ? `Waiting for the ${isSaboteur ? 'helper' : 'saboteur'} to submit…` : 'All clues in — revealing soon…'}
            </p>
            <div className="mt-6 space-y-2">
              {clues.map((c, i) => (
                <div key={i} className="bg-white/5 rounded-lg px-4 py-2 font-mono font-semibold text-ink tracking-wide text-sm">
                  {c}
                </div>
              ))}
            </div>
          </div>
          {phaseEndsAt && phaseDuration && (
            <Timer endsAt={phaseEndsAt} duration={phaseDuration} />
          )}
        </div>
      </div>
    );
  }

  // Submission form
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-slide-up space-y-5">

        {/* Role context */}
        <div className={`game-card border p-5 ${isHelper ? 'bg-accent-green/5 border-accent-green/20' : 'bg-accent-red/5 border-accent-red/20'}`}>
          <p className={`text-sm font-semibold mb-1 ${isHelper ? 'text-accent-green' : 'text-accent-red'}`}>
            You are the {isHelper ? 'Helper' : 'Saboteur'}
          </p>
          <p className="text-ink-variant text-sm leading-relaxed">
            {isHelper
              ? 'Guide your teammate with 3 honest single-word clues.'
              : `Confuse ${guesser?.name || 'the guesser'} with 2 misleading clues that blend in.`}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-ink-variant text-sm">The word:</span>
            <span className={`font-bold text-lg tracking-wide ${isHelper ? 'text-accent-green' : 'text-accent-red'}`}>
              {word}
            </span>
          </div>
        </div>

        {/* Timer */}
        {phaseEndsAt && phaseDuration && (
          <Timer endsAt={phaseEndsAt} duration={phaseDuration} />
        )}

        {/* Clue inputs */}
        <div className="space-y-3">
          <p className="text-ink-variant text-sm font-medium">
            Submit {clueCount} {isHelper ? 'helpful' : 'misleading'} clues
          </p>
          {clues.map((clue, i) => (
            <div key={i} className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-variant/50 font-semibold text-sm">
                {i + 1}.
              </span>
              <input
                type="text"
                value={clue}
                onChange={e => updateClue(i, e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && i === clues.length - 1) handleSubmit(); }}
                placeholder={`Clue ${i + 1} — single word`}
                maxLength={30}
                className={`w-full pl-10 pr-4 py-3.5 bg-bg-surface border rounded-lg text-ink font-semibold tracking-wide font-mono text-base placeholder-ink-variant/30 outline-none transition-colors ${
                  isHelper ? 'border-outline focus:border-accent-green' : 'border-outline focus:border-accent-red'
                }`}
                autoFocus={i === 0}
              />
            </div>
          ))}
        </div>

        {/* Rules reminder */}
        <div className="text-ink-variant/60 text-xs">
          <p>Real single word · no acronyms · not part of the word · not its first two letters</p>
        </div>

        {error && <p className="text-accent-red text-sm">{error}</p>}

        <button
          onClick={handleSubmit}
          className={`w-full py-4 font-semibold rounded-lg transition-all ${
            isHelper
              ? 'bg-accent-green hover:bg-accent-green/90 text-bg'
              : 'bg-accent-red hover:bg-accent-red/90 text-white'
          } hover:scale-[1.02] active:scale-[0.98]`}
        >
          Submit {clueCount} clues →
        </button>

        {/* Other's progress */}
        <div className="flex items-center justify-center gap-4 text-xs text-ink-variant/50">
          <span className={helperSubmitted ? 'text-accent-green' : ''}>
            {helperSubmitted ? '✓' : '○'} Helper {helperSubmitted ? 'ready' : 'writing…'}
          </span>
          <span className={saboteurSubmitted ? 'text-accent-red' : ''}>
            {saboteurSubmitted ? '✓' : '○'} Saboteur {saboteurSubmitted ? 'ready' : 'writing…'}
          </span>
        </div>
      </div>
    </div>
  );
}
