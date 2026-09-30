import { Chess, Move } from 'chess.js';
import { TranspositionTable, Bound } from './tt.ts';
import { computeZobristHash } from './zobrist.ts';
import {
  boardConfig,
  createBoardBackend,
  setBoardBackendType,
  setExecutionMode,
  setDualValidate,
  captureBackendConfig,
  type BoardBackendType,
  type ExecutionMode,
  type BoardBackend,
  type BoardUndoState,
  type EngineMove
} from './board/index.ts';
import { evaluateBoardBitboard, evaluateBitboardBreakdown } from './bitboard/index.ts';

export { setBoardBackendType, setExecutionMode, setDualValidate, captureBackendConfig, evaluateBoardBitboard, evaluateBitboardBreakdown };
export type { BoardBackendType, ExecutionMode, BoardBackend, BoardUndoState, EngineMove };

export const tt = new TranspositionTable(1000000);

export const MAX_PLY = 64;
export const killerMoves = new Array(MAX_PLY).fill(0).map(() => [null, null] as [string | null, string | null]);

export const historyTable = new Map<string, number>();

export function clearKillerMoves() {
  for (let i = 0; i < MAX_PLY; i++) {
    killerMoves[i][0] = null;
    killerMoves[i][1] = null;
  }
}

export function clearHistoryTable() {
  historyTable.clear();
}

export const metrics = {
  nodes: 0,
  leafNodes: 0,
  terminalNodes: 0,
  quiescenceCalls: 0,
  quiescenceNodes: 0,
  alphaBetaCutoffs: 0,
  moveGenerationCalls: 0,
  moveOrderingCalls: 0,
  movesScored: 0,
  makeUndoCalls: 0,
  evaluatorCalls: 0,
  oracleCalls: 0,
  killerCandidates: 0,
  killerHits: 0,
  historyUpdates: 0,
  historyHits: 0,
  iterationsStarted: 0,
  iterationsCompleted: 0,
  lastCompletedDepth: 0,
  timeoutDuringIteration: false,
  clear() {
    this.nodes = 0;
    this.leafNodes = 0;
    this.terminalNodes = 0;
    this.quiescenceCalls = 0;
    this.quiescenceNodes = 0;
    this.alphaBetaCutoffs = 0;
    this.moveGenerationCalls = 0;
    this.moveOrderingCalls = 0;
    this.movesScored = 0;
    this.makeUndoCalls = 0;
    this.evaluatorCalls = 0;
    this.oracleCalls = 0;
    this.killerCandidates = 0;
    this.killerHits = 0;
    this.historyUpdates = 0;
    this.historyHits = 0;
    this.iterationsStarted = 0;
    this.iterationsCompleted = 0;
    this.lastCompletedDepth = 0;
    this.timeoutDuringIteration = false;
  }
};


const pieceValues: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Simplified piece-square tables
const pawnEvalWhite = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
];
const knightEval = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
];
const bishopEvalWhite = [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
];
const rookEvalWhite = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0]
];
const evalQ = [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
];
const kingEvalWhite = [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20]
];

const reverseArray = (array: number[][]) => {
  return array.slice().reverse();
};

const kingEvalEndgameWhite = [
    [-30,-20,-20,-10,-10,-20,-20,-30],
    [-20,-10, -5,  0,  0, -5,-10,-20],
    [-20, -5, 15, 20, 20, 15, -5,-20],
    [-20, -5, 20, 30, 30, 20, -5,-20],
    [-20, -5, 20, 30, 30, 20, -5,-20],
    [-20, -5, 15, 20, 20, 15, -5,-20],
    [-20,-20,  0,  0,  0,  0,-20,-20],
    [-30,-20,-15,-10,-10,-15,-20,-30]
];

const pawnEvalBlack = reverseArray(pawnEvalWhite);
const bishopEvalBlack = reverseArray(bishopEvalWhite);
const rookEvalBlack = reverseArray(rookEvalWhite);
const kingEvalBlack = reverseArray(kingEvalWhite);
const kingEvalEndgameBlack = reverseArray(kingEvalEndgameWhite);

function getAbsoluteValue(piece: any, isWhite: boolean, x: number, y: number, isEndgame: boolean) {
  if (piece.type === 'p') {
    return pieceValues.p + (isWhite ? pawnEvalWhite[y][x] : pawnEvalBlack[y][x]);
  } else if (piece.type === 'r') {
    return pieceValues.r + (isWhite ? rookEvalWhite[y][x] : rookEvalBlack[y][x]);
  } else if (piece.type === 'n') {
    return pieceValues.n + knightEval[y][x];
  } else if (piece.type === 'b') {
    return pieceValues.b + (isWhite ? bishopEvalWhite[y][x] : bishopEvalBlack[y][x]);
  } else if (piece.type === 'q') {
    return pieceValues.q + evalQ[y][x];
  } else if (piece.type === 'k') {
    if (isEndgame) {
      return pieceValues.k + (isWhite ? kingEvalEndgameWhite[y][x] : kingEvalEndgameBlack[y][x]);
    } else {
      return pieceValues.k + (isWhite ? kingEvalWhite[y][x] : kingEvalBlack[y][x]);
    }
  }
  return 0;
}

function isPassedPawn(board: any[][], x: number, y: number, isWhite: boolean): boolean {
  const direction = isWhite ? -1 : 1;
  const endRow = isWhite ? -1 : 8;

  for (let r = y + direction; r !== endRow; r += direction) {
    // Same file
    const piece = board[r][x];
    if (piece && piece.type === 'p' && piece.color !== (isWhite ? 'w' : 'b')) return false;

    // Left file
    if (x > 0) {
      const leftPiece = board[r][x - 1];
      if (leftPiece && leftPiece.type === 'p' && leftPiece.color !== (isWhite ? 'w' : 'b')) return false;
    }

    // Right file
    if (x < 7) {
      const rightPiece = board[r][x + 1];
      if (rightPiece && rightPiece.type === 'p' && rightPiece.color !== (isWhite ? 'w' : 'b')) return false;
    }
  }
  return true;
}

const PASSED_PAWN_BONUS = [0, 5, 10, 20, 35, 60, 100, 0];
const BISHOP_PAIR_BONUS = 50;

// Rook Activity constants (conservative starting values)
const ROOK_OPEN_FILE_BONUS = 15;
const ROOK_SEMI_OPEN_FILE_BONUS = 8;

// Pawn Structure constants (conservative starting values)
export const DOUBLED_PAWN_PENALTY = 10;
export const ISOLATED_PAWN_PENALTY = 10;

export const pawnStructureConfig = {
  doubledPawnPenalty: DOUBLED_PAWN_PENALTY,
  isolatedPawnPenalty: ISOLATED_PAWN_PENALTY
};

export function countDoubledPawns(pawnCounts: Uint8Array): number {
  let excess = 0;
  for (let j = 0; j < 8; j++) {
    if (pawnCounts[j] > 1) excess += pawnCounts[j] - 1;
  }
  return excess;
}

