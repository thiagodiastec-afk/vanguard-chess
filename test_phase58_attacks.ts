/**
 * FASE 5.8 — TESTES DE ATAQUES, RAIOS, XEQUES E CRAVADAS BITBOARD
 */

import {
  parseFen,
  popcount,
  lsb,
  KNIGHT_ATTACKS,
  KING_ATTACKS,
  WHITE_PAWN_ATTACKS,
  BLACK_PAWN_ATTACKS,
  rookAttacks,
  bishopAttacks,
  queenAttacks,
  isSquareAttacked,
  isInCheck,
  getCheckInfo,
  findPins,
  squareNameToIndex,
  squareToBit,
  RAY_MASKS,
  DIR_NORTH,
  DIR_SOUTH,
  DIR_EAST,
  DIR_WEST,
  BETWEEN_MASKS,
  LINE_MASKS,
  SQ_E4,
  SQ_A1,
  SQ_H8,
  BB_EMPTY
} from './src/lib/bitboard';

console.log('=====================================================');
console.log('FASE 5.8 — TESTE DE ATAQUES, XEQUES E CRAVADAS');
console.log('=====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${msg}`);
  } else {
    failed++;
    console.error(`[FAIL] ${msg}`);
  }
}

// 1. Knight Attacks
console.log('--- 1. KNIGHT ATTACKS ---');
assert(popcount(KNIGHT_ATTACKS[SQ_E4]) === 8, 'Cavalo em e4 ataca exatamente 8 casas');
assert(popcount(KNIGHT_ATTACKS[SQ_A1]) === 2, 'Cavalo em a1 (canto) ataca exatamente 2 casas (b3, c2)');
assert(popcount(KNIGHT_ATTACKS[squareNameToIndex('b1')]) === 3, 'Cavalo em b1 ataca exatamente 3 casas (a3, c3, d2)');

// 2. King Attacks
console.log('\n--- 2. KING ATTACKS ---');
assert(popcount(KING_ATTACKS[SQ_E4]) === 8, 'Rei em e4 ataca exatamente 8 casas');
assert(popcount(KING_ATTACKS[SQ_A1]) === 3, 'Rei em a1 ataca exatamente 3 casas (a2, b1, b2)');
assert(popcount(KING_ATTACKS[squareNameToIndex('a4')]) === 5, 'Rei na borda a4 ataca exatamente 5 casas');

// 3. Pawn Attacks
console.log('\n--- 3. PAWN ATTACKS ---');
const wpE4 = WHITE_PAWN_ATTACKS[SQ_E4];
assert(popcount(wpE4) === 2, 'Peão branco em e4 ataca 2 casas (d5, f5)');
assert((wpE4 & squareToBit(squareNameToIndex('d5'))) !== BB_EMPTY, 'Peão branco e4 ataca d5');
assert((wpE4 & squareToBit(squareNameToIndex('f5'))) !== BB_EMPTY, 'Peão branco e4 ataca f5');

const bpE5 = BLACK_PAWN_ATTACKS[squareNameToIndex('e5')];
assert(popcount(bpE5) === 2, 'Peão preto em e5 ataca 2 casas (d4, f4)');
assert((bpE5 & squareToBit(squareNameToIndex('d4'))) !== BB_EMPTY, 'Peão preto e5 ataca d4');
assert((bpE5 & squareToBit(squareNameToIndex('f4'))) !== BB_EMPTY, 'Peão preto e5 ataca f4');

const wpA2 = WHITE_PAWN_ATTACKS[squareNameToIndex('a2')];
assert(popcount(wpA2) === 1, 'Peão branco em a2 (borda) ataca apenas 1 casa (b3)');

// 4. Ray Tables
console.log('\n--- 4. RAY TABLES & BETWEEN MASKS ---');
assert(popcount(RAY_MASKS[SQ_E4][DIR_NORTH]) === 4, 'Raio Norte de e4 tem 4 casas (e5, e6, e7, e8)');
assert(popcount(RAY_MASKS[SQ_E4][DIR_SOUTH]) === 3, 'Raio Sul de e4 tem 3 casas (e3, e2, e1)');
assert(popcount(RAY_MASKS[SQ_E4][DIR_EAST]) === 3, 'Raio Leste de e4 tem 3 casas (f4, g4, h4)');
assert(popcount(RAY_MASKS[SQ_E4][DIR_WEST]) === 4, 'Raio Oeste de e4 tem 4 casas (d4, c4, b4, a4)');

const betwE1E8 = BETWEEN_MASKS[squareNameToIndex('e1')][squareNameToIndex('e8')];
assert(popcount(betwE1E8) === 6, 'Entre e1 e e8 há exatamente 6 casas (e2..e7)');
const betwNonAligned = BETWEEN_MASKS[squareNameToIndex('a1')][squareNameToIndex('b3')];
assert(betwNonAligned === BB_EMPTY, 'Casas não alinhadas produzem BETWEEN vazio');

