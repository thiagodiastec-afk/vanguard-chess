import { Chess } from 'chess.js';
import {
  evaluateBoard,
  pawnStructureConfig,
  mobilityConfig,
  kingSafetyConfig,
  kingAttackersConfig,
  kingTropismConfig
} from './src/lib/engine.ts';
import { evaluateBreakdown, EvaluationBreakdown } from './src/lib/auditBreakdown.ts';
import { SANITIZED_BENCHMARK_POSITIONS } from './src/lib/analysis/engineBenchmark/benchmarkPositions.ts';
import * as fs from 'fs';

console.log('=== VANGUARD CHESS — FASE 5.4J AUDIT SUITE ===\n');

// 1. RECONSTRUCTION TEST (68 FENs)
console.log('--- ETAPA 2: TESTE DE RECONSTRUÇÃO DO TOTAL (68 FENs) ---');
let reconPass = 0;
let reconFail = 0;
for (const p of SANITIZED_BENCHMARK_POSITIONS) {
  const g1 = new Chess(p.fen);
  const realScore = evaluateBoard(g1);
  const g2 = new Chess(p.fen);
  const breakdown = evaluateBreakdown(g2);
  if (realScore === breakdown.total) {
    reconPass++;
  } else {
    reconFail++;
    console.error(`Mismatch ${p.id}: real=${realScore}, breakdown=${breakdown.total}`);
  }
}
console.log(`Reconstrução do Total: ${reconPass === 68 ? 'PASS' : 'FAIL'} (${reconPass}/68)\n`);

