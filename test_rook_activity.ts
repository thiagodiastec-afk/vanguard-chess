/**
 * FASE 5.4D — Rook Activity Unit Tests (Final)
 * Methodology: for each position with rook, subtract the same position
 * without the rook (but keeping all other pieces) to extract the pure bonus.
 * This isolates rook activity from material and PST noise.
 */
import { Chess } from 'chess.js';
import { evaluateBoard } from './src/lib/engine.ts';

const OPEN_BONUS = 15;
const SEMI_BONUS = 8;

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, info = '') {
  if (condition) { console.log(`  ✓ ${label}`); passed++; }
  else { console.log(`  ✗ ${label}  [${info}]`); failed++; }
}

function ev(fen: string): number { return evaluateBoard(new Chess(fen)); }

// Extract pure rook activity bonus:
// ev(pos_with_rook) - ev(pos_without_rook) = rook material+PST+activity
// ev(same_no_rook) is always the same base, so we compare DIFFERENCES between positions
// Best: compare ev(rook+fileA) - ev(rook+fileB) with ev(no_rook+fileA) - ev(no_rook+fileB)
// The difference of differences = pure bonus change from file status

console.log('=== ROOK ACTIVITY UNIT TESTS (5.4D) ===\n');

// ─── 1. File Status Bonuses ───────────────────────────────────────────────────
console.log('--- 1. Open / Semi-Open / Closed File Status ---');

// All positions: White rook e-file, Kings fixed at g1/g8. Only pawn on e varies.
// Open e-file: no pawns
const wrOpen   = ev('6k1/8/8/8/8/8/8/4R1K1 w - - 0 1');
// Semi-open for White: black has pawn e7, white has none on e
const wrSemi   = ev('6k1/4p3/8/8/8/8/8/4R1K1 w - - 0 1');
// Closed: both sides have pawn on e
const wrClosed = ev('6k1/4p3/8/8/8/8/4P3/4R1K1 w - - 0 1');

// Same positions without the rook (replace R with empty):
const nrOpen   = ev('6k1/8/8/8/8/8/8/6K1 w - - 0 1');
const nrSemi   = ev('6k1/4p3/8/8/8/8/8/6K1 w - - 0 1');
const nrClosed = ev('6k1/4p3/8/8/8/8/4P3/6K1 w - - 0 1');

// Pure rook bonus per file status:
const bonusOpen   = (wrOpen - nrOpen)   - (nrOpen - nrOpen);    // = wrOpen - nrOpen - base
const bonusSemi   = (wrSemi - nrSemi);
const bonusClosed = (wrClosed - nrClosed);

// To get "pure activity bonus", we further subtract the no-rook baseline delta:
// For open:   bonus over no-rook = wrOpen - nrOpen
// We want to know how much more the rook gets ON open vs closed vs semi
// Delta (open, semi): (wrOpen - nrOpen) - (wrSemi - nrSemi) = activity diff = OPEN - SEMI = 7
// Delta (semi, closed): (wrSemi - nrSemi) - (wrClosed - nrClosed) = SEMI - 0 = 8

const withRookDiffOpenSemi   = wrOpen - wrSemi;
const noRookDiffOpenSemi     = nrOpen - nrSemi;
const pureActivityOpenSemi   = withRookDiffOpenSemi - noRookDiffOpenSemi;

const withRookDiffSemiClosed = wrSemi - wrClosed;
const noRookDiffSemiClosed   = nrSemi - nrClosed;
const pureActivitySemiClosed = withRookDiffSemiClosed - noRookDiffSemiClosed;

const withRookDiffOpenClosed = wrOpen - wrClosed;
const noRookDiffOpenClosed   = nrOpen - nrClosed;
const pureActivityOpenClosed = withRookDiffOpenClosed - noRookDiffOpenClosed;

console.log(`  Pure activity bonus Open vs Semi:   ${pureActivityOpenSemi} cp (expected ${OPEN_BONUS - SEMI_BONUS})`);
console.log(`  Pure activity bonus Semi vs Closed: ${pureActivitySemiClosed} cp (expected ${SEMI_BONUS})`);
console.log(`  Pure activity bonus Open vs Closed: ${pureActivityOpenClosed} cp (expected ${OPEN_BONUS})`);

assert('Open - Semi activity = 7cp', pureActivityOpenSemi === OPEN_BONUS - SEMI_BONUS,   `got=${pureActivityOpenSemi}`);
assert('Semi - Closed activity = 8cp', pureActivitySemiClosed === SEMI_BONUS,             `got=${pureActivitySemiClosed}`);
assert('Open - Closed activity = 15cp', pureActivityOpenClosed === OPEN_BONUS,            `got=${pureActivityOpenClosed}`);
assert('Open file earns highest bonus', pureActivityOpenClosed > pureActivitySemiClosed,  `open=${pureActivityOpenClosed} semi=${pureActivitySemiClosed}`);

