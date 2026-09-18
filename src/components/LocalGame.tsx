import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { useTheme } from '../lib/themes';
import { sounds } from '../lib/sounds';
import { Chessboard } from 'react-chessboard';
import confetti from 'canvas-confetti';
import { Flag, ChevronLeft, RefreshCcw, MonitorPlay, FlipVertical, Lightbulb } from 'lucide-react';
import { cn } from '../lib/utils';
import { getCustomPieces } from '../lib/chessPieces';
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

  const getMoveOptions = (square: any) => {
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
    <div className="flex-1 w-full max-w-[1700px] mx-auto p-1 sm:p-2 lg:p-3 flex flex-col items-center">
      {/* Menu Superior */}
      <div className="w-full bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 px-3 py-2 sm:px-6 rounded-2xl flex items-center justify-between mb-2 sm:mb-3 gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onExit}
            className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl font-bold transition-all text-xs sm:text-sm active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
            Sair
          </button>
          <div className="h-5 w-px bg-neutral-800 hidden sm:block" />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <MonitorPlay className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white text-xs sm:text-base">Partida Local (Pass & Play)</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handleHint}
            disabled={gameOver || isGettingHint}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm active:scale-95"
            title="Dica da IA"
          >
            <Lightbulb className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isGettingHint && "animate-pulse")} />
            <span className="hidden sm:inline">Dica</span>
          </button>
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl font-bold transition-all text-xs sm:text-sm active:scale-95"
            title="Girar Tabuleiro"
          >
            <FlipVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Girar</span>
          </button>
          <button
            onClick={resetGame}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl font-bold transition-all text-xs sm:text-sm active:scale-95"
            title="Reiniciar"
          >
            <RefreshCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Reiniciar</span>
          </button>
        </div>
      </div>

      <div className="w-full flex flex-col lg:flex-row gap-3 lg:gap-5 items-center lg:items-start justify-center flex-1">
        {/* Left Side: Controls & History */}
        <div className="w-full lg:w-[300px] xl:w-[340px] flex flex-col gap-2.5 flex-shrink-0 order-2 lg:order-1 lg:h-[min(calc(100dvh-115px),780px)]">
          <div className="bg-neutral-900/95 rounded-2xl p-3 sm:p-3.5 border border-neutral-800 shadow-xl flex flex-col gap-2.5 flex-shrink-0">
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
              <h3 className="text-xs uppercase tracking-wider font-bold text-neutral-400">Jogadores Locais</h3>
              <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Vez: {game.turn() === 'w' ? 'Brancas' : 'Pretas'}
              </span>
            </div>

            {/* White player */}
            <div className={cn(
              "flex items-center justify-between p-2.5 rounded-xl border transition-colors",
              game.turn() === 'w' ? "bg-emerald-500/10 border-emerald-500/30" : "bg-neutral-950/60 border-neutral-800/60"
            )}>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-neutral-400 flex-shrink-0" />
                <span className={cn("font-bold text-xs sm:text-sm", game.turn() === 'w' ? "text-white" : "text-neutral-400")}>
                  Brancas
                </span>
              </div>
              <div className="flex gap-1 flex-wrap justify-end max-w-[140px]">
                {capturedWhite.map((p, i) => (
                  <span key={i} className="text-neutral-400 text-sm font-chess leading-none">{
                    p === 'p' ? '♙' : p === 'n' ? '♘' : p === 'b' ? '♗' : p === 'r' ? '♖' : '♕'
                  }</span>
                ))}
              </div>
            </div>

            {/* Black player */}
            <div className={cn(
              "flex items-center justify-between p-2.5 rounded-xl border transition-colors",
              game.turn() === 'b' ? "bg-emerald-500/10 border-emerald-500/30" : "bg-neutral-950/60 border-neutral-800/60"
            )}>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-black border-2 border-neutral-600 flex-shrink-0" />
                <span className={cn("font-bold text-xs sm:text-sm", game.turn() === 'b' ? "text-white" : "text-neutral-400")}>
                  Pretas
                </span>
              </div>
              <div className="flex gap-1 flex-wrap justify-end max-w-[140px]">
                {capturedBlack.map((p, i) => (
                  <span key={i} className="text-neutral-400 text-sm font-chess leading-none">{
                    p === 'p' ? '♟' : p === 'n' ? '♞' : p === 'b' ? '♝' : p === 'r' ? '♜' : '♛'
                  }</span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-bold transition-all active:scale-95"
              >
                <FlipVertical className="w-3.5 h-3.5" />
                <span>Girar Mesa</span>
              </button>
              <button
                onClick={resetGame}
                className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-bold transition-all active:scale-95"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                <span>Nova Partida</span>
              </button>
            </div>
          </div>

          <MoveHistory history={game.history()} className="flex-1 min-h-[140px]" />
        </div>

        {/* Right Side: Board */}
        <div className="flex-1 w-full max-w-[min(100%,calc(100dvh-115px))] lg:max-w-[min(calc(100dvh-115px),760px)] flex items-center justify-center gap-2 sm:gap-3 order-1 lg:order-2">
          <div className="py-1 self-stretch">
            <EvalBar game={game} isFlipped={isFlipped} />
          </div>

          <div className="flex-1 w-full relative">
            <div className="w-full rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#2a170e] via-[#1a0c06] to-[#0f0703] p-1.5 sm:p-2.5 border-2 sm:border-4 border-[#613318] shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
              <div className="w-full aspect-square relative rounded-xl overflow-hidden shadow-inner bg-black">
                {gameOver && (
                  <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 text-center animate-in fade-in">
                    <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl text-center max-w-sm w-full mx-4 shadow-2xl">
                      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Fim de Jogo</h2>
                      <p className="text-lg sm:text-xl text-emerald-400 font-semibold mb-6">{winner}</p>
                      <div className="flex gap-3">
                        <button onClick={onExit} className="flex-1 py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold transition-colors text-xs sm:text-sm active:scale-95">Sair</button>
                        <button onClick={resetGame} className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-xl font-bold transition-colors text-xs sm:text-sm active:scale-95">Nova Partida</button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* @ts-ignore react-chessboard types are broken in v5 */}
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
                    pieces: getCustomPieces(theme.pieceSet || '3d_staunton'),
                    squareStyles: { ...moveHighlights, ...optionSquares },
                    arrows: hintArrow ? [{ startSquare: hintArrow[0], endSquare: hintArrow[1], color: 'rgba(245, 158, 11, 0.8)' }] : [],
                    dropSquareStyle: { boxShadow: 'inset 0 0 1px 6px rgba(255,255,255,0.75)' },
                    animationDurationInMs: 250
                  }}
                />
              </div>

              <div className="w-full pt-2 flex items-center justify-center gap-2 opacity-50 select-none pointer-events-none">
                <div className="h-[1px] w-8 sm:w-16 bg-amber-600/40" />
                <span className="text-[9px] sm:text-[10px] font-serif tracking-[0.25em] text-amber-200/80 font-bold uppercase">Vanguard Chess</span>
                <div className="h-[1px] w-8 sm:w-16 bg-amber-600/40" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
