import { Chess } from 'chess.js';
import {
  evaluateBoard,
  countMobility,
  countPawnShield,
  countKingAttackers,
  calculateKingTropism,
  countDoubledPawns,
  countIsolatedPawns,
  pawnStructureConfig,
  mobilityConfig,
  kingSafetyConfig,
  kingAttackersConfig,
  kingTropismConfig
} from './engine.ts';

export interface EvaluationBreakdown {
  material: number;
  pstMiddleGame: number;
  pstEndGame: number;
  taperedBase: number;
  passedPawn: number;
  bishopPair: number;
  rookActivity: number;
  doubledPawn: number;
  isolatedPawn: number;
  pawnStructure: number;
  mobility: number;
  pawnShield: number;
  kingAttackers: number;
  kingTropism: number;
  total: number;
  phase: number;
}

const pieceValues: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

const pawnEvalWhite = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];
const knightEval = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];
const bishopEvalWhite = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
];
const rookEvalWhite = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [0,  0,  0,  5,  5,  0,  0,  0]
];
const evalQ = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [-5,  0,  5,  5,  5,  5,  0, -5],
  [0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
];
const kingEvalWhite = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20, 20,  0,  0,  0,  0, 20, 20],
  [20, 30, 10,  0,  0, 10, 30, 20]
];
const kingEvalEndgameWhite = [
  [-30,-20,-20,-10,-10,-20,-20,-30],
  [-20,-10, -5,  0,  0, -5,-10,-20],
  [-20, -5, 15, 20, 20, 15, -5,-20],
  [-20, -5, 20, 30, 30, 20, -5,-20],
  [-20, -5, 20, 30, 30, 20, -5,-20],
  [-20, -5, 15, 20, 20, 15, -5,-20],
  [-20,-20,  0,  0,  0,  0,-20,-20],
  [-30,-20,-15,-10,-10,-15,-20,-30]
];

function reverseArray(arr: number[][]): number[][] {
  return arr.slice().reverse();
}

const pawnEvalBlack = reverseArray(pawnEvalWhite);
const bishopEvalBlack = reverseArray(bishopEvalWhite);
const rookEvalBlack = reverseArray(rookEvalWhite);
const kingEvalBlack = reverseArray(kingEvalWhite);
const kingEvalEndgameBlack = reverseArray(kingEvalEndgameWhite);

function isPassedPawn(board: any[][], x: number, y: number, isWhite: boolean): boolean {
  const direction = isWhite ? -1 : 1;
  const endRow = isWhite ? -1 : 8;

  for (let r = y + direction; r !== endRow; r += direction) {
    const piece = board[r][x];
    if (piece && piece.type === 'p' && piece.color !== (isWhite ? 'w' : 'b')) return false;

    if (x > 0) {
      const leftPiece = board[r][x - 1];
      if (leftPiece && leftPiece.type === 'p' && leftPiece.color !== (isWhite ? 'w' : 'b')) return false;
    }

    if (x < 7) {
      const rightPiece = board[r][x + 1];
      if (rightPiece && rightPiece.type === 'p' && rightPiece.color !== (isWhite ? 'w' : 'b')) return false;
    }
  }
  return true;
}

const PASSED_PAWN_BONUS = [0, 5, 10, 20, 35, 60, 100, 0];
const BISHOP_PAIR_BONUS = 50;
const ROOK_OPEN_FILE_BONUS = 15;
const ROOK_SEMI_OPEN_FILE_BONUS = 8;

