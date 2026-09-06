import fs from 'fs';

// -- ComputerGame.tsx --
let fp = 'src/components/ComputerGame.tsx';
let code = fs.readFileSync(fp, 'utf8');

if (!code.includes('import confetti')) {
  code = code.replace(
    "import { Chess, Move } from 'chess.js';",
    "import { Chess, Move } from 'chess.js';\nimport confetti from 'canvas-confetti';"
  );
}

let target = `          if (numericResult === 1) {
            updateData['stats.wins'] = increment(1);`;
let replacement = `          if (numericResult === 1) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#10b981', '#fbbf24', '#ffffff']
            });
            updateData['stats.wins'] = increment(1);`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(fp, code);
  console.log("ComputerGame updated with confetti");
}

// -- Game.tsx --
fp = 'src/components/Game.tsx';
code = fs.readFileSync(fp, 'utf8');

if (!code.includes('import confetti')) {
  code = code.replace(
    "import { Chess, Move } from 'chess.js';",
    "import { Chess, Move } from 'chess.js';\nimport confetti from 'canvas-confetti';"
  );
}

target = `          if (numericResult === 1) { updateData['stats.wins'] = increment(1); updateData['coins'] = increment(50); }`;
replacement = `          if (numericResult === 1) { 
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#10b981', '#fbbf24', '#ffffff']
            });
            updateData['stats.wins'] = increment(1); 
            updateData['coins'] = increment(50); 
          }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(fp, code);
  console.log("Game updated with confetti");
}
