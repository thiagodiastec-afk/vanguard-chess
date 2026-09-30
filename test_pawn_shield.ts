import { Chess } from 'chess.js';
import {
  countPawnShield,
  evaluatePawnShield,
  evaluateBoard,
  kingSafetyConfig,
  mobilityConfig
} from './src/lib/engine';

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

console.log('=============================================================');
console.log(' FASE 5.4G — PAWN SHIELD UNIT TESTS & CONTROLLED AUDIT       ');
console.log('=============================================================\n');

// --- 1. CASOS ESPECIAIS (SEÇÃO 8) ---
console.log('--- 1. Casos Especiais de Geometria e Limites ---');

// Caso 1 — Rei no centro (e1 -> d2, e2, f2)
const centerFen = '4k3/8/8/8/8/8/3PPP2/4K3 w - - 0 1';
const gCenter = new Chess(centerFen);
const shieldCenter = countPawnShield(gCenter, 'w');
assert(shieldCenter === 3, 'Caso 1: Rei no centro (e1 com d2, e2, f2) -> 3 peões', `got ${shieldCenter}`);

// Caso 2 — Rei na ala do rei (g1 -> f2, g2, h2)
const wingFen = '4k3/8/8/8/8/8/5PPP/6K1 w - - 0 1';
const gWing = new Chess(wingFen);
const shieldWing = countPawnShield(gWing, 'w');
assert(shieldWing === 3, 'Caso 2: Rei na ala do rei (g1 com f2, g2, h2) -> 3 peões', `got ${shieldWing}`);

// Caso 3 — Rei no canto h1 (h1 -> g2, h2 válidas)
const cornerHFen = '4k3/8/8/8/8/8/6PP/7K w - - 0 1';
const gCornerH = new Chess(cornerHFen);
const shieldCornerH = countPawnShield(gCornerH, 'w');
assert(shieldCornerH === 2, 'Caso 3: Rei em h1 (g2, h2 presentes) -> 2 peões', `got ${shieldCornerH}`);

// Caso 4 — Rei no canto a1 (a1 -> a2, b2 válidas)
const cornerAFen = '4k3/8/8/8/8/8/PP6/K7 w - - 0 1';
const gCornerA = new Chess(cornerAFen);
const shieldCornerA = countPawnShield(gCornerA, 'w');
assert(shieldCornerA === 2, 'Caso 4: Rei em a1 (a2, b2 presentes) -> 2 peões', `got ${shieldCornerA}`);

// Caso 5 — Rei Preto (e8 -> d7, e7, f7)
const blackCenterFen = '4k3/3ppp2/8/8/8/8/8/4K3 b - - 0 1';
const gBlackCenter = new Chess(blackCenterFen);
const shieldBlackCenter = countPawnShield(gBlackCenter, 'b');
assert(shieldBlackCenter === 3, 'Caso 5: Rei Preto no centro (e8 com d7, e7, f7) -> 3 peões', `got ${shieldBlackCenter}`);

// Caso 6 — Shield completo (3 peões)
assert(shieldCenter === 3, 'Caso 6: Shield completo -> 3 peões');

// Caso 7 — Shield parcial (1 e 2 peões)
const partial1Fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1'; // Only e2
const partial2Fen = '4k3/8/8/8/8/8/3P1P2/4K3 w - - 0 1'; // d2, f2
assert(countPawnShield(new Chess(partial1Fen), 'w') === 1, 'Caso 7a: Shield parcial (1 peão e2) -> 1 peão');
assert(countPawnShield(new Chess(partial2Fen), 'w') === 2, 'Caso 7b: Shield parcial (2 peões d2, f2) -> 2 peões');

// Caso 8 — Shield inexistente (0 peões)
const emptyShieldFen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
assert(countPawnShield(new Chess(emptyShieldFen), 'w') === 0, 'Caso 8: Shield inexistente -> 0 peões');

// Caso 9 — Peça bloqueando que não seja peão (ex: Cavalo em e2)
const pieceBlockingFen = '4k3/8/8/8/8/8/3PNP2/4K3 w - - 0 1';
const shieldWithKnight = countPawnShield(new Chess(pieceBlockingFen), 'w');
assert(shieldWithKnight === 2, 'Caso 9: Peça que não seja peão em e2 não conta -> 2 peões (d2, f2)', `got ${shieldWithKnight}`);

// Caso 10 — Peão inimigo na casa do shield (ex: peão preto em e2)
const enemyPawnFen = '4k3/8/8/8/8/8/3PpP2/4K3 w - - 0 1';
const shieldWithEnemy = countPawnShield(new Chess(enemyPawnFen), 'w');
assert(shieldWithEnemy === 2, 'Caso 10: Peão inimigo em e2 não conta como shield próprio -> 2 peões', `got ${shieldWithEnemy}`);


// --- 2. TESTE DE SIMETRIA (SEÇÃO 9) ---
console.log('\n--- 2. Testes de Simetria e Posições Espelhadas ---');

