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

        <div className="w-full max-w-[600px] mx-auto aspect-square order-1 xl:order-2 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] relative rounded-md bg-[#181512] p-[5%] pt-[4%] border-b-[45px] border-[#0a0908] border-x-[12px] border-x-[#14120f] border-t-[12px] border-t-[#1c1815]">
          <div className="absolute inset-[3%] border border-[#b57a3e]/40 pointer-events-none z-10" />
          <div className="absolute inset-[3.5%] border-2 border-[#b57a3e]/60 pointer-events-none z-10" />
          
          <div className="absolute bottom-[-45px] left-0 right-0 h-[45px] bg-gradient-to-b from-[#111] to-[#0a0a0a] pointer-events-none rounded-b-md flex items-center justify-center">
            <div className="w-[80%] h-[2px] bg-black/80 absolute top-0" />
            <div className="w-[16px] h-[16px] rounded-full bg-gradient-to-br from-[#e5c158] to-[#6a4f15] shadow-md border border-[#3a2a0d]" />
          </div>

          <div className="relative w-full aspect-square overflow-hidden shadow-inner bg-black">
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
            <div className="absolute inset-0 z-10 bg-black/60 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
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
