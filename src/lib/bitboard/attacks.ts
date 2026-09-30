/**
 * FASE 5.8 — TABELAS DE ATAQUES E DETECÇÃO DE ATAQUE BITBOARD
 */

import { Bitboard, BitboardBoard, Color, Square } from './types';
import { BB_EMPTY, squareFile, squareRank, squareToBit } from './constants';
import {
  DIR_EAST,
  DIR_NORTH,
  DIR_NORTH_EAST,
  DIR_NORTH_WEST,
  DIR_SOUTH,
  DIR_SOUTH_EAST,
  DIR_SOUTH_WEST,
  DIR_WEST,
  RAY_MASKS
} from './rays';
import { lsb } from './bitboard';

export const KNIGHT_ATTACKS: Bitboard[] = new Array(64);
export const KING_ATTACKS: Bitboard[] = new Array(64);
export const WHITE_PAWN_ATTACKS: Bitboard[] = new Array(64);
export const BLACK_PAWN_ATTACKS: Bitboard[] = new Array(64);

const KNIGHT_DELTAS: [number, number][] = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1]
];

const KING_DELTAS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

// Inicialização das tabelas de não-deslizantes
for (let sq = 0; sq < 64; sq++) {
  const f = squareFile(sq);
  const r = squareRank(sq);

  // 1. Cavalo
  let nAtt: Bitboard = BB_EMPTY;
  for (const [df, dr] of KNIGHT_DELTAS) {
    const tf = f + df;
    const tr = r + dr;
    if (tf >= 0 && tf < 8 && tr >= 0 && tr < 8) {
      nAtt |= squareToBit(tr * 8 + tf);
    }
  }
  KNIGHT_ATTACKS[sq] = nAtt;

  // 2. Rei
  let kAtt: Bitboard = BB_EMPTY;
  for (const [df, dr] of KING_DELTAS) {
    const tf = f + df;
    const tr = r + dr;
    if (tf >= 0 && tf < 8 && tr >= 0 && tr < 8) {
      kAtt |= squareToBit(tr * 8 + tf);
    }
  }
  KING_ATTACKS[sq] = kAtt;

  // 3. Peão Branco (ataca para o Norte: rank r+1, files f-1 e f+1)
  let wpAtt: Bitboard = BB_EMPTY;
  if (r < 7) {
    if (f > 0) wpAtt |= squareToBit((r + 1) * 8 + (f - 1));
    if (f < 7) wpAtt |= squareToBit((r + 1) * 8 + (f + 1));
  }
  WHITE_PAWN_ATTACKS[sq] = wpAtt;

  // 4. Peão Preto (ataca para o Sul: rank r-1, files f-1 e f+1)
  let bpAtt: Bitboard = BB_EMPTY;
  if (r > 0) {
    if (f > 0) bpAtt |= squareToBit((r - 1) * 8 + (f - 1));
    if (f < 7) bpAtt |= squareToBit((r - 1) * 8 + (f + 1));
  }
  BLACK_PAWN_ATTACKS[sq] = bpAtt;
}

/**
 * Ataque deslizante por raio positivo (Norte, Leste, Nordeste, Noroeste).
 * Para no primeiro bloqueador encontrado (usando lsb do raio & ocupação).
 */
function rayAttacksPositive(sq: Square, occ: Bitboard, dir: number): Bitboard {
  const ray = RAY_MASKS[sq][dir];
  const blockers = ray & occ;
  if (blockers === BB_EMPTY) return ray;
  const firstBlocker = lsb(blockers);
  return ray ^ RAY_MASKS[firstBlocker][dir];
}

/**
 * Ataque deslizante por raio negativo (Sul, Oeste, Sudeste, Sudoeste).
 * Para no primeiro bloqueador encontrado (usando msb do raio & ocupação).
 */
function rayAttacksNegative(sq: Square, occ: Bitboard, dir: number): Bitboard {
  const ray = RAY_MASKS[sq][dir];
  const blockers = ray & occ;
  if (blockers === BB_EMPTY) return ray;
  // MSB de 64 bits para direções negativas
  // Math.clz32 no hi ou lo
  const hi = Number((blockers >> 32n) & 0xffffffffn);
  let firstBlocker: Square;
  if (hi !== 0) {
    firstBlocker = 63 - Math.clz32(hi);
  } else {
    const lo = Number(blockers & 0xffffffffn);
    firstBlocker = 31 - Math.clz32(lo);
  }
  return ray ^ RAY_MASKS[firstBlocker][dir];
}

export function rookAttacks(sq: Square, occ: Bitboard): Bitboard {
  return (
    rayAttacksPositive(sq, occ, DIR_NORTH) |
    rayAttacksNegative(sq, occ, DIR_SOUTH) |
    rayAttacksPositive(sq, occ, DIR_EAST) |
    rayAttacksNegative(sq, occ, DIR_WEST)
  );
}

export function bishopAttacks(sq: Square, occ: Bitboard): Bitboard {
  return (
    rayAttacksPositive(sq, occ, DIR_NORTH_EAST) |
    rayAttacksPositive(sq, occ, DIR_NORTH_WEST) |
    rayAttacksNegative(sq, occ, DIR_SOUTH_EAST) |
    rayAttacksNegative(sq, occ, DIR_SOUTH_WEST)
  );
}

export function queenAttacks(sq: Square, occ: Bitboard): Bitboard {
  return rookAttacks(sq, occ) | bishopAttacks(sq, occ);
}

/**
 * Verifica se a casa `sq` está sob ataque de peças da cor `byColor`.
 * Pure static bitboard inspection.
 */
export function isSquareAttacked(board: BitboardBoard, sq: Square, byColor: Color): boolean {
  const occ = board.allOccupancy;

  if (byColor === 'w') {
    // 1. Peões brancos atacam sq se um peão branco estiver na casa de onde peões brancos atacam sq
    // Ou seja: BLACK_PAWN_ATTACKS[sq] & board.whitePawns
    if ((BLACK_PAWN_ATTACKS[sq] & board.whitePawns) !== BB_EMPTY) return true;
    // 2. Cavalos
    if ((KNIGHT_ATTACKS[sq] & board.whiteKnights) !== BB_EMPTY) return true;
    // 3. Rei
    if ((KING_ATTACKS[sq] & board.whiteKing) !== BB_EMPTY) return true;
    // 4. Bispos e Damas (diagonais)
    const bq = board.whiteBishops | board.whiteQueens;
    if (bq !== BB_EMPTY && (bishopAttacks(sq, occ) & bq) !== BB_EMPTY) return true;
    // 5. Torres e Damas (linhas ortogonais)
    const rq = board.whiteRooks | board.whiteQueens;
    if (rq !== BB_EMPTY && (rookAttacks(sq, occ) & rq) !== BB_EMPTY) return true;
  } else {
    // Peões pretos
    if ((WHITE_PAWN_ATTACKS[sq] & board.blackPawns) !== BB_EMPTY) return true;
    // Cavalos
    if ((KNIGHT_ATTACKS[sq] & board.blackKnights) !== BB_EMPTY) return true;
    // Rei
    if ((KING_ATTACKS[sq] & board.blackKing) !== BB_EMPTY) return true;
    // Bispos e Damas
    const bq = board.blackBishops | board.blackQueens;
    if (bq !== BB_EMPTY && (bishopAttacks(sq, occ) & bq) !== BB_EMPTY) return true;
    // Torres e Damas
    const rq = board.blackRooks | board.blackQueens;
    if (rq !== BB_EMPTY && (rookAttacks(sq, occ) & rq) !== BB_EMPTY) return true;
  }

  return false;
}
