/**
 * FASE 5.9 — BITBOARD BACKEND (EXPERIMENTAL PRIMARY BACKEND)
 *
 * Utiliza exclusivamente a infraestrutura validada em `src/lib/bitboard/`.
 * Fornece compatibilidade com o motor de busca sem alterar a lógica minimax.
 */

import {
  BitboardBoard,
  Square,
  UndoState as BitboardUndoState,
  parseFen,
  bitboardBoardToFen,
  generateLegalMoves as bitboardGenerateLegalMoves,
  makeMove as bitboardMakeMove,
  undoMove as bitboardUndoMove,
  isInCheck as bitboardIsInCheck,
  isSquareAttacked as bitboardIsSquareAttacked,
  getPieceAt,
  cloneBoard,
  encodeMove,
  moveFrom,
  moveTo,
  moveFlags,
  moveIsCapture,
  moveIsPromotion,
  movePromotionPiece,
  FLAG_KING_CASTLE,
  FLAG_QUEEN_CASTLE,
  FLAG_EP_CAPTURE,
  FLAG_DOUBLE_PAWN,
  FLAG_CAPTURE,
  FLAG_QUIET,
  FLAG_PROMO_Q,
  FLAG_PROMO_R,
  FLAG_PROMO_B,
  FLAG_PROMO_N,
  FLAG_PROMO_CAP_Q,
  FLAG_PROMO_CAP_R,
  FLAG_PROMO_CAP_B,
  FLAG_PROMO_CAP_N,
  popcount,
  RawMove,
  evaluateBoardBitboard
} from '../bitboard';
import { computeZobristHashBitboard } from '../zobrist';
import { BoardBackend, BoardPiece, Color, EngineMove, BoardUndoState, PieceSymbol } from './types';
import { ox88ToSq64, sq64ToOx88 } from './mapping';

function hasInsufficientMaterial(b: BitboardBoard): boolean {
  if (b.whitePawns !== 0n || b.blackPawns !== 0n ||
      b.whiteRooks !== 0n || b.blackRooks !== 0n ||
      b.whiteQueens !== 0n || b.blackQueens !== 0n) {
    return false;
  }
  const wB = popcount(b.whiteBishops);
  const bB = popcount(b.blackBishops);
  const wN = popcount(b.whiteKnights);
  const bN = popcount(b.blackKnights);
  const totalB = wB + bB;
  const totalN = wN + bN;
  const numPieces = 2 + totalB + totalN; // Kings + minors

  // k vs. k
  if (numPieces === 2) return true;

  // k vs. kn or k vs. kb
  if (numPieces === 3 && (totalB === 1 || totalN === 1)) return true;

  // kb vs. kb where all bishops are on the same color
  if (numPieces === totalB + 2) {
    const LIGHT_SQUARES = 0x55AA55AA55AA55AAn;
    const allB = b.whiteBishops | b.blackBishops;
    const lightB = popcount(allB & LIGHT_SQUARES);
    if (lightB === 0 || lightB === totalB) {
      return true;
    }
  }

  return false;
}

export class BitboardBackend implements BoardBackend {
  readonly backendType = 'bitboard' as const;
  private boardState: BitboardBoard;

