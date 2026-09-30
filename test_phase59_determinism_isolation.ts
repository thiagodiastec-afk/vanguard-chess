/**
 * FASE 5.9 — TESTE DE DETERMINISMO E ISOLAMENTO DE ESTADO (STATE ISOLATION)
 *
 * 1. Determinismo (10x):
 *    Mesma sequência de lances executada 10 vezes em instâncias independentes
 *    deve gerar exatamente os mesmos lances legais, o mesmo FEN e os mesmos estados.
 *
 * 2. Isolamento de Estado (3-way cyclic):
 *    Executa em ordens alternadas:
 *    Seq 1: A -> B -> C
 *    Seq 2: B -> C -> A
 *    Seq 3: C -> A -> B
 *    Verifica se a execução anterior afeta a próxima de alguma forma.
 */

import { BitboardBackend } from './src/lib/board/bitboardBackend';
import { formatMoveCanonical } from './src/lib/board/validator';

console.log('=====================================================');
console.log('FASE 5.9 — DETERMINISMO & STATE ISOLATION');
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
// 1. DETERMINISMO (10x)
// ==========================================
console.log('--- 1. TESTE DE DETERMINISMO (10 iterações idênticas) ---');
const movesToPlay = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6', 'd2d3', 'f8c5'];

function runSequence(): { fens: string[]; legalMovesCount: number[] } {
  const b = new BitboardBackend();
  const fens: string[] = [];
  const legalMovesCount: number[] = [];

  for (const mv of movesToPlay) {
    const legals = b.generateLegalMoves();
    legalMovesCount.push(legals.length);
    const targetMove = legals.find(m => formatMoveCanonical(m) === mv);
    if (!targetMove) {
      throw new Error(`Lance esperado ${mv} não encontrado como legal!`);
    }
    b.makeMove(targetMove);
    fens.push(b.getFEN());
  }
  return { fens, legalMovesCount };
}

const baseline = runSequence();
let determinismPass = true;

for (let iter = 1; iter <= 10; iter++) {
  const current = runSequence();
  if (current.fens.length !== baseline.fens.length) {
    determinismPass = false;
    break;
  }
  for (let i = 0; i < baseline.fens.length; i++) {
    if (current.fens[i] !== baseline.fens[i] || current.legalMovesCount[i] !== baseline.legalMovesCount[i]) {
      determinismPass = false;
      console.error(`Divergência na iteração ${iter}, passo ${i}:`);
      console.error(`  Esperado: ${baseline.fens[i]}`);
      console.error(`  Obtido:   ${current.fens[i]}`);
      break;
    }
  }
  if (!determinismPass) break;
}

assert(determinismPass, 'Determinismo estrito confirmado (10/10 iterações idênticas)');

// ==========================================
// 2. STATE ISOLATION (A -> B -> C, B -> C -> A, C -> A -> B)
// ==========================================
console.log('\n--- 2. TESTE DE ISOLAMENTO DE ESTADO (3-way cyclic) ---');

const POS_A = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const POS_B = 'r1bqk2r/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w kq - 4 8';
const POS_C = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';

function evaluateState(fen: string): { fenOut: string; moveCount: number; inCheck: boolean } {
  const b = new BitboardBackend(fen);
  const moves = b.generateLegalMoves();
  const inCheck = b.isInCheck();

  // Executar e desfazer todos os lances para testar contaminação interna
  for (const m of moves) {
    const undo = b.makeMove(m);
    b.undoMove(undo);
  }

  return {
    fenOut: b.getFEN(),
    moveCount: moves.length,
    inCheck
  };
}

// Ordem 1: A -> B -> C
const resA1 = evaluateState(POS_A);
const resB1 = evaluateState(POS_B);
const resC1 = evaluateState(POS_C);

// Ordem 2: B -> C -> A
const resB2 = evaluateState(POS_B);
const resC2 = evaluateState(POS_C);
const resA2 = evaluateState(POS_A);

// Ordem 3: C -> A -> B
const resC3 = evaluateState(POS_C);
const resA3 = evaluateState(POS_A);
const resB3 = evaluateState(POS_B);

const isoA = resA1.fenOut === resA2.fenOut && resA1.fenOut === resA3.fenOut && resA1.moveCount === resA2.moveCount && resA1.moveCount === resA3.moveCount;
const isoB = resB1.fenOut === resB2.fenOut && resB1.fenOut === resB3.fenOut && resB1.moveCount === resB2.moveCount && resB1.moveCount === resB3.moveCount;
const isoC = resC1.fenOut === resC2.fenOut && resC1.fenOut === resC3.fenOut && resC1.moveCount === resC2.moveCount && resC1.moveCount === resC3.moveCount;

assert(isoA, 'Isolamento de estado confirmado para Posição A');
assert(isoB, 'Isolamento de estado confirmado para Posição B');
assert(isoC, 'Isolamento de estado confirmado para Posição C');

console.log('\n============================================');
console.log(`Testes Aprovados: ${passedTests} | Falhas: ${failedTests}`);
if (failedTests === 0) {
  console.log('DETERMINISMO E STATE ISOLATION PASSARAM COM SUCESSO!');
} else {
  console.error('FALHA EM DETERMINISMO OU STATE ISOLATION!');
  process.exit(1);
}
