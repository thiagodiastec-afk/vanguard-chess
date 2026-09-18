import { useEffect, useRef } from 'react';
import { ScrollText } from 'lucide-react';
import { cn } from '../lib/utils';

interface MoveHistoryProps {
  history: string[];
  className?: string;
}

export default function MoveHistory({ history, className }: MoveHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const movePairs = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      turn: Math.floor(i / 2) + 1,
      w: history[i],
      b: history[i + 1]
    });
  }

  return (
    <div className={cn("bg-neutral-900/90 rounded-2xl border border-neutral-800 shadow-xl overflow-hidden flex flex-col min-h-0 flex-1", className)}>
      <div className="flex items-center justify-between px-3.5 py-2 sm:py-2.5 bg-neutral-950/60 border-b border-neutral-800/80">
        <div className="flex items-center gap-2">
          <ScrollText className="w-3.5 h-3.5 text-emerald-400" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-300">Histórico de Lances</h3>
        </div>
        <span className="text-[10px] sm:text-[11px] font-mono text-neutral-500 font-semibold">
          {movePairs.length > 0 ? `${movePairs.length} ${movePairs.length === 1 ? 'lance' : 'lances'}` : '0 lances'}
        </span>
      </div>
      <div className="flex px-3.5 py-1 text-[10px] sm:text-[11px] font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-800/60 bg-neutral-900/60">
        <span className="w-8 sm:w-10">#</span>
        <span className="flex-1">Brancas</span>
        <span className="flex-1">Pretas</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-1.5 sm:p-2 space-y-0.5 custom-scrollbar min-h-[60px]">
        {movePairs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-neutral-500 text-xs py-6 italic">
            A partida ainda não começou.
          </div>
        ) : (
          movePairs.map((pair, idx) => (
            <div 
              key={pair.turn} 
              className={cn(
                "flex items-center text-xs rounded-lg px-2.5 py-1.5 transition-colors font-mono",
                idx === movePairs.length - 1 
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" 
                  : idx % 2 === 0 ? "bg-neutral-800/40" : "bg-transparent"
              )}
            >
              <span className="w-10 text-neutral-500 font-semibold">{pair.turn}.</span>
              <span className="flex-1 text-neutral-200 font-medium">{pair.w}</span>
              <span className="flex-1 text-neutral-400 font-medium">{pair.b || '—'}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
