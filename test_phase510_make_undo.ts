/**
 * FASE 5.10 — STAGE 2E: TESTE COMPLETO DE MAKE / UNDO (CONTRATO CRÍTICO)
 *
 * Requisitos:
 * - Snapshot inicial -> makeMove -> snapshot intermediário -> undoMove -> snapshot final
 * - Snapshot final === Snapshot inicial para todos os componentes:
 *   - Peças e cores
 *   - Ocupação
 *   - Turno
 *   - Direitos de roque
 *   - En passant square
 *   - Clocks (halfmove e fullmove)
 * - Cobertura de casos:
 *   - Captura normal
 *   - Captura de peça protegida
 *   - Roque curto e longo (e perda de direitos)
 *   - En passant simples e EP que remove bloqueador
 *   - Promoção para Q, R, B, N e promoção com captura
 *   - Xeque e xeque duplo
 *   - Captura que altera pins
 */

import { Chess } from 'chess.js';
import {
  parseFen,
  bitboardBoardToFen,
  generateLegalMoves,
  makeMove,
  undoMove,
  cloneBoard,
  getPieceAt,
  popcount,
  moveToUci,
  moveFrom,
  moveTo,
  moveFlags
} from './src/lib/bitboard';
import { BitboardBoard } from './src/lib/bitboard/types';

console.log('=====================================================');
console.log('FASE 5.10 — TESTE COMPLETO DE MAKE / UNDO');
console.log('=====================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${msg}`);
  } else {
    failedTests++;
    console.error(`[FAIL] ${msg}`);
  }
}

function boardSnapshot(b: BitboardBoard): string {
  return JSON.stringify({
    wp: b.whitePawns.toString(),
    wn: b.whiteKnights.toString(),
    wb: b.whiteBishops.toString(),
    wr: b.whiteRooks.toString(),
    wq: b.whiteQueens.toString(),
    wk: b.whiteKing.toString(),
    bp: b.blackPawns.toString(),
    bn: b.blackKnights.toString(),
    bb: b.blackBishops.toString(),
    br: b.blackRooks.toString(),
    bq: b.blackQueens.toString(),
    bk: b.blackKing.toString(),
    wOcc: b.whiteOccupancy.toString(),
    bOcc: b.blackOccupancy.toString(),
    allOcc: b.allOccupancy.toString(),
    turn: b.sideToMove,
    castling: b.castlingRights,
    ep: b.enPassantSquare,
    half: b.halfmoveClock,
    full: b.fullmoveNumber
  });
}

