import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState, TeamId } from '@/types/game';

let _socket: Socket | null = null;

function getSocket(): Socket {
  if (!_socket) {
    _socket = io({ transports: ['websocket', 'polling'] });
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

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onStateUpdate = (state: GameState) => { setGameState(state); setError(null); };
    const onError = ({ message }: { message: string }) => setError(message);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('state_update', onStateUpdate);
    socket.on('game_error', onError);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('state_update', onStateUpdate);
      socket.off('game_error', onError);
    };
  }, []);

  const createRoom = useCallback((playerName: string, isDemo: boolean = false, walletAddress?: string): Promise<{ roomId: string; state: GameState }> => {
    return new Promise((resolve, reject) => {
      getSocket().emit('create_room', { playerName, isDemo, walletAddress }, (res: { roomId?: string; state?: GameState; error?: string }) => {
        if (res.error) reject(new Error(res.error));
        else { setGameState(res.state!); resolve(res as { roomId: string; state: GameState }); }
      });
    });
  }, []);

  const joinRoom = useCallback((roomId: string, playerName: string, walletAddress?: string): Promise<{ state: GameState }> => {
    return new Promise((resolve, reject) => {
      getSocket().emit('join_room', { roomId, playerName, walletAddress }, (res: { state?: GameState; error?: string }) => {
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

  const submitClues = useCallback((clues: string[]) => {
    getSocket().emit('submit_clues', { clues });
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