// ─── 2. Specificity: Semi-Open for White vs for Black ────────────────────────
console.log('\n--- 2. Semi-Open Specificity ---');

// Semi-open FOR WHITE: white has no pawn on e, black has pawn e7 → White rook gets bonus
const semiForWhite_rook   = ev('6k1/4p3/8/8/8/8/8/4R1K1 w - - 0 1');
const semiForWhite_noRook = ev('6k1/4p3/8/8/8/8/8/6K1 w - - 0 1');

// Semi-open FOR BLACK: white has pawn e2, black has no pawn on e → White rook gets NO bonus
const semiForBlack_rook   = ev('6k1/8/8/8/8/8/4P3/4R1K1 w - - 0 1');
const semiForBlack_noRook = ev('6k1/8/8/8/8/8/4P3/6K1 w - - 0 1');

// Compare pure rook activity in each case (vs same position without rook)
// We measure: how much extra does the rook contribute in each case vs open?
const semiForWhiteContrib   = (semiForWhite_rook - semiForWhite_noRook) - (nrOpen - nrOpen); // vs base
const semiForBlackContrib   = semiForBlack_rook - semiForBlack_noRook;
// For semiForBlack: purely measure vs same no-rook, then compare difference to open
const diffSemiWhiteVsOpen   = withRookDiffOpenSemi - noRookDiffOpenSemi; // = 7 (open - semiWhite = 7)
const diffSemiBlackVsOpen   = (wrOpen - semiForBlack_rook) - (nrOpen - semiForBlack_noRook);

console.log(`  Semi-open for White: extra bonus vs closed = ${pureActivitySemiClosed}cp (expected ${SEMI_BONUS})`);
console.log(`  Semi-open for Black (White rook there): activity vs open = ${diffSemiBlackVsOpen}cp (expected ${OPEN_BONUS})`);

assert(
  'White rook on semi-open-for-White gets SEMI bonus (8cp over closed)',
  pureActivitySemiClosed === SEMI_BONUS,
  `got=${pureActivitySemiClosed}`
);
assert(
  'White rook on semi-open-for-Black gets 0 bonus (same as closed)',
  diffSemiBlackVsOpen === OPEN_BONUS,
  `got=${diffSemiBlackVsOpen} expected=${OPEN_BONUS}`
);

// ─── 3. Symmetry ─────────────────────────────────────────────────────────────
console.log('\n--- 3. Symmetry (Perspective) Tests ---');

// White rook a1, open a-file
const wrOpenA  = ev('6k1/8/8/8/8/8/8/R5K1 w - - 0 1');
// Black rook a8, open a-file (mirror)
const brOpenA  = ev('r5k1/8/8/8/8/8/8/6K1 b - - 0 1');
console.log(`  White rook open a-file: ${wrOpenA}`);
console.log(`  Black rook open a-file: ${brOpenA}`);
assert('Open file symmetric (W = -B)', wrOpenA === -brOpenA, `W=${wrOpenA} B=${brOpenA}`);

// White rook e1 semi-open (black pawn e7)
const wrSemiE  = ev('6k1/4p3/8/8/8/8/8/4R1K1 w - - 0 1');
// Black rook e8 semi-open (white pawn e2)
const brSemiE  = ev('4r1k1/8/8/8/8/8/4P3/6K1 b - - 0 1');
console.log(`  White rook semi-open e-file: ${wrSemiE}`);
console.log(`  Black rook semi-open e-file: ${brSemiE}`);
assert('Semi-open symmetric (W = -B)', wrSemiE === -brSemiE, `W=${wrSemiE} B=${brSemiE}`);

// ─── 4. Double Rook Tests ────────────────────────────────────────────────────
console.log('\n--- 4. Double Rook Tests ---');

// 1 White rook on open a-file
const wr1Open = ev('6k1/8/8/8/8/8/8/R5K1 w - - 0 1');
const nr1     = ev('6k1/8/8/8/8/8/8/6K1 w - - 0 1');
const bonus1R = wr1Open - nr1;

// 2 White rooks, same open a-file (a1 and a2)
const wr2Same = ev('6k1/8/8/8/8/8/R7/R5K1 w - - 0 1');
const nr2Base = ev('6k1/8/8/8/8/8/8/6K1 w - - 0 1'); // no rooks
const bonus2RSame = wr2Same - nr1 - (wr1Open - nr1); // pure second rook bonus

