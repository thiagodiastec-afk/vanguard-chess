import { Chess } from 'chess.js';
import { countMobility, evaluateBoard, calculateBestMove, metrics } from './src/lib/engine';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';
import { computeZobristHash } from './src/lib/zobrist';

console.log('=== AUDIT MOBILITY COST & POTENTIAL OPTIMIZATIONS ===\n');

// 1. Measure cost of evaluateBoard with vs without mobility
const testFens = [
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4',
  'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5',
  '2r3k1/1p3ppp/p3p3/3p4/P7/1P3P2/2r3PP/R4RK1 w - - 0 25',
  '8/8/4k3/8/8/8/4P3/4K3 w - - 0 1'
];

console.log('--- 1. CUSTO DE EVALUATEBOARD: TOTAL vs MOBILITY ---');

for (const fen of testFens) {
  const g = new Chess(fen);

  // Warmup
  for (let i = 0; i < 500; i++) evaluateBoard(g);

  // Timing without mobility (bonusPerMove = 0)
  const N = 5000;

  const startMobOnly = performance.now();
  for (let i = 0; i < N; i++) {
    countMobility(g, 'w');
    countMobility(g, 'b');
  }
  const timeMobOnly = performance.now() - startMobOnly;

  const startFull = performance.now();
  for (let i = 0; i < N; i++) {
    evaluateBoard(g);
  }
  const timeFull = performance.now() - startFull;

  const mobPerCallUs = (timeMobOnly / N) * 1000;
  const fullPerCallUs = (timeFull / N) * 1000;
  const mobPercent = (timeMobOnly / timeFull) * 100;

  console.log(`FEN: ${fen.slice(0, 35)}...`);
  console.log(`  Full evaluateBoard: ${fullPerCallUs.toFixed(2)} µs/call`);
  console.log(`  countMobility (W+B): ${mobPerCallUs.toFixed(2)} µs/call (${mobPercent.toFixed(1)}% of total eval)\n`);
}

// 2. Measure cache potential during actual search on 10 benchmark positions
console.log('--- 2. MOBILITY CACHE POTENTIAL (Zobrist-based) DURING SEARCH ---');

const cacheHits = new Map<number, number>();
let totalEvals = 0;
let uniquePositions = 0;

// Simple probe test
const samplePositions = SANITIZED_BENCHMARK_POSITIONS.slice(0, 10);

for (const pos of samplePositions) {
  const g = new Chess(pos.fen);
  calculateBestMove(g, 'dificil', { maxTimeMs: 2000 });
}

console.log('Done preliminary search.\n');
