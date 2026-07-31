import { useState, useEffect } from 'react';
import type { GameState, TeamId } from '@/types/game';
import { OnChainBadge } from '@/components/web3/OnChainBadge';

interface LobbyProps {
  gameState: GameState;
  onChooseTeam: (team: TeamId) => void;
  onStartGame: () => void;
  error: string | null;
}

export function Lobby({ gameState, onChooseTeam, onStartGame, error }: LobbyProps) {
  const { players, playerId, roomId } = gameState;
  const [copied, setCopied]   = useState(false);
  const [starting, setStarting] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const teamA = players.filter(p => p.team === 'A');
  const teamB = players.filter(p => p.team === 'B');
  const me    = players.find(p => p.id === playerId);
  const myTeam  = me?.team;
  const isHost  = me?.isHost;
  const isDemo  = players.some(p => p.name === 'Nova' || p.name === 'Echo' || p.name === 'Cipher');
  const canStart = teamA.length === 2 && teamB.length === 2 && !isDemo;

  // Show countdown for demo auto-start
  useEffect(() => {
    if (!isDemo) return;
    setCountdown(2);
    const id = setInterval(() => setCountdown(c => (c !== null && c > 0 ? c - 1 : null)), 1000);
    return () => clearInterval(id);
  }, [isDemo]);

  const copyRoomId = () => {
    // Copy the full invite URL so recipients land straight in the room.
    const link =
      typeof window !== 'undefined' ? `${window.location.origin}/game/${roomId}` : roomId;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleStart = async () => {
    setStarting(true);
    try { await onStartGame(); }
    catch { setStarting(false); }
  };

  const renderPlayer = (p: typeof players[0]) => (
    <div key={p.id} className="flex items-center gap-x-1.5 gap-y-0.5 flex-wrap min-w-0">
      <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
        p.team === 'A' ? 'bg-accent-red/20 border border-accent-red/30 text-accent-red'
                       : 'bg-accent-blue/20 border border-accent-blue/30 text-accent-blue'
      }`}>
        {p.name[0].toUpperCase()}
      </div>
      <span className="text-sm font-medium text-ink truncate max-w-[9rem]">{p.name}</span>
      {p.address && (
        <span
          className="text-[10px] font-mono text-primary/80"
          title={`${p.address} · wallet connected`}
        >
          {p.address.slice(0, 5)}…{p.address.slice(-3)}
        </span>
      )}
      {p.id === playerId && <span className="text-[10px] text-ink-variant font-semibold">you</span>}
      {p.isHost && <span className="text-[10px] text-accent-yellow font-semibold">host</span>}
      {!p.connected && <span className="text-[10px] text-ink-variant/50">offline</span>}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-6 animate-slide-up">

        {/* Room Code */}
        <div className="text-center">
          {isDemo ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-purple/10 border border-accent-purple/30 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-pulse" />
              <span className="text-accent-purple text-xs font-medium">Demo mode</span>
            </div>
          ) : (
            <>
              <p className="text-ink-variant text-sm mb-3">Room code — share to invite</p>
              <button
                onClick={copyRoomId}
                className="group inline-flex items-center gap-3 game-card px-6 py-4 hover:border-outline-strong transition-colors"
              >
                <span className="font-mono font-bold text-3xl tracking-[0.25em] text-ink">{roomId}</span>
                <span className={`text-xs font-medium transition-colors ${copied ? 'text-accent-green' : 'text-ink-variant group-hover:text-ink'}`}>
                  {copied ? '✓ Link copied' : 'Copy link'}
                </span>
              </button>
              <div className="mt-3">
                <OnChainBadge roomCode={roomId} />
              </div>
            </>
          )}
        </div>

        {/* Teams */}
        <div className="grid grid-cols-2 gap-4">
          {/* Team A */}
          <div className={`game-card border p-5 transition-all ${myTeam === 'A' ? 'bg-team-a border-accent-red/30' : 'hover:border-white/10'}`}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-accent-red text-sm">Team A</span>
              <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${teamA.length === 2 ? 'bg-accent-green/20 text-accent-green' : 'bg-white/5 text-ink-variant'}`}>
                {teamA.length}/2
              </span>
            </div>
            <div className="space-y-2 min-h-[80px]">
              {teamA.map(renderPlayer)}
              {Array(Math.max(0, 2 - teamA.length)).fill(null).map((_, i) => (
                <div key={i} className="flex items-center gap-2 opacity-30">
                  <div className="w-7 h-7 rounded-full border border-dashed border-white/20 flex items-center justify-center">
                    <span className="text-white/30 text-xs">?</span>
                  </div>
                  <span className="text-sm text-white/30">Waiting...</span>
                </div>
              ))}
            </div>
            {!isDemo && myTeam !== 'A' && teamA.length < 2 && (
              <button
                onClick={() => onChooseTeam('A')}
                className="w-full mt-4 border border-accent-red/30 hover:bg-accent-red/10 hover:border-accent-red/60 text-accent-red font-medium text-sm py-2.5 rounded-lg transition-all"
              >
                Join Team A
              </button>
            )}
            {myTeam === 'A' && (
              <div className="mt-4 text-center text-accent-red text-xs font-medium opacity-70">← Your team</div>
            )}
          </div>

          {/* Team B */}
          <div className={`game-card border p-5 transition-all ${myTeam === 'B' ? 'bg-team-b border-accent-blue/30' : 'hover:border-white/10'}`}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-accent-blue text-sm">Team B</span>
              <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${teamB.length === 2 ? 'bg-accent-green/20 text-accent-green' : 'bg-white/5 text-ink-variant'}`}>
                {teamB.length}/2
              </span>
            </div>
            <div className="space-y-2 min-h-[80px]">
              {teamB.map(renderPlayer)}
              {Array(Math.max(0, 2 - teamB.length)).fill(null).map((_, i) => (
                <div key={i} className="flex items-center gap-2 opacity-30">
                  <div className="w-7 h-7 rounded-full border border-dashed border-white/20 flex items-center justify-center">
                    <span className="text-white/30 text-xs">?</span>
                  </div>
                  <span className="text-sm text-white/30">Waiting...</span>
                </div>
              ))}
            </div>
            {!isDemo && myTeam !== 'B' && teamB.length < 2 && (
              <button
                onClick={() => onChooseTeam('B')}
                className="w-full mt-4 border border-accent-blue/30 hover:bg-accent-blue/10 hover:border-accent-blue/60 text-accent-blue font-medium text-sm py-2.5 rounded-lg transition-all"
              >
                Join Team B
              </button>
            )}
            {myTeam === 'B' && (
              <div className="mt-4 text-center text-accent-blue text-xs font-medium opacity-70">← Your team</div>
            )}
          </div>
        </div>

        {/* Unassigned players */}
        {players.filter(p => !p.team).length > 0 && (
          <div className="game-card p-4">
            <p className="text-ink-variant text-sm mb-3">In lobby</p>
            <div className="flex flex-wrap gap-2">
              {players.filter(p => !p.team).map(p => (
                <div key={p.id} className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold">
                    {p.name[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-ink-variant">{p.name}</span>
                  {p.id === playerId && <span className="text-[10px] text-ink-variant/60">you</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg px-4 py-3 text-accent-red text-sm">
            {error}
          </div>
        )}

        {/* Action area */}
        {isDemo ? (
          <div className="text-center py-3 space-y-1">
            <p className="text-ink-variant text-sm">
              Starting in <span className="text-accent-purple font-bold">{countdown ?? '…'}</span>
            </p>
            <p className="text-ink-variant/60 text-xs">You are on Team A — your bots are ready</p>
          </div>
        ) : isHost ? (
          <button
            onClick={handleStart}
            disabled={!canStart || starting}
            className={`w-full py-4 font-semibold rounded-lg transition-all duration-200 ${
              canStart && !starting
                ? 'bg-primary hover:bg-primary/90 text-bg glow-green hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-white/5 text-ink-variant/50 cursor-not-allowed'
            }`}
          >
            {starting ? 'Starting…' :
             canStart  ? 'Start game →' :
             `Need ${4 - players.filter(p => p.team).length} more player${4 - players.filter(p => p.team).length !== 1 ? 's' : ''} with teams`}
          </button>
        ) : (
          <div className="text-center py-4">
            <p className="text-ink-variant text-sm">
              {canStart ? 'Waiting for host to start…' : 'Fill both teams to begin'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
