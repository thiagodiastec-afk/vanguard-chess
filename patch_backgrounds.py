import re

with open("src/lib/backgrounds.ts", "r") as f:
    code = f.read()

new_backgrounds = """
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
  }
"""

if "Espaço Profundo" not in code:
    code = code.replace("export const APP_BACKGROUNDS: AppBackground[] = [", "export const APP_BACKGROUNDS: AppBackground[] = [" + new_backgrounds)

with open("src/lib/backgrounds.ts", "w") as f:
    f.write(code)

