import React, { useState, useEffect } from 'react';
import { collection, query, where, doc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { authenticatedApiFetch } from '../lib/api';
import { UserData } from '../types';
import { Search, UserPlus, UserMinus, Swords, Circle, Loader2, MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface FriendsProps {
  currentUser: UserData;
}

function isPresenceFresh(user: UserData) {
  return user.isOnline === true && typeof user.lastSeen === 'number' && Date.now() - user.lastSeen < 90000;
}

export default function Friends({ currentUser }: FriendsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friends, setFriends] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [challenging, setChallenging] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [registeredCount, setRegisteredCount] = useState<number | null>(null);

  const loadDirectory = async (term = '', cursor?: string, append = false) => {
    setIsSearching(true);
    setDirectoryError(null);
    try {
      const params = new URLSearchParams();
      if (term.trim()) params.set('query', term.trim());
      if (cursor) params.set('cursor', cursor);
      const response = await authenticatedApiFetch(`/api/users/directory?${params.toString()}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível carregar jogadores.');
      const users = (result.users || []) as UserData[];
      setSearchResults((previous) => append ? [...previous, ...users] : users);
      setNextCursor(result.nextCursor || null);
    } catch (error) {
      setDirectoryError(error instanceof Error ? error.message : 'Não foi possível carregar jogadores.');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    void loadDirectory();
    fetch('/api/public/registered-count').then((response) => response.ok ? response.json() : null)
      .then((result) => { if (typeof result?.count === 'number') setRegisteredCount(result.count); })
      .catch(() => {});
  }, [currentUser.uid]);

  useEffect(() => {
    const db = getDb();
    if (!currentUser.friends || currentUser.friends.length === 0) {
      setFriends([]);
      setLoading(false);
      return;
    }

    // Handle Firestore 'in' limit of 10 by slicing for the demo (or use multiple queries)
    const friendsToFetch = currentUser.friends.slice(0, 10);
    if (friendsToFetch.length === 0) return;

    const q = query(
      collection(db, 'users'),
      where('profileSchemaVersion', '==', 2),
      where('uid', 'in', friendsToFetch)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const friendsData = snapshot.docs.map(doc => doc.data() as UserData);
      setFriends(friendsData);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser.friends]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await loadDirectory(searchTerm);
  };

  const toggleFriend = async (targetUser: UserData) => {
    const db = getDb();
    const userRef = doc(db, 'users', currentUser.uid);
    const isFriend = currentUser.friends?.includes(targetUser.uid);

    try {
      await updateDoc(userRef, {
        friends: isFriend ? arrayRemove(targetUser.uid) : arrayUnion(targetUser.uid)
      });
    } catch (error) {
      console.error("Erro ao alterar amigo:", error);
    }
  };

  const challengeFriend = async (friend: UserData) => {
    setChallenging(friend.uid);
    const db = getDb();
    try {
      const response = await authenticatedApiFetch('/api/challenge/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengedId: friend.uid })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível enviar o convite.');
      const docRef = doc(db, 'challenges', result.challengeId);

      // Listen to this specific challenge to see if declined or accepted
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        const data = docSnap.data();
        if (!data) return;
        if (data.status === 'declined') {
          alert(friend.displayName + ' recusou o desafio.');
          setChallenging(null);
          unsubscribe();
        } else if (data.status === 'accepted') {
          setChallenging(null);
          unsubscribe();
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        setChallenging(null);
        unsubscribe();
      }, 30000);

    } catch (error) {
      console.error('Erro ao desafiar:', error);
      alert(error instanceof Error ? error.message : 'Não foi possível enviar o convite.');
      setChallenging(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
      <div className="bg-neutral-800 rounded-2xl p-6 border border-neutral-700/50 shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-2">Jogadores inscritos</h2>
        <p className="text-sm text-neutral-400 mb-6">{registeredCount === null ? 'Carregando total de jogadores…' : `${registeredCount} jogadores cadastrados.`} Encontre um jogador e envie um convite. E-mails e telefones nunca aparecem nesta lista.</p>
        <form onSubmit={handleSearch} className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar jogador por nome..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center min-w-[120px]"
          >
            {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buscar'}
          </button>
        </form>

        {directoryError && <p role="alert" className="text-sm text-red-400 mb-4">{directoryError}</p>}
        {searchResults.length > 0 && (
          <div className="space-y-2 mb-8">
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">{searchTerm.trim() ? 'Resultados da busca' : 'Todos os jogadores'}</h3>
            {searchResults.map(user => {
              const isFriend = currentUser.friends?.includes(user.uid);
              return (
                <div key={user.uid} className="flex items-center justify-between p-4 bg-neutral-900/50 rounded-xl border border-neutral-700/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neutral-700 rounded-full flex items-center justify-center font-bold text-lg text-white">
                      {(user.displayName?.charAt(0)?.toUpperCase() || "?")}
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{user.displayName}</h4>
                      <p className="text-sm text-neutral-400">Elo: {user.elo} <span className="px-1">•</span> {isPresenceFresh(user) ? 'Online' : 'Offline'}</p>
                    </div>
                  </div>
                  {user.uid === currentUser.uid ? (
                    <span className="text-sm text-neutral-500">Você</span>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => challengeFriend(user)}
                        disabled={challenging === user.uid}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold bg-emerald-500 text-neutral-950 hover:bg-emerald-400 disabled:opacity-50"
                        title="Envie o convite pelo jogo."
                      >
                        {challenging === user.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
                        Convidar
                      </button>
                      <button
                        onClick={() => toggleFriend(user)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                          isFriend
                            ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                            : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                        )}
                      >
                        {isFriend ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                        {isFriend ? 'Remover' : 'Adicionar'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {nextCursor && <button onClick={() => void loadDirectory(searchTerm, nextCursor, true)} disabled={isSearching} className="w-full py-3 rounded-xl bg-neutral-900 text-emerald-400 disabled:opacity-50">{isSearching ? 'Carregando…' : 'Carregar mais jogadores'}</button>}
          </div>
        )}
        {!isSearching && searchResults.length === 0 && <p className="text-neutral-400 text-center py-8">{searchTerm.trim() ? 'Nenhum jogador encontrado.' : 'Ainda não há jogadores cadastrados.'}</p>}
      </div>

      <div className="bg-neutral-800 rounded-2xl p-6 border border-neutral-700/50 shadow-xl flex-1">
        <h2 className="text-2xl font-bold text-white mb-6">Lista de Amigos</h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            <p>Você ainda não tem amigos adicionados.</p>
            <p className="text-sm mt-2">Busque por jogadores acima para adicioná-los!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map(friend => (
              <div key={friend.uid} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-neutral-900/50 rounded-xl border border-neutral-700/30 gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-neutral-700 rounded-full flex items-center justify-center font-bold text-xl text-white">
                      {(friend.displayName?.charAt(0)?.toUpperCase() || "?")}
                    </div>
                    <Circle className={cn(
                      "w-4 h-4 absolute bottom-0 right-0 rounded-full border-2 border-neutral-900 fill-current",
                      isPresenceFresh(friend) ? "text-emerald-500" : "text-neutral-500"
                    )} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg">{friend.displayName}</h4>
                    <div className="flex gap-3 text-sm text-neutral-400">
                      <span>Elo: {friend.elo}</span>
                      <span>•</span>
                      <span>{isPresenceFresh(friend) ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => challengeFriend(friend)}
                    disabled={challenging === friend.uid}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-700 disabled:text-neutral-500 text-neutral-950 font-bold py-2 px-6 rounded-xl transition-colors"
                  >
                    {challenging === friend.uid ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Swords className="w-4 h-4" />
                        Convidar
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => toggleFriend(friend)}
                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors"
                    title="Remover Amigo"
                  >
                    <UserMinus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
