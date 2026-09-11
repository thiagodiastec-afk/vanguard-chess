import os

code = """import { X, ExternalLink, Cpu, Monitor, Zap, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

export default function AdBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative overflow-hidden border-b border-cyan-900/50 shadow-[0_10px_30px_-10px_rgba(6,182,212,0.2)]">
      {/* Fundo de Imagem de Alta Qualidade (Hardware/Tech) - Opacidade baixa para nao brigar com o texto */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=2070')] bg-cover bg-center bg-no-repeat opacity-40 mix-blend-luminosity" />
      
      {/* Gradiente Escuro para legibilidade (mais escuro na esquerda onde fica o texto) */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/95 to-indigo-950/70" />
      
      {/* Efeitos de luz neon animada no fundo para visual Sci-Fi / Gamer */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen animate-pulse" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-blue-600/15 rounded-full blur-[90px] pointer-events-none mix-blend-screen" />

      {/* Textura de Grid sutil por cima de tudo para dar um ar tech */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 pointer-events-none" />
      
      <div className="relative p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-6 max-w-[1600px] mx-auto z-10">
        
        <div className="flex flex-col sm:flex-row items-center gap-5 flex-1 w-full">
          {/* Badge Publicidade */}
          <div className="hidden sm:flex bg-cyan-950/80 text-cyan-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded border border-cyan-500/30 shrink-0 self-start mt-1 shadow-[0_0_10px_rgba(6,182,212,0.2)] backdrop-blur-sm">
            Patrocinado
          </div>

          {/* Ícone 3D/Visual */}
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-700 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-[0_0_30px_rgba(6,182,212,0.5)] border border-cyan-300/40 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/10 group-hover:bg-white/25 transition-colors" />
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-300 to-blue-500 blur opacity-40 group-hover:opacity-70 transition-opacity" />
            <Cpu className="w-8 h-8 text-white relative z-10 drop-shadow-lg" />
          </div>

          {/* Conteúdo de Texto */}
          <div className="text-center sm:text-left flex-1">
            <h4 className="text-white font-black text-lg sm:text-xl tracking-tight drop-shadow-md flex items-center justify-center sm:justify-start gap-2">
              Prisma Help Desk
              <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,1)]"></span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300 font-bold">
                Assistência Especializada
              </span>
            </h4>
            <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-3xl font-medium leading-relaxed drop-shadow-md">
              Manutenção avançada, montagem de setups de alta performance e venda de hardware premium. Extraímos o potencial máximo da sua máquina!
            </p>
            
            <div className="hidden sm:flex items-center gap-3 mt-3 text-[10px] sm:text-xs text-cyan-100 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-md border border-white/10 backdrop-blur-md shadow-inner"><Monitor className="w-3.5 h-3.5 text-cyan-400" /> Setup Gamer</span>
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-md border border-white/10 backdrop-blur-md shadow-inner"><ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Reparos Seguros</span>
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-md border border-white/10 backdrop-blur-md shadow-inner"><Zap className="w-3.5 h-3.5 text-yellow-400" /> Otimização Extrema</span>
            </div>
          </div>
        </div>

        {/* CTA e Botão de Fechar */}
        <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
          <button 
            onClick={() => alert("Simulação de clique em anúncio")}
            className="flex-1 sm:flex-none relative overflow-hidden group bg-cyan-500 text-slate-950 text-sm font-black py-3.5 px-8 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_25px_rgba(6,182,212,0.5)] hover:shadow-[0_0_35px_rgba(6,182,212,0.7)] hover:-translate-y-0.5"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 flex items-center gap-2 group-hover:text-white transition-colors">Solicitar Orçamento <ExternalLink className="w-4 h-4" /></span>
          </button>
          
          {/* Botão Fechar */}
          <button 
            onClick={() => setIsVisible(false)}
            className="bg-slate-800/80 hover:bg-slate-700 hover:bg-red-500/20 text-slate-400 hover:text-red-400 p-3 rounded-xl transition-all border border-slate-600/50 hover:border-red-500/30 backdrop-blur-sm"
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

