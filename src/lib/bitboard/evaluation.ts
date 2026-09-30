/**
 * FASE 5.11 — BITBOARD STATIC EVALUATOR
 *
 * Avaliador estático 100% nativo para BitboardBoard (64-bit BigInt).
 * Reproduz rigorosamente as fórmulas, pesos, convenções e constantes
 * do avaliador de referência (evaluateBoard em src/lib/engine.ts).
 *
 * ZERO dependências de chess.js no caminho crítico.
 * Garantia de equivalência exata de score (0 centipawns de tolerância).
 */

import { Bitboard, BitboardBoard, Color, Square } from './types';
import { BB_ALL, BB_EMPTY, squareFile, squareRank, squareToBit } from './constants';
import { popcount, lsb, clearLsb } from './bitboard';
import {
  KNIGHT_ATTACKS,
  KING_ATTACKS,
  WHITE_PAWN_ATTACKS,
  BLACK_PAWN_ATTACKS,
  rookAttacks,
  bishopAttacks
} from './attacks';
import { RawMove, moveFrom } from './moveTypes';
import { generatePseudoLegalMoves } from './moveGenerator';
import { makeMove } from './makeMove';
import { undoMove } from './undoMove';
import { isInCheck } from './checks';

export interface EvaluationBreakdown {
  material: number;
  pstMiddleGame: number;
  pstEndGame: number;
  taperedBase: number;
  passedPawn: number;
  bishopPair: number;
  rookActivity: number;
  doubledPawn: number;
  isolatedPawn: number;
  pawnStructure: number;
  mobility: number;
  pawnShield: number;
  kingAttackers: number;
  kingTropism: number;
  total: number;
  phase: number;
}

// -------------------------------------------------------------
// 1. Constantes e Pesos Originais (src/lib/engine.ts)
// -------------------------------------------------------------
export const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

export const PASSED_PAWN_BONUS = [0, 5, 10, 20, 35, 60, 100, 0];
export const BISHOP_PAIR_BONUS = 50;
export const ROOK_OPEN_FILE_BONUS = 15;
export const ROOK_SEMI_OPEN_FILE_BONUS = 8;
export const DOUBLED_PAWN_PENALTY = 10;
export const ISOLATED_PAWN_PENALTY = 10;
export const MOBILITY_BONUS_PER_MOVE = 1;
export const PAWN_SHIELD_BONUS = 8;
export const KING_ATTACKER_PENALTY = 6;
export const MAX_PHASE = 24;

// -------------------------------------------------------------
// 2. Piece-Square Tables 2D Originais (orientação row 0 = rank 8)
// -------------------------------------------------------------
const pawnEvalWhite2D = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

const knightEval2D = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

const bishopEvalWhite2D = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
];

const rookEvalWhite2D = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [0,  0,  0,  5,  5,  0,  0,  0]
];

const queenEval2D = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [-5,  0,  5,  5,  5,  5,  0, -5],
  [0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
];

const kingEvalWhite2D = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20, 20,  0,  0,  0,  0, 20, 20],
  [20, 30, 10,  0,  0, 10, 30, 20]
];

const kingEvalEndgameWhite2D = [
  [-30,-20,-20,-10,-10,-20,-20,-30],
  [-20,-10, -5,  0,  0, -5,-10,-20],
  [-20, -5, 15, 20, 20, 15, -5,-20],
  [-20, -5, 20, 30, 30, 20, -5,-20],
  [-20, -5, 20, 30, 30, 20, -5,-20],
  [-20, -5, 15, 20, 20, 15, -5,-20],
  [-20,-20,  0,  0,  0,  0,-20,-20],
  [-30,-20,-15,-10,-10,-15,-20,-30]
];

// Inversão vertical de array para pretas (reverseArray em engine.ts)
function reverseArray2D(arr: number[][]): number[][] {
  return arr.slice().reverse();
}

