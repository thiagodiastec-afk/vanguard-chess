import fs from 'fs';

let filePath = 'src/components/Store.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Imports
code = code.replace(
  "import { Store as StoreIcon, Lock, Unlock, Check, Crown, Palette, Coins } from 'lucide-react';",
  "import { Store as StoreIcon, Lock, Unlock, Check, Crown, Palette, Coins, Eye, X } from 'lucide-react';\nimport { Chessboard } from 'react-chessboard';\nimport { customPieces } from '../lib/chessPieces';"
);

// State
code = code.replace(
  "const [buying, setBuying] = useState<string | null>(null);",
  "const [buying, setBuying] = useState<string | null>(null);\n  const [previewTheme, setPreviewTheme] = useState<any>(null);"
);

// Preview Hover overlay in the 2x2 grid
const oldGrid = `<div className="w-full h-24 rounded-lg mb-4 flex border border-neutral-700/50 overflow-hidden shadow-inner">`;
const newGrid = `<div 
                  className="w-full h-24 rounded-lg mb-4 flex border border-neutral-700/50 overflow-hidden shadow-inner cursor-pointer relative group/preview"
                  onClick={() => setPreviewTheme(theme)}
                >
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 flex items-center justify-center transition-opacity z-10">
                    <Eye className="w-6 h-6 text-white" />
                    <span className="text-white text-sm font-bold ml-2">Visualizar</span>
                  </div>`;
code = code.replace(oldGrid, newGrid); // We need to replace it for all or just do a global replace? The map creates it once, so standard string replace works.

// Modal
const oldReturn = `      </div>
    </div>
  );
}`;
const newReturn = `      </div>
      
      {previewTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewTheme(null)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setPreviewTheme(null)}
              className="absolute -top-3 -right-3 p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-full transition-colors z-20 border border-neutral-700"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Palette className="w-6 h-6 text-emerald-500" />
                {previewTheme.name}
              </h3>
              <p className="text-neutral-400 text-sm mt-1">{previewTheme.description}</p>
            </div>
            
            <div className="w-full aspect-square rounded-xl overflow-hidden shadow-2xl ring-4 ring-black/50 bg-black">
              {/* @ts-ignore react-chessboard types are broken in v5 */}
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
              />
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setPreviewTheme(null)}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-4 rounded-xl transition-colors"
              >
                Fechar
              </button>
              
              {(!currentUser.unlockedThemes?.includes(previewTheme.id) && previewTheme.price > 0) && (
                <button
                  onClick={() => {
                    handleBuy(previewTheme.id, previewTheme.price);
                    setPreviewTheme(null);
                  }}
                  disabled={coins < previewTheme.price}
                  className={\`flex-1 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors \${
                    coins >= previewTheme.price 
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                      : 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                  }\`}
                >
                  <Coins className="w-5 h-5" /> Comprar por {previewTheme.price}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;
code = code.replace(oldReturn, newReturn);

fs.writeFileSync(filePath, code);
console.log('Store.tsx patched for preview');
