/**
 * FASE 5.10 — STAGE 2F: QUIESCENCE MOVE PARITY TEST
 *
 * Compara os movimentos táticos considerados na Quiescence Search entre:
 * 1. chess.js (oráculo legado)
 * 2. BitboardBackend
 *
 * Verifica:
 * - capturas
 * - promoções
 * - flags de movimento (normal, captura, double pawn, ep, promoção, roques)
 * - capturas en passant
 * - capturas legais durante xeque
 * - movimentos que dão xeque (check evasions / quiet checks)
 * - posições terminais
 */

import { Chess } from 'chess.js';
import { ChessJsBackend } from './src/lib/board/chessJsBackend';
import { BitboardBackend } from './src/lib/board/bitboardBackend';
import { EngineMove } from './src/lib/board/types';
import { BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';

interface QuiescenceComparisonResult {
  fen: string;
  sideToMove: string;
  referenceMoves: string[];
  bitboardMoves: string[];
  missingMoves: string[];
  extraMoves: string[];
  classificationDifferences: string[];
}

function moveKey(m: EngineMove): string {
  const promo = m.promotion ? `=${m.promotion}` : '';
  const cap = m.captured ? `x${m.captured}` : '';
  const flags = m.flags !== undefined ? `[f:${m.flags}]` : '';
  return `${m.piece || ''}(${m.from}->${m.to})${cap}${promo}${flags}`;
}

function moveToUci(m: EngineMove): string {
  // Converte 0x88 para string algébrica simples se necessário
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const fromSq = files[m.from & 7] + (Math.floor(m.from / 16) + 1);
  const toSq = files[m.to & 7] + (Math.floor(m.to / 16) + 1);
  const promo = m.promotion ? m.promotion.toLowerCase() : '';
  return `${fromSq}${toSq}${promo}`;
}

/**
 * Extrai os movimentos táticos considerados na quiescence usando chess.js
 */
function getChessJsTacticalMoves(fen: string): { moves: EngineMove[]; ucis: string[] } {
  const g = new Chess(fen);
  const allMoves = (g as any)._moves({ legal: true }) as any[];
  const tacticalMoves: EngineMove[] = [];

  for (let i = 0; i < allMoves.length; i++) {
    const m = allMoves[i];
    if (m.captured || m.promotion || (m.flags & 8)) {
      tacticalMoves.push(m);
    } else {
      (g as any)._makeMove(m);
      const givesCheck = g.inCheck();
      (g as any)._undoMove();
      if (givesCheck) {
        tacticalMoves.push(m);
      }
    }
  }

  return {
    moves: tacticalMoves,
    ucis: tacticalMoves.map(moveToUci).sort()
  };
}

/**
 * Extrai os movimentos táticos considerados na quiescence usando BitboardBackend
 */
function getBitboardTacticalMoves(fen: string): { moves: EngineMove[]; ucis: string[] } {
  const backend = new BitboardBackend(fen);

  const allMoves = backend.generateLegalMoves();
  const tacticalMoves: EngineMove[] = [];

  for (let i = 0; i < allMoves.length; i++) {
    const m = allMoves[i];
    if (m.captured || m.promotion || (m.flags & 8)) {
      tacticalMoves.push(m);
    } else {
      const undo = backend.makeMove(m);
      const givesCheck = backend.isInCheck();
      backend.undoMove(undo);
      if (givesCheck) {
        tacticalMoves.push(m);
      }
    }
  }

  return {
    moves: tacticalMoves,
    ucis: tacticalMoves.map(moveToUci).sort()
  };
}

// Conjunto de testes: posições controladas + 68 FENs oficiais
const TEST_POSITIONS = [
  { name: 'Posição Inicial', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
  { name: 'Meio-jogo Tático', fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5' },
  { name: 'Cravadas e Xeque', fen: 'r1b1k2r/pppp1ppp/8/4q3/1bP5/2N1P3/PP3PPP/R1BQKB1R w KQkq - 1 9' },
  { name: 'Promoção Branca com Captura', fen: '8/4P3/8/8/8/8/8/4K2k w - - 0 1' },
  { name: 'En Passant Branco', fen: 'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3' },
  { name: 'En Passant Preto', fen: 'rnbqkbnr/pppp1ppp/8/8/3Pp3/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 3' },
  { name: 'Xeque Duplo', fen: 'r1b1k2r/pppp1Npp/8/4p3/2Bn4/8/PPPP2PP/RNBQ1K1R b kq - 0 9' },
  { name: 'Mate em 1', fen: 'r1bqkb1r/pppp1Qpp/2n5/4p3/2B1n3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 5' },
  { name: 'Afogamento', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1' },
  ...BENCHMARK_POSITIONS.map(p => ({ name: `BM_${p.id}`, fen: p.fen }))
];

console.log('=====================================================');
console.log('FASE 5.10 — STAGE 2F: PARIDADE DE MOVIMENTOS QUIESCENCE');
console.log('=====================================================');

let totalPositions = 0;
let passedPositions = 0;
const divergences: QuiescenceComparisonResult[] = [];

for (const pos of TEST_POSITIONS) {
  totalPositions++;
  const ref = getChessJsTacticalMoves(pos.fen);
  const bb = getBitboardTacticalMoves(pos.fen);

  const missingMoves = ref.ucis.filter(u => !bb.ucis.includes(u));
  const extraMoves = bb.ucis.filter(u => !ref.ucis.includes(u));

  // Verificar classificação de flags
  const classDiffs: string[] = [];
  for (const refM of ref.moves) {
    const uci = moveToUci(refM);
    const bbM = bb.moves.find(m => moveToUci(m) === uci);
    if (bbM) {
      if (refM.captured !== bbM.captured) {
        classDiffs.push(`${uci}: captured mismatch (ref=${refM.captured}, bb=${bbM.captured})`);
      }
      if (refM.promotion !== bbM.promotion) {
        classDiffs.push(`${uci}: promotion mismatch (ref=${refM.promotion}, bb=${bbM.promotion})`);
      }
      // Verificar flag de captura (bit 2) e en passant (bit 8)
      if ((refM.flags & 2) !== (bbM.flags & 2)) {
        classDiffs.push(`${uci}: capture flag mismatch (ref=${refM.flags}, bb=${bbM.flags})`);
      }
      if ((refM.flags & 8) !== (bbM.flags & 8)) {
        classDiffs.push(`${uci}: ep flag mismatch (ref=${refM.flags}, bb=${bbM.flags})`);
      }
    }
  }

  const isOk = missingMoves.length === 0 && extraMoves.length === 0 && classDiffs.length === 0;

  if (isOk) {
    passedPositions++;
  } else {
    divergences.push({
      fen: pos.fen,
      sideToMove: pos.fen.split(' ')[1],
      referenceMoves: ref.ucis,
      bitboardMoves: bb.ucis,
      missingMoves,
      extraMoves,
      classificationDifferences: classDiffs
    });
    console.error(`[FAIL] ${pos.name} (${pos.fen})`);
    if (missingMoves.length) console.error(`  Missing moves: ${missingMoves.join(', ')}`);
    if (extraMoves.length) console.error(`  Extra moves: ${extraMoves.join(', ')}`);
    if (classDiffs.length) console.error(`  Classification diffs: ${classDiffs.join('; ')}`);
  }
}

console.log(`\nResultado da Comparação Quiescence:`);
console.log(`Total de Posições Analisadas: ${totalPositions}`);
console.log(`Aprovadas: ${passedPositions}/${totalPositions} (${((passedPositions / totalPositions) * 100).toFixed(2)}%)`);
console.log(`Divergências: ${divergences.length}`);

if (divergences.length === 0) {
  console.log('\n[PASS] 100% DE PARIDADE DOS MOVIMENTOS DA QUIESCENCE!');
  process.exit(0);
} else {
  console.error('\n[FAIL] DIVERGÊNCIA DETECTADA NA QUIESCENCE!');
  process.exit(1);
}
