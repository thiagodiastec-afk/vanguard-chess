import { UserData } from '../types';
import GlobalChatBox from './GlobalChatBox';
import { MessageSquare, Users, Globe2 } from 'lucide-react';

export default function Chat({ currentUser }: { currentUser: UserData }) {
  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-64 flex flex-col gap-4">
        <div className="bg-neutral-800 rounded-2xl p-4 border border-neutral-700/50 shadow-xl">
          <div className="flex items-center gap-2 mb-4 text-emerald-500">
            <Globe2 className="w-5 h-5" />
            <h3 className="font-bold text-white">Salas Mundiais</h3>
          </div>
          <button className="w-full text-left px-3 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg font-medium text-sm flex items-center gap-2">
            <Globe2 className="w-4 h-4" /> Global (Traduzida)
          </button>
          <button disabled className="w-full text-left px-3 py-2 text-neutral-500 rounded-lg font-medium text-sm cursor-not-allowed mt-1">
            # Iniciantes (Em breve)
          </button>
          <button disabled className="w-full text-left px-3 py-2 text-neutral-500 rounded-lg font-medium text-sm cursor-not-allowed mt-1">
            # Torneios (Em breve)
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col min-h-[500px]">
        <GlobalChatBox 
          currentUser={currentUser} 
          className="flex-1 h-full"
        />
      </div>
    </div>
  );
}