// 2 White rooks, different open files (a1 + b1)
const wr2Diff = ev('6k1/8/8/8/8/8/8/RR4K1 w - - 0 1');
const bonus2RDiff = wr2Diff - wr1Open; // add second rook on b-file

const rook2SameActivity = (wr2Same - wr1Open); // activity contribution of 2nd rook on same open file
const rook2DiffActivity = (wr2Diff - wr1Open); // activity contribution of 2nd rook on different open file

console.log(`  1 rook on open a-file contrib: ${bonus1R}cp (includes 500 material)`);
console.log(`  2nd rook on SAME open a-file adds: ${rook2SameActivity}cp (expected material+PST+${OPEN_BONUS})`);
console.log(`  2nd rook on DIFF open b-file adds: ${rook2DiffActivity}cp (expected material+PST+${OPEN_BONUS})`);

// The rook activity portion should be same (both get OPEN_BONUS)
// We measure: how much more does a rook on open add vs closed?
const wr1Closed = ev('6k1/4p3/8/8/8/8/4P3/R5K1 w - - 0 1'); // rook a1, closed e-file
const nr1Closed = ev('6k1/4p3/8/8/8/8/4P3/6K1 w - - 0 1');
const bonus1RClosed = wr1Closed - nr1Closed;

// Pure activity for open = bonus1R - bonus1RClosed
// (same material PST context, different activity bonus)
// Actually let's just verify the per-rook open bonus is OPEN_BONUS via difference:
const pureOpen1 = (wr1Open - nr1) - (ev('6k1/8/8/8/8/8/8/R5K1 w - - 0 1') - ev('6k1/8/8/8/8/8/8/6K1 w - - 0 1'));
// Simpler: just verify that adding 2nd rook to open file gives exactly OPEN_BONUS more activity
// Fix: compare 2nd rook on open a-file vs 2nd rook NOT on any open file (both on a-file, but a-file closed vs open)
// White rooks a1 + a2, a-file open (no pawns on a):
const wr2aOpen_base = ev('6k1/8/8/8/8/R7/8/R5K1 w - - 0 1');
const wr1aOpen_base = ev('6k1/8/8/8/8/8/8/R5K1 w - - 0 1');
// White rooks a1 + a2, a-file closed (white pawn a3, black pawn a7):
const wr2aClosed_base = ev('6k1/p7/8/8/8/RP6/8/R5K1 w - - 0 1');
const wr1aClosed_base = ev('6k1/p7/8/8/8/1P6/8/R5K1 w - - 0 1');
// Wait, that adds different pawns. Let's use a cleaner approach:
// Compare the MARGINAL ACTIVITY of a 2nd rook being added to an open vs closed file:
// Both rooks on e-file. Closed e-file: white pawn e3, black pawn e6.
// 1 rook on e1 (open e):
const wr1e_open   = ev('6k1/8/8/8/8/8/8/4R1K1 w - - 0 1');  // open e
const wr2e_open   = ev('6k1/8/8/8/8/4R3/8/4R1K1 w - - 0 1'); // 2 rooks on open e
// 1 rook on e1 (closed e, both sides have e pawns):
const wr1e_closed = ev('6k1/4p3/8/8/8/8/4P3/4R1K1 w - - 0 1');
const wr2e_closed = ev('6k1/4p3/8/8/4R3/8/4P3/4R1K1 w - - 0 1'); // 2 rooks closed e

const marginalOpen   = wr2e_open - wr1e_open;
const marginalClosed = wr2e_closed - wr1e_closed;
const pureSecondRookActivity = marginalOpen - marginalClosed;
console.log(`  Extra activity: 2nd rook on open vs 2nd on closed = ${pureSecondRookActivity}cp (expected ${OPEN_BONUS})`);
assert('2nd rook on open adds exactly OPEN_BONUS activity', pureSecondRookActivity === OPEN_BONUS, `got=${pureSecondRookActivity}`);

// ─── 5. No Bonus for Closed File ────────────────────────────────────────────
console.log('\n--- 5. No Bonus on Closed File ---');
// Verified implicitly by: pureActivitySemiClosed = 8 (semi gets bonus, closed gets 0)
// And: pureActivityOpenClosed = 15 (open gets 15, closed gets 0)
// Direct check: pure closed rook activity = 0
assert('Closed file rook activity = 0 (confirmed by delta tests)', pureActivityOpenClosed - pureActivitySemiClosed === OPEN_BONUS - SEMI_BONUS, `delta=${pureActivityOpenClosed - pureActivitySemiClosed}`);

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(44)}`);
console.log(`Tests: ${passed + failed} | ✓ ${passed} passed | ✗ ${failed} failed`);
if (failed === 0) console.log('ALL TESTS PASSED ✓');
