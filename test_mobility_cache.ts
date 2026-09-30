import { Chess } from 'chess.js';
import { calculateBestMove, metrics, evaluateBoard, countMobility } from './src/lib/engine';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';
import { computeZobristHash } from './src/lib/zobrist';

console.log('=== TESTE DE MOBILITY CACHE (ZOBRIST-INDEXED) ===\n');

// Fixed-size direct-mapped cache (power of 2, e.g. 65536 entries)
const CACHE_SIZE = 65536; // 64K entries = ~512 KB RAM
const CACHE_MASK = CACHE_SIZE - 1;

const cacheKey = new Float64Array(CACHE_SIZE); // stores full 53-bit hash
const cacheWhiteMob = new Int8Array(CACHE_SIZE);
const cacheBlackMob = new Int8Array(CACHE_SIZE);

// Initialize with sentinel -1
cacheKey.fill(-1);

let totalMobCalls = 0;
let cacheHits = 0;
let cacheMisses = 0;

function getCachedMobility(game: Chess): { whiteMob: number; blackMob: number } {
  totalMobCalls++;
  const hash = computeZobristHash(game);
  const idx = (hash ^ (hash >>> 16)) & CACHE_MASK;

  if (cacheKey[idx] === hash) {
    cacheHits++;
    return { whiteMob: cacheWhiteMob[idx], blackMob: cacheBlackMob[idx] };
  }

  cacheMisses++;
  const whiteMob = countMobility(game, 'w');
  const blackMob = countMobility(game, 'b');

  cacheKey[idx] = hash;
  cacheWhiteMob[idx] = whiteMob;
  cacheBlackMob[idx] = blackMob;

  return { whiteMob, blackMob };
}

// Test on 10 benchmark positions
for (let i = 0; i < 10; i++) {
  const p = SANITIZED_BENCHMARK_POSITIONS[i];
  const g = new Chess(p.fen);

  // Clear cache between independent benchmark runs
  cacheKey.fill(-1);
  const startCalls = totalMobCalls;
  const startHits = cacheHits;

  const start = performance.now();
  calculateBestMove(g, 'dificil', { maxTimeMs: 2500 });
  const time = performance.now() - start;

  console.log(`[${p.id}] Time: ${time.toFixed(1)}ms | Nodes: ${metrics.nodes} | QNodes: ${metrics.quiescenceNodes}`);
}
