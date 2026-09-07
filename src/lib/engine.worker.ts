import { Chess } from 'chess.js';
import { calculateBestMove, evaluateBoard, minimax } from './engine';

self.onmessage = (e: MessageEvent) => {
  const { type, fen, difficulty, pgn } = e.data;
  
  if (type === 'search') {
    const game = new Chess(fen);
    const bestMove = calculateBestMove(game, difficulty);
    self.postMessage({ type: 'search_result', bestMove });
  } 
  else if (type === 'analyze') {
    const game = new Chess();
    game.loadPgn(pgn);
    const history = game.history({ verbose: true });
    
    // We will evaluate the game move by move
    const tempGame = new Chess();
    const evaluationTimeline = [];
    const moveClassifications = [];
    let lastEval = evaluateBoard(tempGame);
    evaluationTimeline.push(lastEval);

    for (let i = 0; i < history.length; i++) {
      const move = history[i];
      const isWhite = i % 2 === 0;
      
      tempGame.move(move);
      let currentEval = minimax(tempGame, 2, -Infinity, Infinity, tempGame.turn() === 'w');
      // If checkmate
      if (tempGame.isCheckmate()) {
        currentEval = isWhite ? 20000 : -20000;
      }
      
      evaluationTimeline.push(currentEval);
      
      // Calculate diff from the perspective of the player who just moved
      // If white moved, they want currentEval to be higher than lastEval
      // If black moved, they want currentEval to be lower than lastEval
      let diff = 0;
      if (isWhite) {
        diff = currentEval - lastEval;
      } else {
        diff = lastEval - currentEval;
      }
      
      let classification = 'good'; // best, good, inaccuracy, mistake, blunder
      if (diff < -300) classification = 'blunder';
      else if (diff < -150) classification = 'mistake';
      else if (diff < -50) classification = 'inaccuracy';
      else if (diff > 200) classification = 'great';
      else classification = 'good';
      
      moveClassifications.push({
        san: move.san,
        color: move.color,
        classification,
        eval: currentEval,
        diff
      });
      
      lastEval = currentEval;
    }
    
    self.postMessage({ type: 'analyze_result', evaluationTimeline, moveClassifications });
  }
};