const pawnEvalBlack2D = reverseArray2D(pawnEvalWhite2D);
const bishopEvalBlack2D = reverseArray2D(bishopEvalWhite2D);
const rookEvalBlack2D = reverseArray2D(rookEvalWhite2D);
const kingEvalBlack2D = reverseArray2D(kingEvalWhite2D);
const kingEvalEndgameBlack2D = reverseArray2D(kingEvalEndgameWhite2D);

// -------------------------------------------------------------
// 3. Pré-computação de Tabelas 1D Lineares indexadas por Square (0..63)
// -------------------------------------------------------------
// Square 0 = a1, rank = sq >> 3, file = sq & 7.
// A matriz 2D original usa row y = 7 - rank, col x = file.
export const PST_PAWN_WHITE = new Int16Array(64);
export const PST_PAWN_BLACK = new Int16Array(64);
export const PST_KNIGHT = new Int16Array(64);
export const PST_BISHOP_WHITE = new Int16Array(64);
export const PST_BISHOP_BLACK = new Int16Array(64);
export const PST_ROOK_WHITE = new Int16Array(64);
export const PST_ROOK_BLACK = new Int16Array(64);
export const PST_QUEEN = new Int16Array(64);
export const PST_KING_WHITE = new Int16Array(64);
export const PST_KING_BLACK = new Int16Array(64);
export const PST_KING_EG_WHITE = new Int16Array(64);
export const PST_KING_EG_BLACK = new Int16Array(64);

for (let sq = 0; sq < 64; sq++) {
  const r = squareRank(sq);
  const f = squareFile(sq);
  const y = 7 - r;
  const x = f;

  PST_PAWN_WHITE[sq] = pawnEvalWhite2D[y][x];
  PST_PAWN_BLACK[sq] = pawnEvalBlack2D[y][x];
  PST_KNIGHT[sq] = knightEval2D[y][x];
  PST_BISHOP_WHITE[sq] = bishopEvalWhite2D[y][x];
  PST_BISHOP_BLACK[sq] = bishopEvalBlack2D[y][x];
  PST_ROOK_WHITE[sq] = rookEvalWhite2D[y][x];
  PST_ROOK_BLACK[sq] = rookEvalBlack2D[y][x];
  PST_QUEEN[sq] = queenEval2D[y][x];
  PST_KING_WHITE[sq] = kingEvalWhite2D[y][x];
  PST_KING_BLACK[sq] = kingEvalBlack2D[y][x];
  PST_KING_EG_WHITE[sq] = kingEvalEndgameWhite2D[y][x];
  PST_KING_EG_BLACK[sq] = kingEvalEndgameBlack2D[y][x];
}

// -------------------------------------------------------------
// 4. Máscaras Geométricas Pré-computadas
// -------------------------------------------------------------
// Colunas (Files A-H)
export const FILE_MASKS: Bitboard[] = new Array(8);
for (let f = 0; f < 8; f++) {
  let mask = BB_EMPTY;
  for (let r = 0; r < 8; r++) {
    mask |= squareToBit(r * 8 + f);
  }
  FILE_MASKS[f] = mask;
}

// Máscaras de Peões Passados
export const WHITE_PASSED_PAWN_MASK: Bitboard[] = new Array(64);
export const BLACK_PASSED_PAWN_MASK: Bitboard[] = new Array(64);

for (let sq = 0; sq < 64; sq++) {
  const f = squareFile(sq);
  const r = squareRank(sq);

  // Brancas: precisa que NÃO haja peões pretos nas colunas f-1, f, f+1 para ranks > r
  let wMask = BB_EMPTY;
  for (let tr = r + 1; tr < 8; tr++) {
    if (f > 0) wMask |= squareToBit(tr * 8 + (f - 1));
    wMask |= squareToBit(tr * 8 + f);
    if (f < 7) wMask |= squareToBit(tr * 8 + (f + 1));
  }
  WHITE_PASSED_PAWN_MASK[sq] = wMask;

  // Pretas: precisa que NÃO haja peões brancos nas colunas f-1, f, f+1 para ranks < r
  let bMask = BB_EMPTY;
  for (let tr = r - 1; tr >= 0; tr--) {
    if (f > 0) bMask |= squareToBit(tr * 8 + (f - 1));
    bMask |= squareToBit(tr * 8 + f);
    if (f < 7) bMask |= squareToBit(tr * 8 + (f + 1));
  }
  BLACK_PASSED_PAWN_MASK[sq] = bMask;
}

