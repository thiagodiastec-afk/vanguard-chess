import { Chess } from 'chess.js';
import {
  evaluateBoard,
  countMobility,
  evaluateMobility,
  mobilityConfig,
  pawnStructureConfig,
  countDoubledPawns,
  countIsolatedPawns
} from './src/lib/engine';

// Define 6 representative positions
export const POSITIONS = {
  open: 'r1bqk2r/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5', // Open Italian
  closed: 'r1bqk2r/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQK2R w KQkq - 0 7', // Closed Queen's Gambit
  middlegame: 'r1b2rk1/1pq1bppp/p1np4/4p3/4P3/1NN1BP2/PPP3PP/2KR1Q1R w - - 0 13', // Sicilian Richter-Rauzer
  endgame: '8/5k2/3p4/2pP1p2/1pP2P2/1P6/6K1/8 w - - 0 1', // King and pawn endgame
  tactical: 'r1b1k2r/ppppqppp/2n5/1B2P3/4n3/5N2/PPPP2PP/RNBQK2R w KQkq - 0 7', // Tactical pin/skewer
  heavy_piece: '2r2rk1/1q3ppp/p3p3/3p4/8/1P1Q4/P4PPP/2R2RK1 w - - 0 20' // Rooks + Queens
};

// 1. Precise breakdown of evaluateBoard()
function benchmarkComponents(fen: string, iterations: number = 5000) {
  const game = new Chess(fen);
  const g = game as any;

  // Measure material / PST / base loop
  const t0 = performance.now();
  for (let iter = 0; iter < iterations; iter++) {
    // simulate base scan (lines 310-352)
    const board = game.board();
    let mgEval = 0;
    let egEval = 0;
    let phase = 0;
    let passedPawnScore = 0;
    let whiteBishops = 0;
    let blackBishops = 0;
    const whitePawnCounts = new Uint8Array(8);
    const blackPawnCounts = new Uint8Array(8);
    type RookEntry = { file: number; color: 'w' | 'b' };
    const rooks: RookEntry[] = [];

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece) {
          if (piece.type === 'n' || piece.type === 'b') phase += 1;
          else if (piece.type === 'r') phase += 2;
          else if (piece.type === 'q') phase += 4;
          if (piece.type === 'b') {
            if (piece.color === 'w') whiteBishops++;
            else blackBishops++;
          }
          if (piece.type === 'p') {
            if (piece.color === 'w') whitePawnCounts[j]++;
            else blackPawnCounts[j]++;
          }
          if (piece.type === 'r') rooks.push({ file: j, color: piece.color });
        }
      }
    }
  }
  const tBase = (performance.now() - t0) / iterations * 1000; // in µs

  // Measure Rook Activity & Pawn Structure
  const t1 = performance.now();
  for (let iter = 0; iter < iterations; iter++) {
    const whitePawnCounts = new Uint8Array(8);
    const blackPawnCounts = new Uint8Array(8);
    countDoubledPawns(whitePawnCounts);
    countDoubledPawns(blackPawnCounts);
    countIsolatedPawns(whitePawnCounts);
    countIsolatedPawns(blackPawnCounts);
  }
  const tPawnRook = (performance.now() - t1) / iterations * 1000;

  // Measure White pseudo-legal move generation
  const t2 = performance.now();
  for (let iter = 0; iter < iterations; iter++) {
    const origTurn = g._turn;
    g._turn = 'w';
    const moves = g._moves({ legal: false });
    g._turn = origTurn;
  }
  const tWhitePseudo = (performance.now() - t2) / iterations * 1000;

  // Measure Black pseudo-legal move generation
  const t3 = performance.now();
  for (let iter = 0; iter < iterations; iter++) {
    const origTurn = g._turn;
    g._turn = 'b';
    const moves = g._moves({ legal: false });
    g._turn = origTurn;
  }
  const tBlackPseudo = (performance.now() - t3) / iterations * 1000;

  // Measure White legal move generation
  const t4 = performance.now();
  for (let iter = 0; iter < iterations; iter++) {
    const origTurn = g._turn;
    g._turn = 'w';
    const moves = g._moves({ legal: true });
    g._turn = origTurn;
  }
  const tWhiteLegal = (performance.now() - t4) / iterations * 1000;

  // Measure Black legal move generation
  const t5 = performance.now();
  for (let iter = 0; iter < iterations; iter++) {
    const origTurn = g._turn;
    g._turn = 'b';
    const moves = g._moves({ legal: true });
    g._turn = origTurn;
  }
  const tBlackLegal = (performance.now() - t5) / iterations * 1000;

  // Measure King exclusion counting
  const wMoves = g._moves({ legal: true });
  const t6 = performance.now();
  for (let iter = 0; iter < iterations; iter++) {
    let count = 0;
    for (let i = 0; i < wMoves.length; i++) {
      const p = wMoves[i].piece;
      if (p !== 'k' && p !== 'K') count++;
    }
  }
  const tCounting = (performance.now() - t6) / iterations * 1000;

  // Measure evaluateBoard() baseline (mobility off)
  mobilityConfig.bonusPerMove = 0;
  const t7 = performance.now();
  for (let iter = 0; iter < iterations; iter++) {
    evaluateBoard(game);
  }
  const tEvalBaseline = (performance.now() - t7) / iterations * 1000;

  // Measure evaluateBoard() with mobility on (+2 cp)
  mobilityConfig.bonusPerMove = 2;
  const t8 = performance.now();
  for (let iter = 0; iter < iterations; iter++) {
    evaluateBoard(game);
  }
  const tEvalMobility = (performance.now() - t8) / iterations * 1000;

  return {
    tBase,
    tPawnRook,
    tWhitePseudo,
    tBlackPseudo,
    tWhiteLegal,
    tBlackLegal,
    tWhiteLegalityOnly: tWhiteLegal - tWhitePseudo,
    tBlackLegalityOnly: tBlackLegal - tBlackPseudo,
    tCounting: tCounting * 2, // for both sides
    tEvalBaseline,
    tEvalMobility,
    mobilityOverheadUs: tEvalMobility - tEvalBaseline
  };
}

