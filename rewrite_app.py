import re

with open("src/App.tsx", "r") as f:
    app_code = f.read()

# I will replace the main layout structure in App.tsx
# Find the start of the return statement
start_idx = app_code.find("return (")

new_render = """return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col md:flex-row font-sans selection:bg-emerald-500/30">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-zinc-800 bg-zinc-950/80 backdrop-blur-xl h-screen sticky top-0 z-40">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Trophy className="w-5 h-5 text-zinc-950" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">Vanguard<span className="text-emerald-400">Chess</span></h1>
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
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                  isActive 
                    ? "bg-zinc-800/80 text-emerald-400 shadow-sm" 
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
                )}
              >
                <Icon className={cn("w-5 h-5 transition-transform", isActive ? "scale-110" : "")} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800/50">
          {userData ? (
            <div className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800">
              <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-emerald-400">
                {userData.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="font-bold text-sm text-zinc-100 truncate">{userData.displayName}</div>
                <div className="text-xs text-emerald-500 font-semibold">{userData.elo} Elo</div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => setShowSettings(true)} className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors" title="Configurações">
                  <Settings className="w-4 h-4" />
                </button>
                <button onClick={handleLogout} className="p-1.5 text-red-500 hover:text-red-400 transition-colors" title="Sair">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button onClick={handleLogin} className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 px-4 rounded-xl transition-all active:scale-95 text-sm flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" /> Entrar
              </button>
              <button onClick={() => setShowPix(true)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-bold py-3 px-4 rounded-xl transition-all active:scale-95 text-sm flex items-center justify-center gap-2 border border-emerald-500/20">
                <Heart className="w-4 h-4 fill-emerald-500" /> Apoiar
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
}"""

app_code = app_code[:start_idx] + new_render

with open("src/App.tsx", "w") as f:
    f.write(app_code)

