import { Chess } from 'chess.js';
import { calculateBestMove, metrics, tt } from './src/lib/engine.ts';

const game = new Chess(); // Start position
console.log('Calculating best move at Depth 4...');
const move = calculateBestMove(game, 'depth4');
console.log(`Best Move: ${move}`);
console.log(`Iterations Completed: ${metrics.iterationsCompleted}`);
console.log(`Last Completed Depth: ${metrics.lastCompletedDepth}`);
console.log(`Timeouts: ${metrics.timeoutDuringIteration}`);
console.log(`TT Hits: ${tt.hits}`);