export function countIsolatedPawns(pawnCounts: Uint8Array): number {
  let isolated = 0;
  for (let j = 0; j < 8; j++) {
    const hasAdj = (j > 0 && pawnCounts[j - 1] > 0) || (j < 7 && pawnCounts[j + 1] > 0);
    if (!hasAdj && pawnCounts[j] > 0) isolated += pawnCounts[j];
  }
  return isolated;
}

// Mobility constants (conservative starting values)
export const MOBILITY_BONUS_PER_MOVE = 1;

export const mobilityConfig = {
  bonusPerMove: MOBILITY_BONUS_PER_MOVE,
  usePseudoLegal: false
};

export interface MobilityBreakdown {
  pawns: number;
  knights: number;
  bishops: number;
  rooks: number;
  queens: number;
  king: number;
  totalNonKing: number;
  total: number;
}

/**
 * ORACLE: Reference legal mobility using standard full chess.js movegen.
 */
export function referenceLegalMobility(game: Chess, color: 'w' | 'b'): MobilityBreakdown {
  const g = game as any;
  const originalTurn = g._turn;
  g._turn = color;
  const rawMoves = typeof g._moves === 'function' ? g._moves({ legal: true }) : [];
  g._turn = originalTurn;

  const res: MobilityBreakdown = {
    pawns: 0,
    knights: 0,
    bishops: 0,
    rooks: 0,
    queens: 0,
    king: 0,
    totalNonKing: 0,
    total: rawMoves.length
  };

  for (let i = 0; i < rawMoves.length; i++) {
    const p = rawMoves[i].piece.toLowerCase();
    if (p === 'p') res.pawns++;
    else if (p === 'n') res.knights++;
    else if (p === 'b') res.bishops++;
    else if (p === 'r') res.rooks++;
    else if (p === 'q') res.queens++;
    else if (p === 'k') res.king++;
  }
  res.totalNonKing = res.pawns + res.knights + res.bishops + res.rooks + res.queens;
  return res;
}

/**
 * Count legal (or pseudo-legal if configured) moves for a given color, strictly excluding the King.
 * Optimized: skips King moves, castling legality raychecks, and array allocations.
 * Checks legality strictly using in-place _makeMove / _isKingAttacked / _undoMove.
 */
export function countMobility(game: Chess, color: 'w' | 'b'): number {
  const g = game as any;
  const originalTurn = g._turn;
  const originalEp = g._epSquare;
  g._turn = color;
  if (color !== originalTurn) {
    g._epSquare = -1;
  }

  if (mobilityConfig.usePseudoLegal) {
    const rawMoves = typeof g._moves === 'function' ? g._moves({ legal: false }) : [];
    g._epSquare = originalEp;
    g._turn = originalTurn;
    let count = 0;
    for (let i = 0; i < rawMoves.length; i++) {
      const p = rawMoves[i].piece;
      if (p !== 'k' && p !== 'K') count++;
    }
    return count;
  }

  // Optimized legal counting: skips all king moves and castling raychecks
  const pseudoMoves = typeof g._moves === 'function' ? g._moves({ legal: false }) : [];
  let count = 0;
  for (let i = 0; i < pseudoMoves.length; i++) {
    const m = pseudoMoves[i];
    if (m.piece === 'k' || m.piece === 'K') continue;
    g._makeMove(m);
    if (!g._isKingAttacked(color)) {
      count++;
    }
    g._undoMove();
  }
  g._epSquare = originalEp;
  g._turn = originalTurn;
  return count;
}

/**
 * Optimized breakdown generator for test equivalence and diagnostics.
 */
export function optimizedLegalMobility(game: Chess, color: 'w' | 'b'): MobilityBreakdown {
  const g = game as any;
  const originalTurn = g._turn;
  const originalEp = g._epSquare;
  g._turn = color;
  if (color !== originalTurn) {
    g._epSquare = -1;
  }

  const pseudoMoves = typeof g._moves === 'function' ? g._moves({ legal: false }) : [];
  const res: MobilityBreakdown = {
    pawns: 0,
    knights: 0,
    bishops: 0,
    rooks: 0,
    queens: 0,
    king: 0,
    totalNonKing: 0,
    total: 0
  };

  for (let i = 0; i < pseudoMoves.length; i++) {
    const m = pseudoMoves[i];
    const p = m.piece.toLowerCase();
    g._makeMove(m);
    if (!g._isKingAttacked(color)) {
      if (p === 'p') res.pawns++;
      else if (p === 'n') res.knights++;
      else if (p === 'b') res.bishops++;
      else if (p === 'r') res.rooks++;
      else if (p === 'q') res.queens++;
      else if (p === 'k') res.king++;
      res.total++;
    }
    g._undoMove();
  }
  g._epSquare = originalEp;
  g._turn = originalTurn;
  res.totalNonKing = res.pawns + res.knights + res.bishops + res.rooks + res.queens;
  return res;
}

export function evaluateMobility(game: Chess): {
  whiteMobility: number;
  blackMobility: number;
  mobilityDelta: number;
  score: number;
} {
  const whiteMobility = countMobility(game, 'w');
  const blackMobility = countMobility(game, 'b');
  const mobilityDelta = whiteMobility - blackMobility;
  const score = mobilityDelta * mobilityConfig.bonusPerMove;
  return { whiteMobility, blackMobility, mobilityDelta, score };
}

// King Safety: Pawn Shield constants
export const PAWN_SHIELD_BONUS = 8;

export const kingSafetyConfig = {
  pawnShieldBonus: PAWN_SHIELD_BONUS
};

/**
 * Counts the number of allied pawns in the 3 squares immediately in front of the King:
 *   White: rank R+1 (row r-1), files c-1, c, c+1
 *   Black: rank R-1 (row r+1), files c-1, c, c+1
 * Strictly O(1) static board inspection. No move generation, no legal checks.
 * Returns: 0..3
 */
export function countPawnShield(
  boardOrGame: Chess | any[][],
  color: 'w' | 'b',
  kingRow?: number,
  kingCol?: number
): number {
  const board = typeof (boardOrGame as any).board === 'function'
    ? (boardOrGame as Chess).board()
    : (boardOrGame as any[][]);

  let r = kingRow;
  let c = kingCol;

  if (r === undefined || c === undefined) {
    r = -1;
    c = -1;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type === 'k' && piece.color === color) {
          r = i;
          c = j;
          break;
        }
      }
      if (r !== -1) break;
    }
  }

  if (r === -1 || c === -1) return 0;

  const targetRow = color === 'w' ? r - 1 : r + 1;
  if (targetRow < 0 || targetRow > 7) return 0;

  let count = 0;
  for (let offset = -1; offset <= 1; offset++) {
    const targetCol = c + offset;
    if (targetCol >= 0 && targetCol <= 7) {
      const piece = board[targetRow][targetCol];
      if (piece && piece.type === 'p' && piece.color === color) {
        count++;
      }
    }
  }

  return count;
}

