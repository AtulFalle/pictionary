export interface Player {
  id: string;
  name: string;
  socketId: string;
  isHost?: boolean;
  isDrawer?: boolean;
  score?: number;
}

export interface GameRoom {
  id: string;
  code: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  createdAt: Date;
  maxPlayers: number;
  currentRound?: number;
  currentWord?: string;
  currentDrawer?: string;
  roundTime?: number;
  totalRounds?: number;
  drawerRotation?: string[];
  gameEnded?: boolean;
}

export interface RoundInfo {
  roundNumber: number;
  drawer: Player;
  word?: string; // Only sent to drawer
  timeLimit: number;
}

export interface DrawingStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool: 'brush' | 'eraser';
  timestamp: number;
}

export interface DrawingUpdate {
  stroke: DrawingStroke;
  roomCode: string;
}

export interface GuessData {
  guess: string;
  playerId: string;
  playerName: string;
  roomCode: string;
}

export interface GuessResult {
  isCorrect: boolean;
  guess: string;
  playerName: string;
  message: string;
}

export interface RoundEnd {
  correctWord: string;
  winner: Player;
  roundNumber: number;
  scores: { [playerId: string]: number };
  isGameOver?: boolean;
  totalRounds?: number;
  nextDrawer?: Player;
}

export interface NextRound {
  roundNumber: number;
  drawer: Player;
  word: string;
  timeLimit: number;
  isGameOver: boolean;
  finalScores?: { [playerId: string]: number };
  gameWinner?: Player;
}

export interface ScoreUpdate {
  playerId: string;
  playerName: string;
  newScore: number;
  pointsEarned: number;
  reason: string;
  roomCode: string;
}

export interface CreateRoomData {
  playerName: string;
  maxPlayers?: number;
}

export interface JoinRoomData {
  roomCode: string;
  playerName: string;
}

export interface SocketEvents {
  // Client to Server
  create_room: (data: CreateRoomData) => void;
  join_room: (data: JoinRoomData) => void;
  leave_room: () => void;
  start_round: () => void;
  draw_update: (data: DrawingUpdate) => void;
  submit_guess: (data: GuessData) => void;
  
  // Server to Client
  room_created: (data: { room: GameRoom; player: Player }) => void;
  room_joined: (data: { room: GameRoom; player: Player }) => void;
  room_left: (data: { room: GameRoom; player: Player }) => void;
  room_updated: (data: { room: GameRoom }) => void;
  round_info: (data: { roundInfo: RoundInfo; isDrawer: boolean }) => void;
  draw_broadcast: (data: DrawingUpdate) => void;
  guess_result: (data: GuessResult) => void;
  round_end: (data: RoundEnd) => void;
  score_update: (data: ScoreUpdate) => void;
  next_round: (data: NextRound) => void;
  round_start: (data: { roundInfo: RoundInfo; isDrawer: boolean }) => void;
  error: (data: { message: string }) => void;
}
