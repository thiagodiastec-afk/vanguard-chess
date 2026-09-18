import React, { useState, useEffect, useRef } from 'react';
import { 
  signInWithPopup, 
  signInWithRedirect, 
  GoogleAuthProvider, 
  OAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  signInAnonymously,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  browserPopupRedirectResolver,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { initFirebase } from '../lib/firebase';
import { UserData } from '../types';
import { 
  X, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Smartphone, 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  Loader2, 
  User as UserIcon, 
  Sparkles,
  ShieldCheck,
  LogIn,
  RotateCcw
} from 'lucide-react';
import { cn } from '../lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'register' | 'login';
}

type AuthView = 'email' | 'phone' | 'forgot_password' | 'phone_verify';

export default function AuthModal({ isOpen, onClose, defaultMode = 'register' }: AuthModalProps) {
  const [mode, setMode] = useState<'register' | 'login'>(defaultMode);
  const [currentView, setCurrentView] = useState<AuthView>('email');
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Phone form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Status state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setCurrentView('email');
      setError(null);
      setSuccessMessage(null);
      setEmail('');
      setPassword('');
      setDisplayName('');
      setPhoneNumber('');
      setVerificationCode('');
    }
  }, [isOpen, defaultMode]);

  // Resend countdown timer
  useEffect(() => {
    let timer: any;
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // Cleanup recaptcha when component unmounts
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  if (!isOpen) return null;

  // Helper to ensure user document exists in Firestore
  const ensureUserInFirestore = async (firebaseUser: any, customName?: string) => {
    try {
      const { db } = await initFirebase();
      if (!db) return;
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const finalName = customName || firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Jogador');
        const initialUserData: UserData = {
          uid: firebaseUser.uid,
          displayName: finalName,
          hasSetNickname: Boolean(customName || firebaseUser.displayName),
          elo: 1200,
          gamesPlayed: 0,
          coins: 500,
          unlockedThemes: ['luxury', 'classic'],
          unlockedBackgrounds: ['default'],
          activeBackground: 'default',
          isOnline: true,
          lastSeen: Date.now()
        };
        await setDoc(userRef, initialUserData);
      }
    } catch (err) {
      console.error("Erro ao sincronizar perfil do usuário:", err);
    }
  };

  const formatPhoneNumber = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 2) return digits.length ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const getTranslatedErrorMessage = (errorCode: string, defaultMsg: string) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'O endereço de e-mail informado é inválido.';
      case 'auth/user-disabled':
        return 'Esta conta de usuário foi desativada.';
      case 'auth/user-not-found':
        return 'Nenhuma conta encontrada com este e-mail.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'E-mail ou senha incorretos.';
      case 'auth/email-already-in-use':
        return 'Este e-mail já está cadastrado. Faça login na aba "Entrar" ou use outro e-mail.';
      case 'auth/weak-password':
        return 'A senha deve ter pelo menos 6 caracteres.';
      case 'auth/popup-closed-by-user':
        return 'A janela de autenticação foi fechada antes de concluir.';
      case 'auth/popup-blocked':
        return 'O navegador bloqueou a janela pop-up de login. Permita pop-ups para entrar.';
      case 'auth/invalid-phone-number':
        return 'Número de telefone inválido. Informe o DDD e o número completo (Ex: 11 98765-4321).';
      case 'auth/invalid-verification-code':
        return 'Código de verificação SMS inválido ou expirado.';
      case 'auth/code-expired':
        return 'O código SMS expirou. Solicite um novo código.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas em pouco tempo. Aguarde alguns instantes.';
      case 'auth/operation-not-allowed':
      case 'auth/admin-restricted-operation':
        return 'O login por E-mail/Senha precisa ser ativado no Console do Firebase (Authentication > Sign-in method > Ativar Email/Password). Você também pode clicar no botão "Continue com Google" abaixo para entrar instantaneamente!';
      case 'auth/captcha-check-failed':
      case 'auth/invalid-app-credential':
        return 'Falha na verificação de segurança reCAPTCHA. Recomendamos utilizar a conta Google ou E-mail.';
      case 'auth/unauthorized-domain':
        return 'Domínio não autorizado para autenticação no Firebase. Utilize o cadastro com E-mail e Senha.';
      default:
        return defaultMsg || 'Ocorreu um erro ao processar. Tente novamente ou use E-mail/Google.';
    }
  };

  // Google Login
  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      const { auth } = await initFirebase();
      await setPersistence(auth, browserSessionPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      if (result.user) {
        await ensureUserInFirestore(result.user);
        onClose();
      }
    } catch (err: any) {
      console.error("Google Auth error", err);
      if (err.code === 'auth/popup-blocked' || err.message?.toLowerCase().includes('popup')) {
        try {
          const { auth } = await initFirebase();
          await setPersistence(auth, browserSessionPersistence);
          const provider = new GoogleAuthProvider();
          await signInWithRedirect(auth, provider);
        } catch (redirectErr: any) {
          setError(getTranslatedErrorMessage(redirectErr.code, redirectErr.message));
        }
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError(getTranslatedErrorMessage(err.code, err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  // Apple Login
  const handleAppleAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      const { auth } = await initFirebase();
      await setPersistence(auth, browserSessionPersistence);
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      
      const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      if (result.user) {
        await ensureUserInFirestore(result.user);
        onClose();
      }
    } catch (err: any) {
      console.error("Apple Auth error", err);
      if (err.code === 'auth/popup-blocked') {
        try {
          const { auth } = await initFirebase();
          await setPersistence(auth, browserSessionPersistence);
          const provider = new OAuthProvider('apple.com');
          await signInWithRedirect(auth, provider);
        } catch (redirectErr: any) {
          setError(getTranslatedErrorMessage(redirectErr.code, redirectErr.message));
        }
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError(getTranslatedErrorMessage(err.code, "Login com Apple indisponível no momento. Utilize Google ou E-mail."));
      }
    } finally {
      setLoading(false);
    }
  };

  // Email/Password Submit (Registration or Login)
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (mode === 'register' && password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { auth } = await initFirebase();
      await setPersistence(auth, browserSessionPersistence);
      
      if (mode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const finalNickname = displayName.trim() || email.trim().split('@')[0];
        try {
          await updateProfile(userCredential.user, { displayName: finalNickname });
        } catch (e) {
          // ignore profile update error
        }
        await ensureUserInFirestore(userCredential.user, finalNickname);
        onClose();
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        await ensureUserInFirestore(userCredential.user);
        onClose();
      }
    } catch (err: any) {
      console.error("Email auth error:", err);
      setError(getTranslatedErrorMessage(err.code, err.message));
    } finally {
      setLoading(false);
    }
  };

  // Password Reset
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Digite seu e-mail para recuperar a senha.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { auth } = await initFirebase();
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      setTimeout(() => {
        setCurrentView('email');
        setMode('login');
      }, 3000);
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(getTranslatedErrorMessage(err.code, err.message));
    } finally {
      setLoading(false);
    }
  };

  // Setup reCAPTCHA for phone auth
  const setupRecaptcha = async () => {
    try {
      const { auth } = await initFirebase();
      if (!recaptchaVerifierRef.current && recaptchaContainerRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved
          },
          'expired-callback': () => {
            setError('Verificação de segurança expirada. Tente novamente.');
          }
        });
      }
      return recaptchaVerifierRef.current;
    } catch (err: any) {
      console.error("Erro ao configurar reCAPTCHA:", err);
      return null;
    }
  };

  // Send SMS Code
  const handleSendPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setError('Digite o número de telefone com DDD.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { auth } = await initFirebase();
      const appVerifier = await setupRecaptcha();
      if (!appVerifier) {
        throw new Error('Falha ao inicializar verificação de segurança.');
      }

      let digitsOnly = phoneNumber.replace(/\D/g, '');
      if (!digitsOnly.startsWith('55') || digitsOnly.length <= 11) {
        digitsOnly = '55' + digitsOnly;
      }
      const formattedPhone = '+' + digitsOnly;

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setCurrentView('phone_verify');
      setResendCountdown(60);
      setSuccessMessage('Código SMS enviado com sucesso!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error("Erro ao enviar SMS:", err);
      setError(getTranslatedErrorMessage(err.code, err.message));
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        } catch (e) {
          // ignore
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Verify SMS Code
  const handleVerifyPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length < 6 || !confirmationResult) {
      setError('Digite o código de 6 dígitos recebido por SMS.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { auth } = await initFirebase();
      await setPersistence(auth, browserSessionPersistence);
      const result = await confirmationResult.confirm(verificationCode);
      if (result.user) {
        await ensureUserInFirestore(result.user);
        onClose();
      }
    } catch (err: any) {
      console.error("Erro ao verificar código SMS:", err);
      setError(getTranslatedErrorMessage(err.code, err.message));
    } finally {
      setLoading(false);
    }
  };

  // Guest Login
  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { auth } = await initFirebase();
      await setPersistence(auth, browserSessionPersistence);
      const result = await signInAnonymously(auth);
      if (result.user) {
        const guestName = `Convidado_${Math.floor(1000 + Math.random() * 9000)}`;
        await ensureUserInFirestore(result.user, guestName);
        onClose();
      }
    } catch (err: any) {
      console.error("Guest login error", err);
      setError(getTranslatedErrorMessage(err.code, "Erro ao entrar como convidado."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-[#262421] border border-[#3d3a34] rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl relative flex flex-col items-center max-h-[92vh] overflow-y-auto custom-scrollbar"
        onClick={e => e.stopPropagation()}
      >
        {/* Invisible reCAPTCHA container */}
        <div ref={recaptchaContainerRef} id="recaptcha-container" />

        {/* Top Header Controls */}
        <div className="w-full flex items-center justify-between mb-2">
          {currentView !== 'email' ? (
            <button 
              onClick={() => {
                setError(null);
                setSuccessMessage(null);
                setCurrentView('email');
              }}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800/60 transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          ) : (
            <div />
          )}

          <button 
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800/60 transition-colors ml-auto"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chess.com 3D Isometric Green Pawn Icon */}
        <div className="w-20 h-20 relative flex items-center justify-center mb-3">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]">
            <ellipse cx="50" cy="80" rx="36" ry="12" fill="#151412" opacity="0.6" />
            <path
              d="M50 16 C 50 16, 56 22, 54 28 C 52 33, 44 33, 44 33 C 44 33, 38 31, 38 24 C 38 18, 44 16, 50 16 Z"
              fill="url(#pawnHeadLight)"
            />
            <path
              d="M32 38 L68 38 L62 44 L38 44 Z"
              fill="#6ea33c"
            />
            <path
              d="M38 44 C 42 56, 44 64, 30 74 L70 74 C 56 64, 58 56, 62 44 Z"
              fill="url(#pawnBodyGrad)"
            />
            <ellipse cx="50" cy="74" rx="22" ry="5" fill="#58852d" />
            <path
              d="M24 74 C 24 74, 20 78, 20 82 C 20 84, 80 84, 80 82 C 80 78, 76 74, 76 74 Z"
              fill="url(#pawnBaseGrad)"
            />
            <ellipse cx="50" cy="82" rx="30" ry="4" fill="#3f611f" />
            <path
              d="M48 18 C 48 18, 51 22, 50 25 C 47 25, 45 22, 46 19 Z"
              fill="#ffffff"
              opacity="0.3"
            />
            <defs>
              <linearGradient id="pawnHeadLight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a3d969" />
                <stop offset="40%" stopColor="#81b64c" />
                <stop offset="100%" stopColor="#4f7529" />
              </linearGradient>
              <linearGradient id="pawnBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#95cc5c" />
                <stop offset="50%" stopColor="#81b64c" />
                <stop offset="100%" stopColor="#446822" />
              </linearGradient>
              <linearGradient id="pawnBaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#81b64c" />
                <stop offset="100%" stopColor="#3b591b" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black text-center text-white tracking-tight leading-snug mb-1">
          {currentView === 'forgot_password' 
            ? 'Recuperar Senha' 
            : currentView === 'phone' || currentView === 'phone_verify'
            ? 'Entrar com Celular'
            : mode === 'register' 
            ? 'Crie a Sua Conta no Chess' 
            : 'Entrar na sua Conta'}
        </h2>

        {/* Subtitle */}
        <p className="text-xs text-neutral-400 text-center mb-4 max-w-xs">
          {currentView === 'forgot_password' 
            ? 'Informe seu e-mail para enviarmos o link de recuperação.'
            : currentView === 'phone_verify'
            ? 'Digite o código de 6 dígitos enviado por SMS.'
            : mode === 'register' 
            ? 'Junte-se a milhares de jogadores online ao redor do mundo.' 
            : 'Bem-vindo de volta! Acesse suas partidas e progresso.'}
        </p>

        {/* Feedback Alerts */}
        {error && (
          <div className="w-full bg-red-500/15 border border-red-500/30 text-red-400 px-3.5 py-2.5 rounded-xl text-xs flex items-start gap-2 mb-4 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="w-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-3.5 py-2.5 rounded-xl text-xs flex items-start gap-2 mb-4 animate-in fade-in">
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
            <span className="leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* Top Mode Segmented Tabs (Cadastrar vs Entrar) */}
        {currentView === 'email' && (
          <div className="flex bg-[#1e1c19] p-1 rounded-2xl border border-[#383531] mb-5 w-full">
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setSuccessMessage(null);
              }}
              className={cn(
                "flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5",
                mode === 'register'
                  ? "bg-[#81b64c] text-white shadow-md"
                  : "text-neutral-400 hover:text-white"
              )}
            >
              <Sparkles className="w-4 h-4" />
              Cadastrar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMessage(null);
              }}
              className={cn(
                "flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5",
                mode === 'login'
                  ? "bg-[#81b64c] text-white shadow-md"
                  : "text-neutral-400 hover:text-white"
              )}
            >
              <LogIn className="w-4 h-4" />
              Entrar
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: EMAIL & PASSWORD FORM (REGISTRATION OR LOGIN) */}
        {/* ========================================================================= */}
        {currentView === 'email' && (
          <div className="w-full">
            <form onSubmit={handleEmailAuth} className="w-full space-y-3">
              {/* Nickname Field (Cadastro only) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                    Apelido no Jogo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Ex: MestreDoXadrez"
                      maxLength={18}
                      className="w-full bg-[#1e1c19] border border-[#3d3a34] focus:border-[#81b64c] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#81b64c] transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full bg-[#1e1c19] border border-[#3d3a34] focus:border-[#81b64c] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#81b64c] transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">
                    Senha
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setSuccessMessage(null);
                        setCurrentView('forgot_password');
                      }}
                      className="text-xs text-neutral-400 hover:text-emerald-400 transition-colors"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'Mínimo de 6 caracteres' : 'Digite sua senha'}
                    minLength={6}
                    className="w-full bg-[#1e1c19] border border-[#3d3a34] focus:border-[#81b64c] rounded-xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#81b64c] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-white transition-colors"
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Primary Green Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#81b64c] hover:bg-[#76a843] active:bg-[#6c9a3c] text-white font-bold py-3.5 px-4 rounded-xl text-sm sm:text-base transition-all duration-150 shadow-[0_4px_0_#5c8734] active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <span>{mode === 'register' ? 'Criar Minha Conta Grátis' : 'Entrar no Chess'}</span>
                )}
              </button>
            </form>

            {/* Divider "OU CONTINUE COM" */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-[1px] bg-[#3d3a34]" />
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">OU CONTINUE COM</span>
              <div className="flex-1 h-[1px] bg-[#3d3a34]" />
            </div>

            {/* Social & Alternative Auth Buttons */}
            <div className="space-y-2.5">
              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full bg-[#363430] hover:bg-[#423f3a] active:bg-[#2d2b27] text-neutral-100 font-bold py-3 px-4 rounded-xl text-sm border border-[#48443e] transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.99] disabled:opacity-50"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue com Google</span>
              </button>

              {/* Phone Button */}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setCurrentView('phone');
                }}
                disabled={loading}
                className="w-full bg-[#363430] hover:bg-[#423f3a] active:bg-[#2d2b27] text-neutral-100 font-bold py-3 px-4 rounded-xl text-sm border border-[#48443e] transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.99] disabled:opacity-50"
              >
                <Smartphone className="w-4 h-4 text-neutral-300 flex-shrink-0" />
                <span>Continue com o Celular (SMS)</span>
              </button>

              {/* Apple Button */}
              <button
                type="button"
                onClick={handleAppleAuth}
                disabled={loading}
                className="w-full bg-[#363430] hover:bg-[#423f3a] active:bg-[#2d2b27] text-neutral-100 font-bold py-3 px-4 rounded-xl text-sm border border-[#48443e] transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.99] disabled:opacity-50"
              >
                <svg className="w-4 h-4 fill-white flex-shrink-0" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.08-7.61-7.85-11.75-14.34-5.38-8.44-9.75-18.23-13.1-29.35C2.17 99.85.5 88.94.5 77.49c0-13.43 3.37-24.97 10.12-34.62 6.74-9.66 15.35-14.58 25.82-14.77 5.03 0 10.51 1.34 16.44 4.02 5.92 2.68 9.94 4.08 12.06 4.2 2.45 0 6.64-1.46 12.57-4.38 5.93-2.92 11.27-4.32 16.03-4.2 11.83.56 21.26 4.88 28.3 12.97-10.42 6.3-15.53 14.86-15.32 25.68.21 8.44 3.44 15.55 9.68 21.32 6.25 5.78 13.59 9.07 22.04 9.87-1.9 5.86-4.3 11.51-7.21 16.95zM119.22 3.01c0 7.4-2.65 14.3-7.95 20.7-5.3 6.4-11.78 10.28-19.45 11.64-.13-1.1-.2-2.12-.2-3.07 0-7.27 2.87-14.4 8.6-21.38 5.74-6.98 12.38-10.74 19.92-11.29.07 1.13.1 2.26.1 3.4z" />
                </svg>
                <span>Continuar com Apple</span>
              </button>

              {/* Guest / Anônimo */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={handleGuestLogin}
                  disabled={loading}
                  className="text-xs text-neutral-400 hover:text-emerald-400 transition-colors py-1 px-3 rounded-lg hover:bg-neutral-800/40"
                >
                  Ou jogar temporariamente como Convidado
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: PHONE FORM (ENTER PHONE NUMBER) */}
        {/* ========================================================================= */}
        {currentView === 'phone' && (
          <div className="w-full space-y-4 animate-in fade-in duration-150">
            <form onSubmit={handleSendPhoneCode} className="w-full space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Número do Celular (com DDD)
                </label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 font-bold text-xs border-r border-[#3d3a34] pr-2.5 my-2">
                    <span>🇧🇷 +55</span>
                  </div>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(formatPhoneNumber(e.target.value))}
                    placeholder="(11) 98765-4321"
                    maxLength={15}
                    className="w-full bg-[#1e1c19] border border-[#3d3a34] focus:border-[#81b64c] rounded-xl pl-20 pr-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#81b64c] transition-all font-mono"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1.5">
                  Enviaremos um código SMS de verificação gratuito para o seu celular.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || phoneNumber.replace(/\D/g, '').length < 10}
                className="w-full bg-[#81b64c] hover:bg-[#76a843] active:bg-[#6c9a3c] text-white font-bold py-3.5 px-4 rounded-xl text-sm sm:text-base transition-all duration-150 shadow-[0_4px_0_#5c8734] active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Enviando SMS...</span>
                  </>
                ) : (
                  <span>Enviar Código por SMS</span>
                )}
              </button>
            </form>

            <div className="pt-3 border-t border-[#383531] text-center space-y-2">
              <p className="text-xs text-neutral-400">Prefere entrar sem depender de SMS?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setCurrentView('email');
                    setMode('register');
                  }}
                  className="flex-1 bg-[#363430] hover:bg-[#423f3a] text-neutral-200 text-xs font-bold py-2.5 px-3 rounded-xl border border-[#48443e] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  <span>E-mail e Senha</span>
                </button>
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="flex-1 bg-[#363430] hover:bg-[#423f3a] text-neutral-200 text-xs font-bold py-2.5 px-3 rounded-xl border border-[#48443e] transition-colors flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: PHONE SMS CODE VERIFICATION */}
        {/* ========================================================================= */}
        {currentView === 'phone_verify' && (
          <form onSubmit={handleVerifyPhoneCode} className="w-full space-y-4 animate-in fade-in duration-150">
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                Código de 6 Dígitos
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full bg-[#1e1c19] border border-[#3d3a34] focus:border-[#81b64c] rounded-xl px-4 py-3 text-center text-xl tracking-[0.4em] font-mono text-white focus:outline-none focus:ring-1 focus:ring-[#81b64c] transition-all"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || verificationCode.length < 6}
              className="w-full bg-[#81b64c] hover:bg-[#76a843] active:bg-[#6c9a3c] text-white font-bold py-3.5 px-4 rounded-xl text-sm sm:text-base transition-all duration-150 shadow-[0_4px_0_#5c8734] active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Validando...</span>
                </>
              ) : (
                <span>Confirmar e Entrar</span>
              )}
            </button>

            <div className="text-center pt-1">
              {resendCountdown > 0 ? (
                <span className="text-xs text-neutral-500 font-mono">
                  Reenviar código em {resendCountdown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendPhoneCode}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-semibold"
                >
                  Reenviar Código SMS
                </button>
              )}
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: FORGOT PASSWORD */}
        {/* ========================================================================= */}
        {currentView === 'forgot_password' && (
          <form onSubmit={handleForgotPassword} className="w-full space-y-4 animate-in fade-in duration-150">
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                Seu E-mail Cadastrado
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full bg-[#1e1c19] border border-[#3d3a34] focus:border-[#81b64c] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#81b64c] transition-all"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-[#81b64c] hover:bg-[#76a843] active:bg-[#6c9a3c] text-white font-bold py-3.5 px-4 rounded-xl text-sm sm:text-base transition-all duration-150 shadow-[0_4px_0_#5c8734] active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <span>Enviar Instruções de Redefinição</span>
              )}
            </button>
          </form>
        )}

        {/* Bottom Switcher & Security Footer */}
        <div className="mt-5 pt-3 border-t border-[#383531] w-full flex flex-col items-center gap-2">
          {currentView === 'email' && (
            <p className="text-xs text-neutral-400 text-center">
              {mode === 'register' ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMessage(null);
                  setMode(mode === 'register' ? 'login' : 'register');
                }}
                className="text-[#81b64c] hover:text-[#97d159] font-bold transition-colors underline underline-offset-2 ml-1"
              >
                {mode === 'register' ? 'Entrar' : 'Cadastre-se'}
              </button>
            </p>
          )}

          <p className="text-[10px] text-neutral-500 text-center leading-tight max-w-xs flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70 flex-shrink-0" />
            <span>Ambiente protegido com criptografia de ponta a ponta.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
