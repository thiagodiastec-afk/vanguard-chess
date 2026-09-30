import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { calculateBestMove, setExecutionMode } from './src/lib/engine';

const fen = 'r1bqk2r/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w kq - 4 8';
const game = new Chess(fen);
const legalMoves = new Set(game.moves());
const proto = Chess.prototype as any;
const originals = {
  board: proto.board,
  make: proto._makeMove,
  undo: proto._undoMove,
  san: proto._moveToSan
};
const residualCalls = { computeZobristHash: 0, makeMove: 0, undoMove: 0 };
let insideSearch = true;
let sanFormattingCalls = 0;

proto.board = function (...args: unknown[]) {
  if (insideSearch) residualCalls.computeZobristHash++;
  return originals.board.apply(this, args);
};
proto._makeMove = function (...args: unknown[]) {
  if (insideSearch) residualCalls.makeMove++;
  return originals.make.apply(this, args);
};
proto._undoMove = function (...args: unknown[]) {
  if (insideSearch) residualCalls.undoMove++;
  return originals.undo.apply(this, args);
};
proto._moveToSan = function (...args: unknown[]) {
  insideSearch = false;
  sanFormattingCalls++;
  try { return originals.san.apply(this, args); }
  finally { insideSearch = true; }
};

let move: string | null = null;
try {
  setExecutionMode('BITBOARD_ONLY');
  move = calculateBestMove(game, 'dificil', { maxTimeMs: 250 });
} finally {
  proto.board = originals.board;
  proto._makeMove = originals.make;
  proto._undoMove = originals.undo;
  proto._moveToSan = originals.san;
}

assert.ok(move, 'BITBOARD_ONLY should return a legal move');
assert.ok(legalMoves.has(move!), `Engine returned an illegal move: ${move}`);
assert.equal(game.fen(), fen, 'BITBOARD_ONLY search must preserve the caller position');
console.log(`residual counters: ${JSON.stringify(residualCalls)}`);
assert.deepEqual(residualCalls, { computeZobristHash: 0, makeMove: 0, undoMove: 0 });
assert.equal(sanFormattingCalls, 1, 'The selected move should be formatted as SAN once after search');

console.log('BITBOARD_ONLY residual-call audit: PASS');
console.log(`computeZobristHash(game), during search: ${residualCalls.computeZobristHash}`);
console.log(`Chess.prototype._makeMove, during search: ${residualCalls.makeMove}`);
console.log(`Chess.prototype._undoMove, during search: ${residualCalls.undoMove}`);
console.log(`Chess.prototype._moveToSan, after search: ${sanFormattingCalls}`);
console.log(`Returned move: ${move}`);
