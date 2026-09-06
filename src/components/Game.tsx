import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { useTheme } from '../lib/themes';
import { sounds } from '../lib/sounds';
import { Chessboard } from 'react-chessboard';
import confetti from 'canvas-confetti';
import { doc, updateDoc, increment, arrayUnion, addDoc, collection } from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { GameData, UserData } from '../types';
import { Flag, Handshake, ChevronLeft, MessageSquare, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import ChatBox from './ChatBox';
import { customPieces } from '../lib/chessPieces';
import MoveHistory from './MoveHistory';
import { sendNotification } from '../lib/notifications';
import { calculateAchievements } from '../lib/achievementManager';
import { ACHIEVEMENTS } from '../lib/achievements';

interface GameProps {
  game: GameData;
  currentUser: UserData;
  onExit: () => void;
}

export default function Game({ game, currentUser, onExit }: GameProps) {
  const theme = useTheme();
  const [chess] = useState(new Chess());
  const isInitialMount = useRef(true);
  const [fen, setFen] = useState(game.fen);
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [showCheatAlert, setShowCheatAlert] = useState(false);
  const [reported, setReported] = useState(false);
  
  const isWhite = currentUser.uid === game.whiteId;
  const isBlack = currentUser.uid === game.blackId;
  const isSpectator = !isWhite && !isBlack;
  
  const myColor = isBlack ? 'black' : 'white';
  
  const bottomName = isSpectator ? game.whiteName : currentUser.displayName;
  const bottomElo = isSpectator ? game.whiteElo : currentUser.elo;
  const bottomLabel = isSpectator ? '(Brancas)' : '(Você)';
  
  const opponentName = isSpectator ? game.blackName : (isWhite ? game.blackName : game.whiteName);
  const opponentElo = isSpectator ? game.blackElo : (isWhite ? game.blackElo : game.whiteElo);
  const topLabel = isSpectator ? '(Pretas)' : '';

    const moveHighlights = useMemo(() => {
    const history = chess.history({ verbose: true });
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

    if (chess.isCheck()) {
      const turn = chess.turn();
      const board = chess.board();
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
  }, [fen, chess]);

  // Sync with Firebase
  useEffect(() => {
    if (game.fen !== chess.fen()) {
      try {
        const oldPieces = chess.board().flat().filter(p => p !== null).length;
        if (game.pgn) {
          chess.loadPgn(game.pgn);
        } else {
          chess.load(game.fen);
        }
        const newPieces = chess.board().flat().filter(p => p !== null).length;
        
        if (!isInitialMount.current) {
          sounds.playMove(newPieces < oldPieces, chess.inCheck());
        }
        
        setFen(game.fen);
      } catch (e) {
        console.error("Invalid FEN from server", e);
      }
    }
    isInitialMount.current = false;
  }, [game.fen, chess]);

  useEffect(() => {
    if (game.status === 'playing') {
      const isMyTurn = !isSpectator && ((game.turn === 'w' && isWhite) || (game.turn === 'b' && isBlack));
      if (isMyTurn && !isInitialMount.current && game.lastMoveAt > Date.now() - 5000) {
        sendNotification('Sua vez de jogar!', {
          body: `É a sua vez de jogar contra ${opponentName}.`
        });
      }
    }
  }, [game.turn, game.status, isWhite, opponentName, game.lastMoveAt]);


  const calculateEloChange = (myElo: number, opponentElo: number, result: 1 | 0.5 | 0) => {
    const K = 32;
    const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - myElo) / 400));
    return Math.round(K * (result - expectedScore));
  };


  // Fair Play Heuristics (Anti-Cheat)
  useEffect(() => {
    if (isSpectator || game.status !== 'playing') return;

    const handleVisibilityChange = () => {
      const isMyTurn = (game.turn === 'w' && isWhite) || (game.turn === 'b' && isBlack);
      // If user leaves the tab during their turn, it's highly suspicious (engine checking)
      if (document.visibilityState === 'hidden' && isMyTurn) {
        setCheatWarnings(prev => {
          const newCount = prev + 1;
          if (newCount >= 2) {
            setShowCheatAlert(true);
            // In a real Server-Authority setup, we would send this flag to the server to analyze their moves
            setTimeout(() => setShowCheatAlert(false), 5000);
          }
          return newCount;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [game.status, game.turn, isWhite, isBlack, isSpectator]);

  const statsUpdated = useRef(false);

  useEffect(() => {
    if (game.status !== 'playing' && !statsUpdated.current) {
      statsUpdated.current = true;
      const updateStats = async () => {
        try {
          const db = getDb();
          let numericResult: 1 | 0.5 | 0 = 0;
          if (game.status === 'draw') numericResult = 0.5;
          else if ((game.status === 'white_won' && isWhite) || (game.status === 'black_won' && !isWhite)) numericResult = 1;
          const eloChange = calculateEloChange(currentUser.elo, opponentElo, numericResult);
          const updateData: any = {
            elo: increment(eloChange),
            gamesPlayed: increment(1),
            eloHistory: arrayUnion({ date: Date.now(), elo: currentUser.elo + eloChange })
          };
          if (numericResult === 1) { 
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#10b981', '#fbbf24', '#ffffff']
            });
            updateData['stats.wins'] = increment(1); 
            updateData['coins'] = increment(50); 
          }
          else if (numericResult === 0) updateData['stats.losses'] = increment(1);
          else { updateData['stats.draws'] = increment(1); updateData['coins'] = increment(10); }

          const { updates: badgeUpdates, newBadges } = calculateAchievements(
            currentUser, 
            numericResult, 
            chess.history().length, 
            false
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
        } catch (error) {
          console.error("Failed to update user stats:", error);
        }
      };
      
      updateStats();
    }
  }, [game.status, isWhite, currentUser, opponentElo]);

  const handleGameEnd = async (result: 'white_won' | 'black_won' | 'draw') => {
    const db = getDb();
    
    // Update game status
    await updateDoc(doc(db, 'games', game.id), {
      status: result,
      lastMoveAt: Date.now()
    });
  };

  const onDrop = (argsOrSource: any, argTarget?: any, argPiece?: any) => {
    let sourceSquare = '';
    let targetSquare = '';
    let pieceStr = '';

    if (typeof argsOrSource === 'object' && argsOrSource !== null) {
      // react-chessboard v5 API
      sourceSquare = argsOrSource.sourceSquare;
      targetSquare = argsOrSource.targetSquare;
      pieceStr = typeof argsOrSource.piece === 'string' ? argsOrSource.piece : (argsOrSource.piece?.piece || argsOrSource.piece?.pieceType || '');
    } else {
      // old API
      sourceSquare = argsOrSource;
      targetSquare = argTarget;
      pieceStr = argPiece;
    }

    // Only allow moves if it's my turn
    const isMyTurn = !isSpectator && ((chess.turn() === 'w' && isWhite) || (chess.turn() === 'b' && isBlack));
    if (!isMyTurn || game.status !== 'playing') return false;

    try {
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move) {
        sounds.playMove(move.captured != null, chess.inCheck());
        setFen(chess.fen());
        
        const db = getDb();
        const gameRef = doc(db, 'games', game.id);
        
        let newStatus: GameData['status'] = game.status;
        if (chess.isCheckmate()) {
          newStatus = isWhite ? 'white_won' : 'black_won';
        } else if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) {
          newStatus = 'draw';
        }

        updateDoc(gameRef, {
          fen: chess.fen(),
          pgn: chess.pgn(),
          turn: chess.turn(),
          lastMoveAt: Date.now(),
          status: newStatus
        }).then(() => {
          if (newStatus !== 'playing') {
            handleGameEnd(newStatus as 'white_won' | 'black_won' | 'draw');
          }
        });

        return true;
      }
    } catch (e) {
      // Invalid move
      return false;
    }
    return false;
  };

  
  const toggleSpectatorAccess = async () => {
    if (isSpectator) return;
    const db = getDb();
    const gameRef = doc(db, 'games', game.id);
    const field = isWhite ? 'spectatorsAllowedWhite' : 'spectatorsAllowedBlack';
    const currentValue = isWhite ? game.spectatorsAllowedWhite : game.spectatorsAllowedBlack;
    try {
      await updateDoc(gameRef, {
        [field]: !currentValue
      });
    } catch (e) {
      console.error(e);
    }
  };

  const resign = async () => {
    if (game.status !== 'playing') return;
    const newStatus = isWhite ? 'black_won' : 'white_won';
    await handleGameEnd(newStatus);
  };

  
  const renderCapturedPieces = (color: 'w' | 'b', layout: 'horizontal' | 'vertical' = 'horizontal') => {
    const history = chess.history({ verbose: true });
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

  return (
    <div className="flex-1 w-full max-w-[1600px] mx-auto p-4 lg:p-8 flex flex-col xl:flex-row gap-8 items-center xl:items-start">
      
      {/* Player info & controls (Desktop Left / Mobile Top) */}
      <div className="flex flex-col gap-6 w-full xl:w-[350px] flex-shrink-0 order-2 xl:order-1">
        <div className="bg-neutral-800 rounded-2xl p-6 border border-neutral-700/50 shadow-xl">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-4 h-4 rounded-full border-2",
              isWhite ? "bg-black border-neutral-600" : "bg-white border-neutral-300"
            )} />
            <div>
              <h3 className="font-bold text-lg text-white">{opponentName} {topLabel}</h3>
              <p className="text-sm text-emerald-400 font-medium">{opponentElo} Elo</p>
              
            </div>
          </div>
        </div>

        <div className="bg-neutral-800 rounded-2xl p-6 border border-neutral-700/50 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-4 mb-2">
            <div className={cn(
              "w-4 h-4 rounded-full border-2",
              isWhite ? "bg-white border-neutral-300" : "bg-black border-neutral-600"
            )} />
            <div>
              <h3 className="font-bold text-lg text-white">{bottomName} {bottomLabel}</h3>
              <p className="text-sm text-emerald-400 font-medium">{bottomElo} Elo</p>
              
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            {!isSpectator && (
              <button
                onClick={toggleSpectatorAccess}
                className={cn(
                  "flex-1 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm",
                  (isWhite ? game.spectatorsAllowedWhite : game.spectatorsAllowedBlack)
                    ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                    : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                )}
                title="Permitir Espectadores"
              >
                Espectadores: {(isWhite ? game.spectatorsAllowedWhite : game.spectatorsAllowedBlack) ? 'Sim' : 'Não'}
              </button>
            )}
            
            {isSpectator && (
              <button
                onClick={onExit}
                className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
              >
                Sair (Espectador)
              </button>
            )}
            
            {!isSpectator && (
              <button 
                onClick={resign}
              disabled={game.status !== 'playing'}
              className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Flag className="w-4 h-4" />
              Abandonar
              </button>
            )}
          </div>
        </div>

        <MoveHistory history={chess.history()} />
        
        {/* Game Chat inside the sidebar */}
        <ChatBox 
          roomId={`game_${game.id}`} 
          currentUser={currentUser} 
          title="Chat da Partida"
          className="flex-1 min-h-[300px]"
        />
      </div>

      {/* Board */}
      <div className="flex-1 flex items-center justify-center gap-2 sm:gap-6 lg:gap-12 order-1 xl:order-2 w-full px-2">
        {/* Left Side (Player's captures - pieces captured by bottom player) */}
        <div className="flex flex-col items-center justify-center shrink-0 min-h-[400px]">
           {renderCapturedPieces(isWhite ? 'w' : 'b', 'vertical')}
        </div>
        <div className="w-full max-w-[700px] aspect-square mx-auto shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] relative rounded-md bg-[#181512] p-[5%] pt-[4%] border-b-[45px] border-[#0a0908] border-x-[12px] border-x-[#14120f] border-t-[12px] border-t-[#1c1815]">
        <div className="absolute inset-[3%] border border-[#b57a3e]/40 pointer-events-none z-10" />
        <div className="absolute inset-[3.5%] border-2 border-[#b57a3e]/60 pointer-events-none z-10" />
        
        <div className="absolute bottom-[-45px] left-0 right-0 h-[45px] bg-gradient-to-b from-[#111] to-[#0a0a0a] pointer-events-none rounded-b-md flex items-center justify-center">
          <div className="w-[80%] h-[2px] bg-black/80 absolute top-0" />
          <div className="w-[16px] h-[16px] rounded-full bg-gradient-to-br from-[#e5c158] to-[#6a4f15] shadow-md border border-[#3a2a0d]" />
        </div>

        <div className="relative w-full aspect-square overflow-hidden shadow-inner bg-black">
        {game.status !== 'playing' && (
          <div className="absolute inset-0 z-10 bg-black/60 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
            <h2 className="text-4xl font-bold text-white mb-2">
              {game.status === 'draw' ? 'Empate' : 
               (game.status === 'white_won' && isWhite) || (game.status === 'black_won' && !isWhite) ? 'Vitória!' : 'Derrota'}
            </h2>
            <p className="text-emerald-400 font-medium mb-6">
              A partida terminou. Retorne ao lobby.
            </p>
            <button
              onClick={onExit}
              className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-3 px-6 rounded-xl transition-all active:scale-95"
            >
              Voltar ao Início
            </button>
          </div>
        )}
        {/* @ts-ignore react-chessboard types are broken in v5 */}
        <Chessboard 
            options={{
              id: "Game",
              position: game.fen,
              onPieceDrop: onDrop as any,
              boardOrientation: myColor,
              darkSquareStyle: theme.darkSquareStyle,
              lightSquareStyle: theme.lightSquareStyle,
              pieces: customPieces,
              squareStyles: moveHighlights,
              animationDurationInMs: 400,
              dropSquareStyle: { boxShadow: 'inset 0 0 1px 6px rgba(255,255,255,0.75)' }
            }}
          />
        </div>
      </div>
      
        
        {/* Right Side (Opponent's captures - pieces captured by top player) */}
        <div className="flex flex-col items-center justify-center shrink-0 min-h-[400px]">
           {renderCapturedPieces(isWhite ? 'b' : 'w', 'vertical')}
        </div>
      </div>
    </div>
  );
}