// Posição A: White g1 com f2, g2, h2 (3 peões). Black e8 sem shield (0 peões).
const symWhiteFull = '4k3/8/8/8/8/8/5PPP/6K1 w - - 0 1';
// Posição B (Espelhada): Black g8 com f7, g7, h7 (3 peões). White e1 sem shield (0 peões).
const symBlackFull = '6k1/5ppp/8/8/8/8/8/4K3 w - - 0 1';

const evalWFull = evaluatePawnShield(new Chess(symWhiteFull));
const evalBFull = evaluatePawnShield(new Chess(symBlackFull));
assert(evalWFull.whiteShield === 3 && evalWFull.blackShield === 0, 'Simetria: White shield completo = 3, Black = 0');
assert(evalBFull.whiteShield === 0 && evalBFull.blackShield === 3, 'Simetria: White shield = 0, Black shield completo = 3');
assert(evalWFull.score === 24, 'Simetria: Score White = +24 cp');
assert(evalBFull.score === -24, 'Simetria: Score Black = -24 cp');
assert(evalWFull.score === -evalBFull.score, 'Simetria: score(A) == -score(mirrored A)');

// Simetria parcial (1 peão)
const symWhite1 = '4k3/8/8/8/8/8/6P1/6K1 w - - 0 1';
const symBlack1 = '6k1/6p1/8/8/8/8/8/4K3 w - - 0 1';
const evalW1 = evaluatePawnShield(new Chess(symWhite1));
const evalB1 = evaluatePawnShield(new Chess(symBlack1));
assert(evalW1.score === 8 && evalB1.score === -8, 'Simetria parcial: +8 cp vs -8 cp');


// --- 3. TESTE DE MONOTONICIDADE (SEÇÃO 10) ---
console.log('\n--- 3. Teste de Monotonicidade (0 < 1 < 2 < 3) ---');
const mono0 = evaluatePawnShield(new Chess('4k3/8/8/8/8/8/8/6K1 w - - 0 1')).score;
const mono1 = evaluatePawnShield(new Chess('4k3/8/8/8/8/8/7P/6K1 w - - 0 1')).score;
const mono2 = evaluatePawnShield(new Chess('4k3/8/8/8/8/8/6PP/6K1 w - - 0 1')).score;
const mono3 = evaluatePawnShield(new Chess('4k3/8/8/8/8/8/5PPP/6K1 w - - 0 1')).score;

assert(mono0 === 0, 'Monotonicidade White 0 peões: 0 cp');
assert(mono1 === 8, 'Monotonicidade White 1 peão: +8 cp');
assert(mono2 === 16, 'Monotonicidade White 2 peões: +16 cp');
assert(mono3 === 24, 'Monotonicidade White 3 peões: +24 cp');
assert(mono0 < mono1 && mono1 < mono2 && mono2 < mono3, 'Monotonicidade estrita: 0 < 8 < 16 < 24');

// Monotonicidade Black
const monoB0 = evaluatePawnShield(new Chess('6k1/8/8/8/8/8/8/4K3 w - - 0 1')).score;
const monoB1 = evaluatePawnShield(new Chess('6k1/7p/8/8/8/8/8/4K3 w - - 0 1')).score;
const monoB2 = evaluatePawnShield(new Chess('6k1/6pp/8/8/8/8/8/4K3 w - - 0 1')).score;
const monoB3 = evaluatePawnChessScore('6k1/5ppp/8/8/8/8/8/4K3 w - - 0 1');
function evaluatePawnChessScore(fen: string) { return evaluatePawnShield(new Chess(fen)).score; }

assert(monoB0 === 0, 'Monotonicidade Black 0 peões: 0 cp');
assert(monoB1 === -8, 'Monotonicidade Black 1 peão: -8 cp');
assert(monoB2 === -16, 'Monotonicidade Black 2 peões: -16 cp');
assert(monoB3 === -24, 'Monotonicidade Black 3 peões: -24 cp');
assert(monoB0 > monoB1 && monoB1 > monoB2 && monoB2 > monoB3, 'Monotonicidade estrita Black: 0 > -8 > -16 > -24');


// --- 4. TESTES DE NÃO-DUPLICAÇÃO E GEOMETRIA ESTRITA (SEÇÃO 11) ---
console.log('\n--- 4. Testes de Não-Duplicação e Filtros Geométricos ---');

// Peão na 3ª fileira (e3) não conta para rei em e1
const pawnRank3Fen = '4k3/8/8/8/8/4P3/8/4K3 w - - 0 1';
assert(countPawnShield(new Chess(pawnRank3Fen), 'w') === 0, 'Peão na 3ª fileira (e3) não é shield imediato de e1 -> 0');

// Peão na mesma fileira do rei (d4 ou f4 para rei em e4) não conta
const pawnSameRankFen = '4k3/8/8/8/3PKP2/8/8/8 w - - 0 1';
assert(countPawnShield(new Chess(pawnSameRankFen), 'w') === 0, 'Peões na mesma fileira (d4, f4 para rei em e4) não contam -> 0');

