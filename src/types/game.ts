export type TeamId = 'A' | 'B';

export type GamePhase =
  | 'WAITING'
  | 'LOBBY'
  | 'ROLE_REVEAL'
  | 'CLUE_SUBMISSION'
  | 'REVEAL'
  | 'GUESS'
  | 'ROUND_END'
  | 'GAME_OVER';

export type PlayerRole = 'guesser' | 'helper' | 'saboteur' | 'observer';

export interface Player {
  id: string;
  name: string;
  team: TeamId | null;
  isHost: boolean;
  connected: boolean;
  /** Wallet address if the player connected one (optional). */
  address?: string | null;
}

export interface Clue {
  text: string;
  playerId: string;
  playerName: string;
  type: 'helpful' | 'misleading';
}

export interface RoundMeta {
  roundNumber: number;
  guesserId: string;
  helperId: string;
  saboteurId: string;
  observerId: string;
}

export interface RoundResult {
  word: string;
  guess: string | null;
  isCorrect: boolean;
  timeExpired: boolean;
  clues: Clue[];
  guesserName: string;
  guesserTeam: TeamId;
}

export interface GameState {
  roomId: string;
  phase: GamePhase;
  players: Player[];
  scores: { A: number; B: number };
  currentRound: number;
  totalRounds: number;
  phaseEndsAt: number | null;
  phaseDuration: number | null;
  playerId: string;
  role: PlayerRole | null;
  winner: TeamId | 'TIE' | null;
  category?: string;
  categoryLabel?: string;
  word?: string;
  clues?: string[];
  cluesAnnotated?: Clue[];
  cluesSubmitted?: boolean;
  bothSubmitted?: boolean;
  helperSubmitted?: boolean;
  saboteurSubmitted?: boolean;
  roundResult?: RoundResult;
  roundMeta?: RoundMeta;
}
