import os

code = """import { X, ExternalLink, Cpu, Monitor, Zap, Wrench, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

export default function AdBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative overflow-hidden p-[2px] bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 shadow-lg">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/circuit-board.png')] opacity-30 pointer-events-none mix-blend-overlay" />
      
      <div className="relative bg-neutral-900/95 backdrop-blur-md p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="flex flex-col sm:flex-row items-center gap-4 flex-1 w-full">
          {/* Ad Label */}
          <div className="hidden sm:flex bg-black/60 text-cyan-400 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border border-cyan-500/30 shrink-0 self-start mt-1 shadow-inner">
            Publicidade
          </div>

          {/* Visual Element */}
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-cyan-300/30 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition-colors" />
            <Cpu className="w-8 h-8 text-white relative z-10" />
            <Wrench className="w-5 h-5 text-yellow-300 absolute bottom-1 right-1 z-10 drop-shadow-md" />
            <Zap className="w-4 h-4 text-cyan-100 absolute top-1 left-1 z-10 animate-pulse" />
          </div>

          {/* Content */}
          <div className="text-center sm:text-left flex-1">
            <h4 className="text-white font-black text-base sm:text-lg tracking-tight drop-shadow-md flex items-center justify-center sm:justify-start gap-2">
              Prisma Help Desk
              <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-bold">
                Soluções em Informática
              </span>
            </h4>
            <p className="text-neutral-300 text-xs sm:text-sm mt-1 max-w-2xl font-medium leading-relaxed">
              Manutenção especializada, upgrades de alta performance e venda de computadores e notebooks. Trazemos sua máquina de volta à vida!
            </p>
            
            <div className="hidden sm:flex items-center gap-4 mt-2 text-[10px] sm:text-xs text-cyan-300 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5" /> Setup Gamer</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Reparos Seguros</span>
              <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Otimização Total</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
          <button 
            onClick={() => alert("Simulação de clique em anúncio")}
            className="flex-1 sm:flex-none bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-black py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_4px_15px_rgba(6,182,212,0.3)] hover:shadow-[0_6px_20px_rgba(6,182,212,0.5)] border border-cyan-400/50"
          >
            Fazer Orçamento <ExternalLink className="w-4 h-4" />
          </button>
          
          {/* Close Button */}
          <button 
            onClick={() => setIsVisible(false)}
            className="bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white p-2 rounded-lg transition-colors border border-neutral-700"
            title="Fechar anúncio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
}
"""

with open("src/components/AdBanner.tsx", "w") as f:
    f.write(code)

