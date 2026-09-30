/**
 * FASE 5.9 — CONVERSORES E MAPEAMENTO DE CASAS
 *
 * Permite conversão bidirecional sem perda entre:
 * - 0x88 (chess.js / engine legado): 0..119
 * - Bitboard (0..63): a1=0..h1=7, ..., a8=56..h8=63
 * - Nomes de casas em string: "a1".."h8"
 */

import { Square } from '../bitboard/types';

export const OX88_TO_SQ64: number[] = new Array(128).fill(-1);
export const SQ64_TO_OX88: number[] = new Array(64).fill(-1);

export const SQ64_TO_NAME: string[] = new Array(64);
export const OX88_TO_NAME: string[] = new Array(128).fill('');

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

for (let r = 0; r < 8; r++) {
  for (let f = 0; f < 8; f++) {
    const sq64 = r * 8 + f;
    const ox88 = ((7 - r) << 4) | f;
    const name = `${FILES[f]}${RANKS[r]}`;

    OX88_TO_SQ64[ox88] = sq64;
    SQ64_TO_OX88[sq64] = ox88;

    SQ64_TO_NAME[sq64] = name;
    OX88_TO_NAME[ox88] = name;
  }
}

export function ox88ToSq64(ox88: number): Square {
  return OX88_TO_SQ64[ox88];
}

export function sq64ToOx88(sq64: Square): number {
  return SQ64_TO_OX88[sq64];
}

export function ox88ToName(ox88: number): string {
  return OX88_TO_NAME[ox88] || '-';
}

export function sq64ToName(sq64: Square): string {
  return SQ64_TO_NAME[sq64] || '-';
}
