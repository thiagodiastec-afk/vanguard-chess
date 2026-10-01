import { Chess } from 'chess.js';
import { calculateBestMove, evaluateBoard, minimax } from './engine';

self.onmessage = (e: MessageEvent) => {
  const { type, fen, difficulty, pgn, maxTimeMs } = e.data;
  
  if (type === 'search') {
    const game = new Chess(fen);
    if (difficulty === 'dificil' || difficulty === 'profissional') {
      const skillLevel = difficulty === 'dificil' ? 12 : 20;
      const searchTimeMs = maxTimeMs ?? 3000;
      let stockfish: Worker | null = null;
      let finished = false;

      const finish = (move: string | null) => {
        if (finished) return;
        finished = true;
        clearTimeout(watchdog);
        stockfish?.terminate();
        self.postMessage({ type: 'search_result', bestMove: move });
      };

      const useFallback = () => {
        try {
          finish(calculateBestMove(game, difficulty, { maxTimeMs: searchTimeMs }));
        } catch {
          finish(null);
        }
      };

      const watchdog = setTimeout(useFallback, searchTimeMs + 10000);
      try {
        // These static files are shipped from the existing stockfish.js dependency.
        // The engine runs off the UI thread and is GPL-3.0; its license is in /licenses.
        const worker = new Worker('/stockfish.wasm.js');
        stockfish = worker;
        worker.onerror = useFallback;
        worker.onmessage = (engineEvent: MessageEvent<string>) => {
          const line = String(engineEvent.data);
          if (line === 'uciok') {
            worker.postMessage(`setoption name Skill Level value ${skillLevel}`);
            worker.postMessage('isready');
          } else if (line === 'readyok') {
            worker.postMessage(`position fen ${fen}`);
            worker.postMessage(`go movetime ${searchTimeMs}`);
          } else if (line.startsWith('bestmove ')) {
            const match = line.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/);
            if (!match) {
              finish(null);
              return;
            }
            try {
              const move = game.move({
                from: match[1],
                to: match[2],
                promotion: match[3] ?? 'q'
              });
              finish(move?.san ?? null);
            } catch {
              finish(null);
            }
          }
        };
        worker.postMessage('uci');
      } catch {
        useFallback();
      }
      return;
    }

    const bestMove = calculateBestMove(game, difficulty, { maxTimeMs });
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
