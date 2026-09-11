import React, { useMemo } from 'react';

interface CapturedPiecesProps {
  fen: string;
  color: 'w' | 'b'; // Which player's captured pieces we are displaying. If 'w', display black pieces captured by white.
}

const PIECE_ORDER = ['p', 'n', 'b', 'r', 'q'];
const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

export default function CapturedPieces({ fen, color }: CapturedPiecesProps) {
  const { captured, scoreDifference } = useMemo(() => {
    const pieces = fen.split(' ')[0];
    const counts = {
      w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
      b: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    };

    for (const char of pieces) {
      if (char === 'p') counts.b.p++;
      if (char === 'n') counts.b.n++;
      if (char === 'b') counts.b.b++;
      if (char === 'r') counts.b.r++;
      if (char === 'q') counts.b.q++;

      if (char === 'P') counts.w.p++;
      if (char === 'N') counts.w.n++;
      if (char === 'B') counts.w.b++;
      if (char === 'R') counts.w.r++;
      if (char === 'Q') counts.w.q++;
    }

    const startCounts = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    
    // Captured by White (Black pieces missing from board)
    const capByW = {
      p: Math.max(0, startCounts.p - counts.b.p),
      n: Math.max(0, startCounts.n - counts.b.n),
      b: Math.max(0, startCounts.b - counts.b.b),
      r: Math.max(0, startCounts.r - counts.b.r),
      q: Math.max(0, startCounts.q - counts.b.q),
    };

    // Captured by Black (White pieces missing from board)
    const capByB = {
      p: Math.max(0, startCounts.p - counts.w.p),
      n: Math.max(0, startCounts.n - counts.w.n),
      b: Math.max(0, startCounts.b - counts.w.b),
      r: Math.max(0, startCounts.r - counts.w.r),
      q: Math.max(0, startCounts.q - counts.w.q),
    };

    // Calculate score (simple material)
    let wScore = 0;
    let bScore = 0;
    
    // Pieces on board values
    wScore += counts.w.p * PIECE_VALUES.p + counts.w.n * PIECE_VALUES.n + counts.w.b * PIECE_VALUES.b + counts.w.r * PIECE_VALUES.r + counts.w.q * PIECE_VALUES.q;
    bScore += counts.b.p * PIECE_VALUES.p + counts.b.n * PIECE_VALUES.n + counts.b.b * PIECE_VALUES.b + counts.b.r * PIECE_VALUES.r + counts.b.q * PIECE_VALUES.q;

    let scoreDiff = 0;
    if (color === 'w' && wScore > bScore) {
      scoreDiff = wScore - bScore;
    } else if (color === 'b' && bScore > wScore) {
      scoreDiff = bScore - wScore;
    }

    const capCounts = color === 'w' ? capByW : capByB;
    const capturedList: string[] = [];
    
    for (const p of PIECE_ORDER) {
      const count = capCounts[p as keyof typeof capCounts];
      for (let i = 0; i < count; i++) {
        capturedList.push(p);
      }
    }

    return { captured: capturedList, scoreDifference: scoreDiff };
  }, [fen, color]);

  if (captured.length === 0 && scoreDifference === 0) return null;

  return (
    <div className="flex items-center flex-wrap gap-[-4px] ml-1">
      {captured.map((p, i) => {
        // If color is 'w', captured pieces are black ('b').
        const pieceImgCode = color === 'w' ? `b${p}` : `w${p}`;
        return (
          <div key={i} className="w-4 h-4 sm:w-5 sm:h-5 -ml-1.5 first:ml-0 opacity-80 drop-shadow-sm flex-shrink-0">
            <img 
              src={`https://images.chesscomfiles.com/chess-themes/pieces/wood/150/${pieceImgCode}.png`} 
              alt={p}
              className="w-full h-full object-contain"
            />
          </div>
        );
      })}
      {scoreDifference > 0 && (
        <span className="text-xs font-bold text-neutral-400 ml-1">+{scoreDifference}</span>
      )}
    </div>
  );
}