export function evaluatePawnShield(boardOrGame: Chess | any[][]): {
  whiteShield: number;
  blackShield: number;
  shieldDelta: number;
  score: number;
} {
  const whiteShield = countPawnShield(boardOrGame, 'w');
  const blackShield = countPawnShield(boardOrGame, 'b');
  const shieldDelta = whiteShield - blackShield;
  const score = shieldDelta * kingSafetyConfig.pawnShieldBonus;
  return { whiteShield, blackShield, shieldDelta, score };
}

// King Safety: King Attackers constants
export const KING_ATTACKER_PENALTY = 6;

export const kingAttackersConfig = {
  attackerPenalty: KING_ATTACKER_PENALTY
};

/**
 * Checks whether square (r, c) is one of the 8 adjacent squares around the King at (kr, kc).
 */
export function isKingAdjacent(r: number, c: number, kr: number, kc: number): boolean {
  return Math.abs(r - kr) <= 1 && Math.abs(c - kc) <= 1 && (r !== kr || c !== kc);
}

const KNIGHT_OFFSETS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1]
];

const BISHOP_DIRECTIONS = [
  [-1, -1], [-1, 1], [1, -1], [1, 1]
];

const ROOK_DIRECTIONS = [
  [-1, 0], [1, 0], [0, -1], [0, 1]
];

const QUEEN_DIRECTIONS = [
  [-1, -1], [-1, 1], [1, -1], [1, 1],
  [-1, 0], [1, 0], [0, -1], [0, 1]
];

/**
 * Counts the number of distinct enemy pieces attacking the 8-square zone adjacent to the King.
 * A piece counts as at most 1 attacker regardless of how many squares it attacks.
 * Sliding pieces respect blocking pieces.
 * Enemy King is strictly excluded.
 * Strictly static board inspection. No movegen, no legal checks.
 */
export function countKingAttackers(
  boardOrGame: Chess | any[][],
  kingColor: 'w' | 'b',
  kingRow?: number,
  kingCol?: number
): number {
  const board = typeof (boardOrGame as any).board === 'function'
    ? (boardOrGame as Chess).board()
    : (boardOrGame as any[][]);

  let kr = kingRow;
  let kc = kingCol;

  if (kr === undefined || kc === undefined || kr === -1 || kc === -1) {
    kr = -1;
    kc = -1;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type === 'k' && piece.color === kingColor) {
          kr = i;
          kc = j;
          break;
        }
      }
      if (kr !== -1) break;
    }
  }

  if (kr === -1 || kc === -1) return 0;

  const enemyColor = kingColor === 'w' ? 'b' : 'w';
  let attackerCount = 0;

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (!piece || piece.color !== enemyColor || piece.type === 'k') {
        continue;
      }

      let attacksKingZone = false;

      if (piece.type === 'p') {
        const pawnRowStep = enemyColor === 'w' ? -1 : 1;
        const targetRow = i + pawnRowStep;
        if (targetRow >= 0 && targetRow <= 7) {
          if (j > 0 && isKingAdjacent(targetRow, j - 1, kr, kc)) {
            attacksKingZone = true;
          } else if (j < 7 && isKingAdjacent(targetRow, j + 1, kr, kc)) {
            attacksKingZone = true;
          }
        }
      } else if (piece.type === 'n') {
        for (let o = 0; o < 8; o++) {
          const tr = i + KNIGHT_OFFSETS[o][0];
          const tc = j + KNIGHT_OFFSETS[o][1];
          if (tr >= 0 && tr <= 7 && tc >= 0 && tc <= 7) {
            if (isKingAdjacent(tr, tc, kr, kc)) {
              attacksKingZone = true;
              break;
            }
          }
        }
      } else if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
        const dirs = piece.type === 'b'
          ? BISHOP_DIRECTIONS
          : piece.type === 'r'
          ? ROOK_DIRECTIONS
          : QUEEN_DIRECTIONS;

        for (let d = 0; d < dirs.length; d++) {
          const dr = dirs[d][0];
          const dc = dirs[d][1];
          let tr = i + dr;
          let tc = j + dc;

          while (tr >= 0 && tr <= 7 && tc >= 0 && tc <= 7) {
            if (isKingAdjacent(tr, tc, kr, kc)) {
              attacksKingZone = true;
              break;
            }
            if (board[tr][tc] !== null) {
              // Blocked before reaching king zone
              break;
            }
            tr += dr;
            tc += dc;
          }

          if (attacksKingZone) break;
        }
      }

      if (attacksKingZone) {
        attackerCount++;
      }
    }
  }

  return attackerCount;
}

export function evaluateKingAttackers(boardOrGame: Chess | any[][]): {
  attacksOnWhiteKing: number;
  attacksOnBlackKing: number;
  attackerDelta: number;
  score: number;
} {
  const attacksOnWhiteKing = countKingAttackers(boardOrGame, 'w');
  const attacksOnBlackKing = countKingAttackers(boardOrGame, 'b');
  const attackerDelta = attacksOnBlackKing - attacksOnWhiteKing;
  const score = attackerDelta * kingAttackersConfig.attackerPenalty;
  return { attacksOnWhiteKing, attacksOnBlackKing, attackerDelta, score };
}

// King Safety: King Tropism constants
export const KING_TROPISM_BONUS = 2;

export const kingTropismConfig = {
  enabled: true
};

/**
 * Calculates King Tropism for pieces of the enemyColor towards the king of kingColor.
 * Only Knight, Bishop, Rook, Queen participate. Pawn and King are strictly excluded.
 * Uses Chebyshev distance: max(abs(pieceRow - kingRow), abs(pieceCol - kingCol)).
 * distance 1 -> 6 cp
 * distance 2 -> 4 cp
 * distance 3 -> 2 cp
 * distance >= 4 -> 0 cp
 * Pure static board inspection. No movegen, no legal checks.
 */
export function calculateKingTropism(
  boardOrGame: Chess | any[][],
  kingColor: 'w' | 'b',
  kingRow?: number,
  kingCol?: number
): number {
  const board = typeof (boardOrGame as any).board === 'function'
    ? (boardOrGame as Chess).board()
    : (boardOrGame as any[][]);

  let kr = kingRow;
  let kc = kingCol;

  if (kr === undefined || kc === undefined || kr === -1 || kc === -1) {
    kr = -1;
    kc = -1;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type === 'k' && piece.color === kingColor) {
          kr = i;
          kc = j;
          break;
        }
      }
      if (kr !== -1) break;
    }
  }

  if (kr === -1 || kc === -1) return 0;

  const enemyColor = kingColor === 'w' ? 'b' : 'w';
  let totalTropism = 0;

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (!piece || piece.color !== enemyColor) continue;

      // Only Knight, Bishop, Rook, Queen count
      if (piece.type !== 'n' && piece.type !== 'b' && piece.type !== 'r' && piece.type !== 'q') {
        continue;
      }

      const dist = Math.max(Math.abs(i - kr), Math.abs(j - kc));
      if (dist === 1) {
        totalTropism += 6;
      } else if (dist === 2) {
        totalTropism += 4;
      } else if (dist === 3) {
        totalTropism += 2;
      }
    }
  }

  return totalTropism;
}