export function evaluateBreakdown(game: Chess): EvaluationBreakdown {
  let materialWhite = 0;
  let materialBlack = 0;

  let pstMgWhite = 0;
  let pstMgBlack = 0;
  let pstEgWhite = 0;
  let pstEgBlack = 0;

  let phase = 0;
  let passedPawnScore = 0;

  let whiteBishops = 0;
  let blackBishops = 0;

  const whitePawnCounts = new Uint8Array(8);
  const blackPawnCounts = new Uint8Array(8);

  type RookEntry = { file: number; color: 'w' | 'b' };
  const rooks: RookEntry[] = [];

  let whiteKingRow = -1;
  let whiteKingCol = -1;
  let blackKingRow = -1;
  let blackKingCol = -1;

  const board = game.board();

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (!piece) continue;

      if (piece.type === 'n' || piece.type === 'b') phase += 1;
      else if (piece.type === 'r') phase += 2;
      else if (piece.type === 'q') phase += 4;

      if (piece.type === 'b') {
        if (piece.color === 'w') whiteBishops++;
        else blackBishops++;
      }

      if (piece.type === 'p') {
        if (piece.color === 'w') whitePawnCounts[j]++;
        else blackPawnCounts[j]++;
      }

      if (piece.type === 'r') {
        rooks.push({ file: j, color: piece.color });
      }

      if (piece.type === 'k') {
        if (piece.color === 'w') {
          whiteKingRow = i;
          whiteKingCol = j;
        } else {
          blackKingRow = i;
          blackKingCol = j;
        }
      }

      // Material
      const mat = pieceValues[piece.type];
      if (piece.color === 'w') materialWhite += mat;
      else materialBlack += mat;

      // PST
      let mgVal = 0;
      let egVal = 0;
      const isW = piece.color === 'w';

      if (piece.type === 'p') {
        mgVal = isW ? pawnEvalWhite[i][j] : pawnEvalBlack[i][j];
        egVal = mgVal;
      } else if (piece.type === 'r') {
        mgVal = isW ? rookEvalWhite[i][j] : rookEvalBlack[i][j];
        egVal = mgVal;
      } else if (piece.type === 'n') {
        mgVal = knightEval[i][j];
        egVal = mgVal;
      } else if (piece.type === 'b') {
        mgVal = isW ? bishopEvalWhite[i][j] : bishopEvalBlack[i][j];
        egVal = mgVal;
      } else if (piece.type === 'q') {
        mgVal = evalQ[i][j];
        egVal = mgVal;
      } else if (piece.type === 'k') {
        mgVal = isW ? kingEvalWhite[i][j] : kingEvalBlack[i][j];
        egVal = isW ? kingEvalEndgameWhite[i][j] : kingEvalEndgameBlack[i][j];
      }

      if (isW) {
        pstMgWhite += mgVal;
        pstEgWhite += egVal;
      } else {
        pstMgBlack += mgVal;
        pstEgBlack += egVal;
      }

      // Passed Pawns
      if (piece.type === 'p' && isPassedPawn(board, j, i, isW)) {
        const relativeRank = isW ? 7 - i : i;
        const bonus = PASSED_PAWN_BONUS[relativeRank] || 0;
        if (isW) passedPawnScore += bonus;
        else passedPawnScore -= bonus;
      }
    }
  }

  const MAX_PHASE = 24;
  const clampedPhase = phase > MAX_PHASE ? MAX_PHASE : phase;

  const rawMaterial = materialWhite - materialBlack;
  const rawPstMg = pstMgWhite - pstMgBlack;
  const rawPstEg = pstEgWhite - pstEgBlack;

  const mgEval = rawMaterial + rawPstMg;
  const egEval = rawMaterial + rawPstEg;

  const taperedBase = Math.round((mgEval * clampedPhase + egEval * (MAX_PHASE - clampedPhase)) / MAX_PHASE);

  // Bishop Pair
  let bishopPairScore = 0;
  if (whiteBishops >= 2) bishopPairScore += BISHOP_PAIR_BONUS;
  if (blackBishops >= 2) bishopPairScore -= BISHOP_PAIR_BONUS;

  // Rook Activity
  let rookActivityScore = 0;
  for (const rook of rooks) {
    const whitePawnsOnFile = whitePawnCounts[rook.file] > 0;
    const blackPawnsOnFile = blackPawnCounts[rook.file] > 0;
    const sign = rook.color === 'w' ? 1 : -1;
    if (!whitePawnsOnFile && !blackPawnsOnFile) {
      rookActivityScore += sign * ROOK_OPEN_FILE_BONUS;
    } else if (
      (!whitePawnsOnFile && blackPawnsOnFile && rook.color === 'w') ||
      (whitePawnsOnFile && !blackPawnsOnFile && rook.color === 'b')
    ) {
      rookActivityScore += sign * ROOK_SEMI_OPEN_FILE_BONUS;
    }
  }

  // Pawn Structure
  let doubledScore = 0;
  if (pawnStructureConfig.doubledPawnPenalty > 0) {
    const whiteDoubled = countDoubledPawns(whitePawnCounts);
    const blackDoubled = countDoubledPawns(blackPawnCounts);
    doubledScore = (blackDoubled - whiteDoubled) * pawnStructureConfig.doubledPawnPenalty;
  }

  let isolatedScore = 0;
  if (pawnStructureConfig.isolatedPawnPenalty > 0) {
    const whiteIsolated = countIsolatedPawns(whitePawnCounts);
    const blackIsolated = countIsolatedPawns(blackPawnCounts);
    isolatedScore = (blackIsolated - whiteIsolated) * pawnStructureConfig.isolatedPawnPenalty;
  }

  // Mobility
  let mobilityScore = 0;
  if (mobilityConfig.bonusPerMove > 0) {
    const whiteMobility = countMobility(game, 'w');
    const blackMobility = countMobility(game, 'b');
    mobilityScore = (whiteMobility - blackMobility) * mobilityConfig.bonusPerMove;
  }

  // King Safety: Pawn Shield
  let pawnShieldScore = 0;
  if (kingSafetyConfig.pawnShieldBonus > 0) {
    const whiteShield = countPawnShield(board, 'w', whiteKingRow, whiteKingCol);
    const blackShield = countPawnShield(board, 'b', blackKingRow, blackKingCol);
    pawnShieldScore = (whiteShield - blackShield) * kingSafetyConfig.pawnShieldBonus;
  }

  // King Safety: King Attackers
  let kingAttackersScore = 0;
  if (kingAttackersConfig.attackerPenalty > 0) {
    const attacksOnWhiteKing = countKingAttackers(board, 'w', whiteKingRow, whiteKingCol);
    const attacksOnBlackKing = countKingAttackers(board, 'b', blackKingRow, blackKingCol);
    kingAttackersScore = (attacksOnBlackKing - attacksOnWhiteKing) * kingAttackersConfig.attackerPenalty;
  }

  // King Safety: King Tropism
  let kingTropismScore = 0;
  if (kingTropismConfig.enabled) {
    const tropismWhiteKing = calculateKingTropism(board, 'w', whiteKingRow, whiteKingCol);
    const tropismBlackKing = calculateKingTropism(board, 'b', blackKingRow, blackKingCol);
    kingTropismScore = tropismBlackKing - tropismWhiteKing;
  }

  const total = taperedBase +
    passedPawnScore +
    bishopPairScore +
    rookActivityScore +
    doubledScore +
    isolatedScore +
    mobilityScore +
    pawnShieldScore +
    kingAttackersScore +
    kingTropismScore;

  return {
    material: rawMaterial,
    pstMiddleGame: rawPstMg,
    pstEndGame: rawPstEg,
    taperedBase,
    passedPawn: passedPawnScore,
    bishopPair: bishopPairScore,
    rookActivity: rookActivityScore,
    doubledPawn: doubledScore,
    isolatedPawn: isolatedScore,
    pawnStructure: doubledScore + isolatedScore,
    mobility: mobilityScore,
    pawnShield: pawnShieldScore,
    kingAttackers: kingAttackersScore,
    kingTropism: kingTropismScore,
    total,
    phase: clampedPhase
  };
}
