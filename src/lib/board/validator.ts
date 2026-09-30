/**
 * FASE 5.9 — VALIDADOR DUAL (DUAL VALIDATOR / ORACLE CONFORMANCE)
 *
 * Executa operações em ambos os backends (Bitboard e Chess.js)
 * e compara rigorosamente os resultados para conformidade exata.
 */

import { Chess } from 'chess.js';
import { BoardBackend, EngineMove } from './types';
import { ChessJsBackend } from './chessJsBackend';
import { BitboardBackend } from './bitboardBackend';
import { ox88ToName } from './mapping';

export interface MismatchReport {
  fen: string;
  side: string;
  operation: string;
  bitboard: string[];
  chessjs: string[];
  missing: string[];
  extra: string[];
  bitboardFen?: string;
  chessjsFen?: string;
  move?: string;
}

export function formatMoveCanonical(m: EngineMove): string {
  const fromStr = ox88ToName(m.from);
  const toStr = ox88ToName(m.to);
  const promo = m.promotion ? m.promotion.toLowerCase() : '';
  return `${fromStr}${toStr}${promo}`;
}

export class DualValidator {
  static validateMoves(fen: string): { ok: boolean; report?: MismatchReport } {
    const bb = new BitboardBackend(fen);
    const cb = new ChessJsBackend(fen);

    const bbMoves = bb.generateLegalMoves().map(formatMoveCanonical).sort();
    const cbMoves = cb.generateLegalMoves().map(formatMoveCanonical).sort();

    const bbSet = new Set(bbMoves);
    const cbSet = new Set(cbMoves);

    const missing = cbMoves.filter(m => !bbSet.has(m));
    const extra = bbMoves.filter(m => !cbSet.has(m));

    if (missing.length > 0 || extra.length > 0) {
      return {
        ok: false,
        report: {
          fen,
          side: bb.getTurn(),
          operation: 'generateLegalMoves',
          bitboard: bbMoves,
          chessjs: cbMoves,
          missing,
          extra
        }
      };
    }

    return { ok: true };
  }

  static validateMakeMove(fen: string, moveCanonical: string): { ok: boolean; report?: MismatchReport } {
    const bb = new BitboardBackend(fen);
    const cb = new ChessJsBackend(fen);

    const bbMoves = bb.generateLegalMoves();
    const cbMoves = cb.generateLegalMoves();

    const bbM = bbMoves.find(m => formatMoveCanonical(m) === moveCanonical);
    const cbM = cbMoves.find(m => formatMoveCanonical(m) === moveCanonical);

    if (!bbM || !cbM) {
      return {
        ok: false,
        report: {
          fen,
          side: bb.getTurn(),
          operation: 'makeMove_moveNotFound',
          bitboard: bbMoves.map(formatMoveCanonical),
          chessjs: cbMoves.map(formatMoveCanonical),
          missing: !bbM ? [moveCanonical] : [],
          extra: !cbM ? [moveCanonical] : [],
          move: moveCanonical
        }
      };
    }

    const bbUndo = bb.makeMove(bbM);
    const cbUndo = cb.makeMove(cbM);

    const bbFen = bb.getFEN({ forceEnpassantSquare: true });
    const cbFen = cb.getFEN({ forceEnpassantSquare: true });

    // Normalizar FENs para comparação semântica
    // Comparar: [0] placement, [1] turn, [2] castling, [3] ep
    const bbParts = bbFen.split(' ');
    const cbParts = cbFen.split(' ');

    const placementEqual = bbParts[0] === cbParts[0];
    const turnEqual = bbParts[1] === cbParts[1];
    const castlingEqual = bbParts[2] === cbParts[2];
    const epEqual = bbParts[3] === cbParts[3];

    if (!placementEqual || !turnEqual || !castlingEqual || !epEqual) {
      return {
        ok: false,
        report: {
          fen,
          side: bbParts[1],
          operation: 'makeMove_fenMismatch',
          bitboard: [bbFen],
          chessjs: [cbFen],
          missing: [],
          extra: [],
          bitboardFen: bbFen,
          chessjsFen: cbFen,
          move: moveCanonical
        }
      };
    }

    // Testar Undo
    bb.undoMove(bbUndo);
    cb.undoMove(cbUndo);

    const restoredBbFen = bb.getFEN({ forceEnpassantSquare: true });
    const restoredCbFen = cb.getFEN({ forceEnpassantSquare: true });

    if (restoredBbFen.split(' ')[0] !== fen.split(' ')[0] || restoredBbFen.split(' ')[1] !== fen.split(' ')[1]) {
      return {
        ok: false,
        report: {
          fen,
          side: fen.split(' ')[1],
          operation: 'undoMove_fenMismatch',
          bitboard: [restoredBbFen],
          chessjs: [restoredCbFen],
          missing: [],
          extra: [],
          bitboardFen: restoredBbFen,
          chessjsFen: restoredCbFen,
          move: moveCanonical
        }
      };
    }

    return { ok: true };
  }
}
