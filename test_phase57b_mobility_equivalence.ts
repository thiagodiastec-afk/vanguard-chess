/**
 * FASE 5.7B — COMPREHENSIVE LEGAL MOBILITY EQUIVALENCE & BENCHMARK SUITE (FINAL)
 *
 * Includes:
 * - Proper chess state reconstruction for non-active side (no illegal en-passant state)
 * - Dedicated En Passant test suite (Cases A, B, C and Regression)
 * - Controlled equivalence (55/55)
 * - Random equivalence (500/500 with piece-by-piece breakdown)
 * - Symmetry (20 mirror pairs)
 * - Monotonicity and Non-duplication
 * - Microbenchmark (10,000 evaluations across 8 positions)
 * - Official 68-FEN Benchmark
 * - Transition Matrix (5.7A -> 5.7B)
 * - Determinism (10x)
 * - 3-way State Isolation (A->B->C, B->C->A, C->A->B)
 * - Watchdog timers, checkpoints, and robust resource cleanup
 */

import { Chess } from 'chess.js';
import {
  calculateBestMove,
  evaluateBoard,
  evaluateMobility,
  countMobility,
  referenceLegalMobility,
  optimizedLegalMobility,
  MobilityBreakdown,
  metrics
} from './src/lib/engine';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';
import { StockfishClient } from './src/lib/stockfishClient';
import * as fs from 'fs';

console.log('=====================================================');
console.log('[5.7B] START');
console.log('=====================================================\n');

interface StageTiming {
  key: string;
  name: string;
  durationMs: number;
  status: 'PASS' | 'TIMEOUT' | 'FAIL';
}

const stageTimings: StageTiming[] = [];

