import React from 'react';
export type AppBackground = {
  id: string;
  name: string;
  className?: string; // Tailwind class like "bg-zinc-950"
  style?: React.CSSProperties; // For gradients or image URLs
  price: number;
  description: string;
};

export const APP_BACKGROUNDS: AppBackground[] = [
  {
    id: 'deep-space',
    name: 'Espaço Profundo',
    style: {
      backgroundColor: '#000000',
      backgroundImage: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #000000 100%)'
    },
    price: 300,
    description: 'Um fundo escuro imersivo como a imensidão do espaço.',
  },
  {
    id: 'cyber-grid',
    name: 'Grade Cyber',
    style: {
      backgroundColor: '#0a0a0a',
      backgroundImage: 'linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)',
      backgroundSize: '30px 30px'
    },
    price: 400,
    description: 'Textura quadriculada sutil para foco cibernético.',
  },
  {
    id: 'crimson-fade',
    name: 'Fade Carmesim',
    style: {
      background: 'linear-gradient(135deg, #2a0808 0%, #09090b 100%)'
    },
    price: 500,
    description: 'Um toque sutil de vermelho escuro no canto.',
  },
  {
    id: 'golden-sand',
    name: 'Areia Dourada',
    style: {
      background: 'radial-gradient(circle at top left, #332711 0%, #09090b 70%)'
    },
    price: 600,
    description: 'Elegância e riqueza com um fundo noturno.',
  },
  {
    id: 'ocean-depth',
    name: 'Profundeza Oceânica',
    style: {
      background: 'linear-gradient(to bottom, #09090b 0%, #081426 100%)'
    },
    price: 700,
    description: 'Calma e concentração com azul escuro ao fundo.',
  },
  {
    id: 'default',
    name: 'Deep Zinc (Padrão)',
    className: 'bg-zinc-950',
    price: 0,
    description: 'O fundo escuro e imersivo original do Vanguard Chess.',
  },
  {
    id: 'midnight-blue',
    name: 'Azul Meia-Noite',
    className: 'bg-slate-950',
    price: 0,
    description: 'Um tom de azul extremamente escuro para descansar os olhos.',
  },
  {
    id: 'chess-pattern',
    name: 'Padrão Enxadrista',
    style: {
      backgroundColor: '#09090b',
      backgroundImage: 'radial-gradient(#27272a 1px, transparent 1px)',
      backgroundSize: '40px 40px'
    },
    price: 200,
    description: 'Um padrão de grade sutil e elegante.',
  },
  {
    id: 'emerald-glow',
    name: 'Aura Esmeralda',
    style: {
      background: 'radial-gradient(circle at top right, #064e3b 0%, #09090b 40%, #09090b 100%)'
    },
    price: 400,
    description: 'Um brilho verde esmeralda no canto da tela.',
  },
  {
    id: 'purple-nebula',
    name: 'Nebulosa Púrpura',
    style: {
      background: 'radial-gradient(circle at bottom left, #4c1d95 0%, #09090b 50%, #09090b 100%)'
    },
    price: 800,
    description: 'Uma explosão cósmica na parte inferior da tela.',
  },
  {
    id: 'abstract-waves',
    name: 'Ondas Abstratas',
    style: {
      backgroundColor: '#09090b',
      backgroundImage: 'repeating-radial-gradient(circle at 0 0, transparent 0, #09090b 40px), repeating-linear-gradient(#18181b55, #18181b)'
    },
    price: 1000,
    description: 'Ondas geométricas de alta concentração.',
  }
];

class BackgroundManager {
  private currentBackground: AppBackground;
  private listeners: Set<(bg: AppBackground) => void> = new Set();

  constructor() {
    this.currentBackground = APP_BACKGROUNDS[0];
    const saved = localStorage.getItem('chess-background');
    if (saved) {
      const bg = APP_BACKGROUNDS.find(b => b.id === saved);
      if (bg) this.currentBackground = bg;
    }
  }

  getBackground() {
    return this.currentBackground;
  }

  setBackground(id: string) {
    const bg = APP_BACKGROUNDS.find(b => b.id === id);
    if (bg) {
      this.currentBackground = bg;
      localStorage.setItem('chess-background', id);
      this.notify();
    }
  }

  subscribe(listener: (bg: AppBackground) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l(this.currentBackground));
  }
}

export const backgroundManager = new BackgroundManager();

import { useState, useEffect } from 'react';

export function useBackground() {
  const [bg, setBg] = useState(backgroundManager.getBackground());

  useEffect(() => {
    const unsubscribe = backgroundManager.subscribe(setBg);
    return () => { unsubscribe(); };
  }, []);

  return bg;
}
