import { Chess } from 'chess.js';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';
import { calculateBestMove, evaluateBoard, minimax, setExecutionMode } from './src/lib/engine';

const SEARCH_BUDGET_MS = 250;
const CASE_LIMIT_MS = 1000;
let checks = 0;
const failures: string[] = [];

function check(condition: boolean, description: string): void {
  checks++;
  if (!condition) failures.push(description);
}

console.log('Vanguard Chess bounded validation suite');
setExecutionMode('BITBOARD_ONLY');

// Terminal handling and evaluation sanity.
const stalemate = new Chess('k7/8/1K6/8/8/8/8/8 b - - 0 1');
check(minimax(stalemate, 2, -Infinity, Infinity, false) === 0, 'stalemate score must be zero');

const materialScores = [
  'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  'rnbqkbnr/pppppppp/8/8/8/8/1PPPPPPP/RNBQKBNR w KQkq - 0 1'
].map(fen => evaluateBoard(new Chess(fen)));
check(materialScores[0] > materialScores[1], 'white material advantage should score above equality');
check(materialScores[1] > materialScores[2], 'white material deficit should score below equality');

// Determinism remains checked with an explicit time budget.
const deterministicFen = 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4';
const deterministicMoves: string[] = [];
for (let run = 0; run < 3; run++) {
  const game = new Chess(deterministicFen);
  const move = calculateBestMove(game, 'dificil', { maxTimeMs: SEARCH_BUDGET_MS });
  check(move !== null, `determinism run ${run + 1} must return a move`);
  deterministicMoves.push(move ?? '');
}
check(deterministicMoves.every(move => move === deterministicMoves[0]), 'bounded search must be deterministic');

// Official positions use a short bounded search; full-strength analysis is a separate command.
for (const position of SANITIZED_BENCHMARK_POSITIONS) {
  const game = new Chess(position.fen);
  const startedAt = performance.now();
  const san = calculateBestMove(game, 'dificil', { maxTimeMs: SEARCH_BUDGET_MS });
  const elapsedMs = performance.now() - startedAt;
  check(elapsedMs <= CASE_LIMIT_MS, `${position.id} exceeded ${CASE_LIMIT_MS} ms (${elapsedMs.toFixed(1)} ms)`);
  if (!san) {
    check(false, `${position.id} did not produce a move`);
    continue;
  }
  try {
    game.move(san);
    check(true, `${position.id} returned a legal move`);
  } catch {
    check(false, `${position.id} returned illegal move ${san}`);
  }
}

console.log(`Official positions: ${SANITIZED_BENCHMARK_POSITIONS.length}`);
console.log(`Checks: ${checks - failures.length}/${checks} passed`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exitCode = 1;
} else {
  console.log('ALL BOUNDED VALIDATION CHECKS PASSED');
}
