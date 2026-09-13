import { useEffect, useState } from 'react';
import { collection, doc, getDocs, setDoc, deleteDoc, runTransaction, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { UserData, QueueEntry, GameData } from '../types';
import { Loader2, Swords, UserCircle, Bot, ChevronDown, ChevronUp, Link as LinkIcon, Copy, Target, CheckCircle2, X, Users, MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface LobbyProps {
  currentUser: UserData | null;
  onPlayComputer: (difficulty: string) => void;
  onPlayLocal?: () => void;
  onSpectate?: (gameId: string) => void;
  onLoginRequest?: () => void;
}

export default function Lobby({ currentUser, onPlayComputer, onPlayLocal, onSpectate, onLoginRequest }: LobbyProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBotMenu, setShowBotMenu] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteGameId, setInviteGameId] = useState<string | null>(null);
  const [liveGames, setLiveGames] = useState<GameData[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<UserData[]>([]);
  const [hasSavedBotGame, setHasSavedBotGame] = useState(false);
  const [timeControl, setTimeControl] = useState<number>(300); // 5 min default

  useEffect(() => {
    if (localStorage.getItem('vanguard_chess_bot_save')) {
      setHasSavedBotGame(true);
    }
  }, []);

  useEffect(() => {
    const db = getDb();
    
    // Listen to online users
    const usersQuery = query(
      collection(db, 'users'),
      where('isOnline', '==', true),
      orderBy('lastSeen', 'desc'),
      limit(20)
    );
    
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const users: UserData[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as UserData;
        if (!data.uid) data.uid = doc.id;
        if (data.uid !== currentUser?.uid) { // Optional: exclude self, or keep it. Let's keep it but mark it.
           users.push(data);
        }
      });
      setOnlineUsers(users);
    });
    
    return unsubscribeUsers;
  }, [currentUser]);

  useEffect(() => {
    const db = getDb();
    const gamesQuery = query(
      collection(db, 'games'),
      where('status', '==', 'playing'),
      where('spectatorsAllowedWhite', '==', true),
      where('spectatorsAllowedBlack', '==', true),
      limit(10)
    );
    
    const unsubscribe = onSnapshot(gamesQuery, (snapshot) => {
      const games = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GameData));
      setLiveGames(games);
    });
    
    return unsubscribe;
  }, []);


  useEffect(() => {
    if (!currentUser) return;
    const db = getDb();
    const queueRef = doc(db, 'queue', currentUser.uid);
    
    // Clear any stale queue document when lobby mounts to avoid auto-searching
    deleteDoc(queueRef).catch(console.error);
    
  }, [currentUser?.uid]);


  const createInvite = async () => {
    if (!currentUser) {
      onLoginRequest?.();
      return;
    }
    setError(null);
    try {
      const db = getDb();
      const newGameRef = doc(collection(db, 'games'));
      
      const newGame: any = {
        whiteId: currentUser.uid,
        whiteName: currentUser.displayName || 'Jogador',
        whiteElo: currentUser.elo || 1200,
        blackId: '',
        blackName: '',
        blackElo: 1200,
        status: 'waiting_friend',
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        pgn: '',
        turn: 'w',
        whiteThemeId: currentUser.activeTheme || 'luxury',
        lastMoveAt: Date.now(),
        timeControl,
        whiteTime: timeControl,
        blackTime: timeControl,
        
        spectatorsAllowedWhite: true,
        spectatorsAllowedBlack: true,
      };

      await setDoc(newGameRef, newGame);
      setInviteGameId(newGameRef.id);
      
      const link = window.location.origin + '?invite=' + newGameRef.id;
      setInviteLink(link);
      navigator.clipboard.writeText(link);
    } catch (e: any) {
      setError(e.message || 'Erro ao criar convite');
    }
  };

  const cancelInvite = async () => {
    if (!inviteGameId) return;
    try {
      const db = getDb();
      await deleteDoc(doc(db, 'games', inviteGameId));
      setInviteLink(null);
      setInviteGameId(null);
    } catch (e: any) {
      console.error(e);
    }
  };

  const findMatch = async () => {
    if (!currentUser) {
      onLoginRequest?.();
      return;
    }
    setError(null);
    setIsSearching(true);
    const db = getDb();
    
    try {
      const queueQuery = query(collection(db, 'queue'), where('timeControl', '==', timeControl), orderBy('createdAt', 'asc'), limit(5));
      const queueSnapshot = await getDocs(queueQuery);
      
      let matchedOpponent: QueueEntry | null = null;
      for (const docSnap of queueSnapshot.docs) {
        if (docSnap.id !== currentUser.uid) {
          matchedOpponent = { ...docSnap.data(), uid: docSnap.id } as QueueEntry;
          break;
        }
      }

      if (matchedOpponent) {
        const opponentRef = doc(db, 'queue', matchedOpponent.uid);
        const newGameRef = doc(collection(db, 'games'));
        
        try {
          await runTransaction(db, async (transaction) => {
            const opponentDoc = await transaction.get(opponentRef);
            if (!opponentDoc.exists()) {
              throw new Error("Opponent already matched");
            }
            
            const isWhite = Math.random() > 0.5;
            const whitePlayer = isWhite ? currentUser : matchedOpponent;
            const blackPlayer = isWhite ? matchedOpponent : currentUser;

            transaction.set(newGameRef, {
              id: newGameRef.id,
              whiteId: whitePlayer!.uid,
              blackId: blackPlayer!.uid,
              whiteName: whitePlayer!.displayName,
              blackName: blackPlayer!.displayName,
              whiteElo: whitePlayer!.elo,
              blackElo: blackPlayer!.elo,
              status: 'playing',
              fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
              pgn: '',
              lastMoveAt: Date.now(),
              timeControl,
              whiteTime: timeControl,
              blackTime: timeControl,
              turn: 'w',
              whiteThemeId: whitePlayer!.activeTheme || 'luxury'
            });

            transaction.delete(opponentRef);
          });
          
          return;
        } catch (e) {
          console.log("Transaction failed, trying to enter queue instead...", e);
        }
      }

      const myQueueRef = doc(db, 'queue', currentUser.uid);
      await setDoc(myQueueRef, {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        elo: currentUser.elo,
        createdAt: Date.now(),
        timeControl,
        activeTheme: currentUser.activeTheme || 'luxury'
      });
    } catch (err: any) {
      console.error("Matchmaking error:", err);
      setError("Erro ao buscar partida. Tente novamente.");
      setIsSearching(false);
    }
  };

  const cancelSearch = async () => {
    console.log("Cancel search clicked!");
    if (!currentUser) return;
    try {
      setIsSearching(false); // Force local state update
      const db = getDb();
      await deleteDoc(doc(db, 'queue', currentUser.uid));
      console.log("Queue doc deleted!");
    } catch (err) {
      console.error("Error canceling search:", err);
    }
  };

  const difficulties = [
    { id: 'iniciante', name: 'Iniciante (Aleatório)', color: 'text-neutral-400' },
    { id: 'facil', name: 'Fácil (Profundidade 1)', color: 'text-emerald-400' },
    { id: 'medio', name: 'Médio (Profundidade 2)', color: 'text-yellow-400' },
    { id: 'dificil', name: 'Difícil (Profundidade 3)', color: 'text-orange-400' },
    { id: 'profissional', name: 'Profissional (Profundidade 4)', color: 'text-red-400' }
  ];

  return (
    <div className="w-full flex flex-col md:flex-row gap-6 lg:gap-8 max-w-[1400px] mx-auto">
      
      {/* Left Column - Main Actions (Bento Grid) */}
      <div className="flex-1 flex flex-col gap-6">
        
        {/* Play Now Hero Card */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 rounded-[2rem] p-6 sm:p-8 border border-zinc-800/50 shadow-2xl relative overflow-hidden group">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors duration-700" />
          
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">Jogar Xadrez</h2>
            <p className="text-zinc-400 mb-8 max-w-sm">Jogue contra milhões de jogadores do mundo inteiro ou desafie um amigo.</p>
            
            {isSearching ? (
              <div className="bg-zinc-950/50 border border-emerald-500/30 rounded-2xl p-6 flex flex-col items-center gap-4 animate-in fade-in zoom-in-95">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                <div className="text-center">
                  <p className="font-bold text-lg text-emerald-400">Buscando oponente...</p>
                  <p className="text-sm text-zinc-400">Calculando ELO e pareamento</p>
                </div>
                <button
                  onClick={cancelSearch}
                  className="mt-2 w-full max-w-[200px] font-bold py-3 px-6 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-all active:scale-95"
                >
                  Cancelar Busca
                </button>
              </div>
            ) : inviteLink ? (
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-6 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-4">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center">
                  <LinkIcon className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="text-center w-full">
                  <p className="text-sm font-bold text-indigo-300 mb-2">Envie este link para seu amigo</p>
                  <div className="flex w-full items-center gap-2 bg-zinc-950 rounded-xl p-2 border border-indigo-500/20">
                    <code className="text-xs text-zinc-400 truncate flex-1 pl-2">{inviteLink}</code>
                    <button 
                      onClick={() => navigator.clipboard.writeText(inviteLink)}
                      className="p-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors text-white"
                      title="Copiar link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Vem jogar xadrez comigo no Vanguard Chess! Clique no link para entrar na partida: ${inviteLink}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-[#25D366] hover:bg-[#20bd5a] rounded-lg transition-colors text-white flex items-center justify-center"
                      title="Enviar pelo WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                <button
                  onClick={cancelInvite}
                  className="mt-2 w-full max-w-[200px] font-bold py-3 px-6 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-all active:scale-95"
                >
                  Cancelar Convite
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Partida Rápida</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Bullet', time: '1 min', val: 60, icon: '⚡' },
                      { label: 'Blitz', time: '3 min', val: 180, icon: '🔥' },
                      { label: 'Blitz', time: '5 min', val: 300, icon: '⏱️' },
                      { label: 'Rapid', time: '10 min', val: 600, icon: '🐢' }
                    ].map(tc => (
                      <button
                        key={tc.val}
                        onClick={() => { if(currentUser) { setTimeControl(tc.val); findMatch(); } else { onLoginRequest?.(); } }}
                        className="bg-zinc-950/50 hover:bg-zinc-800 border border-zinc-800/80 hover:border-emerald-500/50 rounded-2xl p-4 flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 group"
                      >
                        <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{tc.icon}</span>
                        <span className="font-bold text-zinc-200">{tc.time}</span>
                        <span className="text-[10px] text-zinc-500 font-medium">{tc.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col justify-end gap-3 mt-4 sm:mt-0">
                  <button
                    onClick={currentUser ? createInvite : onLoginRequest}
                    className="w-full bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 font-bold py-4 px-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 group"
                  >
                    <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Jogar com Amigo
                  </button>
                  <button
                    id="tutorial-play-ai"
                    onClick={() => currentUser ? setShowBotMenu(true) : onLoginRequest?.()}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 px-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 group"
                  >
                    <Bot className="w-5 h-5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                    Treinar com IA
                  </button>
                </div>
              </div>
            )}
            
            {error && (
              <div className="mt-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}
          </div>
        </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Games Widget */}
          <div className="lg:col-span-2 bg-zinc-900/50 rounded-[2rem] p-6 sm:p-8 border border-zinc-800/50 flex flex-col min-h-[300px]">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
              TV Xadrez Ao Vivo
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
              {liveGames.length === 0 ? (
                <div className="col-span-1 sm:col-span-2 text-center py-12 border border-zinc-800/50 border-dashed rounded-2xl bg-zinc-900/50 flex items-center justify-center">
                  <p className="text-zinc-500 text-sm font-medium">Nenhuma partida ao vivo no momento</p>
                </div>
              ) : (
                liveGames.map(game => (
                  <div key={game.id} className="bg-zinc-950 rounded-2xl p-4 border border-zinc-800/80 flex flex-col gap-4 hover:border-emerald-500/30 transition-colors group">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-3 h-3 bg-zinc-200 border border-zinc-400 rounded-sm shadow-sm flex-shrink-0" />
                        <span className="text-zinc-100 truncate">{game.whiteName}</span>
                        <span className="text-emerald-500/80 text-xs">({game.whiteElo})</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-3 h-3 bg-zinc-900 border border-zinc-700 rounded-sm shadow-sm flex-shrink-0" />
                        <span className="text-zinc-100 truncate">{game.blackName}</span>
                        <span className="text-emerald-500/80 text-xs">({game.blackElo})</span>
                      </div>
                    </div>
                    {onSpectate && (
                      <button 
                        onClick={() => onSpectate(game.id)}
                        className="mt-2 w-full bg-zinc-800 group-hover:bg-emerald-500 group-hover:text-zinc-950 text-zinc-300 font-bold py-2.5 rounded-xl transition-all"
                      >
                        Assistir
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Online Users Widget */}
          <div className="lg:col-span-1 bg-zinc-900/50 rounded-[2rem] p-6 sm:p-8 border border-zinc-800/50 flex flex-col min-h-[300px] max-h-[600px]">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              Online Agora
              <span className="ml-auto text-xs font-bold text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-full">{onlineUsers.length}</span>
            </h3>

            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
              {onlineUsers.length === 0 ? (
                <div className="text-center py-12 border border-zinc-800/50 border-dashed rounded-2xl bg-zinc-900/50">
                  <p className="text-zinc-500 text-sm">Apenas você no momento</p>
                </div>
              ) : (
                onlineUsers.map(user => (
                  <div key={user.uid} className="flex items-center gap-3 p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-xl">
                    <div className="relative">
                      <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 font-bold text-sm">
                        {(user.displayName?.charAt(0)?.toUpperCase() || "?")}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-zinc-950 rounded-full" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-zinc-200">
                        {(user.displayName || 'Jogador').split(' ')[0]} {user.uid === currentUser?.uid && <span className="text-emerald-500/80 text-[10px] font-bold uppercase ml-1">(Você)</span>}
                      </span>
                      <span className="text-xs text-indigo-400 font-medium">{user.elo} ELO</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>


      <div className="mt-8 mb-4">
        <button 
          id="tutorial-pass-play"
          onClick={onPlayLocal}
          className="w-full bg-zinc-900 border border-zinc-800 hover:border-indigo-500/30 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all group"
        >
          <div className="w-12 h-12 bg-zinc-800 group-hover:bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-4 transition-colors">
            <Users className="w-6 h-6 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Pass & Play</h3>
          <p className="text-xs text-zinc-500 font-medium">Jogue localmente no mesmo dispositivo com um amigo lado a lado.</p>
        </button>
      </div>

      {/* Bot Menu Modal */}
      {showBotMenu && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setShowBotMenu(false)}>
          <div className="bg-zinc-900 rounded-[2rem] p-6 w-full max-w-sm border border-zinc-800 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowBotMenu(false)} className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Bot className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white leading-tight">Treinar com IA</h2>
                <p className="text-zinc-400 text-xs">Escolha o nível do motor</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              {hasSavedBotGame && (
                <button
                  onClick={() => { setShowBotMenu(false); onPlayComputer('resume'); }}
                  className="flex items-center justify-between px-4 py-3.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition-all rounded-xl border border-amber-500/30 active:scale-95 mb-2 group"
                >
                  <span className="font-bold text-sm">Retomar Partida</span>
                  <span className="text-[10px] uppercase tracking-wider font-black opacity-80 group-hover:opacity-100 transition-opacity">Continuar</span>
                </button>
              )}
              
              {difficulties.map(diff => (
                <button
                  key={diff.id}
                  onClick={() => { setShowBotMenu(false); onPlayComputer(diff.id); }}
                  className="flex items-center justify-between px-4 py-3.5 bg-zinc-950 hover:bg-zinc-800 transition-all rounded-xl border border-zinc-800 active:scale-95 group"
                >
                  <span className="font-bold text-sm text-zinc-300 group-hover:text-white transition-colors">
                    {diff.name.split(' (')[0]}
                  </span>
                  <span className={cn("text-[10px] font-black uppercase tracking-wider", diff.color)}>
                    {diff.name.includes('(') ? diff.name.split('(')[1].replace(')', '') : 'Nível Especial'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}