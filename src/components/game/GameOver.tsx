import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { GameState, TeamId } from '@/types/game';

interface GameOverProps {
  gameState: GameState;
  onPlayAgain: () => void;
}

export function GameOver({ gameState, onPlayAgain }: GameOverProps) {
  const { scores, winner, players, playerId } = gameState;
  const me = players.find(p => p.id === playerId);
  const myTeam = me?.team;
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const iWon = winner !== 'TIE' && myTeam === winner;
  const tied = winner === 'TIE';

  const teamAPlayers = players.filter(p => p.team === 'A');
  const teamBPlayers = players.filter(p => p.team === 'B');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className={`w-full max-w-lg transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} space-y-6 text-center`}>

        {/* Result */}
        <div>
          <p className="text-ink-variant text-sm mb-4">Game over</p>
          {tied ? (
            <>
              <div className="font-display font-bold text-6xl text-ink mb-2">Tie</div>
              <p className="text-ink-variant">What a match. Neck and neck.</p>
            </>
          ) : (
            <>
              <div className={`font-display font-bold text-7xl mb-2 tracking-tight ${winner === 'A' ? 'text-accent-red' : 'text-accent-blue'}`}>
                Team {winner}
              </div>
              <p className={`font-medium text-lg ${iWon ? 'text-accent-green' : 'text-ink-variant'}`}>
                {iWon ? '🎉 Your team wins!' : 'Better luck next time.'}
              </p>
            </>
          )}
        </div>

        {/* Final scores */}
        <div className="game-card p-6">
          <div className="flex items-stretch gap-4">
            {/* Team A */}
            <div className={`flex-1 rounded-xl p-4 border ${winner === 'A' ? 'bg-accent-red/15 border-accent-red/30' : 'bg-white/[0.03] border-white/10'}`}>
              <div className="text-accent-red font-semibold text-sm mb-3">Team A</div>
              <div className={`font-bold text-5xl ${winner === 'A' ? 'text-accent-red' : 'text-ink-variant/70'}`}>{scores.A}</div>
              <div className="mt-3 space-y-1">
                {teamAPlayers.map(p => (
                  <div key={p.id} className="text-xs text-ink-variant flex items-center gap-1">
                    <span>{p.name}</span>
                    {p.id === playerId && <span className="text-ink-variant/50">(you)</span>}
                  </div>
                ))}
              </div>
              {winner === 'A' && <div className="mt-3 text-accent-red font-semibold text-xs">Winner</div>}
            </div>

            {/* Divider */}
            <div className="flex items-center justify-center text-white/15 font-bold text-xl">vs</div>

            {/* Team B */}
            <div className={`flex-1 rounded-xl p-4 border ${winner === 'B' ? 'bg-accent-blue/15 border-accent-blue/30' : 'bg-white/[0.03] border-white/10'}`}>
              <div className="text-accent-blue font-semibold text-sm mb-3">Team B</div>
              <div className={`font-bold text-5xl ${winner === 'B' ? 'text-accent-blue' : 'text-ink-variant/70'}`}>{scores.B}</div>
              <div className="mt-3 space-y-1">
                {teamBPlayers.map(p => (
                  <div key={p.id} className="text-xs text-ink-variant flex items-center gap-1">
                    <span>{p.name}</span>
                    {p.id === playerId && <span className="text-ink-variant/50">(you)</span>}
                  </div>
                ))}
              </div>
              {winner === 'B' && <div className="mt-3 text-accent-blue font-semibold text-xs">Winner</div>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {me?.isHost && (
            <button
              onClick={onPlayAgain}
              className="w-full py-4 bg-primary hover:bg-primary/90 text-bg font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] glow-green"
            >
              Play again →
            </button>
          )}
          {!me?.isHost && (
            <div className="text-ink-variant text-sm py-2">Waiting for host to start a new game…</div>
          )}
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 border border-outline hover:border-outline-strong text-ink-variant hover:text-ink font-medium rounded-xl transition-all text-sm"
          >
            Back to home
          </button>
        </div>

        <p className="text-ink-variant/50 text-xs">Signal vs Noise · Encrypted by FHE on Fhenix</p>
      </div>
    </div>
  );
}