export function evaluateKingTropism(boardOrGame: Chess | any[][]): {
  tropismWhiteKing: number;
  tropismBlackKing: number;
  tropismDelta: number;
  score: number;
} {
  const tropismWhiteKing = calculateKingTropism(boardOrGame, 'w');
  const tropismBlackKing = calculateKingTropism(boardOrGame, 'b');
  const tropismDelta = tropismBlackKing - tropismWhiteKing;
  const score = tropismDelta;
  return { tropismWhiteKing, tropismBlackKing, tropismDelta, score };
}

/**
 * Returns file status:
 *   'open'      — no pawns of either color on the file
 *   'semi_w'    — no white pawns, but black pawns present
 *   'semi_b'    — no black pawns, but white pawns present
 *   'closed'    — both colors have pawns on the file
 *
 * Pure pawn-presence scan. No movegen, no raycasting.
 */
function getFileStatus(
  whitePawnsOnFile: boolean,
  blackPawnsOnFile: boolean
): 'open' | 'semi_w' | 'semi_b' | 'closed' {
  if (!whitePawnsOnFile && !blackPawnsOnFile) return 'open';
  if (!whitePawnsOnFile && blackPawnsOnFile) return 'semi_w';
  if (whitePawnsOnFile && !blackPawnsOnFile) return 'semi_b';
  return 'closed';
}

export function evaluateBoard(game: Chess) {
  metrics.evaluatorCalls++;
  let mgEval = 0;
  let egEval = 0;
  let phase = 0;
  let passedPawnScore = 0;

  let whiteBishops = 0;
  let blackBishops = 0;

  // Per-file pawn counts (index 0-7 = files a-h)
  const whitePawnCounts = new Uint8Array(8);
  const blackPawnCounts = new Uint8Array(8);

  // Rook locations deferred for activity scoring
  type RookEntry = { file: number; color: 'w' | 'b' };
  const rooks: RookEntry[] = [];

  // King locations for Pawn Shield evaluation
  let whiteKingRow = -1;
  let whiteKingCol = -1;
  let blackKingRow = -1;
  let blackKingCol = -1;

  const board = game.board();
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        if (piece.type === 'n' || piece.type === 'b') phase += 1;
        else if (piece.type === 'r') phase += 2;
        else if (piece.type === 'q') phase += 4;

        if (piece.type === 'b') {
          if (piece.color === 'w') whiteBishops++;
          else blackBishops++;
        }

        if (piece.type === 'p') {
          if (piece.color === 'w') whitePawnCounts[j]++;
          else blackPawnCounts[j]++;
        }

        if (piece.type === 'r') {
          rooks.push({ file: j, color: piece.color });
        }

        if (piece.type === 'k') {
          if (piece.color === 'w') {
            whiteKingRow = i;
            whiteKingCol = j;
          } else {
            blackKingRow = i;
            blackKingCol = j;
          }
        }

        if (piece.type === 'p' && isPassedPawn(board, j, i, piece.color === 'w')) {
          const relativeRank = piece.color === 'w' ? 7 - i : i;
          const bonus = PASSED_PAWN_BONUS[relativeRank] || 0;
          if (piece.color === 'w') passedPawnScore += bonus;
          else passedPawnScore -= bonus;
        }

        let mgVal = getAbsoluteValue(piece, piece.color === 'w', j, i, false);
        let egVal = getAbsoluteValue(piece, piece.color === 'w', j, i, true);

        if (piece.color === 'w') {
          mgEval += mgVal;
          egEval += egVal;
        } else {
          mgEval -= mgVal;
          egEval -= egVal;
        }
      }
    }
  }

  const MAX_PHASE = 24;
  if (phase > MAX_PHASE) phase = MAX_PHASE;

  let baseScore = Math.round((mgEval * phase + egEval * (MAX_PHASE - phase)) / MAX_PHASE);
  baseScore += passedPawnScore;

  if (whiteBishops >= 2) baseScore += BISHOP_PAIR_BONUS;
  if (blackBishops >= 2) baseScore -= BISHOP_PAIR_BONUS;

  // Rook Activity — scored after full board scan (file pawn data complete)
  for (const rook of rooks) {
    const fileStatus = getFileStatus(
      whitePawnCounts[rook.file] > 0,
      blackPawnCounts[rook.file] > 0
    );
    const sign = rook.color === 'w' ? 1 : -1;
    if (fileStatus === 'open') {
      baseScore += sign * ROOK_OPEN_FILE_BONUS;
    } else if (
      (fileStatus === 'semi_w' && rook.color === 'w') ||
      (fileStatus === 'semi_b' && rook.color === 'b')
    ) {
      baseScore += sign * ROOK_SEMI_OPEN_FILE_BONUS;
    }
  }

  // Pawn Structure: Doubled and Isolated pawns
  if (pawnStructureConfig.doubledPawnPenalty > 0) {
    const whiteDoubled = countDoubledPawns(whitePawnCounts);
    const blackDoubled = countDoubledPawns(blackPawnCounts);
    baseScore -= whiteDoubled * pawnStructureConfig.doubledPawnPenalty;
    baseScore += blackDoubled * pawnStructureConfig.doubledPawnPenalty;
  }

  if (pawnStructureConfig.isolatedPawnPenalty > 0) {
    const whiteIsolated = countIsolatedPawns(whitePawnCounts);
    const blackIsolated = countIsolatedPawns(blackPawnCounts);
    baseScore -= whiteIsolated * pawnStructureConfig.isolatedPawnPenalty;
    baseScore += blackIsolated * pawnStructureConfig.isolatedPawnPenalty;
  }

  // Mobility: legal moves excluding King
  if (mobilityConfig.bonusPerMove > 0) {
    const whiteMobility = countMobility(game, 'w');
    const blackMobility = countMobility(game, 'b');
    const mobilityDelta = whiteMobility - blackMobility;
    baseScore += mobilityDelta * mobilityConfig.bonusPerMove;
  }

  // King Safety: Pawn Shield
  if (kingSafetyConfig.pawnShieldBonus > 0) {
    const whiteShield = countPawnShield(board, 'w', whiteKingRow, whiteKingCol);
    const blackShield = countPawnShield(board, 'b', blackKingRow, blackKingCol);
    baseScore += (whiteShield - blackShield) * kingSafetyConfig.pawnShieldBonus;
  }

  // King Safety: King Attackers
  if (kingAttackersConfig.attackerPenalty > 0) {
    const attacksOnWhiteKing = countKingAttackers(board, 'w', whiteKingRow, whiteKingCol);
    const attacksOnBlackKing = countKingAttackers(board, 'b', blackKingRow, blackKingCol);
    baseScore += (attacksOnBlackKing - attacksOnWhiteKing) * kingAttackersConfig.attackerPenalty;
  }

  // King Safety: King Tropism
  if (kingTropismConfig.enabled) {
    const tropismWhiteKing = calculateKingTropism(board, 'w', whiteKingRow, whiteKingCol);
    const tropismBlackKing = calculateKingTropism(board, 'b', blackKingRow, blackKingCol);
    baseScore += (tropismBlackKing - tropismWhiteKing);
  }

  return baseScore;
}


