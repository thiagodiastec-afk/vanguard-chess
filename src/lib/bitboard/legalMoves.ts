/**
 * FASE 5.8 — GERADOR DE MOVIMENTOS LEGAIS BITBOARD
 *
 * Validação de legalidade estrita baseada no protótipo Bitboard:
 * - Gera lances pseudo-legais
 * - Valida que o próprio rei não fica em xeque após makeMove / undoMove
 * - Retorna apenas lances estritamente legais
 */

import { BitboardBoard, Color } from './types';
import { RawMove } from './moveTypes';
import { generatePseudoLegalMoves } from './moveGenerator';
import { makeMove } from './makeMove';
import { undoMove } from './undoMove';
import { isInCheck } from './checks';

export function generateLegalMoves(board: BitboardBoard): RawMove[] {
  const pseudoMoves = generatePseudoLegalMoves(board);
  const legalMoves: RawMove[] = [];
  const us: Color = board.sideToMove;

  for (let i = 0; i < pseudoMoves.length; i++) {
    const m = pseudoMoves[i];
    const undo = makeMove(board, m);
    const kingAttacked = isInCheck(board, us);
    undoMove(board, undo);

    if (!kingAttacked) {
      legalMoves.push(m);
    }
  }

  return legalMoves;
}
