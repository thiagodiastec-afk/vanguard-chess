import { useEffect, useState } from 'react';
import { getAuth as getFirebaseAuth, signInWithPopup, GoogleAuthProvider, signOut, User, browserPopupRedirectResolver } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, onSnapshot, query, where, or, updateDoc, addDoc } from 'firebase/firestore';
import { initFirebase, getDb, getFirebaseAuth as getFirebaseInstance } from './lib/firebase';
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
import { LogIn, Loader2, LogOut, Trophy, Swords, MessageSquare, Target, Settings, Volume2, VolumeX, Palette, User as UserIcon, Bell, BellOff, Users, BookOpen, Crown, Heart, Store as StoreIcon, Copy, CheckCircle2, Info , ShieldCheck } from 'lucide-react';
import { sounds } from './lib/sounds';
import { themeManager, CHESS_THEMES, useTheme } from './lib/themes';
import { backgroundManager, useBackground } from './lib/backgrounds';
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
  const currentBackground = useBackground();

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
              unlockedThemes: ['luxury', 'classic'],
              unlockedBackgrounds: ['default'],
              activeBackground: 'default'
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
              if (data.activeBackground && data.activeBackground !== backgroundManager.getBackground().id) {
                backgroundManager.setBackground(data.activeBackground);
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

        } else {
          setUserData(null);
          setLoading(false);
        }
      });
      return () => unsubscribeAuth();
    });
  }, []);
  

  const handleLogin = async () => {
    try {
      // Must be synchronous before calling signInWithPopup to avoid browser popup blockers
      const auth = getFirebaseInstance();
      if (!auth) {
        console.error("Firebase auth not initialized yet.");
        // Fallback to async if somehow not initialized
        const { auth: asyncAuth } = await initFirebase();
        const provider = new GoogleAuthProvider();
        await signInWithPopup(asyncAuth, provider, browserPopupRedirectResolver);
        return;
      }
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    } catch (error) {
      console.error("Login error", error);
      alert("Falha ao abrir a janela de login. Se você estiver usando Safari ou bloqueadores de pop-up, tente permitir pop-ups para esta página ou clique no botão de 'Device' ou 'Remix' no canto superior direito para abrir o app em uma nova guia.");
    }
  };

  const handleLogout = async () => {
    try {
      const { auth } = await initFirebase();
      await signOut(auth);
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  const navItems = [
    { id: 'play', label: 'Jogar', icon: Swords },
    { id: 'ranking', label: 'Ranking', icon: Crown },
    { id: 'tournaments', label: 'Torneios', icon: Trophy },
    { id: 'training', label: 'Treino', icon: Target },
    { id: 'profile', label: 'Perfil', icon: UserIcon },
    { id: 'friends', label: 'Social', icon: Users },
    { id: 'store', label: 'Loja', icon: StoreIcon },
    { id: 'chat', label: 'Chat Global', icon: MessageSquare },
    { id: 'rules', label: 'Regras', icon: BookOpen },
    { id: 'about', label: 'Sobre', icon: Info }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
        <p className="text-emerald-400 font-bold animate-pulse">Carregando Vanguard Chess...</p>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen text-zinc-50 flex flex-col md:flex-row font-sans selection:bg-emerald-500/30", currentBackground.className || "")} style={currentBackground.style}>
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-20 hover:w-64 transition-all duration-300 border-r border-zinc-800 bg-zinc-950/90 backdrop-blur-xl h-screen sticky top-0 z-50 group overflow-hidden">
        <div className="p-5 group-hover:p-6 flex items-center gap-3 transition-all">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Trophy className="w-5 h-5 text-zinc-950" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Vanguard<span className="text-emerald-400">Chess</span></h1>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200 overflow-hidden",
                  isActive 
                    ? "bg-zinc-800/80 text-emerald-400 shadow-sm" 
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
                )}
                title={item.label}
              >
                <div className="flex-shrink-0 w-6 flex justify-center">
                  <Icon className={cn("w-5 h-5 transition-transform", isActive ? "scale-110" : "")} />
                </div>
                <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800/50">
          {userData ? (
            <div className="flex items-center gap-3 bg-transparent group-hover:bg-zinc-900/50 p-1 group-hover:p-3 rounded-2xl border border-transparent group-hover:border-zinc-800 transition-all overflow-hidden justify-center group-hover:justify-start relative">
              <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-emerald-400">
                {userData.displayName.charAt(0).toUpperCase()}
              </div>
              
              <div className="flex-1 min-w-0 text-left opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute left-[60px] group-hover:static group-hover:left-auto">
                <div className="font-bold text-sm text-zinc-100 truncate">{userData.displayName}</div>
                <div className="text-xs text-emerald-500 font-semibold">{userData.elo} Elo</div>
              </div>
              
              <div className="flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden group-hover:flex absolute right-3 group-hover:static group-hover:right-auto">
                <button onClick={() => setShowSettings(true)} className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors" title="Configurações">
                  <Settings className="w-4 h-4" />
                </button>
                <button onClick={handleLogout} className="p-1.5 text-red-500 hover:text-red-400 transition-colors" title="Sair">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 flex flex-col items-center group-hover:items-stretch transition-all overflow-hidden">
              <button onClick={handleLogin} className="w-10 h-10 group-hover:w-full group-hover:h-auto bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold group-hover:py-3 group-hover:px-4 rounded-xl transition-all active:scale-95 text-sm flex items-center justify-center gap-2" title="Entrar">
                <LogIn className="w-5 h-5 group-hover:w-4 group-hover:h-4 flex-shrink-0" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden group-hover:inline whitespace-nowrap">Entrar</span>
              </button>
              <button onClick={() => setShowPix(true)} className="w-10 h-10 group-hover:w-full group-hover:h-auto bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-bold group-hover:py-3 group-hover:px-4 rounded-xl transition-all active:scale-95 text-sm flex items-center justify-center gap-2 border border-emerald-500/20" title="Apoiar">
                <Heart className="w-5 h-5 group-hover:w-4 group-hover:h-4 fill-emerald-500 flex-shrink-0" /> 
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden group-hover:inline whitespace-nowrap">Apoiar</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen relative w-full overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Trophy className="w-4 h-4 text-zinc-950" />
            </div>
            <h1 className="text-lg font-black tracking-tight text-white">Vanguard<span className="text-emerald-400">Chess</span></h1>
          </div>
          
          <div className="flex items-center gap-2">
            {userData ? (
              <>
                <div className="text-right">
                  <div className="text-[10px] text-emerald-500 font-bold">{userData.elo} Elo</div>
                </div>
                <button onClick={() => setShowSettings(true)} className="p-2 text-zinc-400 hover:text-zinc-100"><Settings className="w-5 h-5" /></button>
                <button onClick={handleLogout} className="p-2 text-red-500"><LogOut className="w-5 h-5" /></button>
              </>
            ) : (
              <button onClick={handleLogin} className="bg-emerald-500 text-zinc-950 px-3 py-1.5 rounded-lg font-bold text-xs">Entrar</button>
            )}
          </div>
        </header>

        {/* AdBanner area (below mobile header, top of main content) */}
        {!userData?.isPremium && <AdBanner />}

        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto h-full">
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
              <div className="flex-1 flex items-center justify-center h-[60vh]">
                <div className="max-w-md w-full bg-zinc-900 rounded-3xl p-8 text-center space-y-6 shadow-2xl border border-zinc-800">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <LogIn className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Faça Login</h2>
                  <p className="text-zinc-400">Você precisa estar conectado para acessar esta área do jogo.</p>
                  <button
                    onClick={handleLogin}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-4 px-6 rounded-2xl transition-colors flex items-center justify-center gap-2"
                  >
                                        <LogIn className="w-5 h-5" />
                    Entrar com Google
                  </button>
                  <p className="text-xs text-zinc-500 font-medium flex items-center justify-center gap-1.5 mt-4">
                    <ShieldCheck className="w-4 h-4 text-emerald-500/80" />
                    Conexão segura (Criptografia AES-256)
                  </p>
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
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 flex overflow-x-auto custom-scrollbar z-50 pb-safe">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 min-w-[72px] py-3 text-[10px] font-semibold transition-colors relative",
                isActive ? "text-emerald-400" : "text-zinc-500"
              )}
            >
              {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-emerald-500 rounded-b-full" />}
              <Icon className={cn("w-5 h-5 mb-0.5", isActive ? "fill-emerald-500/20" : "")} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-md" onClick={() => setShowSettings(false)}>
          <div className="bg-zinc-900 rounded-3xl p-6 w-full max-w-sm border border-zinc-800 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-6">Configurações</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
                <div className="flex items-center gap-3">
                  {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-500" /> : <VolumeX className="w-5 h-5 text-zinc-500" />}
                  <span className="font-medium text-zinc-200">Efeitos Sonoros</span>
                </div>
                <button
                  onClick={() => {
                    const newVal = !soundEnabled;
                    setSoundEnabled(newVal);
                    sounds.toggleSound(newVal);
                  }}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    soundEnabled ? "bg-emerald-500" : "bg-zinc-600"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                    soundEnabled ? "left-7" : "left-1"
                  )} />
                </button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
                <div className="flex items-center gap-3">
                  {notificationsEnabled ? <Bell className="w-5 h-5 text-emerald-500" /> : <BellOff className="w-5 h-5 text-zinc-500" />}
                  <span className="font-medium text-zinc-200">Notificações Push</span>
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
                      notificationsEnabled ? "bg-emerald-500" : "bg-zinc-600"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                      notificationsEnabled ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
              </div>

              <div className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50 space-y-4">
                <div className="flex items-center gap-3">
                  <Palette className="w-5 h-5 text-emerald-500" />
                  <span className="font-medium text-zinc-200">Tema do Tabuleiro</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {CHESS_THEMES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => themeManager.setTheme(t.id)}
                      title={t.name}
                      className={cn(
                        "aspect-square rounded-xl border-2 overflow-hidden flex flex-col transition-all hover:scale-105 active:scale-95",
                        currentTheme.id === t.id ? "border-emerald-500 shadow-md shadow-emerald-500/20" : "border-zinc-700 hover:border-zinc-500"
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
              className="mt-8 w-full bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-3 px-6 rounded-xl transition-colors active:scale-95"
            >
              Concluído
            </button>
          </div>
        </div>
      )}

      {/* Pix Modal */}
      {showPix && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-md" onClick={() => setShowPix(false)}>
          <div className="bg-zinc-900 rounded-3xl p-8 w-full max-w-sm border border-zinc-800 shadow-2xl relative text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <Heart className="w-8 h-8 text-emerald-500 fill-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Apoie o Projeto!</h2>
            <p className="text-zinc-400 mb-6 text-sm">
              Sua doação ajuda a manter os servidores do jogo online e livres de anúncios.
            </p>
            
            <div className="bg-white p-3 rounded-2xl inline-block mb-6 shadow-xl">
              <img src="data:image/png;base64,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" alt="QR Code Pix" className="w-48 h-48 object-contain rounded-xl" />
            </div>
            
            <div className="bg-zinc-800/50 p-4 rounded-2xl mb-6 text-left border border-zinc-700/50 text-sm">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Nome</p>
              <p className="text-zinc-100 font-bold mb-3">THIAGO BERNARDO DIAS</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Instituição</p>
              <p className="text-zinc-100 font-bold">Banco Inter</p>
            </div>
            
            <div className="bg-zinc-950 rounded-2xl p-3 border border-emerald-500/30 flex items-center justify-between gap-3 mb-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-emerald-400 font-mono text-base truncate flex-1 text-left z-10 font-bold px-2">
                266.666.158-08
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('266.666.158-08');
                  setCopiedPix(true);
                  setTimeout(() => setCopiedPix(false), 2000);
                }}
                className="bg-zinc-800 hover:bg-zinc-700 text-white p-3 rounded-xl transition-all active:scale-95 flex-shrink-0 relative z-10"
                title="Copiar Chave Pix"
              >
                {copiedPix ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <button
              onClick={() => setShowPix(false)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 px-6 rounded-2xl transition-colors active:scale-95"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}