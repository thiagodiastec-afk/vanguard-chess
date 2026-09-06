import fs from 'fs';
let code = fs.readFileSync('src/components/Store.tsx', 'utf8');

code = code.replace(/\{\/\* @ts-ignore \*\/\}[\s\n]*<Chessboard[\s\S]*?\/>/, `              {/* @ts-ignore */}
              <Chessboard 
                options={{
                  id: "PreviewBoard",
                  position: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
                  boardOrientation: "white",
                  darkSquareStyle: previewTheme.darkSquareStyle,
                  lightSquareStyle: previewTheme.lightSquareStyle,
                  pieces: customPieces,
                  animationDurationInMs: 300
                }}
              />`);

fs.writeFileSync('src/components/Store.tsx', code);
