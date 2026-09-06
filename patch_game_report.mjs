import fs from 'fs';

const fp = 'src/components/Game.tsx';
let code = fs.readFileSync(fp, 'utf8');

if (!code.includes('import { doc, updateDoc, increment, arrayUnion, addDoc, collection }')) {
  code = code.replace(
    "import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';",
    "import { doc, updateDoc, increment, arrayUnion, addDoc, collection } from 'firebase/firestore';"
  );
}

// Add state for reporting
code = code.replace(
  "const [showCheatAlert, setShowCheatAlert] = useState(false);",
  "const [showCheatAlert, setShowCheatAlert] = useState(false);\n  const [reported, setReported] = useState(false);"
);

// Add report function
const reportFunc = `
  const handleReportOpponent = async () => {
    if (reported || isSpectator) return;
    try {
      const db = getDb();
      await addDoc(collection(db, 'reports'), {
        gameId: game.id,
        reporterId: currentUser.uid,
        reportedId: opponentId,
        reason: 'suspected_cheating_engine',
        timestamp: Date.now()
      });
      setReported(true);
      alert('Denúncia enviada! Nossa equipe e o sistema anti-cheat analisarão os lances desta partida.');
    } catch (e) {
      console.error('Error reporting:', e);
    }
  };
`;

code = code.replace("  const onDrop = async (sourceSquare: string, targetSquare: string, piece: string) => {", reportFunc + "\n  const onDrop = async (sourceSquare: string, targetSquare: string, piece: string) => {");


// Add report button UI next to opponent name
const oldOpponentUI = `<div className="font-bold text-white text-lg">{opponentName}</div>`;
const newOpponentUI = `<div className="flex items-center gap-2">
                    <div className="font-bold text-white text-lg">{opponentName}</div>
                    {!isSpectator && (
                      <button 
                        onClick={handleReportOpponent}
                        disabled={reported}
                        title="Denunciar suspeita de trapaça (Stockfish)"
                        className="text-neutral-500 hover:text-red-400 disabled:opacity-50 transition-colors"
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </button>
                    )}
                  </div>`;
code = code.replace(oldOpponentUI, newOpponentUI);

fs.writeFileSync(fp, code);
console.log("Patched Game.tsx with Report Button");
