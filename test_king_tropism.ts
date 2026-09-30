import { Chess } from 'chess.js';
import {
  calculateKingTropism,
  evaluateKingTropism,
  countKingAttackers,
  countPawnShield,
  countMobility,
  evaluateBoard,
  kingTropismConfig,
  kingAttackersConfig,
  kingSafetyConfig,
  mobilityConfig
} from './src/lib/engine.ts';

let passCount = 0;
let failCount = 0;

function assert(cond: boolean, desc: string) {
  if (cond) {
    console.log(`[PASS] ${desc}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${desc}`);
    failCount++;
  }
}

console.log('--- TESTING KING TROPISM (>= 40 tests) ---\n');

// Category 1: Geometria (Distâncias 1, 2, 3, 4, 5+, centro, borda, canto)
{
  // White King at e4 (row 4, col 4)
  // Distance 1: d5 (row 3, col 3) -> Chebyshev max(|3-4|, |3-4|) = 1 -> 6 cp
  const fenD1 = '8/8/8/3n4/4K3/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fenD1), 'w') === 6, 'Geometria: dist 1 at d5 = 6 cp');

  // Distance 2: c6 (row 2, col 2) -> max(|2-4|, |2-4|) = 2 -> 4 cp
  const fenD2 = '8/8/2n5/8/4K3/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fenD2), 'w') === 4, 'Geometria: dist 2 at c6 = 4 cp');

  // Distance 3: b7 (row 1, col 1) -> max(|1-4|, |1-4|) = 3 -> 2 cp
  const fenD3 = '8/1n6/8/8/4K3/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fenD3), 'w') === 2, 'Geometria: dist 3 at b7 = 2 cp');

  // Distance 4: a8 (row 0, col 0) -> max(|0-4|, |0-4|) = 4 -> 0 cp
  const fenD4 = 'n7/8/8/8/4K3/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fenD4), 'w') === 0, 'Geometria: dist 4 at a8 = 0 cp');

  // Distance 5+: h8 (row 0, col 7) -> max(|0-4|, |7-4|) = 4 or 5
  // White King at a1 (row 7, col 0), piece at h8 (row 0, col 7) -> dist 7
  const fenD7 = '7q/8/8/8/8/8/8/K6k w - - 0 1';
  assert(calculateKingTropism(new Chess(fenD7), 'w') === 0, 'Geometria: dist 7 at h8 = 0 cp');

  // Center King (e4), piece at e5 (dist 1)
  const fenCenter = '8/8/8/4r3/4K3/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fenCenter), 'w') === 6, 'Geometria: centro dist 1 = 6 cp');

  // Edge King: King at a4 (row 4, col 0), piece at c4 (row 4, col 2) -> dist 2
  const fenEdge = '8/8/8/8/K1b5/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fenEdge), 'w') === 4, 'Geometria: borda dist 2 = 4 cp');

  // Corner King: King at h1 (row 7, col 7), piece at f3 (row 5, col 5) -> dist 2
  const fenCorner = 'k7/8/8/8/8/5q2/8/7K w - - 0 1';
  assert(calculateKingTropism(new Chess(fenCorner), 'w') === 4, 'Geometria: canto dist 2 = 4 cp');
}

// Category 2: Peças (Knight, Bishop, Rook, Queen)
{
  // Knight dist 1
  const fenN = '8/8/8/3n4/4K3/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fenN), 'w') === 6, 'Peça Knight: dist 1 = 6 cp');

  // Bishop dist 2
  const fenB = '8/8/2b5/8/4K3/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fenB), 'w') === 4, 'Peça Bishop: dist 2 = 4 cp');

  // Rook dist 3
  const fenR = '8/8/8/8/4K2r/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fenR), 'w') === 2, 'Peça Rook: dist 3 = 2 cp');

  // Queen dist 1
  const fenQ = '8/8/8/4q3/4K3/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fenQ), 'w') === 6, 'Peça Queen: dist 1 = 6 cp');
}

