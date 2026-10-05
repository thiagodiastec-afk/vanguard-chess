import { lazy, Suspense, useEffect, useState } from 'react';
import { getAuth as getFirebaseAuth, signInWithPopup, signInWithRedirect, GoogleAuthProvider, signOut, User, browserPopupRedirectResolver } from 'firebase/auth';
import { doc, collection, onSnapshot, query, where, or, updateDoc, addDoc } from 'firebase/firestore';
import { initFirebase, getDb, getFirebaseAuth as getFirebaseInstance } from './lib/firebase';
import { UserData, GameData } from './types';
import Lobby from './components/Lobby';
const Game = lazy(() => import('./components/Game'));
const ComputerGame = lazy(() => import('./components/ComputerGame'));
const LocalGame = lazy(() => import('./components/LocalGame'));
const Tournaments = lazy(() => import('./components/Tournaments'));
const Rules = lazy(() => import('./components/Rules'));
const Chat = lazy(() => import('./components/Chat'));
const Training = lazy(() => import('./components/Training'));
const Profile = lazy(() => import('./components/Profile'));
const Store = lazy(() => import('./components/Store'));
const Friends = lazy(() => import('./components/Friends'));
const Leaderboard = lazy(() => import('./components/Leaderboard'));
const AdBanner = lazy(() => import('./components/AdBanner'));
const About = lazy(() => import('./components/About'));
const AuthModal = lazy(() => import('./components/AuthModal'));
import ErrorBoundary from './components/ErrorBoundary';
import { LogIn, Loader2, LogOut, Trophy, Swords, MessageSquare, Target, Settings, Volume2, VolumeX, Palette, User as UserIcon, Bell, BellOff, Users, BookOpen, Crown, Heart, Store as StoreIcon, Copy, CheckCircle2, Info , ShieldCheck, Check, Edit2, Sparkles, Home, AlertTriangle } from 'lucide-react';
import { sounds } from './lib/sounds';
import { themeManager, CHESS_THEMES, useTheme } from './lib/themes';
import { backgroundManager, useBackground } from './lib/backgrounds';
import { cn } from './lib/utils';
import { requestNotificationPermission } from './lib/notifications';
import { authenticatedApiFetch } from './lib/api';

type Tab = 'play' | 'tournaments' | 'chat' | 'training' | 'rules' | 'ranking' | 'profile' | 'friends' | 'store' | 'about';

