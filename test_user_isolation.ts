import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';
import { calculateBestMove, kingTropismConfig, metrics, evaluateBoard } from './src/lib/engine';
import { Chess } from 'chess.js';

kingTropismConfig.enabled = true;

const p = SANITIZED_BENCHMARK_POSITIONS[0];

function run(label: string) {
  const start = Date.now();
  const game = new Chess(p.fen);

  const bestMove = calculateBestMove(
    game,
    'dificil',
    { maxTimeMs: 3000 }
  );

  const elapsed = Date.now() - start;

  const result = {
    elapsedMs: elapsed,
    bestMove,
    score: evaluateBoard(new Chess(p.fen)),
    depth: metrics.lastCompletedDepth,
    nodes: metrics.nodes,
    qNodes: metrics.quiescenceNodes,
  };

  console.log(label, result);
  return result;
}

console.log('=== STATE ISOLATION SINGLE POSITION ===');

const a = run('RUN 1');
const b = run('RUN 2');
const c = run('RUN 3');

console.log('\n=== COMPARISON ===');

console.log('bestMove:', a.bestMove === b.bestMove && b.bestMove === c.bestMove ? 'PASS' : 'FAIL');
console.log('score:', a.score === b.score && b.score === c.score ? 'PASS' : 'FAIL');
console.log('depth:', a.depth === b.depth && b.depth === c.depth ? 'PASS' : 'FAIL');
console.log('nodes:', a.nodes === b.nodes && b.nodes === c.nodes ? 'PASS' : 'FAIL');
console.log('qNodes:', a.qNodes === b.qNodes && b.qNodes === c.qNodes ? 'PASS' : 'FAIL');

console.log('\n=== RESULTS ===');
console.log({ a, b, c });