async function run() {
  console.log('=== FASE 5.4F.1: DECOMPOSIÇÃO DO CUSTO DE MOBILITY ===\n');

  for (const [name, fen] of Object.entries(POSITIONS)) {
    console.log(`--- Posição: ${name.toUpperCase()} ---`);
    console.log(`FEN: ${fen}`);
    const res = benchmarkComponents(fen, 3000);
    console.log(`  evaluateBoard Baseline (sem Mobility): ${res.tEvalBaseline.toFixed(2)} µs`);
    console.log(`  evaluateBoard + Mobility Legal (+2cp): ${res.tEvalMobility.toFixed(2)} µs`);
    console.log(`  Overhead Mobility:                     ${res.mobilityOverheadUs.toFixed(2)} µs (+${((res.mobilityOverheadUs / res.tEvalBaseline) * 100).toFixed(1)}%)`);
    console.log(`  Decomposição Mobility:`);
    console.log(`    White movegen (pseudo-legal):        ${res.tWhitePseudo.toFixed(2)} µs`);
    console.log(`    White legality check (_make/_undo):  ${Math.max(0, res.tWhiteLegalityOnly).toFixed(2)} µs`);
    console.log(`    White total legal movegen:           ${res.tWhiteLegal.toFixed(2)} µs`);
    console.log(`    Black movegen (pseudo-legal):        ${res.tBlackPseudo.toFixed(2)} µs`);
    console.log(`    Black legality check (_make/_undo):  ${Math.max(0, res.tBlackLegalityOnly).toFixed(2)} µs`);
    console.log(`    Black total legal movegen:           ${res.tBlackLegal.toFixed(2)} µs`);
    console.log(`    Counting (excluindo rei):            ${res.tCounting.toFixed(2)} µs`);
    console.log(`    Total Pseudo (W+B):                  ${(res.tWhitePseudo + res.tBlackPseudo).toFixed(2)} µs`);
    console.log(`    Total Legality Check (W+B):          ${(Math.max(0, res.tWhiteLegalityOnly) + Math.max(0, res.tBlackLegalityOnly)).toFixed(2)} µs`);
    console.log(`    Percentual do tempo em Legality:     ${(((res.tWhiteLegalityOnly + res.tBlackLegalityOnly) / (res.tWhiteLegal + res.tBlackLegal)) * 100).toFixed(1)}%\n`);
  }
}

run();
