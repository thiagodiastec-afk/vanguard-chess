import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Run this test inside the Firestore emulator.');

const projectId = 'demo-vanguard-chess';
const databaseId = '(default)';
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' }
});
const serviceAccount = {
  project_id: projectId,
  client_email: 'firebase-adminsdk-test@demo-vanguard-chess.iam.gserviceaccount.com',
  private_key: privateKey
};
const app = initializeApp({ projectId, credential: cert(serviceAccount) }, 'private-migration-test');
const db = getFirestore(app, databaseId);
const profileRef = db.collection('users').doc('migration-target');
const privateRef = db.collection('userPrivate').doc('migration-target');
const premiumUntil = Date.now() + 86_400_000;

await profileRef.set({
  uid: 'migration-target', displayName: 'Migration Target', elo: 1420, gamesPlayed: 8,
  stats: { wins: 6, losses: 2, draws: 0 }, eloHistory: [{ date: 100, elo: 1300 }, { date: 200, elo: 1420 }],
  coins: 1725, unlockedThemes: ['luxury', 'classic', 'gold'],
  unlockedBackgrounds: ['default', 'deep-space'], isPremium: true,
  premiumUntil, paymentHistory: [{ id: 'old-payment' }]
});

const childEnv = {
  ...process.env,
  FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
  FIRESTORE_DATABASE_ID: databaseId,
  FIREBASE_SERVICE_ACCOUNT: JSON.stringify(serviceAccount)
};
const dryRun = spawnSync(process.execPath, ['scripts/migrate_user_private.mjs'], {
  cwd: process.cwd(), env: childEnv, encoding: 'utf8', timeout: 20_000
});
if (dryRun.stdout) process.stdout.write(dryRun.stdout);
if (dryRun.stderr) process.stderr.write(dryRun.stderr);
assert.equal(dryRun.status, 0, `Migration dry-run failed (status ${dryRun.status})`);
assert.equal((await profileRef.get()).get('coins'), 1725, 'Dry-run must leave legacy public data untouched');
assert.equal((await profileRef.get()).get('elo'), 1420, 'Dry-run must not reset legacy competitive data');

for (let run = 1; run <= 2; run++) {
  const result = spawnSync(process.execPath, ['scripts/migrate_user_private.mjs', '--apply'], {
    cwd: process.cwd(), env: childEnv, encoding: 'utf8', timeout: 20_000
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  assert.equal(result.status, 0, `Migration run ${run} failed (status ${result.status})`);
  if (run === 1) {
    const resetProfile = await profileRef.get();
    assert.equal(resetProfile.get('elo'), 1200);
    assert.equal(resetProfile.get('gamesPlayed'), 0);
    assert.deepEqual(resetProfile.get('stats'), { wins: 0, losses: 0, draws: 0 });
    assert.deepEqual(resetProfile.get('eloHistory'), []);
    await profileRef.update({
      elo: 1288, gamesPlayed: 1, stats: { wins: 1, losses: 0, draws: 0 },
      eloHistory: [{ date: 300, elo: 1288 }]
    });
  }
}

const [publicProfile, privateProfile] = await Promise.all([profileRef.get(), privateRef.get()]);
assert.equal(publicProfile.get('profileSchemaVersion'), 2);
assert.equal(publicProfile.get('hasPremiumBadge'), true);
assert.equal(publicProfile.get('elo'), 1288, 'Repeat migration must preserve newly verified Elo');
assert.equal(publicProfile.get('gamesPlayed'), 1);
assert.deepEqual(publicProfile.get('stats'), { wins: 1, losses: 0, draws: 0 });
assert.deepEqual(publicProfile.get('eloHistory'), [{ date: 300, elo: 1288 }]);
for (const field of ['coins', 'unlockedThemes', 'unlockedBackgrounds', 'isPremium', 'premiumUntil', 'paymentHistory']) {
  assert.equal(Object.hasOwn(publicProfile.data(), field), false, `Public profile still contains ${field}`);
}
assert.equal(privateProfile.get('coins'), 1725);
assert.deepEqual(privateProfile.get('unlockedThemes'), ['luxury', 'classic', 'gold']);
assert.deepEqual(privateProfile.get('unlockedBackgrounds'), ['default', 'deep-space']);
assert.equal(privateProfile.get('isPremium'), true);
assert.equal(privateProfile.get('premiumUntil'), premiumUntil);
assert.deepEqual(privateProfile.get('paymentHistory'), [{ id: 'old-payment' }]);
assert.equal(privateProfile.get('competitiveDataVersion'), 1);
const legacyCompetitiveRecord = privateProfile.get('legacyCompetitiveRecord');
assert.equal(legacyCompetitiveRecord.elo, 1420);
assert.equal(legacyCompetitiveRecord.gamesPlayed, 8);
assert.deepEqual(legacyCompetitiveRecord.stats, { wins: 6, losses: 2, draws: 0 });
assert.deepEqual(legacyCompetitiveRecord.eloHistory, [{ date: 100, elo: 1300 }, { date: 200, elo: 1420 }]);
assert.equal(Number.isFinite(legacyCompetitiveRecord.archivedAt), true);

console.log('Legacy private-profile migration: PASS (preserved wallet/inventory/subscription, archived legacy rating, and reset it idempotently).');
await app.delete();
