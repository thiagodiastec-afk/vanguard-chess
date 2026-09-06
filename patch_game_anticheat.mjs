import fs from 'fs';

const fp = 'src/components/Game.tsx';
let code = fs.readFileSync(fp, 'utf8');

// Add shield icon
if (!code.includes('ShieldAlert')) {
  code = code.replace(
    "import { Flag, Handshake, ChevronLeft, MessageSquare } from 'lucide-react';",
    "import { Flag, Handshake, ChevronLeft, MessageSquare, ShieldAlert } from 'lucide-react';"
  );
}

// Add state for warnings
const stateInjection = `  const [fen, setFen] = useState(game.fen);
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [showCheatAlert, setShowCheatAlert] = useState(false);`;
code = code.replace("  const [fen, setFen] = useState(game.fen);", stateInjection);

// Add the anti-cheat useEffect
const anticheatEffect = `
  // Fair Play Heuristics (Anti-Cheat)
  useEffect(() => {
    if (isSpectator || game.status !== 'playing') return;

    const handleVisibilityChange = () => {
      const isMyTurn = (game.turn === 'w' && isWhite) || (game.turn === 'b' && isBlack);
      // If user leaves the tab during their turn, it's highly suspicious (engine checking)
      if (document.visibilityState === 'hidden' && isMyTurn) {
        setCheatWarnings(prev => {
          const newCount = prev + 1;
          if (newCount >= 2) {
            setShowCheatAlert(true);
            // In a real Server-Authority setup, we would send this flag to the server to analyze their moves
            setTimeout(() => setShowCheatAlert(false), 5000);
          }
          return newCount;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [game.status, game.turn, isWhite, isBlack, isSpectator]);
`;

code = code.replace("  const statsUpdated = useRef(false);", anticheatEffect + "\n  const statsUpdated = useRef(false);");

// Add the UI Alert
const uiAlert = `
        {/* Anti-Cheat Alert */}
        {showCheatAlert && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 backdrop-blur-sm border border-red-500">
            <ShieldAlert className="w-6 h-6" />
            <div>
              <p className="font-bold">Aviso do Sistema Fair Play</p>
              <p className="text-sm text-red-100">Sair da tela do jogo durante a sua vez é proibido. O uso de IA resultará em banimento.</p>
            </div>
          </div>
        )}
`;

code = code.replace('        <div className="bg-neutral-800 rounded-2xl p-4 sm:p-6 shadow-2xl border border-neutral-700/50">', '        <div className="bg-neutral-800 rounded-2xl p-4 sm:p-6 shadow-2xl border border-neutral-700/50 relative">\n' + uiAlert);

fs.writeFileSync(fp, code);
console.log("Patched Game.tsx with Anti-Cheat");
