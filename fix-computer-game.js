const fs = require('fs');
let code = fs.readFileSync('src/components/ComputerGame.tsx', 'utf8');

const oldDrop = `  const onDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    if (game.turn() !== playerColor || gameOver || isThinking) return false;

    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: piece[1].toLowerCase() ?? 'q',
      });`;

const newDrop = `  const onDrop = (argsOrSource: any, argTarget?: any, argPiece?: any) => {
    let sourceSquare = '';
    let targetSquare = '';

    if (typeof argsOrSource === 'object' && argsOrSource !== null) {
      sourceSquare = argsOrSource.sourceSquare;
      targetSquare = argsOrSource.targetSquare;
    } else {
      sourceSquare = argsOrSource;
      targetSquare = argTarget;
    }

    if (game.turn() !== playerColor || gameOver || isThinking) return false;

    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });`;

code = code.replace(oldDrop, newDrop);
fs.writeFileSync('src/components/ComputerGame.tsx', code);
