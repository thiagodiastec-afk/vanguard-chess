/**
 * FASE 5.4E — Pawn Structure Unit Tests (Doubled & Isolated Pawns)
 * Validates pure penalty deltas, symmetry, accumulation, and absence of false penalties.
 */
import { Chess } from 'chess.js';
import { evaluateBoard, pawnStructureConfig } from './src/lib/engine.ts';

function getPawnStructureDelta(
  fen: string,
  config: { doubledPawnPenalty: number; isolatedPawnPenalty: number } = { doubledPawnPenalty: 10, isolatedPawnPenalty: 10 }
): number {
  const g = new Chess(fen);

  pawnStructureConfig.doubledPawnPenalty = 0;
  pawnStructureConfig.isolatedPawnPenalty = 0;
  const baseEval = evaluateBoard(g);

  pawnStructureConfig.doubledPawnPenalty = config.doubledPawnPenalty;
  pawnStructureConfig.isolatedPawnPenalty = config.isolatedPawnPenalty;
  const testEval = evaluateBoard(g);

  // Restore defaults
  pawnStructureConfig.doubledPawnPenalty = 10;
  pawnStructureConfig.isolatedPawnPenalty = 10;

  return testEval - baseEval;
}

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, name: string, detail?: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ FAIL: ${name} ${detail ? `(${detail})` : ''}`);
  }
}

console.log('=== PAWN STRUCTURE UNIT TESTS (5.4E) ===\n');

// 1. Posição sem peões: penalidade zero
console.log('--- 1. No Pawns: Zero Penalty ---');
const noPawnsFen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
const deltaNoPawns = getPawnStructureDelta(noPawnsFen);
assert(deltaNoPawns === 0, 'No pawns -> 0 cp penalty', `got ${deltaNoPawns}`);

// 2. Um peão isolado (White pawn on a4, no allied pawns on b)
console.log('\n--- 2. Single Isolated Pawn ---');
const singleIsolatedFen = '4k3/8/8/8/P7/8/8/4K3 w - - 0 1';
const deltaSingleIsolated = getPawnStructureDelta(singleIsolatedFen);
assert(deltaSingleIsolated === -10, 'Single White isolated pawn -> -10 cp', `got ${deltaSingleIsolated}`);

// 3. Um peão com suporte de peões em coluna adjacente (White pawn on a4, b3: not isolated)
console.log('\n--- 3. Pawn with Adjacent Support ---');
const supportedPawnFen = '4k3/8/8/8/P7/1P6/8/4K3 w - - 0 1';
const deltaSupported = getPawnStructureDelta(supportedPawnFen);
assert(deltaSupported === 0, 'Pawn with adjacent support -> 0 cp penalty', `got ${deltaSupported}`);

// 4. Dois peões aliados na mesma coluna (White pawns on c3, c4, with support on b2: doubled = 1 excess, isolated = 0)
console.log('\n--- 4. Two Allied Pawns on Same File (Doubled) ---');
const doubledSupportedFen = '4k3/8/8/8/2P5/1P1P4/2P5/4K3 w - - 0 1';
// Here c2 and c4 are doubled (1 excess), with support on b and d -> doubled only
const deltaDoubledOnly = getPawnStructureDelta(doubledSupportedFen, { doubledPawnPenalty: 10, isolatedPawnPenalty: 0 });
assert(deltaDoubledOnly === -10, 'Doubled pawns (1 excess) with support -> -10 cp', `got ${deltaDoubledOnly}`);

// 5. Três peões aliados na mesma coluna (White pawns on c2, c3, c4: 2 excess)
console.log('\n--- 5. Three Allied Pawns on Same File (Tripled = 2 Excess) ---');
const tripledSupportedFen = '4k3/8/8/8/2P5/1PPP4/2P5/4K3 w - - 0 1';
// File c has 3 pawns, files b and d have pawns -> 2 excess doubled pawns, 0 isolated
const deltaTripledOnly = getPawnStructureDelta(tripledSupportedFen, { doubledPawnPenalty: 10, isolatedPawnPenalty: 0 });
assert(deltaTripledOnly === -20, 'Tripled pawns (2 excess) -> -20 cp', `got ${deltaTripledOnly}`);

// 6. Peões dobrados com suporte lateral (verificação completa com ambas penalidades ativas)
console.log('\n--- 6. Doubled Pawns with Lateral Support (Both Penalties Active) ---');
const deltaDoubledWithSupportAll = getPawnStructureDelta(doubledSupportedFen);
assert(deltaDoubledWithSupportAll === -10, 'Doubled pawns with lateral support: only doubled penalty (-10 cp)', `got ${deltaDoubledWithSupportAll}`);

// 7. Peões isolados em colunas diferentes (White pawn on a4, pawn on h4: 2 isolated pawns)
console.log('\n--- 7. Isolated Pawns on Different Files ---');
const twoIsolatedFen = '4k3/8/8/8/P6P/8/8/4K3 w - - 0 1';
const deltaTwoIsolated = getPawnStructureDelta(twoIsolatedFen);
assert(deltaTwoIsolated === -20, 'Two isolated pawns on different files -> -20 cp', `got ${deltaTwoIsolated}`);

// 8. Estruturas equivalentes para brancas e pretas (Black 2 isolated pawns: +20 cp from White perspective)
console.log('\n--- 8. Equivalent Structures for White and Black ---');
const blackTwoIsolatedFen = '4k3/8/8/p6p/8/8/8/4K3 w - - 0 1';
const deltaBlackTwoIsolated = getPawnStructureDelta(blackTwoIsolatedFen);
assert(deltaBlackTwoIsolated === 20, 'Black 2 isolated pawns penalizes Black -> +20 cp for White', `got ${deltaBlackTwoIsolated}`);

// 9. Posição espelhada com inversão de perspectiva
console.log('\n--- 9. Mirror Position Perspective Inversion ---');
const mirrorWhiteFen = '8/8/8/4k3/8/8/P7/4K3 w - - 0 1'; // White pawn a2
const mirrorBlackFen = '4k3/p7/8/8/4K3/8/8/8 b - - 0 1'; // Black pawn a7 (mirror)
pawnStructureConfig.doubledPawnPenalty = 10;
pawnStructureConfig.isolatedPawnPenalty = 10;
const evalMirrorW = evaluateBoard(new Chess(mirrorWhiteFen));
const evalMirrorB = evaluateBoard(new Chess(mirrorBlackFen));
assert(evalMirrorW === -evalMirrorB, `Mirror eval strictly symmetric: W=${evalMirrorW}, B=${evalMirrorB}`, `W=${evalMirrorW}, B=${evalMirrorB}`);

// 10. Acúmulo de penalidades quando um peão é dobrado e isolado
// White has pawns on a3, a4; no pawns on b -> doubled excess = 1 (-10 cp), isolated count = 2 (-20 cp) -> total -30 cp
console.log('\n--- 10. Accumulation: Doubled AND Isolated ---');
const doubledAndIsolatedFen = '4k3/8/8/8/P7/P7/8/4K3 w - - 0 1';
const deltaAccumulated = getPawnStructureDelta(doubledAndIsolatedFen);
assert(deltaAccumulated === -30, 'Doubled (1 excess) AND Isolated (2 pawns) -> -30 cp total penalty', `got ${deltaAccumulated}`);

// 11. Ausência de penalidade por peões adversários na coluna adjacente
// White pawn on a4, Black pawn on b5: White pawn has NO allied pawns on b -> ISOLATED (adversary does not protect)
console.log('\n--- 11. Adversary Pawns on Adjacent File Do Not Support ---');
const adversaryAdjFen = '4k3/8/8/1p6/P7/8/8/4K3 w - - 0 1';
// White pawn on a4: isolated (-10). Black pawn on b5: no allied on a or c -> isolated (+10 for White). Total delta = 0 (-10 + 10)
const deltaAdversaryAdj = getPawnStructureDelta(adversaryAdjFen);
assert(deltaAdversaryAdj === 0, 'Adversary pawns do not provide allied support (-10 W + 10 B = 0)', `got ${deltaAdversaryAdj}`);

// Verify isolated penalty solely on White pawn when Black pawn is supported by another Black pawn on c6
const adversaryAdjSupportedFen = '4k3/8/2p5/1p6/P7/8/8/4K3 w - - 0 1';
// White pawn on a4: isolated (-10). Black pawns on b5, c6: mutually supported (0). Total delta = -10
const deltaWhiteOnlyIsolated = getPawnStructureDelta(adversaryAdjSupportedFen);
assert(deltaWhiteOnlyIsolated === -10, 'White pawn remains isolated despite adversary on b5 (-10 cp)', `got ${deltaWhiteOnlyIsolated}`);

// 12. Ausência de penalidade por bloqueio vertical, por si só
// White pawn on e4, Black pawn on e5, White pawn on d3: e4 is blocked by e5, but supported by d3 -> neither doubled nor isolated!
console.log('\n--- 12. Vertical Blocking Alone Incurs No Penalty ---');
const verticalBlockFen = '4k3/8/8/4p3/4P3/3P4/8/4K3 w - - 0 1';
// White pawns on d3, e4: mutually supported (0 doubled, 0 isolated).
// Black pawn on e5: isolated without allied neighbors (+10 for White).
// If isolated penalty is tested only for doubled/isolated White:
const deltaVerticalBlockW = getPawnStructureDelta(verticalBlockFen, { doubledPawnPenalty: 10, isolatedPawnPenalty: 0 });
assert(deltaVerticalBlockW === 0, 'Vertically blocked pawn on e4 has 0 doubled penalty', `got ${deltaVerticalBlockW}`);

console.log('\n============================================');
console.log(`Tests: ${totalCount} | ✓ ${passedCount} passed | ✗ ${totalCount - passedCount} failed`);
if (passedCount === totalCount) {
  console.log('ALL TESTS PASSED ✓\n');
} else {
  console.error('SOME TESTS FAILED ✗\n');
  process.exit(1);
}
