import { Chess } from 'chess.js';
import {
  countKingAttackers,
  evaluateKingAttackers,
  evaluateBoard,
  kingAttackersConfig,
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
console.log(' FASE 5.4H — KING ATTACKERS UNIT TESTS & AUDIT               ');
console.log('=============================================================\n');

// --- 1. ZERO ATTACKERS (CATEGORIA A) ---
console.log('--- 1. Categoria A: Zero Attackers ---');

// A1: Posição apenas com reis
const fenOnlyKings = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
assert(countKingAttackers(new Chess(fenOnlyKings), 'w') === 0, 'A1: Apenas reis -> 0 atacantes sobre White King');
assert(countKingAttackers(new Chess(fenOnlyKings), 'b') === 0, 'A1: Apenas reis -> 0 atacantes sobre Black King');

// A2: Peça distante que não atinge a zona do rei (Dama preta em a5, Rei branco em h1)
const fenDistant = 'k7/8/8/q7/8/8/8/7K w - - 0 1';
assert(countKingAttackers(new Chess(fenDistant), 'w') === 0, 'A2: Dama em a5 sem linha para zona de h1 -> 0 atacantes');

// A3: Bispo distante sem diagonal para a zona do rei
const fenDistantBishop = '7k/8/8/8/8/8/8/b6K w - - 0 1'; // Bishop em a1, King em h1 (mesma fileira, diagonal não alcança)
assert(countKingAttackers(new Chess(fenDistantBishop), 'w') === 0, 'A3: Bispo em a1 não tem diagonal para zona de h1 -> 0 atacantes');


// --- 2. KNIGHT ATTACKERS (CATEGORIA B) ---
console.log('\n--- 2. Categoria B: Knight Attackers ---');

// B1: 1 cavalo preto atacando 1 casa da zona de e1 (Cavalo em f3 ataca d2)
const fenKnight1 = '4k3/8/8/8/8/5n2/8/4K3 w - - 0 1';
assert(countKingAttackers(new Chess(fenKnight1), 'w') === 1, 'B1: Cavalo preto em f3 atacando zona de e1 -> 1 atacante');

// B2: Bloqueio irrelevante para cavalo (peças intermediárias não impedem salto)
const fenKnightLeap = '4k3/8/8/8/8/5n2/4PP2/4K3 w - - 0 1'; // Peões em e2, f2
assert(countKingAttackers(new Chess(fenKnightLeap), 'w') === 1, 'B2: Cavalo salta sobre peões em e2, f2 -> 1 atacante');

// B3: Cavalo atacando múltiplas casas da zona (Cavalo em e6 contra Rei em e4 ataca d4 e f4)
const fenKnightMulti = '4k3/8/4n3/8/4K3/8/8/8 w - - 0 1';
assert(countKingAttackers(new Chess(fenKnightMulti), 'w') === 1, 'B3: Cavalo atacando múltiplas casas da zona -> conta como 1 único atacante');

// B4: Dois cavalos atacantes (Cavalos em f3 e c3 atacando zona de e1)
const fenTwoKnights = '4k3/8/8/8/8/2n2n2/8/4K3 w - - 0 1';
assert(countKingAttackers(new Chess(fenTwoKnights), 'w') === 2, 'B4: Dois cavalos atacando a zona de e1 -> 2 atacantes');


// --- 3. BISHOP ATTACKERS & BLOQUEIO (CATEGORIA C & SEÇÃO 15) ---
console.log('\n--- 3. Categoria C: Bishop Attackers & Bloqueio ---');

// C1: Bispo livre atacando diagonal da zona de e1 (Bispo em a5 ataca d2)
const fenBishopOpen = '4k3/8/8/b7/8/8/8/4K3 w - - 0 1';
assert(countKingAttackers(new Chess(fenBishopOpen), 'w') === 1, 'C1: Bispo em a5 com diagonal livre para d2 -> 1 atacante');

// C2: Bloqueio de Bispo por peça branca em c3 (Peão branco em c3 bloqueia diagonal a5-d2)
const fenBishopBlockedWhite = '4k3/8/8/b7/8/2P5/8/4K3 w - - 0 1';
assert(countKingAttackers(new Chess(fenBishopBlockedWhite), 'w') === 0, 'C2: Bloqueio por peão branco em c3 -> 0 atacantes');

// C3: Bloqueio de Bispo por peça preta em b4 (Peão preto em b4 bloqueia a5 sem atacar a zona)
const fenBishopBlockedBlack = '4k3/8/8/b7/1p6/8/8/4K3 w - - 0 1';
assert(countKingAttackers(new Chess(fenBishopBlockedBlack), 'w') === 0, 'C3: Bloqueio por peão preto em b4 -> 0 atacantes');

// C4: Dois bispos atacantes em diagonais distintas
const fenTwoBishops = '4k3/8/8/b5b1/8/8/8/4K3 w - - 0 1'; // Bispos em a5 e g5
assert(countKingAttackers(new Chess(fenTwoBishops), 'w') === 2, 'C4: Dois bispos atacando a zona -> 2 atacantes');

// C5: Bispo com peça na própria zona do rei (Peão branco em d2: bispo em a5 ataca d2!)
const fenBishopHitsZonePiece = '4k3/8/8/b7/8/8/3P4/4K3 w - - 0 1';
assert(countKingAttackers(new Chess(fenBishopHitsZonePiece), 'w') === 1, 'C5: Peça sentada dentro da zona (d2) não bloqueia a chegada à zona -> 1 atacante');


// --- 4. ROOK ATTACKERS & BLOQUEIO (CATEGORIA D & SEÇÃO 15) ---
console.log('\n--- 4. Categoria D: Rook Attackers & Bloqueio ---');

// D1: Torre em coluna aberta atacando zona de e1 (Torre em e8 ataca e2)
const fenRookFile = '4r2k/8/8/8/8/8/8/4K3 w - - 0 1';
assert(countKingAttackers(new Chess(fenRookFile), 'w') === 1, 'D1: Torre em coluna aberta e8 alcança e2 -> 1 atacante');

// D2: Torre em fileira aberta atacando zona de e1 (Torre em a1 ataca d1)
const fenRookRank = 'r6k/8/8/8/8/8/8/4K3 w - - 0 1'; // a8 King, e1 King, wait: a1 rook:
const fenRookRankA1 = '4k3/8/8/8/8/8/8/r3K3 w - - 0 1';
assert(countKingAttackers(new Chess(fenRookRankA1), 'w') === 1, 'D2: Torre em fileira aberta a1 alcança d1 -> 1 atacante');

// D3: Bloqueio de Torre por peão em e4
const fenRookBlocked = '4r2k/8/8/8/4P3/8/8/4K3 w - - 0 1';
assert(countKingAttackers(new Chess(fenRookBlocked), 'w') === 0, 'D3: Torre em e8 bloqueada por peão em e4 -> 0 atacantes');

// D4: Duas torres atacantes (uma por coluna, outra por fileira)
const fenTwoRooks = '4r3/8/8/8/8/8/8/r3K2k w - - 0 1';
assert(countKingAttackers(new Chess(fenTwoRooks), 'w') === 2, 'D4: Duas torres (uma em e8, outra em a1) -> 2 atacantes');


// --- 5. QUEEN ATTACKERS & BLOQUEIO (CATEGORIA E & SEÇÃO 15) ---
console.log('\n--- 5. Categoria E: Queen Attackers & Bloqueio ---');

// E1: Dama atacando por diagonal
const fenQueenDiag = '4k3/8/8/q7/8/8/8/4K3 w - - 0 1';
assert(countKingAttackers(new Chess(fenQueenDiag), 'w') === 1, 'E1: Dama atacando por diagonal a5-d2 -> 1 atacante');

// E2: Dama atacando por coluna
const fenQueenFile = '4q2k/8/8/8/8/8/8/4K3 w - - 0 1';
assert(countKingAttackers(new Chess(fenQueenFile), 'w') === 1, 'E2: Dama atacando por coluna e8-e2 -> 1 atacante');

// E3: Dama bloqueada por peão em e4
const fenQueenBlocked = '4q2k/8/8/8/4P3/8/8/4K3 w - - 0 1';
assert(countKingAttackers(new Chess(fenQueenBlocked), 'w') === 0, 'E3: Dama bloqueada por peão fora da zona -> 0 atacantes');

// E4: Dama atacando múltiplas casas da zona (Dama em e5 contra Rei em e4)
const fenQueenMulti = '4k3/8/8/4q3/4K3/8/8/8 w - - 0 1';
assert(countKingAttackers(new Chess(fenQueenMulti), 'w') === 1, 'E4: Dama atacando múltiplas casas da zona -> conta como exatamente 1');


// --- 6. PAWN ATTACKERS (CATEGORIA F) ---
console.log('\n--- 6. Categoria F: Pawn Attackers ---');

// F1: Peão preto atacando zona de White King (Peão em e3 ataca d2 e f2 de e1)
const fenPawnBlack = '4k3/8/8/8/8/4p3/8/4K3 w - - 0 1';
assert(countKingAttackers(new Chess(fenPawnBlack), 'w') === 1, 'F1: Peão preto em e3 ataca d2 e f2 -> 1 atacante');

// F2: Peão branco atacando zona de Black King (Peão em e6 ataca d7 e f7 de e8)
const fenPawnWhite = '4k3/8/4P3/8/8/8/8/4K3 w - - 0 1';
assert(countKingAttackers(new Chess(fenPawnWhite), 'b') === 1, 'F2: Peão branco em e6 ataca d7 e f7 -> 1 atacante');

// F3: Múltiplos peões pretos atacando a zona
const fenTwoPawns = '4k3/8/8/8/8/2p1p3/8/4K3 w - - 0 1'; // Peões em c3 e e3
assert(countKingAttackers(new Chess(fenTwoPawns), 'w') === 2, 'F3: Dois peões pretos atacando a zona de e1 -> 2 atacantes');

// F4: Peão fora da zona (Peão em a5 para rei em e1)
const fenPawnOutside = '4k3/8/8/p7/8/8/8/4K3 w - - 0 1';
assert(countKingAttackers(new Chess(fenPawnOutside), 'w') === 0, 'F4: Peão em a5 não ataca zona de e1 -> 0 atacantes');


// --- 7. ENEMY KING NUNCA CONTA (CATEGORIA G & SEÇÃO 10) ---
console.log('\n--- 7. Categoria G: Rei Inimigo Não Conta ---');

// G1: Reis adjacentes (ex: Black King em e2, White King em e1)
const fenAdjacentKings = '8/8/8/8/8/8/4k3/4K3 w - - 0 1';
assert(countKingAttackers(new Chess(fenAdjacentKings), 'w') === 0, 'G1: Rei preto em e2 NÃO conta como atacante do White King');
assert(countKingAttackers(new Chess(fenAdjacentKings), 'b') === 0, 'G1: Rei branco em e1 NÃO conta como atacante do Black King');


// --- 8. TESTE DE NÃO-DUPLICAÇÃO ESTRITA (SEÇÃO 18) ---
console.log('\n--- 8. Categoria H: Teste de Não-Duplicação Estrita ---');

// 1 peça atacando 1 casa = 1 (Bispo a5 ataca d2)
assert(countKingAttackers(new Chess('4k3/8/8/b7/8/8/8/4K3 w - - 0 1'), 'w') === 1, 'Não-duplicação: 1 peça atacando 1 casa = 1');

// 1 peça atacando 2 casas = 1 (Cavalo e6 contra e4 ataca d4 e f4)
assert(countKingAttackers(new Chess('4k3/8/4n3/8/4K3/8/8/8 w - - 0 1'), 'w') === 1, 'Não-duplicação: 1 peça atacando 2 casas = 1');

// 1 peça atacando 3 casas = 1 (Dama em e7 contra Rei em e4 ataca d4, f4, e5)
assert(countKingAttackers(new Chess('4k3/4q3/8/8/4K3/8/8/8 w - - 0 1'), 'w') === 1, 'Não-duplicação: 1 peça atacando 3 casas = 1');

// 1 peça atacando 4 casas = 1 (Dama em e5 contra Rei em e4)
assert(countKingAttackers(new Chess('4k3/8/8/4q3/4K3/8/8/8 w - - 0 1'), 'w') === 1, 'Não-duplicação: 1 peça atacando 4 casas = 1');


// --- 9. TESTE DE SIMETRIA (SEÇÃO 16) ---
console.log('\n--- 9. Teste de Simetria e Posições Espelhadas ---');

// Posição A: White King em e1 sem atacantes, Black King em e8 sob ataque de Torre em e1 e Bispo em a4
const symA = '4k3/8/8/B7/8/8/8/4R2K w - - 0 1';
// Posição B: Black King em e8 sem atacantes, White King em e1 sob ataque de Torre em e8 e Bispo em a5
const symB = '4r2k/8/8/8/b7/8/8/4K3 w - - 0 1';

const evalSymA = evaluateKingAttackers(new Chess(symA));
const evalSymB = evaluateKingAttackers(new Chess(symB));

assert(evalSymA.attacksOnBlackKing === 2 && evalSymA.attacksOnWhiteKing === 0, 'Simetria A: 2 atacantes sobre Black King, 0 sobre White');
assert(evalSymB.attacksOnBlackKing === 0 && evalSymB.attacksOnWhiteKing === 2, 'Simetria B: 0 atacantes sobre Black King, 2 sobre White');
assert(evalSymA.score === 12, 'Simetria Score A: +12 cp para White');
assert(evalSymB.score === -12, 'Simetria Score B: -12 cp para White');
assert(evalSymA.score === -evalSymB.score, 'Simetria estrita: score(A) == -score(mirrored A)');


// --- 10. TESTE DE MONOTONICIDADE (SEÇÃO 17) ---
console.log('\n--- 10. Teste de Monotonicidade (0, 1, 2, 3 atacantes) ---');

// Black King em e8 atacado por 0, 1, 2, 3 peças brancas
const mono0Fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
const mono1Fen = '4k3/8/8/B7/8/8/8/4K3 w - - 0 1'; // + Bispo a5
const mono2Fen = '4k3/8/8/B7/8/8/8/4R2K w - - 0 1'; // + Bispo a5 + Torre e1
const mono3Fen = '4k3/8/8/B4N2/8/8/8/4R2K w - - 0 1'; // + Bispo a5 + Torre e1 + Cavalo f5 (ataca d6, e7)

const mono0Score = evaluateKingAttackers(new Chess(mono0Fen)).score;
const mono1Score = evaluateKingAttackers(new Chess(mono1Fen)).score;
const mono2Score = evaluateKingAttackers(new Chess(mono2Fen)).score;
const mono3Score = evaluateKingAttackers(new Chess(mono3Fen)).score;

console.log(`  0 atacantes: ${mono0Score} cp`);
console.log(`  1 atacante:  ${mono1Score} cp`);
console.log(`  2 atacantes: ${mono2Score} cp`);
console.log(`  3 atacantes: ${mono3Score} cp`);

assert(mono0Score === 0, 'Monotonicidade 0 atacantes: 0 cp');
assert(mono1Score === 6, 'Monotonicidade 1 atacante: +6 cp');
assert(mono2Score === 12, 'Monotonicidade 2 atacantes: +12 cp');
assert(mono3Score === 18, 'Monotonicidade 3 atacantes: +18 cp');
assert(mono0Score < mono1Score && mono1Score < mono2Score && mono2Score < mono3Score, 'Monotonicidade estrita: 0 < 6 < 12 < 18');


// --- 11. INTERAÇÃO COM ROOK ACTIVITY (SEÇÃO 20) ---
console.log('\n--- 11. Interação com Rook Activity (Independência de Função) ---');

// Posição A: Torre em coluna aberta 'a', longe do rei preto em g8
const rookFarFen = '6k1/8/8/8/8/8/8/R6K w - - 0 1';
// Posição B: Torre em coluna aberta 'g', atacando diretamente a zona do rei em g8
const rookAttackFen = '6k1/8/8/8/8/8/8/6RK w - - 0 1';
// Posição C: Torre bloqueada em g1 por peão em g4
const rookBlockedFen = '6k1/8/8/8/6P1/8/8/6RK w - - 0 1';

const attFar = countKingAttackers(new Chess(rookFarFen), 'b');
const attNear = countKingAttackers(new Chess(rookAttackFen), 'b');
const attBlocked = countKingAttackers(new Chess(rookBlockedFen), 'b');

assert(attFar === 0, 'Rook Activity: Torre em coluna a longe do rei em g8 -> 0 atacantes');
assert(attNear === 1, 'Rook Activity: Torre em coluna g atacando zona de g8 -> 1 atacante');
assert(attBlocked === 0, 'Rook Activity: Torre bloqueada por peão em g4 -> 0 atacantes');


// --- 12. INTERAÇÃO COM PAWN SHIELD (SEÇÃO 21) ---
console.log('\n--- 12. Interação com Pawn Shield (Aditividade Estrita) ---');

// White King em g1 com Shield Completo (f2, g2, h2) + 0 atacantes
const shieldFull0 = '4k3/8/8/8/8/8/5PPP/6K1 w - - 0 1';
// White King em g1 com Shield Completo (f2, g2, h2) + 1 atacante (Torre em g8)
const shieldFull1 = '4k1r1/8/8/8/8/8/5PPP/6K1 w - - 0 1';

kingAttackersConfig.attackerPenalty = 0;
const evalF0_noAtt = evaluateBoard(new Chess(shieldFull0));
const evalF1_noAtt = evaluateBoard(new Chess(shieldFull1));

kingAttackersConfig.attackerPenalty = 6;
const evalF0_withAtt = evaluateBoard(new Chess(shieldFull0));
const evalF1_withAtt = evaluateBoard(new Chess(shieldFull1));

const deltaF0 = evalF0_withAtt - evalF0_noAtt;
const deltaF1 = evalF1_withAtt - evalF1_noAtt;

console.log(`  Shield Completo + 0 atacantes: Delta King Attackers = ${deltaF0} cp`);
console.log(`  Shield Completo + 1 atacante:  Delta King Attackers = ${deltaF1} cp`);
assert(deltaF0 === 0, '0 atacantes produz 0 cp adicional');
assert(deltaF1 === -6, '1 atacante sobre White King produz exatamente -6 cp para White');


// --- 13. DETERMINISMO (SEÇÃO 28) ---
console.log('\n--- 13. Teste de Determinismo (10 Runs) ---');

let detPass = true;
const detFen = 'r1bqk2r/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5';
const refAttScore = evaluateKingAttackers(new Chess(detFen)).score;
for (let r = 0; r < 10; r++) {
  const s = evaluateKingAttackers(new Chess(detFen)).score;
  if (s !== refAttScore) detPass = false;
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