// Peão atrás do rei (rei em e3, peões em d2, e2, f2) não contam como shield frontal
const pawnBehindFen = '4k3/8/8/8/8/4K3/3PPP2/8 w - - 0 1';
assert(countPawnShield(new Chess(pawnBehindFen), 'w') === 0, 'Peões atrás do rei em e3 (d2, e2, f2) não contam -> 0');

// Peão na ala oposta (a2 para rei em g1) não conta
const pawnDistantFen = '4k3/8/8/8/8/8/P7/6K1 w - - 0 1';
assert(countPawnShield(new Chess(pawnDistantFen), 'w') === 0, 'Peão distante em a2 para rei em g1 não conta -> 0');


// --- 5. TESTE DE INTERAÇÃO COM ROOK ACTIVITY (SEÇÃO 12) ---
console.log('\n--- 5. Interação com Rook Activity (Aditividade) ---');
// A: Shield completo + Coluna Fechada (e4, e5 presentes)
const posA = '4k3/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/4R1K1 w - - 0 1';
// B: Shield completo + Coluna Aberta (e4, e5 ausentes)
const posB = '4k3/pppp1ppp/8/8/8/8/PPPP1PPP/4R1K1 w - - 0 1';
// C: Shield vazio em g1 + Coluna Aberta
const posC = '4k3/pppp1ppp/8/8/8/8/PPPP4/4R1K1 w - - 0 1'; // f2, g2, h2 removidos

kingSafetyConfig.pawnShieldBonus = 0;
const evalA_noShield = evaluateBoard(new Chess(posA));
const evalB_noShield = evaluateBoard(new Chess(posB));
const evalC_noShield = evaluateBoard(new Chess(posC));

kingSafetyConfig.pawnShieldBonus = 8;
const evalA_withShield = evaluateBoard(new Chess(posA));
const evalB_withShield = evaluateBoard(new Chess(posB));
const evalC_withShield = evaluateBoard(new Chess(posC));

const deltaShieldA = evalA_withShield - evalA_noShield;
const deltaShieldB = evalB_withShield - evalB_noShield;
const deltaShieldC = evalC_withShield - evalC_noShield;

console.log(`  Pos A (Shield Completo, Coluna Fechada): Shield Delta = ${deltaShieldA} cp`);
console.log(`  Pos B (Shield Completo, Coluna Aberta):  Shield Delta = ${deltaShieldB} cp`);
console.log(`  Pos C (Shield Vazio em g1, Coluna Aberta): Shield Delta = ${deltaShieldC} cp`);
assert(deltaShieldA === deltaShieldB, 'Pawn Shield adiciona valor constante independente de coluna aberta/fechada');
assert(deltaShieldB > deltaShieldC, 'Posição com shield completo tem score maior que posição com shield vazio');


// --- 6. TESTE DE ABERTURAS E POSIÇÃO INICIAL (SEÇÃO 15) ---
console.log('\n--- 6. Testes em Posições de Abertura ---');
// Posição inicial: White Rei em e1 (d2, e2, f2 = 3), Black Rei em e8 (d7, e7, f7 = 3)
const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const startShield = evaluatePawnShield(new Chess(startFen));
assert(startShield.whiteShield === 3 && startShield.blackShield === 3, 'Posição inicial: White=3, Black=3');
assert(startShield.shieldDelta === 0 && startShield.score === 0, 'Posição inicial: Delta=0, Score=0 cp');

// 1. e4: peão de e2 sai para e4 -> White fica com d2, f2 (2 peões). Black tem d7, e7, f7 (3 peões).
const e4Fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
const e4Shield = evaluatePawnShield(new Chess(e4Fen));
assert(e4Shield.whiteShield === 2 && e4Shield.blackShield === 3, 'Após 1. e4: White shield=2 (e2 avançou), Black=3');
assert(e4Shield.score === -8, 'Após 1. e4: Delta=-1 (-8 cp para White)', `got ${e4Shield.score}`);

// Roque Curto Branco (g1 com f2, g2, h2 = 3 peões)
const castledFen = 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 6';
const castledShield = evaluatePawnShield(new Chess(castledFen));
assert(castledShield.whiteShield === 3, 'Rei no Roque curto (g1 com f2, g2, h2) -> 3 peões');
assert(castledShield.blackShield === 3, 'Rei preto no Roque curto (g8 com f7, g7, h7) -> 3 peões');


// --- 7. DETERMINISMO (SEÇÃO 21) ---
console.log('\n--- 7. Teste de Determinismo (10 Runs) ---');
let detPass = true;
const detFen = 'r1bqk2r/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5';
const refScore = evaluatePawnShield(new Chess(detFen)).score;
for (let i = 0; i < 10; i++) {
  const curScore = evaluatePawnShield(new Chess(detFen)).score;
  if (curScore !== refScore) detPass = false;
}
assert(detPass, 'Determinismo estrito: 10/10 execuções idênticas');

console.log('\n============================================');
console.log(`Tests: ${totalTests} | ✓ ${passedTests} passed | ✗ ${totalTests - passedTests} failed`);
if (passedTests === totalTests) {
  console.log('ALL TESTS PASSED ✓\n');
} else {
  console.error('SOME TESTS FAILED ✗\n');
  process.exit(1);
}
