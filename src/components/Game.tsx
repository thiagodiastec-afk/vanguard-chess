import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { useTheme, CHESS_THEMES } from '../lib/themes';
import { sounds } from '../lib/sounds';
import { Chessboard } from 'react-chessboard';
import confetti from 'canvas-confetti';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { GameData, UserData } from '../types';
import { 
  Flag, Eye, Handshake, ChevronLeft, MessageSquare, ShieldAlert, 
  BrainCircuit, AlertTriangle, Clock, RefreshCcw, Home, Swords, 
  UserX, CheckCircle, Wifi, WifiOff, LogOut, Award, Sparkles
} from 'lucide-react';
import EvalBar from "./EvalBar";
import { cn } from '../lib/utils';
import ChatBox from './ChatBox';
import { getCustomPieces } from '../lib/chessPieces';
import MoveHistory from './MoveHistory';
import CapturedPieces from './CapturedPieces';
import { sendNotification } from '../lib/notifications';
import { calculateAchievements } from '../lib/achievementManager';
import { ACHIEVEMENTS } from '../lib/achievements';
import GameReview from './GameReview';

interface GameProps {
  game: GameData;
  currentUser: UserData;
  onExit: () => void;
}

export default function Game({ game, currentUser, onExit }: GameProps) {
  const localTheme = useTheme();
  const theme = React.useMemo(() => CHESS_THEMES.find(t => t.id === game.whiteThemeId) || localTheme, [game.whiteThemeId, localTheme]);
  const [chess] = useState(new Chess());
  const isInitialMount = useRef(true);
  const [fen, setFen] = useState(game.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [showCheatAlert, setShowCheatAlert] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [drawOfferFeedback, setDrawOfferFeedback] = useState<string | null>(null);

  // Time management
  const [whiteDisplayTime, setWhiteDisplayTime] = useState<number>(game.whiteTime ?? game.timeControl ?? 300);
  const [blackDisplayTime, setBlackDisplayTime] = useState<number>(game.blackTime ?? game.timeControl ?? 300);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  const safeUser = currentUser || {
    uid: 'guest',
    displayName: 'Jogador',
    elo: 1200,
    gamesPlayed: 0,
    coins: 0
  };

  const isWhite = safeUser.uid === game.whiteId;
  const isBlack = safeUser.uid === game.blackId;
  const isSpectator = !isWhite && !isBlack;
  
  const bottomName = isSpectator ? (game.whiteName || 'Brancas') : (safeUser.displayName || 'Jogador');
  const bottomElo = isSpectator ? (game.whiteElo || 1200) : (safeUser.elo || 1200);
  const bottomLabel = isSpectator ? '(Brancas)' : '(Você)';
  
  const opponentName = isSpectator 
    ? (game.blackName || 'Pretas') 
    : (isWhite ? (game.blackName || 'Oponente') : (game.whiteName || 'Oponente'));
  const opponentElo = isSpectator 
    ? (game.blackElo || 1200) 
    : (isWhite ? (game.blackElo || 1200) : (game.whiteElo || 1200));
  const topLabel = isSpectator ? '(Pretas)' : '';

  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

  // Regular clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  // Presence Heartbeat: updates presence every 4s and cleanup on unmount
  useEffect(() => {
    if (!safeUser.uid || safeUser.uid === 'guest' || isSpectator || game.status !== 'playing') return;
    const db = getDb();
    const gameRef = doc(db, 'games', game.id);

    const updatePresence = (online: boolean) => {
      const fieldHeartbeat = isWhite ? 'whiteHeartbeat' : 'blackHeartbeat';
      const fieldOnline = isWhite ? 'whiteOnline' : 'blackOnline';
      updateDoc(gameRef, {
        [fieldHeartbeat]: Date.now(),
        [fieldOnline]: online
      }).catch(() => {});
    };

    updatePresence(true);
    const interval = setInterval(() => updatePresence(true), 4000);

    const handleBeforeUnload = () => updatePresence(false);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updatePresence(false);
    };
  }, [game.id, safeUser.uid, isWhite, isSpectator, game.status]);

  // Check opponent presence & disconnection
  const opponentHeartbeat = isWhite ? game.blackHeartbeat : game.whiteHeartbeat;
  const opponentOnline = isWhite ? game.blackOnline : game.whiteOnline;
  const isOpponentDisconnected = game.status === 'playing' && !isSpectator && (
    opponentOnline === false || (opponentHeartbeat ? (currentTime - opponentHeartbeat > 20000) : false)
  );

  // Inactivity calculation (2 minutes = 120s idle on opponent's turn -> 20s warning countdown)
  const isOpponentsTurn = game.status === 'playing' && !isSpectator && ((game.turn === 'w' && !isWhite) || (game.turn === 'b' && isWhite));
  const timeSinceLastMove = Math.max(0, (currentTime - (game.lastMoveAt || currentTime)) / 1000);
  
  const isOpponentInactive = isOpponentsTurn && timeSinceLastMove >= 120;
  // Countdown 20s (from 120s to 140s)
  const inactivityCountdown = Math.max(0, Math.ceil(140 - timeSinceLastMove));

  // Sync FEN/PGN from Firebase
  useEffect(() => {
    if (game.fen) {
      if (game.fen !== chess.fen()) {
        try {
          const oldPieces = chess.board().flat().filter(p => p !== null).length;
          
          let loaded = false;
          if (game.pgn) {
            try {
              chess.loadPgn(game.pgn);
              loaded = true;
            } catch (pgnErr) {
              // fallback to load FEN directly
            }
          }
          if (!loaded) {
            chess.load(game.fen);
          }

          const newPieces = chess.board().flat().filter(p => p !== null).length;
          
          if (!isInitialMount.current) {
            sounds.playMove(newPieces < oldPieces, chess.inCheck());
          }
          
          setFen(chess.fen());
        } catch (e) {
          console.error("Invalid FEN from server", e);
          try {
            chess.load(game.fen);
            setFen(chess.fen());
          } catch (inner) {
            console.error("Could not load FEN", inner);
          }
        }
      }
    }
    isInitialMount.current = false;
  }, [game.fen, game.pgn, chess]);

  // Sync clocks
  useEffect(() => {
    setWhiteDisplayTime(game.whiteTime ?? game.timeControl ?? 0);
    setBlackDisplayTime(game.blackTime ?? game.timeControl ?? 0);
  }, [game.whiteTime, game.blackTime, game.timeControl, game.lastMoveAt]);

  // Game clock countdown loop
  useEffect(() => {
    if (game.status !== 'playing' || !game.timeControl) return;

    const intervalId = setInterval(() => {
      const now = Date.now();
      const lastMove = game.lastMoveAt || now;
      const timeSpent = Math.max(0, (now - lastMove) / 1000);
      if (game.turn === 'w') {
        const remaining = Math.max(0, (game.whiteTime ?? game.timeControl) - timeSpent);
        setWhiteDisplayTime(remaining);
        if (remaining <= 0 && !isSpectator) {
          updateDoc(doc(getDb(), 'games', game.id), { 
            status: 'black_won',
            endedReason: 'timeout',
            lastMoveAt: Date.now()
          }).catch(console.error);
        }
      } else {
        const remaining = Math.max(0, (game.blackTime ?? game.timeControl) - timeSpent);
        setBlackDisplayTime(remaining);
        if (remaining <= 0 && !isSpectator) {
          updateDoc(doc(getDb(), 'games', game.id), { 
            status: 'white_won',
            endedReason: 'timeout',
            lastMoveAt: Date.now()
          }).catch(console.error);
        }
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [game.status, game.turn, game.lastMoveAt, game.whiteTime, game.blackTime, game.timeControl, isSpectator, game.id]);

  // Notification on player turn
  useEffect(() => {
    if (game.status === 'playing') {
      const isMyTurn = !isSpectator && ((game.turn === 'w' && isWhite) || (game.turn === 'b' && isBlack));
      if (isMyTurn && !isInitialMount.current && game.lastMoveAt > Date.now() - 5000) {
        sendNotification('Sua vez de jogar!', {
          body: `É a sua vez de jogar contra ${opponentName}.`
        });
      }
    }
  }, [game.turn, game.status, isWhite, opponentName, game.lastMoveAt, isSpectator]);

  const calculateEloChange = (myElo: number, opponentEloVal: number, result: 1 | 0.5 | 0) => {
    const K = 32;
    const expectedScore = 1 / (1 + Math.pow(10, (opponentEloVal - myElo) / 400));
    return Math.round(K * (result - expectedScore));
  };

  // Fair Play Heuristics (Anti-Cheat)
  useEffect(() => {
    if (isSpectator || game.status !== 'playing') return;

    const handleVisibilityChange = () => {
      const isMyTurn = (game.turn === 'w' && isWhite) || (game.turn === 'b' && isBlack);
      if (document.visibilityState === 'hidden' && isMyTurn) {
        setCheatWarnings(prev => {
          const newCount = prev + 1;
          if (newCount >= 2) {
            setShowCheatAlert(true);
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

  // Update user stats & trophies upon game conclusion
  useEffect(() => {
    if (game.status !== 'playing' && !statsUpdated.current) {
      statsUpdated.current = true;
      const updateStats = async () => {
        try {
          if (!safeUser.uid || safeUser.uid === 'guest') return;
          const db = getDb();
          let numericResult: 1 | 0.5 | 0 = 0;
          if (game.status === 'draw') numericResult = 0.5;
          else if ((game.status === 'white_won' && isWhite) || (game.status === 'black_won' && !isWhite)) numericResult = 1;
          const userElo = Number(safeUser.elo) || 1200;
          const oppElo = Number(opponentElo) || 1200;
          const eloChange = calculateEloChange(userElo, oppElo, numericResult);
          if (isNaN(eloChange)) return;

          const updateData: any = {
            elo: increment(eloChange),
            gamesPlayed: increment(1),
            eloHistory: arrayUnion({ date: Date.now(), elo: userElo + eloChange })
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
            safeUser, 
            numericResult, 
            chess.history().length, 
            false
          );
          Object.assign(updateData, badgeUpdates);

          await updateDoc(doc(db, 'users', safeUser.uid), updateData);
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
  }, [game.status, isWhite, safeUser, opponentElo]);

  // Action: Claim Victory by Inactivity / Abandonment
  const claimVictoryByInactivity = async () => {
    if (game.status !== 'playing' || isSpectator) return;
    const db = getDb();
    const winningStatus = isWhite ? 'white_won' : 'black_won';
    await updateDoc(doc(db, 'games', game.id), {
      status: winningStatus,
      endedReason: 'inactivity',
      abandonedBy: isWhite ? game.blackId : game.whiteId,
      lastMoveAt: Date.now()
    });
  };

  // Action: Declare / Agree Draw
  const claimDraw = async () => {
    if (game.status !== 'playing' || isSpectator) return;
    const db = getDb();
    await updateDoc(doc(db, 'games', game.id), {
      status: 'draw',
      endedReason: 'draw_agreement',
      drawOffer: null,
      lastMoveAt: Date.now()
    });
  };

  // Action: Offer Draw
  const offerDraw = async () => {
    if (game.status !== 'playing' || isSpectator) return;
    const db = getDb();
    await updateDoc(doc(db, 'games', game.id), {
      drawOffer: isWhite ? 'w' : 'b'
    });
    setDrawOfferFeedback('Proposta de empate enviada!');
    setTimeout(() => setDrawOfferFeedback(null), 6000);
  };

  // Action: Decline Draw Offer
  const declineDraw = async () => {
    const db = getDb();
    await updateDoc(doc(db, 'games', game.id), {
      drawOffer: null
    });
  };

  // Action: Resign Game
  const confirmResign = async () => {
    if (game.status !== 'playing' || isSpectator) return;
    const db = getDb();
    const winningStatus = isWhite ? 'black_won' : 'white_won';
    await updateDoc(doc(db, 'games', game.id), {
      status: winningStatus,
      endedReason: 'resignation',
      resignedBy: safeUser.uid,
      lastMoveAt: Date.now()
    });
    setShowResignConfirm(false);
  };

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
            ? 'radial-gradient(circle, rgba(239, 68, 68, 0.45) 85%, transparent 85%)'
            : 'radial-gradient(circle, rgba(255, 255, 255, 0.35) 25%, transparent 25%)',
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
    const isMyTurn = !isSpectator && ((chess.turn() === 'w' && isWhite) || (chess.turn() === 'b' && isBlack));
    if (!isMyTurn || game.status !== 'playing') return;

    function resetFirstMove(sq: string) {
      setMoveFrom(sq);
      getMoveOptions(sq);
    }

    if (!moveFrom) {
      const hasPiece = chess.get(square as any);
      if (hasPiece && hasPiece.color === (isWhite ? 'w' : 'b')) {
        resetFirstMove(square);
      }
      return;
    }

    try {
      const move = chess.move({
        from: moveFrom,
        to: square,
        promotion: 'q',
      });

      if (move) {
        sounds.playMove(move.captured != null, chess.inCheck());
        setFen(chess.fen());
        setMoveFrom(null);
        setOptionSquares({});
        
        const db = getDb();
        const gameRef = doc(db, 'games', game.id);
        
        let newStatus: GameData['status'] = game.status;
        let endedReason: GameData['endedReason'] = undefined;

        if (chess.isCheckmate()) {
          newStatus = isWhite ? 'white_won' : 'black_won';
          endedReason = 'checkmate';
        } else if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) {
          newStatus = 'draw';
          endedReason = 'stalemate';
        }

        const timeSpent = (Date.now() - (game.lastMoveAt || Date.now())) / 1000;
        let newWhiteTime = game.whiteTime ?? game.timeControl ?? 0;
        let newBlackTime = game.blackTime ?? game.timeControl ?? 0;

        if (game.timeControl) {
          if (chess.turn() === 'b') {
            newWhiteTime = Math.max(0, newWhiteTime - timeSpent);
          } else {
            newBlackTime = Math.max(0, newBlackTime - timeSpent);
          }
        }

        const updateData: Record<string, any> = {
          fen: chess.fen(),
          pgn: chess.pgn() || '',
          turn: chess.turn(),
          lastMoveAt: Date.now(),
          status: newStatus,
          whiteTime: newWhiteTime,
          blackTime: newBlackTime,
          drawOffer: null
        };
        if (endedReason) {
          updateData.endedReason = endedReason;
        }

        updateDoc(gameRef, updateData).catch(err => {
          console.error("Error updating online game move:", err);
        });

        return;
      }
    } catch (e) {
      // invalid move
    }

    const hasPiece = chess.get(square as any);
    if (hasPiece && hasPiece.color === (isWhite ? 'w' : 'b')) {
      resetFirstMove(square);
    } else {
      setMoveFrom(null);
      setOptionSquares({});
    }
  };

  const onDrop = (argsOrSource: any, argTarget?: any, argPiece?: any) => {
    let sourceSquare = '';
    let targetSquare = '';

    if (typeof argsOrSource === 'object' && argsOrSource !== null) {
      sourceSquare = argsOrSource.sourceSquare;
      targetSquare = argsOrSource.targetSquare;
    } else {
      sourceSquare = argsOrSource;
      targetSquare = argTarget;
    }

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
        setMoveFrom(null);
        setOptionSquares({});
        
        const db = getDb();
        const gameRef = doc(db, 'games', game.id);
        
        let newStatus: GameData['status'] = game.status;
        let endedReason: GameData['endedReason'] = undefined;

        if (chess.isCheckmate()) {
          newStatus = isWhite ? 'white_won' : 'black_won';
          endedReason = 'checkmate';
        } else if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) {
          newStatus = 'draw';
          endedReason = 'stalemate';
        }

        const timeSpent = (Date.now() - (game.lastMoveAt || Date.now())) / 1000;
        let newWhiteTime = game.whiteTime ?? game.timeControl ?? 0;
        let newBlackTime = game.blackTime ?? game.timeControl ?? 0;

        if (game.timeControl) {
          if (chess.turn() === 'b') {
            newWhiteTime = Math.max(0, newWhiteTime - timeSpent);
          } else {
            newBlackTime = Math.max(0, newBlackTime - timeSpent);
          }
        }

        const updateData: Record<string, any> = {
          fen: chess.fen(),
          pgn: chess.pgn() || '',
          turn: chess.turn(),
          lastMoveAt: Date.now(),
          status: newStatus,
          whiteTime: newWhiteTime,
          blackTime: newBlackTime,
          drawOffer: null
        };
        if (endedReason) {
          updateData.endedReason = endedReason;
        }

        updateDoc(gameRef, updateData).catch(err => {
          console.error("Error updating online game move:", err);
        });

        return true;
      }
    } catch (e) {
      setMoveFrom(null);
      setOptionSquares({});
      return false;
    }
    setMoveFrom(null);
    setOptionSquares({});
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

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getEndReasonDescription = () => {
    if (game.endedReason === 'checkmate') return 'Xeque-mate!';
    if (game.endedReason === 'timeout') return 'Vitória por tempo esgotado.';
    if (game.endedReason === 'inactivity') return 'Oponente ausente / inativo por mais de 2 minutos.';
    if (game.endedReason === 'resignation') {
      const isMyResignation = game.resignedBy === safeUser.uid;
      return isMyResignation ? 'Você desistiu da partida.' : 'Seu oponente desistiu da partida!';
    }
    if (game.endedReason === 'abandonment') return 'Partida cancelada por abandono.';
    if (game.endedReason === 'draw_agreement') return 'Empate aceito por mútuo acordo.';
    if (game.endedReason === 'stalemate') return 'Empate por afogamento ou repetição.';
    if (game.status === 'abandoned') return 'Partida encerrada.';
    if (game.status === 'draw') return 'Partida empatada.';
    return 'Fim de jogo.';
  };

  const hasOpponentOfferedDraw = game.drawOffer && ((game.drawOffer === 'w' && !isWhite) || (game.drawOffer === 'b' && isWhite));

  return (
    <div className="flex-1 w-full max-w-[1600px] mx-auto p-1.5 sm:p-3 lg:p-4 flex flex-col xl:flex-row gap-3 lg:gap-5 items-center xl:items-start justify-center relative">
      
      {/* Fair play alert */}
      {showCheatAlert && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-500/95 text-zinc-950 px-6 py-3 rounded-2xl font-bold shadow-2xl flex items-center gap-3 backdrop-blur-md animate-bounce border border-amber-300">
          <ShieldAlert className="w-5 h-5 text-zinc-950" />
          <span>Aviso Fair Play: Mantenha o foco na janela da partida.</span>
        </div>
      )}

      {/* Opponent Inactivity Banner / Action Bar (2 minutes idle -> 20s countdown) */}
      {isOpponentInactive && game.status === 'playing' && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-zinc-900/95 border-2 border-amber-500/80 rounded-3xl p-5 shadow-2xl backdrop-blur-xl text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center animate-pulse">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    Oponente Inativo
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-mono font-bold">
                      {inactivityCountdown}s
                    </span>
                  </h4>
                  <p className="text-xs text-zinc-400">Nenhum lance feito há mais de 2 minutos.</p>
                </div>
              </div>
            </div>

            <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-4 overflow-hidden">
              <div 
                className="bg-amber-500 h-full transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, (inactivityCountdown / 20) * 100))}%` }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={claimVictoryByInactivity}
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Award className="w-4 h-4" />
                Reivindicar Vitória
              </button>
              <button
                onClick={claimDraw}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Handshake className="w-4 h-4" />
                Declarar Empate
              </button>
              <button
                onClick={onExit}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                Sair do Jogo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opponent Disconnected Banner */}
      {isOpponentDisconnected && !isOpponentInactive && game.status === 'playing' && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/90 border border-amber-500/40 text-amber-300 px-5 py-2.5 rounded-2xl text-xs font-semibold shadow-xl flex items-center gap-3 backdrop-blur-md">
          <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>Oponente desconectou ou fechou a página.</span>
          <button
            onClick={claimVictoryByInactivity}
            className="ml-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-3 py-1 rounded-lg text-xs transition-colors"
          >
            Reivindicar Vitória
          </button>
        </div>
      )}

      {/* Incoming Draw Offer Modal / Banner */}
      {hasOpponentOfferedDraw && game.status === 'playing' && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border-2 border-emerald-500 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-white flex items-center gap-4 animate-bounce">
          <Handshake className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">{opponentName} ofereceu um empate.</p>
            <p className="text-xs text-zinc-400">Aceitar encerrará a partida em igualdade.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={claimDraw}
              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-3 py-1.5 rounded-xl text-xs transition-all"
            >
              Aceitar
            </button>
            <button
              onClick={declineDraw}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-3 py-1.5 rounded-xl text-xs transition-all"
            >
              Recusar
            </button>
          </div>
        </div>
      )}

      {/* Left Side: Board Area (Order 1) */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[min(100%,calc(100dvh-120px))] xl:max-w-[min(calc(100dvh-120px),740px)] order-1">
        
        {/* Top Player (Opponent) Bar */}
        <div className="w-full flex items-center justify-between mb-1.5 sm:mb-2 px-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 shadow-sm", isWhite ? "bg-black border-neutral-600" : "bg-white border-neutral-300")} />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-white text-sm sm:text-base leading-tight">{opponentName} {topLabel}</span>
                {isOpponentDisconnected ? (
                  <span className="flex items-center gap-1 text-[9px] sm:text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full font-medium">
                    <WifiOff className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Offline
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[9px] sm:text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full font-medium">
                    <Wifi className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Online
                  </span>
                )}
              </div>
              <span className="text-[11px] sm:text-xs text-emerald-400 font-bold">{opponentElo} Elo</span>
            </div>
            <div className="ml-2 hidden sm:block">
              <CapturedPieces id="opponent-captured-pieces" fen={chess.fen()} color={isWhite ? 'b' : 'w'} />
            </div>
          </div>
          {game.timeControl && (
            <div className={cn(
              "px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl border font-mono text-base sm:text-xl font-bold shadow-xl min-w-[75px] sm:min-w-[85px] text-center transition-all",
              (isWhite ? blackDisplayTime : whiteDisplayTime) < 30 ? "bg-red-950/80 border-red-600 text-red-400 animate-pulse" : "bg-zinc-900 border-zinc-800 text-white"
            )}>
              {formatTime(isSpectator ? blackDisplayTime : (isWhite ? blackDisplayTime : whiteDisplayTime))}
            </div>
          )}
        </div>

        {/* Board & EvalBar */}
        <div className="w-full flex gap-2 sm:gap-3 items-center justify-center">
          <div className="py-1 hidden md:block self-stretch">
             <EvalBar game={chess} isFlipped={!isWhite} />
          </div>
          
          {/* Pure Square Board Container with Unclipped Framing */}
          <div className="flex-1 max-w-[min(calc(100dvh-180px),680px)] w-full relative">
            <div className="w-full aspect-square relative rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#2a170e] via-[#1a0c06] to-[#0f0703] p-1.5 sm:p-2.5 border-2 sm:border-4 border-[#613318] shadow-[0_15px_40px_rgba(0,0,0,0.8)] flex flex-col justify-between overflow-hidden">
              
              {/* Inner 1:1 chessboard */}
              <div className="w-full h-full relative rounded-lg overflow-hidden shadow-inner">
                {/* @ts-ignore react-chessboard types in v5 */}
                <Chessboard
                  options={{
                    id: `OnlineGame-${game.id}`,
                    position: fen,
                    onPieceDrop: onDrop as any,
                    onSquareClick: onSquareClick as any,
                    onPieceClick: onPieceClick as any,
                    boardOrientation: isSpectator ? "white" : (isWhite ? "white" : "black"),
                    darkSquareStyle: theme.darkSquareStyle,
                    lightSquareStyle: theme.lightSquareStyle,
                    pieces: getCustomPieces(theme.pieceSet || '3d_staunton'),
                    squareStyles: { ...moveHighlights, ...optionSquares },
                    animationDurationInMs: 200
                  }}
                />
              </div>

              {/* Bottom Subtle Vanguard Label */}
              <div className="w-full pt-1 flex items-center justify-center gap-2 opacity-50 select-none pointer-events-none">
                <div className="h-[1px] w-6 sm:w-10 bg-amber-600/40" />
                <span className="text-[8px] sm:text-[9px] font-serif tracking-[0.25em] text-amber-200/80 font-bold uppercase">Vanguard Chess</span>
                <div className="h-[1px] w-6 sm:w-10 bg-amber-600/40" />
              </div>
            </div>

            {/* Game Over Overlay */}
            {(game.status === 'white_won' || game.status === 'black_won' || game.status === 'draw' || game.status === 'abandoned') && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md rounded-2xl p-4">
                <div className="bg-zinc-900 border-2 border-emerald-500/60 p-6 sm:p-8 rounded-3xl shadow-2xl text-center max-w-md w-full transform animate-in zoom-in duration-300">
                  <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-4">
                    {game.status === 'draw' ? (
                      <Handshake className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <Award className="w-8 h-8 text-emerald-400" />
                    )}
                  </div>
                  
                  <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">
                    {game.status === 'draw' ? 'Empate' : 
                     (game.status === 'white_won' && isWhite) || (game.status === 'black_won' && !isWhite) 
                       ? 'Vitória!' 
                       : 'Derrota'}
                  </h2>

                  <p className="text-sm font-semibold text-emerald-400 mb-2 uppercase tracking-wider">
                    {game.status === 'white_won' ? 'Vitória das Brancas' : 
                     game.status === 'black_won' ? 'Vitória das Pretas' : 
                     'Partida Empatada'}
                  </p>

                  <p className="text-xs text-zinc-400 mb-6 bg-zinc-800/80 py-2 px-3 rounded-xl border border-zinc-700/50">
                    {getEndReasonDescription()}
                  </p>

                  <div className="flex flex-col gap-2.5">
                    <button
                      onClick={onExit}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-3 px-6 rounded-2xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
                    >
                      <RefreshCcw className="w-4 h-4" />
                      Jogar Novamente / Novo Jogo
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setShowReview(true)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-zinc-700"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Revisão IA
                      </button>
                      <button
                        onClick={onExit}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-zinc-700"
                      >
                        <Home className="w-3.5 h-3.5 text-zinc-400" />
                        Menu Principal
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Player (You) Bar & Action Controls */}
        <div className="w-full flex items-center justify-between mt-1.5 sm:mt-2 px-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 shadow-sm", isWhite ? "bg-white border-neutral-300" : "bg-black border-neutral-600")} />
            <div className="flex flex-col">
              <span className="font-bold text-white text-sm sm:text-base leading-tight">{bottomName} {bottomLabel}</span>
              <span className="text-[11px] sm:text-xs text-emerald-400 font-bold">{bottomElo} Elo</span>
            </div>
            <div className="ml-2 hidden sm:block">
              <CapturedPieces id="my-captured-pieces" fen={chess.fen()} color={isWhite ? 'w' : 'b'} />
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* In-game action controls */}
            <div className="flex gap-1.5 sm:gap-2">
              {!isSpectator && game.status === 'playing' && (
                <>
                  <button
                    onClick={offerDraw}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold py-1.5 px-2.5 sm:py-2 sm:px-3 rounded-xl flex items-center gap-1.5 transition-all text-xs border border-zinc-700/60 shadow-sm"
                    title="Oferecer Empate"
                  >
                    <Handshake className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                    <span className="hidden sm:inline">Empate</span>
                  </button>

                  <button
                    onClick={() => setShowResignConfirm(true)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-1.5 px-2.5 sm:py-2 sm:px-3 rounded-xl flex items-center gap-1.5 transition-all text-xs border border-red-500/20 shadow-sm"
                    title="Abandonar / Desistir"
                  >
                    <Flag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
                    <span className="hidden sm:inline">Desistir</span>
                  </button>
                </>
              )}

              {/* Exit button when game is over or spectator */}
              {(isSpectator || game.status !== 'playing') && (
                <button
                  onClick={onExit}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-1.5 px-3 sm:py-2 sm:px-4 rounded-xl flex items-center gap-1.5 transition-colors text-xs border border-zinc-700"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />
                  Sair
                </button>
              )}

              {!isSpectator && (
                <button
                  onClick={toggleSpectatorAccess}
                  className={cn(
                    "font-bold py-1.5 px-2.5 sm:py-2 sm:px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors text-xs border",
                    (isWhite ? game.spectatorsAllowedWhite : game.spectatorsAllowedBlack)
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border-zinc-700"
                  )}
                  title="Permitir Espectadores"
                >
                  <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
            </div>

            {game.timeControl && (
              <div className={cn(
                "px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl border font-mono text-base sm:text-xl font-bold shadow-xl min-w-[75px] sm:min-w-[85px] text-center transition-all",
                (isWhite ? whiteDisplayTime : blackDisplayTime) < 30 ? "bg-red-950/80 border-red-600 text-red-400 animate-pulse" : "bg-zinc-900 border-zinc-800 text-emerald-400"
              )}>
                {formatTime(isSpectator ? whiteDisplayTime : (isWhite ? whiteDisplayTime : blackDisplayTime))}
              </div>
            )}
          </div>
        </div>

        {drawOfferFeedback && (
          <p className="text-xs text-emerald-400 font-semibold mt-1.5 animate-in fade-in">{drawOfferFeedback}</p>
        )}
      </div>

      {/* Right Sidebar: History & Chat (Order 2) */}
      <div className="w-full xl:w-[320px] 2xl:w-[350px] flex-shrink-0 flex flex-col gap-2.5 sm:gap-3 order-2 xl:h-[min(calc(100dvh-120px),740px)]">
        <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden h-[180px] xl:h-[40%] flex-shrink-0">
          <MoveHistory history={chess.history()} />
        </div>
        <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden h-[250px] xl:h-[60%] flex-1 min-h-0">
          <ChatBox 
            roomId={`game_${game.id}`} 
            currentUser={currentUser} 
            title="Chat da Partida"
            className="flex-1 h-full"
          />
        </div>
      </div>

      {/* Resign Confirmation Modal */}
      {showResignConfirm && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-zinc-900 rounded-3xl p-6 sm:p-8 w-full max-w-sm border border-red-500/40 shadow-2xl text-center">
            <div className="w-14 h-14 bg-red-500/10 border-2 border-red-500/40 rounded-full flex items-center justify-center mx-auto mb-4">
              <Flag className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Abandonar Partida?</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Você concederá a vitória ao oponente e seus pontos Elo serão recalculados.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResignConfirm(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 px-4 rounded-xl text-xs transition-colors"
              >
                Continuar Jogando
              </button>
              <button
                onClick={confirmResign}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors shadow-lg shadow-red-600/30"
              >
                Sim, Desistir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Review with AI Modal */}
      {showReview && (
        <GameReview 
          pgn={game.pgn} 
          playerWhiteName={game.whiteName}
          playerBlackName={game.blackName}
          onClose={() => setShowReview(false)} 
        />
      )}
    </div>
  );
}
