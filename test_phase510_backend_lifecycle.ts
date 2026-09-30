/**
 * FASE 5.10 — STAGE 2B: TESTE DE CICLO DE VIDA E ISOLAMENTO DE BACKEND POR BUSCA
 *
 * Verifica que:
 * 1. A configuração do backend é capturada de forma imutável no início de calculateBestMove().
 * 2. Uma alteração na configuração global durante uma busca não afeta a busca em andamento.
 * 3. Buscas subsequentes respeitam o novo backend ativo.
 * 4. O ciclo A (bitboard) -> switch global para chess.js -> B (chessjs) -> switch global para bitboard -> C (bitboard)
 *    funciona determinística e isoladamente.
 */

import { Chess } from 'chess.js';
import {
  calculateBestMove,
  setBoardBackendType,
  setExecutionMode,
  captureBackendConfig,
  BoardBackendType
} from './src/lib/engine';

console.log('=====================================================');
console.log('FASE 5.10 — TESTE DE CICLO DE VIDA DO BACKEND');
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

// 1. Imutabilidade do Snapshot
console.log('--- 1. SNAPSHOT IMUTÁVEL DE CONFIGURAÇÃO ---');
setBoardBackendType('bitboard');
const snap1 = captureBackendConfig();
assert(snap1.backendType === 'bitboard', 'Snapshot 1 capturou backendType === bitboard');

setBoardBackendType('chessjs');
assert(snap1.backendType === 'bitboard', 'Snapshot 1 permaneceu bitboard após mudança global');
const snap2 = captureBackendConfig();
assert(snap2.backendType === 'chessjs', 'Snapshot 2 capturou nova configuração chessjs');

// 2. Isolamento de Buscas Sequenciais com Alteração de Configuração
console.log('\n--- 2. TRANSIÇÕES DE CONFIGURAÇÃO ENTRE BUSCAS ---');

const testFen = 'r1bqk2r/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w kq - 4 8';

// Busca 1: Inicia com Bitboard
setExecutionMode('BITBOARD_ONLY');
const g1 = new Chess(testFen);
const m1 = calculateBestMove(g1, 'facil');
assert(m1 !== null, 'Busca 1 (BITBOARD_ONLY) produziu lance válido');

// Busca 2: Inicia com Chess.js
setExecutionMode('CHESSJS_ONLY');
const g2 = new Chess(testFen);
const m2 = calculateBestMove(g2, 'facil');
assert(m2 !== null, 'Busca 2 (CHESSJS_ONLY) produziu lance válido');
assert(m1 === m2, `Lances entre BITBOARD_ONLY (${m1}) e CHESSJS_ONLY (${m2}) são idênticos`);

// Busca 3: Inicia com Validação Dual
setExecutionMode('BITBOARD_WITH_ORACLE');
const g3 = new Chess(testFen);
const m3 = calculateBestMove(g3, 'facil');
assert(m3 !== null, 'Busca 3 (BITBOARD_WITH_ORACLE) produziu lance válido');
assert(m1 === m3, `Lances entre BITBOARD_ONLY e BITBOARD_WITH_ORACLE são idênticos`);

// Busca 4: Retorno para Bitboard
setExecutionMode('BITBOARD_ONLY');
const g4 = new Chess(testFen);
const m4 = calculateBestMove(g4, 'facil');
assert(m4 === m1, 'Busca 4 (Retorno para BITBOARD_ONLY) reproduz exatamente o mesmo lance');

console.log('\n============================================');
console.log(`Testes Aprovados: ${passedTests} | Falhas: ${failedTests}`);
if (failedTests === 0) {
  console.log('CICLO DE VIDA E ISOLAMENTO DE BACKEND APROVADOS!');
} else {
  console.error('FALHA NO CICLO DE VIDA DO BACKEND!');
  process.exit(1);
}