// Máscaras de Escudo de Peão (Pawn Shield)
// White: rank r+1, files c-1, c, c+1
// Black: rank r-1, files c-1, c, c+1
export const WHITE_PAWN_SHIELD_MASK: Bitboard[] = new Array(64);
export const BLACK_PAWN_SHIELD_MASK: Bitboard[] = new Array(64);

for (let sq = 0; sq < 64; sq++) {
  const f = squareFile(sq);
  const r = squareRank(sq);

  // White
  let wShield = BB_EMPTY;
  if (r < 7) {
    if (f > 0) wShield |= squareToBit((r + 1) * 8 + (f - 1));
    wShield |= squareToBit((r + 1) * 8 + f);
    if (f < 7) wShield |= squareToBit((r + 1) * 8 + (f + 1));
  }
  WHITE_PAWN_SHIELD_MASK[sq] = wShield;

  // Black
  let bShield = BB_EMPTY;
  if (r > 0) {
    if (f > 0) bShield |= squareToBit((r - 1) * 8 + (f - 1));
    bShield |= squareToBit((r - 1) * 8 + f);
    if (f < 7) bShield |= squareToBit((r - 1) * 8 + (f + 1));
  }
  BLACK_PAWN_SHIELD_MASK[sq] = bShield;
}

// Tabela de Distância Chebyshev pré-calculada para King Tropism
export const CHEBYSHEV_TROPISM: Uint8Array[] = new Array(64);
for (let s1 = 0; s1 < 64; s1++) {
  const row1 = squareRank(s1);
  const col1 = squareFile(s1);
  CHEBYSHEV_TROPISM[s1] = new Uint8Array(64);
  for (let s2 = 0; s2 < 64; s2++) {
    const row2 = squareRank(s2);
    const col2 = squareFile(s2);
    const dist = Math.max(Math.abs(row1 - row2), Math.abs(col1 - col2));
    if (dist === 1) CHEBYSHEV_TROPISM[s1][s2] = 6;
    else if (dist === 2) CHEBYSHEV_TROPISM[s1][s2] = 4;
    else if (dist === 3) CHEBYSHEV_TROPISM[s1][s2] = 2;
    else CHEBYSHEV_TROPISM[s1][s2] = 0;
  }
}

// -------------------------------------------------------------
// 5. Funções Auxiliares Específicas de Avaliação
// -------------------------------------------------------------

export function countDoubledPawnsBB(pawnCounts: Uint8Array): number {
  let excess = 0;
  for (let j = 0; j < 8; j++) {
    if (pawnCounts[j] > 1) excess += pawnCounts[j] - 1;
  }
  return excess;
}

export function countIsolatedPawnsBB(pawnCounts: Uint8Array): number {
  let isolated = 0;
  for (let j = 0; j < 8; j++) {
    const hasAdj = (j > 0 && pawnCounts[j - 1] > 0) || (j < 7 && pawnCounts[j + 1] > 0);
    if (!hasAdj && pawnCounts[j] > 0) isolated += pawnCounts[j];
  }
  return isolated;
}

/**
 * Contagem de mobilidade estritamente legal para a cor dada, excluindo lances de rei.
 * Opera diretamente no BitboardBoard sem alocar arrays de strings ou chamar chess.js.
 */