export const MATE_SCORE = 100000;

// Quiescence Search: conservative max depth to prevent search explosion
const QUIESCENCE_MAX_DEPTH = 6;

type SearchTimeBudget = { startTime?: number; maxTimeMs?: number };
const DEFAULT_SEARCH_TIME_MS = 3000;

function throwIfSearchTimedOut(options?: SearchTimeBudget): void {
  if (
    options?.startTime !== undefined &&
    options.maxTimeMs !== undefined &&
    performance.now() - options.startTime > options.maxTimeMs
  ) {
    throw new Error('TIMEOUT');
  }
}

/**
 * Quiescence Search — extends the search at leaf nodes for tactical moves only.
 * Only considers captures, promotions, and checks to avoid the horizon effect.
 * Uses stand-pat evaluation as a lower bound (for maximizing) or upper bound (for minimizing).
 */
export function quiescence(
  game: Chess,
  alpha: number,
  beta: number,
  isMaximizingPlayer: boolean,
  qDepth: number,
  backend?: BoardBackend,
  searchMode: ExecutionMode = 'CHESSJS_ONLY',
  options?: SearchTimeBudget
): number {
  throwIfSearchTimedOut(options);
  metrics.quiescenceCalls++;
  metrics.quiescenceNodes++;

  // Terminal node check
  if (backend && searchMode !== 'CHESSJS_ONLY') {
    const bs = (backend as any).getBoardState();
    if (bs && (bs.whiteKing === 0n || bs.blackKing === 0n)) {
      metrics.terminalNodes++;
      return 0;
    }
  }

  let isGameOver = false;
  let isCheckmate = false;
  let currentTurn = 'w';

  if (searchMode === 'CHESSJS_ONLY' || !backend) {
    isGameOver = game.isGameOver();
    isCheckmate = game.isCheckmate();
    currentTurn = game.turn();
  } else if (searchMode === 'BITBOARD_ONLY') {
    isGameOver = backend.isGameOver();
    isCheckmate = backend.isCheckmate();
    currentTurn = backend.getTurn();
  } else {
    // BITBOARD_WITH_ORACLE
    metrics.oracleCalls++;
    isGameOver = backend.isGameOver();
    isCheckmate = backend.isCheckmate();
    currentTurn = backend.getTurn();
    const refGameOver = game.isGameOver();
    const refCheckmate = game.isCheckmate();
    if (isGameOver !== refGameOver || isCheckmate !== refCheckmate) {
      throw new Error(`[DualValidator DIVERGENCE] Quiescence terminal mismatch: bb(over=${isGameOver}, mate=${isCheckmate}) vs ref(over=${refGameOver}, mate=${refCheckmate})`);
    }
  }

  if (isGameOver) {
    metrics.terminalNodes++;
    if (isCheckmate) {
      return currentTurn === 'w' ? -MATE_SCORE - qDepth : MATE_SCORE + qDepth;
    }
    return 0; // Stalemate, draw
  }

  // Stand-pat: the static evaluation of the current position
  let standPat: number;
  if (searchMode === 'CHESSJS_ONLY' || !backend) {
    standPat = evaluateBoard(game);
  } else if (searchMode === 'BITBOARD_ONLY') {
    metrics.evaluatorCalls++;
    standPat = backend.evaluate();
  } else {
    // BITBOARD_WITH_ORACLE
    metrics.oracleCalls++;
    const bbEval = backend.evaluate();
    const refEval = evaluateBoard(game);
    if (bbEval !== refEval) {
      throw new Error(`[DualValidator DIVERGENCE] Static evaluation mismatch: bb=${bbEval} vs ref=${refEval} (diff=${bbEval - refEval})`);
    }
    standPat = bbEval;
  }

  // Quiescence depth limit reached — return static eval
  if (qDepth <= 0) {
    return standPat;
  }

  // Stand-pat cutoff (fail-high / fail-low)
  if (isMaximizingPlayer) {
    if (standPat >= beta) {
      return standPat;
    }
    if (standPat > alpha) {
      alpha = standPat;
    }
  } else {
    if (standPat <= alpha) {
      return standPat;
    }
    if (standPat < beta) {
      beta = standPat;
    }
  }

  // Get all legal moves and filter to tactical moves only
  metrics.moveGenerationCalls++;
  let movesToSearch: InternalMove[] = [];

  if (searchMode === 'CHESSJS_ONLY' || !backend) {
    const allMoves = (game as any)._moves({ legal: true }) as InternalMove[];
    for (let i = 0; i < allMoves.length; i++) {
      throwIfSearchTimedOut(options);
      const m = allMoves[i];
      if (m.captured || m.promotion || (m.flags & 8)) {
        movesToSearch.push(m);
      } else {
        metrics.makeUndoCalls++;
        (game as any)._makeMove(m);
        const givesCheck = game.inCheck();
        (game as any)._undoMove();
        if (givesCheck) {
          movesToSearch.push(m);
        }
      }
    }
  } else if (searchMode === 'BITBOARD_ONLY') {
    const allMoves = backend.generateLegalMoves() as InternalMove[];
    for (let i = 0; i < allMoves.length; i++) {
      throwIfSearchTimedOut(options);
      const m = allMoves[i];
      if (m.captured || m.promotion || (m.flags & 8)) {
        movesToSearch.push(m);
      } else {
        metrics.makeUndoCalls++;
        const u = backend.makeMove(m);
        const givesCheck = backend.isInCheck();
        backend.undoMove(u);
        if (givesCheck) {
          movesToSearch.push(m);
        }
      }
    }
  } else {
    // BITBOARD_WITH_ORACLE
    metrics.oracleCalls++;
    const bbAll = backend.generateLegalMoves() as InternalMove[];
    const refAll = (game as any)._moves({ legal: true }) as InternalMove[];
    if (bbAll.length !== refAll.length) {
      throw new Error(`[DualValidator DIVERGENCE] Quiescence movegen count mismatch: bb=${bbAll.length} vs ref=${refAll.length}`);
    }

    const bbMoves: InternalMove[] = [];
    for (let i = 0; i < bbAll.length; i++) {
      throwIfSearchTimedOut(options);
      const m = bbAll[i];
      if (m.captured || m.promotion || (m.flags & 8)) {
        bbMoves.push(m);
      } else {
        metrics.makeUndoCalls++;
        const u = backend.makeMove(m);
        const givesCheck = backend.isInCheck();
        backend.undoMove(u);
        if (givesCheck) bbMoves.push(m);
      }
    }

    const refMoves: InternalMove[] = [];
    for (let i = 0; i < refAll.length; i++) {
      throwIfSearchTimedOut(options);
      const m = refAll[i];
      if (m.captured || m.promotion || (m.flags & 8)) {
        refMoves.push(m);
      } else {
        metrics.makeUndoCalls++;
        (game as any)._makeMove(m);
        const givesCheck = game.inCheck();
        (game as any)._undoMove();
        if (givesCheck) refMoves.push(m);
      }
    }

    if (bbMoves.length !== refMoves.length) {
      throw new Error(`[DualValidator DIVERGENCE] Quiescence tactical moves count mismatch: bb=${bbMoves.length} vs ref=${refMoves.length}`);
    }
    movesToSearch = bbMoves;
  }

  // If no tactical moves, position is quiet — return stand-pat
  if (movesToSearch.length === 0) {
    return standPat;
  }

  // Order tactical moves for better pruning
  const currentQTurn = isMaximizingPlayer ? 'w' : 'b';
  const orderedMoves = orderMoves(movesToSearch, currentQTurn) as InternalMove[];

  if (isMaximizingPlayer) {
    let bestVal = standPat; // Stand-pat as baseline
    for (let i = 0; i < orderedMoves.length; i++) {
      throwIfSearchTimedOut(options);
      metrics.quiescenceNodes++;
      metrics.makeUndoCalls++;

      let bbUndo: BoardUndoState | undefined;
      if (backend && searchMode !== 'CHESSJS_ONLY') {
        bbUndo = backend.makeMove(orderedMoves[i]);
      }
      if (searchMode !== 'BITBOARD_ONLY') {
        (game as any)._makeMove(orderedMoves[i]);
      }

      let val: number;
      try {
        val = quiescence(game, alpha, beta, false, qDepth - 1, backend, searchMode, options);
      } finally {
        if (backend && searchMode !== 'CHESSJS_ONLY' && bbUndo) {
          backend.undoMove(bbUndo);
        }
        if (searchMode !== 'BITBOARD_ONLY') {
          (game as any)._undoMove();
        }
      }
      if (val > bestVal) {
        bestVal = val;
      }
      if (bestVal > alpha) {
        alpha = bestVal;
      }
      if (beta <= alpha) {
        metrics.alphaBetaCutoffs++;
        break;
      }
    }
    return bestVal;
  } else {
    let bestVal = standPat; // Stand-pat as baseline
    for (let i = 0; i < orderedMoves.length; i++) {
      throwIfSearchTimedOut(options);
      metrics.quiescenceNodes++;
      metrics.makeUndoCalls++;

      let bbUndo: BoardUndoState | undefined;
      if (backend && searchMode !== 'CHESSJS_ONLY') {
        bbUndo = backend.makeMove(orderedMoves[i]);
      }
      if (searchMode !== 'BITBOARD_ONLY') {
        (game as any)._makeMove(orderedMoves[i]);
      }

      let val: number;
      try {
        val = quiescence(game, alpha, beta, true, qDepth - 1, backend, searchMode, options);
      } finally {
        if (backend && searchMode !== 'CHESSJS_ONLY' && bbUndo) {
          backend.undoMove(bbUndo);
        }
        if (searchMode !== 'BITBOARD_ONLY') {
          (game as any)._undoMove();
        }
      }
      if (val < bestVal) {
        bestVal = val;
      }
      if (bestVal < beta) {
        beta = bestVal;
      }
      if (beta <= alpha) {
        metrics.alphaBetaCutoffs++;
        break;
      }
    }
    return bestVal;
  }
}

