import { useEffect, useRef } from 'react';
import { ScrollText } from 'lucide-react';
import { cn } from '../lib/utils';

interface MoveHistoryProps {
  history: string[];
}

export default function MoveHistory({ history }: MoveHistoryProps) {
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
    <div className="bg-neutral-800 rounded-2xl border border-neutral-700/50 shadow-xl overflow-hidden flex flex-col h-[250px] xl:h-[350px]">
      <div className="flex items-center gap-2 p-4 bg-neutral-900/50 border-b border-neutral-700/50">
        <ScrollText className="w-5 h-5 text-emerald-500" />
        <h3 className="font-bold text-white">Histórico de Lances</h3>
      </div>
      <div className="flex px-5 py-2 text-xs font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-700/50 bg-neutral-800/80">
        <span className="w-12">#</span>
        <span className="flex-1">Brancas</span>
        <span className="flex-1">Pretas</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1">
        {movePairs.length === 0 && (
          <div className="text-center text-neutral-500 text-sm p-4 italic">
            A partida ainda não começou.
          </div>
        )}
        {movePairs.map((pair, idx) => (
          <div key={pair.turn} className={cn("flex text-sm rounded px-3 py-1.5 transition-colors", idx % 2 === 0 ? "bg-neutral-800" : "bg-neutral-700/30")}>
            <span className="w-12 text-neutral-500 font-bold">{pair.turn}.</span>
            <span className="flex-1 text-neutral-200 font-medium">{pair.w}</span>
            <span className="flex-1 text-neutral-400 font-medium">{pair.b || ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
