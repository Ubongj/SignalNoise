import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState, TeamId } from '@/types/game';

let _socket: Socket | null = null;

/** Stable per-browser id so a reload can reattach to the same player slot. */
function getClientId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('svn_client_id');
  if (!id) {
    id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `c_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem('svn_client_id', id);
  }
  return id;
}

function getSocket(): Socket {
  if (!_socket) {
    // Default transports = HTTP long-polling first, then auto-upgrade to
    // WebSocket. This is the most proxy-friendly setup (Railway/Render/etc.);
    // forcing websocket-first can fail the handshake behind some hosts.
    _socket = io({ reconnectionAttempts: 15, timeout: 20000 });
  }
  return _socket;
}

export function useSocket() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => { setConnected(true); setError(null); };
    const onDisconnect = () => setConnected(false);
    const onStateUpdate = (state: GameState) => { setGameState(state); setError(null); };
    const onError = ({ message }: { message: string }) => setError(message);
    const onConnectError = (err: Error) =>
      setError(`Can't reach the game server (${err.message}). Retrying…`);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('state_update', onStateUpdate);
    socket.on('game_error', onError);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('state_update', onStateUpdate);
      socket.off('game_error', onError);
    };
  }, []);

  const createRoom = useCallback((playerName: string, isDemo: boolean = false, walletAddress?: string, category?: string): Promise<{ roomId: string; state: GameState }> => {
    if (typeof window !== 'undefined') localStorage.setItem('svn_name', playerName);
    return new Promise((resolve, reject) => {
      getSocket().emit('create_room', { playerName, isDemo, walletAddress, clientId: getClientId(), category }, (res: { roomId?: string; state?: GameState; error?: string }) => {
        if (res.error) reject(new Error(res.error));
        else { setGameState(res.state!); resolve(res as { roomId: string; state: GameState }); }
      });
    });
  }, []);

  const joinRoom = useCallback((roomId: string, playerName: string, walletAddress?: string): Promise<{ state: GameState }> => {
    if (typeof window !== 'undefined') localStorage.setItem('svn_name', playerName);
    return new Promise((resolve, reject) => {
      getSocket().emit('join_room', { roomId, playerName, walletAddress, clientId: getClientId() }, (res: { state?: GameState; error?: string }) => {
        if (res.error) reject(new Error(res.error));
        else { setGameState(res.state!); resolve(res as { state: GameState }); }
      });
    });
  }, []);

  const chooseTeam = useCallback((team: TeamId) => {
    getSocket().emit('choose_team', { team });
  }, []);

  const startGame = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      getSocket().emit('start_game', null, (res?: { error?: string }) => {
        if (res?.error) reject(new Error(res.error));
        else resolve();
      });
    });
  }, []);

  const submitClues = useCallback((clues: string[]): Promise<void> => {
    return new Promise((resolve, reject) => {
      getSocket().emit('submit_clues', { clues }, (res?: { error?: string }) => {
        if (res?.error) reject(new Error(res.error));
        else resolve();
      });
    });
  }, []);

  const submitGuess = useCallback((guess: string) => {
    getSocket().emit('submit_guess', { guess });
  }, []);

  const nextRound = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      getSocket().emit('next_round', null, (res?: { error?: string }) => {
        if (res?.error) reject(new Error(res.error));
        else resolve();
      });
    });
  }, []);

  const playAgain = useCallback(() => {
    getSocket().emit('play_again');
  }, []);

  const requestState = useCallback(() => {
    getSocket().emit('request_state');
  }, []);

  return {
    socket: socketRef.current,
    gameState,
    connected,
    error,
    setError,
    createRoom,
    joinRoom,
    chooseTeam,
    startGame,
    submitClues,
    submitGuess,
    nextRound,
    playAgain,
    requestState,
  };
}
