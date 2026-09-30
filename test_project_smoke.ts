import { Chess } from 'chess.js';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';
import { calculateBestMove, setExecutionMode } from './src/lib/engine';

const SEARCH_BUDGET_MS = 250;
const MAX_CASE_MS = 1000;
const durationsMs: number[] = [];
const failures: string[] = [];

setExecutionMode('BITBOARD_ONLY');
console.log(`Project smoke test: ${SANITIZED_BENCHMARK_POSITIONS.length} positions, ${SEARCH_BUDGET_MS} ms search budget each`);

for (const position of SANITIZED_BENCHMARK_POSITIONS) {
  const game = new Chess(position.fen);
  const start = performance.now();
  try {
    const san = calculateBestMove(game, 'dificil', { maxTimeMs: SEARCH_BUDGET_MS });
    const elapsedMs = performance.now() - start;
    durationsMs.push(elapsedMs);

    if (elapsedMs > MAX_CASE_MS) {
      failures.push(`${position.id}: exceeded case limit (${elapsedMs.toFixed(1)} ms)`);
      continue;
    }
    if (!san) {
      failures.push(`${position.id}: engine returned no move`);
      continue;
    }

    try {
      game.move(san);
    } catch {
      failures.push(`${position.id}: engine returned illegal move ${san}`);
    }
  } catch (error) {
    failures.push(`${position.id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const sortedDurations = [...durationsMs].sort((a, b) => a - b);
const medianMs = sortedDurations.length
  ? sortedDurations[Math.floor(sortedDurations.length / 2)]
  : 0;
const maxMs = sortedDurations.length ? sortedDurations[sortedDurations.length - 1] : 0;

console.log(`Legal moves: ${SANITIZED_BENCHMARK_POSITIONS.length - failures.length}/${SANITIZED_BENCHMARK_POSITIONS.length}`);
console.log(`Search time median/max: ${medianMs.toFixed(1)} / ${maxMs.toFixed(1)} ms`);

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exitCode = 1;
} else {
  console.log('PROJECT SMOKE TEST: PASS');
}
