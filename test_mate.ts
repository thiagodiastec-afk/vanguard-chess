import { Chess } from 'chess.js';
import { calculateBestMove, minimax } from './src/lib/engine';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';

console.log('Testing MATE_IN_1 and MATE_IN_2 positions after engine patch...\n');

const matePositions = SANITIZED_BENCHMARK_POSITIONS.filter(
  p => p.category === 'MATE_IN_1' || p.category === 'MATE_IN_2'
);

let passedCount = 0;

for (const pos of matePositions) {
  const game = new Chess(pos.fen);
  const start = performance.now();
  const bestMove = calculateBestMove(game, 'dificil');
  const elapsed = (performance.now() - start).toFixed(2);

  const allowedMoves = [
    ...(pos.expectedBestMove ? [pos.expectedBestMove] : []),
    ...(pos.alternativeBestMoves || [])
  ];

  const cleanBest = bestMove ? bestMove.replace(/[+#x]/g, '') : '';
  let matched = allowedMoves.some(m => {
    const cleanAllowed = m.replace(/[+#x]/g, '');
    return m === bestMove || cleanAllowed === cleanBest;
  });

  let isCheckmate = false;
  if (bestMove) {
    const testGame = new Chess(pos.fen);
    try {
      testGame.move(bestMove);
      if (testGame.isCheckmate()) {
        isCheckmate = true;
        if (pos.category === 'MATE_IN_1') {
          matched = true;
        }
      }
    } catch {}
  }

  const status = matched ? 'PASS' : 'FAIL';
  if (matched) passedCount++;

  console.log(`[${status}] ${pos.id} (${pos.category})`);
  console.log(`   FEN: ${pos.fen}`);
  console.log(`   Expected: ${allowedMoves.join(' / ')} | Actual: ${bestMove} | IsMate: ${isCheckmate} | Time: ${elapsed}ms\n`);
}

console.log(`Total: ${passedCount}/${matePositions.length}`);
