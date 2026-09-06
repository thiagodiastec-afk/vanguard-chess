import fs from 'fs';
let code = fs.readFileSync('src/components/Store.tsx', 'utf8');

const newBoard = `              <Chessboard 
                
                position="r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4"
                boardOrientation="white"
                customDarkSquareStyle={previewTheme.darkSquareStyle}
                customLightSquareStyle={previewTheme.lightSquareStyle}
                customPieces={customPieces}
                animationDuration={300}
                arePiecesDraggable={false}
              />`;
              
const oldBoard = `              {/* @ts-ignore */}
              <Chessboard 
                position="r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4"
                boardOrientation="white"
                customDarkSquareStyle={previewTheme.darkSquareStyle}
                customLightSquareStyle={previewTheme.lightSquareStyle}
                customPieces={customPieces}
                animationDuration={300}
                arePiecesDraggable={false}
              />`;

code = code.replace(newBoard, oldBoard);
fs.writeFileSync('src/components/Store.tsx', code);
