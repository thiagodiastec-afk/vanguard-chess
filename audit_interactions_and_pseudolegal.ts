import { Chess } from 'chess.js';
import {
  evaluateBoard,
  countMobility,
  evaluateMobility,
  mobilityConfig,
  pawnStructureConfig
} from './src/lib/engine';

// Helper to count pseudo-legal moves excluding King
export function countPseudoMobility(game: Chess, color: 'w' | 'b'): number {
  const g = game as any;
  const originalTurn = g._turn;
  g._turn = color;
  const rawMoves = typeof g._moves === 'function' ? g._moves({ legal: false }) : [];
  g._turn = originalTurn;

  let count = 0;
  for (let i = 0; i < rawMoves.length; i++) {
    const p = rawMoves[i].piece;
    if (p !== 'k' && p !== 'K') {
      count++;
    }
  }
  return count;
}

export function evaluatePseudoMobility(game: Chess): {
  whiteMobility: number;
  blackMobility: number;
  mobilityDelta: number;
  score: number;
} {
  const whiteMobility = countPseudoMobility(game, 'w');
  const blackMobility = countPseudoMobility(game, 'b');
  const mobilityDelta = whiteMobility - blackMobility;
  const score = mobilityDelta * mobilityConfig.bonusPerMove;
  return { whiteMobility, blackMobility, mobilityDelta, score };
}

