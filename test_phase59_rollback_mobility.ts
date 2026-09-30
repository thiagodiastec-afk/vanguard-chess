/**
 * FASE 5.9 — TESTE DE ROLLBACK E MOBILITY EXACT EQUIVALENCE
 *
 * 1. Rollback:
 *    Testa alternância atômica entre backends:
 *    Bitboard (ON) -> ChessJs (OFF) -> Bitboard (ON)
 *    Verifica se a alternância funciona perfeitamente sem afetar o estado.
 *
 * 2. Mobility Equivalence:
 *    Compara legal mobility gerada pelo BitboardBackend versus Chess.js
 *    por tipo de peça (P, N, B, R, Q, K, Total, TotalNonKing).
 */

import { Chess } from 'chess.js';
import { createBoardBackend, setBoardBackendType, boardConfig } from './src/lib/board/factory';
import { formatMoveCanonical } from './src/lib/board/validator';
import { countMobility, optimizedLegalMobility } from './src/lib/engine';
import { BitboardBackend } from './src/lib/board/bitboardBackend';

console.log('=====================================================');
console.log('FASE 5.9 — ROLLBACK & MOBILITY EQUIVALENCE');
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

// ==========================================
// 1. TESTE DE ROLLBACK
// ==========================================
console.log('--- 1. TESTE DE ROLLBACK (BITBOARD -> CHESSJS -> BITBOARD) ---');

const testFen = 'r1bqk2r/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w kq - 4 8';

// Estado A: Bitboard ON
setBoardBackendType('bitboard');
const backend1 = createBoardBackend(testFen);
assert(backend1.backendType === 'bitboard', 'Backend 1 inicializado como Bitboard');
const moves1 = backend1.generateLegalMoves().map(formatMoveCanonical).sort();

// Estado B: Rollback para Chess.js (OFF)
setBoardBackendType('chessjs');
const backend2 = createBoardBackend(testFen);
assert(backend2.backendType === 'chessjs', 'Rollback bem-sucedido: Backend 2 é ChessJs');
const moves2 = backend2.generateLegalMoves().map(formatMoveCanonical).sort();

// Comparar lances legais entre Bitboard e ChessJs
assert(moves1.length === moves2.length && moves1.every((m, i) => m === moves2[i]), 'Lances legais de Bitboard e ChessJs são 100% idênticos no rollback');

// Estado C: Bitboard reativado (ON)
setBoardBackendType('bitboard');
const backend3 = createBoardBackend(testFen);
assert(backend3.backendType === 'bitboard', 'Reativação: Backend 3 é Bitboard');
const moves3 = backend3.generateLegalMoves().map(formatMoveCanonical).sort();
assert(moves1.length === moves3.length && moves1.every((m, i) => m === moves3[i]), 'Reativação preserva exatamente os mesmos lances legais');

// ==========================================
// 2. TESTE DE EQUIVALÊNCIA EXATA DE MOBILIDADE
// ==========================================
console.log('\n--- 2. TESTE DE MOBILIDADE LEGAL EXATA POR TIPO DE PEÇA ---');

const samplePositions = [
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  'r1bqk2r/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w kq - 4 8',
  'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
  '4k3/8/8/3Pp3/8/8/8/4K3 w - e6 0 1',
  '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'
];

let allMobilityEqual = true;

for (const fen of samplePositions) {
  const g = new Chess(fen);
  const bb = new BitboardBackend(fen);

  for (const color of ['w', 'b'] as const) {
    const refBreakdown = optimizedLegalMobility(g, color);

    // Contar mobilidade legal por peça usando o BitboardBackend
    // Para medir a mobilidade de cada lado sem alterar o sideToMove do FEN original,
    // configuramos uma posição com o turno definido
    const fenParts = fen.split(' ');
    const activeColor = fenParts[1];
    fenParts[1] = color;
    // Se estamos avaliando o lado NÃO-ativo da posição original, o en passant square
    // pertencia ao lance anterior do lado ativo e não é capturável pelo lado não-ativo
    if (color !== activeColor) {
      fenParts[3] = '-';
    }
    const colorFen = fenParts.join(' ');

    const bbColor = new BitboardBackend(colorFen);
    const bbMoves = bbColor.generateLegalMoves();

    const bitboardBreakdown = {
      pawns: 0,
      knights: 0,
      bishops: 0,
      rooks: 0,
      queens: 0,
      king: 0,
      totalNonKing: 0,
      total: 0
    };

    for (const m of bbMoves) {
      if (m.piece === 'p') bitboardBreakdown.pawns++;
      else if (m.piece === 'n') bitboardBreakdown.knights++;
      else if (m.piece === 'b') bitboardBreakdown.bishops++;
      else if (m.piece === 'r') bitboardBreakdown.rooks++;
      else if (m.piece === 'q') bitboardBreakdown.queens++;
      else if (m.piece === 'k') bitboardBreakdown.king++;
      bitboardBreakdown.total++;
    }
    bitboardBreakdown.totalNonKing = bitboardBreakdown.total - bitboardBreakdown.king;

    const matchP = bitboardBreakdown.pawns === refBreakdown.pawns;
    const matchN = bitboardBreakdown.knights === refBreakdown.knights;
    const matchB = bitboardBreakdown.bishops === refBreakdown.bishops;
    const matchR = bitboardBreakdown.rooks === refBreakdown.rooks;
    const matchQ = bitboardBreakdown.queens === refBreakdown.queens;
    const matchK = bitboardBreakdown.king === refBreakdown.king;
    const matchNonKing = bitboardBreakdown.totalNonKing === refBreakdown.totalNonKing;

    if (!matchP || !matchN || !matchB || !matchR || !matchQ || !matchK || !matchNonKing) {
      allMobilityEqual = false;
      console.error(`Divergência de mobilidade em ${fen} (${color}):`);
      console.error(`  Esperado (ChessJs):`, refBreakdown);
      console.error(`  Obtido (Bitboard): `, bitboardBreakdown);
    }
  }
}

assert(allMobilityEqual, 'Mobilidade por tipo de peça (P, N, B, R, Q, K, TotalNonKing) 100% equivalente');

console.log('\n============================================');
console.log(`Testes Aprovados: ${passedTests} | Falhas: ${failedTests}`);
if (failedTests === 0) {
  console.log('ROLLBACK E MOBILITY EQUIVALENCE PASSARAM COM SUCESSO!');
} else {
  console.error('FALHA EM ROLLBACK OU MOBILITY EQUIVALENCE!');
  process.exit(1);
}
