import React, { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { evaluateBoard } from '../lib/engine';
import { cn } from '../lib/utils';

export default function EvalBar({ game, isFlipped }: { game: Chess, isFlipped: boolean }) {
  const [evalScore, setEvalScore] = useState(0);

  useEffect(() => {
    // evaluateBoard returns positive for white advantage, negative for black
    // We scale it down a bit for the UI. Max advantage = 1000 centipawns
    const score = evaluateBoard(game);
    setEvalScore(score);
  }, [game]);

  // Convert eval to a percentage (0 to 100)
  // Let's cap it at +/- 800 for the visual bar
  const CAP = 800;
  const clampedScore = Math.max(-CAP, Math.min(CAP, evalScore));
  
  // 50% is equal, 100% is white completely winning, 0% is black completely winning
  let whitePercentage = 50 + (clampedScore / CAP) * 50;
  
  if (game.isCheckmate()) {
    whitePercentage = game.turn() === 'b' ? 100 : 0;
  }

  // Visual orientation
  const topPercentage = isFlipped ? whitePercentage : 100 - whitePercentage;
  
  const displayScore = (evalScore / 100).toFixed(1);

  return (
    <div className="w-6 h-full bg-neutral-800 rounded-lg overflow-hidden flex flex-col relative border border-neutral-700/50">
      {/* Black bar area */}
      <div 
        className="w-full bg-neutral-900 transition-all duration-700 ease-in-out"
        style={{ height: `${topPercentage}%` }}
      />
      {/* White bar area */}
      <div 
        className="w-full bg-neutral-200 transition-all duration-700 ease-in-out"
        style={{ height: `${100 - topPercentage}%` }}
      />
      
      {/* Score label */}
      <div className={cn(
        "absolute left-0 right-0 text-[10px] font-bold text-center z-10 transition-colors pointer-events-none select-none",
        evalScore > 0 ? (isFlipped ? "top-2 text-neutral-900" : "bottom-2 text-neutral-900") : (isFlipped ? "bottom-2 text-neutral-200" : "top-2 text-neutral-200"),
        Math.abs(evalScore) < 50 && "text-neutral-500 top-1/2 -translate-y-1/2"
      )}>
        {Math.abs(evalScore) < 20 ? "0.0" : (evalScore > 0 ? "+" : "") + displayScore}
      </div>
    </div>
  );
}
