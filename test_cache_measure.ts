import { Chess } from 'chess.js';
import { calculateBestMove, metrics, evaluateBoard } from './src/lib/engine';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';
import { computeZobristHash } from './src/lib/zobrist';

console.log('=== TESTE DE HIT RATE DE MOBILITY CACHE ===\n');

const CACHE_SIZE = 65536;
const CACHE_MASK = CACHE_SIZE - 1;
const cacheKey = new Float64Array(CACHE_SIZE);
const cacheWhite = new Int8Array(CACHE_SIZE);
const cacheBlack = new Int8Array(CACHE_SIZE);
cacheKey.fill(-1);

let totalCalls = 0;
let cacheHits = 0;

// Test on first 10 positions
for (let i = 0; i < 10; i++) {
  const p = SANITIZED_BENCHMARK_POSITIONS[i];
  const g = new Chess(p.fen);

  const startCalls = totalCalls;
  const startHits = cacheHits;

  calculateBestMove(g, 'dificil', { maxTimeMs: 2500 });

  const calls = totalCalls - startCalls;
  const hits = cacheHits - startHits;
  const hitRate = calls > 0 ? ((hits / calls) * 100).toFixed(1) : '0';
  console.log(`[${p.id}] Calls: ${calls}, Hits: ${hits} (${hitRate}%)`);
}
