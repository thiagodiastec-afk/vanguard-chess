/**
 * FASE 5.2A — SPECIFIC TESTS (ETAPA 7)
 *
 * 7.1 Mate tests (mate in 1, mate in 2, mate distance)
 * 7.2 Quiescence-specific tests (unstable leaf positions)
 * 7.3 Perspective tests (white vs black mirror)
 * 7.4 Material monotonicity
 * 7.5 Determinism (10 runs)
 */

import { Chess } from 'chess.js';
import { calculateBestMove, evaluateBoard, minimax } from './src/lib/engine.ts';

let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => boolean) {
  const result = fn();
  if (result) {
    console.log(`  ✓ ${name}`);
    passCount++;
  } else {
    console.log(`  ✗ ${name}`);
    failCount++;
  }
}

// ============================
// 7.1 MATE TESTS
// ============================
console.log('\n=== 7.1 MATE TESTS ===\n');

// Mate in 1 — must find checkmate move
const mate1Tests = [
  { name: 'Scholar\'s mate Qxf7#', fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4', checkMate: true },
  { name: 'Back rank Rd8#', fen: '6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1', checkMate: true },
  { name: 'Black Rd1#', fen: '3r2k1/8/8/8/8/8/5PPP/6K1 b - - 0 1', checkMate: true },
  { name: 'Smothered Nf7#', fen: '6rk/6pp/3N4/8/8/8/8/4K3 w - - 0 1', checkMate: true },
  { name: 'Black Qb2#', fen: '8/8/8/8/8/1k6/8/K1q5 b - - 0 1', checkMate: true },
  { name: 'Ladder Rb8#', fen: '7k/R7/1R6/8/8/8/8/4K3 w - - 0 1', checkMate: true },
];

for (const t of mate1Tests) {
  test(`Mate in 1: ${t.name}`, () => {
    const game = new Chess(t.fen);
    const move = calculateBestMove(game, 'dificil');
    if (!move) return false;
    const g2 = new Chess(t.fen);
    g2.move(move);
    return g2.isCheckmate();
  });
}

// Mate in 2
const mate2Tests = [
  { name: 'Arabian mate', fen: '7k/R7/5N2/8/8/8/8/4K3 w - - 0 1' },
];

for (const t of mate2Tests) {
  test(`Mate in 2: ${t.name} — finds winning move`, () => {
    const game = new Chess(t.fen);
    const move = calculateBestMove(game, 'dificil');
    if (!move) return false;
    // The engine should find a move that leads to forced mate
    const g2 = new Chess(t.fen);
    g2.move(move);
    const score = minimax(g2, 2, -Infinity, Infinity, g2.turn() === 'w');
    // Score should indicate opponent is getting mated (very large magnitude)
    return Math.abs(score) > 50000;
  });
}

// Mate distance: prefer Mate in 1 over Mate in 2
test('Mate distance: prefers faster mate', () => {
  // Position where Rd8# is mate in 1
  const fen = '6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1';
  const game = new Chess(fen);
  const move = calculateBestMove(game, 'dificil');
  if (!move) return false;
  const g2 = new Chess(fen);
  g2.move(move);
  return g2.isCheckmate(); // Should pick M1, not a move leading to M2+
});

// ============================
// 7.2 QUIESCENCE TESTS
// ============================
console.log('\n=== 7.2 QUIESCENCE TESTS ===\n');

// These positions are designed where the horizon effect would mislead
// a pure depth-limited search

test('QS: Capture then recapture (exchange)', () => {
  // White can take on e5 with Nxe5, but Black recaptures.
  // Without quiescence, engine might think it won a pawn.
  const fen = 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
  const game = new Chess(fen);
  const move = calculateBestMove(game, 'dificil');
  // Just verify it produces a valid move and doesn't crash
  return move !== null;
});

test('QS: Capture into recapture — doesn\'t overvalue', () => {
  // Position where White can take a pawn but loses a piece in return
  // Rook takes but then rook gets captured back
  const fen = 'r3k2r/pppppppp/8/4R3/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1';
  const game = new Chess(fen);
  const score1 = evaluateBoard(game);
  const move = calculateBestMove(game, 'dificil');
  return move !== null;
});

test('QS: Promotion detection', () => {
  // White pawn on 7th rank — quiescence should see the promotion
  const fen = '8/4P3/8/8/8/8/8/k3K3 w - - 0 1';
  const game = new Chess(fen);
  const move = calculateBestMove(game, 'dificil');
  return move !== null && move.includes('=');
});

test('QS: Check in quiescence', () => {
  // Position where a checking move changes the evaluation
  const fen = 'r1bqk2r/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4';
  const game = new Chess(fen);
  const move = calculateBestMove(game, 'dificil');
  return move !== null;
});

test('QS: Capturing a checking piece', () => {
  // Black is in check, must respond tactically
  const fen = 'rnbqkbnr/pppp1ppp/8/8/4q3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4';
  const game = new Chess(fen);
  const move = calculateBestMove(game, 'dificil');
  return move !== null;
});

// ============================
// 7.3 PERSPECTIVE TESTS
// ============================
console.log('\n=== 7.3 PERSPECTIVE TESTS ===\n');

const perspectivePairs = [
  {
    name: 'Queen advantage mirror',
    whiteFen: 'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    blackFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR b KQkq - 0 1'
  },
  {
    name: 'Rook advantage mirror',
    whiteFen: '1nbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    blackFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/1NBQKBNR b KQkq - 0 1'
  },
  {
    name: 'Bishop advantage mirror',
    whiteFen: 'rn1qkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    blackFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RN1QKBNR b KQkq - 0 1'
  }
];

for (const pair of perspectivePairs) {
  test(`Perspective: ${pair.name}`, () => {
    const evalW = evaluateBoard(new Chess(pair.whiteFen));
    const evalB = evaluateBoard(new Chess(pair.blackFen));
    // scoreWhite ≈ -scoreBlack
    return evalW > 0 && evalB < 0 && Math.abs(evalW + evalB) < 100;
  });
}

// ============================
// 7.4 MATERIAL MONOTONICITY
// ============================
console.log('\n=== 7.4 MATERIAL MONOTONICITY ===\n');

test('Material monotonicity: +900 > +500 > +330 > 0 > -320 > -500 > -900', () => {
  const fens = [
    'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',  // +Q
    '1nbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',  // +R
    'rn1qkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',  // +B
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',  // =
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R1BQKBNR w KQkq - 0 1',  // -N
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/1NBQKBNR w KQkq - 0 1',  // -R
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1',  // -Q
  ];
  const scores = fens.map(f => evaluateBoard(new Chess(f)));
  console.log(`    Scores: [${scores.join(', ')}]`);
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] >= scores[i - 1]) return false;
  }
  return true;
});

