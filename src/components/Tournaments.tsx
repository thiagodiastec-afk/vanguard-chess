import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, getDocs, setDoc } from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { Tournament, UserData } from '../types';
import { Trophy, Calendar, Users, Target } from 'lucide-react';

export default function Tournaments({ currentUser }: { currentUser: UserData }) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getDb();
    
    // Seed initial tournaments if collection is empty
    const seedIfNeeded = async () => {
      const snap = await getDocs(collection(db, 'tournaments'));
      if (snap.empty) {
        const seedData: Tournament[] = [
          {
            id: "blitz-arena",
            name: "Blitz Arena 3|0",
            format: "round-robin",
            minElo: 1000,
            maxElo: 2000,
            prize: "500 Coins",
            startsAt: Date.now() + 1000 * 60 * 60 * 2,
            status: "scheduled",
            participants: []
          },
          {
            id: "master-cup",
            name: "Taça dos Mestres",
            format: "elimination",
            minElo: 1500,
            maxElo: 3000,
            prize: "5000 Coins",
            startsAt: Date.now() + 1000 * 60 * 60 * 24,
            status: "scheduled",
            participants: []
          }
        ];
        
        for (const t of seedData) {
          await setDoc(doc(db, 'tournaments', t.id), t);
        }
      }
    };
    
    seedIfNeeded().catch(console.error);

    const q = query(collection(db, 'tournaments'), orderBy('startsAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
      setTournaments(data);
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  const handleJoin = async (tournamentId: string) => {
    const db = getDb();
    const ref = doc(db, 'tournaments', tournamentId);
    await updateDoc(ref, {
      participants: arrayUnion(currentUser.uid)
    });
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-emerald-500 animate-pulse">Carregando torneios...</div>
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
        <Trophy className="w-16 h-16 text-neutral-600 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Sem torneios agendados</h2>
        <p className="text-neutral-400">Volte mais tarde para participar dos próximos eventos.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="w-8 h-8 text-emerald-500" />
        <h2 className="text-2xl font-bold text-white tracking-tight">Calendário de Torneios</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {tournaments.map(tournament => {
          const isJoined = tournament.participants?.includes(currentUser.uid);
          const isEligible = currentUser.elo >= tournament.minElo && currentUser.elo <= tournament.maxElo;
          const startsIn = new Date(tournament.startsAt).toLocaleString('pt-BR');

          return (
            <div key={tournament.id} className="bg-neutral-800 rounded-2xl p-6 border border-neutral-700/50 shadow-xl flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{tournament.name}</h3>
                  <span className="inline-flex items-center text-xs font-medium bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md">
                    {tournament.format === 'elimination' ? 'Eliminação Simples' : 'Round-Robin'}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-500">{tournament.prize}</div>
                  <div className="text-xs text-neutral-400">Premiação</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-neutral-300">
                  <Calendar className="w-4 h-4 text-neutral-500" />
                  <span>{startsIn}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-300">
                  <Users className="w-4 h-4 text-neutral-500" />
                  <span>{tournament.participants?.length || 0} Inscritos</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-300 col-span-2">
                  <Target className="w-4 h-4 text-neutral-500" />
                  <span>Rating: {tournament.minElo} - {tournament.maxElo}</span>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-neutral-700/50">
                {tournament.status === 'completed' ? (
                  <button disabled className="w-full bg-neutral-700 text-neutral-500 font-bold py-3 px-4 rounded-xl cursor-not-allowed">
                    Finalizado
                  </button>
                ) : tournament.status === 'in_progress' ? (
                  <button className="w-full bg-emerald-500 text-neutral-950 font-bold py-3 px-4 rounded-xl transition-transform active:scale-95">
                    Assistir Partidas
                  </button>
                ) : isJoined ? (
                  <button disabled className="w-full bg-emerald-500/20 text-emerald-400 font-bold py-3 px-4 rounded-xl cursor-not-allowed border border-emerald-500/30">
                    Inscrito
                  </button>
                ) : !isEligible ? (
                  <button disabled className="w-full bg-red-500/10 text-red-400 font-bold py-3 px-4 rounded-xl cursor-not-allowed border border-red-500/20">
                    Rating Incompatível
                  </button>
                ) : (
                  <button 
                    onClick={() => handleJoin(tournament.id)}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-3 px-4 rounded-xl transition-all active:scale-95 shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]"
                  >
                    Participar do Torneio
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
