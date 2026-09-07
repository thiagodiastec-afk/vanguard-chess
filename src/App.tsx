import { useEffect, useState } from 'react';
import { getAuth as getFirebaseAuth, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, onSnapshot, query, where, or, updateDoc, addDoc } from 'firebase/firestore';
import { initFirebase, getDb } from './lib/firebase';
import { UserData, GameData } from './types';
import Lobby from './components/Lobby';
import Game from './components/Game';
import ComputerGame from "./components/ComputerGame";
import LocalGame from "./components/LocalGame";
import Tournaments from './components/Tournaments';
import Rules from './components/Rules';
import Chat from './components/Chat';
import Training from './components/Training';
import Profile from './components/Profile';
import Store from './components/Store';
import Friends from './components/Friends';
import Leaderboard from './components/Leaderboard';
import AdBanner from './components/AdBanner';
import About from './components/About';
import { LogIn, Loader2, LogOut, Trophy, Swords, MessageSquare, Target, Settings, Volume2, VolumeX, Palette, User as UserIcon, Bell, BellOff, Users, BookOpen, Crown, Heart, Store as StoreIcon, Copy, CheckCircle2, Info } from 'lucide-react';
import { sounds } from './lib/sounds';
import { themeManager, CHESS_THEMES, useTheme } from './lib/themes';
import { cn } from './lib/utils';
import { requestNotificationPermission } from './lib/notifications';

type Tab = 'play' | 'tournaments' | 'chat' | 'training' | 'rules' | 'ranking' | 'profile' | 'friends' | 'store' | 'about';

