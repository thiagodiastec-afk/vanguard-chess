const fs = require('fs');

let content = fs.readFileSync('src/components/ComputerGame.tsx', 'utf8');

// add import
if (!content.includes("import { sounds }")) {
  content = content.replace("import { Chess } from 'chess.js';", "import { Chess } from 'chess.js';\nimport { sounds } from '../lib/sounds';");
}

// update onDrop
content = content.replace(
`      if (move) {
        setGame(gameCopy);
        return true;
      }`,
`      if (move) {
        sounds.playMove(move.captured != null, gameCopy.inCheck());
        setGame(gameCopy);
        return true;
      }`
);

// also update makeComputerMove
content = content.replace(
`      if (move) {
        gameCopy.move(move);
        setGame(gameCopy);
      }`,
`      if (move) {
        const moveObj = gameCopy.move(move);
        sounds.playMove(moveObj.captured != null, gameCopy.inCheck());
        setGame(gameCopy);
      }`
);

fs.writeFileSync('src/components/ComputerGame.tsx', content);
