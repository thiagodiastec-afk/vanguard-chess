import { Award, Zap, Trophy, Shield, Bot, Star, Target } from 'lucide-react';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: any; // Lucide icon
  color: string;
}

export const ACHIEVEMENTS: Record<string, Badge> = {
  first_win: {
    id: 'first_win',
    name: 'Primeira Vitória',
    description: 'Venceu sua primeira partida.',
    icon: Star,
    color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
  },
  streak_3: {
    id: 'streak_3',
    name: 'Em Chamas',
    description: 'Venceu 3 partidas seguidas.',
    icon: Zap,
    color: 'text-orange-500 bg-orange-500/10 border-orange-500/20'
  },
  streak_5: {
    id: 'streak_5',
    name: 'Imparável',
    description: 'Venceu 5 partidas seguidas.',
    icon: Zap,
    color: 'text-red-500 bg-red-500/10 border-red-500/20'
  },
  endgame_master: {
    id: 'endgame_master',
    name: 'Mestre em Finais',
    description: 'Venceu uma partida com mais de 50 lances.',
    icon: Shield,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
  },
  bot_slayer: {
    id: 'bot_slayer',
    name: 'Destruidor de Máquinas',
    description: 'Venceu o Bot na dificuldade Profissional.',
    icon: Bot,
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20'
  },
  veteran: {
    id: 'veteran',
    name: 'Veterano',
    description: 'Completou 50 partidas.',
    icon: Award,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20'
  },
  tactician: {
    id: 'tactician',
    name: 'Tático Implacável',
    description: 'Deu um xeque-mate em menos de 20 lances.',
    icon: Target,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20'
  }
};
