import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { Crown, Medal, User, Swords, TrendingUp, Shield, Star } from 'lucide-react';
import { UserData } from '../types';
import { cn } from '../lib/utils';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const db = getDb();
        const q = query(
          collection(db, 'users'),
          orderBy('elo', 'desc'),
          limit(50)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => doc.data() as UserData);
        setLeaders(data);
      } catch (error) {
        console.error("Erro ao buscar ranking:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getLeague = (elo: number) => {
    if (elo >= 2000) return { name: 'Grão-Mestre', color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10' };
    if (elo >= 1600) return { name: 'Diamante', color: 'text-cyan-400', bg: 'bg-cyan-400/10' };
    if (elo >= 1300) return { name: 'Ouro', color: 'text-amber-400', bg: 'bg-amber-400/10' };
    if (elo >= 1000) return { name: 'Prata', color: 'text-slate-300', bg: 'bg-slate-300/10' };
    return { name: 'Bronze', color: 'text-orange-700', bg: 'bg-orange-700/10' };
  };

  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full flex flex-col gap-8 overflow-y-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-800 p-8 rounded-2xl border border-neutral-700/50 shadow-xl">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-900/20">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">Ranking Global</h2>
            <p className="text-neutral-400 font-medium mt-1">Os melhores enxadristas do mundo</p>
          </div>
        </div>
      </div>

      {!loading && top3.length > 0 && (
        <div className="flex flex-col md:flex-row items-end justify-center gap-4 mt-8 mb-4">
          {/* 2nd Place */}
          {top3[1] && (
            <div className="w-full md:w-1/4 bg-neutral-800/80 border border-slate-400/30 rounded-t-xl p-4 flex flex-col items-center relative shadow-lg">
              <div className="absolute -top-6 bg-slate-300 p-2 rounded-full shadow-lg shadow-slate-900/50">
                <Medal className="w-6 h-6 text-slate-800" />
              </div>
              <div className="w-16 h-16 bg-slate-400/10 rounded-full flex items-center justify-center mt-4 mb-2">
                <User className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-bold text-white text-lg truncate w-full text-center flex items-center justify-center gap-1">{top3[1].displayName} {top3[1].isPremium && <Star className="w-4 h-4 text-fuchsia-500 fill-fuchsia-500" />}</p>
              <div className="text-2xl font-black text-slate-300 mt-2">{top3[1].elo}</div>
              <div className="text-xs text-neutral-400 font-bold uppercase mt-1">Rating</div>
            </div>
          )}

          {/* 1st Place */}
          {top3[0] && (
            <div className="w-full md:w-1/3 bg-gradient-to-b from-amber-500/20 to-neutral-800 border border-amber-500/50 rounded-t-2xl p-6 flex flex-col items-center relative shadow-2xl shadow-amber-900/20 z-10 md:-translate-y-4">
              <div className="absolute -top-8 bg-amber-400 p-3 rounded-full shadow-lg shadow-amber-900/50">
                <Crown className="w-8 h-8 text-amber-900" />
              </div>
              <div className="w-20 h-20 bg-amber-400/20 rounded-full flex items-center justify-center mt-6 mb-3 ring-4 ring-amber-500/20">
                <User className="w-10 h-10 text-amber-400" />
              </div>
              <p className="font-black text-white text-xl truncate w-full text-center flex items-center justify-center gap-1">{top3[0].displayName} {top3[0].isPremium && <Star className="w-5 h-5 text-fuchsia-500 fill-fuchsia-500" />}</p>
              <div className="text-4xl font-black text-amber-400 mt-2">{top3[0].elo}</div>
              <div className="text-xs text-amber-400/70 font-bold uppercase mt-1">Rating</div>
            </div>
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <div className="w-full md:w-1/4 bg-neutral-800/80 border border-orange-700/30 rounded-t-xl p-4 flex flex-col items-center relative shadow-lg">
              <div className="absolute -top-6 bg-orange-600 p-2 rounded-full shadow-lg shadow-orange-900/50">
                <Medal className="w-6 h-6 text-white" />
              </div>
              <div className="w-16 h-16 bg-orange-700/10 rounded-full flex items-center justify-center mt-4 mb-2">
                <User className="w-8 h-8 text-orange-500" />
              </div>
              <p className="font-bold text-white text-lg truncate w-full text-center flex items-center justify-center gap-1">{top3[2].displayName} {top3[2].isPremium && <Star className="w-4 h-4 text-fuchsia-500 fill-fuchsia-500" />}</p>
              <div className="text-2xl font-black text-orange-500 mt-2">{top3[2].elo}</div>
              <div className="text-xs text-neutral-400 font-bold uppercase mt-1">Rating</div>
            </div>
          )}
        </div>
      )}

      <div className="bg-neutral-900 rounded-2xl border border-neutral-700/50 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-neutral-800 bg-neutral-800/50 flex text-xs font-black text-neutral-400 uppercase tracking-wider">
          <div className="w-16 text-center">Pos</div>
          <div className="flex-1">Jogador & Liga</div>
          <div className="w-24 text-center hidden sm:block">Partidas</div>
          <div className="w-24 text-right pr-4">Rating</div>
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/50">
            {rest.map((user, idx) => {
              const position = idx + 4; // Start at 4th place
              const league = getLeague(user.elo);
              
              return (
                <div key={user.uid} className="flex items-center p-4 hover:bg-neutral-800/50 transition-colors group">
                  <div className="w-16 text-center font-bold text-neutral-500 group-hover:text-neutral-300">
                    {position}º
                  </div>
                  
                  <div className="flex-1 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                      <User className="w-5 h-5 text-neutral-500" />
                    </div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-1">{user.displayName} {user.isPremium && <Star className="w-3.5 h-3.5 text-fuchsia-500 fill-fuchsia-500" />}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${league.bg} ${league.color} flex items-center gap-1`}>
                          <Shield className="w-3 h-3" /> {league.name}
                        </span>
                        {user.currentWinStreak && user.currentWinStreak >= 3 ? (
                          <span className="text-xs text-orange-400 font-medium flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> {user.currentWinStreak} vitórias seguidas
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-24 justify-center items-center gap-1.5 text-neutral-400 font-medium hidden sm:flex">
                    <Swords className="w-4 h-4 opacity-50" />
                    {user.gamesPlayed || 0}
                  </div>
                  
                  <div className="w-24 text-right pr-4 font-black text-lg text-white">
                    {user.elo}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
