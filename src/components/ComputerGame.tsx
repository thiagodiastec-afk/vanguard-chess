import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { useTheme } from '../lib/themes';
import { sounds } from '../lib/sounds';
import { Chessboard } from 'react-chessboard';
import confetti from 'canvas-confetti';
import { UserData } from '../types';
import { Flag, ChevronLeft, Bot, RefreshCcw, Undo, Sparkles, Lightbulb } from 'lucide-react';
import { cn } from '../lib/utils';
import { getCustomPieces } from '../lib/chessPieces';
import MoveHistory from './MoveHistory';
import CapturedPieces from './CapturedPieces';
import EvalBar from "./EvalBar";
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { calculateAchievements } from '../lib/achievementManager';
import { ACHIEVEMENTS } from '../lib/achievements';
import { sendNotification } from '../lib/notifications';

interface ComputerGameProps {
  difficulty: string;
  currentUser: UserData | null;
  onExit: () => void;
}

export default function ComputerGame({ difficulty, currentUser, onExit }: ComputerGameProps) {
  const theme = useTheme();
  const [activeDifficulty, setActiveDifficulty] = useState(difficulty === 'resume' ? 'facil' : difficulty);
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [isThinking, setIsThinking] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hintArrow, setHintArrow] = useState<[string, string] | null>(null);
  const [isGettingHint, setIsGettingHint] = useState(false);
  const [hasUsedHelp, setHasUsedHelp] = useState(false);

  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

  const getDifficultyName = () => {
    switch (activeDifficulty) {
      case 'iniciante': return 'Iniciante';
      case 'facil': return 'Fácil';
      case 'medio': return 'Médio';
      case 'dificil': return 'Difícil';
      case 'profissional': return 'Profissional';
      default: return 'Bot';
    }
  };

  useEffect(() => {
    if (difficulty === 'resume') {
      const saved = localStorage.getItem('vanguard_chess_bot_save');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const newGame = new Chess();
          newGame.loadPgn(parsed.pgn);
          setGame(newGame);
          setPlayerColor(parsed.playerColor);
          setActiveDifficulty(parsed.difficulty);
          setHasUsedHelp(parsed.hasUsedHelp || false);
        } catch (e) {}
      }
    }
  }, [difficulty]);

  useEffect(() => {
    if (game.moveNumber() > 1 && !gameOver) {
      localStorage.setItem('vanguard_chess_bot_save', JSON.stringify({
        pgn: game.pgn(),
        playerColor,
        difficulty: activeDifficulty,
        hasUsedHelp
      }));
    } else if (gameOver) {
      localStorage.removeItem('vanguard_chess_bot_save');
    }
  }, [game, playerColor, activeDifficulty, hasUsedHelp, gameOver]);

  const makeComputerMove = useCallback(() => {
    if (game.isGameOver() || game.turn() === playerColor || isThinking) return;
    
    setIsThinking(true);
    setHintArrow(null);
    
    // Dynamically import the worker to ensure it compiles correctly with Vite
    import('../lib/engine.worker?worker').then((WorkerModule) => {
      const worker = new WorkerModule.default();
      
      worker.onmessage = (e) => {
        const { bestMove } = e.data;
        if (bestMove) {
          setGame((currentGame) => {
             // If the current game fen doesn't match the fen we sent to the worker, it means the user undid a move while the computer was thinking!
             if (currentGame.fen() !== game.fen()) {
               return currentGame;
             }
             const gameCopy = new Chess();
             gameCopy.loadPgn(currentGame.pgn());
             gameCopy.move(bestMove);
             return gameCopy;
          });
        }
        setIsThinking(false);
        worker.terminate();
      };

      worker.postMessage({ type: 'search', fen: game.fen(), difficulty: activeDifficulty });
    });
  }, [game, activeDifficulty, playerColor, isThinking]);

  const handleHint = () => {
    if (game.isGameOver() || isGettingHint || isThinking) return;
    setIsGettingHint(true);
    setHasUsedHelp(true);
    
    import('../lib/engine.worker?worker').then((WorkerModule) => {
      const worker = new WorkerModule.default();
      worker.onmessage = (e) => {
        const { bestMove } = e.data;
        if (bestMove) {
          // bestMove might be 'e2e4' or 'g1f3'
          const from = bestMove.substring(0, 2);
          const to = bestMove.substring(2, 4);
          setHintArrow([from, to]);
        }
        setIsGettingHint(false);
        worker.terminate();
      };
      // Depth 3 is enough for a good hint
      worker.postMessage({ type: 'search', fen: game.fen(), difficulty: 'dificil' });
    });
  };

  const statsUpdated = useRef(false);

    const moveHighlights = useMemo(() => {
    const history = game.history({ verbose: true });
    const highlights: Record<string, React.CSSProperties> = {};
    
    if (history.length > 0) {
      const lastMove = history[history.length - 1] as any;
      const isCapture = lastMove.captured != null;
      const captureColor = 'rgba(239, 68, 68, 0.5)'; // red-500
      const normalColor = 'rgba(234, 179, 8, 0.4)'; // amber-500

      highlights[lastMove.from] = { 
        backgroundColor: normalColor, 
        transition: 'background-color 0.3s ease' 
      };
      highlights[lastMove.to] = { 
        backgroundColor: isCapture ? captureColor : normalColor, 
        transition: 'background-color 0.3s ease',
        transform: isCapture ? 'scale(1.05)' : 'none',
        boxShadow: isCapture ? 'inset 0 0 15px rgba(239, 68, 68, 0.8)' : 'none'
      };
    }

    if (game.isCheck()) {
      const turn = game.turn();
      const board = game.board();
      let kingSquare = '';
      for (const row of board) {
        for (const piece of row) {
          if (piece && piece.type === 'k' && piece.color === turn) {
            kingSquare = piece.square;
            break;
          }
        }
      }
      if (kingSquare) {
        highlights[kingSquare] = {
          ...highlights[kingSquare],
          animation: 'checkPulse 1.5s infinite, checkVibrate 0.3s infinite',
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          boxShadow: 'inset 0 0 20px rgba(239, 68, 68, 0.9)',
          borderRadius: '50%'
        };
      }
    }

    return highlights;
  }, [game.fen()]);

  useEffect(() => {
    if (game.isGameOver() && !gameOver) {
      setGameOver(true);
      setTimeout(() => {
        if (game.isCheckmate()) {
          setWinner(game.turn() === 'w' ? 'black' : 'white');
        } else {
          setWinner('draw');
        }
      }, 600);
    } else if (!gameOver && game.turn() !== playerColor && !isThinking) {
      makeComputerMove();
    }
  }, [game, playerColor, isThinking, makeComputerMove, gameOver]);


  // Fallback in case worker gets stuck
  useEffect(() => {
    let timeout: any;
    if (isThinking) {
      timeout = setTimeout(() => {
        console.warn("Worker timed out after 15s. Resetting isThinking.");
        setIsThinking(false);
      }, 15000);
    }
    return () => clearTimeout(timeout);
  }, [isThinking]);

  const calculateEloChange = (myElo: number, opponentElo: number, result: 1 | 0.5 | 0) => {
    const K = 32;
    const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - myElo) / 400));
    return Math.round(K * (result - expectedScore));
  };

  useEffect(() => {
    if (winner && currentUser && !statsUpdated.current) {
      statsUpdated.current = true;
      const updateStats = async () => {
        try {
          const db = getDb();
          let numericResult: 1 | 0.5 | 0 = 0;
          if (winner === 'draw') numericResult = 0.5;
          else if (winner === playerColor) numericResult = 1;
          
          let botElo = 1000;
          switch (activeDifficulty) {
            case 'iniciante': botElo = 800; break;
            case 'facil': botElo = 1000; break;
            case 'medio': botElo = 1300; break;
            case 'dificil': botElo = 1600; break;
            case 'profissional': botElo = 2000; break;
          }
          
          if (numericResult === 1) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#10b981', '#fbbf24', '#ffffff']
            });
          }

          // If playing as guest, skip Firestore updates
          if (currentUser.isGuest) return;

          const eloChange = calculateEloChange(currentUser.elo, botElo, numericResult);
          const updateData: any = {
            elo: increment(eloChange),
            gamesPlayed: increment(1),
            eloHistory: arrayUnion({ date: Date.now(), elo: currentUser.elo + eloChange })
          };

          let coinsReward = 0;
          if (numericResult === 1) {
            updateData['stats.wins'] = increment(1);
            if (activeDifficulty === 'iniciante') coinsReward = 10;
            else if (activeDifficulty === 'facil') coinsReward = 20;
            else if (activeDifficulty === 'medio') coinsReward = 50;
            else if (activeDifficulty === 'dificil') coinsReward = 100;
            else if (activeDifficulty === 'profissional') coinsReward = 250;
            
            if (!hasUsedHelp) {
              coinsReward = Math.floor(coinsReward * 1.5);
            }
            
            updateData['coins'] = increment(coinsReward);
          }
          else if (numericResult === 0) updateData['stats.losses'] = increment(1);
          else {
            updateData['stats.draws'] = increment(1);
            updateData['coins'] = increment(5);
          }

          const { updates: badgeUpdates, newBadges } = calculateAchievements(
            currentUser, 
            numericResult, 
            game.history().length, 
            true, 
            activeDifficulty
          );
          Object.assign(updateData, badgeUpdates);

          await updateDoc(doc(db, 'users', currentUser.uid), updateData);
          for (const badgeId of newBadges) {
            const badge = ACHIEVEMENTS[badgeId];
            if (badge) {
              sendNotification('Nova Conquista Desbloqueada!', {
                body: `Você ganhou a insígnia: ${badge.name}`
              });
            }
          }
        } catch (e) {
          console.error("Failed to update stats", e);
        }
      };
      updateStats();
    } else if (winner && !currentUser) {
      // Show confetti for guests too
      let numericResult: 1 | 0.5 | 0 = 0;
      if (winner === 'draw') numericResult = 0.5;
      else if (winner === playerColor) numericResult = 1;
      
      if (numericResult === 1) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#fbbf24', '#ffffff']
        });
      }
    }
  }, [winner, currentUser, activeDifficulty, playerColor, hasUsedHelp]);

  const getMoveOptions = (square: any) => {
    const moves = game.moves({
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
          game.get(move.to as any) && game.get(move.to as any)?.color !== game.get(square as any)?.color
            ? 'radial-gradient(circle, rgba(239, 68, 68, 0.4) 85%, transparent 85%)' // Red highlight for captures
            : 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 25%, transparent 25%)', // White dot for moves
        borderRadius: '50%'
      };
    });
    
    newSquares[square] = {
      background: 'rgba(234, 179, 8, 0.4)' // Highlight selected piece
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
    if (game.turn() !== playerColor || gameOver || isThinking) return;

    function resetFirstMove(sq: string) {
      setMoveFrom(sq);
      getMoveOptions(sq);
    }

    // If no piece is selected yet
    if (!moveFrom) {
      const hasPiece = game.get(square as any);
      if (hasPiece && hasPiece.color === playerColor) {
        resetFirstMove(square);
      }
      return;
    }

    // Try to make a move
    try {
      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn());
      const move = gameCopy.move({
        from: moveFrom,
        to: square,
        promotion: 'q',
      });

      if (move) {
        sounds.playMove(move.captured != null, gameCopy.inCheck());
        setGame(gameCopy);
        setMoveFrom(null);
        setHintArrow(null);
        setOptionSquares({});
        return;
      }
    } catch (e) {
      // Invalid move, ignore and fall through
    }

    // If invalid move, check if clicked another own piece
    const hasPiece = game.get(square as any);
    if (hasPiece && hasPiece.color === playerColor) {
      resetFirstMove(square);
    } else {
      setMoveFrom(null);
        setHintArrow(null);
      setOptionSquares({});
    }
  };

  const onDrop = (argsOrSource: any, argTarget?: any, argPiece?: any) => {
    console.log('onDrop called', argsOrSource, argTarget);
    console.log('onDrop args:', argsOrSource, argTarget, argPiece);
    let sourceSquare = '';
    let targetSquare = '';

    if (typeof argsOrSource === 'object' && argsOrSource !== null) {
      sourceSquare = argsOrSource.sourceSquare;
      targetSquare = argsOrSource.targetSquare;
    } else {
      sourceSquare = argsOrSource;
      targetSquare = argTarget;
    }

    if (game.turn() !== playerColor || gameOver || isThinking) return false;

    try {
      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn());
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move) {
        sounds.playMove(move.captured != null, gameCopy.inCheck());
        setGame(gameCopy);
        setMoveFrom(null);
        setHintArrow(null);
        setOptionSquares({});
        return true;
      }
    } catch (e) {
      console.log('Exception in onDrop', e);
      setMoveFrom(null);
        setHintArrow(null);
      setOptionSquares({});
      return false;
    }
    console.log('Returning false at end');
    setMoveFrom(null);
        setHintArrow(null);
    setOptionSquares({});
    return false;
  };

  
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pgn: game.pgn(), color: playerColor })
      });
      const data = await response.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
      } else if (data.error) {
        setAnalysis(`**Aviso:** ${data.error}`);
      }
    } catch (error) {
      console.error(error);
      setAnalysis("**Erro de Conexão:** Não foi possível conectar ao servidor de IA.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetGame = () => {
    setGame(new Chess());
    setGameOver(false);
    setWinner(null);
    setAnalysis(null);
    statsUpdated.current = false;
    setHasUsedHelp(false);
  };

  
  const handleUndo = () => {
    if (gameOver || game.history().length === 0) return;
    setHasUsedHelp(true);
    
    const newGame = new Chess();
    newGame.loadPgn(game.pgn());
    
    // Check whose turn it currently is in the original game
    const currentTurn = game.turn();
    
    if (currentTurn === playerColor) {
      // It's the player's turn, which means the computer just moved.
      // So we undo the computer's move, AND the player's move.
      newGame.undo(); // undoes computer's move
      newGame.undo(); // undoes player's move
    } else {
      // It's the computer's turn, which means the player just moved and computer is thinking.
      // So we just undo the player's move.
      newGame.undo(); // undoes player's move
    }

    setGame(newGame);
    setIsThinking(false);
  };

  
  const renderCapturedPieces = (color: 'w' | 'b', layout: 'horizontal' | 'vertical' = 'horizontal') => {
    const history = game.history({ verbose: true });
    // If color is 'w', they capture 'b' pieces.
    const capturedPieces = history.filter(m => m.color === color && m.captured).map(m => m.captured);
    
    if (capturedPieces.length === 0) return null;

    const order = { p: 1, n: 2, b: 3, r: 4, q: 5 };
    capturedPieces.sort((a, b) => (order[a as keyof typeof order] || 0) - (order[b as keyof typeof order] || 0));

    const targetColor = color === 'w' ? 'b' : 'w';

    if (layout === 'vertical') {
      return (
        <div className="flex flex-col flex-wrap items-center justify-center gap-[-10px] max-h-[600px] w-12 sm:w-16">
          {capturedPieces.map((piece, i) => (
            <img 
              key={i} 
              src={`https://images.chesscomfiles.com/chess-themes/pieces/wood/150/${targetColor}${piece}.png`}
              alt="captured"
              className="w-8 h-8 sm:w-12 sm:h-12 -mt-2 sm:-mt-4 first:mt-0 drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] z-10 transition-transform"
              style={{ zIndex: i }}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-[-6px] mt-2">
        {capturedPieces.map((piece, i) => (
          <img 
            key={i} 
            src={`https://images.chesscomfiles.com/chess-themes/pieces/wood/150/${targetColor}${piece}.png`}
            alt="captured"
            className="w-5 h-5 -ml-1.5 first:ml-0 drop-shadow-md"
          />
        ))}
      </div>
    );
  };

  const resign = () => {
    setGameOver(true);
    setWinner(playerColor === 'w' ? 'black' : 'white');
  };

  return (
    <div className="flex-1 w-full flex flex-col items-center">
      {/* Menu Superior do Jogo */}
      <div className="w-full bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 px-4 py-2.5 sm:px-6 flex items-center justify-between z-10 gap-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (!gameOver && game.moveNumber() > 1) {
                localStorage.setItem('vanguard_chess_bot_save', JSON.stringify({
                  pgn: game.pgn(),
                  playerColor,
                  difficulty: activeDifficulty,
                  hasUsedHelp
                }));
              }
              onExit();
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl font-bold transition-all text-xs sm:text-sm shadow-sm active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
            Sair
          </button>
          <div className="h-5 w-px bg-neutral-800 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-emerald-400" />
            <h2 className="font-bold text-white text-sm sm:text-base">Treinamento vs IA</h2>
            <span className="text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold hidden sm:inline-block">
              {getDifficultyName()}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleHint}
            disabled={gameOver || isThinking || isGettingHint}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm active:scale-95"
            title="Dica da IA"
          >
            <Lightbulb className={cn("w-4 h-4", isGettingHint && "animate-pulse")} />
            <span>{isGettingHint ? 'Pensando...' : 'Dica'}</span>
          </button>
          <button 
            onClick={handleUndo}
            disabled={gameOver || game.history().length === 0}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm active:scale-95"
            title="Desfazer Jogada"
          >
            <Undo className="w-4 h-4" />
            <span className="hidden sm:inline">Desfazer</span>
          </button>
          <button 
            onClick={resetGame}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl font-bold transition-all text-xs sm:text-sm active:scale-95"
            title="Reiniciar Partida"
          >
            <RefreshCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Reiniciar</span>
          </button>
          <button 
            onClick={resign}
            disabled={gameOver}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm active:scale-95"
            title="Abandonar Partida"
          >
            <Flag className="w-4 h-4" />
            <span className="hidden sm:inline">Abandonar</span>
          </button>
        </div>
      </div>

      {/* Main Game Layout Container */}
      <div className="w-full max-w-[1700px] mx-auto p-2 sm:p-4 lg:p-5 flex flex-col lg:flex-row gap-4 lg:gap-6 items-center lg:items-start justify-center flex-1">
        
        {/* Left Side: Players Info, Controls & Move History (Order 1) */}
        <div className="w-full lg:w-[320px] xl:w-[350px] flex flex-col gap-3 flex-shrink-0 order-2 lg:order-1">
          
          {/* Top Rectangle: Players & Match Info */}
          <div className="bg-neutral-900/95 rounded-2xl p-4 border border-neutral-800 shadow-xl flex flex-col gap-3.5">
            
            {/* Computer Info */}
            <div className="flex flex-col gap-1.5 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full border-2 bg-black border-neutral-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <h3 className="font-bold text-white text-sm truncate">Computador</h3>
                    </div>
                  </div>
                </div>
                <span className="text-[11px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-md font-medium border border-neutral-700/50">
                  {getDifficultyName()}
                </span>
              </div>
              
              <div className="flex items-center justify-between pt-1">
                <CapturedPieces id="bot-captured-pieces" fen={game.fen()} color="b" />
                {isThinking && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 animate-pulse">
                    <Bot className="w-3 h-3 animate-spin" /> Pensando...
                  </span>
                )}
              </div>
            </div>

            {/* Human Player Info */}
            <div className="flex flex-col gap-1.5 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full border-2 bg-white border-neutral-300 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-white text-sm truncate">{currentUser?.displayName || 'Você'}</h3>
                  </div>
                </div>
                {currentUser && (
                  <span className="text-[11px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md font-bold border border-emerald-500/20">
                    {currentUser.elo} ELO
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between pt-1">
                <CapturedPieces id="user-captured-pieces" fen={game.fen()} color="w" />
                <span className="text-[11px] text-neutral-500 font-mono">
                  Turno: {game.turn() === playerColor ? 'Sua vez' : 'Computador'}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons Grid inside left panel */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleHint}
                disabled={gameOver || isThinking || isGettingHint}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              >
                <Lightbulb className={cn("w-3.5 h-3.5", isGettingHint && "animate-pulse")} />
                <span>Dica</span>
              </button>
              <button
                onClick={handleUndo}
                disabled={gameOver || game.history().length === 0}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              >
                <Undo className="w-3.5 h-3.5" />
                <span>Desfazer</span>
              </button>
            </div>

          </div>

          {winner === playerColor && !hasUsedHelp && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3 rounded-2xl text-center text-xs font-bold animate-pulse shadow-lg flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Bônus Vitória Limpa (+50% Moedas)</span>
            </div>
          )}

          {/* Bottom Rectangle: Histórico de Lances */}
          <MoveHistory history={game.history()} className="max-h-[340px]" />
        </div>

        {/* Right / Center Side: Enlarged Chessboard (Order 2) */}
        <div className="flex-1 w-full max-w-[880px] xl:max-w-[940px] 2xl:max-w-[1000px] flex items-center justify-center gap-3 order-1 lg:order-2">
          
          {/* Evaluation Bar */}
          <div className="py-1">
            <EvalBar game={game} isFlipped={playerColor === 'b'} />
          </div>

          {/* Board Container */}
          <div className="flex-1 w-full relative">
            <div className="w-full rounded-2xl bg-gradient-to-br from-[#2a170e] via-[#1a0c06] to-[#0f0703] p-2.5 sm:p-3.5 border-2 sm:border-4 border-[#613318] shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
              
              <div className="w-full aspect-square relative rounded-xl overflow-hidden shadow-inner bg-black">
                {gameOver && (
                  <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md overflow-y-auto animate-in fade-in duration-300">
                    {!analysis ? (
                      <div className="my-auto max-w-sm">
                        <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
                          {winner === 'draw' ? 'Empate' : winner === (playerColor === 'w' ? 'white' : 'black') ? 'Você Venceu! 🎉' : 'Computador Venceu'}
                        </h2>
                        <p className="text-neutral-300 mb-6 text-sm">
                          {game.isCheckmate() ? 'Vitória por Xeque-mate!' : 
                           game.isDraw() ? 'Empate por repetição ou material insuficiente' : 
                           game.isStalemate() ? 'Empate por afogamento' : 'Partida encerrada por desistência.'}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                          <button 
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                            className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 text-xs sm:text-sm active:scale-95"
                          >
                            <Sparkles className="w-4 h-4" />
                            {isAnalyzing ? 'Analisando...' : 'Treinador IA'}
                          </button>
                          <button 
                            onClick={resetGame}
                            className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-2.5 px-5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95"
                          >
                            <RefreshCcw className="w-4 h-4" />
                            Nova Partida
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full max-w-md bg-neutral-900 border border-indigo-500/30 rounded-2xl p-5 text-left my-auto shadow-2xl">
                        <div className="flex items-center gap-2 mb-3 text-indigo-400 border-b border-indigo-500/20 pb-2.5">
                          <Sparkles className="w-4 h-4" />
                          <h3 className="font-bold text-base">Análise do Treinador</h3>
                        </div>
                        <div className="prose prose-invert prose-sm max-w-none text-neutral-300 mb-4 max-h-[220px] overflow-y-auto custom-scrollbar">
                          {(analysis || '').split('\n').map((paragraph, idx) => (
                            <p key={idx} className="mb-2 text-xs leading-relaxed">{paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>
                          ))}
                        </div>
                        <button 
                          onClick={resetGame}
                          className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-2.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95"
                        >
                          <RefreshCcw className="w-4 h-4" />
                          Nova Partida
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* @ts-ignore react-chessboard types are broken in v5 */}
                <Chessboard 
                  options={{
                    id: "ComputerGame",
                    position: game.fen(),
                    onPieceDrop: onDrop as any,
                    onSquareClick: onSquareClick as any,
                    onPieceClick: onPieceClick as any,
                    boardOrientation: playerColor === 'w' ? 'white' : 'black',
                    darkSquareStyle: theme.darkSquareStyle,
                    lightSquareStyle: theme.lightSquareStyle,
                    pieces: getCustomPieces(theme.pieceSet || '3d_staunton'),
                    squareStyles: { ...moveHighlights, ...optionSquares },
                    arrows: hintArrow ? [{ startSquare: hintArrow[0], endSquare: hintArrow[1], color: 'rgba(245, 158, 11, 0.8)' }] : [],
                    dropSquareStyle: { boxShadow: 'inset 0 0 1px 6px rgba(255,255,255,0.75)' },
                    animationDurationInMs: 300
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
