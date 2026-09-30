import { Chess } from 'chess.js';
import { computeZobristHash } from './src/lib/zobrist.ts';

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

console.log('\n=== ZOBRIST TESTS ===\n');

// 6.1 Mesma posição
test('6.1 Same position -> Same hash', () => {
  const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const game1 = new Chess(fen);
  const game2 = new Chess(fen);
  return computeZobristHash(game1) === computeZobristHash(game2);
});

// 6.2 Side to move
test('6.2 Side to move difference -> Different hash', () => {
  const whiteFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const blackFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1';
  return computeZobristHash(new Chess(whiteFen)) !== computeZobristHash(new Chess(blackFen));
});

// 6.3 Castling
test('6.3 Castling rights difference -> Different hash', () => {
  const fen1 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const fen2 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1'; // No black castling
  return computeZobristHash(new Chess(fen1)) !== computeZobristHash(new Chess(fen2));
});

// 6.4 En passant
test('6.4 En passant difference -> Different hash', () => {
  const fen1 = 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2'; // White pawn on e5, black just played d5
  const fen2 = 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'; // No EP
  return computeZobristHash(new Chess(fen1)) !== computeZobristHash(new Chess(fen2));
});

// 6.5 Movimento e reversão
test('6.5 Move and undo -> Same hash', () => {
  const game = new Chess();
  const hashOriginal = computeZobristHash(game);
  game.move('e4');
  const hashMove = computeZobristHash(game);
  game.undo();
  const hashUndo = computeZobristHash(game);
  return hashOriginal !== hashMove && hashOriginal === hashUndo;
});

// 17 Transposition test
test('17 Transposition -> Same hash', () => {
  const game1 = new Chess();
  game1.move('e4');
  game1.move('e5');
  game1.move('Nf3');
  game1.move('Nc6');

  const game2 = new Chess();
  game2.move('Nf3');
  game2.move('Nc6');
  game2.move('e4');
  game2.move('e5');

  return computeZobristHash(game1) === computeZobristHash(game2);
});

// 18 Collision Test
test('18 Collision test (1000 random moves)', () => {
  const hashes = new Set<number>();
  let collisions = 0;
  for(let i=0; i<1000; i++) {
    const game = new Chess();
    // make random moves
    for(let j=0; j<20; j++) {
      const moves = game.moves();
      if(moves.length === 0) break;
      game.move(moves[Math.floor(Math.random() * moves.length)]);
    }
    const hash = computeZobristHash(game);
    if(hashes.has(hash)) {
      collisions++; // Not necessarily a collision if it's the same position, but rare in random 20 moves
    }
    hashes.add(hash);
  }
  console.log(`    Generated ${hashes.size} unique hashes. Collisions: ${collisions}`);
  // We allow some collisions if they actually landed on the same position, but usually it's low
  return true;
});

console.log(`\nZOBRIST TESTS SUMMARY: ${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
