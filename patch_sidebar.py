import re

with open("src/App.tsx", "r") as f:
    code = f.read()

# Replace the aside tag
aside_old = '      <aside className="hidden md:flex flex-col w-64 border-r border-zinc-800 bg-zinc-950/80 backdrop-blur-xl h-screen sticky top-0 z-40">'
aside_new = '      <aside className="hidden md:flex flex-col w-20 hover:w-64 transition-all duration-300 border-r border-zinc-800 bg-zinc-950/90 backdrop-blur-xl h-screen sticky top-0 z-50 group overflow-hidden">'

# Fix padding for the logo div to fit inside w-20 perfectly (20px + 40px icon + 20px = 80px)
logo_div_old = '<div className="p-6 flex items-center gap-3">'
logo_div_new = '<div className="p-5 group-hover:p-6 flex items-center gap-3 transition-all">'

# Replace the Logo h1
logo_old = '<h1 className="text-xl font-black tracking-tight text-white">Vanguard<span className="text-emerald-400">Chess</span></h1>'
logo_new = '<h1 className="text-xl font-black tracking-tight text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Vanguard<span className="text-emerald-400">Chess</span></h1>'

# Replace the button rendering
btn_old = """              <button
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
              </button>"""

btn_new = """              <button
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
              </button>"""

# Replace User Widget (Logged In)
user_old = """          {userData ? (
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
          ) : ("""

user_new = """          {userData ? (
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
          ) : ("""

# Replace Login Widget (Logged Out)
login_old = """            <div className="space-y-2">
              <button onClick={handleLogin} className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 px-4 rounded-xl transition-all active:scale-95 text-sm flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" /> Entrar
              </button>
              <button onClick={() => setShowPix(true)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-bold py-3 px-4 rounded-xl transition-all active:scale-95 text-sm flex items-center justify-center gap-2 border border-emerald-500/20">
                <Heart className="w-4 h-4 fill-emerald-500" /> Apoiar
              </button>
            </div>"""

login_new = """            <div className="space-y-2 flex flex-col items-center group-hover:items-stretch transition-all overflow-hidden">
              <button onClick={handleLogin} className="w-10 h-10 group-hover:w-full group-hover:h-auto bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold group-hover:py-3 group-hover:px-4 rounded-xl transition-all active:scale-95 text-sm flex items-center justify-center gap-2" title="Entrar">
                <LogIn className="w-5 h-5 group-hover:w-4 group-hover:h-4 flex-shrink-0" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden group-hover:inline whitespace-nowrap">Entrar</span>
              </button>
              <button onClick={() => setShowPix(true)} className="w-10 h-10 group-hover:w-full group-hover:h-auto bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-bold group-hover:py-3 group-hover:px-4 rounded-xl transition-all active:scale-95 text-sm flex items-center justify-center gap-2 border border-emerald-500/20" title="Apoiar">
                <Heart className="w-5 h-5 group-hover:w-4 group-hover:h-4 fill-emerald-500 flex-shrink-0" /> 
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden group-hover:inline whitespace-nowrap">Apoiar</span>
              </button>
            </div>"""

code = code.replace(aside_old, aside_new)
code = code.replace(logo_div_old, logo_div_new)
code = code.replace(logo_old, logo_new)
code = code.replace(btn_old, btn_new)
code = code.replace(user_old, user_new)
code = code.replace(login_old, login_new)

with open("src/App.tsx", "w") as f:
    f.write(code)

