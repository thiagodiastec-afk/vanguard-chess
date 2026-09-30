import dotenv from 'dotenv';
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldPath, FieldValue, getFirestore } from 'firebase-admin/firestore';

dotenv.config();

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) throw new Error('FIREBASE_SERVICE_ACCOUNT must be configured in the server secret store.');
const databaseId = process.env.FIRESTORE_DATABASE_ID;
if (!databaseId) throw new Error('FIRESTORE_DATABASE_ID must be configured before migration.');

const serviceAccount = JSON.parse(serviceAccountJson);
const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore(app, databaseId);
const users = db.collection('users');
const PAGE_SIZE = 100;
const applyMigration = process.argv.includes('--apply');
const paidThemeIds = new Set([
  'blue', 'coral', 'dark', 'neon', 'marble', 'gold', 'amethyst', 'forest', 'ruby', 'obsidian', 'galaxy'
]);
const paidBackgroundIds = new Set([
  'deep-space', 'cyber-grid', 'crimson-fade', 'golden-sand', 'ocean-depth', 'chess-pattern',
  'emerald-glow', 'purple-nebula', 'abstract-waves'
]);

let cursor;
let migrated = 0;
let failed = 0;

if (!applyMigration) console.log('DRY RUN: no documents will be changed. Pass --apply to perform the migration.');

while (true) {
  let pageQuery = users.orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
  if (cursor) pageQuery = pageQuery.startAfter(cursor);
  const page = await pageQuery.get();
  if (page.empty) break;

  for (const userDoc of page.docs) {
    const privateRef = db.collection('userPrivate').doc(userDoc.id);
    try {
      if (!applyMigration) {
        const privateSnapshot = await privateRef.get();
        const hasLegacyFields = ['coins', 'unlockedThemes', 'unlockedBackgrounds', 'isPremium', 'premiumUntil', 'paymentHistory']
          .some((field) => Object.prototype.hasOwnProperty.call(userDoc.data(), field));
        if (hasLegacyFields || !privateSnapshot.exists || privateSnapshot.get('competitiveDataVersion') !== 1) migrated++;
        continue;
      }
      await db.runTransaction(async (transaction) => {
        const [publicSnapshot, privateSnapshot] = await Promise.all([
          transaction.get(userDoc.ref), transaction.get(privateRef)
        ]);
        if (!publicSnapshot.exists) return;
        const profile = publicSnapshot.data() || {};
        const existing = privateSnapshot.data() || {};
        const needsCompetitiveBaseline = existing.competitiveDataVersion !== 1;
        const oldThemes = Array.isArray(profile.unlockedThemes) ? profile.unlockedThemes : [];
        const oldBackgrounds = Array.isArray(profile.unlockedBackgrounds) ? profile.unlockedBackgrounds : [];
        const sourceThemes = Array.isArray(existing.unlockedThemes) ? existing.unlockedThemes : oldThemes;
        const sourceBackgrounds = Array.isArray(existing.unlockedBackgrounds) ? existing.unlockedBackgrounds : oldBackgrounds;
        const themes = [...new Set(['luxury', 'classic', ...sourceThemes.filter((id) => paidThemeIds.has(id))])];
        const backgrounds = [...new Set(['default', ...sourceBackgrounds.filter((id) => paidBackgroundIds.has(id))])];
        const rawCoins = Number(existing.coins ?? profile.coins);
        const isPremium = Boolean(existing.isPremium ?? profile.isPremium);
        const premiumUntil = Number(existing.premiumUntil ?? profile.premiumUntil) || 0;
        const privateProfile = {
          coins: Number.isFinite(rawCoins) && rawCoins >= 0 ? Math.floor(rawCoins) : 500,
          unlockedThemes: themes,
          unlockedBackgrounds: backgrounds,
          isPremium,
          premiumUntil,
          competitiveDataVersion: 1
        };
        if (needsCompetitiveBaseline) {
          privateProfile.legacyCompetitiveRecord = existing.legacyCompetitiveRecord || legacyCompetitiveSnapshot(profile);
        }
        const paymentHistory = existing.paymentHistory ?? profile.paymentHistory;
        if (Array.isArray(paymentHistory)) privateProfile.paymentHistory = paymentHistory;

        transaction.set(privateRef, privateProfile, { merge: true });
        transaction.update(userDoc.ref, {
          profileSchemaVersion: 2,
          coins: FieldValue.delete(),
          unlockedThemes: FieldValue.delete(),
          unlockedBackgrounds: FieldValue.delete(),
          isPremium: FieldValue.delete(),
          premiumUntil: FieldValue.delete(),
          paymentHistory: FieldValue.delete(),
          hasPremiumBadge: isPremium && premiumUntil > Date.now(),
          ...(needsCompetitiveBaseline ? {
            elo: 1200,
            gamesPlayed: 0,
            stats: { wins: 0, losses: 0, draws: 0 },
            eloHistory: []
          } : {})
        });
      });
      migrated++;
    } catch (error) {
      failed++;
      console.error(`Migration failed for user ${userDoc.id}:`, error.message);
    }
  }

  cursor = page.docs[page.docs.length - 1];
  const outcomeLabel = applyMigration ? 'migrated' : 'planned';
  console.log(`Processed ${migrated + failed} profiles; ${outcomeLabel} ${migrated}; failed ${failed}.`);
}

console.log(`User-private migration ${applyMigration ? 'complete' : 'dry-run complete'}: ${migrated} ${applyMigration ? 'migrated' : 'profiles to migrate'}, ${failed} failed.`);
if (failed > 0) process.exitCode = 1;

function legacyCompetitiveSnapshot(profile) {
  const numberOr = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const stats = profile.stats && typeof profile.stats === 'object' ? profile.stats : {};
  const eloHistory = Array.isArray(profile.eloHistory) ? profile.eloHistory.slice(-100).flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const date = numberOr(entry.date, NaN);
    const elo = numberOr(entry.elo, NaN);
    return Number.isFinite(date) && Number.isFinite(elo) ? [{ date, elo }] : [];
  }) : [];
  return {
    elo: numberOr(profile.elo, 1200),
    gamesPlayed: Math.max(0, Math.floor(numberOr(profile.gamesPlayed, 0))),
    stats: {
      wins: Math.max(0, Math.floor(numberOr(stats.wins, 0))),
      losses: Math.max(0, Math.floor(numberOr(stats.losses, 0))),
      draws: Math.max(0, Math.floor(numberOr(stats.draws, 0)))
    },
    eloHistory,
    archivedAt: Date.now()
  };
}