async function runAudit() {
  console.log('=============================================================');
  console.log(' FASE 5.4F.1: PSEUDO-LEGAL VS LEGAL & DOUBLE COUNTING AUDIT  ');
  console.log('=============================================================\n');

  // --- 1. SENSITIVITY TO CHECKS AND PINS ---
  console.log('--- 1. SENSIBILIDADE A XEQUE E CRAVAÇÕES ---');

  // Position 1: Absolute pin (Knight pinned to King by Bishop)
  // White: King on e1, pinned Knight on c3, Queen on d1. Black: Bishop on a5 pinning Knight to King on e1!
  const pinFen = '4k3/8/8/b7/8/2N5/8/3QK3 w - - 0 1';
  const gamePin = new Chess(pinFen);
  const wLegalPin = countMobility(gamePin, 'w');
  const wPseudoPin = countPseudoMobility(gamePin, 'w');
  console.log(`Posição com Cavalo Cravado Absolutamente:`);
  console.log(`  FEN: ${pinFen}`);
  console.log(`  White Legal Mobility:       ${wLegalPin}`);
  console.log(`  White Pseudo-Legal Mobility: ${wPseudoPin}`);
  console.log(`  Diferença (lances ilegais contados por pseudo): ${wPseudoPin - wLegalPin}`);

  // Position 2: In Check
  // Black Rook checking White King on e1
  const checkFen = '4k3/8/8/8/8/8/4r3/3QK3 w - - 0 1';
  const gameCheck = new Chess(checkFen);
  const wLegalCheck = countMobility(gameCheck, 'w');
  const wPseudoCheck = countPseudoMobility(gameCheck, 'w');
  console.log(`Posição com Rei em Xeque:`);
  console.log(`  FEN: ${checkFen}`);
  console.log(`  White Legal Mobility:       ${wLegalCheck}`);
  console.log(`  White Pseudo-Legal Mobility: ${wPseudoCheck}`);
  console.log(`  Diferença:                  ${wPseudoCheck - wLegalCheck}`);

  // Position 3: Multiple pins in complex middlegame
  const complexPinFen = 'r1b1k2r/pppp1ppp/2n5/1B2p3/4n3/2N2N2/PPPP1PPP/R1BQR1K1 w kq - 0 8';
  const gameComplex = new Chess(complexPinFen);
  const wLegalC = countMobility(gameComplex, 'w');
  const wPseudoC = countPseudoMobility(gameComplex, 'w');
  const bLegalC = countMobility(gameComplex, 'b');
  const bPseudoC = countPseudoMobility(gameComplex, 'b');
  console.log(`Posição Complexa (Abertura/Meio-jogo com cravadas):`);
  console.log(`  FEN: ${complexPinFen}`);
  console.log(`  White: Legal=${wLegalC}, Pseudo=${wPseudoC} (Δ=${wPseudoC - wLegalC})`);
  console.log(`  Black: Legal=${bLegalC}, Pseudo=${bPseudoC} (Δ=${bPseudoC - bLegalC})`);
  console.log(`  Delta Legal (W - B):  ${wLegalC - bLegalC}`);
  console.log(`  Delta Pseudo (W - B): ${wPseudoC - bPseudoC}`);
  console.log(`  Distorção no Delta de Mobilidade: ${(wPseudoC - bPseudoC) - (wLegalC - bLegalC)} moves (${((wPseudoC - bPseudoC) - (wLegalC - bLegalC)) * 2} cp)\n`);

  // --- 2. DOUBLE COUNTING: ROOK ACTIVITY (CLOSED, SEMI-OPEN, OPEN) ---
  console.log('--- 2. DOUBLE COUNTING: ROOK ACTIVITY (CLOSED vs SEMI-OPEN vs OPEN) ---');
  // 3 positions where White has a Rook on e1, Black has symmetric pieces
  // A: Closed e-file (White pawn on e4, Black pawn on e5)
  const rookClosedFen = '4k3/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/4R1K1 w - - 0 1';
  // B: Semi-open e-file for White (White pawn gone, Black pawn on e5)
  const rookSemiFen   = '4k3/pppp1ppp/8/4p3/8/8/PPPP1PPP/4R1K1 w - - 0 1';
  // C: Open e-file (Neither white nor black pawn on e-file)
  const rookOpenFen   = '4k3/pppp1ppp/8/8/8/8/PPPP1PPP/4R1K1 w - - 0 1';

  function measureRook(fen: string, label: string) {
    const g = new Chess(fen);
    mobilityConfig.bonusPerMove = 0;
    const baseEval = evaluateBoard(g);
    mobilityConfig.bonusPerMove = 2;
    const mobEval = evaluateBoard(g);
    const mob = evaluateMobility(g);
    const pseudoMob = evaluatePseudoMobility(g);

    console.log(`  ${label}:`);
    console.log(`    FEN: ${fen}`);
    console.log(`    Base Eval (sem mob):     ${baseEval} cp`);
    console.log(`    Mobility Legal (+2 cp):  ${mob.score} cp (W=${mob.whiteMobility}, B=${mob.blackMobility}, Δ=${mob.mobilityDelta})`);
    console.log(`    Mobility Pseudo (+2 cp): ${pseudoMob.score} cp (W=${pseudoMob.whiteMobility}, B=${pseudoMob.blackMobility}, Δ=${pseudoMob.mobilityDelta})`);
    console.log(`    Total Eval com Mobility: ${mobEval} cp`);
  }

  measureRook(rookClosedFen, 'A. Torre em Coluna Fechada (e4, e5 presentes)');
  measureRook(rookSemiFen,   'B. Torre em Coluna Semi-Aberta (e5 presente, e4 ausente)');
  measureRook(rookOpenFen,   'C. Torre em Coluna Aberta (e4 e e5 ausentes)');

  // --- 3. DOUBLE COUNTING: PASSIVE VS ACTIVE ROOK ON SAME COLUMN ---
  console.log('\n--- 3. DOUBLE COUNTING: ROOK PASSIVA vs ROOK ATIVA (MESMA COLUNA ABERTA) ---');
  // Both positions have Rook on open e-file and same Rook Activity bonus (+15 cp).
  // Position Active: White Rook on e1 has clear path all the way to e8.
  // Position Blocked horizontally/vertically: White Rook on e2 boxed in by white pieces or restricted.
  const activeRookFen  = '4k3/4b3/8/8/8/8/8/4R1K1 w - - 0 1'; // White R on e1, open e-file
  const passiveRookFen = '4k3/4b3/8/8/8/8/4B3/4R1K1 w - - 0 1'; // White Bishop on e2 blocking Rook on e1
  console.log(`Posição A (Rook Ativa na coluna e aberta):`);
  measureRook(activeRookFen, 'Rook Ativa Livre');
  console.log(`Posição B (Rook Bloqueada na coluna e aberta por Bispo em e2):`);
  measureRook(passiveRookFen, 'Rook Bloqueada por Bispo próprio');

  // --- 4. DOUBLE COUNTING: BISHOP PAIR VS BISHOP MOBILITY ---
  console.log('\n--- 4. DOUBLE COUNTING: BISHOP PAIR vs BISHOP MOBILITY ---');
  // Position A: White has 2 Bishops, but both are completely locked behind pawns
  const blockedBishopsFen = '4k3/8/p1p1p1p1/1p1p1p1p/1P1P1P1P/P1P1P1P1/2B2B2/4K3 w - - 0 1';
  // Position B: White has 2 Bishops, open board
  const openBishopsFen    = '4k3/8/8/8/8/8/8/2B1KB2 w - - 0 1';
  measureRook(blockedBishopsFen, 'Dois Bispos Brancos TOTALMENTE Bloqueados');
  measureRook(openBishopsFen,    'Dois Bispos Brancos TOTALMENTE Abertos');

  // --- 5. DOUBLE COUNTING: KNIGHT CENTRALIZED VS RIM (PST VS MOBILITY) ---
  console.log('\n--- 5. DOUBLE COUNTING: KNIGHT CENTRALIZADO vs NA BORDA ---');
  // Material equal (King + Knight each).
  // Position Center: White Knight on d4 (8 legal moves), Black Knight on a1 (2 legal moves).
  const knightCenterFen = '4k3/8/8/8/3N4/8/8/n3K3 w - - 0 1';
  // Position Rim: White Knight on h1 (2 legal moves), Black Knight on a1 (2 legal moves).
  const knightRimFen    = '4k3/8/8/8/8/8/8/n3K2N w - - 0 1';
  measureRook(knightCenterFen, 'Cavalo Centralizado (d4 vs a1)');
  measureRook(knightRimFen,    'Cavalo na Borda (h1 vs a1)');

  // --- 6. DOUBLE COUNTING: QUEEN MOBILITY DISPROPORTION ---
  console.log('\n--- 6. QUEEN MOBILITY DISPROPORTION TEST ---');
  // Queen on open board: Queen on d4 has 27 legal moves (+54 cp at 2 cp/move).
  const queenOpenFen = '4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1';
  // Queen boxed in: Queen on a1 boxed in by white pawns on a2, b2, c2 and King on b1
  const queenBoxedFen = '4k3/8/8/8/8/8/PPP5/Q1K5 w - - 0 1';
  measureRook(queenOpenFen,  'Dama Aberta em d4');
  measureRook(queenBoxedFen, 'Dama Encaixotada em a1');
}

runAudit();