export function countLegalMobilityBitboard(board: BitboardBoard, color: Color): number {
  const originalTurn = board.sideToMove;
  const originalEp = board.enPassantSquare;

  board.sideToMove = color;
  if (color !== originalTurn) {
    board.enPassantSquare = -1;
  }

  const kingBb = color === 'w' ? board.whiteKing : board.blackKing;
  const kingSq = kingBb !== BB_EMPTY ? lsb(kingBb) : -1;

  const pseudoMoves = generatePseudoLegalMoves(board);
  let count = 0;

  for (let i = 0; i < pseudoMoves.length; i++) {
    const m = pseudoMoves[i];
    if (moveFrom(m) === kingSq) continue; // estritamente exclui o rei

    const undo = makeMove(board, m);
    if (!isInCheck(board, color)) {
      count++;
    }
    undoMove(board, undo);
  }

  board.sideToMove = originalTurn;
  board.enPassantSquare = originalEp;
  return count;
}

/**
 * Contagem de atacantes à zona de 8 casas adjacentes ao rei.
 * Exclui o rei adversário. Peças que atacam múltiplas casas contam no máximo 1 vez.
 */
export function countKingAttackersBitboard(
  board: BitboardBoard,
  kingColor: Color,
  kingSq: Square
): number {
  if (kingSq < 0 || kingSq > 63) return 0;
  const kingZone = KING_ATTACKS[kingSq];
  const occ = board.allOccupancy;
  const isWhiteKing = kingColor === 'w';

  let attackers = 0;

  // 1. Peões inimigos
  let enemyPawns = isWhiteKing ? board.blackPawns : board.whitePawns;
  while (enemyPawns !== BB_EMPTY) {
    const pSq = lsb(enemyPawns);
    enemyPawns = clearLsb(enemyPawns);
    const pAtt = isWhiteKing ? BLACK_PAWN_ATTACKS[pSq] : WHITE_PAWN_ATTACKS[pSq];
    if ((pAtt & kingZone) !== BB_EMPTY) {
      attackers++;
    }
  }

  // 2. Cavalos inimigos
  let enemyKnights = isWhiteKing ? board.blackKnights : board.whiteKnights;
  while (enemyKnights !== BB_EMPTY) {
    const nSq = lsb(enemyKnights);
    enemyKnights = clearLsb(enemyKnights);
    if ((KNIGHT_ATTACKS[nSq] & kingZone) !== BB_EMPTY) {
      attackers++;
    }
  }

  // 3. Bispos inimigos (diagonais)
  let enemyBishops = isWhiteKing ? board.blackBishops : board.whiteBishops;
  while (enemyBishops !== BB_EMPTY) {
    const bSq = lsb(enemyBishops);
    enemyBishops = clearLsb(enemyBishops);
    if ((bishopAttacks(bSq, occ) & kingZone) !== BB_EMPTY) {
      attackers++;
    }
  }

  // 4. Torres inimigas (ortogonais)
  let enemyRooks = isWhiteKing ? board.blackRooks : board.whiteRooks;
  while (enemyRooks !== BB_EMPTY) {
    const rSq = lsb(enemyRooks);
    enemyRooks = clearLsb(enemyRooks);
    if ((rookAttacks(rSq, occ) & kingZone) !== BB_EMPTY) {
      attackers++;
    }
  }

  // 5. Damas inimigas (diagonais OU ortogonais — conta no máximo 1 por dama)
  let enemyQueens = isWhiteKing ? board.blackQueens : board.whiteQueens;
  while (enemyQueens !== BB_EMPTY) {
    const qSq = lsb(enemyQueens);
    enemyQueens = clearLsb(enemyQueens);
    const qAtt = bishopAttacks(qSq, occ) | rookAttacks(qSq, occ);
    if ((qAtt & kingZone) !== BB_EMPTY) {
      attackers++;
    }
  }

  return attackers;
}

/**
 * Cálculo de Tropismo do Rei para peças menores e maiores (N, B, R, Q).
 */
