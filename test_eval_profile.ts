import { Chess } from 'chess.js';
import { calculateBestMove, metrics, evaluateBoard } from './src/lib/engine';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';
import { computeZobristHash } from './src/lib/zobrist';

console.log('=== INVESTIGAÇÃO DE CACHE DE MOBILIDADE / AVALIAÇÃO ===\n');

// Measure for 10 benchmark positions
let totalEvalCalls = 0;
let cacheHits = 0;
const evalCache = new Map<number, number>();

// Intercept evaluateBoard
let inSearch = false;

for (let i = 0; i < 15; i++) {
  const pos = SANITIZED_BENCHMARK_POSITIONS[i];
  const g = new Chess(pos.fen);

  evalCache.clear();
  totalEvalCalls = 0;
  cacheHits = 0;

  const start = performance.now();
  calculateBestMove(g, 'dificil', { maxTimeMs: 2500 });
  const time = performance.now() - start;

  console.log(`[${pos.id}] Time: ${time.toFixed(1)}ms | Nodes: ${metrics.nodes} | QNodes: ${metrics.quiescenceNodes}`);
}
