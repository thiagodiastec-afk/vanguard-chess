import fs from 'fs';
let code = fs.readFileSync('src/components/Store.tsx', 'utf8');

const oldBoard = `              {/* @ts-ignore */}
              <Chessboard 
                options={{
                  id: "PreviewBoard",
                  position: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
                  boardOrientation: "white",
                  darkSquareStyle: previewTheme.darkSquareStyle,
                  lightSquareStyle: previewTheme.lightSquareStyle,
                  pieces: customPieces,
                  animationDurationInMs: 300,
                  arePiecesDraggable: false
                }}
              />`;

const newBoard = `              <Chessboard 
                id="PreviewBoard"
                position="r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4"
                boardOrientation="white"
                customDarkSquareStyle={previewTheme.darkSquareStyle}
                customLightSquareStyle={previewTheme.lightSquareStyle}
                customPieces={customPieces}
                animationDuration={300}
                arePiecesDraggable={false}
              />`;

code = code.replace(oldBoard, newBoard);
fs.writeFileSync('src/components/Store.tsx', code);
