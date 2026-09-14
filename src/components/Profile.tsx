import { UserData } from '../types';
import { User, Swords, Activity, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { ACHIEVEMENTS } from '../lib/achievements';
import { Award, Trophy, Zap, Shield, Bot, Star, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ProfileProps {
  currentUser: UserData;
}

export default function Profile({ currentUser }: ProfileProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(currentUser.displayName);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim() === currentUser.displayName) {
      setIsEditingName(false);
      return;
    }
    
    setIsSaving(true);
    try {
      const db = getDb();
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: newName.trim()
      });
      setIsEditingName(false);
    } catch (error) {
      console.error("Erro ao atualizar nome:", error);
      alert("Ocorreu um erro ao atualizar seu nome.");
    } finally {
      setIsSaving(false);
    }
  };
  const stats = currentUser.stats || { wins: 0, losses: 0, draws: 0 };
  const totalFinished = stats.wins + stats.losses + stats.draws;
  const winRate = totalFinished > 0 ? Math.round((stats.wins / totalFinished) * 100) : 0;

  // Format data for chart
  const historyData = (currentUser.eloHistory || [{ date: Date.now(), elo: 1200 }]).map(entry => ({
    date: new Date(entry.date).toLocaleDateString(),
    elo: entry.elo
  }));

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full flex flex-col gap-8">
      <div className="flex items-center gap-4 bg-neutral-800 p-8 rounded-2xl border border-neutral-700/50 shadow-xl">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center">
          <User className="w-10 h-10 text-emerald-500" />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-1">
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="bg-neutral-900 border border-emerald-500/50 rounded-lg px-3 py-1 text-white font-bold text-xl w-48 focus:outline-none focus:border-emerald-400"
                  autoFocus
                  maxLength={15}
                  disabled={isSaving}
                />
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-3 py-1 rounded-lg font-bold text-sm transition-colors"
                >
                  Salvar
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsEditingName(false)}
                  disabled={isSaving}
                  className="bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1 rounded-lg font-bold text-sm transition-colors"
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-white tracking-tight">{currentUser.displayName}</h2>
                <button 
                  onClick={() => {
                    setNewName(currentUser.displayName);
                    setIsEditingName(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-emerald-400 bg-neutral-700/60 hover:bg-neutral-700 border border-neutral-600/60 rounded-xl transition-all shadow-sm"
                  title="Alterar Nickname"
                >
                  <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Alterar Apelido</span>
                </button>
              </>
            )}
          </div>
          <p className="text-emerald-400 font-medium text-lg">{currentUser.elo} Elo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-800 p-6 rounded-2xl border border-neutral-700/50 shadow-xl flex flex-col">
          <div className="flex items-center gap-2 mb-2 text-neutral-400">
            <Swords className="w-5 h-5 text-emerald-500" />
            <span className="font-semibold">Partidas Jogadas</span>
          </div>
          <span className="text-3xl font-bold text-white">{currentUser.gamesPlayed}</span>
        </div>

        <div className="bg-neutral-800 p-6 rounded-2xl border border-neutral-700/50 shadow-xl flex flex-col">
          <div className="flex items-center gap-2 mb-2 text-neutral-400">
            <Trophy className="w-5 h-5 text-emerald-500" />
            <span className="font-semibold">Vitórias</span>
          </div>
          <span className="text-3xl font-bold text-white">{stats.wins}</span>
        </div>

        <div className="bg-neutral-800 p-6 rounded-2xl border border-neutral-700/50 shadow-xl flex flex-col">
          <div className="flex items-center gap-2 mb-2 text-neutral-400">
            <Target className="w-5 h-5 text-emerald-500" />
            <span className="font-semibold">Taxa de Vitória</span>
          </div>
          <span className="text-3xl font-bold text-white">{winRate}%</span>
        </div>

        <div className="bg-neutral-800 p-6 rounded-2xl border border-neutral-700/50 shadow-xl flex flex-col">
          <div className="flex items-center gap-2 mb-2 text-neutral-400">
            <Activity className="w-5 h-5 text-neutral-500" />
            <span className="font-semibold">Resultados</span>
          </div>
          <div className="flex gap-2 text-sm font-medium mt-auto">
            <span className="text-emerald-400">{stats.wins}V</span>
            <span className="text-neutral-500">-</span>
            <span className="text-neutral-400">{stats.draws}E</span>
            <span className="text-neutral-500">-</span>
            <span className="text-red-400">{stats.losses}D</span>
          </div>
        </div>
      </div>

      
      {/* Achievements Section */}
      <div className="bg-neutral-800 p-6 rounded-2xl border border-neutral-700/50 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Award className="w-6 h-6 text-emerald-500" />
          Conquistas e Insígnias
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Object.values(ACHIEVEMENTS).map(badge => {
            const hasBadge = currentUser.achievements?.includes(badge.id);
            const Icon = badge.icon;
            
            return (
              <div 
                key={badge.id}
                className={`flex flex-col items-center text-center p-4 rounded-xl border transition-all ${
                  hasBadge 
                    ? badge.color + ' shadow-lg scale-100 opacity-100' 
                    : 'bg-neutral-900/50 border-neutral-800 text-neutral-600 scale-95 opacity-50 grayscale'
                }`}
                title={badge.description}
              >
                <Icon className="w-8 h-8 mb-3" />
                <span className="font-bold text-sm mb-1 line-clamp-1">{badge.name}</span>
                <span className="text-xs opacity-80 line-clamp-2">{badge.description}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="bg-neutral-800 p-6 rounded-2xl border border-neutral-700/50 shadow-xl flex-1 min-h-[400px] flex flex-col">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Activity className="w-6 h-6 text-emerald-500" />
          Estatísticas de Progressão
        </h3>
        <div className="flex-1 w-full min-h-[300px] bg-neutral-900/50 p-4 rounded-xl border border-neutral-700/30">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyData} margin={{ top: 20, right: 30, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#404040" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#737373" 
                tick={{fill: '#737373', fontSize: 12}} 
                tickMargin={12}
                axisLine={{ stroke: '#404040' }}
                tickLine={false}
              />
              <YAxis 
                domain={['dataMin - 50', 'dataMax + 50']} 
                stroke="#737373" 
                tick={{fill: '#737373', fontSize: 12}}
                width={50}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '0.75rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                itemStyle={{ color: '#34d399', fontWeight: 'bold' }}
                labelStyle={{ color: '#a3a3a3', marginBottom: '4px' }}
                formatter={(value: number) => [`${value} Pontos`, 'Elo']}
              />
              <Line 
                type="monotone" 
                dataKey="elo" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#171717', stroke: '#10b981', r: 5, strokeWidth: 2 }}
                activeDot={{ r: 7, fill: '#10b981', stroke: '#171717', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
