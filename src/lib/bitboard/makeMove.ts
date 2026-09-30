/**
 * FASE 5.8 — MAKE MOVE EXPERIMENTAL BITBOARD
 */

import { BitboardBoard, Color, PieceType, Square, UndoState } from './types';
import {
  CASTLE_BK,
  CASTLE_BQ,
  CASTLE_WK,
  CASTLE_WQ,
  SQ_A1,
  SQ_A8,
  SQ_C1,
  SQ_C8,
  SQ_D1,
  SQ_D8,
  SQ_F1,
  SQ_F8,
  SQ_G1,
  SQ_G8,
  SQ_H1,
  SQ_H8,
  squareToBit
} from './constants';
import {
  FLAG_DOUBLE_PAWN,
  FLAG_EP_CAPTURE,
  FLAG_KING_CASTLE,
  FLAG_QUEEN_CASTLE,
  moveFlags,
  moveFrom,
  moveIsCapture,
  moveIsPromotion,
  movePromotionPiece,
  moveTo,
  RawMove
} from './moveTypes';
import { updateOccupancy } from './occupancy';
import {
  getPieceSquareKey,
  sideToMoveKey,
  castlingKeys,
  enPassantKeys,
  computeZobristHashBitboard
} from '../zobrist';

export function makeMove(board: BitboardBoard, move: RawMove): UndoState {
  const from = moveFrom(move);
  const to = moveTo(move);
  const flags = moveFlags(move);
  const us: Color = board.sideToMove;
  const them: Color = us === 'w' ? 'b' : 'w';

  const fromBit = squareToBit(from);
  const toBit = squareToBit(to);

  // Salvar estado para Undo
  const prevZobristHash = board.zobristHash !== undefined ? board.zobristHash : computeZobristHashBitboard(board);
  const undo: UndoState = {
    move,
    castlingRights: board.castlingRights,
    enPassantSquare: board.enPassantSquare,
    halfmoveClock: board.halfmoveClock,
    fullmoveNumber: board.fullmoveNumber,
    prevZobristHash
  };

  // Identificar a peça que está se movendo
  let movedPiece: PieceType = 'p';
  if (us === 'w') {
    if ((board.whitePawns & fromBit) !== 0n) movedPiece = 'p';
    else if ((board.whiteKnights & fromBit) !== 0n) movedPiece = 'n';
    else if ((board.whiteBishops & fromBit) !== 0n) movedPiece = 'b';
    else if ((board.whiteRooks & fromBit) !== 0n) movedPiece = 'r';
    else if ((board.whiteQueens & fromBit) !== 0n) movedPiece = 'q';
    else if ((board.whiteKing & fromBit) !== 0n) movedPiece = 'k';
  } else {
    if ((board.blackPawns & fromBit) !== 0n) movedPiece = 'p';
    else if ((board.blackKnights & fromBit) !== 0n) movedPiece = 'n';
    else if ((board.blackBishops & fromBit) !== 0n) movedPiece = 'b';
    else if ((board.blackRooks & fromBit) !== 0n) movedPiece = 'r';
    else if ((board.blackQueens & fromBit) !== 0n) movedPiece = 'q';
    else if ((board.blackKing & fromBit) !== 0n) movedPiece = 'k';
  }

  // Identificar e remover captura
  if (moveIsCapture(move)) {
    board.halfmoveClock = 0;

    if (flags === FLAG_EP_CAPTURE) {
      undo.capturedPieceType = 'p';
      const epCapSq: Square = us === 'w' ? to - 8 : to + 8;
      undo.capturedSquare = epCapSq;
      const epCapBit = squareToBit(epCapSq);

      if (us === 'w') {
        board.blackPawns ^= epCapBit;
      } else {
        board.whitePawns ^= epCapBit;
      }
    } else {
      undo.capturedSquare = to;
      if (them === 'w') {
        if ((board.whitePawns & toBit) !== 0n) { undo.capturedPieceType = 'p'; board.whitePawns ^= toBit; }
        else if ((board.whiteKnights & toBit) !== 0n) { undo.capturedPieceType = 'n'; board.whiteKnights ^= toBit; }
        else if ((board.whiteBishops & toBit) !== 0n) { undo.capturedPieceType = 'b'; board.whiteBishops ^= toBit; }
        else if ((board.whiteRooks & toBit) !== 0n) { undo.capturedPieceType = 'r'; board.whiteRooks ^= toBit; }
        else if ((board.whiteQueens & toBit) !== 0n) { undo.capturedPieceType = 'q'; board.whiteQueens ^= toBit; }
        else if ((board.whiteKing & toBit) !== 0n) { undo.capturedPieceType = 'k'; board.whiteKing ^= toBit; }
      } else {
        if ((board.blackPawns & toBit) !== 0n) { undo.capturedPieceType = 'p'; board.blackPawns ^= toBit; }
        else if ((board.blackKnights & toBit) !== 0n) { undo.capturedPieceType = 'n'; board.blackKnights ^= toBit; }
        else if ((board.blackBishops & toBit) !== 0n) { undo.capturedPieceType = 'b'; board.blackBishops ^= toBit; }
        else if ((board.blackRooks & toBit) !== 0n) { undo.capturedPieceType = 'r'; board.blackRooks ^= toBit; }
        else if ((board.blackQueens & toBit) !== 0n) { undo.capturedPieceType = 'q'; board.blackQueens ^= toBit; }
        else if ((board.blackKing & toBit) !== 0n) { undo.capturedPieceType = 'k'; board.blackKing ^= toBit; }
      }
    }
  } else if (movedPiece === 'p') {
    board.halfmoveClock = 0;
  } else {
    board.halfmoveClock++;
  }

  // Mover a peça
  const fromTo = fromBit | toBit;

  if (us === 'w') {
    switch (movedPiece) {
      case 'p':
        board.whitePawns ^= fromBit;
        if (moveIsPromotion(move)) {
          const promo = movePromotionPiece(move);
          if (promo === 'q') board.whiteQueens |= toBit;
          else if (promo === 'r') board.whiteRooks |= toBit;
          else if (promo === 'b') board.whiteBishops |= toBit;
          else if (promo === 'n') board.whiteKnights |= toBit;
        } else {
          board.whitePawns |= toBit;
        }
        break;
      case 'n': board.whiteKnights ^= fromTo; break;
      case 'b': board.whiteBishops ^= fromTo; break;
      case 'r': board.whiteRooks ^= fromTo; break;
      case 'q': board.whiteQueens ^= fromTo; break;
      case 'k':
        board.whiteKing ^= fromTo;
        board.castlingRights &= ~(CASTLE_WK | CASTLE_WQ);
        if (flags === FLAG_KING_CASTLE) {
          // Torre h1 -> f1
          board.whiteRooks ^= (squareToBit(SQ_H1) | squareToBit(SQ_F1));
        } else if (flags === FLAG_QUEEN_CASTLE) {
          // Torre a1 -> d1
          board.whiteRooks ^= (squareToBit(SQ_A1) | squareToBit(SQ_D1));
        }
        break;
    }
  } else {
    switch (movedPiece) {
      case 'p':
        board.blackPawns ^= fromBit;
        if (moveIsPromotion(move)) {
          const promo = movePromotionPiece(move);
          if (promo === 'q') board.blackQueens |= toBit;
          else if (promo === 'r') board.blackRooks |= toBit;
          else if (promo === 'b') board.blackBishops |= toBit;
          else if (promo === 'n') board.blackKnights |= toBit;
        } else {
          board.blackPawns |= toBit;
        }
        break;
      case 'n': board.blackKnights ^= fromTo; break;
      case 'b': board.blackBishops ^= fromTo; break;
      case 'r': board.blackRooks ^= fromTo; break;
      case 'q': board.blackQueens ^= fromTo; break;
      case 'k':
        board.blackKing ^= fromTo;
        board.castlingRights &= ~(CASTLE_BK | CASTLE_BQ);
        if (flags === FLAG_KING_CASTLE) {
          // Torre h8 -> f8
          board.blackRooks ^= (squareToBit(SQ_H8) | squareToBit(SQ_F8));
        } else if (flags === FLAG_QUEEN_CASTLE) {
          // Torre a8 -> d8
          board.blackRooks ^= (squareToBit(SQ_A8) | squareToBit(SQ_D8));
        }
        break;
    }
  }

  // Atualizar direitos de roque se uma torre se moveu ou foi capturada
  if (board.castlingRights !== 0) {
    if (from === SQ_A1 || to === SQ_A1) board.castlingRights &= ~CASTLE_WQ;
    if (from === SQ_H1 || to === SQ_H1) board.castlingRights &= ~CASTLE_WK;
    if (from === SQ_A8 || to === SQ_A8) board.castlingRights &= ~CASTLE_BQ;
    if (from === SQ_H8 || to === SQ_H8) board.castlingRights &= ~CASTLE_BK;
  }

  // Atualizar en passant square
  // chess.js condition: only set epSquare if an enemy pawn is on adjacent file
  if (flags === FLAG_DOUBLE_PAWN) {
    const toFile = to & 7;
    const enemyPawns = us === 'w' ? board.blackPawns : board.whitePawns;
    let hasAdjacentEnemyPawn = false;

    if (toFile > 0 && ((enemyPawns & squareToBit(to - 1)) !== 0n)) {
      hasAdjacentEnemyPawn = true;
    }
    if (toFile < 7 && ((enemyPawns & squareToBit(to + 1)) !== 0n)) {
      hasAdjacentEnemyPawn = true;
    }

    if (hasAdjacentEnemyPawn) {
      board.enPassantSquare = us === 'w' ? from + 8 : from - 8;
    } else {
      board.enPassantSquare = -1;
    }
  } else {
    board.enPassantSquare = -1;
  }

  // Alternar turno e atualizar fullmove
  if (us === 'b') {
    board.fullmoveNumber++;
  }
  board.sideToMove = them;

  updateOccupancy(board);

  // Atualizar hash Zobrist incrementalmente
  let h = prevZobristHash;

  // 1. Peça movida (remove de from, adiciona em to ou promo)
  h ^= getPieceSquareKey(us, movedPiece, from);
  if (moveIsPromotion(move)) {
    const promo = movePromotionPiece(move);
    h ^= getPieceSquareKey(us, promo, to);
  } else {
    h ^= getPieceSquareKey(us, movedPiece, to);
  }

  // 2. Peça capturada (se houver)
  if (moveIsCapture(move)) {
    if (flags === FLAG_EP_CAPTURE) {
      const epCapSq: Square = us === 'w' ? to - 8 : to + 8;
      h ^= getPieceSquareKey(them, 'p', epCapSq);
    } else {
      h ^= getPieceSquareKey(them, undo.capturedPieceType!, to);
    }
  }

  // 3. Torre no roque
  if (flags === FLAG_KING_CASTLE) {
    if (us === 'w') {
      h ^= getPieceSquareKey('w', 'r', SQ_H1) ^ getPieceSquareKey('w', 'r', SQ_F1);
    } else {
      h ^= getPieceSquareKey('b', 'r', SQ_H8) ^ getPieceSquareKey('b', 'r', SQ_F8);
    }
  } else if (flags === FLAG_QUEEN_CASTLE) {
    if (us === 'w') {
      h ^= getPieceSquareKey('w', 'r', SQ_A1) ^ getPieceSquareKey('w', 'r', SQ_D1);
    } else {
      h ^= getPieceSquareKey('b', 'r', SQ_A8) ^ getPieceSquareKey('b', 'r', SQ_D8);
    }
  }

  // 4. Lado a jogar
  h ^= sideToMoveKey;

  // 5. Direitos de roque alterados
  const changedRights = undo.castlingRights ^ board.castlingRights;
  if (changedRights & CASTLE_WK) h ^= castlingKeys[0];
  if (changedRights & CASTLE_WQ) h ^= castlingKeys[1];
  if (changedRights & CASTLE_BK) h ^= castlingKeys[2];
  if (changedRights & CASTLE_BQ) h ^= castlingKeys[3];

  // 6. En passant square
  if (undo.enPassantSquare !== -1) {
    h ^= enPassantKeys[undo.enPassantSquare & 7];
  }
  if (board.enPassantSquare !== -1) {
    h ^= enPassantKeys[board.enPassantSquare & 7];
  }

  board.zobristHash = h >>> 0;
  return undo;
}