export default function App() {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeGame, setActiveGame] = useState<GameData | null>(null);
  const [spectatingGameId, setSpectatingGameId] = useState<string | null>(null);
  const [spectatingGame, setSpectatingGame] = useState<GameData | null>(null);
  const [computerGameDifficulty, setComputerGameDifficulty] = useState<string | null>(null);
  const [isLocalGame, setIsLocalGame] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('play');
  const [showSettings, setShowSettings] = useState(false);
  const [showPix, setShowPix] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(sounds.getSoundEnabled());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [incomingChallenge, setIncomingChallenge] = useState<any>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);
  
  useEffect(() => {
    if (!spectatingGameId || !firebaseReady) {
      setSpectatingGame(null);
      return;
    }
    const db = getDb();
    const unsubscribe = onSnapshot(doc(db, 'games', spectatingGameId), (doc) => {
      if (doc.exists()) {
        setSpectatingGame({ id: doc.id, ...doc.data() } as GameData);
      } else {
        setSpectatingGameId(null);
      }
    });
    return unsubscribe;
  }, [spectatingGameId, firebaseReady]);

  const currentTheme = useTheme();

  useEffect(() => {
    initFirebase().then(({ auth, db }) => {
      setFirebaseReady(true);
      
      const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser) {
          // Online Status Management
          const setOnlineStatus = async (online: boolean) => {
            try {
              await updateDoc(doc(db, 'users', firebaseUser.uid), {
                isOnline: online,
                lastSeen: Date.now()
              });
            } catch (e) {
              console.error(e);
            }
          };
          
          setOnlineStatus(true);
          
          const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
              setOnlineStatus(true);
            } else {
              setOnlineStatus(false);
            }
          };
          
          const handleUnload = () => {
            setOnlineStatus(false);
          };
          
          window.addEventListener('visibilitychange', handleVisibility);
          window.addEventListener('beforeunload', handleUnload);

          // Listen for incoming challenges
          const challengesQuery = query(
            collection(db, 'challenges'),
            where('challengedId', '==', firebaseUser.uid),
            where('status', '==', 'pending')
          );
          
          const unsubscribeChallenges = onSnapshot(challengesQuery, (snapshot) => {
            const challenges = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            if (challenges.length > 0) {
              // Get the oldest pending challenge
              setIncomingChallenge(challenges[0]);
            } else {
              setIncomingChallenge(null);
            }
          });

          // Listen for outgoing challenge acceptance
          const myChallengesQuery = query(
            collection(db, 'challenges'),
            where('challengerId', '==', firebaseUser.uid),
            where('status', '==', 'accepted')
          );
          
          const unsubscribeMyChallenges = onSnapshot(myChallengesQuery, (snapshot) => {
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added') {
                const data = change.doc.data();
                if (data.gameId) {
                  // The other person accepted and created the game!
                  // Active game logic will automatically pick it up via unsubscribeGames.
                  // Just clean up the challenge.
                  updateDoc(doc(db, 'challenges', change.doc.id), { status: 'completed' });
                }
              }
            });
          });

          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            const newUserData: UserData = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Jogador Misterioso',
              elo: 1200,
              gamesPlayed: 0,
              coins: 500,
              unlockedThemes: ['luxury', 'classic']
            };
            await setDoc(userRef, newUserData);
            setUserData(newUserData);
          } else {
            setUserData(userSnap.data() as UserData);
          }

          // Handle Invite Link
          const urlParams = new URLSearchParams(window.location.search);
          const inviteId = urlParams.get('invite');
          if (inviteId) {
             const gameRef = doc(db, 'games', inviteId);
             const gameSnap = await getDoc(gameRef);
             if (gameSnap.exists()) {
               const gameData = gameSnap.data();
               if (gameData.status === 'waiting_friend' && gameData.whiteId !== firebaseUser.uid) {
                 await updateDoc(gameRef, {
                   blackId: firebaseUser.uid,
                   blackName: firebaseUser.displayName || 'Amigo',
                   status: 'playing',
                   lastMoveTime: Date.now()
                 });
               }
             }
             window.history.replaceState({}, document.title, window.location.pathname);
          }

          const unsubscribeUser = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
              const data = doc.data() as UserData;
              setUserData(data);
              
              if (data.activeTheme && data.activeTheme !== themeManager.getTheme().id) {
                themeManager.setTheme(data.activeTheme);
              }
            }
          });

          const gamesRef = collection(db, 'games');
          const q = query(
            gamesRef, 
            or(
              where('whiteId', '==', firebaseUser.uid), 
              where('blackId', '==', firebaseUser.uid)
            )
          );
          
          const unsubscribeGames = onSnapshot(q, (snapshot) => {
            const games = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GameData));
            const active = games.find(g => g.status === 'playing');
            
            setActiveGame(prev => {
              if (active) {
                if (!prev) setActiveTab('play');
                setComputerGameDifficulty(null); // Leave computer game if online match found
                return active;
              }
              if (prev) {
                const finishedGame = games.find(g => g.id === prev.id);
                if (finishedGame && finishedGame.status !== 'playing') {
                  return finishedGame;
                }
              }
              return null;
            });
            setLoading(false);
          });

          return () => {
            setOnlineStatus(false);
            unsubscribeUser();
            unsubscribeGames();
            window.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('beforeunload', handleUnload);
            unsubscribeChallenges();
            unsubscribeMyChallenges();

          };
        } else {
          setUserData(null);
          setActiveGame(null);
          setComputerGameDifficulty(null);
          setLoading(false);
        }
      });

      return unsubscribeAuth;
    });
  }, []);

  const handleLogin = async () => {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in:', error);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
  };

  if (!firebaseReady || loading) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const navItems = [
    { id: 'play', label: 'Jogar', icon: Swords },
    { id: 'ranking', label: 'Ranking', icon: Crown },
    { id: 'tournaments', label: 'Torneios', icon: Trophy },
    { id: 'training', label: 'Treino', icon: Target },
    { id: 'rules', label: 'Regras', icon: BookOpen },
    { id: 'chat', label: 'Social', icon: MessageSquare },
    { id: 'friends', label: 'Amigos', icon: Users },
    { id: 'store', label: 'Loja', icon: StoreIcon },
    { id: 'profile', label: 'Perfil', icon: UserIcon },
    { id: 'about', label: 'Sobre', icon: Info },
  ] as const;

  
  const acceptChallenge = async () => {
    if (!incomingChallenge || !userData) return;
    const db = getDb();
    setLoading(true);
    try {
      // Create a game
      const gameRef = await addDoc(collection(db, 'games'), {
        whiteId: incomingChallenge.challengerId,
        blackId: userData.uid,
        whiteName: incomingChallenge.challengerName,
        blackName: userData.displayName,
        whiteElo: incomingChallenge.challengerElo,
        blackElo: userData.elo,
        status: 'playing',
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        pgn: '',
        lastMoveAt: Date.now(),
        turn: 'w'
      });
      
      // Update challenge
      await updateDoc(doc(db, 'challenges', incomingChallenge.id), {
        status: 'accepted',
        gameId: gameRef.id
      });
      
      setActiveTab('play');
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const declineChallenge = async () => {
    if (!incomingChallenge) return;
    const db = getDb();
    try {
      await updateDoc(doc(db, 'challenges', incomingChallenge.id), {
        status: 'declined'
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col relative overflow-hidden">
      {/* Decorative Golden Ribbons matching the image */}
      <div className="absolute top-[-50px] right-[-50px] w-[300px] h-[300px] bg-gradient-to-tr from-transparent via-[#d4af37]/20 to-[#ffd700]/40 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-[-50px] left-[-50px] w-[300px] h-[300px] bg-gradient-to-tr from-[#d4af37]/20 via-[#ffd700]/40 to-transparent rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] border-[40px] border-gradient-to-tr from-[#8a6327] to-[#fde08b] opacity-10 rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] border-[40px] border-gradient-to-tr from-[#fde08b] to-[#8a6327] opacity-10 rounded-full pointer-events-none z-0" />

      
      {/* Challenge Modal */}
      {incomingChallenge && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-800 rounded-2xl p-6 border border-neutral-700/50 shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center">
                <Swords className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Novo Desafio!</h3>
                <p className="text-neutral-400">
                  <span className="font-bold text-emerald-500">{incomingChallenge.challengerName}</span> ({incomingChallenge.challengerElo} Elo) convidou você.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={declineChallenge}
                className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-3 px-4 rounded-xl transition-colors"
              >
                Recusar
              </button>
              <button
                onClick={acceptChallenge}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Swords className="w-4 h-4" />
                Aceitar
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-neutral-900 border-b border-neutral-800 p-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-emerald-500" />
              <h1 className="text-xl font-bold tracking-tight hidden sm:block">Vanguard Chess</h1>
            </div>
            
            <nav className="hidden md:flex gap-1 ml-4 bg-neutral-800/50 p-1 rounded-xl">
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap",
                      activeTab === item.id ? "bg-neutral-700 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                    )}
                  >
                    <Icon className="w-4 h-4 hidden lg:block" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            {userData ? (
              <div className="flex items-center gap-2 md:gap-4 bg-neutral-800/50 py-1.5 px-3 rounded-xl border border-neutral-700/50">
                <div className="text-right hidden sm:block">
                  <div className="font-medium text-xs md:text-sm text-neutral-200">{userData.displayName}</div>
                  <div className="text-[10px] md:text-xs text-emerald-400 font-semibold">{userData.elo} Elo</div>
                </div>
                
                <div className="w-px h-6 bg-neutral-700 mx-1"></div>
                
                <button
                  onClick={() => setShowSettings(true)}
                  className="text-neutral-400 hover:text-white transition-colors"
                  title="Configurações"
                >
                  <Settings className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                
                <button
                  onClick={handleLogout}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  title="Sair"
                >
                  <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-4 py-2 rounded-lg font-bold transition-colors text-sm shrink-0"
              >
                Entrar
              </button>
            )}

            {!userData && (
              <button
                onClick={() => setShowPix(true)}
                className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors font-medium text-sm border border-emerald-500/30 shrink-0"
                title="Apoie o Desenvolvedor"
              >
                <Heart className="w-4 h-4 fill-emerald-500" />
                <span className="hidden xl:inline">Apoiar</span>
              </button>
            )}
          </div>
        </div>
      </header>
      
      {/* Mobile nav */}
      <nav className="md:hidden flex bg-neutral-900 border-b border-neutral-800">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium border-b-2 transition-colors",
                activeTab === item.id ? "border-emerald-500 text-emerald-500" : "border-transparent text-neutral-500 hover:text-neutral-300"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {!userData?.isPremium && <AdBanner />}

      
      {/* Pix Modal */}
      {showPix && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex flex-col items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowPix(false)}>
          <div className="bg-neutral-800 rounded-2xl p-6 w-full max-w-sm border border-neutral-700/50 shadow-2xl relative text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Heart className="w-6 h-6 text-emerald-500 fill-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Apoie o Projeto!</h2>
            <p className="text-neutral-400 mb-4 text-sm">
              Sua doação ajuda a manter os servidores do jogo online e livres de anúncios.
            </p>
            
            <div className="bg-white p-2 rounded-xl inline-block mb-4 shadow-lg">
              <img src="data:image/png;base64,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" alt="QR Code Pix" className="w-48 h-48 object-contain rounded-lg" />
            </div>

            <div className="bg-neutral-900/50 p-3 rounded-xl mb-4 text-left border border-neutral-700/30 text-sm">
              <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">Nome</p>
              <p className="text-white font-medium mb-3">THIAGO BERNARDO DIAS</p>
              <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">Instituição</p>
              <p className="text-white font-medium">Banco Inter</p>
            </div>

            <div className="bg-neutral-900 rounded-xl p-3 border border-emerald-500/30 flex items-center justify-between gap-3 mb-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-emerald-400 font-mono text-base truncate flex-1 text-left z-10">
                266.666.158-08
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('266.666.158-08');
                  setCopiedPix(true);
                  setTimeout(() => setCopiedPix(false), 2000);
                }}
                className="bg-neutral-700 hover:bg-neutral-600 text-white p-2 rounded-lg transition-colors flex-shrink-0"
                title="Copiar Chave Pix"
              >
                {copiedPix ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={() => setShowPix(false)}
              className="w-full bg-neutral-700 hover:bg-neutral-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/60 flex flex-col items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
          <div className="bg-neutral-800 rounded-2xl p-6 w-full max-w-sm border border-neutral-700/50 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-6">Configurações</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-neutral-900/50 rounded-xl border border-neutral-700/30">
                <div className="flex items-center gap-3">
                  {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-500" /> : <VolumeX className="w-5 h-5 text-neutral-500" />}
                  <span className="font-medium text-neutral-200">Efeitos Sonoros</span>
                </div>
                <button
                  onClick={() => {
                    const newVal = !soundEnabled;
                    setSoundEnabled(newVal);
                    sounds.toggleSound(newVal);
                  }}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    soundEnabled ? "bg-emerald-500" : "bg-neutral-600"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                    soundEnabled ? "left-7" : "left-1"
                  )} />
                </button>
              </div>

              
              <div className="flex items-center justify-between p-4 bg-neutral-900/50 rounded-xl border border-neutral-700/30">
                <div className="flex items-center gap-3">
                  {notificationsEnabled ? <Bell className="w-5 h-5 text-emerald-500" /> : <BellOff className="w-5 h-5 text-neutral-500" />}
                  <span className="font-medium text-neutral-200">Notificações Push</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      if (!notificationsEnabled) {
                        const granted = await requestNotificationPermission();
                        setNotificationsEnabled(granted);
                      } else {
                        alert("Para desativar, altere a permissão nas configurações do seu navegador.");
                      }
                    }}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      notificationsEnabled ? "bg-emerald-500" : "bg-neutral-600"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                      notificationsEnabled ? "left-7" : "left-1"
                    )} />
                  </button>
                  {notificationsEnabled && (
                    <button 
                      onClick={() => new Notification("Vanguard Chess", { body: "As notificações estão funcionando perfeitamente!" })}
                      className="text-xs bg-neutral-700 hover:bg-neutral-600 text-white px-2 py-1 rounded-md transition-colors"
                    >
                      Testar
                    </button>
                  )}
                </div>
              </div>
              <div className="p-4 bg-neutral-900/50 rounded-xl border border-neutral-700/30 space-y-4">
                <div className="flex items-center gap-3">
                  <Palette className="w-5 h-5 text-emerald-500" />
                  <span className="font-medium text-neutral-200">Tema do Tabuleiro</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {CHESS_THEMES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => themeManager.setTheme(t.id)}
                      title={t.name}
                      className={cn(
                        "aspect-square rounded-lg border-2 overflow-hidden flex flex-col",
                        currentTheme.id === t.id ? "border-emerald-500" : "border-transparent"
                      )}
                    >
                      <div className="flex-1 w-full" style={t.lightSquareStyle} />
                      <div className="flex-1 w-full" style={t.darkSquareStyle} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="mt-8 w-full bg-neutral-700 hover:bg-neutral-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col relative z-10">
        {activeTab === 'play' && (
          activeGame ? (
            <Game game={activeGame} currentUser={userData!} onExit={() => setActiveGame(null)} />
          ) : computerGameDifficulty ? (
            <ComputerGame difficulty={computerGameDifficulty} currentUser={userData} onExit={() => setComputerGameDifficulty(null)} />
          ) : isLocalGame ? (
            <LocalGame onExit={() => setIsLocalGame(false)} />
          ) : (
            <Lobby currentUser={userData} onPlayComputer={(diff) => setComputerGameDifficulty(diff)} onPlayLocal={() => setIsLocalGame(true)} onLoginRequest={handleLogin} />
          )
        )}
        {activeTab === 'rules' && <Rules />}
        {activeTab === 'ranking' && <Leaderboard />}
        {activeTab === 'about' && <About />}
        
        {/* Protected Routes */}
        {!userData && ['tournaments', 'chat', 'training', 'friends', 'store', 'profile'].includes(activeTab) && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-neutral-800 rounded-2xl p-8 text-center space-y-6 shadow-xl border border-neutral-700/50">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <LogIn className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Faça Login</h2>
              <p className="text-neutral-400">Você precisa estar conectado para acessar esta área do jogo.</p>
              <button
                onClick={handleLogin}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" />
                Entrar com Google
              </button>
            </div>
          </div>
        )}

        {userData && (
          <>
            {activeTab === 'tournaments' && <Tournaments currentUser={userData} />}
            {activeTab === 'chat' && <Chat currentUser={userData} />}
            {activeTab === 'training' && <Training onPlayComputer={(diff) => setComputerGameDifficulty(diff)} />}
            {activeTab === 'friends' && <Friends currentUser={userData} />}
            {activeTab === 'store' && <Store currentUser={userData} />}
            {activeTab === 'profile' && <Profile currentUser={userData} />}
          </>
        )}
      </main>
    </div>
  );
}
