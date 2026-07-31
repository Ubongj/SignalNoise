import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { useSocket } from '@/hooks/useSocket';
import { GameHeader } from '@/components/game/GameHeader';
import { Lobby } from '@/components/game/Lobby';
import { RoleReveal } from '@/components/game/RoleReveal';
import { ClueSubmission } from '@/components/game/ClueSubmission';
import { ClueReveal } from '@/components/game/ClueReveal';
import { GuessPhase } from '@/components/game/GuessPhase';
import { RoundResult } from '@/components/game/RoundResult';
import { GameOver } from '@/components/game/GameOver';
import { GameSkeleton } from '@/components/ui/Skeleton';
import type { TeamId } from '@/types/game';

type JoinState = 'checking' | 'name_entry' | 'joining' | 'in_game';

export default function GamePage() {
  const router = useRouter();
  const { roomId } = router.query as { roomId: string };

  const {
    gameState, connected, error, setError,
    joinRoom, chooseTeam, startGame,
    submitClues, submitGuess, nextRound, playAgain, requestState,
  } = useSocket();

  const { address } = useAccount();
  const [joinState, setJoinState]   = useState<JoinState>('checking');
  const [playerName, setPlayerName] = useState('');
  const [joinError, setJoinError]   = useState('');

  // On connect + roomId known: try to pull existing state first (handles demo redirect)
  useEffect(() => {
    if (!connected || !roomId) return;
    requestState();
    // After 600 ms with no response, show name entry
    const fallback = setTimeout(() => {
      setJoinState(s => s === 'checking' ? 'name_entry' : s);
    }, 600);
    return () => clearTimeout(fallback);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, roomId]);

  // If server sends state for this room, we're already in
  useEffect(() => {
    if (gameState && gameState.roomId === roomId) {
      setJoinState('in_game');
    }
  }, [gameState, roomId]);

  // Pre-fill saved name
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('svn_name') : null;
    if (saved) setPlayerName(saved);
  }, []);

  const handleJoin = async () => {
    if (!playerName.trim()) { setJoinError('Enter your name'); return; }
    setJoinState('joining');
    setJoinError('');
    try {
      localStorage.setItem('svn_name', playerName.trim());
      await joinRoom(roomId, playerName.trim(), address);
      setJoinState('in_game');
    } catch (e: unknown) {
      setJoinError(e instanceof Error ? e.message : 'Failed to join room');
      setJoinState('name_entry');
    }
  };

  // ── Checking / Loading ────────────────────────────────────────────────────
  if (joinState === 'checking' || (!gameState && joinState === 'in_game')) {
    return <GameSkeleton />;
  }

  // ── Name Entry ─────────────────────────────────────────────────────────────
  if (joinState === 'name_entry' || joinState === 'joining') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-5 animate-scale-in">
          <div className="text-center mb-6">
            <p className="text-ink-variant text-sm mb-2">Joining room</p>
            <div className="font-mono font-bold text-3xl text-ink tracking-[0.25em]">{roomId}</div>
          </div>
          <div className="game-card p-6 space-y-4">
            <input
              type="text"
              placeholder="Your name"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              maxLength={20}
              className="w-full bg-bg-surface border border-outline focus:border-primary rounded-lg px-4 py-3 text-base text-ink placeholder-ink-variant/40 outline-none transition-colors font-medium"
              autoFocus
              disabled={joinState === 'joining'}
            />
            {(joinError || error) && (
              <p className="text-accent-red text-sm">{joinError || error}</p>
            )}
            <button
              onClick={handleJoin}
              disabled={joinState === 'joining' || !connected}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-bg font-semibold py-3 rounded-lg transition-all"
            >
              {!connected ? 'Connecting…' : joinState === 'joining' ? 'Joining…' : 'Join room →'}
            </button>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full text-ink-variant hover:text-ink text-sm transition-colors text-center py-2"
          >
            ← Back to home
          </button>
        </div>
      </div>
    );
  }

  // ── In Game ───────────────────────────────────────────────────────────────
  if (!gameState) return null;

  const { phase } = gameState;
  const showHeader = !['WAITING', 'LOBBY', 'GAME_OVER'].includes(phase);

  return (
    <div className="min-h-screen">
      {showHeader && <GameHeader gameState={gameState} />}

      {(phase === 'WAITING' || phase === 'LOBBY') && (
        <Lobby
          gameState={gameState}
          onChooseTeam={(team: TeamId) => { chooseTeam(team); setError(null); }}
          onStartGame={startGame}
          error={error}
        />
      )}

      {phase === 'ROLE_REVEAL'     && <RoleReveal gameState={gameState} />}
      {phase === 'CLUE_SUBMISSION' && <ClueSubmission gameState={gameState} onSubmitClues={submitClues} />}
      {phase === 'REVEAL'          && <ClueReveal gameState={gameState} />}
      {phase === 'GUESS'           && <GuessPhase gameState={gameState} onSubmitGuess={submitGuess} />}
      {phase === 'ROUND_END'       && <RoundResult gameState={gameState} onNextRound={nextRound} />}
      {phase === 'GAME_OVER'       && <GameOver gameState={gameState} onPlayAgain={playAgain} />}

      {/* Disconnected banner (top, so it never collides with toasts) */}
      {!connected && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-bg-card/95 backdrop-blur border border-accent-red/30 rounded-full px-4 py-2 flex items-center gap-2 text-sm z-50">
          <div className="w-2 h-2 rounded-full bg-accent-red animate-pulse" />
          <span className="text-ink-variant">Reconnecting…</span>
        </div>
      )}
    </div>
  );
}
