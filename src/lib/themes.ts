export type Theme = {
  id: string;
  pieceSet?: string;
  boardWrapperClass?: string;

  name: string;
  darkSquareStyle: { backgroundColor: string };
  lightSquareStyle: { backgroundColor: string };
  price: number;
  description: string;
};

export const CHESS_THEMES: Theme[] = [
    {
    id: 'luxury',
    name: 'Madeira Clássica',
    pieceSet: 'wood',
    darkSquareStyle: { backgroundColor: '#422410' },
    lightSquareStyle: { backgroundColor: '#dca46c' },
    boardWrapperClass: 'border-[12px] border-[#5e3219] ring-2 ring-[#3b1d0d] shadow-[0_15px_30px_rgba(0,0,0,0.5)]',
    price: 0,
    description: 'Tabuleiro clássico de madeira e peças realistas.',
  },

  {
    id: 'classic',
    name: 'Clássico (Verde)',
    pieceSet: 'neo',
    darkSquareStyle: { backgroundColor: '#779556' },
    lightSquareStyle: { backgroundColor: '#ebecd0' },
    price: 0,
    description: 'O visual tradicional esverdeado.',
  },
  {
    id: 'vidro',
    name: 'Metálico Premium',
    pieceSet: 'glass',
    darkSquareStyle: { backgroundColor: '#422410' },
    lightSquareStyle: { backgroundColor: '#dca46c' },
    boardWrapperClass: 'border-[12px] border-[#5e3219] ring-2 ring-[#3b1d0d] shadow-[0_15px_30px_rgba(0,0,0,0.5)]',
    price: 0,
    description: 'Tabuleiro de madeira escuro com peças metálicas/vidro realistas.',
  },


  {
    id: 'blue',
    name: 'Azul Oceano',
    pieceSet: 'icy_sea',
    darkSquareStyle: { backgroundColor: '#4b7399' },
    lightSquareStyle: { backgroundColor: '#eae9d2' },
    price: 150,
    description: 'Inspirado na serenidade do fundo do mar.',
  },
  {
    id: 'coral',
    name: 'Coral',
    pieceSet: 'bases',
    darkSquareStyle: { backgroundColor: '#b2655e' },
    lightSquareStyle: { backgroundColor: '#eeeed2' },
    price: 150,
    description: 'Tons alaranjados para partidas vibrantes.',
  },
  {
    id: 'dark',
    name: 'Noturno',
    pieceSet: 'alpha',
    darkSquareStyle: { backgroundColor: '#5c7080' },
    lightSquareStyle: { backgroundColor: '#8ca2ad' },
    price: 200,
    description: 'Ideal para jogar com as luzes apagadas.',
  },
  {
    id: 'neon',
    name: 'Cyberpunk Neon',
    pieceSet: 'neon',
    darkSquareStyle: { backgroundColor: '#180029' },
    lightSquareStyle: { backgroundColor: '#38006b' },
    price: 500,
    description: 'Um visual sintético de alto contraste com tons escuros.',
  },
  {
    id: 'marble',
    name: 'Mármore Imperial',
    pieceSet: 'marble',
    darkSquareStyle: { backgroundColor: '#6e6e6e' },
    lightSquareStyle: { backgroundColor: '#cfcfcf' },
    price: 600,
    description: 'Tons de pedra refinada para combates de elite.',
  },
  {
    id: 'gold',
    name: 'Ouro e Ônix',
    pieceSet: 'glass',
    darkSquareStyle: { backgroundColor: '#212121' },
    lightSquareStyle: { backgroundColor: '#d4af37' },
    price: 1000,
    description: 'Para verdadeiros mestres. Contraste de ouro reluzente.',
  }
,
  {
    id: 'amethyst',
    name: 'Ametista Real',
    pieceSet: 'gothic',
    darkSquareStyle: { backgroundColor: '#4a235a' },
    lightSquareStyle: { backgroundColor: '#d7bde2' },
    price: 750,
    description: 'Cristais lapidados de quartzo roxo para jogos de alto nível.',
  },
  {
    id: 'forest',
    name: 'Floresta Élfica',
    pieceSet: 'club',
    darkSquareStyle: { backgroundColor: '#145a32' },
    lightSquareStyle: { backgroundColor: '#abebc6' },
    price: 800,
    description: 'Um refúgio esmeralda perfeito para estratégias silenciosas.',
  },
  {
    id: 'ruby',
    name: 'Rubi e Gelo',
    pieceSet: 'icy_sea',
    darkSquareStyle: { backgroundColor: '#7b241c' },
    lightSquareStyle: { backgroundColor: '#fadbd8' },
    price: 1200,
    description: 'O contraste térmico absoluto. Vermelho rubi contra branco gelo.',
  },
  {
    id: 'obsidian',
    name: 'Obsidiana e Cobre',
    pieceSet: 'cases',
    darkSquareStyle: { backgroundColor: '#17202a' },
    lightSquareStyle: { backgroundColor: '#dc7633' },
    price: 2000,
    description: 'Sombrio, metálico e intimidador. Para jogadores que não perdoam erros.',
  },
  {
    id: 'galaxy',
    name: 'Nebulosa Infinita',
    pieceSet: 'graffiti',
    darkSquareStyle: { backgroundColor: '#09041a' },
    lightSquareStyle: { backgroundColor: '#4a148c' },
    price: 3000,
    description: 'O tema mais valioso do jogo. Escuridão e energia pura no tabuleiro.',
  }
];

class ThemeManager {
  private currentTheme: Theme;
  private listeners: Set<(theme: Theme) => void> = new Set();

  constructor() {
    this.currentTheme = CHESS_THEMES.find(t => t.id === 'luxury') || CHESS_THEMES[0];
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chess-theme');
      if (saved) {
        const theme = CHESS_THEMES.find(t => t.id === saved);
        if (theme) this.currentTheme = theme;
      }
      window.addEventListener('storage', (e) => {
        if (e.key === 'chess-theme' && e.newValue) {
          this.setTheme(e.newValue);
        }
      });
    }
  }

  getTheme() {
    return this.currentTheme;
  }

  setTheme(id: string) {
    const theme = CHESS_THEMES.find(t => t.id === id);
    if (theme) {
      this.currentTheme = theme;
      if (typeof window !== 'undefined') {
        localStorage.setItem('chess-theme', id);
      }
      this.notify();
    }
  }

  subscribe(listener: (theme: Theme) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l(this.currentTheme));
  }
}

export const themeManager = new ThemeManager();

import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setThemeState] = useState(themeManager.getTheme());

  useEffect(() => {
    const unsubscribe = themeManager.subscribe(setThemeState);
    return () => { unsubscribe(); };
  }, []);

  return theme;
}