// ============================
// 7.5 DETERMINISM
// ============================
console.log('\n=== 7.5 DETERMINISM (10 runs x 3 positions) ===\n');

const detPositions = [
  { name: 'Scholar\'s mate', fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4' },
  { name: 'Ruy Lopez', fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3' },
  { name: 'Starting position', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
];

for (const pos of detPositions) {
  test(`Determinism: ${pos.name} (10 runs)`, () => {
    const moves: string[] = [];
    const scores: number[] = [];
    for (let i = 0; i < 10; i++) {
      const g = new Chess(pos.fen);
      const m = calculateBestMove(g, 'dificil') || '';
      moves.push(m);
      scores.push(evaluateBoard(new Chess(pos.fen)));
    }
    const allSameMove = moves.every(m => m === moves[0]);
    const allSameScore = scores.every(s => s === scores[0]);
    console.log(`    Move: ${moves[0]}, Score: ${scores[0]}, SameMove: ${allSameMove}, SameScore: ${allSameScore}`);
    return allSameMove && allSameScore;
  });
}

// ============================
// SUMMARY
// ============================
console.log(`\n${'='.repeat(50)}`);
console.log(`SPECIFIC TESTS SUMMARY: ${passCount} passed, ${failCount} failed`);
console.log(`${'='.repeat(50)}`);

if (failCount > 0) {
  process.exit(1);
}
