import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { useTheme } from '../lib/themes';
import { sounds } from '../lib/sounds';
import { Chessboard } from 'react-chessboard';
import confetti from 'canvas-confetti';
import { Flag, ChevronLeft, RefreshCcw, MonitorPlay, FlipVertical, Lightbulb } from 'lucide-react';
import { cn } from '../lib/utils';
import { customPieces } from '../lib/chessPieces';
import MoveHistory from './MoveHistory';
import CapturedPieces from './CapturedPieces';
import EvalBar from "./EvalBar";

interface LocalGameProps {
  onExit: () => void;
}

export default function LocalGame({ onExit }: LocalGameProps) {
  const theme = useTheme();
  const [game, setGame] = useState(new Chess());
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const [hintArrow, setHintArrow] = useState<[string, string] | null>(null);
  const [isGettingHint, setIsGettingHint] = useState(false);

  const handleHint = () => {
    if (game.isGameOver() || isGettingHint) return;
    setIsGettingHint(true);
    
    import('../lib/engine.worker?worker').then((WorkerModule) => {
      const worker = new WorkerModule.default();
      worker.onmessage = (e) => {
        const { bestMove } = e.data;
        if (bestMove) {
          const from = bestMove.substring(0, 2);
          const to = bestMove.substring(2, 4);
          setHintArrow([from, to]);
        }
        setIsGettingHint(false);
        worker.terminate();
      };
      worker.postMessage({ type: 'search', fen: game.fen(), difficulty: 'dificil' });
    });
  };

  const moveHighlights = useMemo(() => {
    const history = game.history({ verbose: true });
    const highlights: Record<string, React.CSSProperties> = {};
    
    if (history.length > 0) {
      const lastMove = history[history.length - 1] as any;
      const isCapture = lastMove.captured != null;
      const captureColor = 'rgba(239, 68, 68, 0.5)';
      const normalColor = 'rgba(234, 179, 8, 0.4)';

      highlights[lastMove.from] = { backgroundColor: normalColor };
      highlights[lastMove.to] = { 
        backgroundColor: isCapture ? captureColor : normalColor, 
        transform: isCapture ? 'scale(1.05)' : 'none',
        boxShadow: isCapture ? 'inset 0 0 15px rgba(239, 68, 68, 0.8)' : 'none'
      };
    }

    if (game.isCheck()) {
      const turn = game.turn();
      const board = game.board();
      let kingSquare = '';
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          if (board[i][j]?.type === 'k' && board[i][j]?.color === turn) {
            kingSquare = String.fromCharCode(97 + j) + (8 - i);
            break;
          }
        }
      }
      if (kingSquare) {
        highlights[kingSquare] = {
          background: 'radial-gradient(circle, rgba(239,68,68,0.8) 0%, rgba(239,68,68,0) 100%)',
          animation: 'pulse 1.5s infinite'
        };
      }
    }
    
    return highlights;
  }, [game]);

  useEffect(() => {
    if (game.isGameOver()) {
      setGameOver(true);
      if (game.isCheckmate()) {
        const winningColor = game.turn() === 'w' ? 'b' : 'w';
        setWinner(winningColor === 'w' ? 'Brancas venceram!' : 'Pretas venceram!');
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        sounds.playMove(false, false);
      } else if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition()) {
        setWinner('Empate!');
        sounds.playMove(false, false);
      }
    }
  }, [game]);

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    if (gameOver) return false;

    try {
      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn());
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move) {
        setGame(gameCopy);
        sounds.playMove(move.captured != null, game.inCheck());
        setMoveFrom(null);
        setHintArrow(null);
        setOptionSquares({});
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  };

  const getMoveOptions = (square: string) => {
    const moves = game.moves({ square, verbose: true }) as any[];
    if (moves.length === 0) return false;

    const newSquares: Record<string, React.CSSProperties> = {};
    moves.forEach((move) => {
      newSquares[move.to] = {
        background: move.captured
          ? 'radial-gradient(circle, rgba(239,68,68,0.5) 85%, transparent 85%)'
          : 'radial-gradient(circle, rgba(0,0,0,0.2) 25%, transparent 25%)',
        borderRadius: '50%',
      };
    });
    setOptionSquares(newSquares);
    return true;
  };

  const onPieceClick = (args: any) => {
    const square = typeof args === 'string' ? args : args?.square;
    if (square) onSquareClick(square);
  };

  const onSquareClick = (args: any) => {
    const square = typeof args === 'string' ? args : args?.square;
    if (!square) return;
    if (gameOver) return;

    function resetFirstMove(sq: string) {
      const hasOptions = getMoveOptions(sq);
      if (hasOptions) setMoveFrom(sq);
    }

    if (!moveFrom) {
      resetFirstMove(square);
      return;
    }

    try {
      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn());
      const move = gameCopy.move({
        from: moveFrom,
        to: square,
        promotion: 'q',
      });

      if (move) {
        setGame(gameCopy);
        sounds.playMove(move.captured != null, game.inCheck());
        setMoveFrom(null);
        setHintArrow(null);
        setOptionSquares({});
      } else {
        resetFirstMove(square);
      }
    } catch (e) {
      resetFirstMove(square);
    }
  };


  const resetGame = () => {
    setGame(new Chess());
    setGameOver(false);
    setWinner(null);
    setMoveFrom(null);
        setHintArrow(null);
    setOptionSquares({});
    setIsFlipped(false);
  };

  const history = game.history({ verbose: true });
  const capturedWhite = history.filter(m => m.color === 'b' && m.captured).map(m => m.captured);
  const capturedBlack = history.filter(m => m.color === 'w' && m.captured).map(m => m.captured);

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 flex flex-col lg:flex-row gap-8">
      <div className="flex-1 flex flex-col items-center justify-center max-w-[800px] mx-auto w-full">
        <div className="w-full flex justify-between items-center mb-6">
          <button
            onClick={onExit}
            className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Sair
          </button>
          
          <div className="flex items-center gap-2 bg-neutral-800/50 backdrop-blur-sm px-4 py-2 rounded-full border border-neutral-700">
            <MonitorPlay className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-white">2 Jogadores (Local)</span>
          </div>

          <button
            onClick={resetGame}
            className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
          >
            <RefreshCcw className="w-5 h-5" />
            Reiniciar
          </button>
        </div>

        <div className="flex gap-4 w-full aspect-[21/20]">
          <div className="py-2">
            <EvalBar game={game} isFlipped={isFlipped} />
          </div>
          <div className={cn("flex-1 rounded-lg overflow-hidden shadow-2xl relative", theme.boardWrapperClass)}>
            {gameOver && (
              <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
                <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl text-center max-w-sm w-full mx-4 shadow-2xl">
                  <h2 className="text-3xl font-bold text-white mb-2">Fim de Jogo</h2>
                  <p className="text-xl text-emerald-400 font-semibold mb-8">{winner}</p>
                  <div className="flex gap-4">
                    <button onClick={onExit} className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold transition-colors">Sair</button>
                    <button onClick={resetGame} className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-xl font-bold transition-colors">Nova Partida</button>
                  </div>
                </div>
              </div>
            )}
            <Chessboard 
              options={{
                id: "LocalGame",
                position: game.fen(),
                onPieceDrop: onDrop as any,
                onSquareClick: onSquareClick as any,
                onPieceClick: onPieceClick as any,
                boardOrientation: isFlipped ? 'black' : 'white',
                darkSquareStyle: theme.darkSquareStyle,
                lightSquareStyle: theme.lightSquareStyle,
                pieces: customPieces,
                squareStyles: { ...moveHighlights, ...optionSquares },
                arrows: hintArrow ? [{ startSquare: hintArrow[0], endSquare: hintArrow[1], color: 'rgba(245, 158, 11, 0.8)' }] : [],
                animationDurationInMs: 200
              }}
            />
          </div>
        </div>
      </div>

      <div className="w-full lg:w-96 flex flex-col gap-6">
        <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Controles Locais</h3>
            <div className="flex gap-2">
              <button
                onClick={handleHint}
                disabled={gameOver || isGettingHint}
                className="p-2 bg-neutral-800 hover:bg-neutral-700 text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
                title="Dica da IA"
              >
                <Lightbulb className={cn("w-4 h-4", isGettingHint && "animate-pulse")} />
              </button>
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors flex items-center gap-2"
                title="Girar Tabuleiro"
              >
                <FlipVertical className="w-4 h-4" />
              </button>

            </div>
          </div>
          
          <div className="flex items-center justify-between bg-neutral-800 p-4 rounded-xl border border-neutral-700">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-white border-2 border-neutral-400" />
              <span className={cn("font-bold", game.turn() === 'w' ? "text-emerald-400" : "text-neutral-400")}>Brancas</span>
            </div>
            <div className="flex gap-1">
              {capturedWhite.slice(0, 5).map((p, i) => (
                <span key={i} className="text-neutral-500 opacity-50 text-xl font-chess">{
                  p === 'p' ? '♙' : p === 'n' ? '♘' : p === 'b' ? '♗' : p === 'r' ? '♖' : '♕'
                }</span>
              ))}
              {capturedWhite.length > 5 && <span className="text-neutral-500 text-xs ml-1">+{capturedWhite.length - 5}</span>}
            </div>
          </div>

          <div className="flex items-center justify-between bg-neutral-800 p-4 rounded-xl border border-neutral-700">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-black border-2 border-neutral-600" />
              <span className={cn("font-bold", game.turn() === 'b' ? "text-emerald-400" : "text-neutral-400")}>Pretas</span>
            </div>
            <div className="flex gap-1">
              {capturedBlack.slice(0, 5).map((p, i) => (
                <span key={i} className="text-neutral-500 opacity-50 text-xl font-chess">{
                  p === 'p' ? '♟' : p === 'n' ? '♞' : p === 'b' ? '♝' : p === 'r' ? '♜' : '♛'
                }</span>
              ))}
              {capturedBlack.length > 5 && <span className="text-neutral-500 text-xs ml-1">+{capturedBlack.length - 5}</span>}
            </div>
          </div>
        </div>

        <MoveHistory history={game.history()} />
      </div>
    </div>
  );
}
