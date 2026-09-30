import { Chess } from 'chess.js';
import { evaluateBoard } from '../../engine.ts';

export function getEvaluation(fen: string): number {
  const game = new Chess(fen);
  return evaluateBoard(game);
}

export function getPieceValueAt(fen: string, square: string): number {
  const game = new Chess(fen);
  const piece = game.get(square as any);
  // This is hard to do without duplicating the evaluateBoard internal piece values,
  // but we can deduce it by removing the piece and getting the delta.
  const evalWith = evaluateBoard(game);
  game.remove(square as any);
  const evalWithout = evaluateBoard(game);
  return evalWith - evalWithout;
}
