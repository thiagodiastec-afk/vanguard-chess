/**
 * FASE 5.8 — DETECÇÃO DE PEÇAS CRAVADAS (PINS)
 */

import { Bitboard, BitboardBoard, Color, Square } from './types';
import { BB_EMPTY, squareToBit } from './constants';
import { lsb } from './bitboard';
import { bishopAttacks, rookAttacks } from './attacks';
import { BETWEEN_MASKS, LINE_MASKS } from './rays';

export interface PinResult {
  pinnedPieces: Bitboard;
  pinRays: Map<Square, Bitboard>;
}

/**
 * Encontra todas as peças da cor `color` que estão em cravada absoluta contra o seu próprio rei.
 */
export function findPins(board: BitboardBoard, color: Color): PinResult {
  const kingBb = color === 'w' ? board.whiteKing : board.blackKing;
  const kingSq = lsb(kingBb);

  if (kingSq === -1) {
    return { pinnedPieces: BB_EMPTY, pinRays: new Map() };
  }

  const friendlyOcc = color === 'w' ? board.whiteOccupancy : board.blackOccupancy;
  const enemyBishops = color === 'w' ? (board.blackBishops | board.blackQueens) : (board.whiteBishops | board.whiteQueens);
  const enemyRooks = color === 'w' ? (board.blackRooks | board.blackQueens) : (board.whiteRooks | board.whiteQueens);

  let pinnedPieces: Bitboard = BB_EMPTY;
  const pinRays = new Map<Square, Bitboard>();

  const enemyOcc = color === 'w' ? board.blackOccupancy : board.whiteOccupancy;

  // 1. Cravadas Diagonais (Bispos / Damas)
  // Atacantes potenciais que tenham linha de visão desobstruída para o rei através de peças amigas
  const bishopPinners = bishopAttacks(kingSq, enemyOcc) & enemyBishops;
  let pinnerIter = bishopPinners;
  while (pinnerIter !== BB_EMPTY) {
    const pinnerSq = lsb(pinnerIter);
    pinnerIter &= pinnerIter - 1n;

    // Casas entre rei e pinner
    const between = BETWEEN_MASKS[kingSq][pinnerSq];
    const pinnedOnRay = between & friendlyOcc;

    // Se houver exatamente uma peça amiga entre o rei e o pinner, ela está cravada!
    if (pinnedOnRay !== BB_EMPTY && (pinnedOnRay & (pinnedOnRay - 1n)) === BB_EMPTY) {
      const pinnedSq = lsb(pinnedOnRay);
      pinnedPieces |= pinnedOnRay;
      // Peça só pode se mover ao longo da linha entre rei e pinner (inclusive capturar o pinner)
      pinRays.set(pinnedSq, LINE_MASKS[kingSq][pinnerSq]);
    }
  }

  // 2. Cravadas Ortogonais (Torres / Damas)
  const rookPinners = rookAttacks(kingSq, enemyOcc) & enemyRooks;
  pinnerIter = rookPinners;
  while (pinnerIter !== BB_EMPTY) {
    const pinnerSq = lsb(pinnerIter);
    pinnerIter &= pinnerIter - 1n;

    const between = BETWEEN_MASKS[kingSq][pinnerSq];
    const pinnedOnRay = between & friendlyOcc;

    if (pinnedOnRay !== BB_EMPTY && (pinnedOnRay & (pinnedOnRay - 1n)) === BB_EMPTY) {
      const pinnedSq = lsb(pinnedOnRay);
      pinnedPieces |= pinnedOnRay;
      pinRays.set(pinnedSq, LINE_MASKS[kingSq][pinnerSq]);
    }
  }

  return { pinnedPieces, pinRays };
}