export function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizingPlayer: boolean,
  options?: { startTime?: number, maxTimeMs?: number },
  ply: number = 0,
  backend?: BoardBackend,
  searchMode: ExecutionMode = 'CHESSJS_ONLY'
): number {
  const searchBudget = options ?? {
    startTime: performance.now(),
    maxTimeMs: DEFAULT_SEARCH_TIME_MS
  };
  throwIfSearchTimedOut(searchBudget);

  metrics.nodes++;
  const origAlpha = alpha;
  const origBeta = beta;

  let hash: number;
  if (backend && searchMode === 'BITBOARD_ONLY') {
    hash = backend.getZobristHash!();
  } else if (backend && searchMode === 'BITBOARD_WITH_ORACLE') {
    metrics.oracleCalls++;
    const bbHash = backend.getZobristHash!();
    const refHash = computeZobristHash(game);
    if (bbHash !== refHash) {
      throw new Error(`[DualValidator DIVERGENCE] Zobrist hash mismatch: bb=${bbHash} vs ref=${refHash}`);
    }
    hash = bbHash;
  } else {
    hash = computeZobristHash(game);
  }
  const ttEntry = tt.probe(hash);

  if (ttEntry && ttEntry.depth >= depth) {
    let scoreFromTT = ttEntry.score;
    if (scoreFromTT > 90000) scoreFromTT -= ply;
    else if (scoreFromTT < -90000) scoreFromTT += ply;

    if (ttEntry.bound === Bound.EXACT) {
      return scoreFromTT;
    } else if (ttEntry.bound === Bound.LOWERBOUND) {
      alpha = Math.max(alpha, scoreFromTT);
    } else if (ttEntry.bound === Bound.UPPERBOUND) {
      beta = Math.min(beta, scoreFromTT);
    }
    if (alpha >= beta) {
      metrics.alphaBetaCutoffs++;
      return scoreFromTT;
    }
  }

  if (backend && searchMode !== 'CHESSJS_ONLY') {
    const bs = (backend as any).getBoardState();
    if (bs && (bs.whiteKing === 0n || bs.blackKing === 0n)) {
      metrics.terminalNodes++;
      return 0;
    }
  }

  let isGameOver = false;
  let isCheckmate = false;
  let currentTurn = 'w';

  if (searchMode === 'CHESSJS_ONLY' || !backend) {
    isGameOver = game.isGameOver();
    isCheckmate = game.isCheckmate();
    currentTurn = game.turn();
  } else if (searchMode === 'BITBOARD_ONLY') {
    isGameOver = backend.isGameOver();
    isCheckmate = backend.isCheckmate();
    currentTurn = backend.getTurn();
  } else {
    // BITBOARD_WITH_ORACLE
    metrics.oracleCalls++;
    isGameOver = backend.isGameOver();
    isCheckmate = backend.isCheckmate();
    currentTurn = backend.getTurn();
    const refGameOver = game.isGameOver();
    const refCheckmate = game.isCheckmate();
    if (isGameOver !== refGameOver || isCheckmate !== refCheckmate) {
      throw new Error(`[DualValidator DIVERGENCE] Minimax terminal mismatch: bb(over=${isGameOver}, mate=${isCheckmate}) vs ref(over=${refGameOver}, mate=${refCheckmate})`);
    }
  }

  if (isGameOver) {
    metrics.terminalNodes++;
    if (isCheckmate) {
      return currentTurn === 'w' ? -MATE_SCORE + ply : MATE_SCORE - ply;
    }
    return 0; // Stalemate, 3-fold repetition, insufficient material
  }

  if (depth === 0) {
    metrics.leafNodes++;
    return quiescence(game, alpha, beta, isMaximizingPlayer, QUIESCENCE_MAX_DEPTH, backend, searchMode, searchBudget);
  }

  metrics.moveGenerationCalls++;
  let rawMoves: InternalMove[];

  if (searchMode === 'CHESSJS_ONLY' || !backend) {
    rawMoves = (game as any)._moves({ legal: true }) as InternalMove[];
  } else if (searchMode === 'BITBOARD_ONLY') {
    rawMoves = backend.generateLegalMoves() as InternalMove[];
  } else {
    // BITBOARD_WITH_ORACLE
    metrics.oracleCalls++;
    const bbMoves = backend.generateLegalMoves() as InternalMove[];
    const refMoves = (game as any)._moves({ legal: true }) as InternalMove[];
    if (bbMoves.length !== refMoves.length) {
      throw new Error(`[DualValidator DIVERGENCE] Minimax movegen count mismatch: bb=${bbMoves.length} vs ref=${refMoves.length}`);
    }
    rawMoves = bbMoves;
  }

  let moves = orderMoves(rawMoves, currentTurn, ttEntry?.bestMove, ply) as InternalMove[];
  let bestMoveKey: string | undefined = undefined;

  if (isMaximizingPlayer) {
    let bestVal = -Infinity;
    for (let i = 0; i < moves.length; i++) {
      metrics.makeUndoCalls++;
      let bbUndo: BoardUndoState | undefined;
      if (backend && searchMode !== 'CHESSJS_ONLY') {
        bbUndo = backend.makeMove(moves[i]);
      }
      if (searchMode !== 'BITBOARD_ONLY') {
        (game as any)._makeMove(moves[i]);
      }

      let val: number;
      try {
        val = minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer, searchBudget, ply + 1, backend, searchMode);
      } finally {
        if (backend && searchMode !== 'CHESSJS_ONLY' && bbUndo) {
          backend.undoMove(bbUndo);
        }
        if (searchMode !== 'BITBOARD_ONLY') {
          (game as any)._undoMove();
        }
      }
      if (val > bestVal) {
        bestVal = val;
        bestMoveKey = getMoveKey(moves[i]);
      }
      alpha = Math.max(alpha, bestVal);
      if (beta <= alpha) {
        metrics.alphaBetaCutoffs++;
        // Store Killer Move if it's a quiet move (not a capture or promotion)
        if (!moves[i].captured && !moves[i].promotion && !(moves[i].flags & 8)) {
          const key = getMoveKey(moves[i]);
          if (ply < MAX_PLY && killerMoves[ply][0] !== key) {
            killerMoves[ply][1] = killerMoves[ply][0];
            killerMoves[ply][0] = key;
          }
          const histKey = `${currentTurn}_${key}`;
          const currentHist = historyTable.get(histKey) || 0;
          historyTable.set(histKey, currentHist + depth * depth);
          metrics.historyUpdates++;
        }
        break;
      }
    }

    let bound = Bound.EXACT;
    if (bestVal <= origAlpha) bound = Bound.UPPERBOUND;
    else if (bestVal >= beta) bound = Bound.LOWERBOUND;

    let scoreToStore = bestVal;
    if (scoreToStore > 90000) scoreToStore += ply;
    else if (scoreToStore < -90000) scoreToStore -= ply;
    tt.store(hash, depth, scoreToStore, bound, bestMoveKey);

    return bestVal;
  } else {
    let bestVal = Infinity;
    for (let i = 0; i < moves.length; i++) {
      metrics.makeUndoCalls++;
      let bbUndo: BoardUndoState | undefined;
      if (backend && searchMode !== 'CHESSJS_ONLY') {
        bbUndo = backend.makeMove(moves[i]);
      }
      if (searchMode !== 'BITBOARD_ONLY') {
        (game as any)._makeMove(moves[i]);
      }

      let val: number;
      try {
        val = minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer, searchBudget, ply + 1, backend, searchMode);
      } finally {
        if (backend && searchMode !== 'CHESSJS_ONLY' && bbUndo) {
          backend.undoMove(bbUndo);
        }
        if (searchMode !== 'BITBOARD_ONLY') {
          (game as any)._undoMove();
        }
      }
      if (val < bestVal) {
        bestVal = val;
        bestMoveKey = getMoveKey(moves[i]);
      }
      beta = Math.min(beta, bestVal);
      if (beta <= alpha) {
        metrics.alphaBetaCutoffs++;
        // Store Killer Move if it's a quiet move (not a capture or promotion)
        if (!moves[i].captured && !moves[i].promotion && !(moves[i].flags & 8)) {
          const key = getMoveKey(moves[i]);
          if (ply < MAX_PLY && killerMoves[ply][0] !== key) {
            killerMoves[ply][1] = killerMoves[ply][0];
            killerMoves[ply][0] = key;
          }
          const histKey = `${currentTurn}_${key}`;
          const currentHist = historyTable.get(histKey) || 0;
          historyTable.set(histKey, currentHist + depth * depth);
          metrics.historyUpdates++;
        }
        break;
      }
    }

    let bound = Bound.EXACT;
    if (bestVal <= origAlpha) bound = Bound.UPPERBOUND;
    else if (bestVal >= origBeta) bound = Bound.LOWERBOUND;

    let scoreToStore = bestVal;
    if (scoreToStore > 90000) scoreToStore += ply;
    else if (scoreToStore < -90000) scoreToStore -= ply;
    tt.store(hash, depth, scoreToStore, bound, bestMoveKey);

    return bestVal;
  }
}

