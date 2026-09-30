import { Chess } from 'chess.js';
import {
  calculateKingTropism,
  evaluateKingTropism,
  countKingAttackers,
  countPawnShield,
  countMobility,
  evaluateBoard,
  calculateBestMove,
  kingTropismConfig,
  kingAttackersConfig,
  kingSafetyConfig,
  mobilityConfig
} from './src/lib/engine.ts';

console.log('=== AUDITORIA DE ABERTURA E INTERAÇÕES (FASE 5.4I) ===\n');

// 1. Abertura: Posição Inicial e Primeiros Lances
const openingFens = [
  { name: 'Posição Inicial', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
  { name: '1. e4', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1' },
  { name: '1. d4', fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1' },
  { name: '1. e4 e5 2. Nf3 Nc6', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3' },
  { name: 'Italian Game (Nf3, Nc6, Bc4, Bc5)', fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4' },
  { name: 'Roque Curto Brancas (O-O)', fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4' },
  { name: 'Roque Longo Brancas (O-O-O)', fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/4P3/2NP1N2/PPP1QPPP/2KR1B1R b kq - 7 5' }
];

for (const op of openingFens) {
  const g = new Chess(op.fen);
  const trop = evaluateKingTropism(g);
  const att = countKingAttackers(g, 'w');
  const attB = countKingAttackers(g, 'b');
  console.log(`[Abertura] ${op.name}:`);
  console.log(`  Tropism White King: ${trop.tropismWhiteKing} cp | Tropism Black King: ${trop.tropismBlackKing} cp | Delta: ${trop.tropismDelta} cp`);
  console.log(`  Attackers on White King: ${att} | Attackers on Black King: ${attB}`);
}

// 2. Testar decisão da Engine na Posição Inicial e Resposta a 1.e4
console.log('\n--- Decisões do Engine na Abertura ---');
kingTropismConfig.enabled = true;
kingAttackersConfig.attackerPenalty = 6;
kingSafetyConfig.pawnShieldBonus = 8;
mobilityConfig.bonusPerMove = 1;

const g0 = new Chess();
const m0 = calculateBestMove(g0, 'dificil', { maxTimeMs: 3000 });
console.log(`Engine bestMove na posição inicial: ${m0}`);

const g1 = new Chess('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
const m1 = calculateBestMove(g1, 'dificil', { maxTimeMs: 3000 });
console.log(`Engine bestMove em resposta a 1.e4: ${m1}`);

// 3. Teste de Interação Sistemática
console.log('\n--- Interação King Tropism vs King Attackers vs Pawn Shield vs Mobility ---');

// Posição de Teste de Ataque ao Rei:
// Black Queen e Cavalo atacam King branco em g1
const fAttack = 'r1b2rk1/pp1n1ppp/2p1pn2/3p4/2PP4/2N2NPq/PP2PPBP/R1BQ1RK1 w - - 0 8';
const gA = new Chess(fAttack);
const tropA = evaluateKingTropism(gA);
const attA = countKingAttackers(gA, 'w');
const shieldA = countPawnShield(gA, 'w');
const mobA = countMobility(gA, 'w');

console.log(`Posição com Dama em h3 (dist 2 do Rei g1):`);
console.log(`  Tropism on White King: ${tropA.tropismWhiteKing} cp`);
console.log(`  King Attackers on White King: ${attA}`);
console.log(`  Pawn Shield White: ${shieldA} pawns`);
console.log(`  Legal Mobility White: ${mobA} moves`);
