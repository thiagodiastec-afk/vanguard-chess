/**
 * FASE 5.8 — OPERAÇÕES PRIMITIVAS DE BITBOARD
 *
 * Implementação de manipulação de bits em BigInt 64-bit:
 * - popcount (tabela de consulta de 16-bits para máxima velocidade)
 * - lsb / ctz (Math.clz32 de 32-bits)
 * - clearLsb
 * - moreThanOne
 * - shifts direcionais com mascaramento de borda (File A/H)
 */

import { Bitboard, Square } from './types';
import { BB_ALL, BB_EMPTY, NOT_FILE_A, NOT_FILE_H } from './constants';

// Tabela de consulta de 16-bits para Popcount (65536 entradas)
const POPCOUNT_16 = new Uint8Array(65536);
for (let i = 0; i < 65536; i++) {
  let count = 0;
  let v = i;
  while (v > 0) {
    v &= v - 1;
    count++;
  }
  POPCOUNT_16[i] = count;
}

export function popcount(bb: Bitboard): number {
  const lo = Number(bb & 0xffffffffn);
  const hi = Number((bb >> 32n) & 0xffffffffn);
  return (
    POPCOUNT_16[lo & 0xffff] +
    POPCOUNT_16[(lo >>> 16) & 0xffff] +
    POPCOUNT_16[hi & 0xffff] +
    POPCOUNT_16[(hi >>> 16) & 0xffff]
  );
}

export function lsb(bb: Bitboard): Square {
  if (bb === BB_EMPTY) return -1;
  const lo = Number(bb & 0xffffffffn);
  if (lo !== 0) {
    return 31 - Math.clz32(lo & -lo);
  }
  const hi = Number((bb >> 32n) & 0xffffffffn);
  return 63 - Math.clz32(hi & -hi);
}

export function clearLsb(bb: Bitboard): Bitboard {
  return bb & (bb - 1n);
}

export function moreThanOne(bb: Bitboard): boolean {
  return (bb & (bb - 1n)) !== BB_EMPTY;
}

// Shifts com máscaras de transbordo de coluna
export function shiftNorth(bb: Bitboard): Bitboard {
  return (bb << 8n) & BB_ALL;
}

export function shiftSouth(bb: Bitboard): Bitboard {
  return bb >> 8n;
}

export function shiftEast(bb: Bitboard): Bitboard {
  return ((bb & NOT_FILE_H) << 1n) & BB_ALL;
}

export function shiftWest(bb: Bitboard): Bitboard {
  return (bb & NOT_FILE_A) >> 1n;
}

export function shiftNorthEast(bb: Bitboard): Bitboard {
  return ((bb & NOT_FILE_H) << 9n) & BB_ALL;
}

export function shiftNorthWest(bb: Bitboard): Bitboard {
  return ((bb & NOT_FILE_A) << 7n) & BB_ALL;
}

export function shiftSouthEast(bb: Bitboard): Bitboard {
  return (bb & NOT_FILE_H) >> 7n;
}

export function shiftSouthWest(bb: Bitboard): Bitboard {
  return (bb & NOT_FILE_A) >> 9n;
}

export function printBitboard(bb: Bitboard): string {
  const lines: string[] = [];
  for (let r = 7; r >= 0; r--) {
    let row = `${r + 1}  `;
    for (let f = 0; f < 8; f++) {
      const sq = r * 8 + f;
      const hasBit = (bb & (1n << BigInt(sq))) !== BB_EMPTY;
      row += hasBit ? '1 ' : '. ';
    }
    lines.push(row);
  }
  lines.push('   a b c d e f g h');
  return lines.join('\n');
}
