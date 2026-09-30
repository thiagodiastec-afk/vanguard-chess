import { Chess } from 'chess.js';

export type NormalizedScore =
  | { type: 'CP'; cp: number }
  | { type: 'MATE'; mateIn: number };

/**
 * Converts a SAN move (from Vanguard or chess.js) to UCI notation (e.g., 'Qxf7#' -> 'f3f7').
 */
export function sanToUci(fen: string, san: string): string {
  try {
    const game = new Chess(fen);
    const move = game.move(san);
    if (!move) return san;
    const promotion = move.promotion ? move.promotion.toLowerCase() : '';
    return `${move.from}${move.to}${promotion}`;
  } catch {
    return san;
  }
}

/**
 * Converts a UCI move to SAN notation.
 */
export function uciToSan(fen: string, uci: string): string {
  try {
    const game = new Chess(fen);
    const from = uci.substring(0, 2);
    const to = uci.substring(2, 4);
    const promotion = uci.length > 4 ? uci.substring(4, 5) : undefined;
    const move = game.move({ from, to, promotion });
    return move ? move.san : uci;
  } catch {
    return uci;
  }
}

/**
 * Normalizes Vanguard score (which is from White's perspective, or relative)
 * to NormalizedScore format. In Vanguard, evaluateBoard is White-relative.
 * In minimax root, calculateBestMove returns standard minimax score.
 */
export function normalizeVanguardScore(score: number, sideToMove: 'w' | 'b'): NormalizedScore {
  const MATE_THRESHOLD = 90000;
  if (score >= MATE_THRESHOLD) {
    const plies = 100000 - score;
    return { type: 'MATE', mateIn: Math.max(1, Math.ceil(plies / 2)) };
  } else if (score <= -MATE_THRESHOLD) {
    const plies = 100000 + score;
    return { type: 'MATE', mateIn: -Math.max(1, Math.ceil(plies / 2)) };
  }
  // Convert from White perspective to side-to-move perspective if needed,
  // or keep White perspective if consistent.
  return { type: 'CP', cp: score };
}

/**
 * Normalizes Stockfish score (which is from side-to-move perspective)
 * to White-relative perspective for direct comparison with Vanguard.
 */
export function normalizeStockfishScore(
  scoreCp: number | undefined,
  mateIn: number | undefined,
  sideToMove: 'w' | 'b'
): NormalizedScore {
  if (mateIn !== undefined) {
    const whiteMateIn = sideToMove === 'w' ? mateIn : -mateIn;
    return { type: 'MATE', mateIn: whiteMateIn };
  }
  const cp = scoreCp ?? 0;
  const whiteCp = sideToMove === 'w' ? cp : -cp;
  return { type: 'CP', cp: whiteCp };
}

/**
 * Calculates Centipawn Loss (CPL) for Vanguard's chosen move
 * compared to Stockfish's best move.
 * CPL = max(0, bestMoveScore - chosenMoveScore) from the perspective of the side to move.
 */
export function calculateCentipawnLoss(
  bestEval: NormalizedScore,
  chosenEval: NormalizedScore,
  sideToMove: 'w' | 'b'
): number {
  if (bestEval.type === 'MATE' || chosenEval.type === 'MATE') {
    // Mate transitions are handled separately
    return 0;
  }

  // Convert White-relative scores to side-to-move relative
  const sign = sideToMove === 'w' ? 1 : -1;
  const bestSideScore = bestEval.cp * sign;
  const chosenSideScore = chosenEval.cp * sign;

  return Math.max(0, bestSideScore - chosenSideScore);
}
