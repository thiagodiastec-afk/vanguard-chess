import { Chess } from 'chess.js';
import { evaluateBoard } from './src/lib/engine.ts';
import { evaluateBreakdown } from './src/lib/auditBreakdown.ts';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions.ts';

console.log('=== TESTE DE RECONSTRUÇÃO EXATA DO TOTAL (ETAPA 2) ===\n');

let passCount = 0;
let failCount = 0;

for (let i = 0; i < SANITIZED_BENCHMARK_POSITIONS.length; i++) {
  const pos = SANITIZED_BENCHMARK_POSITIONS[i];
  const game = new Chess(pos.fen);

  const realScore = evaluateBoard(game);
  const breakdown = evaluateBreakdown(game);

  if (realScore === breakdown.total) {
    passCount++;
  } else {
    failCount++;
    console.error(`[MISMATCH] ${pos.id}: real=${realScore}, breakdown=${breakdown.total}, delta=${realScore - breakdown.total}`);
  }
}

console.log(`Reconstrução nas 68 posições oficiais do benchmark:`);
console.log(`PASS: ${passCount} / 68`);
console.log(`FAIL: ${failCount} / 68`);

if (failCount === 0) {
  console.log('\nRECONSTRUCTION: PASS (Tolerância ZERO em 68/68 posições)');
} else {
  process.exit(1);
}
