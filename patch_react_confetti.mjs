import fs from 'fs';

for (const fp of ['src/components/ComputerGame.tsx', 'src/components/Game.tsx']) {
  let code = fs.readFileSync(fp, 'utf8');
  if (!code.includes("import React")) {
    code = code.replace("import { useState", "import React, { useState");
  }
  if (!code.includes("canvas-confetti")) {
    code = code.replace("import { Chessboard } from 'react-chessboard';", "import { Chessboard } from 'react-chessboard';\nimport confetti from 'canvas-confetti';");
  }
  fs.writeFileSync(fp, code);
}
