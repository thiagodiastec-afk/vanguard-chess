import fs from 'fs';

const filePath = 'src/lib/themes.ts';
let code = fs.readFileSync(filePath, 'utf8');

const targetStr = `  {
    id: 'gold',
    name: 'Ouro e Ônix',
    darkSquareStyle: { backgroundColor: '#212121' },
    lightSquareStyle: { backgroundColor: '#d4af37' },
    price: 1000,
    description: 'Para verdadeiros mestres. Contraste de ouro reluzente.',
  }
];`;

const replacementStr = `  {
    id: 'gold',
    name: 'Ouro e Ônix',
    darkSquareStyle: { backgroundColor: '#212121' },
    lightSquareStyle: { backgroundColor: '#d4af37' },
    price: 1000,
    description: 'Para verdadeiros mestres. Contraste de ouro reluzente.',
  },
  {
    id: 'amethyst',
    name: 'Ametista Real',
    darkSquareStyle: { backgroundColor: '#4a235a' },
    lightSquareStyle: { backgroundColor: '#d7bde2' },
    price: 750,
    description: 'Cristais lapidados de quartzo roxo para jogos de alto nível.',
  },
  {
    id: 'forest',
    name: 'Floresta Élfica',
    darkSquareStyle: { backgroundColor: '#145a32' },
    lightSquareStyle: { backgroundColor: '#abebc6' },
    price: 800,
    description: 'Um refúgio esmeralda perfeito para estratégias silenciosas.',
  },
  {
    id: 'ruby',
    name: 'Rubi e Gelo',
    darkSquareStyle: { backgroundColor: '#7b241c' },
    lightSquareStyle: { backgroundColor: '#fadbd8' },
    price: 1200,
    description: 'O contraste térmico absoluto. Vermelho rubi contra branco gelo.',
  },
  {
    id: 'obsidian',
    name: 'Obsidiana e Cobre',
    darkSquareStyle: { backgroundColor: '#17202a' },
    lightSquareStyle: { backgroundColor: '#dc7633' },
    price: 2000,
    description: 'Sombrio, metálico e intimidador. Para jogadores que não perdoam erros.',
  },
  {
    id: 'galaxy',
    name: 'Nebulosa Infinita',
    darkSquareStyle: { backgroundColor: '#09041a' },
    lightSquareStyle: { backgroundColor: '#4a148c' },
    price: 3000,
    description: 'O tema mais valioso do jogo. Escuridão e energia pura no tabuleiro.',
  }
];`;

// To avoid exact spacing issues, let's inject right before "];"
const splitCode = code.split('];');
if (splitCode.length >= 2) {
  // We want to replace the FIRST occurrence of "];" which is the end of CHESS_THEMES array.
  // Wait, what if there's another "];"? 
  // Let's just do a string replace using a regex.
}

// Safer approach:
let match = code.match(/name:\s*'Ouro e Ônix'[\s\S]*?price:\s*1000[\s\S]*?description:[\s\S]*?\}[ \n\r]*\];/);
if (match) {
  let matchedStr = match[0];
  let newStr = matchedStr.replace(/\];$/, `,
  {
    id: 'amethyst',
    name: 'Ametista Real',
    darkSquareStyle: { backgroundColor: '#4a235a' },
    lightSquareStyle: { backgroundColor: '#d7bde2' },
    price: 750,
    description: 'Cristais lapidados de quartzo roxo para jogos de alto nível.',
  },
  {
    id: 'forest',
    name: 'Floresta Élfica',
    darkSquareStyle: { backgroundColor: '#145a32' },
    lightSquareStyle: { backgroundColor: '#abebc6' },
    price: 800,
    description: 'Um refúgio esmeralda perfeito para estratégias silenciosas.',
  },
  {
    id: 'ruby',
    name: 'Rubi e Gelo',
    darkSquareStyle: { backgroundColor: '#7b241c' },
    lightSquareStyle: { backgroundColor: '#fadbd8' },
    price: 1200,
    description: 'O contraste térmico absoluto. Vermelho rubi contra branco gelo.',
  },
  {
    id: 'obsidian',
    name: 'Obsidiana e Cobre',
    darkSquareStyle: { backgroundColor: '#17202a' },
    lightSquareStyle: { backgroundColor: '#dc7633' },
    price: 2000,
    description: 'Sombrio, metálico e intimidador. Para jogadores que não perdoam erros.',
  },
  {
    id: 'galaxy',
    name: 'Nebulosa Infinita',
    darkSquareStyle: { backgroundColor: '#09041a' },
    lightSquareStyle: { backgroundColor: '#4a148c' },
    price: 3000,
    description: 'O tema mais valioso do jogo. Escuridão e energia pura no tabuleiro.',
  }
];`);
  code = code.replace(matchedStr, newStr);
  fs.writeFileSync(filePath, code);
  console.log("Success");
} else {
  console.log("Not found");
}

