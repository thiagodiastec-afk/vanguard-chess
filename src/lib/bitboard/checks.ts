/**
 * FASE 5.8 — DETECÇÃO DE XEQUE E MÁSCARAS DE XEQUE (CHECK MASKS)
 */

import { Bitboard, BitboardBoard, CheckInfo, Color, Square } from './types';
import { BB_ALL, BB_EMPTY, squareToBit } from './constants';
import { lsb } from './bitboard';
import {
  BLACK_PAWN_ATTACKS,
  bishopAttacks,
  isSquareAttacked,
  KNIGHT_ATTACKS,
  rookAttacks,
  WHITE_PAWN_ATTACKS
} from './attacks';
import { BETWEEN_MASKS } from './rays';
import { findPins } from './pins';

export function isInCheck(board: BitboardBoard, color: Color): boolean {
  const kingBb = color === 'w' ? board.whiteKing : board.blackKing;
  const kingSq = lsb(kingBb);
  if (kingSq === -1) return false;
  const enemyColor: Color = color === 'w' ? 'b' : 'w';
  return isSquareAttacked(board, kingSq, enemyColor);
}

export function getCheckInfo(board: BitboardBoard, color: Color): CheckInfo {
  const kingBb = color === 'w' ? board.whiteKing : board.blackKing;
  const kingSq = lsb(kingBb);

  if (kingSq === -1) {
    return {
      inCheck: false,
      doubleCheck: false,
      numCheckers: 0,
      checkerSquares: [],
      checkMask: BB_ALL,
      pinnedPieces: BB_EMPTY,
      pinRays: new Map()
    };
  }

  const enemyColor: Color = color === 'w' ? 'b' : 'w';
  const occ = board.allOccupancy;

  const checkerSquares: Square[] = [];
  let checkMask: Bitboard = BB_EMPTY;

  if (enemyColor === 'b') {
    // 1. Peões pretos atacando rei branco
    const pawnCheckers = WHITE_PAWN_ATTACKS[kingSq] & board.blackPawns;
    let iter = pawnCheckers;
    while (iter !== BB_EMPTY) {
      const sq = lsb(iter);
      checkerSquares.push(sq);
      checkMask |= squareToBit(sq);
      iter &= iter - 1n;
    }

    // 2. Cavalos pretos
    const knightCheckers = KNIGHT_ATTACKS[kingSq] & board.blackKnights;
    iter = knightCheckers;
    while (iter !== BB_EMPTY) {
      const sq = lsb(iter);
      checkerSquares.push(sq);
      checkMask |= squareToBit(sq);
      iter &= iter - 1n;
    }

    // 3. Bispos e Damas pretas
    const bqCheckers = bishopAttacks(kingSq, occ) & (board.blackBishops | board.blackQueens);
    iter = bqCheckers;
    while (iter !== BB_EMPTY) {
      const sq = lsb(iter);
      checkerSquares.push(sq);
      checkMask |= squareToBit(sq) | BETWEEN_MASKS[kingSq][sq];
      iter &= iter - 1n;
    }

    // 4. Torres e Damas pretas
    const rqCheckers = rookAttacks(kingSq, occ) & (board.blackRooks | board.blackQueens);
    iter = rqCheckers;
    while (iter !== BB_EMPTY) {
      const sq = lsb(iter);
      checkerSquares.push(sq);
      checkMask |= squareToBit(sq) | BETWEEN_MASKS[kingSq][sq];
      iter &= iter - 1n;
    }
  } else {
    // Inimigo é branco atacando rei preto
    const pawnCheckers = BLACK_PAWN_ATTACKS[kingSq] & board.whitePawns;
    let iter = pawnCheckers;
    while (iter !== BB_EMPTY) {
      const sq = lsb(iter);
      checkerSquares.push(sq);
      checkMask |= squareToBit(sq);
      iter &= iter - 1n;
    }

    const knightCheckers = KNIGHT_ATTACKS[kingSq] & board.whiteKnights;
    iter = knightCheckers;
    while (iter !== BB_EMPTY) {
      const sq = lsb(iter);
      checkerSquares.push(sq);
      checkMask |= squareToBit(sq);
      iter &= iter - 1n;
    }

    const bqCheckers = bishopAttacks(kingSq, occ) & (board.whiteBishops | board.whiteQueens);
    iter = bqCheckers;
    while (iter !== BB_EMPTY) {
      const sq = lsb(iter);
      checkerSquares.push(sq);
      checkMask |= squareToBit(sq) | BETWEEN_MASKS[kingSq][sq];
      iter &= iter - 1n;
    }

    const rqCheckers = rookAttacks(kingSq, occ) & (board.whiteRooks | board.whiteQueens);
    iter = rqCheckers;
    while (iter !== BB_EMPTY) {
      const sq = lsb(iter);
      checkerSquares.push(sq);
      checkMask |= squareToBit(sq) | BETWEEN_MASKS[kingSq][sq];
      iter &= iter - 1n;
    }
  }

  const numCheckers = checkerSquares.length;
  const inCheck = numCheckers > 0;
  const doubleCheck = numCheckers >= 2;

  // Se não estiver em xeque, qualquer lance legal pode ir para qualquer casa (checkMask = BB_ALL)
  // Se estiver em xeque duplo, nenhuma peça não-rei pode se mover (checkMask = BB_EMPTY)
  // Se estiver em xeque simples, checkMask já contém a casa do atacante e as casas intermediárias
  if (!inCheck) {
    checkMask = BB_ALL;
  } else if (doubleCheck) {
    checkMask = BB_EMPTY;
  }

  const { pinnedPieces, pinRays } = findPins(board, color);

  return {
    inCheck,
    doubleCheck,
    numCheckers,
    checkerSquares,
    checkMask,
    pinnedPieces,
    pinRays
  };
}
