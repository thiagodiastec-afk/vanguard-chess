/**
 * FASE 5.8 — TESTES DE MAKE / UNDO MOVE E CASOS ESPECIAIS
 */

import {
  parseFen,
  bitboardBoardToFen,
  cloneBoard,
  makeMove,
  undoMove,
  generatePseudoLegalMoves,
  generateLegalMoves,
  moveToUci,
  moveFrom,
  moveTo,
  moveFlags,
  FLAG_KING_CASTLE,
  FLAG_QUEEN_CASTLE,
  FLAG_EP_CAPTURE,
  FLAG_PROMO_Q,
  squareNameToIndex
} from './src/lib/bitboard';

console.log('=====================================================');
console.log('FASE 5.8 — TESTES DE MAKE / UNDO MOVE');
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

// 1. Integridade estrutural de Make / Undo em múltiplas posições
console.log('--- 1. INTEGRIDADE ESTRUTURAL DE MAKE / UNDO ---');

const sampleFens = [
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  'r1bqk2r/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w kq - 4 8',
  'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
  '4k3/8/8/3Pp3/8/8/8/4K3 w - e6 0 1',
  '8/4P3/8/8/8/8/8/4K2k w - - 0 1',
  'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'
];

for (const fen of sampleFens) {
  const b = parseFen(fen);
  const origFen = bitboardBoardToFen(b);
  const moves = generatePseudoLegalMoves(b);

  let posOk = true;
  for (const m of moves) {
    const undo = makeMove(b, m);
    undoMove(b, undo);
    const restoredFen = bitboardBoardToFen(b);
    if (restoredFen !== origFen) {
      posOk = false;
      console.error(`Erro de make/undo no lance ${moveToUci(m)} em ${fen}`);
      console.error(`  Esperado: ${origFen}`);
      console.error(`  Obtido:   ${restoredFen}`);
      break;
    }
  }
  assert(posOk, `Make / Undo idempotente em todos os ${moves.length} lances de: ${fen.split(' ')[0]}`);
}

// 2. Teste específico de Roque (Castling)
console.log('\n--- 2. TESTE ESPECÍFICO DE ROQUE ---');
const castleBoard = parseFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
const legalCastleMoves = generateLegalMoves(castleBoard);
const ucis = legalCastleMoves.map(moveToUci);

assert(ucis.includes('e1g1'), 'Roque curto branco e1g1 gerado');
assert(ucis.includes('e1c1'), 'Roque longo branco e1c1 gerado');

// Executar e1g1
const mCastleK = legalCastleMoves.find(m => moveToUci(m) === 'e1g1')!;
const undoCK = makeMove(castleBoard, mCastleK);
assert(bitboardBoardToFen(castleBoard).includes('R4RK1'), 'Rei branco em g1 e torre em f1');
assert((castleBoard.castlingRights & 3) === 0, 'Brancas perderam direitos de roque após rocar');
undoMove(castleBoard, undoCK);
assert(bitboardBoardToFen(castleBoard) === 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'Undo do roque restaura rei, torre e direitos');

// 3. Teste específico de En Passant
console.log('\n--- 3. TESTE ESPECÍFICO DE EN PASSANT ---');
const epBoard = parseFen('4k3/8/8/3Pp3/8/8/8/4K3 w - e6 0 1');
const epMoves = generateLegalMoves(epBoard);
const epUcis = epMoves.map(moveToUci);
assert(epUcis.includes('d5e6'), 'Lance d5e6 e.p. gerado');

const mEp = epMoves.find(m => moveToUci(m) === 'd5e6')!;
const undoEp = makeMove(epBoard, mEp);
assert(bitboardBoardToFen(epBoard).startsWith('4k3/8/4P3/8/8/8/8/4K3'), 'Peão preto e5 removido e peão branco em e6');
undoMove(epBoard, undoEp);
assert(bitboardBoardToFen(epBoard) === '4k3/8/8/3Pp3/8/8/8/4K3 w - e6 0 1', 'Undo de EP restaura ambos os peões e o epSquare');

// 4. Teste específico de Promoção
console.log('\n--- 4. TESTE ESPECÍFICO DE PROMOÇÃO ---');
const promoBoard = parseFen('8/4P3/8/8/8/8/8/4K2k w - - 0 1');
const promoMoves = generateLegalMoves(promoBoard);
const promoUcis = promoMoves.map(moveToUci);
assert(promoUcis.includes('e7e8q'), 'e7e8q gerado');
assert(promoUcis.includes('e7e8r'), 'e7e8r gerado');
assert(promoUcis.includes('e7e8b'), 'e7e8b gerado');
assert(promoUcis.includes('e7e8n'), 'e7e8n gerado');

const mPromoQ = promoMoves.find(m => moveToUci(m) === 'e7e8q')!;
const undoPromo = makeMove(promoBoard, mPromoQ);
assert(bitboardBoardToFen(promoBoard).startsWith('4Q3/8/8/8/8/8/8/4K2k'), 'Dama branca promovida em e8');
undoMove(promoBoard, undoPromo);
assert(bitboardBoardToFen(promoBoard) === '8/4P3/8/8/8/8/8/4K2k w - - 0 1', 'Undo de promoção restaura o peão em e7');

console.log(`\n============================================`);
console.log(`Total de testes: ${passed + failed} | Aprovados: ${passed} | Falhas: ${failed}`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('TODOS OS TESTES DE MAKE / UNDO PASSARAM COM SUCESSO!');
}