export type InternalMove = EngineMove;

export const SQUARES: string[] = [];
for (let rank = 8; rank >= 1; rank--) {
  for (let file = 0; file < 8; file++) {
    const sq = String.fromCharCode(97 + file) + rank;
    const ox88 = ((8 - rank) << 4) | file;
    SQUARES[ox88] = sq;
  }
}

export function getMoveKey(m: InternalMove | string): string {
  if (typeof m === 'string') return m;
  return SQUARES[m.from] + SQUARES[m.to] + (m.promotion || '');
}

export function orderMoves(
  moves: (InternalMove | string)[],
  turnOrGame?: Chess | string,
  ttMoveKey?: string,
  ply: number = 0
): (InternalMove | string)[] {
  metrics.moveOrderingCalls++;

  const scores = new Map<any, number>();
  for (const move of moves) {
    const key = getMoveKey(move);
    let score = scoreMoveForOrdering(move, key, ply, turnOrGame);
    if (key === ttMoveKey) score += 100000;
    scores.set(move, score);
  }

  return [...moves].sort((a, b) => scores.get(b)! - scores.get(a)!);
}

function scoreMoveForOrdering(
  move: InternalMove | string,
  moveKey: string,
  ply: number,
  turnOrGame?: Chess | string
): number {
  metrics.movesScored++;
  let score = 0;

  if (typeof move !== 'string') {
    // 1. Promotion
    if (move.promotion) {
      score += 1000;
      if (move.promotion === 'q') score += 100;
      else if (move.promotion === 'r') score += 50;
      else if (move.promotion === 'b') score += 30;
      else if (move.promotion === 'n') score += 30;
    }

    // 2. Captures — MVV-LVA
    if (move.captured || (move.flags & 8)) {
      score += 100;
      if (move.piece === 'p') score += 50;
    } else {
      // Quiet moves: evaluate Killer moves and History
      if (ply < MAX_PLY) {
        if (killerMoves[ply][0] === moveKey) {
          metrics.killerHits++;
          score += 60; // Primary killer
        } else if (killerMoves[ply][1] === moveKey) {
          metrics.killerHits++;
          score += 55; // Secondary killer
        }
      }
      const turn = typeof turnOrGame === 'string' ? turnOrGame : (move.color || (turnOrGame ? turnOrGame.turn() : 'w'));
      const histKey = `${turn}_${moveKey}`;
      const histScore = historyTable.get(histKey) || 0;
      if (histScore > 0) {
        metrics.historyHits++;
        score += Math.min(50, histScore);
      }
    }
    return score;
  }

  // Legacy string fallback
  const san = move;
  if (san.includes('=')) {
    score += 1000;
    if (san.includes('=Q')) score += 100;
    else if (san.includes('=R')) score += 50;
    else if (san.includes('=B')) score += 30;
    else if (san.includes('=N')) score += 30;
  }
  if (san.includes('x')) {
    score += 100;
    const isLowercaseStart = san[0] >= 'a' && san[0] <= 'h';
    if (isLowercaseStart) score += 50;
  } else {
    if (ply < MAX_PLY) {
      if (killerMoves[ply][0] === moveKey) {
        metrics.killerHits++;
        score += 60;
      } else if (killerMoves[ply][1] === moveKey) {
        metrics.killerHits++;
        score += 55;
      }
    }
    const cleanMove = san.replace(/[+#]/g, '');
    const turn = typeof turnOrGame === 'string' ? turnOrGame : (turnOrGame?.turn() || 'w');
    const histKey = `${turn}_${cleanMove}`;
    const histScore = historyTable.get(histKey) || 0;
    if (histScore > 0) {
      metrics.historyHits++;
      score += Math.min(50, histScore);
    }
  }
  return score;
}

export function calculateBestMove(
  game: Chess,
  difficulty: string,
  options?: { maxTimeMs?: number }
): string | null {
  metrics.moveGenerationCalls++;
  // 1. Capturar configuração imutável do backend para esta busca específica
  const searchConfig = captureBackendConfig();
  const searchMode = searchConfig.executionMode;
  const backend = createBoardBackend(game.fen(), searchConfig.backendType);

  const rawMoves = searchMode === 'CHESSJS_ONLY'
    ? ((game as any)._moves({ legal: true }) as InternalMove[])
    : (backend.generateLegalMoves() as InternalMove[]);

  if (searchMode === 'BITBOARD_WITH_ORACLE') {
    metrics.oracleCalls++;
    const refMoves = (game as any)._moves({ legal: true }) as InternalMove[];
    if (rawMoves.length !== refMoves.length) {
      throw new Error(`[DualValidator DIVERGENCE] Root move count mismatch: bb=${rawMoves.length} vs ref=${refMoves.length}`);
    }
  }

  if (rawMoves.length === 0) return null;

  if (difficulty === 'iniciante') {
    const chosen = rawMoves[Math.floor(Math.random() * rawMoves.length)];
    return (game as any)._moveToSan(chosen, rawMoves);
  }

  let targetDepth = 1;
  if (difficulty === 'facil') targetDepth = 1;
  else if (difficulty === 'medio') targetDepth = 2;
  else if (difficulty === 'dificil') targetDepth = 3;
  else if (difficulty === 'profissional') targetDepth = 3;
  else if (difficulty === 'depth4') targetDepth = 4;
  else if (difficulty === 'depth5') targetDepth = 5;

  // Clear TT before independent analysis (Etapa 12)
  tt.clear();
  clearKillerMoves();
  clearHistoryTable();
  metrics.clear();

  const searchOptions = {
    startTime: performance.now(),
    maxTimeMs: options?.maxTimeMs ?? DEFAULT_SEARCH_TIME_MS
  };

  let globalBestMoveKey: string | null = null;
  let globalBestMoveObj: InternalMove | null = null;
  let globalBestValue = game.turn() === 'w' ? -Infinity : Infinity;

  for (let currentDepth = 1; currentDepth <= targetDepth; currentDepth++) {
    metrics.iterationsStarted++;

    let currentBestMoveObj: InternalMove | null = null;
    let currentBestMoveKey: string | null = null;
    let currentBestValue = game.turn() === 'w' ? -Infinity : Infinity;
    let alpha = -Infinity;
    let beta = Infinity;

    const currentOrderedMoves = orderMoves(rawMoves, game, globalBestMoveKey || undefined, 0) as InternalMove[];

    let timedOut = false;
    try {
      for (let i = 0; i < currentOrderedMoves.length; i++) {
        const move = currentOrderedMoves[i];
        metrics.makeUndoCalls++;

        let bbUndo: BoardUndoState | undefined;
        if (backend && searchMode !== 'CHESSJS_ONLY') {
          bbUndo = backend.makeMove(move);
        }
        if (searchMode !== 'BITBOARD_ONLY') {
          (game as any)._makeMove(move);
        }

        let boardValue: number;
        try {
          boardValue = minimax(game, currentDepth - 1, alpha, beta, game.turn() === 'w', searchOptions, 1, backend, searchMode);
        } finally {
          if (backend && searchMode !== 'CHESSJS_ONLY' && bbUndo) {
            backend.undoMove(bbUndo);
          }
          if (searchMode !== 'BITBOARD_ONLY') {
            (game as any)._undoMove();
          }
        }

        if (game.turn() === 'w') {
          if (boardValue > currentBestValue) {
            currentBestValue = boardValue;
            currentBestMoveObj = move;
            currentBestMoveKey = getMoveKey(move);
          }
          alpha = Math.max(alpha, currentBestValue);
        } else {
          if (boardValue < currentBestValue) {
            currentBestValue = boardValue;
            currentBestMoveObj = move;
            currentBestMoveKey = getMoveKey(move);
          }
          beta = Math.min(beta, currentBestValue);
        }
      }
    } catch (e: any) {
      if (e.message === 'TIMEOUT') {
        timedOut = true;
        metrics.timeoutDuringIteration = true;
      } else {
        throw e; // Bubble up unexpected errors
      }
    }

    if (timedOut) {
      // Discard partial iteration results, fallback to previous fully completed iteration
      if (globalBestMoveObj === null && currentBestMoveObj !== null) {
        // If timed out on depth 1, we still want to return SOME valid move
        globalBestMoveObj = currentBestMoveObj;
      }
      break;
    }

    globalBestMoveObj = currentBestMoveObj;
    globalBestMoveKey = currentBestMoveKey;
    globalBestValue = currentBestValue;
    metrics.iterationsCompleted++;
    metrics.lastCompletedDepth = currentDepth;
  }

  // Fallback in extreme timeout cases
  if (!globalBestMoveObj) {
    globalBestMoveObj = rawMoves[0];
  }

  // Convert best move to SAN exactly once at the root
  return (game as any)._moveToSan(globalBestMoveObj, rawMoves);
}
