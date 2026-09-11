import re

with open("src/components/Store.tsx", "r") as f:
    code = f.read()

bg_content = """        {activeTab === 'backgrounds' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {APP_BACKGROUNDS.map(bg => {
              const isUnlocked = unlockedBackgrounds.includes(bg.id) || bg.price === 0;
              const isEquipped = activeBackground === bg.id;
              
              return (
                <div key={bg.id} className={`bg-neutral-800 rounded-xl p-6 border flex flex-col relative overflow-hidden group transition-colors ${isEquipped ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'border-neutral-700/50 hover:border-neutral-600'}`}>
                  
                  <div className="absolute top-0 right-0 p-3 z-20">
                    {isEquipped ? (
                      <div className="bg-indigo-500 p-1.5 rounded-full shadow-lg">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    ) : isUnlocked ? (
                      <div className="bg-neutral-700 p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Unlock className="w-4 h-4 text-neutral-400" />
                      </div>
                    ) : (
                      <div className="bg-neutral-900/80 p-1.5 rounded-full shadow-lg">
                        <Lock className="w-4 h-4 text-neutral-500" />
                      </div>
                    )}
                  </div>

                  <div 
                    className={`w-full aspect-video rounded-lg mb-4 flex items-center justify-center border border-neutral-700/50 shadow-inner ${bg.className || ''}`}
                    style={bg.style}
                  >
                    <span className="text-white/20 font-black text-2xl tracking-widest uppercase">BG</span>
                  </div>
                  
                  <div className="flex-1 flex flex-col">
                    <h4 className="font-bold text-white text-lg">{bg.name}</h4>
                    <p className="text-sm text-neutral-400 mt-1 mb-4 flex-1">{bg.description}</p>
                    
                    <div className="flex items-center justify-between mt-auto">
                      {isUnlocked ? (
                        <button
                          onClick={() => handleEquipBackground(bg.id)}
                          className={`w-full py-2.5 rounded-lg font-bold transition-colors ${
                            isEquipped 
                              ? 'bg-indigo-500/20 text-indigo-400 cursor-default' 
                              : 'bg-neutral-700 hover:bg-neutral-600 text-white'
                          }`}
                        >
                          {isEquipped ? 'Equipado' : 'Equipar'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBuyBackground(bg.id, bg.price)}
                          className="w-full bg-yellow-500 hover:bg-yellow-400 text-yellow-950 py-2.5 rounded-lg font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <Coins className="w-4 h-4" />
                          {bg.price.toLocaleString()}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

"""

if "activeTab === 'backgrounds'" not in code:
    code = code.replace("{activeTab === 'themes' && (", bg_content + "{activeTab === 'themes' && (")

with open("src/components/Store.tsx", "w") as f:
    f.write(code)

