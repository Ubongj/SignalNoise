import { useEffect, useState } from 'react';
import type { GameState } from '@/types/game';

interface RoundResultProps {
  gameState: GameState;
  onNextRound: () => void;
}

export function RoundResult({ gameState, onNextRound }: RoundResultProps) {
  const { roundResult, scores, players, playerId, currentRound, totalRounds } = gameState;
  const me = players.find(p => p.id === playerId);
  const [visible, setVisible] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!roundResult) return null;

  const { word, guess, isCorrect, timeExpired, clues, guesserName, guesserTeam } = roundResult;
  const scoringTeam = isCorrect ? guesserTeam : (guesserTeam === 'A' ? 'B' : 'A');
  const isLastRound = currentRound >= totalRounds;

  const handleNext = async () => {
    setAdvancing(true);
    try { await onNextRound(); }
    catch { setAdvancing(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className={`w-full max-w-lg transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} space-y-5`}>

        {/* Result banner */}
        <div className={`rounded-2xl border p-8 text-center ${
          isCorrect
            ? 'bg-accent-green/10 border-accent-green/30'
            : 'bg-accent-red/10 border-accent-red/30'
        }`}>
          <div className="text-5xl mb-3">{isCorrect ? '✓' : timeExpired ? '⏰' : '✗'}</div>
          <h2 className={`font-display font-bold text-3xl tracking-tight mb-1 ${isCorrect ? 'text-accent-green' : 'text-accent-red'}`}>
            {isCorrect ? 'Correct!' : timeExpired ? 'Time up!' : 'Wrong!'}
          </h2>
          <p className="text-ink-variant text-sm mb-4">
            {guesserName} guessed{' '}
            {guess
              ? <strong className={`font-mono ${isCorrect ? 'text-accent-green' : 'text-accent-red'}`}>{guess}</strong>
              : <span className="text-ink-variant/50">nothing</span>}
          </p>

          <div className="inline-flex items-center gap-3 bg-bg rounded-xl px-6 py-3 border border-outline">
            <span className="text-ink-variant text-sm">The word was</span>
            <span className="font-mono font-bold text-xl tracking-wide text-ink">{word}</span>
          </div>

          {isCorrect ? (
            <p className={`mt-4 text-sm font-bold ${scoringTeam === 'A' ? 'text-accent-red' : 'text-accent-blue'}`}>
              Team {scoringTeam} scores a point!
            </p>
          ) : (
            <p className={`mt-4 text-sm font-bold ${scoringTeam === 'A' ? 'text-accent-red' : 'text-accent-blue'}`}>
              Team {scoringTeam} gets the point.
            </p>
          )}
        </div>

        {/* Clue breakdown */}
        <div className="game-card p-5">
          <p className="text-ink-variant text-sm font-medium mb-4">Clue breakdown</p>
          <div className="space-y-2">
            {clues.map((clue, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-4 py-2.5 rounded-lg border ${
                  clue.type === 'helpful'
                    ? 'bg-accent-green/5 border-accent-green/15'
                    : 'bg-accent-red/5 border-accent-red/15'
                }`}
              >
                <span className={`font-mono font-bold tracking-wide text-sm ${clue.type === 'helpful' ? 'text-accent-green' : 'text-accent-red'}`}>
                  {clue.text}
                </span>
                <div className="text-right">
                  <span className="text-xs text-ink-variant/60">{clue.playerName}</span>
                  <span className={`ml-2 text-xs font-medium ${clue.type === 'helpful' ? 'text-accent-green/70' : 'text-accent-red/70'}`}>
                    {clue.type === 'helpful' ? 'honest' : 'misleading'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Score board */}
        <div className="game-card p-5">
          <p className="text-ink-variant text-sm font-medium mb-4 text-center">Score</p>
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className="font-bold text-4xl text-accent-red">{scores.A}</div>
              <div className="text-ink-variant text-xs mt-1">Team A</div>
            </div>
            <div className="text-white/10 font-bold text-2xl">–</div>
            <div className="text-center">
              <div className="font-bold text-4xl text-accent-blue">{scores.B}</div>
              <div className="text-ink-variant text-xs mt-1">Team B</div>
            </div>
          </div>
        </div>

        {/* Host control */}
        {me?.isHost ? (
          <button
            onClick={handleNext}
            disabled={advancing}
            className="w-full py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-bg font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] glow-green"
          >
            {advancing ? 'Loading…' : isLastRound ? 'See final scores →' : `Start round ${currentRound + 1} →`}
          </button>
        ) : (
          <div className="text-center py-3">
            <p className="text-ink-variant text-sm">Waiting for host to continue…</p>
          </div>
        )}
      </div>
    </div>
  );
}