  constructor(fen?: string) {
    this.boardState = parseFen(fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  }

  getBoardState(): BitboardBoard {
    return this.boardState;
  }

  loadFEN(fen: string): void {
    this.boardState = parseFen(fen);
  }

  getFEN(options?: { forceEnpassantSquare?: boolean }): string {
    return bitboardBoardToFen(this.boardState, options);
  }

  getTurn(): Color {
    return this.boardState.sideToMove;
  }

  generateLegalMoves(): EngineMove[] {
    const rawMoves = bitboardGenerateLegalMoves(this.boardState);
    const moves: EngineMove[] = [];

    for (let i = 0; i < rawMoves.length; i++) {
      const rm = rawMoves[i];
      const from64 = moveFrom(rm);
      const to64 = moveTo(rm);
      const f = moveFlags(rm);

      const pieceInfo = getPieceAt(this.boardState, from64);
      if (!pieceInfo) continue;

      let capturedPiece: PieceSymbol | undefined = undefined;
      if (moveIsCapture(rm)) {
        if (f === FLAG_EP_CAPTURE) {
          capturedPiece = 'p';
        } else {
          const capInfo = getPieceAt(this.boardState, to64);
          if (capInfo) {
            capturedPiece = capInfo.piece;
          }
        }
      }

      const promo = movePromotionPiece(rm);

      // Mapear flag para convenção exata do chess.js (BITS):
      // NORMAL: 1, CAPTURE: 2, BIG_PAWN: 4, EP_CAPTURE: 8, PROMOTION: 16, KSIDE_CASTLE: 32, QSIDE_CASTLE: 64
      let chessJsFlags = 1; // NORMAL
      if (f === FLAG_DOUBLE_PAWN) chessJsFlags = 4;
      else if (f === FLAG_KING_CASTLE) chessJsFlags = 32;
      else if (f === FLAG_QUEEN_CASTLE) chessJsFlags = 64;
      else if (f === FLAG_EP_CAPTURE) chessJsFlags = 8;
      else if (moveIsPromotion(rm)) {
        chessJsFlags = moveIsCapture(rm) ? (16 | 2) : 16;
      } else if (moveIsCapture(rm)) {
        chessJsFlags = 2;
      }

      moves.push({
        color: pieceInfo.color,
        from: sq64ToOx88(from64),
        to: sq64ToOx88(to64),
        piece: pieceInfo.piece,
        captured: capturedPiece,
        promotion: promo,
        flags: chessJsFlags
      });
    }

    return moves;
  }

  makeMove(move: EngineMove): BoardUndoState {
    const from64 = ox88ToSq64(move.from);
    const to64 = ox88ToSq64(move.to);

    // Converter flag de volta para os bits internos do Bitboard
    let flags = FLAG_QUIET;
    if (move.flags !== undefined && move.flags !== null) {
      if (move.flags & 32) flags = FLAG_KING_CASTLE;
      else if (move.flags & 64) flags = FLAG_QUEEN_CASTLE;
      else if (move.flags & 8) flags = FLAG_EP_CAPTURE;
      else if (move.flags & 16) {
        const isCap = !!(move.flags & 2) || !!move.captured;
        if (move.promotion === 'q') flags = isCap ? FLAG_PROMO_CAP_Q : FLAG_PROMO_Q;
        else if (move.promotion === 'r') flags = isCap ? FLAG_PROMO_CAP_R : FLAG_PROMO_R;
        else if (move.promotion === 'b') flags = isCap ? FLAG_PROMO_CAP_B : FLAG_PROMO_B;
        else if (move.promotion === 'n') flags = isCap ? FLAG_PROMO_CAP_N : FLAG_PROMO_N;
      } else if (move.flags & 2) {
        flags = FLAG_CAPTURE;
      } else if (move.flags & 4) {
        flags = FLAG_DOUBLE_PAWN;
      }
    } else {
      if (move.piece === 'p' && Math.abs(from64 - to64) === 16) {
        flags = FLAG_DOUBLE_PAWN;
      } else if (move.piece === 'k' && to64 - from64 === 2) {
        flags = FLAG_KING_CASTLE;
      } else if (move.piece === 'k' && from64 - to64 === 2) {
        flags = FLAG_QUEEN_CASTLE;
      } else if (move.promotion) {
        const isCap = !!move.captured;
        if (move.promotion === 'q') flags = isCap ? FLAG_PROMO_CAP_Q : FLAG_PROMO_Q;
        else if (move.promotion === 'r') flags = isCap ? FLAG_PROMO_CAP_R : FLAG_PROMO_R;
        else if (move.promotion === 'b') flags = isCap ? FLAG_PROMO_CAP_B : FLAG_PROMO_B;
        else if (move.promotion === 'n') flags = isCap ? FLAG_PROMO_CAP_N : FLAG_PROMO_N;
      } else if (move.captured) {
        if (move.piece === 'p' && to64 === this.boardState.enPassantSquare) {
          flags = FLAG_EP_CAPTURE;
        } else {
          flags = FLAG_CAPTURE;
        }
      } else {
        flags = FLAG_QUIET;
      }
    }

    const rawMove: RawMove = encodeMove(from64, to64, flags);
    const bbUndo = bitboardMakeMove(this.boardState, rawMove);

    return {
      move,
      prevData: bbUndo
    };
  }

  undoMove(undo: BoardUndoState): void {
    bitboardUndoMove(this.boardState, undo.prevData as BitboardUndoState);
  }

  isInCheck(color?: Color): boolean {
    const c = color || this.boardState.sideToMove;
    return bitboardIsInCheck(this.boardState, c);
  }

  isSquareAttacked(square0x88: number, byColor: Color): boolean {
    const sq64 = ox88ToSq64(square0x88);
    if (sq64 < 0 || sq64 > 63) return false;
    return bitboardIsSquareAttacked(this.boardState, sq64, byColor);
  }

  isGameOver(): boolean {
    // 50-move rule
    if (this.boardState.halfmoveClock >= 100) return true;

    // Check legal moves
    const legalMoves = bitboardGenerateLegalMoves(this.boardState);
    if (legalMoves.length === 0) return true;

    // Insufficient material check (matching chess.js)
    if (hasInsufficientMaterial(this.boardState)) {
      return true;
    }

    return false;
  }

  isCheckmate(): boolean {
    if (!bitboardIsInCheck(this.boardState, this.boardState.sideToMove)) return false;
    const legalMoves = bitboardGenerateLegalMoves(this.boardState);
    return legalMoves.length === 0;
  }

  isDraw(): boolean {
    if (this.boardState.halfmoveClock >= 100) return true;
    if (!bitboardIsInCheck(this.boardState, this.boardState.sideToMove)) {
      const legalMoves = bitboardGenerateLegalMoves(this.boardState);
      if (legalMoves.length === 0) return true; // Stalemate
    }
    // Insufficient material
    if (hasInsufficientMaterial(this.boardState)) {
      return true;
    }
    return false;
  }

  board(): (BoardPiece | null)[][] {
    const res: (BoardPiece | null)[][] = [];
    for (let r = 7; r >= 0; r--) {
      const row: (BoardPiece | null)[] = [];
      for (let f = 0; f < 8; f++) {
        const sq64 = r * 8 + f;
        const p = getPieceAt(this.boardState, sq64);
        if (p) {
          row.push({ type: p.piece, color: p.color });
        } else {
          row.push(null);
        }
      }
      res.push(row);
    }
    return res;
  }

  evaluate(): number {
    return evaluateBoardBitboard(this.boardState);
  }

  getZobristHash(): number {
    return this.boardState.zobristHash !== undefined
      ? this.boardState.zobristHash
      : computeZobristHashBitboard(this.boardState);
  }

  clone(): BoardBackend {
    const copy = new BitboardBackend();
    copy.boardState = cloneBoard(this.boardState);
    return copy;
  }
}
