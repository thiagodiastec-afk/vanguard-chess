export interface UserData {
  uid: string;
  displayName: string;
  hasSetNickname?: boolean;
  elo: number;
  gamesPlayed: number;
  stats?: {
    wins: number;
    losses: number;
    draws: number;
  };
  achievements?: string[];
  currentWinStreak?: number;
  friends?: string[];
  isOnline?: boolean;
  lastSeen?: number;
  eloHistory?: {
    date: number;
    elo: number;
  }[];
  coins?: number;
  unlockedThemes?: string[];
  unlockedBackgrounds?: string[];
  activeBackground?: string;
  activeTheme?: string;
  isPremium?: boolean;  isGuest?: boolean;
}

export interface QueueEntry {
  uid: string;
  displayName: string;
  hasSetNickname?: boolean;
  elo: number;
  createdAt: number;
  activeTheme?: string;  timeControl: number;
}

export interface GameData {
  id: string;
  whiteId: string;
  blackId: string;
  whiteName: string;
  blackName: string;
  whiteElo: number;
  blackElo: number;
  status: 'playing' | 'draw' | 'white_won' | 'black_won' | 'abandoned' | 'waiting_friend';
  fen: string;
  pgn: string;
  lastMoveAt: number;  timeControl?: number;  whiteTime?: number;  blackTime?: number;
  turn: 'w' | 'b';
  spectatorsAllowedWhite?: boolean;
  spectatorsAllowedBlack?: boolean;
  whiteThemeId?: string;
}

export interface Message {
  id: string;
  roomId: string;
  uid: string;
  displayName: string;
  hasSetNickname?: boolean;
  text: string;
  createdAt: number;
  activeTheme?: string;  timeControl: number;
}

export interface Tournament {
  id: string;
  name: string;
  format: 'elimination' | 'round-robin';
  minElo: number;
  maxElo: number;
  prize: string;
  startsAt: number;
  status: 'scheduled' | 'in_progress' | 'completed';
  participants: string[]; // array of user IDs
}

export interface Puzzle {
  id: string;
  fen: string;
  solution: string[]; // sequence of moves in SAN or UCI
  description: string;
  category: 'tactics' | 'opening' | 'endgame';
}

export interface Challenge {
  id: string;
  challengerId: string;
  challengedId: string;
  challengerName: string;
  challengerElo: number;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
  activeTheme?: string;  timeControl: number;
  gameId?: string;
}