export default function App() {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [profileLoadError, setProfileLoadError] = useState(false);
  const [activeGame, setActiveGame] = useState<GameData | null>(null);
  const [spectatingGameId, setSpectatingGameId] = useState<string | null>(null);
  const [spectatingGame, setSpectatingGame] = useState<GameData | null>(null);
  const [computerGameDifficulty, setComputerGameDifficulty] = useState<string | null>(null);
  const [isLocalGame, setIsLocalGame] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('play');
  const [storeInitialTab, setStoreInitialTab] = useState<'themes' | 'backgrounds' | 'coins' | 'vip'>('themes');
  const [showSettings, setShowSettings] = useState(false);
  const [showPix, setShowPix] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(sounds.getSoundEnabled());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [incomingChallenge, setIncomingChallenge] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'register' | 'login'>('register');
  const [showHomeExitConfirm, setShowHomeExitConfirm] = useState(false);
  const [isLeavingGameForHome, setIsLeavingGameForHome] = useState(false);
  const [homeExitError, setHomeExitError] = useState<string | null>(null);
  const [guestSuspendedUntil, setGuestSuspendedUntil] = useState(0);

  // Quick Nickname Editing in Settings
  const [editNickname, setEditNickname] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameFeedback, setNicknameFeedback] = useState<string | null>(null);

  useEffect(() => {
    const saved = Number(localStorage.getItem('vanguard_play_suspended_until') || 0);
    if (Number.isFinite(saved) && saved > Date.now()) setGuestSuspendedUntil(saved);
    else localStorage.removeItem('vanguard_play_suspended_until');
  }, []);

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const inviteParam = urlParams.get('invite');
      if (inviteParam) {
        sessionStorage.setItem('pending_invite', inviteParam);
      }
    } catch (e) {
      // ignore
    }
  }, []);

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


  const acceptChallenge = async () => {
    if (!incomingChallenge || !userData) return;
    try {
      const response = await authenticatedApiFetch('/api/challenge/accept', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: incomingChallenge.id })
      });
      if (!response.ok) throw new Error('Não foi possível aceitar o desafio.');
      setIncomingChallenge(null);
    } catch (e) {
      console.error(e);
    }
  };

  const declineChallenge = async () => {
    if (!incomingChallenge) return;
    try {
      const db = getDb();
      await updateDoc(doc(db, 'challenges', incomingChallenge.id), { status: 'declined' });
      setIncomingChallenge(null);
    } catch (e) {
      console.error(e);
    }
  };

  const currentTheme = useTheme();
  const currentBackground = useBackground();
  useEffect(() => {
    let unsubs: any[] = [];

    initFirebase().then(({ auth, db }) => {
      setFirebaseReady(true);

      const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
        // Clear previous listeners
        unsubs.forEach(u => u());
        unsubs = [];

        setUser(firebaseUser);
        setProfileLoadError(false);
        // Authentication and profile loading are separate operations. Keep a
        // minimal signed-in profile while Firestore is being hydrated so a
        // profile read failure cannot make an authenticated user look logged out.
        setUserData(firebaseUser ? {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Jogador',
          elo: 1200,
          gamesPlayed: 0,
          coins: 0,
          activeBackground: 'default'
        } : null);
        if (firebaseUser) {
          try {
          // Online Status Management
          const setOnlineStatus = async (online: boolean) => {
            try {
              const isVisible = online && document.visibilityState === 'visible';
              await updateDoc(doc(db, 'users', firebaseUser.uid), {
                isOnline: isVisible,
                lastSeen: Date.now()
              });
            } catch (e) {
              console.error(e);
            }
          };

          setOnlineStatus(true);
          const heartbeatInterval = setInterval(() => setOnlineStatus(true), 15000);
          unsubs.push(() => clearInterval(heartbeatInterval));

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
          unsubs.push(() => {
            window.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('beforeunload', handleUnload);
            setOnlineStatus(false);
          });

          // Listen for incoming challenges
          const challengesQuery = query(
            collection(db, 'challenges'),
            where('challengedId', '==', firebaseUser.uid),
            where('status', '==', 'pending')
          );

          unsubs.push(onSnapshot(challengesQuery, (snapshot) => {
            const challenges = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            if (challenges.length > 0) {
              // Get the oldest pending challenge
              setIncomingChallenge(challenges[0]);
            } else {
              setIncomingChallenge(null);
            }
          }));

          // Listen for outgoing challenge acceptance
          const myChallengesQuery = query(
            collection(db, 'challenges'),
            where('challengerId', '==', firebaseUser.uid),
            where('status', '==', 'accepted')
          );

          unsubs.push(onSnapshot(myChallengesQuery, (snapshot) => {
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
          }));

          const userRef = doc(db, 'users', firebaseUser.uid);
          const privateUserRef = doc(db, 'userPrivate', firebaseUser.uid);
          const bootstrapResponse = await authenticatedApiFetch('/api/profile/bootstrap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName: firebaseUser.displayName || '' })
          });
          if (!bootstrapResponse.ok) {
            const failure = await bootstrapResponse.json().catch(() => ({}));
            throw new Error(failure.error || `Profile bootstrap failed (${bootstrapResponse.status})`);
          }
          const bootstrapProfile = await bootstrapResponse.json();
          let publicProfile: UserData | null = bootstrapProfile.profile as UserData;
          let privateProfile: Partial<UserData> = bootstrapProfile.privateProfile as Partial<UserData>;
          const publishProfile = () => {
            if (publicProfile) setUserData({ ...publicProfile, ...privateProfile, uid: firebaseUser.uid });
          };
          publishProfile();

          // Handle Invite Link
          try {
            const urlParams = new URLSearchParams(window.location.search);
            const inviteId = urlParams.get('invite') || sessionStorage.getItem('pending_invite');
            if (inviteId) {
               sessionStorage.removeItem('pending_invite');
               const response = await authenticatedApiFetch('/api/game/invite/join', {
                 method: 'POST', headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ gameId: inviteId })
               });
               if (response.ok) setActiveTab('play');
               window.history.replaceState({}, document.title, window.location.pathname);
            }
          } catch (err) {
            console.error("Error processing invite link", err);
            window.history.replaceState({}, document.title, window.location.pathname);
          }

          unsubs.push(onSnapshot(userRef, async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserData;
              publicProfile = data;
              publishProfile();

              if (data.activeTheme && data.activeTheme !== themeManager.getTheme().id) {
                themeManager.setTheme(data.activeTheme);
              }
              if (data.activeBackground && data.activeBackground !== backgroundManager.getBackground().id) {
                backgroundManager.setBackground(data.activeBackground);
              }
            } else {
              console.error('Authenticated profile document disappeared after server bootstrap.');
            }
          }));

          unsubs.push(onSnapshot(privateUserRef, (privateSnap) => {
            privateProfile = privateSnap.exists() ? privateSnap.data() as Partial<UserData> : {};
            publishProfile();
          }, (error) => console.error('Private profile listener error:', error)));

          const gamesRef = collection(db, 'games');
          const q = query(
            gamesRef,
            or(
              where('whiteId', '==', firebaseUser.uid),
              where('blackId', '==', firebaseUser.uid)
            )
          );

          unsubs.push(onSnapshot(q, (snapshot) => {
            const games = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GameData));

            setActiveGame(prev => {
              // 1. If currently playing a specific match, always prioritize syncing that exact match
              if (prev) {
                const current = games.find(g => g.id === prev.id);
                if (current) {
                  return current;
                }
              }

              // 2. Otherwise find the newest match with 'playing' status
              const playingGames = games
                .filter(g => g.status === 'playing')
                .sort((a, b) => (b.lastMoveAt || 0) - (a.lastMoveAt || 0));
              const active = playingGames[0] || null;

              if (active) {
                if (!prev) setActiveTab('play');
                setComputerGameDifficulty(null);
                return active;
              }

              // 3. Check for recently finished game if we had one
              if (prev) {
                const finishedGame = games.find(g => g.id === prev.id);
                if (finishedGame) {
                  return finishedGame;
                }
              }

              return null;
            });
            setLoading(false);
          }, (err) => {
            console.error("Games listener error:", err);
            setLoading(false);
          }));
          } catch (error) {
            console.error('Authenticated, but failed to load the user profile:', error);
            setProfileLoadError(true);
            setLoading(false);
          }
        } else {
          setUserData(null);
          setLoading(false);
        }
      });
      return () => { unsubscribeAuth(); unsubs.forEach(u => u()); };
    });
  }, []);


  const handleLogin = (mode: 'register' | 'login' = 'login') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  const handleSaveNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !editNickname.trim() || editNickname.trim() === userData.displayName) return;
    setNicknameSaving(true);
    try {
      const response = await authenticatedApiFetch('/api/profile/username', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: editNickname.trim() })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Não foi possível salvar o nome.');
      setUserData(prev => prev ? ({ ...prev, displayName: result.username, hasSetNickname: true }) : null);
      setNicknameFeedback('Apelido alterado com sucesso!');
      setTimeout(() => setNicknameFeedback(null), 3000);
    } catch (err) {
      console.error("Erro ao salvar apelido", err);
      setNicknameFeedback(err instanceof Error ? err.message : 'Erro ao salvar apelido. Tente novamente.');
    } finally {
      setNicknameSaving(false);
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

  const navigateHome = () => {
    setShowHomeExitConfirm(false);
    setHomeExitError(null);
    setActiveGame(null);
    setComputerGameDifficulty(null);
    setIsLocalGame(false);
    setActiveTab('play');
  };

  const hasActiveGame = Boolean(
    (activeGame && activeGame.status === 'playing') || computerGameDifficulty || isLocalGame
  );

  const handleBrandClick = () => {
    if (hasActiveGame) {
      setHomeExitError(null);
      setShowHomeExitConfirm(true);
      return;
    }
    navigateHome();
  };

  const confirmLeaveGameForHome = async () => {
    setIsLeavingGameForHome(true);
    setHomeExitError(null);
    try {
      const response = activeGame?.status === 'playing'
        ? await authenticatedApiFetch('/api/game/action', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId: activeGame.id, action: 'leave_with_penalty' })
          })
        : user?.uid
          ? await authenticatedApiFetch('/api/play/abandon', { method: 'POST' })
          : null;

      if (response && !response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Não foi possível encerrar a partida. Tente novamente.');
      }

      if (!response) {
        const until = Date.now() + 60 * 60 * 1000;
        localStorage.setItem('vanguard_play_suspended_until', String(until));
        setGuestSuspendedUntil(until);
      }
      navigateHome();
    } catch (error: any) {
      setHomeExitError(error.message || 'Não foi possível encerrar a partida. Tente novamente.');
    } finally {
      setIsLeavingGameForHome(false);
    }
  };

  const playSuspendedUntil = Math.max(Number(userData?.playSuspendedUntil || 0), guestSuspendedUntil);

  const navItems: { id: Tab; label: string; icon: any }[] = [
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
        <button type="button" onClick={handleBrandClick} aria-label="Ir para a página inicial" title="Página inicial" className="p-5 group-hover:p-6 flex items-center gap-3 transition-all text-left">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Trophy className="w-5 h-5 text-zinc-950" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Vanguard<span className="text-emerald-400">Chess</span></h1>
        </button>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { if (item.id === 'store') setStoreInitialTab('themes'); setActiveTab(item.id); }}
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
            <div
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-3 bg-transparent group-hover:bg-zinc-900/50 p-1 group-hover:p-3 rounded-2xl border border-transparent group-hover:border-zinc-800 transition-all overflow-hidden justify-center group-hover:justify-start relative cursor-pointer hover:bg-zinc-800/50"
              title="Ver Perfil & Alterar Nickname"
            >
              <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-emerald-400">
                {(userData.displayName?.charAt(0)?.toUpperCase() || "?")}
              </div>

              <div className="flex-1 min-w-0 text-left opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute left-[60px] group-hover:static group-hover:left-auto">
                <div className="font-bold text-sm text-zinc-100 truncate flex items-center gap-1.5">
                  <span>{userData.displayName}</span>
                  <Edit2 className="w-3 h-3 text-zinc-500 hover:text-emerald-400" />
                </div>
                <div className="text-xs text-emerald-500 font-semibold">{userData.elo} Elo</div>
              </div>

              <div
                className="flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden group-hover:flex absolute right-3 group-hover:static group-hover:right-auto"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setEditNickname(userData.displayName || '');
                    setShowSettings(true);
                  }}
                  className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                  title="Configurações & Nickname"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button onClick={handleLogout} className="p-1.5 text-red-500 hover:text-red-400 transition-colors" title="Sair">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 flex flex-col items-center group-hover:items-stretch transition-all overflow-hidden">
              <button
                onClick={() => handleLogin('register')}
                className="w-10 h-10 group-hover:w-full group-hover:h-auto bg-[#81b64c] hover:bg-[#76a843] active:bg-[#6c9a3c] text-white font-bold group-hover:py-3 group-hover:px-4 rounded-xl transition-all active:scale-95 text-sm flex items-center justify-center gap-2 shadow-[0_3px_0_#5c8734]"
                title="Cadastrar / Entrar"
              >
                <LogIn className="w-5 h-5 group-hover:w-4 group-hover:h-4 flex-shrink-0" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden group-hover:inline whitespace-nowrap">Cadastre-se / Entrar</span>
              </button>
              <button onClick={() => setShowPix(true)} className="w-10 h-10 group-hover:w-full group-hover:h-auto bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-bold group-hover:py-3 group-hover:px-4 rounded-xl transition-all active:scale-95 text-sm flex items-center justify-center gap-2 border border-emerald-500/20" title="Apoiar">
                <Heart className="w-5 h-5 group-hover:w-4 group-hover:h-4 fill-emerald-500 flex-shrink-0" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden group-hover:inline whitespace-nowrap">Apoiar</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {profileLoadError && user && (
        <div role="alert" className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-[calc(100vw-2rem)] rounded-xl border border-amber-500/40 bg-[#262421] px-4 py-3 text-sm text-amber-100 shadow-xl">
          Sua conta está conectada, mas o perfil não carregou. Atualize a página; se o problema continuar, fale com o suporte.
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen relative w-full overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800 sticky top-0 z-40">
          <button type="button" onClick={handleBrandClick} aria-label="Ir para a página inicial" title="Página inicial" className="flex items-center gap-2 text-left">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Trophy className="w-4 h-4 text-zinc-950" />
            </div>
            <h1 className="text-lg font-black tracking-tight text-white">Vanguard<span className="text-emerald-400">Chess</span></h1>
          </button>

          <div className="flex items-center gap-2">
            {userData ? (
              <>
                <button
                  onClick={() => setActiveTab('profile')}
                  className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 px-2.5 py-1 rounded-xl text-left hover:border-emerald-500/40 transition-colors"
                  title="Ver Perfil"
                >
                  <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-emerald-400">
                    {(userData.displayName?.charAt(0)?.toUpperCase() || "?")}
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-zinc-200 truncate max-w-[90px]">{userData.displayName}</div>
                    <div className="text-[10px] text-emerald-500 font-bold">{userData.elo} Elo</div>
                  </div>
                </button>
                <button onClick={() => { setEditNickname(userData.displayName || ''); setShowSettings(true); }} className="p-2 text-zinc-400 hover:text-zinc-100" title="Configurações"><Settings className="w-5 h-5" /></button>
                <button onClick={handleLogout} className="p-2 text-red-500" title="Sair"><LogOut className="w-5 h-5" /></button>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleLogin('login')}
                  className="bg-[#363430] hover:bg-[#423f3a] text-neutral-200 border border-[#48443e] px-2.5 py-1.5 rounded-lg font-bold text-xs"
                >
                  Entrar
                </button>
                <button
                  onClick={() => handleLogin('register')}
                  className="bg-[#81b64c] hover:bg-[#76a843] text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-[0_2px_0_#5c8734]"
                >
                  Cadastre-se
                </button>
              </div>
            )}
          </div>
        </header>

        {/* AdBanner area (below mobile header, top of main content) */}
        {!(userData?.isPremium && userData.premiumUntil && userData.premiumUntil > Date.now()) && (
          <Suspense fallback={null}>
            <AdBanner />
          </Suspense>
        )}

        {(() => {
          const isPlayingGame = activeTab === 'play' && (Boolean(activeGame) || Boolean(computerGameDifficulty) || Boolean(isLocalGame));
          return (
            <main className={cn(
              "flex-1",
              isPlayingGame
                ? "overflow-y-auto md:overflow-hidden p-1 sm:p-2 lg:p-2.5 pb-20 md:pb-2 flex flex-col justify-center"
                : "overflow-y-auto p-4 md:p-8 pb-24 md:pb-8"
            )}>
              <div className={cn("mx-auto h-full", isPlayingGame ? "w-full max-w-[1700px] flex flex-col justify-center items-center" : "max-w-7xl")}>
                <Suspense fallback={<div className="w-full py-8 text-center text-sm text-zinc-400" role="status">Carregando…</div>}>
                {activeTab === 'play' && (
                  activeGame ? (
                    <ErrorBoundary fallbackTitle="Erro ao carregar partida" onReset={() => setActiveGame(null)}>
                      <Game
                        key={activeGame.id}
                        game={activeGame}
                        currentUser={userData || {
                          uid: user?.uid || 'guest',
                          displayName: user?.displayName || 'Jogador',
                          elo: 1200,
                          gamesPlayed: 0,
                          coins: 0
                        }}
                        onExit={handleBrandClick}
                      />
                    </ErrorBoundary>
                  ) : computerGameDifficulty ? (
                    <ErrorBoundary fallbackTitle="Erro no jogo contra computador" onReset={() => setComputerGameDifficulty(null)}>
                      <ComputerGame
                        difficulty={computerGameDifficulty}
                        currentUser={userData}
                        onExit={(abandoning = true) => abandoning ? handleBrandClick() : setComputerGameDifficulty(null)}
                      />
                    </ErrorBoundary>
                  ) : isLocalGame ? (
                    <LocalGame onExit={(abandoning = true) => abandoning ? handleBrandClick() : setIsLocalGame(false)} />
                  ) : (
                    <Lobby currentUser={userData ? { ...userData, playSuspendedUntil } : null} playSuspendedUntil={playSuspendedUntil} onPlayComputer={(diff) => setComputerGameDifficulty(diff)} onPlayLocal={() => setIsLocalGame(true)} onBrowsePlayers={() => setActiveTab('friends')} onLoginRequest={handleLogin} />
                  )
                )}
                {activeTab === 'rules' && <Rules />}
                {activeTab === 'ranking' && <Leaderboard />}
                {activeTab === 'about' && <About />}

                {/* Protected Routes */}
                {!userData && ['tournaments', 'chat', 'training', 'friends', 'store', 'profile'].includes(activeTab) && (
                  <div className="flex-1 flex items-center justify-center h-[60vh]">
                    <div className="max-w-md w-full bg-[#262421] rounded-3xl p-8 text-center space-y-6 shadow-2xl border border-[#3d3a34]">
                      <div className="w-16 h-16 bg-[#81b64c]/10 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-[#81b64c]/20">
                        <LogIn className="w-8 h-8 text-[#81b64c]" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-1">Acesse sua Conta</h2>
                        <p className="text-zinc-400 text-sm">Você precisa estar conectado para acessar esta área do jogo.</p>
                      </div>
                      <div className="space-y-3">
                        <button
                          onClick={() => handleLogin('register')}
                          className="w-full bg-[#81b64c] hover:bg-[#76a843] active:bg-[#6c9a3c] text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-[0_4px_0_#5c8734] active:translate-y-1 active:shadow-none flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-5 h-5" />
                          Criar Conta no Chess
                        </button>
                        <button
                          onClick={() => handleLogin('login')}
                          className="w-full bg-[#363430] hover:bg-[#423f3a] text-neutral-100 font-bold py-3.5 px-6 rounded-xl transition-all border border-[#48443e] flex items-center justify-center gap-2"
                        >
                          <LogIn className="w-5 h-5" />
                          Já tenho uma conta (Entrar)
                        </button>
                      </div>
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
                    {activeTab === 'training' && <Training currentUser={userData} onPlayComputer={(diff) => setComputerGameDifficulty(diff)} onOpenStore={() => { setStoreInitialTab('vip'); setActiveTab('store'); }} />}
                    {activeTab === 'friends' && <Friends currentUser={userData} />}
                    {activeTab === 'store' && <Store currentUser={userData} initialTab={storeInitialTab} />}
                    {activeTab === 'profile' && <Profile currentUser={userData} />}
                  </>
                )}
                </Suspense>
              </div>
            </main>
          );
        })()}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 flex overflow-x-auto custom-scrollbar z-50 pb-safe">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { if (item.id === 'store') setStoreInitialTab('themes'); setActiveTab(item.id); }}
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
              {/* Identificação / Nickname */}
              <div className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserIcon className="w-5 h-5 text-emerald-500" />
                    <span className="font-medium text-zinc-200">Apelido de Jogador</span>
                  </div>
                  {userData && (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      {userData.elo} Elo
                    </span>
                  )}
                </div>

                {userData ? (
                  <form onSubmit={handleSaveNickname} className="space-y-2 pt-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editNickname}
                        onChange={(e) => {
                          setEditNickname(e.target.value);
                          setNicknameFeedback(null);
                        }}
                        maxLength={15}
                        placeholder="Novo apelido..."
                        className="flex-1 bg-zinc-950 border border-zinc-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={nicknameSaving || !editNickname.trim() || editNickname.trim() === userData.displayName}
                        className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-bold px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        {nicknameSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Salvar
                      </button>
                    </div>
                    {nicknameFeedback && (
                      <p className="text-xs text-emerald-400 font-medium pl-1">{nicknameFeedback}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettings(false);
                        setActiveTab('profile');
                      }}
                      className="w-full text-left text-xs text-zinc-400 hover:text-emerald-400 transition-colors pt-1 flex items-center justify-between group"
                    >
                      <span>Ver perfil completo e histórico</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                  </form>
                ) : (
                  <div className="text-xs text-zinc-400 flex items-center justify-between pt-1">
                    <span>Faça login para salvar e alterar seu apelido.</span>
                    <button onClick={() => handleLogin('login')} className="text-emerald-400 hover:underline font-bold">Entrar</button>
                  </div>
                )}
              </div>

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
                  {CHESS_THEMES.map(t => {
                    const isUnlocked = !userData || (userData.unlockedThemes?.includes(t.id)) || t.price === 0;
                    const isSelected = currentTheme.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={async () => {
                          if (!isUnlocked) {
                            setShowSettings(false);
                            setStoreInitialTab('themes');
                            setActiveTab('store');
                            return;
                          }
                          themeManager.setTheme(t.id);
                          if (userData?.uid) {
                            try {
                              const db = getDb();
                              await updateDoc(doc(db, 'users', userData.uid), { activeTheme: t.id });
                            } catch (e) {
                              console.error("Error saving activeTheme to user doc:", e);
                            }
                          }
                        }}
                        title={isUnlocked ? t.name : `${t.name} (Bloqueado - Loja)`}
                        className={cn(
                          "aspect-square rounded-xl border-2 overflow-hidden flex flex-col transition-all hover:scale-105 active:scale-95 relative",
                          isSelected ? "border-emerald-500 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500/30" : "border-zinc-700 hover:border-zinc-500",
                          !isUnlocked && "opacity-60 cursor-pointer"
                        )}
                      >
                        <div className="flex-1 w-full" style={t.lightSquareStyle} />
                        <div className="flex-1 w-full" style={t.darkSquareStyle} />
                        {!isUnlocked && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-yellow-400">Loja</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
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


      {/* Challenge Modal */}
      {incomingChallenge && !activeGame && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-zinc-900 rounded-3xl p-8 w-full max-w-sm border border-emerald-500/50 shadow-2xl relative text-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-500 animate-pulse">
              <Swords className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Desafio Recebido!</h2>
            <p className="text-zinc-400 mb-6">
              <span className="text-emerald-400 font-bold">{incomingChallenge.challengerName}</span> ({incomingChallenge.challengerElo} ELO) convidou você para uma partida.
            </p>
            <div className="flex gap-4">
              <button
                onClick={declineChallenge}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Recusar
              </button>
              <button
                onClick={acceptChallenge}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
              >
                Aceitar
              </button>
            </div>
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

      {showHomeExitConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => !isLeavingGameForHome && setShowHomeExitConfirm(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="leave-game-title" className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-zinc-900 p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400"><AlertTriangle className="h-6 w-6" /></div>
              <h2 id="leave-game-title" className="text-xl font-bold text-white">Sair da partida?</h2>
            </div>
            <p className="text-sm leading-6 text-zinc-300">Se confirmar, a partida será encerrada como abandono. Você ficará impedido de iniciar ou aceitar partidas por <strong className="text-amber-300">1 hora</strong>, a partir da confirmação.</p>
            {homeExitError && <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{homeExitError}</p>}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" disabled={isLeavingGameForHome} onClick={() => setShowHomeExitConfirm(false)} className="rounded-xl bg-zinc-800 px-4 py-3 font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50">Continuar jogando</button>
              <button type="button" disabled={isLeavingGameForHome} onClick={confirmLeaveGameForHome} className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-50">
                {isLeavingGameForHome ? <Loader2 className="h-4 w-4 animate-spin" /> : <Home className="h-4 w-4" />}
                Sair e aplicar penalidade
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Chess.com Style Auth Modal */}
      <Suspense fallback={null}>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultMode={authModalMode}
        />
      </Suspense>
    </div>
  );
}
