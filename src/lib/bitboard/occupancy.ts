/**
 * FASE 5.8 — OCUPAÇÃO DO TABULEIRO BITBOARD
 */

import { BitboardBoard } from './types';

export function updateOccupancy(board: BitboardBoard): void {
  board.whiteOccupancy =
    board.whitePawns |
    board.whiteKnights |
    board.whiteBishops |
    board.whiteRooks |
    board.whiteQueens |
    board.whiteKing;

  board.blackOccupancy =
    board.blackPawns |
    board.blackKnights |
    board.blackBishops |
    board.blackRooks |
    board.blackQueens |
    board.blackKing;

  board.allOccupancy = board.whiteOccupancy | board.blackOccupancy;
}
