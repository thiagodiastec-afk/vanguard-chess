import React, { useState, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { useTheme } from '../lib/themes';
import { sounds } from '../lib/sounds';
import { Chessboard } from 'react-chessboard';
import { Puzzle } from '../types';
import { Target, BookOpen, CheckCircle2, ChevronRight, RefreshCcw, Bot } from 'lucide-react';
import { cn } from '../lib/utils';
import { getCustomPieces } from '../lib/chessPieces';

const PUZZLES: Puzzle[] = [
  {
    id: 'mate-in-1',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    solution: ['Qxf7#'],
    description: 'Encontre o xeque-mate em 1 lance (Mate do Pastor).',
    category: 'tactics'
  },
  {
    id: 'fork-1',
    fen: 'r1bqk2r/pppp1ppp/2n5/4p3/1bB1P1n1/2NP4/PPP2PPP/R1BQK1NR w KQkq - 1 6',
    solution: ['Bxf7+', 'Kxf7', 'Qxg4'],
    description: 'Ganho de material através de um garfo.',
    category: 'tactics'
  },
  {
    id: 'endgame-1',
    fen: '8/8/8/8/8/4k3/4p3/4K3 b - - 0 1',
    solution: ['Kd3', 'Kf2', 'Kd2', 'Kf3', 'e1=Q'],
    description: 'Tutorial de Finais: Promova o peão com a oposição.',
    category: 'endgame'
  }
];

interface TrainingProps {
  onPlayComputer?: (diff: string) => void;
}

export default function Training({ onPlayComputer }: TrainingProps) {
  const theme = useTheme();
  const [currentPuzzleIdx, setCurrentPuzzleIdx] = useState(0);
  const [chess] = useState(new Chess(PUZZLES[0].fen));
  const [fen, setFen] = useState(PUZZLES[0].fen);
  const [step, setStep] = useState(0);
  const [solved, setSolved] = useState(false);
  const [errorLine, setErrorLine] = useState(false);
  
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

  const puzzle = PUZZLES[currentPuzzleIdx];

  const resetPuzzle = () => {
    chess.load(puzzle.fen);
    setFen(chess.fen());
    setStep(0);
    setSolved(false);
    setErrorLine(false);
    setMoveFrom(null);
    setOptionSquares({});
  };

  const loadPuzzle = (idx: number) => {
    setCurrentPuzzleIdx(idx);
    chess.load(PUZZLES[idx].fen);
    setFen(chess.fen());
    setStep(0);
    setSolved(false);
    setErrorLine(false);
    setMoveFrom(null);
    setOptionSquares({});
  };

  const getMoveOptions = (square: string) => {
    const moves = chess.moves({
      square: square as any,
      verbose: true
    });
    if (moves.length === 0) {
      setOptionSquares({});
      return;
    }

    const newSquares: Record<string, React.CSSProperties> = {};
    moves.forEach((move) => {
      newSquares[move.to] = {
        background:
          chess.get(move.to as any) && chess.get(move.to as any)?.color !== chess.get(square as any)?.color
            ? 'radial-gradient(circle, rgba(239, 68, 68, 0.4) 85%, transparent 85%)'
            : 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 25%, transparent 25%)',
        borderRadius: '50%'
      };
    });
    
    newSquares[square] = {
      background: 'rgba(234, 179, 8, 0.4)'
    };
    setOptionSquares(newSquares);
  };

  const onPieceClick = (args: any) => {
    const square = typeof args === 'string' ? args : args?.square;
    if (square) {
      onSquareClick(square);
    }
  };

  const onSquareClick = (args: any) => {
    const square = typeof args === 'string' ? args : args?.square;
    if (!square) return;
    if (solved || chess.turn() !== 'w') return;

    function resetFirstMove(sq: string) {
      setMoveFrom(sq);
      getMoveOptions(sq);
    }

    if (!moveFrom) {
      const hasPiece = chess.get(square as any);
      if (hasPiece && hasPiece.color === 'w') {
        resetFirstMove(square);
      }
      return;
    }

    try {
      const tempChess = new Chess(chess.fen());
      const move = tempChess.move({
        from: moveFrom,
        to: square,
        promotion: 'q',
      });

      if (move) {
        setMoveFrom(null);
        setOptionSquares({});
        
        if (move.san === puzzle.solution[step]) {
          chess.move(move);
          setFen(chess.fen());
          setErrorLine(false);
          
          const nextStep = step + 1;
          setStep(nextStep);

          if (nextStep >= puzzle.solution.length) {
            setSolved(true);
          } else {
            setTimeout(() => {
              const opponentMove = puzzle.solution[nextStep];
              chess.move(opponentMove);
              setFen(chess.fen());
              setStep(nextStep + 1);
            }, 500);
          }
          return;
        } else {
          setErrorLine(true);
          setTimeout(() => setErrorLine(false), 1500);
          return;
        }
      }
    } catch (e) {
      // ignore
    }

    const hasPiece = chess.get(square as any);
    if (hasPiece && hasPiece.color === 'w') {
      resetFirstMove(square);
    } else {
      setMoveFrom(null);
      setOptionSquares({});
    }
  };

  const onDrop = (argsOrSource: any, argTarget?: any, argPiece?: any) => {
    if (solved) return false;

    let sourceSquare = '';
    let targetSquare = '';
    let pieceStr = '';

    if (typeof argsOrSource === 'object' && argsOrSource !== null) {
      sourceSquare = argsOrSource.sourceSquare;
      targetSquare = argsOrSource.targetSquare;
      pieceStr = typeof argsOrSource.piece === 'string' ? argsOrSource.piece : (argsOrSource.piece?.piece || argsOrSource.piece?.pieceType || '');
    } else {
      sourceSquare = argsOrSource;
      targetSquare = argTarget;
      pieceStr = argPiece;
    }

    try {
      // Create a temporary chess instance to validate the move SAN
      const tempChess = new Chess(chess.fen());
      const move = tempChess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (!move) return false;

      // Check if it matches the solution step
      if (move.san === puzzle.solution[step]) {
        chess.move(move);
        setFen(chess.fen());
        setErrorLine(false);
        setMoveFrom(null);
        setOptionSquares({});
        
        const nextStep = step + 1;
        setStep(nextStep);

        if (nextStep >= puzzle.solution.length) {
          setSolved(true);
        } else {
          // It's the computer's turn to play the opponent's move in the solution
          setTimeout(() => {
            const opponentMove = puzzle.solution[nextStep];
            chess.move(opponentMove);
            setFen(chess.fen());
            setStep(nextStep + 1);
          }, 500);
        }
        return true;
      } else {
        setErrorLine(true);
        setTimeout(() => setErrorLine(false), 1500);
        setMoveFrom(null);
        setOptionSquares({});
        return false;
      }
    } catch (e) {
      setMoveFrom(null);
      setOptionSquares({});
      return false;
    }
  };

  const isWhite = chess.turn() === 'w';

  return (
    <div className="flex-1 p-6 max-w-6xl mx-auto w-full flex flex-col md:flex-row gap-8">
      
      {/* Sidebar - Puzzles List */}
      <div className="w-full md:w-80 flex flex-col gap-4">
        <div className="bg-neutral-800 rounded-2xl p-6 border border-neutral-700/50 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="w-6 h-6 text-emerald-500" />
            <h2 className="text-xl font-bold text-white">Módulo de Treino</h2>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3">Contra a IA (Bots)</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'iniciante', name: 'Iniciante', c: 'text-emerald-400' },
                { id: 'facil', name: 'Fácil', c: 'text-blue-400' },
                { id: 'medio', name: 'Médio', c: 'text-yellow-400' },
                { id: 'dificil', name: 'Difícil', c: 'text-orange-400' },
                { id: 'profissional', name: 'Pro', c: 'text-red-500' }
              ].map(bot => (
                <button
                  key={bot.id}
                  onClick={() => onPlayComputer?.(bot.id)}
                  className="bg-neutral-900 border border-neutral-700/50 hover:bg-neutral-700 text-neutral-300 rounded-lg p-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Bot className={`w-4 h-4 ${bot.c}`} />
                  {bot.name}
                </button>
              ))}
            </div>
          </div>

          <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3">Puzzles (Táticas)</h3>
          
          <div className="space-y-3">
            {PUZZLES.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => loadPuzzle(idx)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl transition-all border",
                  currentPuzzleIdx === idx 
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" 
                    : "bg-neutral-900 border-neutral-700/50 text-neutral-300 hover:bg-neutral-700"
                )}
              >
                <div className="font-semibold text-sm mb-1">
                  {p.category === 'tactics' ? 'Tática' : p.category === 'endgame' ? 'Final' : 'Abertura'}
                </div>
                <div className="text-xs opacity-80 line-clamp-1">{p.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Board Area */}
      <div className="flex-1 flex flex-col items-center max-w-[500px] mx-auto w-full">
        <div className="w-full mb-6 text-center">
          <h3 className="text-2xl font-bold text-white mb-2">Desafio {currentPuzzleIdx + 1}</h3>
          <p className="text-neutral-400">{puzzle.description}</p>
        </div>

        <div className="w-full max-w-[600px] mx-auto aspect-square order-1 xl:order-2 relative rounded-2xl bg-gradient-to-br from-[#2a170e] via-[#1a0c06] to-[#0f0703] p-2 sm:p-3 border-2 sm:border-4 border-[#613318] shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col justify-between overflow-hidden">
          <div className="w-full h-full relative rounded-lg overflow-hidden shadow-inner bg-black">
          {/* @ts-ignore react-chessboard types are broken in v5 */}
          <Chessboard 
            options={{
              id: "Training",
              position: fen,
              onPieceDrop: onDrop as any,
              onSquareClick: onSquareClick as any,
              onPieceClick: onPieceClick as any,
              boardOrientation: "white",
              darkSquareStyle: theme.darkSquareStyle,
              lightSquareStyle: theme.lightSquareStyle,
              pieces: getCustomPieces(theme.pieceSet || '3d_staunton'),
              squareStyles: optionSquares,
              animationDurationInMs: 300
            }}
          />
          {solved && (
            <div className="absolute inset-0 z-10 bg-black/70 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4" />
              <h2 className="text-3xl font-bold text-white mb-6">Correto!</h2>
              {currentPuzzleIdx < PUZZLES.length - 1 && (
                <button
                  onClick={() => loadPuzzle(currentPuzzleIdx + 1)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2"
                >
                  Próximo Desafio
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
          </div>

          <div className="w-full pt-1.5 flex items-center justify-center gap-2 opacity-50 select-none pointer-events-none">
            <div className="h-[1px] w-8 sm:w-12 bg-amber-600/40" />
            <span className="text-[9px] sm:text-[10px] font-serif tracking-[0.25em] text-amber-200/80 font-bold uppercase">Vanguard Chess</span>
            <div className="h-[1px] w-8 sm:w-12 bg-amber-600/40" />
          </div>
        </div>

        <div className="w-full mt-6 flex items-center justify-between">
          <div className={cn(
            "text-sm font-medium transition-opacity",
            errorLine ? "text-red-400 opacity-100" : "opacity-0"
          )}>
            Lance incorreto. Tente novamente.
          </div>
          <button
            onClick={resetPuzzle}
            className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm font-medium bg-neutral-800 px-4 py-2 rounded-lg"
          >
            <RefreshCcw className="w-4 h-4" />
            Reiniciar
          </button>
        </div>
      </div>
    </div>
  );
}
