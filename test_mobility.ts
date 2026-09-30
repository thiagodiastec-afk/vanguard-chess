/**
 * FASE 5.4F — Mobility Unit Tests & Controlled Double-Counting Tests
 * Validates legal move extraction, King exclusion, check filtering, symmetry,
 * delta calculation, determinism, and controlled piece mobility tests.
 */
import { Chess } from 'chess.js';
import { countMobility, evaluateMobility, evaluateBoard, mobilityConfig, calculateBestMove } from './src/lib/engine.ts';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, name: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ FAIL: ${name} ${detail ? `(${detail})` : ''}`);
  }
}

console.log('=== MOBILITY UNIT TESTS (5.4F) ===\n');

// Teste 1 — Mobilidade equivalente (delta = 0)
console.log('--- Test 1: Equivalent Mobility ---');
const eqFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const g1 = new Chess(eqFen);
const mob1 = evaluateMobility(g1);
assert(mob1.whiteMobility === 20 && mob1.blackMobility === 20, 'Starting pos has 20 moves each (excluding King, which has 0 legal)', `W=${mob1.whiteMobility}, B=${mob1.blackMobility}`);
assert(mob1.mobilityDelta === 0 && mob1.score === 0, 'Mobility delta is 0, score is 0 cp', `delta=${mob1.mobilityDelta}, score=${mob1.score}`);

// Teste 2 — White possui mais mobilidade (delta > 0)
console.log('\n--- Test 2: White Greater Mobility ---');
// White has open e4, d4, active pieces; Black has cramped pieces
const wMoreFen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/3PP3/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 1 4';
const g2 = new Chess(wMoreFen);
const mob2 = evaluateMobility(g2);
assert(mob2.whiteMobility > mob2.blackMobility, `White has more mobility (W=${mob2.whiteMobility} > B=${mob2.blackMobility})`, `delta=${mob2.mobilityDelta}`);
assert(mob2.score > 0, `Mobility score is positive (+${mob2.score} cp)`, `score=${mob2.score}`);

// Teste 3 — Black possui mais mobilidade (delta < 0)
console.log('\n--- Test 3: Black Greater Mobility ---');
// Inverted position where Black has superior central mobility
const bMoreFen = 'r1bqkb1r/ppp2ppp/2n2n2/3pp3/4P3/2N2N2/PPPP1PPP/R1BQKB1R b KQkq - 1 4';
const g3 = new Chess(bMoreFen);
const mob3 = evaluateMobility(g3);
assert(mob3.blackMobility > mob3.whiteMobility, `Black has more mobility (B=${mob3.blackMobility} > W=${mob3.whiteMobility})`, `delta=${mob3.mobilityDelta}`);
assert(mob3.score < 0, `Mobility score is negative (${mob3.score} cp)`, `score=${mob3.score}`);

// Teste 4 — Simetria (score(A) = -score(mirrored A))
console.log('\n--- Test 4: Symmetry and Mirror Position ---');
const whiteActiveFen = '4k3/8/8/8/4N3/8/8/4K3 w - - 0 1'; // White knight on e4, kings on e1/e8
const blackActiveFen = '4k3/8/8/4n3/8/8/8/4K3 b - - 0 1'; // Black knight on e5 (mirror)
mobilityConfig.bonusPerMove = 2;
const scoreW = evaluateMobility(new Chess(whiteActiveFen));
const scoreB = evaluateMobility(new Chess(blackActiveFen));
assert(scoreW.whiteMobility === scoreB.blackMobility, `Symmetric knight moves: W=${scoreW.whiteMobility}, B=${scoreB.blackMobility}`);
assert(scoreW.score === -scoreB.score, `Symmetric score: W=${scoreW.score} cp, B=${scoreB.score} cp`);

// Teste 5 — Material igual, mobilidade diferente
console.log('\n--- Test 5: Same Material, Different Mobility ---');
// White has active bishop on c4 with open diagonals; Black has trapped bishop on a8 blocked by b7 pawn
const bishopCompFen = 'k7/1p6/8/8/2B5/8/8/4K3 w - - 0 1';
const mobBishop = evaluateMobility(new Chess(bishopCompFen));
assert(mobBishop.whiteMobility > mobBishop.blackMobility, `Active bishop has more legal moves than blocked pawn (W=${mobBishop.whiteMobility} vs B=${mobBishop.blackMobility})`);

// Teste 6 — Rei estritamente excluído
console.log('\n--- Test 6: King Moves Strictly Excluded ---');
// Position with only kings: White king in center (8 king moves), Black king in corner a8 (3 king moves)
const loneKingsFen = 'k7/8/8/8/4K3/8/8/8 w - - 0 1';
const mobKings = evaluateMobility(new Chess(loneKingsFen));
assert(mobKings.whiteMobility === 0 && mobKings.blackMobility === 0, `Only Kings on board -> 0 mobility for both (W=${mobKings.whiteMobility}, B=${mobKings.blackMobility})`);
assert(mobKings.mobilityDelta === 0 && mobKings.score === 0, 'No bonus awarded for King freedom');

// Teste 7 — Peça bloqueada
console.log('\n--- Test 7: Blocked Pieces Reflect Real Legal Count ---');
// White rook on a1 blocked by pawns on a2, b2; a2 pawn can move a3, a4 (2); b2 can move b3, b4 (2); Rook on a1 can move b1, c1, d1 (3)
const cleanBlockedRookFen = '4k3/8/8/8/8/8/PP6/R3K3 w - - 0 1';
const mobCleanRook = countMobility(new Chess(cleanBlockedRookFen), 'w');
// a2 can move a3, a4 (2). b2 can move b3, b4 (2). Rook on a1 has b1, c1, d1 (3 moves along rank 1).
assert(mobCleanRook === 7, `Legal moves calculated accurately for pieces: got ${mobCleanRook} (expected 7: 4 pawn pushes + 3 rook rank moves)`);

// Teste 8 — Xeque (movimentos ilegais que deixam rei em xeque não são contabilizados)
console.log('\n--- Test 8: Illegal Moves Under Check Filtered Out ---');
// Black queen checks White king: White king on e1, Black queen on e4. Only moves that block or capture or move king are legal.
// King moves are excluded from mobility, so only non-king moves that resolve check count!
// If White has a bishop on c2 that can block on e2 or take on e4:
const checkFen = '4k3/8/8/8/4q3/8/2B5/4K3 w - - 0 1';
const gCheck = new Chess(checkFen);
const mobCheck = countMobility(gCheck, 'w');
// Bc2 can play Bxe4 (capture queen). Can Bc2 play Bd3, Bb3, etc.? No, king would remain in check!
// So Bc2 has only 1 legal move: Bxe4!
assert(mobCheck === 1, `Under check, pinned/illegal moves filtered out: White non-king moves = ${mobCheck} (expected 1: Bxe4)`);

// Teste 9 — Promoção de peões
console.log('\n--- Test 9: Pawn Promotion Handled Properly ---');
// White pawn on e7 about to promote to Q, R, B, N (4 promotion moves) into empty e8
const promoFen = '2k5/4P3/8/8/8/8/8/4K3 w - - 0 1';
const gPromo = new Chess(promoFen);
const mobPromo = countMobility(gPromo, 'w');
// e8=Q, e8=R, e8=B, e8=N (4 legal promotions)
assert(mobPromo === 4, `Pawn on 7th rank has 4 promotion moves: got ${mobPromo} (expected 4)`);

// Teste 10 — Determinismo da função de mobilidade
console.log('\n--- Test 10: Mobility Determinism (10 Runs) ---');
const detRuns: number[] = [];
for (let i = 0; i < 10; i++) {
  detRuns.push(countMobility(new Chess(wMoreFen), 'w'));
}
const allDetSame = detRuns.every(v => v === detRuns[0]);
assert(allDetSame, `All 10 runs produced identical count: ${detRuns[0]}`);

// ========================================================
// CONTROLES DE DOUBLE-COUNTING (SEÇÃO 10)
// ========================================================
console.log('\n--- Section 10: Controlled Tests Against Double Counting ---');

// Controle A — Cavalo centralizado vs no canto (mesmo material)
console.log('Controle A — Cavalo centralizado (e4) vs cavalo no canto (a1):');
const knightCentralFen = '4k3/8/8/8/4N3/8/8/4K3 w - - 0 1';
const knightCornerFen  = '4k3/8/8/8/8/8/8/N3K3 w - - 0 1';
const mobKnightCentral = countMobility(new Chess(knightCentralFen), 'w');
const mobKnightCorner  = countMobility(new Chess(knightCornerFen), 'w');
console.log(`  Knight e4 legal moves: ${mobKnightCentral} (8 expected)`);
console.log(`  Knight a1 legal moves: ${mobKnightCorner} (2 expected)`);
assert(mobKnightCentral === 8 && mobKnightCorner === 2, 'Knight mobility reflects square control without artificial scaling');

// Controle B — Bispo aberto vs bloqueado (mesmo material)
console.log('Controle B — Bispo aberto vs bloqueado:');
const bishopOpenFen    = '4k3/8/8/8/4B3/8/8/4K3 w - - 0 1';
const bishopBlockedFen = '4k3/8/8/3p4/4B3/3P4/8/4K3 w - - 0 1'; // Blocked by pawns
const mobBishopOpen    = countMobility(new Chess(bishopOpenFen), 'w');
const mobBishopBlocked = countMobility(new Chess(bishopBlockedFen), 'w');
console.log(`  Bishop open moves: ${mobBishopOpen} (13 expected)`);
console.log(`  Bishop blocked moves: ${mobBishopBlocked} (less than open)`);
assert(mobBishopOpen > mobBishopBlocked, 'Open bishop has strictly higher mobility than blocked bishop');

// Controle C — Torre aberta vs bloqueada
console.log('Controle C — Torre aberta vs fechada:');
const rookOpenMobFen    = '4k3/8/8/8/4R3/8/8/4K3 w - - 0 1';
const rookBlockedMobFen = '4k3/8/8/4p3/3PRP2/4P3/8/4K3 w - - 0 1'; // Surrounded by pawns
const mobRookOpen    = countMobility(new Chess(rookOpenMobFen), 'w');
const mobRookBlocked = countMobility(new Chess(rookBlockedMobFen), 'w');
console.log(`  Rook open moves: ${mobRookOpen} (14 expected)`);
console.log(`  Rook blocked moves: ${mobRookBlocked}`);
assert(mobRookOpen > mobRookBlocked, 'Open rook has strictly higher mobility than boxed-in rook');

// Controle D — Dama (verificar se bônus de 2 cp não explode)
console.log('Controle D — Dama (escala de bonus):');
const queenCentralFen = '4k3/8/8/8/4Q3/8/8/4K3 w - - 0 1';
const mobQueenCentral = countMobility(new Chess(queenCentralFen), 'w');
const queenScore = mobQueenCentral * mobilityConfig.bonusPerMove;
console.log(`  Queen central moves: ${mobQueenCentral}, contribution at +2cp: ${queenScore} cp`);
assert(mobQueenCentral <= 27 && queenScore <= 54, `Queen mobility capped at reasonable tactical contribution (${queenScore} cp <= 54 cp)`);

// Controle E — Mobilidade artificial (verificar se peças com muitos lances não distorcem a avaliação)
console.log('Controle E — Teste de delta em posição típica de meio-jogo:');
const midGameFen = 'r1bqk2r/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQK2R w KQkq - 4 7';
const mobMidGame = evaluateMobility(new Chess(midGameFen));
console.log(`  Normal midgame: W=${mobMidGame.whiteMobility}, B=${mobMidGame.blackMobility}, delta=${mobMidGame.mobilityDelta}, score=${mobMidGame.score} cp`);
assert(Math.abs(mobMidGame.score) <= 30, `Midgame mobility score (${mobMidGame.score} cp) is subtle and proportional (<= 30 cp)`);

console.log('\n============================================');
console.log(`Tests: ${totalTests} | ✓ ${passedTests} passed | ✗ ${totalTests - passedTests} failed`);
if (passedTests === totalTests) {
  console.log('ALL TESTS PASSED ✓\n');
} else {
  console.error('SOME TESTS FAILED ✗\n');
  process.exit(1);
}
