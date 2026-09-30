/**
 * FASE 5.8 — TIPOS E ENCODING DE MOVIMENTOS BITBOARD
 *
 * Codificação inteira em 32-bit (sem alocação de objetos/strings na geração):
 * - bits 0..5:   from (0..63)
 * - bits 6..11:  to (0..63)
 * - bits 12..15: flags
 *
 * Flags:
 * 0: QUIET
 * 1: DOUBLE_PAWN_PUSH
 * 2: KING_CASTLE
 * 3: QUEEN_CASTLE
 * 4: CAPTURE
 * 5: EP_CAPTURE
 * 8: PROMO_KNIGHT
 * 9: PROMO_BISHOP
 * 10: PROMO_ROOK
 * 11: PROMO_QUEEN
 * 12: PROMO_CAP_KNIGHT
 * 13: PROMO_CAP_BISHOP
 * 14: PROMO_CAP_ROOK
 * 15: PROMO_CAP_QUEEN
 */

import { PieceType, Square } from './types';
import { bitToSquareName } from './constants';

export const FLAG_QUIET = 0;
export const FLAG_DOUBLE_PAWN = 1;
export const FLAG_KING_CASTLE = 2;
export const FLAG_QUEEN_CASTLE = 3;
export const FLAG_CAPTURE = 4;
export const FLAG_EP_CAPTURE = 5;

export const FLAG_PROMO_N = 8;
export const FLAG_PROMO_B = 9;
export const FLAG_PROMO_R = 10;
export const FLAG_PROMO_Q = 11;

export const FLAG_PROMO_CAP_N = 12;
export const FLAG_PROMO_CAP_B = 13;
export const FLAG_PROMO_CAP_R = 14;
export const FLAG_PROMO_CAP_Q = 15;

export type RawMove = number;

export function encodeMove(from: Square, to: Square, flags: number): RawMove {
  return from | (to << 6) | (flags << 12);
}

export function moveFrom(m: RawMove): Square {
  return m & 0x3f;
}

export function moveTo(m: RawMove): Square {
  return (m >> 6) & 0x3f;
}

export function moveFlags(m: RawMove): number {
  return (m >> 12) & 0x0f;
}

export function moveIsCapture(m: RawMove): boolean {
  const f = moveFlags(m);
  return (f & FLAG_CAPTURE) !== 0 || f === FLAG_EP_CAPTURE;
}

export function moveIsPromotion(m: RawMove): boolean {
  return (moveFlags(m) & 8) !== 0;
}

export function movePromotionPiece(m: RawMove): PieceType | undefined {
  const f = moveFlags(m);
  if ((f & 8) === 0) return undefined;
  const p = f & 3;
  if (p === 0) return 'n';
  if (p === 1) return 'b';
  if (p === 2) return 'r';
  return 'q';
}

export function moveIsCastle(m: RawMove): boolean {
  const f = moveFlags(m);
  return f === FLAG_KING_CASTLE || f === FLAG_QUEEN_CASTLE;
}

export function moveIsEp(m: RawMove): boolean {
  return moveFlags(m) === FLAG_EP_CAPTURE;
}

export function moveToUci(m: RawMove): string {
  const fromStr = bitToSquareName(moveFrom(m));
  const toStr = bitToSquareName(moveTo(m));
  const promo = movePromotionPiece(m);
  return `${fromStr}${toStr}${promo || ''}`;
}
