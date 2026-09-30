/**
 * FASE 5.8 — ESTRUTURA DO TABULEIRO BITBOARD
 */

import { BitboardBoard, Color, PieceType, Square } from './types';
import { BB_EMPTY, CASTLE_ALL, squareToBit } from './constants';
import { updateOccupancy } from './occupancy';

export function createEmptyBoard(): BitboardBoard {
  const b: BitboardBoard = {
    whitePawns: BB_EMPTY,
    whiteKnights: BB_EMPTY,
    whiteBishops: BB_EMPTY,
    whiteRooks: BB_EMPTY,
    whiteQueens: BB_EMPTY,
    whiteKing: BB_EMPTY,

    blackPawns: BB_EMPTY,
    blackKnights: BB_EMPTY,
    blackBishops: BB_EMPTY,
    blackRooks: BB_EMPTY,
    blackQueens: BB_EMPTY,
    blackKing: BB_EMPTY,

    whiteOccupancy: BB_EMPTY,
    blackOccupancy: BB_EMPTY,
    allOccupancy: BB_EMPTY,

    sideToMove: 'w',
    castlingRights: CASTLE_ALL,
    enPassantSquare: -1,
    halfmoveClock: 0,
    fullmoveNumber: 1
  };
  return b;
}

export function cloneBoard(b: BitboardBoard): BitboardBoard {
  return {
    whitePawns: b.whitePawns,
    whiteKnights: b.whiteKnights,
    whiteBishops: b.whiteBishops,
    whiteRooks: b.whiteRooks,
    whiteQueens: b.whiteQueens,
    whiteKing: b.whiteKing,

    blackPawns: b.blackPawns,
    blackKnights: b.blackKnights,
    blackBishops: b.blackBishops,
    blackRooks: b.blackRooks,
    blackQueens: b.blackQueens,
    blackKing: b.blackKing,

    whiteOccupancy: b.whiteOccupancy,
    blackOccupancy: b.blackOccupancy,
    allOccupancy: b.allOccupancy,

    sideToMove: b.sideToMove,
    castlingRights: b.castlingRights,
    enPassantSquare: b.enPassantSquare,
    halfmoveClock: b.halfmoveClock,
    fullmoveNumber: b.fullmoveNumber,
    zobristHash: b.zobristHash
  };
}

export function getPieceAt(board: BitboardBoard, sq: Square): { piece: PieceType; color: Color } | null {
  const bit = squareToBit(sq);
  if ((board.allOccupancy & bit) === BB_EMPTY) return null;

  if ((board.whiteOccupancy & bit) !== BB_EMPTY) {
    if ((board.whitePawns & bit) !== BB_EMPTY) return { piece: 'p', color: 'w' };
    if ((board.whiteKnights & bit) !== BB_EMPTY) return { piece: 'n', color: 'w' };
    if ((board.whiteBishops & bit) !== BB_EMPTY) return { piece: 'b', color: 'w' };
    if ((board.whiteRooks & bit) !== BB_EMPTY) return { piece: 'r', color: 'w' };
    if ((board.whiteQueens & bit) !== BB_EMPTY) return { piece: 'q', color: 'w' };
    if ((board.whiteKing & bit) !== BB_EMPTY) return { piece: 'k', color: 'w' };
  } else {
    if ((board.blackPawns & bit) !== BB_EMPTY) return { piece: 'p', color: 'b' };
    if ((board.blackKnights & bit) !== BB_EMPTY) return { piece: 'n', color: 'b' };
    if ((board.blackBishops & bit) !== BB_EMPTY) return { piece: 'b', color: 'b' };
    if ((board.blackRooks & bit) !== BB_EMPTY) return { piece: 'r', color: 'b' };
    if ((board.blackQueens & bit) !== BB_EMPTY) return { piece: 'q', color: 'b' };
    if ((board.blackKing & bit) !== BB_EMPTY) return { piece: 'k', color: 'b' };
  }

  return null;
}
