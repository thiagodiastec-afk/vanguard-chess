import { useEffect, useState } from 'react';
import { collection, doc, getDocs, setDoc, deleteDoc, runTransaction, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { UserData, QueueEntry, GameData } from '../types';
import { Loader2, Swords, Bot, ChevronDown, ChevronUp, Link as LinkIcon, Copy, Target, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface LobbyProps {
  currentUser: UserData | null;
  onPlayComputer: (difficulty: string) => void;
  onSpectate?: (gameId: string) => void;
  onLoginRequest?: () => void;
}

export default function Lobby({ currentUser, onPlayComputer, onSpectate, onLoginRequest }: LobbyProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBotMenu, setShowBotMenu] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteGameId, setInviteGameId] = useState<string | null>(null);
  const [liveGames, setLiveGames] = useState<GameData[]>([]);

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
    
    const unsubscribe = onSnapshot(queueRef, (doc) => {
      setIsSearching(doc.exists());
    });
    
    return unsubscribe;
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
        lastMoveAt: Date.now(),
        
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
    const db = getDb();
    
    try {
      const queueQuery = query(collection(db, 'queue'), orderBy('createdAt', 'asc'), limit(5));
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
              turn: 'w'
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
        createdAt: Date.now()
      });
    } catch (err: any) {
      console.error("Matchmaking error:", err);
      setError("Erro ao buscar partida. Tente novamente.");
    }
  };

  const cancelSearch = async () => {
    if (!currentUser) return;
    try {
      const db = getDb();
      await deleteDoc(doc(db, 'queue', currentUser.uid));
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
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-800 rounded-3xl p-8 text-center space-y-8 border border-neutral-700/50 shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none rounded-t-3xl" />
        
        
          <button
            onClick={inviteLink ? cancelInvite : createInvite}
            disabled={isSearching}
            className={cn(
              "w-full font-bold py-4 px-8 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 text-lg",
              inviteLink
                ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                : "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
            )}
          >
            {inviteLink ? <Loader2 className="w-5 h-5 animate-spin" /> : <LinkIcon className="w-5 h-5" />}
            {inviteLink ? 'Cancelar Convite' : 'Desafiar Amigo (Link)'}
          </button>

          {inviteLink && (
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <p className="text-sm text-indigo-300 text-center">Link copiado para a área de transferência! Envie para o seu amigo e aguarde.</p>
              <div className="flex w-full items-center gap-2 bg-neutral-900 rounded-lg p-2 overflow-hidden border border-neutral-700">
                <code className="text-xs text-neutral-400 truncate flex-1">{inviteLink}</code>
                <button 
                  onClick={() => navigator.clipboard.writeText(inviteLink)}
                  className="p-2 hover:bg-neutral-800 rounded-md transition-colors text-neutral-400 hover:text-white"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          
          <div className="relative">

          <div className="w-24 h-24 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-neutral-800">
            {isSearching ? (
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            ) : (
              <Swords className="w-10 h-10 text-neutral-400" />
            )}
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            {isSearching ? 'Buscando Oponente...' : 'Pronto para jogar?'}
          </h2>
          <p className="text-neutral-400">
            {isSearching 
              ? 'Aguardando outro jogador entrar na fila...'
              : 'Jogue contra adversários online ou contra o computador.'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20">
            {error}
          </div>
        )}

        <div className="pt-4 flex flex-col gap-3 relative z-10">
          <button
            onClick={isSearching ? cancelSearch : findMatch}
            className={cn(
              "w-full font-bold py-4 px-8 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 text-lg",
              isSearching 
                ? "bg-neutral-700 hover:bg-neutral-600 text-white" 
                : "bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]"
            )}
          >
            <Swords className="w-5 h-5" />
            {isSearching ? 'Cancelar Busca' : 'Jogar Online'}
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowBotMenu(!showBotMenu)}
              disabled={isSearching}
              className="w-full font-bold py-4 px-8 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 text-lg bg-neutral-700 hover:bg-neutral-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Bot className="w-5 h-5" />
              Jogar vs Computador
              {showBotMenu ? <ChevronUp className="w-5 h-5 ml-2" /> : <ChevronDown className="w-5 h-5 ml-2" />}
            </button>
            
            {showBotMenu && !isSearching && (
              <div className="absolute top-full left-0 w-full mt-2 bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden shadow-2xl z-20">
                {difficulties.map(diff => (
                  <button
                    key={diff.id}
                    onClick={() => onPlayComputer(diff.id)}
                    className={cn("w-full text-left px-6 py-4 hover:bg-neutral-800 transition-colors border-b border-neutral-800/50 last:border-0 font-medium", diff.color)}
                  >
                    {diff.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Daily Missions */}
      <div className="bg-neutral-800 rounded-2xl p-6 border border-neutral-700/50 shadow-xl mt-8">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Target className="w-6 h-6 text-emerald-500" />
          Missões Diárias
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-700 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-neutral-200">Defesa de Ferro</span>
                <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">+50 XP</span>
              </div>
              <p className="text-xs text-neutral-400 mb-3">Vença 1 partida jogando com as peças Pretas.</p>
            </div>
            <div>
              <div className="w-full bg-neutral-800 rounded-full h-2.5 mb-1">
                <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '0%' }}></div>
              </div>
              <p className="text-right text-xs font-medium text-neutral-500">0 / 1</p>
            </div>
          </div>
          
          <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/30 flex flex-col justify-between opacity-80">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-emerald-400 line-through">Estrategista Clássico</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-xs text-emerald-500/70 mb-3 line-through">Faça um Roque em 3 jogos diferentes.</p>
            </div>
            <div>
              <div className="w-full bg-emerald-900/50 rounded-full h-2.5 mb-1">
                <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '100%' }}></div>
              </div>
              <p className="text-right text-xs font-bold text-emerald-500">3 / 3 (Concluída)</p>
            </div>
          </div>
        </div>
      </div>


      {/* Banner Ad Placeholder (Only if not VIP) */}
      {(!currentUser || !currentUser.isPremium) && (
        <div className="bg-neutral-800 rounded-2xl p-4 border border-neutral-700/50 shadow-xl mb-8 flex flex-col items-center justify-center min-h-[120px] relative overflow-hidden group">
          <div className="absolute inset-0 bg-neutral-900/50 flex flex-col items-center justify-center z-10 transition-opacity">
            <span className="text-xs font-bold text-neutral-500 tracking-widest uppercase mb-1">Publicidade</span>
            <span className="text-sm text-neutral-400 text-center px-4">
              [ Banner AdSense / AdinPlay será exibido aqui ]<br />
              Remova os anúncios assinando o plano VIP!
            </span>
          </div>
        </div>
      )}

      {/* Live Games */}
      {liveGames.length > 0 && (
        <div className="bg-neutral-800 rounded-2xl p-6 border border-neutral-700/50 shadow-xl">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Partidas ao Vivo (Públicas)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveGames.map(game => (
              <div key={game.id} className="bg-neutral-900 rounded-xl p-4 border border-neutral-700/50 flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-white border border-neutral-300 rounded-full" />
                    <span className="font-bold text-white">{game.whiteName}</span>
                    <span className="text-emerald-400">{game.whiteElo}</span>
                  </div>
                  <span className="text-neutral-500 font-bold text-xs">VS</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{game.blackName}</span>
                    <span className="text-emerald-400">{game.blackElo}</span>
                    <div className="w-3 h-3 bg-black border border-neutral-600 rounded-full" />
                  </div>
                </div>
                {onSpectate && (
                  <button 
                    onClick={() => onSpectate(game.id)}
                    className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-semibold py-2 rounded-lg transition-colors text-sm"
                  >
                    Assistir
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
