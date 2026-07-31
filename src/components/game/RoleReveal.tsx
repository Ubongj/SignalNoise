import { useEffect, useState } from 'react';
import type { GameState, PlayerRole } from '@/types/game';
import { Timer } from '@/components/ui/Timer';

interface RoleRevealProps {
  gameState: GameState;
}

const roleConfig: Record<PlayerRole, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  desc: string;
  detail: string;
}> = {
  guesser: {
    label: 'Guesser',
    color: 'text-accent-yellow',
    bgColor: 'bg-accent-yellow/10 border-accent-yellow/30',
    icon: '?',
    desc: 'Figure out the hidden word from the clues.',
    detail: 'You\'ll see 5 clues — but 2 are designed to mislead you. Choose wisely.',
  },
  helper: {
    label: 'Helper',
    color: 'text-accent-green',
    bgColor: 'bg-accent-green/10 border-accent-green/30',
    icon: '✓',
    desc: 'Help your teammate guess the word.',
    detail: 'Submit 3 honest, single-word clues. No spelling hints, no rhyming, no using the word.',
  },
  saboteur: {
    label: 'Saboteur',
    color: 'text-accent-red',
    bgColor: 'bg-accent-red/10 border-accent-red/30',
    icon: '✗',
    desc: 'Confuse the guesser without being obvious.',
    detail: 'Submit 2 misleading clues that blend in with the real ones. Make them doubt.',
  },
  observer: {
    label: 'Observer',
    color: 'text-ink-variant',
    bgColor: 'bg-white/5 border-white/10',
    icon: '◎',
    desc: 'Watch the round unfold.',
    detail: 'You can see the word and all clues. You\'ll be in action next round.',
  },
};

export function RoleReveal({ gameState }: RoleRevealProps) {
  const { role, word, roundMeta, players, playerId, currentRound, totalRounds, phaseEndsAt, phaseDuration } = gameState;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!role) return null;

  const config = roleConfig[role];
  const guesser = players.find(p => p.id === roundMeta?.guesserId);
  const helper = players.find(p => p.id === roundMeta?.helperId);
  const saboteur = players.find(p => p.id === roundMeta?.saboteurId);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} w-full max-w-md`}>

        <p className="text-ink-variant text-sm text-center mb-2">
          Round {currentRound} of {totalRounds}
        </p>

        {/* Role Badge */}
        <div className={`border rounded-2xl p-8 text-center ${config.bgColor} mb-6`}>
          <div className={`text-6xl font-bold ${config.color} mb-2`}>{config.icon}</div>
          <p className="text-ink-variant text-sm mb-2">You are the</p>
          <h1 className={`font-display font-bold text-4xl tracking-tight ${config.color}`}>
            {config.label}
          </h1>
          <p className="text-ink-variant text-sm mt-3 leading-relaxed">{config.desc}</p>

          {word && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-ink-variant text-sm mb-2">The word is</p>
              <div className={`font-display font-bold text-3xl tracking-wide ${config.color}`}>
                {word}
              </div>
            </div>
          )}

          {role === 'guesser' && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className={`font-bold text-lg ${config.color} opacity-60`}>
                ???
              </p>
              <p className="text-ink-variant text-xs mt-1">The word is hidden — clues incoming</p>
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="game-card p-4 mb-6">
          <p className="text-ink-variant text-sm leading-relaxed text-center">{config.detail}</p>
        </div>

        {/* Round Roles Summary */}
        <div className="game-card p-4 mb-6">
          <p className="text-ink-variant text-sm font-medium mb-3">This round</p>
          <div className="space-y-2">
            {[
              { label: 'Guesser', player: guesser, roleKey: 'guesser' as PlayerRole },
              { label: 'Helper', player: helper, roleKey: 'helper' as PlayerRole },
              { label: 'Saboteur', player: saboteur, roleKey: 'saboteur' as PlayerRole },
            ].map(({ label, player, roleKey }) => (
              <div key={label} className="flex items-center justify-between">
                <span className={`text-sm font-medium ${roleConfig[roleKey].color}`}>{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-ink text-sm font-medium">{player?.name}</span>
                  {player?.id === playerId && <span className="text-[10px] text-ink-variant font-semibold">you</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {phaseEndsAt && phaseDuration && (
          <div className="flex items-center justify-center gap-3">
            <span className="text-ink-variant text-sm">Game starts in</span>
            <Timer endsAt={phaseEndsAt} duration={phaseDuration} showBar={false} />
          </div>
        )}
      </div>
    </div>
  );
}
