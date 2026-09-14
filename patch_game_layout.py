with open("src/components/Game.tsx", "r") as f:
    lines = f.readlines()

new_layout = """      {/* Left Side: Board Area (Order 1) */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[850px] order-1">
        
        {/* Top Player (Opponent) */}
        <div className="w-full flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-3">
            <div className={cn("w-4 h-4 rounded-full border-2 shadow-sm", isWhite ? "bg-black border-neutral-600" : "bg-white border-neutral-300")} />
            <div className="flex flex-col">
              <span className="font-bold text-white text-lg leading-tight">{opponentName} {topLabel}</span>
              <span className="text-xs text-emerald-400 font-bold">{opponentElo} Elo</span>
            </div>
            <div className="ml-2 hidden sm:block">
              <CapturedPieces id="tutorial-captured-pieces" fen={chess.fen()} color={isWhite ? 'b' : 'w'} />
            </div>
          </div>
          {game.timeControl && (
            <div className="bg-neutral-800/80 px-4 py-2 rounded-xl border border-neutral-700 font-mono text-2xl font-bold text-white shadow-xl min-w-[100px] text-center">
              {formatTime(isSpectator ? blackDisplayTime : (isWhite ? blackDisplayTime : whiteDisplayTime))}
            </div>
          )}
        </div>

        {/* Board & EvalBar */}
        <div className="w-full flex gap-2 sm:gap-4 lg:gap-6">
          <div className="py-2 hidden md:block">
             <EvalBar game={chess} isFlipped={!isWhite} />
          </div>
          <div className="flex-1 aspect-square shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] relative rounded-md bg-[#181512] p-[5%] pt-[4%] border-b-[45px] border-[#0a0908] border-x-[12px] border-x-[#14120f] border-t-[12px] border-t-[#1c1815]">
            <div className="absolute inset-[3%] border border-[#b57a3e]/40 pointer-events-none z-10" />
            <div className="absolute inset-[3.5%] border-2 border-[#b57a3e]/60 pointer-events-none z-10" />
            
            <div className="absolute bottom-[-45px] left-0 right-0 h-[45px] bg-gradient-to-b from-[#111] to-[#0a0a0a] pointer-events-none rounded-b-md flex items-center justify-center">
              <div className="w-[80%] h-[2px] bg-black/80 absolute top-0" />
              <span className="text-[#333] font-serif text-sm tracking-[0.3em] font-bold opacity-50">VANGUARD</span>
              <div className="w-[80%] h-[1px] bg-white/5 absolute bottom-1" />
            </div>

            <Chessboard
              position={chess.fen()}
              onPieceDrop={onDrop}
              boardOrientation={isSpectator ? "white" : (isWhite ? "white" : "black")}
              customDarkSquareStyle={{ backgroundColor: theme.dark }}
              customLightSquareStyle={{ backgroundColor: theme.light }}
              customBoardStyle={{
                borderRadius: '2px',
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
              }}
              customPieces={customPieces}
              customArrows={arrows}
              customSquareStyles={customSquareStyles}
              onSquareClick={onSquareClick}
              onSquareRightClick={onSquareRightClick}
              animationDuration={200}
            />

            {(game.status === 'checkmate' || game.status === 'draw' || game.status === 'stalemate' || game.status === 'resigned') && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-sm">
                <div className="bg-neutral-900/90 p-8 rounded-2xl shadow-2xl text-center border border-emerald-500/30 transform animate-in zoom-in duration-300">
                  <h2 className="text-4xl font-black text-white mb-2 drop-shadow-lg">
                    {game.status === 'draw' || game.status === 'stalemate' ? 'Empate' : 'Fim de Jogo'}
                  </h2>
                  <p className="text-emerald-400 font-bold text-xl uppercase tracking-widest">
                    {game.status === 'draw' ? 'Por Acordo' : 
                     game.status === 'stalemate' ? 'Rei Afogado' : 
                     game.status === 'resigned' ? 'Abandono' :
                     'Xeque-Mate'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Player (You) */}
        <div className="w-full flex items-center justify-between mt-5 px-2">
          <div className="flex items-center gap-3">
            <div className={cn("w-4 h-4 rounded-full border-2 shadow-sm", isWhite ? "bg-white border-neutral-300" : "bg-black border-neutral-600")} />
            <div className="flex flex-col">
              <span className="font-bold text-white text-lg leading-tight">{bottomName} {bottomLabel}</span>
              <span className="text-xs text-emerald-400 font-bold">{bottomElo} Elo</span>
            </div>
            <div className="ml-2 hidden sm:block">
              <CapturedPieces id="tutorial-captured-pieces" fen={chess.fen()} color={isWhite ? 'w' : 'b'} />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {!isSpectator && (
                <button
                  onClick={toggleSpectatorAccess}
                  className={cn(
                    "font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm",
                    (isWhite ? game.spectatorsAllowedWhite : game.spectatorsAllowedBlack)
                      ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                      : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                  )}
                  title="Permitir Espectadores"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
              
              {isSpectator && (
                <button
                  onClick={onExit}
                  className="bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center transition-colors text-sm"
                >
                  Sair
                </button>
              )}
              
              {!isSpectator && (
                <button 
                  onClick={resign}
                  disabled={game.status !== 'playing'}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Abandonar"
                >
                  <Flag className="w-4 h-4" />
                </button>
              )}
            </div>
            {game.timeControl && (
              <div className="bg-neutral-800/80 px-4 py-2 rounded-xl border border-neutral-700 font-mono text-2xl font-bold text-emerald-400 shadow-xl min-w-[100px] text-center">
                {formatTime(isSpectator ? whiteDisplayTime : (isWhite ? whiteDisplayTime : blackDisplayTime))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Right Sidebar: History & Chat (Order 2) */}
      <div className="w-full xl:w-[350px] flex-shrink-0 flex flex-col gap-4 order-2 xl:h-[800px]">
        <div className="flex flex-col bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden h-[300px] xl:h-[45%]">
          <MoveHistory history={chess.history()} />
        </div>
        <div className="flex flex-col bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden h-[400px] xl:h-[55%]">
          <ChatBox 
            roomId={`game_${game.id}`} 
            currentUser={currentUser} 
            title="Chat da Partida"
            className="flex-1 h-full"
          />
        </div>
      </div>
"""

# Reconstruct file
new_content = "".join(lines[:542]) + new_layout + "".join(lines[707:])
new_content = new_content.replace('import { Flag, Handshake', 'import { Flag, Eye, Handshake')

# We need to change the main wrapper flex row configuration to match the new layout
# Previous: <div className="flex-1 w-full max-w-[1600px] mx-auto p-4 lg:p-8 flex flex-col xl:flex-row gap-8 items-center xl:items-start">
# New: <div className="flex-1 w-full max-w-[1600px] mx-auto p-4 lg:p-6 flex flex-col xl:flex-row gap-6 items-center xl:items-start justify-center">

new_content = new_content.replace('className="flex-1 w-full max-w-[1600px] mx-auto p-4 lg:p-8 flex flex-col xl:flex-row gap-8 items-center xl:items-start"', 'className="flex-1 w-full max-w-[1600px] mx-auto p-4 lg:p-6 flex flex-col xl:flex-row gap-6 items-center xl:items-start justify-center"')

with open("src/components/Game.tsx", "w") as f:
    f.write(new_content)
