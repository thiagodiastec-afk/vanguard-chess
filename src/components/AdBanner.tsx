import { X, ExternalLink } from 'lucide-react';
import { useState } from 'react';

export default function AdBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-neutral-800 border-t border-b border-neutral-700/50 p-2 sm:p-4 flex flex-col sm:flex-row items-center justify-center gap-4 relative overflow-hidden shadow-inner">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-5 pointer-events-none" />
      
      <div className="bg-emerald-900/40 text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-500/20 absolute top-2 left-2 sm:static">
        Publicidade
      </div>
      
      <div className="flex-1 flex flex-col sm:flex-row items-center gap-4 max-w-3xl">
        <div className="w-12 h-12 bg-neutral-900 rounded-lg flex items-center justify-center flex-shrink-0 border border-neutral-700">
          <span className="text-xl">🚀</span>
        </div>
        <div className="text-center sm:text-left flex-1">
          <h4 className="text-white font-bold text-sm">Torne-se um Mestre do Xadrez mais Rápido!</h4>
          <p className="text-neutral-400 text-xs mt-0.5 hidden sm:block">Aprenda aberturas matadoras e táticas avançadas com o nosso curso completo.</p>
        </div>
        
        <button 
          onClick={() => alert("Simulação de clique em anúncio")}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors flex-shrink-0"
        >
          Saiba mais <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <button 
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 text-neutral-500 hover:text-white transition-colors"
        title="Fechar anúncio"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
