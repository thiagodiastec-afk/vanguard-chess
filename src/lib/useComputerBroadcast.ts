import { useEffect, useRef, useState } from 'react';
import { authenticatedApiFetch } from './api';
import { UserData } from '../types';
export function useComputerBroadcast(enabled: boolean, epoch: number, user: UserData | null, pgn: string, playerColor: string, difficulty: string, ended: boolean) {
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const latest = useRef({ pgn, playerColor, difficulty, ended });
  latest.current = { pgn, playerColor, difficulty, ended };
  const session = useRef<{ send: () => void } | null>(null);
  useEffect(() => {
    setConnected(false); setError(null);
    if (!enabled || !user?.uid) return;
    const gameId = 'bot_' + crypto.randomUUID();
    let sequence = 0, disposed = false, chain = Promise.resolve();
    const send = (closing = false) => {
      const snapshot = { ...latest.current, ended: closing || latest.current.ended, gameId, sequence: sequence++ };
      const run = async () => {
        try {
          const response = await authenticatedApiFetch('/api/game/computer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot), signal: AbortSignal.timeout(10000), keepalive: closing });
          if (!response.ok) throw new Error('Não foi possível atualizar a transmissão. Tentaremos novamente.');
          if (!disposed) { setError(null); setConnected(!snapshot.ended); }
        } catch { if (!disposed) { setConnected(false); setError('A transmissão está desconectada. Tentaremos novamente; você pode continuar jogando.'); } }
      };
      // Closing uses a newer sequence immediately, so queued updates cannot reopen it.
      if (closing) void run(); else chain = chain.then(run);
    };
    session.current = { send };
    const heartbeat = window.setInterval(() => send(), 20000);
    return () => { disposed = true; window.clearInterval(heartbeat); session.current = null; send(true); };
  }, [enabled, user?.uid, epoch]);
  useEffect(() => { session.current?.send(); }, [enabled, user?.uid, epoch, pgn, playerColor, difficulty, ended]);
  return { error, connected };
}
