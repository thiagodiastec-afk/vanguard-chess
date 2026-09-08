with open("src/App.tsx", "r") as f:
    code = f.read()

missing_funcs = """
  const handleLogin = async () => {
    try {
      const { auth } = await initFirebase();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error", error);
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
"""

code = code.replace("  return (\n    <div className=\"min-h-screen", missing_funcs + '    <div className="min-h-screen')

with open("src/App.tsx", "w") as f:
    f.write(code)
