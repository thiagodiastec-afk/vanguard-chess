import { Chess } from 'chess.js';
import { calculateBestMove, metrics, evaluateBoard } from './src/lib/engine';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';
import { computeZobristHash } from './src/lib/zobrist';

console.log('=== EVALUATION REPETITION & CACHE AUDIT ===\n');

// Wrap evaluateBoard to measure Zobrist repetition
const evalCalls: number[] = [];
let totalEvals = 0;
const uniqueHashes = new Set<number>();
const hashCounts = new Map<number, number>();

// Hook evaluateBoard
const origEval = evaluateBoard;

for (let p = 0; p < 10; p++) {
  const pos = SANITIZED_BENCHMARK_POSITIONS[p];
  const g = new Chess(pos.fen);

  uniqueHashes.clear();
  hashCounts.clear();
  totalEvals = 0;

  // Instrument countMobility or evaluateBoard
  calculateBestMove(g, 'dificil', { maxTimeMs: 2500 });
}