// 5. Slider Attacks (Rook, Bishop, Queen)
console.log('\n--- 5. SLIDER ATTACKS ---');
// Torre em e4 no tabuleiro vazio
const rookEmpty = rookAttacks(SQ_E4, 0n);
assert(popcount(rookEmpty) === 14, 'Torre em e4 em tabuleiro vazio ataca 14 casas');

// Torre em e4 com bloqueadores em e6 e c4
const occ1 = squareToBit(squareNameToIndex('e6')) | squareToBit(squareNameToIndex('c4'));
const rookBlocked = rookAttacks(SQ_E4, occ1);
// Norte deve parar em e6 (incluindo e6, mas não e7 nem e8)
assert((rookBlocked & squareToBit(squareNameToIndex('e5'))) !== BB_EMPTY, 'Torre ataca e5');
assert((rookBlocked & squareToBit(squareNameToIndex('e6'))) !== BB_EMPTY, 'Torre ataca e6 (bloqueador)');
assert((rookBlocked & squareToBit(squareNameToIndex('e7'))) === BB_EMPTY, 'Torre NÃO ataca e7 (atrás do bloqueador)');
// Oeste deve parar em c4
assert((rookBlocked & squareToBit(squareNameToIndex('d4'))) !== BB_EMPTY, 'Torre ataca d4');
assert((rookBlocked & squareToBit(squareNameToIndex('c4'))) !== BB_EMPTY, 'Torre ataca c4 (bloqueador)');
assert((rookBlocked & squareToBit(squareNameToIndex('b4'))) === BB_EMPTY, 'Torre NÃO ataca b4 (atrás do bloqueador)');

// Bispo em e4 no tabuleiro vazio
const bishopEmpty = bishopAttacks(SQ_E4, 0n);
assert(popcount(bishopEmpty) === 13, 'Bispo em e4 em tabuleiro vazio ataca 13 casas');

// Dama em e4
const queenEmpty = queenAttacks(SQ_E4, 0n);
assert(popcount(queenEmpty) === 27, 'Dama em e4 em tabuleiro vazio ataca 27 casas (14 + 13)');

// 6. Attack Detection & Check Detection
console.log('\n--- 6. ATTACK & CHECK DETECTION ---');
const startBoard = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
assert(!isInCheck(startBoard, 'w'), 'Posição inicial: Brancas não estão em xeque');
assert(!isInCheck(startBoard, 'b'), 'Posição inicial: Pretas não estão em xeque');

// Fool's mate check
const foolBoard = parseFen('rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 1 3');
assert(isInCheck(foolBoard, 'w'), 'Fool mate: Brancas estão em xeque por dama em h4');
assert(isSquareAttacked(foolBoard, squareNameToIndex('e1'), 'b'), 'Casa e1 atacada por pretas');

// Check por cavalo
const knightCheckBoard = parseFen('4k3/8/8/8/8/5n2/8/4K3 w - - 0 1');
assert(isInCheck(knightCheckBoard, 'w'), 'Brancas em xeque por cavalo em f3');

// Check duplo
const doubleCheckBoard = parseFen('4k3/8/8/8/1b2r3/8/8/4K3 w - - 0 1');
assert(isInCheck(doubleCheckBoard, 'w'), 'Brancas em xeque duplo');
const chkInfo = getCheckInfo(doubleCheckBoard, 'w');
assert(chkInfo.doubleCheck, 'Detectado doubleCheck = true');
assert(chkInfo.numCheckers === 2, 'Exatamente 2 atacantes do rei');
assert(chkInfo.checkMask === BB_EMPTY, 'Em xeque duplo, checkMask é vazio (apenas rei pode mover)');

// 7. Pin Detection
console.log('\n--- 7. PIN DETECTION ---');
// Cavalo branco em e2 cravado na coluna e por torre preta em e5 contra rei em e1
const pinBoard = parseFen('4k3/8/8/4r3/8/8/4N3/4K3 w - - 0 1');
const pins = findPins(pinBoard, 'w');
assert(popcount(pins.pinnedPieces) === 1, 'Exatamente 1 peça cravada detectada');
assert(lsb(pins.pinnedPieces) === squareNameToIndex('e2'), 'Peça cravada é o cavalo em e2');
const pinRay = pins.pinRays.get(squareNameToIndex('e2'))!;
assert(pinRay !== undefined, 'Raio de cravada registrado para o cavalo');
assert((pinRay & squareToBit(squareNameToIndex('e5'))) !== BB_EMPTY, 'Raio de cravada contém a torre cravadora em e5');

console.log(`\n============================================`);
console.log(`Total de testes: ${passed + failed} | Aprovados: ${passed} | Falhas: ${failed}`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('TODOS OS TESTES DE ATAQUES E XEQUES PASSARAM COM SUCESSO!');
}
