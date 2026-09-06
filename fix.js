const fs = require('fs');
let code = fs.readFileSync('src/components/ComputerGame.tsx', 'utf8');
code = code.replace(
  /position=\{game\.fen\(\)\}\n\s+onPieceDrop=\{onDrop as any\}\n\s+boardOrientation=\{playerColor === 'w' \? 'white' : 'black'\}\n\s+darkSquareStyle=\{boardStyles\.darkSquareStyle\}\n\s+lightSquareStyle=\{boardStyles\.lightSquareStyle\}\n\s+pieces=\{customPieces\}\n\s+animationDurationInMs=\{300\}/,
  `options={{
            position: game.fen(),
            onPieceDrop: onDrop as any,
            boardOrientation: playerColor === 'w' ? 'white' : 'black',
            darkSquareStyle: boardStyles.darkSquareStyle,
            lightSquareStyle: boardStyles.lightSquareStyle,
            pieces: customPieces,
            animationDurationInMs: 300
          }}`
);
fs.writeFileSync('src/components/ComputerGame.tsx', code);