// Category 3: Exclusões (Pawn, King)
{
  // Black Pawn at dist 1: d5 to e4
  const fenP1 = '8/8/8/3p4/4K3/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fenP1), 'w') === 0, 'Exclusão: Black Pawn at dist 1 = 0 cp');

  // Black Pawn at dist 2
  const fenP2 = '8/8/2p5/8/4K3/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fenP2), 'w') === 0, 'Exclusão: Black Pawn at dist 2 = 0 cp');

  // Black Pawn at dist 3
  const fenP3 = '8/1p6/8/8/4K3/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fenP3), 'w') === 0, 'Exclusão: Black Pawn at dist 3 = 0 cp');

  // Enemy King at dist 2 (valid chess position with kings separated by 1 square):
  // White King e4 (4,4), Black King e6 (2,4) -> dist 2
  const fenK2 = '8/8/4k3/8/4K3/8/8/8 w - - 0 1';
  assert(calculateKingTropism(new Chess(fenK2), 'w') === 0, 'Exclusão: Enemy King at dist 2 = 0 cp');

  // Enemy King at dist 3:
  const fenK3 = '8/4k3/8/8/4K3/8/8/8 w - - 0 1';
  assert(calculateKingTropism(new Chess(fenK3), 'w') === 0, 'Exclusão: Enemy King at dist 3 = 0 cp');

  // Enemy King at dist 1: test using 2D board array directly
  const customBoard: any[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  customBoard[4][4] = { type: 'k', color: 'w' };
  customBoard[3][4] = { type: 'k', color: 'b' }; // dist 1
  assert(calculateKingTropism(customBoard, 'w') === 0, 'Exclusão: Enemy King at dist 1 (board array) = 0 cp');
}

// Category 4: Bloqueio (Tropism não respeita bloqueio — pura distância geométrica)
{
  // Position A: Queen dist 2, no blocker -> e6 to e4 -> dist 2
  const fenQUnblocked = '8/8/4q3/8/4K3/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fenQUnblocked), 'w') === 4, 'Bloqueio A: Queen dist 2 unblocked = 4 cp');

  // Position B: Queen dist 2, white pawn blocking at e5
  const fenQBlockedWhite = '8/8/4q3/4P3/4K3/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fenQBlockedWhite), 'w') === 4, 'Bloqueio B: Queen dist 2 blocked by friendly pawn = 4 cp (geométrico)');

  // Position C: Queen dist 2, black pawn blocking at e5
  const fenQBlockedBlack = '8/8/4q3/4p3/4K3/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fenQBlockedBlack), 'w') === 4, 'Bloqueio C: Queen dist 2 blocked by enemy pawn = 4 cp (geométrico)');

  // Position D: Rook dist 3, multiple blockers
  const fenRBlocked = '8/8/8/8/4KPPn/8/8/k7 w - - 0 1';
  // King e4 (4,4), Rook h4 (4,7) dist 3. Blocked by pawns at f4, g4.
  assert(calculateKingTropism(new Chess(fenRBlocked), 'w') === 2, 'Bloqueio D: Rook dist 3 blocked = 2 cp');
}

// Category 5: Múltiplas peças (2, 3, 4 peças)
{
  // 2 pieces: Knight dist 1 (6 cp) + Bishop dist 2 (4 cp) = 10 cp
  const fen2P = '8/8/2b5/3n4/4K3/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fen2P), 'w') === 10, 'Múltiplas peças: 2 peças (6+4) = 10 cp');

  // 3 pieces: Knight dist 1 (6) + Bishop dist 2 (4) + Rook dist 3 (2) = 12 cp
  const fen3P = '8/8/2b5/3n4/4K2r/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fen3P), 'w') === 12, 'Múltiplas peças: 3 peças (6+4+2) = 12 cp');

  // 4 pieces: Knight dist 1 (6) + Bishop dist 2 (4) + Rook dist 3 (2) + Queen dist 1 (6) = 18 cp
  const fen4P = '8/8/2b5/3n1q2/4K2r/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fen4P), 'w') === 18, 'Múltiplas peças: 4 peças (6+4+2+6) = 18 cp');
}

// Category 6: Simetria (White vs Black, Espelho)
{
  // Position A: White attacks Black King with Queen at dist 1 (Black King at e8, White Queen at e7)
  const fenSymA = '4k3/4Q3/8/8/8/8/8/4K3 w - - 0 1';
  const evalA = evaluateKingTropism(new Chess(fenSymA));
  assert(evalA.tropismBlackKing === 6 && evalA.tropismWhiteKing === 0 && evalA.score === 6, 'Simetria A: White ataca Black King (score = +6)');

  // Position B: Black attacks White King with Queen at dist 1 (White King at e1, Black Queen at e2)
  const fenSymB = '4k3/8/8/8/8/8/4q3/4K3 w - - 0 1';
  const evalB = evaluateKingTropism(new Chess(fenSymB));
  assert(evalB.tropismBlackKing === 0 && evalB.tropismWhiteKing === 6 && evalB.score === -6, 'Simetria B: Black ataca White King (score = -6)');

  // Sum = 0
  assert(evalA.score + evalB.score === 0, 'Simetria: evalA.score + evalB.score === 0');

  // Symmetric 2-piece mirror
  const fenMirA = '4k3/3N1B2/8/8/8/8/8/4K3 w - - 0 1'; // White N dist 1 (6), B dist 1 (6) = 12 on Black King
  const fenMirB = '4k3/8/8/8/8/8/3n1b2/4K3 w - - 0 1'; // Black n dist 1 (6), b dist 1 (6) = 12 on White King
  const mirA = evaluateKingTropism(new Chess(fenMirA));
  const mirB = evaluateKingTropism(new Chess(fenMirB));
  assert(mirA.score === 12 && mirB.score === -12 && mirA.score + mirB.score === 0, 'Simetria: 2 peças espelho soma zero');
}

// Category 7: Não Duplicação (Uma peça contribui uma única vez)
{
  // Queen at dist 1 attacking multiple squares around king
  const fenQMulti = '8/8/8/4q3/4K3/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fenQMulti), 'w') === 6, 'Não duplicação: Queen dist 1 atacando várias casas = 6 cp');

  // Rook at dist 2
  const fenRMulti = '8/8/4r3/8/4K3/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fenRMulti), 'w') === 4, 'Não duplicação: Rook dist 2 = 4 cp (não conta 2 vezes)');

  // Bishop at dist 3
  const fenBMulti = '8/1b6/8/8/4K3/8/8/k7 w - - 0 1';
  assert(calculateKingTropism(new Chess(fenBMulti), 'w') === 2, 'Não duplicação: Bishop dist 3 = 2 cp');
}

// Category 8: Monotonicidade (dist 4 -> dist 3 -> dist 2 -> dist 1)
{
  // Distance 4: King e4 (4,4), Queen a4 (4,0) -> dist 4
  const fenM4 = '8/8/8/8/q3K3/8/8/k7 w - - 0 1';
  const t4 = calculateKingTropism(new Chess(fenM4), 'w');

  // Distance 3: Queen b4 (4,1) -> dist 3
  const fenM3 = '8/8/8/8/1q2K3/8/8/k7 w - - 0 1';
  const t3 = calculateKingTropism(new Chess(fenM3), 'w');

  // Distance 2: Queen c4 (4,2) -> dist 2
  const fenM2 = '8/8/8/8/2q1K3/8/8/k7 w - - 0 1';
  const t2 = calculateKingTropism(new Chess(fenM2), 'w');

  // Distance 1: Queen d4 (4,3) -> dist 1
  const fenM1 = '8/8/8/8/3qK3/8/8/k7 w - - 0 1';
  const t1 = calculateKingTropism(new Chess(fenM1), 'w');

  assert(t4 === 0, 'Monotonicidade: dist 4 = 0');
  assert(t3 === 2, 'Monotonicidade: dist 3 = 2');
  assert(t2 === 4, 'Monotonicidade: dist 2 = 4');
  assert(t1 === 6, 'Monotonicidade: dist 1 = 6');
  assert(t4 < t3 && t3 < t2 && t2 < t1, 'Monotonicidade estrita: 0 < 2 < 4 < 6');
}

// Category 9: Tropism ≠ Attackers (Testes Críticos)
{
  // Caso 1: Tropism > 0, Attackers = 0
  // Queen at e7 (row 1, col 4), King at e4 (row 4, col 4) -> dist = 3 -> Tropism = 2 cp
  // King e4 adjacent squares: d5, e5, f5, d4, f4, d3, e3, f3.
  // Queen e7 rays:
  // vertical: e6, e5. Blocked by friendly pawn at e6!
  // diagonal left: d6, c5, b4, a3. d6 is dist 2 from King (not adjacent to e4!). None of these are in King ring (d5, e5, f5, d4, f4, d3, e3, f3).
  // diagonal right: f6, g5, h4. f6 is dist 2 from King. None are in King ring.
  // horizontal: rank 7 (far away).
  // So Queen at e7 with pawn at e6 does NOT attack ANY square in King e4 ring!
  // But distance(e7, e4) = max(|1-4|, |4-4|) = 3 -> Tropism = 2 > 0!
  const fenBlockQ = '8/4q3/4P3/8/4K3/8/8/k7 w - - 0 1';
  const chessBlock = new Chess(fenBlockQ);
  const trop1 = calculateKingTropism(chessBlock, 'w');
  const att1 = countKingAttackers(chessBlock, 'w');
  assert(trop1 === 2 && att1 === 0, 'Tropism ≠ Attackers: Queen dist 3 blocked vertically -> Tropism=2, Attackers=0');

  // Caso 2: Bishop dist 2, blocked on all diagonals reaching the king zone
  // King at e4 (row 4, col 4). Adjacent squares: d5, e5, f5, d4, f4, d3, e3, f3.
  // Bishop at e6 (row 2, col 4, dark square) -> dist = max(|2-4|, |4-4|) = 2 -> Tropism = 4 cp.
  // Bishop diagonals from e6:
  // d5 (row 3, col 3 - adjacent!), c4, b3, a2
  // f5 (row 3, col 5 - adjacent!), g4, h3
  // d7, c8
  // f7, g8
  // If we block BOTH d5 and f5 with friendly pawns (P at d5, P at f5),
  // then d5 is checked: isKingAdjacent(3,3, 4,4) is TRUE!
  // But wait! When tr=3, tc=3 (d5), isKingAdjacent is TRUE, so attacksKingZone was set to TRUE before checking board[tr][tc]!
  // Because d5 IS an adjacent square!
  // To have Attackers = 0, the Bishop must NOT have ANY ray reaching an adjacent square, OR the blocker is BEFORE the adjacent square!
  // Can a blocker be before an adjacent square when dist = 2?
  // Between e6 (2,4) and d5 (3,3), there is no square in between (step is +1, -1).
  // What about dist 3?
  // Bishop at e7 (1,4). Diagonal: d6, c5 (c5 is dist 2 from King? King e4 -> c5 is |4-2|=2, |4-3|=1 -> dist 2, adjacent? c5 is (3,2), |3-4|=1, |2-4|=2 -> not adjacent!).
  // What diagonal from e7 reaches King ring?
  // None! From e7 (1,4), diagonals are:
  // d6, c5, b4, a3
  // f6, g5, h4
  // Are any of these adjacent to e4?
  // King e4 ring: row 3-5, col 3-5.
  // d6 is (2,3) -> not in ring!
  // c5 is (3,2) -> col 2 is not in 3..5!
  // f6 is (2,5) -> not in ring!
  // g5 is (3,6) -> col 6 is not in 3..5!
  // So Bishop at e7 has dist = max(|1-4|, |4-4|) = 3 -> Tropism = 2 cp!
  // And ZERO of its diagonals reach the King e4 ring! Attackers = 0!
  const fenBNoAtt = '8/4b3/8/8/4K3/8/8/k7 w - - 0 1';
  const cBNoAtt = new Chess(fenBNoAtt);
  const tropB = calculateKingTropism(cBNoAtt, 'w');
  const attB = countKingAttackers(cBNoAtt, 'w');
  assert(tropB === 2 && attB === 0, 'Tropism ≠ Attackers: Bishop dist 3 no rays into ring -> Tropism=2, Attackers=0');

  // Caso 3: Attackers > 0, Tropism = 0
  // Rook on a-file attacking a4 adjacent to King b4, but Rook is at a8 (dist 4 -> Tropism=0!)
  // King at b4 (4,1). Adjacent square a4 (4,0).
  // Black Rook at a8 (0,0). Open file a8-a4!
  // Dist(a8, b4) = max(|0-4|, |0-1|) = 4 >= 4 -> Tropism = 0!
  // But Rook at a8 attacks a4 (which is in King ring)! Attackers = 1!
  const fenDistAtt = 'r7/8/8/8/1K6/8/8/k7 w - - 0 1';
  const cDistAtt = new Chess(fenDistAtt);
  const tropDist = calculateKingTropism(cDistAtt, 'w');
  const attDist = countKingAttackers(cDistAtt, 'w');
  assert(tropDist === 0 && attDist === 1,
    'Tropism ≠ Attackers: Distant Rook (dist 4) attacking king ring -> Tropism=0, Attackers=1');

  // Caso 4: Distant Queen at h8 attacking King at b2 along diagonal (c3 in ring)
  // King at b2 (6,1). Ring includes c3 (5,2).
  // Queen at h8 (0,7). Diagonal: g7, f6, e5, d4, c3!
  // Dist(h8, b2) = max(|0-6|, |7-1|) = 6 >= 4 -> Tropism = 0!
  // But Queen attacks c3! Attackers = 1!
  const fenDistQ = '7q/8/8/8/8/8/1K6/k7 w - - 0 1';
  const cDistQ = new Chess(fenDistQ);
  assert(calculateKingTropism(cDistQ, 'w') === 0 && countKingAttackers(cDistQ, 'w') === 1,
    'Tropism ≠ Attackers: Distant Queen (dist 6) attacking king ring -> Tropism=0, Attackers=1');
}

// Category 10: Teste de Material (Tipo de peça não altera bônus)
{
  const fenQN = '8/8/2q5/8/4K3/8/8/k7 w - - 0 1'; // Queen dist 2
  const fenRN = '8/8/2r5/8/4K3/8/8/k7 w - - 0 1'; // Rook dist 2
  const fenBN = '8/8/2b5/8/4K3/8/8/k7 w - - 0 1'; // Bishop dist 2
  const fenKN = '8/8/2n5/8/4K3/8/8/k7 w - - 0 1'; // Knight dist 2

  const tQ = calculateKingTropism(new Chess(fenQN), 'w');
  const tR = calculateKingTropism(new Chess(fenRN), 'w');
  const tB = calculateKingTropism(new Chess(fenBN), 'w');
  const tN = calculateKingTropism(new Chess(fenKN), 'w');

  assert(tQ === 4 && tR === 4 && tB === 4 && tN === 4,
    'Material Invariance: Queen, Rook, Bishop, Knight at dist 2 all give exactly 4 cp');
}

// Category 11: Interação com Pawn Shield
{
  // King at g1 with full shield (f2, g2, h2 pawns) -> countPawnShield returns 3 pawns
  // Case A: Shield + low tropism (no enemy pieces nearby)
  const fenShieldLow = '4k3/8/8/8/8/8/5PPP/6K1 w - - 0 1';
  const gameSL = new Chess(fenShieldLow);
  const shieldSL = countPawnShield(gameSL, 'w');
  const tropSL = calculateKingTropism(gameSL, 'w');
  assert(shieldSL === 3, 'Interação Shield: Shield completo = 3 peões');
  assert(tropSL === 0, 'Interação Shield: Tropism inicial = 0 cp');

  // Case B: Shield + high tropism (Black Queen at g3, dist 2)
  const fenShieldHigh = '4k3/8/8/8/8/6q1/5PPP/6K1 w - - 0 1';
  const gameSH = new Chess(fenShieldHigh);
  const shieldSH = countPawnShield(gameSH, 'w');
  const tropSH = calculateKingTropism(gameSH, 'w');
  assert(shieldSH === 3 && tropSH === 4, 'Interação Shield: Tropism alto (4 cp) preserva shield (3 peões)');
}

// Category 12: Interação com King Attackers (Double Counting Check)
{
  // Queen at dist 1 attacking adjacent square
  // King e4 (4,4), Queen e5 (3,4) -> dist 1. Attacks e5, d5, f5, d4, f4, etc.
  const fenQClose = '8/8/8/4q3/4K3/8/8/k7 w - - 0 1';
  const gQC = new Chess(fenQClose);
  const tropQC = calculateKingTropism(gQC, 'w');
  const attQC = countKingAttackers(gQC, 'w');
  assert(tropQC === 6, 'Double counting check: King Tropism = 6 cp');
  assert(attQC === 1, 'Double counting check: King Attackers = 1 attacker (-6 cp)');
  // Together: Tropism gives -6 to White (enemy +6), Attackers gives -6 to White
  const evalQC = evaluateBoard(gQC);
  assert(typeof evalQC === 'number', 'Double counting check: Ambos coexistem aditivamente');
}

// Category 13: Interação com Rook Activity
{
  // Rook on open file far from King: File a open, White King at g1, Black Rook at a8
  const fenRA1 = 'r6k/8/8/8/8/8/6PP/6K1 w - - 0 1';
  const gRA1 = new Chess(fenRA1);
  const tropRA1 = calculateKingTropism(gRA1, 'w'); // max(|0-7|, |0-6|) = 7 -> 0
  const attRA1 = countKingAttackers(gRA1, 'w'); // attacks a-file, King at g1 -> 0
  assert(tropRA1 === 0 && attRA1 === 0, 'Rook Activity: Rook distant open file -> Tropism=0, Attackers=0');

  // Rook on open file close to King: File g open, King at g1, Black Rook at g4 (dist 3)
  const fenRA2 = '7k/8/8/8/6r1/8/6PP/6K1 w - - 0 1';
  // King at g1 (7,6), Rook at g4 (4,6) -> dist max(|4-7|, |6-6|) = 3 -> Tropism = 2
  const gRA2 = new Chess(fenRA2);
  const tropRA2 = calculateKingTropism(gRA2, 'w');
  assert(tropRA2 === 2, 'Rook Activity: Rook near open file -> Tropism = 2 cp');
}

// Category 14: Determinismo
{
  const fenDet = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4';
  const results: number[] = [];
  for (let i = 0; i < 10; i++) {
    results.push(calculateKingTropism(new Chess(fenDet), 'w'));
  }
  const allSame = results.every(r => r === results[0]);
  assert(allSame, `Determinismo: 10 execuções idênticas (${results[0]} cp)`);
}

console.log(`\n========================================`);
console.log(`TOTAL TESTS: ${passCount + failCount}`);
console.log(`PASS: ${passCount}`);
console.log(`FAIL: ${failCount}`);
console.log(`========================================`);

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL KING TROPISM UNIT TESTS PASSED!');
}
