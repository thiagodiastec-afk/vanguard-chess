import { Chess } from 'chess.js';
import { calculateBestMove } from './src/lib/engine';

const posA = 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4';
const posB = '7k/R7/5N2/8/8/8/8/4K3 w - - 0 1';
const posC = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';

function runSeq(seq: string[]) {
  console.log(`Running sequence: ${seq.join(' -> ')}`);
  for (const name of seq) {
    let fen = '';
    if (name === 'A') fen = posA;
    if (name === 'B') fen = posB;
    if (name === 'C') fen = posC;

    const game = new Chess(fen);
    const start = performance.now();
    const bestMove = calculateBestMove(game, 'dificil'); // depth 3
    console.log(`  ${name}: ${bestMove} (time: ${(performance.now() - start).toFixed(2)}ms)`);
  }
}

runSeq(['A', 'B', 'C']);
runSeq(['C', 'A', 'B']);
runSeq(['B', 'C', 'A']);