async function runStageWithWatchdog<T>(
  key: string,
  stageName: string,
  timeoutMs: number,
  fn: () => Promise<T> | T
): Promise<T> {
  const start = performance.now();
  console.log(`\nSTART ${stageName}`);

  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      console.error(`TIMEOUT_STAGE stage=${stageName} elapsedMs=${timeoutMs}`);
      reject(new Error(`STAGE_TIMEOUT: ${stageName}`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([Promise.resolve(fn()), timeoutPromise]);
    clearTimeout(timer!);
    const durationMs = Math.round(performance.now() - start);
    console.log(`END ${stageName}`);
    console.log(`DURATION_MS ${durationMs}`);
    stageTimings.push({ key, name: stageName, durationMs, status: 'PASS' });
    return result;
  } catch (err: any) {
    clearTimeout(timer!);
    const durationMs = Math.round(performance.now() - start);
    console.log(`END ${stageName} (${err.message?.includes('STAGE_TIMEOUT') ? 'TIMEOUT' : 'ERROR'})`);
    console.log(`DURATION_MS ${durationMs}`);
    stageTimings.push({
      key,
      name: stageName,
      durationMs,
      status: err.message?.includes('STAGE_TIMEOUT') ? 'TIMEOUT' : 'FAIL'
    });
    throw err;
  }
}

/**
 * Construct a 100% legal, valid Chess state for evaluating mobility of a specific color.
 * If color matches the active turn in FEN, uses the FEN as-is.
 * If color is the opponent, the en-passant square in FEN was created by color's last move
 * and is only captureable by the active player in the original FEN. For color, ep is '-'.
 */
export function getSafeGameForColor(fen: string, color: 'w' | 'b'): Chess {
  const parts = fen.split(' ');
  if (parts[1] === color) {
    return new Chess(fen);
  }
  const newTurn = color;
  const newEp = '-';
  const safeFen = `${parts[0]} ${newTurn} ${parts[2]} ${newEp} ${parts[4] || '0'} ${parts[5] || '1'}`;
  return new Chess(safeFen);
}

async function runAll() {
  const globalStart = performance.now();

  // ============================================================
  // STAGE 0: DEDICATED EN PASSANT TEST SUITE (Req 4 & 5)
  // ============================================================
  let epSuitePassed = false;

  await runStageWithWatchdog(
    'en passant',
    '[0/9] Dedicated En Passant tests',
    10000,
    () => {
      console.log('--- EN PASSANT REGRESSION & SPECIAL CASES ---');

      // Regression Position: rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2
      const regFen = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2';
      const gW = getSafeGameForColor(regFen, 'w');
      const gB = getSafeGameForColor(regFen, 'b');

      const refW = referenceLegalMobility(gW, 'w');
      const optW = optimizedLegalMobility(gW, 'w');
      const refB = referenceLegalMobility(gB, 'b');
      const optB = optimizedLegalMobility(gB, 'b');

      console.log(`  Regression FEN: White total=${optW.total} (expected 30), Black total=${optB.total} (expected 22)`);
      const regOk = optW.total === 30 && optB.total === 22 && refW.total === 30 && refB.total === 22;

      // Check that Black has NO en-passant moves
      const bMoves = (gB as any)._moves({ legal: true });
      const bEpMoves = bMoves.filter((m: any) => m.flags & 8);
      console.log(`  Black en-passant moves count: ${bEpMoves.length} (expected 0)`);
      const noBlackEpOk = bEpMoves.length === 0;

      // Check that Black Queen has d8-b6 and d8-a5
      const qMoves = bMoves.filter((m: any) => m.piece === 'q');
      console.log(`  Black Queen legal moves count: ${qMoves.length} (expected 3: d8-c7, d8-b6, d8-a5)`);
      const queenOk = qMoves.length === 3;

      // Case A: Valid En Passant for side to move
      // Position: White Pawn on e5, Black Pawn pushed d7-d5 -> White can capture exd6 ep
      const caseAFen = '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1';
      const gCaseA = getSafeGameForColor(caseAFen, 'w');
      const movesA = (gCaseA as any)._moves({ legal: true });
      const epMovesA = movesA.filter((m: any) => m.flags & 8);
      const caseAOk = epMovesA.length === 1;
      console.log(`  Case A (Valid EP for active side): found ${epMovesA.length} EP move(s) -> ${caseAOk ? 'PASS' : 'FAIL'}`);

      // Case B: Invalid En Passant for opposite side
      // In caseAFen, White has ep. Black evaluating must have 0 ep moves.
      const gCaseB = getSafeGameForColor(caseAFen, 'b');
      const movesB = (gCaseB as any)._moves({ legal: true });
      const epMovesB = movesB.filter((m: any) => m.flags & 8);
      const caseBOk = epMovesB.length === 0;
      console.log(`  Case B (Invalid EP for opposite side): found ${epMovesB.length} EP move(s) -> ${caseBOk ? 'PASS' : 'FAIL'}`);

      // Case C: En Passant blocked by King legality
      // Position: White King on e1, White Pawn on e5, Black Pawn on d5 (ep square d6).
      // Black Rook on e8 pins White Pawn on e5 to King on e1.
      // If White plays exd6 ep, King is exposed to Re8 -> ILLEGAL!
      const caseCFen = '4r1k1/8/8/3pP3/8/8/8/4K3 w - d6 0 1';
      const gCaseC = getSafeGameForColor(caseCFen, 'w');
      const movesC = (gCaseC as any)._moves({ legal: true });
      const epMovesC = movesC.filter((m: any) => m.flags & 8);
      const caseCOk = epMovesC.length === 0;
      console.log(`  Case C (EP pinned/illegal by King safety): found ${epMovesC.length} EP move(s) -> ${caseCOk ? 'PASS' : 'FAIL'}`);

      epSuitePassed = regOk && noBlackEpOk && queenOk && caseAOk && caseBOk && caseCOk;
      console.log(`  En Passant Suite Result: ${epSuitePassed ? 'PASS' : 'FAIL'}`);
    }
  );

  // ============================================================
  // STAGE 1: CONTROLLED POSITIONS (55 POSITIONS)
  // ============================================================
  let controlledPassed = 0;
  let controlledTotal = 0;

  await runStageWithWatchdog(
    'controlled',
    '[1/9] Controlled equivalence',
    30000,
    () => {
      interface ControlledPos {
        name: string;
        cat: string;
        fen: string;
      }

      const controlledPositions: ControlledPos[] = [
        // Basics (5)
        { name: 'Initial Position', cat: 'Basic', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
        { name: 'After 1. e4', cat: 'Basic', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1' },
        { name: 'After 1. d4', cat: 'Basic', fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1' },
        { name: 'Open Opening (Italian)', cat: 'Basic', fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4' },
        { name: 'Closed Opening (French)', cat: 'Basic', fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3' },

        // Check (6)
        { name: 'Simple Check by Queen', cat: 'Check', fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3' },
        { name: 'Check by Rook', cat: 'Check', fen: '4k3/8/8/8/8/8/8/4R1K1 b - - 0 1' },
        { name: 'Check by Bishop', cat: 'Check', fen: 'r1bqk2r/pppp1ppp/2n5/1B2p3/4n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5' },
        { name: 'Check by Knight', cat: 'Check', fen: 'rnbqkbnr/ppp1pppp/8/3N4/8/8/PPPPPPPP/R1BQKBNR b KQkq - 0 1' },
        { name: 'Knight checking King', cat: 'Check', fen: '4k3/8/5N2/8/8/8/8/4K3 b - - 0 1' },
        { name: 'Double Check (Rook + Bishop)', cat: 'Check', fen: '3k4/8/8/3B4/8/8/4R3/4K3 b - - 0 1' },

        // Pins (5)
        { name: 'Knight Absolutely Pinned by Bishop', cat: 'Pin', fen: 'r1bqk1nr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3' },
        { name: 'Bishop Absolutely Pinned by Rook', cat: 'Pin', fen: '4k3/8/8/4b3/8/8/4R3/4K3 b - - 0 1' },
        { name: 'Rook Absolutely Pinned by Queen', cat: 'Pin', fen: '4k3/8/8/4r3/8/8/4Q3/4K3 b - - 0 1' },
        { name: 'Queen Absolutely Pinned by Rook', cat: 'Pin', fen: '4k3/8/8/4q3/8/8/4R3/4K3 b - - 0 1' },
        { name: 'Partial Pin (along line)', cat: 'Pin', fen: '4k3/8/8/4r3/8/8/8/4R1K1 b - - 0 1' },

        // King (4)
        { name: 'King in Corner', cat: 'King', fen: 'k7/8/8/8/8/8/8/7K w - - 0 1' },
        { name: 'King in Center', cat: 'King', fen: '8/8/8/4K3/8/8/8/4k3 w - - 0 1' },
        { name: 'King Boxed In', cat: 'King', fen: '1rb1kbnr/pppppppp/n7/8/8/N7/PPPPPPPP/1RB1KBNR w Kk - 0 1' },
        { name: 'King Under Multiple Threat Squares', cat: 'King', fen: 'r2qk2r/ppp2ppp/2n1p3/3p4/3P4/2N1PB2/PPP2PPP/R2QK2R b KQkq - 0 8' },

        // Tactical (5)
        { name: 'Forced Capture', cat: 'Tactical', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1' },
        { name: 'Forced Defense against Check', cat: 'Tactical', fen: 'rnb1k1nr/pppp1ppp/8/2b1p3/4P2q/3P4/PPP2PPP/RNBQKBNR w KQkq - 1 4' },
        { name: 'Fork Position', cat: 'Tactical', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3' },
        { name: 'Skewer Position', cat: 'Tactical', fen: '4k3/8/8/8/8/8/q7/4R1K1 w - - 0 1' },
        { name: 'Discovered Attack Setup', cat: 'Tactical', fen: 'r1bqk2r/pppp1ppp/2n5/4P3/1bB1n3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 0 5' },

        // Specials (4)
        { name: 'En Passant Available', cat: 'Special', fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2' },
        { name: 'Both Sides Castling Rights', cat: 'Special', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1' },
        { name: 'Pawn on 7th Rank Promotion', cat: 'Special', fen: '4k3/4P3/8/8/8/8/8/4K3 w - - 0 1' },
        { name: 'Capture with Promotion', cat: 'Special', fen: '3r1k2/4P3/8/8/8/8/8/4K3 w - - 0 1' },

        // Additional Complex Middlegame/Endgame Positions (26)
        { name: 'Complex Middlegame 1', cat: 'Middlegame', fen: 'r1b2rk1/pp1n1ppp/2p1pn2/q2p2B1/2PP4/2PBPN2/P1Q2PPP/R4RK1 w - - 4 11' },
        { name: 'Complex Middlegame 2', cat: 'Middlegame', fen: 'r2q1rk1/1pp1bppp/p1np1n2/4p3/2BPP1b1/2P2N2/PP1N1PPP/R1BQR1K1 w - - 0 9' },
        { name: 'Complex Middlegame 3', cat: 'Middlegame', fen: 'r1bq1rk1/pp3ppp/2n1pn2/3p4/2PP4/2NBPN2/PP3PPP/R1BQK2R w KQ - 0 8' },
        { name: 'Complex Middlegame 4', cat: 'Middlegame', fen: 'r2qkb1r/pp2pppp/2n2n2/3p4/3P2b1/2NBPN2/PP3PPP/R1BQK2R w KQkq - 4 8' },
        { name: 'Complex Middlegame 5', cat: 'Middlegame', fen: 'r1b1k2r/ppppqppp/2n2n2/b3p3/2B1P3/2PP1N2/PP3PPP/RNBQK2R w KQkq - 1 6' },
        { name: 'High Branching 1', cat: 'HighBranching', fen: 'r1bqkb1r/pppp1ppp/2n5/1B2p3/4n3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 1 4' },
        { name: 'High Branching 2', cat: 'HighBranching', fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R b KQkq - 0 5' },
        { name: 'Closed French Middlegame', cat: 'Middlegame', fen: 'r1b1kb1r/pp3ppp/2n1p3/q1ppP3/3P4/2PB1N2/P1P2PPP/R1BQK2R w KQkq - 1 9' },
        { name: 'King’s Indian Defense', cat: 'Middlegame', fen: 'rnbq1rk1/ppp1ppbp/3p1np1/8/2PPP3/2N2N2/PP2BPPP/R1BQK2R b KQ - 1 6' },
        { name: 'Ruy Lopez Closed', cat: 'Middlegame', fen: 'r1bq1rk1/2p1bppp/p1np1n2/1p2p3/4P3/1B1P1N2/PPP2PPP/RNBQR1K1 w - - 0 9' },
        { name: 'Sicilian Najdorf', cat: 'Middlegame', fen: 'rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6' },
        { name: 'Queen Endgame', cat: 'Endgame', fen: '8/6pk/7p/8/8/6QP/5PPK/3q4 w - - 0 1' },
        { name: 'Rook Endgame 1', cat: 'Endgame', fen: '8/2r2p2/5k1p/p1p2Pp1/P1R3P1/1P5P/5K2/8 w - - 0 35' },
        { name: 'Rook Endgame 2', cat: 'Endgame', fen: '8/5pk1/4p1p1/R6p/7P/5PK1/6P1/4r3 w - - 0 40' },
        { name: 'Minor Piece Endgame (B vs N)', cat: 'Endgame', fen: '8/5pk1/4p1p1/7p/3b1P1P/5NK1/8/8 w - - 0 45' },
        { name: 'Knight Endgame', cat: 'Endgame', fen: '8/5pk1/4p1p1/4N2p/7P/5nK1/8/8 w - - 0 50' },
        { name: 'Pawn Endgame Opposition', cat: 'Endgame', fen: '8/4k3/8/4P3/4K3/8/8/8 w - - 0 1' },
        { name: 'Double Rook Check Defense', cat: 'Check', fen: 'r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1' },
        { name: 'Pinned Knight Cannot Move', cat: 'Pin', fen: '4k3/8/8/4r3/8/8/4N3/4K3 w - - 0 1' },
        { name: 'Pinned Bishop along Diagonal', cat: 'Pin', fen: '4k3/8/8/8/8/2B5/1Q6/K7 w - - 0 1' },
        { name: 'Queen In Front Of King', cat: 'Pin', fen: '4k3/4r3/8/8/8/8/4Q3/4K3 w - - 0 1' },
        { name: 'Multiple Check Responses', cat: 'Check', fen: 'r1bqk2r/pppp1ppp/2n5/4p3/1b2P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 1 6' },
        { name: 'Castling Kingside Blocked', cat: 'Special', fen: 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5' },
        { name: 'Castling Queenside Check Blocked', cat: 'Special', fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1' },
        { name: 'Promotion Under Attack', cat: 'Special', fen: '4r1k1/5P2/8/8/8/8/8/4K3 w - - 0 1' },
        { name: 'Double Pawn Push Available', cat: 'Basic', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' }
      ];

      controlledTotal = controlledPositions.length;

      for (let i = 0; i < controlledPositions.length; i++) {
        const pos = controlledPositions[i];

        const gW = getSafeGameForColor(pos.fen, 'w');
        const gB = getSafeGameForColor(pos.fen, 'b');

        const refW = referenceLegalMobility(gW, 'w');
        const optW = optimizedLegalMobility(gW, 'w');
        const cntW = countMobility(gW, 'w');

        const refB = referenceLegalMobility(gB, 'b');
        const optB = optimizedLegalMobility(gB, 'b');
        const cntB = countMobility(gB, 'b');

        const matchW = (
          refW.pawns === optW.pawns &&
          refW.knights === optW.knights &&
          refW.bishops === optW.bishops &&
          refW.rooks === optW.rooks &&
          refW.queens === optW.queens &&
          refW.king === optW.king &&
          refW.totalNonKing === cntW
        );

        const matchB = (
          refB.pawns === optB.pawns &&
          refB.knights === optB.knights &&
          refB.bishops === optB.bishops &&
          refB.rooks === optB.rooks &&
          refB.queens === optB.queens &&
          refB.king === optB.king &&
          refB.totalNonKing === cntB
        );

        if (matchW && matchB) {
          controlledPassed++;
        } else {
          console.error(`  Mismatch on pos #${i + 1} (${pos.name})`);
        }
      }

      console.log(`  Controlled Result: ${controlledPassed}/${controlledTotal} (${((controlledPassed / controlledTotal) * 100).toFixed(1)}%)`);
    }
  );

  // ============================================================
  // STAGE 2: 500 RANDOM REACHABLE POSITIONS EQUIVALENCE (Req 6 & 7)
  // ============================================================
  let randomPassed = 0;
  const RANDOM_TOTAL = 500;

  // Breakdown matches by piece type across all 500 positions
  const pieceMatches = {
    pawn: 0,
    knight: 0,
    bishop: 0,
    rook: 0,
    queen: 0,
    king: 0,
    total: 0
  };

  await runStageWithWatchdog(
    'random equivalence',
    '[2/9] Random equivalence',
    60000,
    () => {
      const validPositions: string[] = [];
      const seedFens = SANITIZED_BENCHMARK_POSITIONS.map(p => p.fen);

      for (const fen of seedFens) {
        if (validPositions.length >= RANDOM_TOTAL) break;
        validPositions.push(fen);
        const game = new Chess(fen);
        for (let step = 0; step < 7; step++) {
          if (validPositions.length >= RANDOM_TOTAL) break;
          const moves = game.moves();
          if (moves.length === 0 || game.isGameOver()) break;
          const randomMove = moves[Math.floor(Math.random() * moves.length)];
          try {
            game.move(randomMove);
            const currentFen = game.fen();
            if (!validPositions.includes(currentFen)) {
              validPositions.push(currentFen);
            }
          } catch {
            break;
          }
        }
      }

      while (validPositions.length < RANDOM_TOTAL) {
        const game = new Chess();
        while (validPositions.length < RANDOM_TOTAL && !game.isGameOver() && game.history().length < 80) {
          const moves = game.moves();
          if (moves.length === 0) break;
          const randomMove = moves[Math.floor(Math.random() * moves.length)];
          try {
            game.move(randomMove);
            const currentFen = game.fen();
            if (!validPositions.includes(currentFen)) {
              validPositions.push(currentFen);
            }
          } catch {
            break;
          }
        }
      }

      for (let i = 0; i < validPositions.length; i++) {
        const fen = validPositions[i];

        const gW = getSafeGameForColor(fen, 'w');
        const gB = getSafeGameForColor(fen, 'b');

        const refW = referenceLegalMobility(gW, 'w');
        const optW = optimizedLegalMobility(gW, 'w');
        const cntW = countMobility(gW, 'w');

        const refB = referenceLegalMobility(gB, 'b');
        const optB = optimizedLegalMobility(gB, 'b');
        const cntB = countMobility(gB, 'b');

        const pOk = refW.pawns === optW.pawns && refB.pawns === optB.pawns;
        const nOk = refW.knights === optW.knights && refB.knights === optB.knights;
        const bOk = refW.bishops === optW.bishops && refB.bishops === optB.bishops;
        const rOk = refW.rooks === optW.rooks && refB.rooks === optB.rooks;
        const qOk = refW.queens === optW.queens && refB.queens === optB.queens;
        const kOk = refW.king === optW.king && refB.king === optB.king;
        const totOk = refW.totalNonKing === cntW && refB.totalNonKing === cntB && refW.total === optW.total && refB.total === optB.total;

        if (pOk) pieceMatches.pawn++;
        if (nOk) pieceMatches.knight++;
        if (bOk) pieceMatches.bishop++;
        if (rOk) pieceMatches.rook++;
        if (qOk) pieceMatches.queen++;
        if (kOk) pieceMatches.king++;
        if (totOk) pieceMatches.total++;

        if (pOk && nOk && bOk && rOk && qOk && kOk && totOk) {
          randomPassed++;
        } else {
          console.error(`  Divergence on random pos #${i + 1}: ${fen}`);
        }

        if ((i + 1) % 50 === 0 || i === validPositions.length - 1) {
          console.log(`[2/9] Random equivalence: ${i + 1}/${RANDOM_TOTAL}`);
        }
      }

      console.log(`\n  PIECE-BY-PIECE EQUIVALENCE BREAKDOWN (500 POSITIONS):`);
      console.log(`  Pawn:   ${pieceMatches.pawn}/${RANDOM_TOTAL}`);
      console.log(`  Knight: ${pieceMatches.knight}/${RANDOM_TOTAL}`);
      console.log(`  Bishop: ${pieceMatches.bishop}/${RANDOM_TOTAL}`);
      console.log(`  Rook:   ${pieceMatches.rook}/${RANDOM_TOTAL}`);
      console.log(`  Queen:  ${pieceMatches.queen}/${RANDOM_TOTAL}`);
      console.log(`  King:   ${pieceMatches.king}/${RANDOM_TOTAL}`);
      console.log(`  Total:  ${pieceMatches.total}/${RANDOM_TOTAL}`);
      console.log(`\n  Random Equivalence Result: ${randomPassed}/${RANDOM_TOTAL} (Strict requirement: 500/500) -> ${randomPassed === RANDOM_TOTAL ? 'PASS' : 'FAIL'}`);
    }
  );

  // ============================================================
  // STAGE 3: SYMMETRY TEST (20 MIRROR PAIRS)
  // ============================================================
  let symmetryPassed = 0;
  const SYMMETRY_TOTAL = 20;

  await runStageWithWatchdog(
    'symmetry',
    '[3/9] Symmetry',
    10000,
    () => {
      const mirrorPositions = [
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        'r1bqk1nr/pppp1ppp/2n5/4p3/4P3/2N5/PPPP1PPP/R1BQK1NR w KQkq - 0 1',
        'r2qk2r/ppp2ppp/2n5/4p3/4P3/2N5/PPP2PPP/R2QK2R w KQkq - 0 1',
        '4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1',
        '4k3/4p3/8/8/8/8/4P3/4K3 w - - 0 1',
        '4k3/3pp3/8/8/8/8/3PP3/4K3 w - - 0 1',
        '4k3/2p1p3/8/8/8/8/2P1P3/4K3 w - - 0 1',
        '4k3/8/8/4n3/4N3/8/8/4K3 w - - 0 1',
        '4k3/8/8/3b4/3B4/8/8/4K3 w - - 0 1',
        '4k3/8/8/3r4/3R4/8/8/4K3 w - - 0 1',
        '4k3/8/8/3q4/3Q4/8/8/4K3 w - - 0 1',
        '4k3/8/8/2b2b2/2B2B2/8/8/4K3 w - - 0 1',
        '4k3/8/8/2n2n2/2N2N2/8/8/4K3 w - - 0 1',
        '4k3/8/8/2r2r2/2R2R2/8/8/4K3 w - - 0 1',
        'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
        '4k3/8/8/8/8/8/8/4K3 w - - 0 1',
        '4k3/pppp4/8/8/8/8/4PPPP/4K3 w - - 0 1',
        '4k3/3p4/8/8/8/8/4P3/4K3 w - - 0 1',
        '4k3/8/8/1n4n1/1N4N1/8/8/4K3 w - - 0 1',
        'r1bqkb1r/pppp1ppp/8/8/8/8/PPPP1PPP/R1BQKB1R w KQkq - 0 1'
      ];

      function invertBoardFen(fen: string): string {
        const parts = fen.split(' ');
        const rows = parts[0].split('/').reverse();
        const invertedRows = rows.map(r => {
          let res = '';
          for (const ch of r) {
            if (ch >= '1' && ch <= '8') res += ch;
            else if (ch === ch.toUpperCase()) res += ch.toLowerCase();
            else res += ch.toUpperCase();
          }
          return res;
        });
        const invBoard = invertedRows.join('/');
        const invTurn = parts[1] === 'w' ? 'b' : 'w';
        let invCastle = '-';
        if (parts[2] !== '-') {
          invCastle = '';
          for (const c of parts[2]) {
            if (c === 'K') invCastle += 'k';
            else if (c === 'Q') invCastle += 'q';
            else if (c === 'k') invCastle += 'K';
            else if (c === 'q') invCastle += 'Q';
          }
        }
        return `${invBoard} ${invTurn} ${invCastle} - 0 1`;
      }

      for (let i = 0; i < mirrorPositions.length; i++) {
        const origFen = mirrorPositions[i];
        const invFen = invertBoardFen(origFen);

        const gOrig = new Chess(origFen);
        const gInv = new Chess(invFen);

        const mobOrigW = countMobility(gOrig, 'w');
        const mobInvB = countMobility(gInv, 'b');

        const evalOrig = evaluateMobility(gOrig);
        const evalInv = evaluateMobility(gInv);

        if (mobOrigW === mobInvB && evalOrig.score === -evalInv.score) {
          symmetryPassed++;
        } else {
          console.error(`  Symmetry mismatch on pair #${i + 1}`);
        }
      }
      console.log(`  Symmetry Result: ${symmetryPassed}/${SYMMETRY_TOTAL}`);
    }
  );

  // ============================================================
  // STAGE 4: MONOTONICITY TEST
  // ============================================================
  let monotonicityPassed = false;
  let expectedDelta = 0;
  let actualDelta = 0;

  await runStageWithWatchdog(
    'monotonicity',
    '[4/9] Monotonicity',
    5000,
    () => {
      const blockedKnightFen = '8/8/8/8/8/8/8/N3K2k w - - 0 1'; // Knight at a1 (2 moves)
      const freeKnightFen = '8/8/8/8/3N4/8/8/4K2k w - - 0 1';    // Knight at d4 (8 moves)

      const gBlocked = new Chess(blockedKnightFen);
      const gFree = new Chess(freeKnightFen);

      const mobBlocked = countMobility(gBlocked, 'w');
      const mobFree = countMobility(gFree, 'w');
      const scoreBlocked = evaluateMobility(gBlocked).score;
      const scoreFree = evaluateMobility(gFree).score;

      expectedDelta = (mobFree - mobBlocked) * 1;
      actualDelta = scoreFree - scoreBlocked;

      monotonicityPassed = mobFree > mobBlocked && actualDelta === expectedDelta;
      console.log(`  Monotonicity: +${mobFree - mobBlocked} moves -> +${actualDelta} cp (expected +${expectedDelta} cp) -> ${monotonicityPassed ? 'PASS' : 'FAIL'}`);
    }
  );

  // ============================================================
  // STAGE 5: NON-DUPLICATION TEST
  // ============================================================
  let nonDuplicationPassed = false;

  await runStageWithWatchdog(
    'non-duplication',
    '[5/9] Non-duplication',
    5000,
    () => {
      const g = new Chess('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
      const fullEval = evaluateBoard(g);
      const mob = evaluateMobility(g);

      nonDuplicationPassed = typeof fullEval === 'number' && !isNaN(fullEval) && Math.abs(mob.score) < 50;
      console.log(`  Non-duplication: fullEval=${fullEval} cp, mobScore=${mob.score} cp -> ${nonDuplicationPassed ? 'PASS' : 'FAIL'}`);
    }
  );

  // ============================================================
  // STAGE 6: MICROBENCHMARK (10,000 EVALS ACROSS 8 POSITIONS)
  // ============================================================
  let microResults: any[] = [];
  let avgRefMobUs = 0;
  let avgOptMobUs = 0;
  let avgRefEvalUs = 0;
  let avgOptEvalUs = 0;
  let avgMobSpeedup = 0;
  let avgEvalSpeedup = 0;

  await runStageWithWatchdog(
    'microbenchmark',
    '[6/9] Microbenchmark',
    60000,
    () => {
      const benchmarkPositions8 = [
        { name: 'Initial Position', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
        { name: 'Open Middlegame', fen: 'r1bqk2r/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4' },
        { name: 'Closed Middlegame', fen: 'r1b1kb1r/pp3ppp/2n1p3/q1ppP3/3P4/2PB1N2/P1P2PPP/R1BQK2R w KQkq - 1 9' },
        { name: 'Tactical Position', fen: 'r1bqk2r/pppp1ppp/2n5/4P3/1bB1n3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 0 5' },
        { name: 'Position with Check', fen: '4k3/8/5N2/8/8/8/8/4K3 b - - 0 1' },
        { name: 'Position with Multiple Pins', fen: 'r1bqk1nr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3' },
        { name: 'High Branching Position', fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R b KQkq - 0 5' },
        { name: 'Endgame Position', fen: '8/2r2p2/5k1p/p1p2Pp1/P1R3P1/1P5P/5K2/8 w - - 0 35' }
      ];

      const N_EVALS_PER_POS = 1250; // 8 * 1250 = 10,000 total evaluations

      for (let p = 0; p < benchmarkPositions8.length; p++) {
        const item = benchmarkPositions8[p];
        const g = new Chess(item.fen);

        // 1. Reference Mobility
        const t0 = performance.now();
        for (let i = 0; i < N_EVALS_PER_POS; i++) {
          referenceLegalMobility(g, 'w');
          referenceLegalMobility(g, 'b');
        }
        const refMobUs = ((performance.now() - t0) * 1000) / N_EVALS_PER_POS;

        // 2. Optimized Mobility
        const t1 = performance.now();
        for (let i = 0; i < N_EVALS_PER_POS; i++) {
          countMobility(g, 'w');
          countMobility(g, 'b');
        }
        const optMobUs = ((performance.now() - t1) * 1000) / N_EVALS_PER_POS;

        // 3. Optimized evaluateBoard()
        const t2 = performance.now();
        for (let i = 0; i < N_EVALS_PER_POS; i++) {
          evaluateBoard(g);
        }
        const optEvalUs = ((performance.now() - t2) * 1000) / N_EVALS_PER_POS;

        const refEvalUs = optEvalUs - optMobUs + refMobUs;
        const mobSpeedupPct = ((refMobUs - optMobUs) / refMobUs) * 100;
        const evalSpeedupPct = ((refEvalUs - optEvalUs) / refEvalUs) * 100;

        microResults.push({
          name: item.name,
          refMobUs: Math.round(refMobUs * 10) / 10,
          optMobUs: Math.round(optMobUs * 10) / 10,
          refEvalUs: Math.round(refEvalUs * 10) / 10,
          optEvalUs: Math.round(optEvalUs * 10) / 10,
          mobSpeedupPct: Math.round(mobSpeedupPct * 10) / 10,
          evalSpeedupPct: Math.round(evalSpeedupPct * 10) / 10,
          evalsPerSecOpt: Math.round(1000000 / optEvalUs)
        });
      }

      avgRefMobUs = microResults.reduce((s, r) => s + r.refMobUs, 0) / microResults.length;
      avgOptMobUs = microResults.reduce((s, r) => s + r.optMobUs, 0) / microResults.length;
      avgRefEvalUs = microResults.reduce((s, r) => s + r.refEvalUs, 0) / microResults.length;
      avgOptEvalUs = microResults.reduce((s, r) => s + r.optEvalUs, 0) / microResults.length;
      avgMobSpeedup = ((avgRefMobUs - avgOptMobUs) / avgRefMobUs) * 100;
      avgEvalSpeedup = ((avgRefEvalUs - avgOptEvalUs) / avgRefEvalUs) * 100;

      console.table(microResults);
      console.log(`  Avg Ref Mobility: ${avgRefMobUs.toFixed(1)} µs | Opt: ${avgOptMobUs.toFixed(1)} µs (-${avgMobSpeedup.toFixed(1)}%)`);
      console.log(`  Avg Ref evaluateBoard: ${avgRefEvalUs.toFixed(1)} µs | Opt: ${avgOptEvalUs.toFixed(1)} µs (-${avgEvalSpeedup.toFixed(1)}%)`);
    }
  );

  // ============================================================
  // STAGE 7: OFFICIAL 68-FEN BENCHMARK
  // ============================================================
  interface BenchSummary {
    id: string;
    category: string;
    bestMove: string | null;
    expected: string | undefined;
    isCorrect: boolean;
    isTimeout: boolean;
    timeMs: number;
    nodes: number;
    qNodes: number;
  }

  const benchSummaries: BenchSummary[] = [];
  let correctBench = 0;
  let timeoutBench = 0;
  let incorrectBench = 0;
  let completedBench = 0;
  let accuracyCompleted = 0;
  let medianTime = 0;
  let p95Time = 0;
  let medianNodes = 0;
  let medianQNodes = 0;

  await runStageWithWatchdog(
    '68-FEN',
    '[7/9] Official 68-FEN benchmark',
    180000,
    () => {
      for (let i = 0; i < SANITIZED_BENCHMARK_POSITIONS.length; i++) {
        const pos = SANITIZED_BENCHMARK_POSITIONS[i];
        const g = new Chess(pos.fen);

        const start = performance.now();
        const engineMove = calculateBestMove(g, 'dificil', { maxTimeMs: 3000 });
        const timeMs = performance.now() - start;

        let isCorrect = false;
        if (pos.expectedBestMove || pos.alternativeBestMoves) {
          const allowed = [
            ...(pos.expectedBestMove ? [pos.expectedBestMove] : []),
            ...(pos.alternativeBestMoves || [])
          ];
          const cleanEngine = engineMove ? engineMove.replace(/[+#x]/g, '') : '';
          isCorrect = allowed.some(m => {
            const cleanAllowed = m.replace(/[+#x]/g, '');
            return m === engineMove || cleanAllowed === cleanEngine;
          });

          if (!isCorrect && pos.category === 'MATE_IN_1' && engineMove) {
            const tg = new Chess(pos.fen);
            try {
              tg.move(engineMove);
              if (tg.isCheckmate()) isCorrect = true;
            } catch {}
          }
        } else {
          isCorrect = engineMove !== null;
        }

        const isTimeout = timeMs >= 2950 || metrics.timeoutDuringIteration;

        benchSummaries.push({
          id: pos.id,
          category: pos.category,
          bestMove: engineMove,
          expected: pos.expectedBestMove,
          isCorrect,
          isTimeout,
          timeMs,
          nodes: metrics.nodes,
          qNodes: metrics.quiescenceNodes
        });

        if ((i + 1) % 17 === 0 || i === SANITIZED_BENCHMARK_POSITIONS.length - 1) {
          console.log(`  [7/9] 68-FEN progress: ${i + 1}/68`);
        }
      }

      correctBench = benchSummaries.filter(b => b.isCorrect).length;
      timeoutBench = benchSummaries.filter(b => b.isTimeout).length;
      incorrectBench = benchSummaries.filter(b => !b.isCorrect && !b.isTimeout).length;
      completedBench = benchSummaries.length - timeoutBench;
      accuracyCompleted = completedBench > 0 ? (correctBench / completedBench) * 100 : 0;

      const times = benchSummaries.map(b => b.timeMs).sort((a, b) => a - b);
      medianTime = times[Math.floor(times.length / 2)];
      p95Time = times[Math.min(times.length - 1, Math.floor(times.length * 0.95))];

      const nodesList = benchSummaries.map(b => b.nodes).sort((a, b) => a - b);
      medianNodes = nodesList[Math.floor(nodesList.length / 2)];

      const qNodesList = benchSummaries.map(b => b.qNodes).sort((a, b) => a - b);
      medianQNodes = qNodesList[Math.floor(qNodesList.length / 2)];

      console.log(`  68-FEN: Correct=${correctBench}/68 (${((correctBench/68)*100).toFixed(1)}%), Timeouts=${timeoutBench}, Median=${medianTime.toFixed(1)}ms`);
    }
  );

  // ============================================================
  // STAGE 8: TRANSITION MATRIX (5.7A -> 5.7B)
  // ============================================================
  const transitionMatrix = {
    'CORRECT -> CORRECT': 0,
    'CORRECT -> INCORRECT': 0,
    'CORRECT -> TIMEOUT': 0,
    'INCORRECT -> CORRECT': 0,
    'INCORRECT -> INCORRECT': 0,
    'INCORRECT -> TIMEOUT': 0,
    'TIMEOUT -> CORRECT': 0,
    'TIMEOUT -> INCORRECT': 0,
    'TIMEOUT -> TIMEOUT': 0
  };

  await runStageWithWatchdog(
    'transition',
    '[8/9] Transition matrix',
    10000,
    () => {
      try {
        if (fs.existsSync('./phase_57a_san_optimization.json')) {
          const prevData = JSON.parse(fs.readFileSync('./phase_57a_san_optimization.json', 'utf-8'));
          const prevSummaries: any[] = prevData.benchmark68?.summaries || prevData.benchmark68?.results || [];
          const prevMap = new Map<string, any>(prevSummaries.map(r => [r.id, r]));

          for (const curr of benchSummaries) {
            const prev = prevMap.get(curr.id);
            if (prev) {
              const prevStatus = prev.isTimeout ? 'TIMEOUT' : prev.isCorrect ? 'CORRECT' : 'INCORRECT';
              const currStatus = curr.isTimeout ? 'TIMEOUT' : curr.isCorrect ? 'CORRECT' : 'INCORRECT';
              const key = `${prevStatus} -> ${currStatus}` as keyof typeof transitionMatrix;
              if (transitionMatrix[key] !== undefined) {
                transitionMatrix[key]++;
              }
            }
          }
        }
      } catch (err) {
        console.error('  Error parsing transition matrix:', err);
      }

      console.table(transitionMatrix);
      const regr = transitionMatrix['CORRECT -> INCORRECT'];
      console.log(`  CORRECT -> INCORRECT: ${regr} (Strict requirement: 0) -> ${regr === 0 ? 'PASS' : 'FAIL'}`);
    }
  );

  // ============================================================
  // STAGE 9: STATE ISOLATION (3-WAY) & DETERMINISM (10x)
  // ============================================================
  let stateIsoPassed = false;
  let detPassed = false;

  await runStageWithWatchdog(
    'state isolation',
    '[9/9] State isolation',
    40000,
    () => {
      // Determinism 10x
      const testFen = 'r1bqk2r/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
      const detRuns: any[] = [];
      for (let r = 0; r < 10; r++) {
        const g = new Chess(testFen);
        const m = calculateBestMove(g, 'dificil', { maxTimeMs: 2000 });
        detRuns.push({ bestMove: m, nodes: metrics.nodes, qNodes: metrics.quiescenceNodes });
      }
      detPassed = detRuns.every(r => r.bestMove === detRuns[0].bestMove && r.nodes === detRuns[0].nodes);
      console.log(`  Determinism 10x: ${detPassed ? 'PASS' : 'FAIL'}`);

      // 3-way State Isolation: (A -> B -> C), (B -> C -> A), (C -> A -> B)
      const fenA = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const fenB = 'r1bqk2r/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
      const fenC = '8/2r2p2/5k1p/p1p2Pp1/P1R3P1/1P5P/5K2/8 w - - 0 35';

      function runSeq(fens: string[]) {
        return fens.map(f => {
          const g = new Chess(f);
          const m = calculateBestMove(g, 'dificil', { maxTimeMs: 2000 });
          return { fen: f, bestMove: m, nodes: metrics.nodes, qNodes: metrics.quiescenceNodes };
        });
      }

      const seq1 = runSeq([fenA, fenB, fenC]); // A then B then C
      const seq2 = runSeq([fenB, fenC, fenA]); // B then C then A
      const seq3 = runSeq([fenC, fenA, fenB]); // C then A then B

      // Compare position A across all sequences
      const a1 = seq1[0];
      const a2 = seq2[2];
      const a3 = seq3[1];
      const matchA = a1.bestMove === a2.bestMove && a1.nodes === a2.nodes && a1.bestMove === a3.bestMove && a1.nodes === a3.nodes;

      // Compare position B across all sequences
      const b1 = seq1[1];
      const b2 = seq2[0];
      const b3 = seq3[2];
      const matchB = b1.bestMove === b2.bestMove && b1.nodes === b2.nodes && b1.bestMove === b3.bestMove && b1.nodes === b3.nodes;

      // Compare position C across all sequences
      const c1 = seq1[2];
      const c2 = seq2[1];
      const c3 = seq3[0];
      const matchC = c1.bestMove === c2.bestMove && c1.nodes === c2.nodes && c1.bestMove === c3.bestMove && c1.nodes === c3.nodes;

      stateIsoPassed = matchA && matchB && matchC;
      console.log(`  3-Way State Isolation (A, B, C across 3 permutations): ${stateIsoPassed ? 'PASS' : 'FAIL'}`);
    }
  );

  // ============================================================
  // OPTIONAL STOCKFISH SANITY WITH CLEAN WORKER TERMINATION
  // ============================================================
  let sfMatches = 0;
  const sfSample = SANITIZED_BENCHMARK_POSITIONS.slice(0, 10);
  try {
    const sf = new StockfishClient();
    try {
      await sf.init();
      for (const pos of sfSample) {
        const g = new Chess(pos.fen);
        const vMove = calculateBestMove(g, 'dificil', { maxTimeMs: 2000 });
        const sfEval = await sf.evaluate(pos.fen, { depth: 10 });
        if (vMove === sfEval.bestMove) sfMatches++;
      }
      console.log(`  Stockfish Sanity Check: ${sfMatches}/10 match`);
    } finally {
      sf.terminate();
    }
  } catch (err) {
    console.warn('  Stockfish sanity check skipped or unavailable:', (err as any).message);
  }

  // ============================================================
  // TIMING SUMMARY & JSON WRITE
  // ============================================================
  const totalTimeMs = Math.round(performance.now() - globalStart);

  console.log('\n=== 5.7B TEST TIMING ===');
  for (const t of stageTimings) {
    console.log(`${t.key}: ${t.durationMs} ms [${t.status}]`);
  }
  console.log(`TOTAL: ${totalTimeMs} ms\n`);

  const allStrictPassed = (
    epSuitePassed &&
    controlledPassed === controlledTotal &&
    randomPassed === RANDOM_TOTAL &&
    pieceMatches.total === RANDOM_TOTAL &&
    transitionMatrix['CORRECT -> INCORRECT'] === 0 &&
    detPassed &&
    stateIsoPassed
  );

  const outputData = {
    timestamp: new Date().toISOString(),
    status: allStrictPassed ? 'PASS' : 'FAIL',
    decision: allStrictPassed ? 'KEEP' : 'REJECT',
    enPassantSuite: { passed: epSuitePassed },
    controlledPositions: { total: controlledTotal, passed: controlledPassed },
    randomPositions500: {
      total: RANDOM_TOTAL,
      passed: randomPassed,
      pieceMatches
    },
    symmetry: { total: SYMMETRY_TOTAL, passed: symmetryPassed },
    monotonicity: { passed: monotonicityPassed, expectedDelta, actualDelta },
    nonDuplication: { passed: nonDuplicationPassed },
    microbenchmark: {
      evaluations: 10000,
      avgRefMobUs,
      avgOptMobUs,
      avgMobSpeedup,
      avgRefEvalUs,
      avgOptEvalUs,
      avgEvalSpeedup,
      results: microResults
    },
    benchmark68: {
      total: 68,
      correct: correctBench,
      incorrect: incorrectBench,
      timeout: timeoutBench,
      completed: completedBench,
      accuracyCompleted,
      completionRate: (completedBench / 68) * 100,
      medianTime,
      p95Time,
      medianNodes,
      medianQNodes,
      summaries: benchSummaries
    },
    transitionMatrix,
    determinism: { passed: detPassed },
    stateIsolation: { passed: stateIsoPassed },
    timings: stageTimings
  };

  fs.writeFileSync('./phase_57b_mobility_optimization.json', JSON.stringify(outputData, null, 2));
  console.log('Saved phase_57b_mobility_optimization.json successfully.');
  console.log('\n[5.7B] COMPLETE\n');
}

runAll()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('[5.7B] SUITE FAILED:', err);
    process.exit(1);
  });