export function calculateKingTropismBitboard(
  board: BitboardBoard,
  kingColor: Color,
  kingSq: Square
): number {
  if (kingSq < 0 || kingSq > 63) return 0;
  const isWhiteKing = kingColor === 'w';

  let totalTropism = 0;

  let enemyPieces = isWhiteKing
    ? (board.blackKnights | board.blackBishops | board.blackRooks | board.blackQueens)
    : (board.whiteKnights | board.whiteBishops | board.whiteRooks | board.whiteQueens);

  while (enemyPieces !== BB_EMPTY) {
    const sq = lsb(enemyPieces);
    enemyPieces = clearLsb(enemyPieces);
    totalTropism += CHEBYSHEV_TROPISM[sq][kingSq];
  }

  return totalTropism;
}

// -------------------------------------------------------------
// 6. Avaliação Completa e Breakdown
// -------------------------------------------------------------

/**
 * Avaliação estática completa nativa Bitboard, retornando breakdown detalhado.
 */
export function evaluateBitboardBreakdown(board: BitboardBoard): EvaluationBreakdown {
  let materialWhite = 0;
  let materialBlack = 0;
  let pstMgWhite = 0;
  let pstMgBlack = 0;
  let pstEgWhite = 0;
  let pstEgBlack = 0;

  let phase = 0;
  let passedPawnScore = 0;
  let whiteBishops = 0;
  let blackBishops = 0;

  const whitePawnCounts = new Uint8Array(8);
  const blackPawnCounts = new Uint8Array(8);

  // Peões Brancos
  let wp = board.whitePawns;
  while (wp !== BB_EMPTY) {
    const sq = lsb(wp);
    wp = clearLsb(wp);
    materialWhite += 100;
    const mg = PST_PAWN_WHITE[sq];
    pstMgWhite += mg;
    pstEgWhite += mg;
    const f = squareFile(sq);
    whitePawnCounts[f]++;

    if ((board.blackPawns & WHITE_PASSED_PAWN_MASK[sq]) === BB_EMPTY) {
      const r = squareRank(sq);
      passedPawnScore += PASSED_PAWN_BONUS[r] || 0;
    }
  }

  // Peões Pretos
  let bp = board.blackPawns;
  while (bp !== BB_EMPTY) {
    const sq = lsb(bp);
    bp = clearLsb(bp);
    materialBlack += 100;
    const mg = PST_PAWN_BLACK[sq];
    pstMgBlack += mg;
    pstEgBlack += mg;
    const f = squareFile(sq);
    blackPawnCounts[f]++;

    if ((board.whitePawns & BLACK_PASSED_PAWN_MASK[sq]) === BB_EMPTY) {
      const r = squareRank(sq);
      const relativeRank = 7 - r;
      passedPawnScore -= PASSED_PAWN_BONUS[relativeRank] || 0;
    }
  }

  // Cavalos Brancos
  let wn = board.whiteKnights;
  while (wn !== BB_EMPTY) {
    const sq = lsb(wn);
    wn = clearLsb(wn);
    materialWhite += 320;
    const val = PST_KNIGHT[sq];
    pstMgWhite += val;
    pstEgWhite += val;
    phase += 1;
  }

  // Cavalos Pretos
  let bn = board.blackKnights;
  while (bn !== BB_EMPTY) {
    const sq = lsb(bn);
    bn = clearLsb(bn);
    materialBlack += 320;
    const val = PST_KNIGHT[sq];
    pstMgBlack += val;
    pstEgBlack += val;
    phase += 1;
  }

  // Bispos Brancos
  let wb = board.whiteBishops;
  while (wb !== BB_EMPTY) {
    const sq = lsb(wb);
    wb = clearLsb(wb);
    materialWhite += 330;
    const val = PST_BISHOP_WHITE[sq];
    pstMgWhite += val;
    pstEgWhite += val;
    whiteBishops++;
    phase += 1;
  }

  // Bispos Pretos
  let bb = board.blackBishops;
  while (bb !== BB_EMPTY) {
    const sq = lsb(bb);
    bb = clearLsb(bb);
    materialBlack += 330;
    const val = PST_BISHOP_BLACK[sq];
    pstMgBlack += val;
    pstEgBlack += val;
    blackBishops++;
    phase += 1;
  }

  // Torres Brancas
  let wr = board.whiteRooks;
  while (wr !== BB_EMPTY) {
    const sq = lsb(wr);
    wr = clearLsb(wr);
    materialWhite += 500;
    const val = PST_ROOK_WHITE[sq];
    pstMgWhite += val;
    pstEgWhite += val;
    phase += 2;
  }

  // Torres Pretas
  let br = board.blackRooks;
  while (br !== BB_EMPTY) {
    const sq = lsb(br);
    br = clearLsb(br);
    materialBlack += 500;
    const val = PST_ROOK_BLACK[sq];
    pstMgBlack += val;
    pstEgBlack += val;
    phase += 2;
  }

  // Damas Brancas
  let wq = board.whiteQueens;
  while (wq !== BB_EMPTY) {
    const sq = lsb(wq);
    wq = clearLsb(wq);
    materialWhite += 900;
    const val = PST_QUEEN[sq];
    pstMgWhite += val;
    pstEgWhite += val;
    phase += 4;
  }

  // Damas Pretas
  let bq = board.blackQueens;
  while (bq !== BB_EMPTY) {
    const sq = lsb(bq);
    bq = clearLsb(bq);
    materialBlack += 900;
    const val = PST_QUEEN[sq];
    pstMgBlack += val;
    pstEgBlack += val;
    phase += 4;
  }

  // Reis
  const whiteKingSq = board.whiteKing !== BB_EMPTY ? lsb(board.whiteKing) : -1;
  if (whiteKingSq !== -1) {
    materialWhite += 20000;
    pstMgWhite += PST_KING_WHITE[whiteKingSq];
    pstEgWhite += PST_KING_EG_WHITE[whiteKingSq];
  }

  const blackKingSq = board.blackKing !== BB_EMPTY ? lsb(board.blackKing) : -1;
  if (blackKingSq !== -1) {
    materialBlack += 20000;
    pstMgBlack += PST_KING_BLACK[blackKingSq];
    pstEgBlack += PST_KING_EG_BLACK[blackKingSq];
  }

  // Tapered Base
  const clampedPhase = phase > MAX_PHASE ? MAX_PHASE : phase;
  const rawMaterial = materialWhite - materialBlack;
  const rawPstMg = pstMgWhite - pstMgBlack;
  const rawPstEg = pstEgWhite - pstEgBlack;

  const mgEval = rawMaterial + rawPstMg;
  const egEval = rawMaterial + rawPstEg;
  const taperedBase = Math.round((mgEval * clampedPhase + egEval * (MAX_PHASE - clampedPhase)) / MAX_PHASE);

  // Bishop Pair
  let bishopPairScore = 0;
  if (whiteBishops >= 2) bishopPairScore += BISHOP_PAIR_BONUS;
  if (blackBishops >= 2) bishopPairScore -= BISHOP_PAIR_BONUS;

  // Rook Activity
  let rookActivityScore = 0;
  let wrScan = board.whiteRooks;
  while (wrScan !== BB_EMPTY) {
    const sq = lsb(wrScan);
    wrScan = clearLsb(wrScan);
    const f = squareFile(sq);
    const whitePawnsOnFile = whitePawnCounts[f] > 0;
    const blackPawnsOnFile = blackPawnCounts[f] > 0;
    if (!whitePawnsOnFile && !blackPawnsOnFile) {
      rookActivityScore += ROOK_OPEN_FILE_BONUS;
    } else if (!whitePawnsOnFile && blackPawnsOnFile) {
      rookActivityScore += ROOK_SEMI_OPEN_FILE_BONUS;
    }
  }

  let brScan = board.blackRooks;
  while (brScan !== BB_EMPTY) {
    const sq = lsb(brScan);
    brScan = clearLsb(brScan);
    const f = squareFile(sq);
    const whitePawnsOnFile = whitePawnCounts[f] > 0;
    const blackPawnsOnFile = blackPawnCounts[f] > 0;
    if (!whitePawnsOnFile && !blackPawnsOnFile) {
      rookActivityScore -= ROOK_OPEN_FILE_BONUS;
    } else if (whitePawnsOnFile && !blackPawnsOnFile) {
      rookActivityScore -= ROOK_SEMI_OPEN_FILE_BONUS;
    }
  }

  // Estrutura de Peões: Dobrados e Isolados
  const whiteDoubled = countDoubledPawnsBB(whitePawnCounts);
  const blackDoubled = countDoubledPawnsBB(blackPawnCounts);
  const doubledScore = (blackDoubled - whiteDoubled) * DOUBLED_PAWN_PENALTY;

  const whiteIsolated = countIsolatedPawnsBB(whitePawnCounts);
  const blackIsolated = countIsolatedPawnsBB(blackPawnCounts);
  const isolatedScore = (blackIsolated - whiteIsolated) * ISOLATED_PAWN_PENALTY;

  // Mobilidade Legal (excluindo rei)
  const whiteMobility = countLegalMobilityBitboard(board, 'w');
  const blackMobility = countLegalMobilityBitboard(board, 'b');
  const mobilityScore = (whiteMobility - blackMobility) * MOBILITY_BONUS_PER_MOVE;

  // King Safety: Pawn Shield
  let whiteShield = 0;
  if (whiteKingSq !== -1) {
    whiteShield = popcount(board.whitePawns & WHITE_PAWN_SHIELD_MASK[whiteKingSq]);
  }
  let blackShield = 0;
  if (blackKingSq !== -1) {
    blackShield = popcount(board.blackPawns & BLACK_PAWN_SHIELD_MASK[blackKingSq]);
  }
  const pawnShieldScore = (whiteShield - blackShield) * PAWN_SHIELD_BONUS;

  // King Safety: King Attackers
  const attacksOnWhiteKing = whiteKingSq !== -1 ? countKingAttackersBitboard(board, 'w', whiteKingSq) : 0;
  const attacksOnBlackKing = blackKingSq !== -1 ? countKingAttackersBitboard(board, 'b', blackKingSq) : 0;
  const kingAttackersScore = (attacksOnBlackKing - attacksOnWhiteKing) * KING_ATTACKER_PENALTY;

  // King Safety: King Tropism
  const tropismWhiteKing = whiteKingSq !== -1 ? calculateKingTropismBitboard(board, 'w', whiteKingSq) : 0;
  const tropismBlackKing = blackKingSq !== -1 ? calculateKingTropismBitboard(board, 'b', blackKingSq) : 0;
  const kingTropismScore = tropismBlackKing - tropismWhiteKing;

  const total = taperedBase +
    passedPawnScore +
    bishopPairScore +
    rookActivityScore +
    doubledScore +
    isolatedScore +
    mobilityScore +
    pawnShieldScore +
    kingAttackersScore +
    kingTropismScore;

  return {
    material: rawMaterial,
    pstMiddleGame: rawPstMg,
    pstEndGame: rawPstEg,
    taperedBase,
    passedPawn: passedPawnScore,
    bishopPair: bishopPairScore,
    rookActivity: rookActivityScore,
    doubledPawn: doubledScore,
    isolatedPawn: isolatedScore,
    pawnStructure: doubledScore + isolatedScore,
    mobility: mobilityScore,
    pawnShield: pawnShieldScore,
    kingAttackers: kingAttackersScore,
    kingTropism: kingTropismScore,
    total,
    phase: clampedPhase
  };
}

/**
 * Função principal otimizada para o caminho de busca.
 * Retorna o score final em centipawns a partir da perspectiva das Brancas.
 */
export function evaluateBoardBitboard(board: BitboardBoard): number {
  return evaluateBitboardBreakdown(board).total;
}
