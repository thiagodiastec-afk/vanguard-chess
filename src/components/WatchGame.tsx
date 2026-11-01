import { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { GameData } from '../types';

export default function WatchGame({ game, onExit }: { game: GameData; onExit: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const stale = game.mode === 'computer' && now - (game.broadcastUpdatedAt || 0) >= 90000;
  const clock = (color: 'w' | 'b') => {
    if (!game.timeControl) return '';
    const base = (color === 'w' ? game.whiteTime : game.blackTime) ?? game.timeControl;
    const elapsed = game.status === 'playing' && game.turn === color ? Math.max(0, (now - game.lastMoveAt) / 1000) : 0;
    const seconds = Math.ceil(Math.max(0, base - elapsed));
    return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
  };
  return <section className="mx-auto w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-white">
    <div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-lg font-bold">Assistindo {game.mode === 'computer' ? 'partida contra a IA' : 'partida online'}</h2><button onClick={onExit} className="rounded-lg bg-zinc-700 px-4 py-2">Voltar</button></div>
    <p className="mb-2 flex justify-between gap-2"><span>Pretas: {game.blackName}</span><span className="font-mono">{clock('b')}</span></p>
    <div className="mx-auto" style={{ width: 'min(100%, max(220px, calc(100dvh - 300px)))' }}>
      <Chessboard options={{ position: game.fen, allowDragging: false, onPieceDrop: () => false, onSquareClick: () => {}, boardOrientation: 'white' }} />
    </div>
    <p className="mt-2 flex justify-between gap-2"><span>Brancas: {game.whiteName}</span><span className="font-mono">{clock('w')}</span></p>
    <p role="status" className="mt-4 text-sm text-emerald-300">{game.status !== 'playing' ? 'Partida encerrada' : stale ? 'Transmissão interrompida • aguardando conexão do jogador' : 'Ao vivo • somente visualização'}</p>
  </section>;
}
