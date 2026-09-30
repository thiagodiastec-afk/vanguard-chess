/**
 * FASE 5.9 — CHESS.JS BACKEND (ORÁCULO E REFERÊNCIA LEGADA)
 *
 * Encapsula o motor chess.js atual atrás da interface BoardBackend.
 */

import { Chess } from 'chess.js';
import { BoardBackend, BoardPiece, Color, EngineMove, BoardUndoState, PieceSymbol } from './types';
import { ox88ToName } from './mapping';

export class ChessJsBackend implements BoardBackend {
  readonly backendType = 'chessjs' as const;
  private game: Chess;

  constructor(fenOrGame?: string | Chess) {
    if (fenOrGame instanceof Chess) {
      this.game = fenOrGame;
    } else {
      this.game = new Chess(fenOrGame || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    }
  }

  getGame(): Chess {
    return this.game;
  }

  loadFEN(fen: string): void {
    this.game.load(fen);
  }

  getFEN(options?: { forceEnpassantSquare?: boolean }): string {
    return (this.game as any).fen(options);
  }

  getTurn(): Color {
    return this.game.turn() as Color;
  }

  generateLegalMoves(): EngineMove[] {
    const rawMoves = (this.game as any)._moves({ legal: true });
    const moves: EngineMove[] = [];

    for (let i = 0; i < rawMoves.length; i++) {
      const rm = rawMoves[i];
      moves.push({
        color: rm.color,
        from: rm.from,
        to: rm.to,
        piece: rm.piece,
        captured: rm.captured,
        promotion: rm.promotion,
        flags: rm.flags
      });
    }

    return moves;
  }

  makeMove(move: EngineMove): BoardUndoState {
    const rawMove = {
      color: move.color,
      from: move.from,
      to: move.to,
      piece: move.piece,
      captured: move.captured,
      promotion: move.promotion,
      flags: move.flags
    };

    (this.game as any)._makeMove(rawMove);
    return {
      move,
      prevData: null
    };
  }

  undoMove(undo: BoardUndoState): void {
    (this.game as any)._undoMove();
  }

  isInCheck(color?: Color): boolean {
    if (color && color !== this.game.turn()) {
      return (this.game as any)._isKingAttacked(color);
    }
    return this.game.inCheck();
  }

  isSquareAttacked(square0x88: number, byColor: Color): boolean {
    return (this.game as any)._isAttacked(square0x88, byColor);
  }

  isGameOver(): boolean {
    return this.game.isGameOver();
  }

  isCheckmate(): boolean {
    return this.game.isCheckmate();
  }

  isDraw(): boolean {
    return this.game.isDraw();
  }

  board(): (BoardPiece | null)[][] {
    const b = this.game.board();
    const res: (BoardPiece | null)[][] = [];
    for (let r = 0; r < 8; r++) {
      const row: (BoardPiece | null)[] = [];
      for (let f = 0; f < 8; f++) {
        const p = b[r][f];
        if (p) {
          row.push({ type: p.type as PieceSymbol, color: p.color as Color });
        } else {
          row.push(null);
        }
      }
      res.push(row);
    }
    return res;
  }

  evaluate(): number {
    // Dynamic import / require or direct call to evaluateBoard
    return (this.game as any).__cachedEval !== undefined ? (this.game as any).__cachedEval : 0;
  }

  clone(): BoardBackend {
    return new ChessJsBackend(new Chess(this.game.fen()));
  }
}