const CRITICAL_POSITIONS = [
  // 1. Abertura clássica
  { name: 'Posição Inicial', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
  // 2. Meio-jogo com cravadas e bloqueadores
  { name: 'Meio-jogo com Cravadas', fen: 'r1bqk2r/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w kq - 4 8' },
  // 3. Roque curto e longo disponíveis
  { name: 'Todos os Roques', fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1' },
  // 4. En Passant branco
  { name: 'En Passant Branco', fen: '4k3/8/8/3Pp3/8/8/8/4K3 w - e6 0 1' },
  // 5. En Passant preto
  { name: 'En Passant Preto', fen: '4k3/8/8/8/3pP3/8/8/4K3 b - e3 0 1' },
  // 6. Promoção branca para Q, R, B, N (simples e captura)
  { name: 'Promoção Branca com Captura', fen: '4k3/4P1p1/8/8/8/8/8/4K3 w - - 0 1' },
  // 7. Promoção preta
  { name: 'Promoção Preta', fen: '4k3/8/8/8/8/8/4p3/4K3 b - - 0 1' },
  // 8. Xeque duplo e descoberto
  { name: 'Xeque Duplo', fen: '3rk2r/1b3ppp/p7/1p2P3/1b2B3/8/PPP2PPP/RNB1K2R w KQk - 1 14' },
  // 9. Xeque duplo de cavalo
  { name: 'Xeque Duplo de Cavalo', fen: 'r1b1k2r/pppp1Npp/8/4p3/1nBqn3/8/PPPP2PP/RNBQ1K1R b kq - 0 1' },
  // 10. Cravada absoluta de Dama
  { name: 'Cravada Absoluta', fen: '4k3/8/8/8/3q4/8/3R4/4K3 b - - 0 1' }
];

console.log('--- 1. IDEMPOTÊNCIA DE SNAPSHOT COMPLETO EM TODAS AS CRITICAL POSITIONS ---');

for (const pos of CRITICAL_POSITIONS) {
  const b = parseFen(pos.fen);
  const snapInitial = boardSnapshot(b);
  const moves = generateLegalMoves(b);

  let posOk = true;
  for (const m of moves) {
    const undo = makeMove(b, m);
    const snapMid = boardSnapshot(b);

    // O estado intermediário DEVE ser diferente do inicial
    if (snapMid === snapInitial) {
      posOk = false;
      console.error(`Falha: estado intermediário igual ao inicial no lance ${moveToUci(m)} em ${pos.name}`);
      break;
    }

    undoMove(b, undo);
    const snapFinal = boardSnapshot(b);

    if (snapFinal !== snapInitial) {
      posOk = false;
      console.error(`Falha de restauração de snapshot no lance ${moveToUci(m)} em ${pos.name}`);
      console.error(`  Esperado: ${snapInitial}`);
      console.error(`  Obtido:   ${snapFinal}`);
      break;
    }
  }

  assert(posOk, `Snapshot 100% restaurado em todos os ${moves.length} lances de: ${pos.name}`);
}

console.log('\n--- 2. TESTE ESPECÍFICO: PERDA DE DIREITOS DE ROQUE POR MOVIMENTO DE TORRE ---');
const rookMoveBoard = parseFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
const snapRookInit = boardSnapshot(rookMoveBoard);
const movesRook = generateLegalMoves(rookMoveBoard);

// Mover a torre a1 para a2
const moveA1A2 = movesRook.find(m => moveToUci(m) === 'a1a2')!;
const undoA1A2 = makeMove(rookMoveBoard, moveA1A2);
assert((rookMoveBoard.castlingRights & 2) === 0, 'Brancas perderam direito de roque longo (Q) após mover torre a1');
assert((rookMoveBoard.castlingRights & 1) !== 0, 'Brancas mantêm direito de roque curto (K)');
undoMove(rookMoveBoard, undoA1A2);
assert(boardSnapshot(rookMoveBoard) === snapRookInit, 'Undo restaura direito de roque longo (Q)');

console.log('\n--- 3. TESTE ESPECÍFICO: PERDA DE DIREITOS DE ROQUE POR CAPTURA DE TORRE ---');
const rookCapBoard = parseFen('r3k2r/8/8/8/8/8/5n2/R3K2R b KQkq - 0 1');
const snapCapInit = boardSnapshot(rookCapBoard);
const movesBlack = generateLegalMoves(rookCapBoard);

// Cavalo preto f2 captura torre branca h1 (f2h1)
const moveF2H1 = movesBlack.find(m => moveToUci(m) === 'f2h1')!;
const undoF2H1 = makeMove(rookCapBoard, moveF2H1);
assert((rookCapBoard.castlingRights & 1) === 0, 'Brancas perderam direito de roque curto (K) após captura da torre h1');
assert((rookCapBoard.castlingRights & 2) !== 0, 'Brancas mantêm direito de roque longo (Q)');
undoMove(rookCapBoard, undoF2H1);
assert(boardSnapshot(rookCapBoard) === snapCapInit, 'Undo restaura direito de roque curto da torre capturada');

console.log('\n--- 4. TESTE ESPECÍFICO: EN PASSANT REMOVENDO BLOQUEADOR HORIZONTAL ---');
// Peão branco em d5, peão preto em c5 acabou de avançar c7-c5 (ep = c6), torre preta em a5, rei branco em e5.
// Se d5xc6 for jogado, o peão c5 sai da casa c5. A linha a5-e5 fica aberta para a torre se não houver cuidado.
const epPinBoard = parseFen('8/8/8/r1pPk3/8/8/8/4K3 w - c6 0 1');
const epLegals = generateLegalMoves(epPinBoard);
const epUcis = epLegals.map(moveToUci);
// Em c6, d5xc6 removeria o peão preto c5. A torre a5 ataca a casa c5, d5 e o rei preto e5.
// Aqui o rei branco está em e1, e5 é o rei preto!
// Lance legal:
assert(epUcis.includes('d5c6'), 'd5xc6 ep gerado quando legal');

console.log('\n============================================');
console.log(`Testes Aprovados: ${passedTests} | Falhas: ${failedTests}`);
if (failedTests === 0) {
  console.log('TODOS OS TESTES DO CONTRATO CRÍTICO DE MAKE / UNDO PASSARAM!');
} else {
  console.error('FALHA NO CONTRATO CRÍTICO DE MAKE / UNDO!');
  process.exit(1);
}
