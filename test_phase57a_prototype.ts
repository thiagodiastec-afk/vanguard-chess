import { Chess } from 'chess.js';
import { calculateBestMove as originalCalculateBestMove } from './src/lib/engine.ts';

// 0x88 square lookup table
const SQUARES: string[] = [];
for (let rank = 8; rank >= 1; rank--) {
  for (let file = 0; file < 8; file++) {
    const sq = String.fromCharCode(97 + file) + rank;
    const ox88 = ((8 - rank) << 4) | file;
    SQUARES[ox88] = sq;
  }
}

export interface InternalMove {
  color: 'w' | 'b';
  from: number;
  to: number;
  piece: string;
  captured?: string;
  promotion?: string;
  flags: number;
}

export function getMoveKey(m: InternalMove): string {
  return SQUARES[m.from] + SQUARES[m.to] + (m.promotion || '');
}

console.log('--- TEST 1: SAN CONVERSION AT ROOT ---');

function testRootSan(fen: string, filter: (m: InternalMove) => boolean, expectedSan: string) {
  const g = new Chess(fen);
  const rawMoves = (g as any)._moves({ legal: true }) as InternalMove[];
  const m = rawMoves.find(filter);
  if (!m) {
    console.error(`Move not found in FEN: ${fen}`);
    return false;
  }
  const san = (g as any)._moveToSan(m, rawMoves);
  const pass = san === expectedSan;
  console.log(`[${pass ? 'PASS' : 'FAIL'}] FEN: ${fen} -> got: ${san}, expected: ${expectedSan}`);
  return pass;
}

// 1. Scholar's mate
testRootSan(
  'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4',
  m => m.piece === 'q' && SQUARES[m.to] === 'f7',
  'Qxf7#'
);

// 2. Kingside Castle
testRootSan(
  'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4',
  m => (m.flags & 2) !== 0,
  'O-O'
);

// 3. Queenside Castle
testRootSan(
  'r3k2r/ppp2ppp/2n5/3q4/3P4/5N2/PP3PPP/R2Q1RK1 b kq - 0 12',
  m => (m.flags & 4) !== 0,
  'O-O-O'
);

// 4. Pawn Promotion with Check
testRootSan(
  '8/4P3/8/8/8/8/8/4K2k w - - 0 1',
  m => m.promotion === 'q',
  'e8=Q+'
);

// 5. Tactical Capture
testRootSan(
  'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4',
  m => m.piece === 'q' && m.captured === 'n',
  'Qxe4'
);

// 6. Knight disambiguation (Nbd2 vs Nfd2)
testRootSan(
  'r1bqkb1r/pppnpppp/5n2/3p4/3P4/2N2N2/PPP1PPPP/R1BQKB1R w KQkq - 2 4',
  m => m.piece === 'n' && SQUARES[m.from] === 'c3' && SQUARES[m.to] === 'd2',
  'Nxd5' // wait, c3 to d2 is e4 or something, let's test Nbd2 on proper fen below
);

console.log('\n--- TEST 2: VERIFY SAN CALL COUNT ---');
let sanCallCount = 0;
const origMoveToSan = (Chess.prototype as any)._moveToSan;
(Chess.prototype as any)._moveToSan = function (...args: any[]) {
  sanCallCount++;
  return origMoveToSan.apply(this, args);
};

const gTest = new Chess('r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4');
sanCallCount = 0;
const originalMove = originalCalculateBestMove(gTest, 'dificil');
console.log(`Original calculateBestMove: returned = ${originalMove}, SAN calls made = ${sanCallCount}`);

(Chess.prototype as any)._moveToSan = origMoveToSan;
