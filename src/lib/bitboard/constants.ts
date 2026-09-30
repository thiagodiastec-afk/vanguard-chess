/**
 * FASE 5.8 — CONSTANTES E MAPEAMENTO DE CASAS DO MOTOR BITBOARD
 *
 * Mapeamento canônico:
 * a1 = 0, b1 = 1, ..., h1 = 7
 * a2 = 8, b2 = 9, ..., h2 = 15
 * ...
 * a8 = 56, b8 = 57, ..., h8 = 63
 */

import { Bitboard, Square } from './types';

// Castling Rights Flags
export const CASTLE_WK = 1; // 0b0001
export const CASTLE_WQ = 2; // 0b0010
export const CASTLE_BK = 4; // 0b0100
export const CASTLE_BQ = 8; // 0b1000
export const CASTLE_ALL = 15; // 0b1111

// Empty and Universal Bitboards
export const BB_EMPTY: Bitboard = 0n;
export const BB_ALL: Bitboard = 0xFFFFFFFFFFFFFFFFn;

// File Masks
export const FILE_A: Bitboard = 0x0101010101010101n;
export const FILE_B: Bitboard = 0x0202020202020202n;
export const FILE_C: Bitboard = 0x0404040404040404n;
export const FILE_D: Bitboard = 0x0808080808080808n;
export const FILE_E: Bitboard = 0x1010101010101010n;
export const FILE_F: Bitboard = 0x2020202020202020n;
export const FILE_G: Bitboard = 0x4040404040404040n;
export const FILE_H: Bitboard = 0x8080808080808080n;

export const NOT_FILE_A: Bitboard = ~FILE_A & BB_ALL;
export const NOT_FILE_B: Bitboard = ~FILE_B & BB_ALL;
export const NOT_FILE_G: Bitboard = ~FILE_G & BB_ALL;
export const NOT_FILE_H: Bitboard = ~FILE_H & BB_ALL;
export const NOT_FILE_AB: Bitboard = ~(FILE_A | FILE_B) & BB_ALL;
export const NOT_FILE_GH: Bitboard = ~(FILE_G | FILE_H) & BB_ALL;

// Rank Masks
export const RANK_1: Bitboard = 0x00000000000000FFn;
export const RANK_2: Bitboard = 0x000000000000FF00n;
export const RANK_3: Bitboard = 0x0000000000FF0000n;
export const RANK_4: Bitboard = 0x00000000FF000000n;
export const RANK_5: Bitboard = 0x000000FF00000000n;
export const RANK_6: Bitboard = 0x0000FF0000000000n;
export const RANK_7: Bitboard = 0x00FF000000000000n;
export const RANK_8: Bitboard = 0xFF00000000000000n;

// Square Names and Lookups
export const SQUARE_NAMES: string[] = new Array(64);
export const NAME_TO_SQUARE: Record<string, Square> = {};
export const SQUARE_BB: Bitboard[] = new Array(64);

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

for (let r = 0; r < 8; r++) {
  for (let f = 0; f < 8; f++) {
    const sq = r * 8 + f;
    const name = `${FILES[f]}${RANKS[r]}`;
    SQUARE_NAMES[sq] = name;
    NAME_TO_SQUARE[name] = sq;
    SQUARE_BB[sq] = 1n << BigInt(sq);
  }
}

// Named Squares for Castling and Fast Reference
export const SQ_A1 = 0;
export const SQ_B1 = 1;
export const SQ_C1 = 2;
export const SQ_D1 = 3;
export const SQ_E1 = 4;
export const SQ_F1 = 5;
export const SQ_G1 = 6;
export const SQ_H1 = 7;

export const SQ_A8 = 56;
export const SQ_B8 = 57;
export const SQ_C8 = 58;
export const SQ_D8 = 59;
export const SQ_E8 = 60;
export const SQ_F8 = 61;
export const SQ_G8 = 62;
export const SQ_H8 = 63;

export const SQ_E4 = 28;
export const SQ_E5 = 36;

export function squareToBit(sq: Square): Bitboard {
  return SQUARE_BB[sq];
}

export function bitToSquareName(sq: Square): string {
  return SQUARE_NAMES[sq] || '-';
}

export function squareNameToIndex(name: string): Square {
  const sq = NAME_TO_SQUARE[name.toLowerCase()];
  return sq !== undefined ? sq : -1;
}

export function squareFile(sq: Square): number {
  return sq & 7;
}

export function squareRank(sq: Square): number {
  return sq >> 3;
}
