import { Chess } from 'chess.js';
import { calculateBestMove } from './src/lib/engine';

const game = new Chess();
console.log('Starting benchmark depth 3...');
let start = Date.now();
calculateBestMove(game, 'dificil'); // depth 3
console.log('Depth 3 took: ', Date.now() - start, 'ms');

console.log('Starting benchmark depth 4...');
start = Date.now();
calculateBestMove(game, 'profissional'); // depth 4
console.log('Depth 4 took: ', Date.now() - start, 'ms');
