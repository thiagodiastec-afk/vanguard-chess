import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { useTheme } from '../lib/themes';
import { sounds } from '../lib/sounds';
import { Chessboard } from 'react-chessboard';
import confetti from 'canvas-confetti';
import { UserData } from '../types';
import { Flag, ChevronLeft, Bot, RefreshCcw, Undo, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { customPieces } from '../lib/chessPieces';
import MoveHistory from './MoveHistory';
import { calculateBestMove } from '../lib/engine';
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
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [isThinking, setIsThinking] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const getDifficultyName = () => {
    switch (difficulty) {
      case 'iniciante': return 'Iniciante';
      case 'facil': return 'Fácil';
      case 'medio': return 'Médio';
      case 'dificil': return 'Difícil';
      case 'profissional': return 'Profissional';
      default: return 'Bot';
    }
  };

  const makeComputerMove = useCallback(() => {
    if (game.isGameOver() || game.turn() === playerColor || isThinking) return;
    
    setIsThinking(true);
    
    // Use setTimeout to allow UI to render the "Thinking..." state
    setTimeout(() => {
      const bestMove = calculateBestMove(game, difficulty);
      if (bestMove) {
        const gameCopy = new Chess();
        gameCopy.loadPgn(game.pgn());
        gameCopy.move(bestMove);
        setGame(gameCopy);
      }
      setIsThinking(false);
    }, 100);
  }, [game, difficulty, playerColor, isThinking]);

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
          switch (difficulty) {
            case 'iniciante': botElo = 800; break;
            case 'facil': botElo = 1000; break;
            case 'medio': botElo = 1300; break;
            case 'dificil': botElo = 1600; break;
            case 'profissional': botElo = 2000; break;
          }
          const eloChange = calculateEloChange(currentUser.elo, botElo, numericResult);
          const updateData: any = {
            elo: increment(eloChange),
            gamesPlayed: increment(1),
            eloHistory: arrayUnion({ date: Date.now(), elo: currentUser.elo + eloChange })
          };

          let coinsReward = 0;
          if (numericResult === 1) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#10b981', '#fbbf24', '#ffffff']
            });
            updateData['stats.wins'] = increment(1);
            if (difficulty === 'iniciante') coinsReward = 10;
            else if (difficulty === 'facil') coinsReward = 20;
            else if (difficulty === 'medio') coinsReward = 50;
            else if (difficulty === 'dificil') coinsReward = 100;
            else if (difficulty === 'profissional') coinsReward = 250;
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
            difficulty
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
    }
  }, [winner, currentUser, difficulty, playerColor]);

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
        return true;
      }
    } catch (e) {
      console.log('Exception in onDrop', e);
      return false;
    }
    console.log('Returning false at end');
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
  };

  
  const handleUndo = () => {
    if (gameOver || game.history().length === 0) return;
    
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
    <div className="flex-1 w-full flex flex-col">
      {/* Menu Superior do Jogo */}
      <div className="w-full bg-neutral-900 border-b border-neutral-800 p-3 lg:px-8 flex flex-wrap justify-between items-center z-10 gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onExit}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg font-bold transition-colors text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Sair
          </button>
          <div className="h-6 w-px bg-neutral-700 hidden sm:block" />
          <h2 className="font-bold text-white hidden sm:flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-500" />
            Treinamento vs IA
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleUndo}
            disabled={gameOver || game.history().length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Undo className="w-4 h-4" />
            Desfazer Jogada
          </button>
          <button 
            onClick={resign}
            disabled={gameOver}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Flag className="w-4 h-4" />
            Abandonar
          </button>
        </div>
      </div>

      <div className="flex-1 w-full max-w-[1600px] mx-auto p-4 lg:p-8 flex flex-col xl:flex-row gap-8 items-center xl:items-start">
      
      {/* Player info & controls */}
      <div className="flex flex-col gap-6 w-full xl:w-[350px] flex-shrink-0 order-2 xl:order-1">
        <div className="bg-neutral-800 rounded-2xl p-6 border border-neutral-700/50 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-4 h-4 rounded-full border-2 bg-black border-neutral-600" />
            <div>
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-white text-lg">Computador</h3>
              </div>
              <p className="text-sm text-neutral-400">Dificuldade: {getDifficultyName()}</p>
              
            </div>
            {isThinking && (
              <div className="ml-auto text-xs text-emerald-500 animate-pulse">Pensando...</div>
            )}
          </div>
          
          <div className="my-6 border-t border-neutral-700" />
          
          <div className="flex items-center gap-4">
            <div className="w-4 h-4 rounded-full border-2 bg-white border-neutral-300" />
            <div>
              <h3 className="font-bold text-white text-lg">{currentUser?.displayName || 'Você'}</h3>
              {currentUser && <p className="text-sm text-neutral-400">{currentUser.elo} Rating</p>}
              
            </div>
          </div>

        </div>

        <MoveHistory history={game.history()} />
      </div>

      {/* Board */}
      <div className="flex-1 flex items-center justify-center gap-2 sm:gap-6 lg:gap-12 order-1 xl:order-2 w-full px-2">
        {/* Left Side (Player's captures) */}
        <div className="flex flex-col items-center justify-center shrink-0 min-h-[400px]">
           {renderCapturedPieces(playerColor, 'vertical')}
        </div>
        <div className="w-full max-w-[700px] aspect-square mx-auto shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] relative rounded-md bg-[#181512] p-[5%] pt-[4%] border-b-[45px] border-[#0a0908] border-x-[12px] border-x-[#14120f] border-t-[12px] border-t-[#1c1815]">
        <div className="absolute inset-[3%] border border-[#b57a3e]/40 pointer-events-none z-10" />
        <div className="absolute inset-[3.5%] border-2 border-[#b57a3e]/60 pointer-events-none z-10" />
        
        <div className="absolute bottom-[-45px] left-0 right-0 h-[45px] bg-gradient-to-b from-[#111] to-[#0a0a0a] pointer-events-none rounded-b-md flex items-center justify-center">
          <div className="w-[80%] h-[2px] bg-black/80 absolute top-0" />
          <div className="w-[16px] h-[16px] rounded-full bg-gradient-to-br from-[#e5c158] to-[#6a4f15] shadow-md border border-[#3a2a0d]" />
        </div>

        <div className="relative w-full aspect-square overflow-hidden shadow-inner bg-black">
        {gameOver && (
          <div className="absolute inset-0 z-10 bg-black/70 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md overflow-y-auto">
            {!analysis ? (
              <>
                <h2 className="text-4xl font-bold text-white mb-2 mt-auto">
                  {winner === 'draw' ? 'Empate' : winner === (playerColor === 'w' ? 'white' : 'black') ? 'Você Venceu!' : 'Computador Venceu'}
                </h2>
                <p className="text-neutral-300 mb-8 text-lg">
                  {game.isCheckmate() ? 'Xeque-mate' : 
                   game.isDraw() ? 'Empate por repetição ou material insuficiente' : 
                   game.isStalemate() ? 'Empate por afogamento' : 'Desistência'}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mb-auto">
                  <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-[0_0_20px_-5px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles className="w-5 h-5" />
                    {isAnalyzing ? 'Analisando...' : 'Treinador IA'}
                  </button>
                  <button 
                    onClick={resetGame}
                    className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-3 px-8 rounded-xl transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2"
                  >
                    <RefreshCcw className="w-5 h-5" />
                    Nova Partida
                  </button>
                </div>
              </>
            ) : (
              <div className="w-full max-w-md bg-neutral-900 border border-indigo-500/30 rounded-xl p-6 text-left my-auto shadow-2xl">
                <div className="flex items-center gap-2 mb-4 text-indigo-400 border-b border-indigo-500/20 pb-3">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="font-bold text-lg">Análise do Treinador</h3>
                </div>
                <div className="prose prose-invert prose-sm max-w-none text-neutral-300 mb-6">
                  {analysis.split('\n').map((paragraph, idx) => (
                    <p key={idx} className="mb-2">{paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>
                  ))}
                </div>
                <button 
                  onClick={resetGame}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCcw className="w-5 h-5" />
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
            boardOrientation: playerColor === 'w' ? 'white' : 'black',
            darkSquareStyle: theme.darkSquareStyle,
            lightSquareStyle: theme.lightSquareStyle,
            pieces: customPieces,
            squareStyles: moveHighlights,
            dropSquareStyle: { boxShadow: 'inset 0 0 1px 6px rgba(255,255,255,0.75)' },
            animationDurationInMs: 400
          }}
        />
        </div>
      </div>
      
        
        {/* Right Side (Opponent's captures) */}
        <div className="flex flex-col items-center justify-center shrink-0 min-h-[400px]">
           {renderCapturedPieces(playerColor === 'w' ? 'b' : 'w', 'vertical')}
        </div>
      </div>
    </div>
    </div>
  );
}
