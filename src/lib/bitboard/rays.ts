/**
 * FASE 5.8 — TABELAS DE RAIOS PRÉ-COMPUTADOS
 *
 * 8 Direções:
 * 0: North (+8)
 * 1: South (-8)
 * 2: East (+1)
 * 3: West (-1)
 * 4: NorthEast (+9)
 * 5: NorthWest (+7)
 * 6: SouthEast (-7)
 * 7: SouthWest (-9)
 */

import { Bitboard, Square } from './types';
import { BB_EMPTY, squareFile, squareRank, squareToBit } from './constants';

export const DIR_NORTH = 0;
export const DIR_SOUTH = 1;
export const DIR_EAST = 2;
export const DIR_WEST = 3;
export const DIR_NORTH_EAST = 4;
export const DIR_NORTH_WEST = 5;
export const DIR_SOUTH_EAST = 6;
export const DIR_SOUTH_WEST = 7;

export const RAY_MASKS: Bitboard[][] = new Array(64);
export const BETWEEN_MASKS: Bitboard[][] = new Array(64);
export const LINE_MASKS: Bitboard[][] = new Array(64);

const DIR_OFFSETS: [number, number][] = [
  [0, 1],   // N: df=0, dr=1
  [0, -1],  // S: df=0, dr=-1
  [1, 0],   // E: df=1, dr=0
  [-1, 0],  // W: df=-1, dr=0
  [1, 1],   // NE: df=1, dr=1
  [-1, 1],  // NW: df=-1, dr=1
  [1, -1],  // SE: df=1, dr=-1
  [-1, -1]  // SW: df=-1, dr=-1
];

// Inicialização das tabelas de raios
for (let sq = 0; sq < 64; sq++) {
  RAY_MASKS[sq] = new Array(8);
  BETWEEN_MASKS[sq] = new Array(64);
  LINE_MASKS[sq] = new Array(64);

  const f0 = squareFile(sq);
  const r0 = squareRank(sq);

  for (let d = 0; d < 8; d++) {
    const [df, dr] = DIR_OFFSETS[d];
    let ray: Bitboard = BB_EMPTY;
    let f = f0 + df;
    let r = r0 + dr;

    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      const curSq = r * 8 + f;
      ray |= squareToBit(curSq);
      f += df;
      r += dr;
    }
    RAY_MASKS[sq][d] = ray;
  }
}

// Inicialização de BETWEEN_MASKS e LINE_MASKS
for (let s1 = 0; s1 < 64; s1++) {
  const f1 = squareFile(s1);
  const r1 = squareRank(s1);

  for (let s2 = 0; s2 < 64; s2++) {
    if (s1 === s2) {
      BETWEEN_MASKS[s1][s2] = BB_EMPTY;
      LINE_MASKS[s1][s2] = BB_EMPTY;
      continue;
    }

    const f2 = squareFile(s2);
    const r2 = squareRank(s2);

    const df = f2 - f1;
    const dr = r2 - r1;

    let dir = -1;
    if (df === 0 && dr > 0) dir = DIR_NORTH;
    else if (df === 0 && dr < 0) dir = DIR_SOUTH;
    else if (dr === 0 && df > 0) dir = DIR_EAST;
    else if (dr === 0 && df < 0) dir = DIR_WEST;
    else if (df === dr && df > 0) dir = DIR_NORTH_EAST;
    else if (df === -dr && df < 0) dir = DIR_NORTH_WEST;
    else if (df === -dr && df > 0) dir = DIR_SOUTH_EAST;
    else if (df === dr && df < 0) dir = DIR_SOUTH_WEST;

    if (dir === -1) {
      // Não estão na mesma linha
      BETWEEN_MASKS[s1][s2] = BB_EMPTY;
      LINE_MASKS[s1][s2] = BB_EMPTY;
    } else {
      // Casas estritamente entre s1 e s2
      const stepF = df === 0 ? 0 : df > 0 ? 1 : -1;
      const stepR = dr === 0 ? 0 : dr > 0 ? 1 : -1;

      let between: Bitboard = BB_EMPTY;
      let curF = f1 + stepF;
      let curR = r1 + stepR;

      while (curF !== f2 || curR !== r2) {
        between |= squareToBit(curR * 8 + curF);
        curF += stepF;
        curR += stepR;
      }

      BETWEEN_MASKS[s1][s2] = between;

      // Linha completa que passa por s1 e s2
      let oppositeDir = -1;
      if (dir === DIR_NORTH) oppositeDir = DIR_SOUTH;
      else if (dir === DIR_SOUTH) oppositeDir = DIR_NORTH;
      else if (dir === DIR_EAST) oppositeDir = DIR_WEST;
      else if (dir === DIR_WEST) oppositeDir = DIR_EAST;
      else if (dir === DIR_NORTH_EAST) oppositeDir = DIR_SOUTH_WEST;
      else if (dir === DIR_NORTH_WEST) oppositeDir = DIR_SOUTH_EAST;
      else if (dir === DIR_SOUTH_EAST) oppositeDir = DIR_NORTH_WEST;
      else if (dir === DIR_SOUTH_WEST) oppositeDir = DIR_NORTH_EAST;

      LINE_MASKS[s1][s2] = RAY_MASKS[s1][dir] | RAY_MASKS[s1][oppositeDir] | squareToBit(s1);
    }
  }
}
