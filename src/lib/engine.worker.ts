import { Chess } from 'chess.js';
import { calculateBestMove } from './engine';

self.onmessage = (e: MessageEvent) => {
  const { fen, difficulty } = e.data;
  
  const game = new Chess(fen);
  const bestMove = calculateBestMove(game, difficulty);
  
  self.postMessage({ bestMove });
};