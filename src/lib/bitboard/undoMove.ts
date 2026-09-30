/**
 * FASE 5.8 — UNDO MOVE EXPERIMENTAL BITBOARD
 */

import { BitboardBoard, Color, UndoState } from './types';
import {
  SQ_A1,
  SQ_A8,
  SQ_D1,
  SQ_D8,
  SQ_F1,
  SQ_F8,
  SQ_H1,
  SQ_H8,
  squareToBit
} from './constants';
import {
  FLAG_EP_CAPTURE,
  FLAG_KING_CASTLE,
  FLAG_QUEEN_CASTLE,
  moveFlags,
  moveFrom,
  moveIsCapture,
  moveIsPromotion,
  movePromotionPiece,
  moveTo
} from './moveTypes';
import { updateOccupancy } from './occupancy';

export function undoMove(board: BitboardBoard, undo: UndoState): void {
  const move = undo.move;
  const from = moveFrom(move);
  const to = moveTo(move);
  const flags = moveFlags(move);

  // O lado que fez o lance é o oposto do atual sideToMove
  const us: Color = board.sideToMove === 'w' ? 'b' : 'w';
  const them: Color = board.sideToMove;

  const fromBit = squareToBit(from);
  const toBit = squareToBit(to);
  const fromTo = fromBit | toBit;

  // 1. Reverter a peça movida
  if (us === 'w') {
    if (moveIsPromotion(move)) {
      const promo = movePromotionPiece(move);
      if (promo === 'q') board.whiteQueens ^= toBit;
      else if (promo === 'r') board.whiteRooks ^= toBit;
      else if (promo === 'b') board.whiteBishops ^= toBit;
      else if (promo === 'n') board.whiteKnights ^= toBit;
      board.whitePawns |= fromBit;
    } else if ((board.whiteKing & toBit) !== 0n) {
      board.whiteKing ^= fromTo;
      if (flags === FLAG_KING_CASTLE) {
        board.whiteRooks ^= (squareToBit(SQ_H1) | squareToBit(SQ_F1));
      } else if (flags === FLAG_QUEEN_CASTLE) {
        board.whiteRooks ^= (squareToBit(SQ_A1) | squareToBit(SQ_D1));
      }
    } else if ((board.whitePawns & toBit) !== 0n) {
      board.whitePawns ^= fromTo;
    } else if ((board.whiteKnights & toBit) !== 0n) {
      board.whiteKnights ^= fromTo;
    } else if ((board.whiteBishops & toBit) !== 0n) {
      board.whiteBishops ^= fromTo;
    } else if ((board.whiteRooks & toBit) !== 0n) {
      board.whiteRooks ^= fromTo;
    } else if ((board.whiteQueens & toBit) !== 0n) {
      board.whiteQueens ^= fromTo;
    }
  } else {
    // us === 'b'
    if (moveIsPromotion(move)) {
      const promo = movePromotionPiece(move);
      if (promo === 'q') board.blackQueens ^= toBit;
      else if (promo === 'r') board.blackRooks ^= toBit;
      else if (promo === 'b') board.blackBishops ^= toBit;
      else if (promo === 'n') board.blackKnights ^= toBit;
      board.blackPawns |= fromBit;
    } else if ((board.blackKing & toBit) !== 0n) {
      board.blackKing ^= fromTo;
      if (flags === FLAG_KING_CASTLE) {
        board.blackRooks ^= (squareToBit(SQ_H8) | squareToBit(SQ_F8));
      } else if (flags === FLAG_QUEEN_CASTLE) {
        board.blackRooks ^= (squareToBit(SQ_A8) | squareToBit(SQ_D8));
      }
    } else if ((board.blackPawns & toBit) !== 0n) {
      board.blackPawns ^= fromTo;
    } else if ((board.blackKnights & toBit) !== 0n) {
      board.blackKnights ^= fromTo;
    } else if ((board.blackBishops & toBit) !== 0n) {
      board.blackBishops ^= fromTo;
    } else if ((board.blackRooks & toBit) !== 0n) {
      board.blackRooks ^= fromTo;
    } else if ((board.blackQueens & toBit) !== 0n) {
      board.blackQueens ^= fromTo;
    }
  }

  // 2. Restaurar peça capturada, se houver
  if (moveIsCapture(move)) {
    const capSq = undo.capturedSquare !== undefined ? undo.capturedSquare : to;
    const capBit = squareToBit(capSq);
    const capPiece = undo.capturedPieceType;

    if (them === 'w') {
      switch (capPiece) {
        case 'p': board.whitePawns |= capBit; break;
        case 'n': board.whiteKnights |= capBit; break;
        case 'b': board.whiteBishops |= capBit; break;
        case 'r': board.whiteRooks |= capBit; break;
        case 'q': board.whiteQueens |= capBit; break;
        case 'k': board.whiteKing |= capBit; break;
      }
    } else {
      switch (capPiece) {
        case 'p': board.blackPawns |= capBit; break;
        case 'n': board.blackKnights |= capBit; break;
        case 'b': board.blackBishops |= capBit; break;
        case 'r': board.blackRooks |= capBit; break;
        case 'q': board.blackQueens |= capBit; break;
        case 'k': board.blackKing |= capBit; break;
      }
    }
  }

  // 3. Restaurar estado de tabuleiro
  board.castlingRights = undo.castlingRights;
  board.enPassantSquare = undo.enPassantSquare;
  board.halfmoveClock = undo.halfmoveClock;
  board.fullmoveNumber = undo.fullmoveNumber;
  board.sideToMove = us;
  if (undo.prevZobristHash !== undefined) {
    board.zobristHash = undo.prevZobristHash;
  }

  updateOccupancy(board);
}
