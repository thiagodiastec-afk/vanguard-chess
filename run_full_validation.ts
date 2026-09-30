import { Chess } from 'chess.js';
import { calculateBestMove, evaluateBoard, minimax } from './src/lib/engine';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions';
import { runFullBenchmark } from './src/lib/analysis/engineBenchmark/benchmarkRunner';
import { generateBenchmarkReportMarkdown } from './src/lib/analysis/engineBenchmark/benchmarkReport';

console.log('=====================================================');
console.log(' FASE 5.1 COMPREHENSIVE VALIDATION SUITE');
console.log('=====================================================\n');

// 1. Test Stalemate & Non-Mate
console.log('--- 1. STALEMATE & NON-MATE TESTS ---');
const stalemateFen = 'k7/8/1K6/8/8/8/8/8 b - - 0 1';
const staleGame = new Chess(stalemateFen);
const staleMinimax = minimax(staleGame, 2, -Infinity, Infinity, false);
console.log(`Stalemate score: ${staleMinimax} (Expected: 0) -> ${staleMinimax === 0 ? 'PASS' : 'FAIL'}`);

const normalCheckFen = 'rnbqkbnr/pppp1ppp/8/4p3/5PP1/8/PPPPP2P/RNBQKBNR b KQkq - 0 2'; // after f4 g4, Black has Qh4# (Fool's mate) or normal checks
const checkGame = new Chess('rnbqkbnr/ppppp1pp/8/5p2/4P3/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 2');
const normalScore = evaluateBoard(checkGame);
console.log(`Normal non-mate evaluation: ${normalScore} cp (Expected: near 0) -> ${Math.abs(normalScore) < 200 ? 'PASS' : 'FAIL'}`);

// 2. Test Material Monotonicity
console.log('\n--- 2. MATERIAL MONOTONICITY & PERSPECTIVE ---');
const materialFens = [
  { name: '+9 (White +Queen)', fen: 'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', expected: '> 0' },
  { name: '+5 (White +Rook)', fen: '1nbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', expected: '> 0' },
  { name: '+3 (White +Bishop)', fen: 'rn1qkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', expected: '> 0' },
  { name: '+1 (White +Pawn)', fen: 'rnbqkbnr/1ppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', expected: '> 0' },
  { name: ' 0 (Equal)', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', expected: '~0' },
  { name: '-1 (White -Pawn)', fen: 'rnbqkbnr/pppppppp/8/8/8/8/1PPPPPPP/RNBQKBNR w KQkq - 0 1', expected: '< 0' },
  { name: '-3 (White -Knight)', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R1BQKBNR w KQkq - 0 1', expected: '< 0' },
  { name: '-5 (White -Rook)', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/1NBQKBNR w KQkq - 0 1', expected: '< 0' },
  { name: '-9 (White -Queen)', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1', expected: '< 0' }
];

let matScores: number[] = [];
for (const mf of materialFens) {
  const g = new Chess(mf.fen);
  const sc = evaluateBoard(g);
  matScores.push(sc);
  console.log(`Material ${mf.name}: ${sc} cp`);
}

// Check strictly decreasing from +9 down to -9
let materialMonotonic = true;
for (let i = 1; i < matScores.length; i++) {
  if (matScores[i] > matScores[i - 1]) {
    materialMonotonic = false;
  }
}
console.log(`Material Monotonicity (+9 down to -9): ${materialMonotonic ? 'PASS' : 'FAIL'}`);

// 3. Test Determinism (10 consecutive runs)
console.log('\n--- 3. DETERMINISM (10 RUNS) ---');
const detFen = 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4';
const detMoves: string[] = [];
for (let i = 0; i < 10; i++) {
  const g = new Chess(detFen);
  const m = calculateBestMove(g, 'dificil') || '';
  detMoves.push(m);
}
const allIdentical = detMoves.every(m => m === detMoves[0]);
console.log(`Determinism runs: ${detMoves.join(', ')} -> ${allIdentical ? 'PASS (10/10)' : 'FAIL'}`);

// 4. Run Full 68 FENs Benchmark
console.log('\n--- 4. FULL 68 FENs BENCHMARK ---');
const benchResult = runFullBenchmark();
const reportMd = generateBenchmarkReportMarkdown(benchResult);

console.log(reportMd);
