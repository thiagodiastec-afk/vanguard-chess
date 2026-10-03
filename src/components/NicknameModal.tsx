import React, { useState } from 'react';
import { UserData } from '../types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { authenticatedApiFetch } from '../lib/api';
import { validateUsername } from '../lib/username';
import { Shield, Loader2, User as UserIcon } from 'lucide-react';

interface NicknameModalProps {
  currentUser: UserData;
}

export default function NicknameModal({ currentUser }: NicknameModalProps) {
  const [nickname, setNickname] = useState(() => {
    const name = currentUser.displayName || '';
    if (name.includes('@') || /^[0-9+() -]{7,}$/.test(name)) return '';
    return name;
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('O apelido não pode ficar em branco.');
      return;
    }

    const validationError = validateUsername(nickname);
    if (validationError) {
      setError(validationError);
      return;
    }


    setIsSubmitting(true);
    setError('');

    try {
      const db = getDb();
      // Check if nickname already exists
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('profileSchemaVersion', '==', 2), where('displayName', '==', nickname.trim()));
      const querySnapshot = await getDocs(q);

      const exists = querySnapshot.docs.some(doc => doc.id !== currentUser.uid);

      if (exists) {
        setError('Este apelido já está em uso por outro jogador.');
        setIsSubmitting(false);
        return;
      }

      const response = await authenticatedApiFetch('/api/profile/username', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: nickname.trim() })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Erro ao salvar apelido.');

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar apelido. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700/50 p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <UserIcon className="w-8 h-8 text-emerald-500" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-2">Bem-vindo ao Vanguard Chess!</h2>
        <p className="text-neutral-400 text-center mb-6 text-sm">
          Como você quer ser chamado(a) nas partidas e torneios?
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Digite seu Nickname"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-center text-lg"
              autoFocus
              maxLength={15}
            />
            {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !nickname.trim()}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Confirmar e Entrar'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