// 2. ZERO-BASELINE TESTS (ETAPA 3)
console.log('--- ETAPA 3: ZERO-BASELINE TESTS ---');
{
  // King Tropism = 0 (enemies far)
  const gTrop0 = new Chess('7k/8/8/8/8/8/8/K6q w - - 0 1'); // dist 7
  const bTrop0 = evaluateBreakdown(gTrop0);
  console.log('Zero-Baseline King Tropism:', bTrop0.kingTropism === 0 ? 'PASS' : 'FAIL', `(${bTrop0.kingTropism} cp)`);

  // Pawn Shield = 0 (no shield pawns)
  const gShield0 = new Chess('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
  const bShield0 = evaluateBreakdown(gShield0);
  console.log('Zero-Baseline Pawn Shield:', bShield0.pawnShield === 0 ? 'PASS' : 'FAIL', `(${bShield0.pawnShield} cp)`);

  // Bishop Pair = 0 (one bishop each)
  const gBP0 = new Chess('4k3/8/8/2b5/2B5/8/8/4K3 w - - 0 1');
  const bBP0 = evaluateBreakdown(gBP0);
  console.log('Zero-Baseline Bishop Pair:', bBP0.bishopPair === 0 ? 'PASS' : 'FAIL', `(${bBP0.bishopPair} cp)`);

  // Rook Activity = 0 (rook on closed file h)
  const gRA0 = new Chess('4k3/7p/8/8/8/8/7P/4K2R w - - 0 1');
  const bRA0 = evaluateBreakdown(gRA0);
  console.log('Zero-Baseline Rook Activity:', bRA0.rookActivity === 0 ? 'PASS' : 'FAIL', `(${bRA0.rookActivity} cp)`);

  // Passed Pawn = 0 (no passed pawns)
  const gPP0 = new Chess('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const bPP0 = evaluateBreakdown(gPP0);
  console.log('Zero-Baseline Passed Pawn:', bPP0.passedPawn === 0 ? 'PASS' : 'FAIL', `(${bPP0.passedPawn} cp)`);

  // King Attackers = 0 (no attackers on ring)
  const gAtt0Clean = new Chess('r3k3/8/8/8/8/8/8/4K3 w - - 0 1');
  const bAtt0Clean = evaluateBreakdown(gAtt0Clean);
  console.log('Zero-Baseline King Attackers:', bAtt0Clean.kingAttackers === 0 ? 'PASS' : 'FAIL', `(${bAtt0Clean.kingAttackers} cp)`);

  // Pawn Structure = 0 (no doubled, no isolated)
  const gPS0 = new Chess('4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1');
  const bPS0 = evaluateBreakdown(gPS0);
  console.log('Zero-Baseline Pawn Structure:', bPS0.pawnStructure === 0 ? 'PASS' : 'FAIL', `(${bPS0.pawnStructure} cp)\n`);
}

// 3. GLOBAL SYMMETRY (ETAPA 4)
console.log('--- ETAPA 4: GLOBAL SYMMETRY TEST (10 PARES) ---');
const symmetryPairs = [
  { name: 'Initial', fenW: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', fenB: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1' },
  { name: '1. e4 vs 1. e5', fenW: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', fenB: 'rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
  { name: 'Queen vs Queen mirror', fenW: '4k3/4q3/8/8/8/8/8/4K3 w - - 0 1', fenB: '4k3/8/8/8/8/8/4Q3/4K3 b - - 0 1' },
  { name: 'Rook on open file mirror', fenW: '4k3/8/8/8/8/8/8/R3K2r w - - 0 1', fenB: 'r3k2R/8/8/8/8/8/8/4K3 b - - 0 1' },
  { name: 'Shield asymmetric mirror A', fenW: '4k3/8/8/8/8/8/5PPP/6K1 w - - 0 1', fenB: '6k1/5ppp/8/8/8/8/8/4K3 b - - 0 1' },
  { name: 'Passed pawn mirror', fenW: '4k3/8/4P3/8/8/8/8/4K3 w - - 0 1', fenB: '4k3/8/8/8/8/4p3/8/4K3 b - - 0 1' },
  { name: 'Doubled pawn mirror', fenW: '4k3/8/8/8/8/2P5/2P5/4K3 w - - 0 1', fenB: '4k3/2p5/2p5/8/8/8/8/4K3 b - - 0 1' },
  { name: 'Bishop pair mirror', fenW: '4k3/8/8/8/8/8/8/2B1KB2 w - - 0 1', fenB: '2b1kb2/8/8/8/8/8/8/4K3 b - - 0 1' },
  { name: 'Knight attack mirror', fenW: '4k3/8/8/8/8/5n2/8/4K3 w - - 0 1', fenB: '4k3/8/5N2/8/8/8/8/4K3 b - - 0 1' },
  { name: 'Complex midgame mirror', fenW: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4', fenB: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 4 4' }
];

let symPass = 0;
for (const pair of symmetryPairs) {
  const gW = new Chess(pair.fenW);
  const gB = new Chess(pair.fenB);
  const sW = evaluateBoard(gW);
  const sB = evaluateBoard(gB);
  const sum = sW + sB;
  if (sum === 0) {
    symPass++;
  } else {
    console.error(`Symmetry fail in ${pair.name}: sW=${sW}, sB=${sB}, sum=${sum}`);
  }
}
console.log(`Global Symmetry: ${symPass === symmetryPairs.length ? 'PASS' : 'FAIL'} (${symPass}/${symmetryPairs.length} pares com soma exatamente 0)\n`);

// 4. COMPONENT DOMINANCE MATRIX ON 68 FENs (ETAPAS 5, 11, 12, 13)
console.log('--- ETAPA 13: COMPONENT DOMINANCE MATRIX (68 FENs) ---');

const breakdowns: EvaluationBreakdown[] = SANITIZED_BENCHMARK_POSITIONS.map(p => evaluateBreakdown(new Chess(p.fen)));

interface MetricStats {
  name: string;
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  maxAbs: number;
  meanAbs: number;
}

function computeStats(name: string, values: number[]): MetricStats {
  const sorted = [...values].sort((a, b) => a - b);
  const absSorted = values.map(Math.abs).sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const absSum = absSorted.reduce((a, b) => a + b, 0);
  const n = values.length;

  return {
    name,
    min: sorted[0],
    max: sorted[n - 1],
    mean: +(sum / n).toFixed(2),
    median: sorted[Math.floor(n * 0.5)],
    p95: sorted[Math.floor(n * 0.95)],
    maxAbs: absSorted[n - 1],
    meanAbs: +(absSum / n).toFixed(2)
  };
}

const termsToAnalyze = [
  'material',
  'taperedBase',
  'passedPawn',
  'bishopPair',
  'rookActivity',
  'pawnStructure',
  'mobility',
  'pawnShield',
  'kingAttackers',
  'kingTropism',
  'total'
] as const;

const statsReport: MetricStats[] = termsToAnalyze.map(term => {
  const vals = breakdowns.map(b => (b as any)[term] as number);
  return computeStats(term, vals);
});

console.table(statsReport);

// 5. PAWN STRUCTURE INTERACTION AUDIT (ETAPA 6)
console.log('\n--- ETAPA 6: PAWN STRUCTURE INTERACTION AUDIT ---');
{
  // A: Passed pawn healthy
  const gA = new Chess('4k3/8/4P3/8/8/8/8/4K3 w - - 0 1');
  const bA = evaluateBreakdown(gA);
  console.log('Caso A (Passed saudável):', { passed: bA.passedPawn, doubled: bA.doubledPawn, isolated: bA.isolatedPawn, total: bA.total });

  // B: Passed + isolated
  const gB = new Chess('4k3/8/8/1P6/8/8/8/4K3 w - - 0 1');
  const bB = evaluateBreakdown(gB);
  console.log('Caso B (Passed + isolated):', { passed: bB.passedPawn, doubled: bB.doubledPawn, isolated: bB.isolatedPawn, total: bB.total });

  // C: Passed + doubled
  const gC = new Chess('4k3/8/8/4P3/4P3/8/8/4K3 w - - 0 1');
  const bC = evaluateBreakdown(gC);
  console.log('Caso C (Passed + doubled):', { passed: bC.passedPawn, doubled: bC.doubledPawn, isolated: bC.isolatedPawn, total: bC.total });

  // D: Doubled + isolated sem passed
  const gD = new Chess('4k3/2p5/8/8/8/2P5/2P5/4K3 w - - 0 1');
  const bD = evaluateBreakdown(gD);
  console.log('Caso D (Doubled + isolated sem passed):', { passed: bD.passedPawn, doubled: bD.doubledPawn, isolated: bD.isolatedPawn, total: bD.total });
}

// 6. ROOK ACTIVITY × MOBILITY (ETAPA 7)
console.log('\n--- ETAPA 7: ROOK ACTIVITY × MOBILITY ---');
{
  // 1. rook closed (pawn on h2 and h7) + low mobility
  const g1 = new Chess('4k3/7p/8/8/8/8/7P/4K2R w K - 0 1');
  const b1 = evaluateBreakdown(g1);
  console.log('1. Closed + Low Mob:', { rookActivity: b1.rookActivity, mobility: b1.mobility, total: b1.total });

  // 2. rook closed (pawns on a2 and a7) + high mobility
  const g2 = new Chess('4k3/p7/8/8/8/8/P7/R3K3 w Q - 0 1');
  const b2 = evaluateBreakdown(g2);
  console.log('2. Closed + High Mob:', { rookActivity: b2.rookActivity, mobility: b2.mobility, total: b2.total });

  // 3. rook open + low mobility
  const g3 = new Chess('4k3/8/8/8/8/8/8/4K2R w K - 0 1');
  const b3 = evaluateBreakdown(g3);
  console.log('3. Open + Low Mob:', { rookActivity: b3.rookActivity, mobility: b3.mobility, total: b3.total });

  // 4. rook open + high mobility
  const g4 = new Chess('4k3/8/8/8/8/8/8/R3K3 w Q - 0 1');
  const b4 = evaluateBreakdown(g4);
  console.log('4. Open + High Mob:', { rookActivity: b4.rookActivity, mobility: b4.mobility, total: b4.total });
}

// 7. PAWN SHIELD × KING ATTACKERS (ETAPA 9)
console.log('\n--- ETAPA 9: PAWN SHIELD × KING ATTACKERS MATRIX ---');
{
  // Shield 0, 1, 2, 3 vs Attackers 0, 1, 2
  const fensShield = [
    '4k3/8/8/8/8/8/8/6K1 w - - 0 1',        // Shield 0
    '4k3/8/8/8/8/8/5P2/6K1 w - - 0 1',      // Shield 1 (f2)
    '4k3/8/8/8/8/8/5PP1/6K1 w - - 0 1',     // Shield 2 (f2, g2)
    '4k3/8/8/8/8/8/5PPP/6K1 w - - 0 1'      // Shield 3 (f2, g2, h2)
  ];

  for (let s = 0; s <= 3; s++) {
    const b0 = evaluateBreakdown(new Chess(fensShield[s]));
    console.log(`Shield ${s}: PawnShield=${b0.pawnShield} cp, Attackers=${b0.kingAttackers} cp, Tropism=${b0.kingTropism} cp, Total=${b0.total} cp`);
  }
}

// 8. KING ATTACKERS × KING TROPISM (ETAPA 10)
console.log('\n--- ETAPA 10: KING ATTACKERS × KING TROPISM MATRIX ---');
{
  // Caso 1: Tropism = 0, Attackers = 0
  const c1 = evaluateBreakdown(new Chess('4k3/8/8/8/8/8/8/4K2r w - - 0 1')); // rook distant rank 1? King at e1, rook h1 attacks f1!
  const c1Clean = evaluateBreakdown(new Chess('r3k3/8/8/8/8/8/8/4K3 w - - 0 1'));
  console.log('Caso 1 (Tropism=0, Attackers=0):', { tropism: c1Clean.kingTropism, attackers: c1Clean.kingAttackers });

  // Caso 2: Tropism > 0, Attackers = 0
  const c2 = evaluateBreakdown(new Chess('8/4q3/4P3/8/4K3/8/8/k7 w - - 0 1'));
  console.log('Caso 2 (Tropism>0, Attackers=0):', { tropism: c2.kingTropism, attackers: c2.kingAttackers });

  // Caso 3: Tropism = 0, Attackers > 0
  const c3 = evaluateBreakdown(new Chess('r7/8/8/8/1K6/8/8/k7 w - - 0 1'));
  console.log('Caso 3 (Tropism=0, Attackers>0):', { tropism: c3.kingTropism, attackers: c3.kingAttackers });

  // Caso 4: Tropism > 0, Attackers > 0
  const c4 = evaluateBreakdown(new Chess('8/8/8/4q3/4K3/8/8/k7 w - - 0 1'));
  console.log('Caso 4 (Tropism>0, Attackers>0):', { tropism: c4.kingTropism, attackers: c4.kingAttackers });
}

// 9. TOTAL KING SAFETY MAGNITUDE (ETAPA 11)
console.log('\n--- ETAPA 11: TOTAL KING SAFETY MAGNITUDE ---');
const ksValues = breakdowns.map(b => b.pawnShield + b.kingAttackers + b.kingTropism);
const ksStats = computeStats('TotalKingSafety', ksValues);
console.log('King Safety Contribution (PawnShield + Attackers + Tropism):', ksStats);

// Save results
fs.writeFileSync('audit_phase54j_stats.json', JSON.stringify({
  statsReport,
  ksStats
}, null, 2));

console.log('\nAudit data salvo com sucesso em audit_phase54j_stats.json');
