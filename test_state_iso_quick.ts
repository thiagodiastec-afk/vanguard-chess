import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';
import { calculateBestMove, kingTropismConfig } from './src/lib/engine';
import { Chess } from 'chess.js';

kingTropismConfig.enabled = true;

// Use 3 positions that complete well below timeout (e.g. 50-300ms)
const posA = SANITIZED_BENCHMARK_POSITIONS[1]; // mate1_02_back_rank_white (~280ms)
const posB = SANITIZED_BENCHMARK_POSITIONS[2]; // mate1_03_back_rank_black (~270ms)
const posC = SANITIZED_BENCHMARK_POSITIONS[3]; // mate1_04_smothered_mate_w (~95ms)

function runOrder(order: any[]) {
  return order.map(p => calculateBestMove(new Chess(p.fen), 'dificil', { maxTimeMs: 5000 }));
}

const o1 = runOrder([posA, posB, posC]);
console.log('Order 1 (A, B, C):', o1);
const o2 = runOrder([posB, posC, posA]);
console.log('Order 2 (B, C, A):', o2);
const o3 = runOrder([posC, posA, posB]);
console.log('Order 3 (C, A, B):', o3);

const matchA = o1[0] === o2[2] && o1[0] === o3[1];
const matchB = o1[1] === o2[0] && o1[1] === o3[2];
const matchC = o1[2] === o2[1] && o1[2] === o3[0];

console.log('Match A:', matchA, `(${o1[0]})`);
console.log('Match B:', matchB, `(${o1[1]})`);
console.log('Match C:', matchC, `(${o1[2]})`);

const pass = matchA && matchB && matchC;
console.log('State Isolation Result:', pass ? 'PASS' : 'FAIL');
