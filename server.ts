import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Chess } from "chess.js";
import { ACADEMY_LESSONS } from './src/lib/academyCourse';

const FIRESTORE_DATABASE_ID = process.env.FIRESTORE_DATABASE_ID?.trim();
if (!FIRESTORE_DATABASE_ID) {
  throw new Error('FIRESTORE_DATABASE_ID must be configured explicitly; refusing to select a database implicitly.');
}
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function allowRateLimit(uid: string, route: string, maxRequests: number, windowMs: number) {
  const now = Date.now();
  const key = `${route}:${uid}`;
  let bucket = rateLimitBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    rateLimitBuckets.set(key, bucket);
  }
  if (rateLimitBuckets.size > 5000) {
    for (const [entryKey, entry] of rateLimitBuckets) {
      if (entry.resetAt <= now) rateLimitBuckets.delete(entryKey);
    }
  }
  if (bucket.count >= maxRequests) return false;
  bucket.count += 1;
  return true;
}

async function startServer() {
  const app = express();
  const PORT = Number.parseInt(process.env.PORT || '3000', 10);
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT must be a valid TCP port');

  app.use(express.json({ limit: '64kb' }));

  // API Routes
  app.post('/api/profile/bootstrap', async (req, res) => {
    try {
      const userId = await authenticatedUid(req, res);
      if (!userId) return;
      if (!allowRateLimit(userId, 'profile-bootstrap', 6, 60_000)) return res.status(429).json({ error: 'Profile initialization rate limit exceeded' });
      const db = getFirestore(getAdmin(), FIRESTORE_DATABASE_ID);
      const profileRef = db.collection('users').doc(userId);
      const privateRef = db.collection('userPrivate').doc(userId);
      const authProfile = await getAuth(getAdmin()).getUser(userId);
      const now = Date.now();
      const removedPrivateFields = {
        coins: FieldValue.delete(), unlockedThemes: FieldValue.delete(), unlockedBackgrounds: FieldValue.delete(),
        isPremium: FieldValue.delete(), premiumUntil: FieldValue.delete(), paymentHistory: FieldValue.delete()
      };
      await db.runTransaction(async (transaction) => {
        const [profileDoc, privateDoc] = await Promise.all([transaction.get(profileRef), transaction.get(privateRef)]);
        const profile = profileDoc.data() || {};
        const privateData = privateDoc.data() || {};
        const needsCompetitiveBaseline = privateData.competitiveDataVersion !== 1;
        const legacyThemes = Array.isArray(profile.unlockedThemes) ? profile.unlockedThemes : [];
        const legacyBackgrounds = Array.isArray(profile.unlockedBackgrounds) ? profile.unlockedBackgrounds : [];
        const validThemes = new Set(['luxury', 'classic', 'wood', ...Object.keys(STORE_COSMETICS.theme)]);
        const validBackgrounds = new Set(['default', ...Object.keys(STORE_COSMETICS.background)]);
        const themes = Array.isArray(privateData.unlockedThemes) ? privateData.unlockedThemes : legacyThemes;
        const backgrounds = Array.isArray(privateData.unlockedBackgrounds) ? privateData.unlockedBackgrounds : legacyBackgrounds;
        const premiumUntil = Number(privateData.premiumUntil ?? profile.premiumUntil) || 0;
        const rawCoins = Number(privateData.coins ?? profile.coins);
        const privateProfile = {
          coins: Number.isFinite(rawCoins) && rawCoins >= 0 ? Math.floor(rawCoins) : 500,
          unlockedThemes: [...new Set(['luxury', 'classic', ...themes.filter((id) => validThemes.has(id))])],
          unlockedBackgrounds: [...new Set(['default', ...backgrounds.filter((id) => validBackgrounds.has(id))])],
          isPremium: Boolean(privateData.isPremium ?? profile.isPremium),
          premiumUntil
        };
        privateProfile['competitiveDataVersion'] = 1;
        if (needsCompetitiveBaseline && profileDoc.exists) {
          privateProfile['legacyCompetitiveRecord'] = privateData.legacyCompetitiveRecord || legacyCompetitiveSnapshot(profile);
        }
        if (!privateProfile.unlockedThemes.length) privateProfile.unlockedThemes = ['luxury', 'classic'];
        if (!privateProfile.unlockedBackgrounds.length) privateProfile.unlockedBackgrounds = ['default'];
        const paymentHistory = privateData.paymentHistory ?? profile.paymentHistory;
        if (Array.isArray(paymentHistory)) privateProfile['paymentHistory'] = paymentHistory;

        if (profileDoc.exists) {
          transaction.update(profileRef, {
            ...removedPrivateFields,
            profileSchemaVersion: 2,
            hasPremiumBadge: privateProfile.isPremium && privateProfile.premiumUntil > now,
            ...(needsCompetitiveBaseline ? {
              elo: 1200,
              gamesPlayed: 0,
              stats: { wins: 0, losses: 0, draws: 0 },
              eloHistory: []
            } : {})
          });
        } else {
          transaction.create(profileRef, {
            uid: userId,
            profileSchemaVersion: 2,
            displayName: String(req.body.displayName || authProfile.displayName || 'Jogador').slice(0, 40),
            hasSetNickname: Boolean(authProfile.displayName),
            elo: 1200,
            gamesPlayed: 0,
            activeBackground: 'default',
            hasPremiumBadge: privateProfile.isPremium && privateProfile.premiumUntil > now
          });
        }
        transaction.set(privateRef, privateProfile, { merge: true });
      });
      res.json({ success: true });
    } catch (error) {
      if (error.message === 'FIREBASE_SERVICE_ACCOUNT_MISSING') return res.status(503).json({ error: 'Profile service is not configured' });
      console.error('Profile bootstrap error:', error);
      res.status(500).json({ error: 'Could not prepare user profile' });
    }
  });

  app.post("/api/analyze", async (req, res) => {
    try {
      const uid = await authenticatedUid(req, res);
      if (!uid) return;
      if (!allowRateLimit(uid, 'analyze', 8, 60_000)) return res.status(429).json({ error: 'Limite de análises atingido. Tente novamente em um minuto.' });
      const { pgn, color } = req.body;
      if (typeof pgn !== 'string' || pgn.length < 1 || pgn.length > 20000 || !['w', 'b'].includes(color)) {
        return res.status(400).json({ error: 'Invalid analysis request' });
      }
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `Você é um Grande Mestre de xadrez e treinador.
Aqui está a notação (PGN) de uma partida recém-jogada.
O jogador jogou de ${color === 'w' ? 'Brancas' : 'Pretas'}.
Analise a partida de forma didática, encorajadora e em português do Brasil.
Destaque o momento crítico do jogo (o melhor lance ou o pior erro).
Mantenha a resposta com 2 a 3 parágrafos, sem jargões complexos demais. Formate em Markdown.
Partida: ${pgn}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ analysis: response.text });
    } catch (error: any) {
      console.error("Erro na análise da IA:", error);
      let errorMessage = "Falha ao gerar análise da partida. Tente novamente mais tarde.";

      if (error?.status === 503) {
        errorMessage = "O treinador IA está muito requisitado no momento. Por favor, tente novamente em alguns instantes.";
      }

      res.status(500).json({ error: errorMessage });
    }
  });


// Server Authority Lazy Init
let adminApp = null;
function getAdmin() {
  if (!adminApp) {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountStr) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_MISSING");
    }
    adminApp = initializeApp({ credential: cert(JSON.parse(serviceAccountStr)) });
  }
  return adminApp;
}

async function authenticatedUid(req, res) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer (.+)$/i);
  if (!match) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  try {
    return (await getAuth(getAdmin()).verifyIdToken(match[1])).uid;
  } catch (error) {
    if (error.message === 'FIREBASE_SERVICE_ACCOUNT_MISSING') {
      res.status(503).json({ error: 'Authentication service is not configured' });
    } else {
      res.status(401).json({ error: 'Invalid authentication token' });
    }
    return null;
  }
}

const STORE_PRODUCTS = {
  pack_1: { title: 'Mão Cheia', price: 4.9, coins: 500 },
  pack_2: { title: 'Baú de Ouro', price: 12.9, coins: 1500 },
  pack_3: { title: 'Tesouro do Rei', price: 39.9, coins: 5000 },
  vip: { title: 'Acesso VIP + Academia (30 dias)', price: 14.99, premium: true }
};

const ACADEMY_LESSON_BY_ID = new Map(ACADEMY_LESSONS.map(lesson => [lesson.id, lesson]));

app.get('/api/academy/course', async (req, res) => {
  try {
    const userId = await authenticatedUid(req, res);
    if (!userId) return;
    if (!allowRateLimit(userId, 'academy-course', 30, 60_000)) return res.status(429).json({ error: 'Muitas solicitações. Tente novamente em instantes.' });
    const db = getFirestore(getAdmin(), FIRESTORE_DATABASE_ID);
    const privateDoc = await db.collection('userPrivate').doc(userId).get();
    const profile = privateDoc.data();
    if (!profile?.isPremium || Number(profile.premiumUntil) <= Date.now()) {
      return res.status(403).json({ error: 'A Academia faz parte da assinatura VIP ativa. Assine na Loja para desbloquear as aulas.' });
    }
    const academyProgress = profile.academyProgress || {};
    const completedLessonIds = Array.isArray(academyProgress.completedLessonIds)
      ? academyProgress.completedLessonIds.filter(id => ACADEMY_LESSON_BY_ID.has(id))
      : [];
    res.json({
      lessons: ACADEMY_LESSONS,
      progress: { completedLessonIds, xp: Number(academyProgress.xp) || 0 }
    });
  } catch (error) {
    console.error('Academy course error:', error);
    res.status(500).json({ error: 'Não foi possível carregar a Academia.' });
  }
});

app.post('/api/academy/progress', async (req, res) => {
  try {
    const userId = await authenticatedUid(req, res);
    if (!userId) return;
    if (!allowRateLimit(userId, 'academy-progress', 60, 60_000)) return res.status(429).json({ error: 'Muitas atualizações de progresso. Tente novamente em instantes.' });
    const lessonId = typeof req.body?.lessonId === 'string' ? req.body.lessonId : '';
    const lesson = ACADEMY_LESSON_BY_ID.get(lessonId);
    if (!lesson) return res.status(400).json({ error: 'Aula inválida.' });

    const db = getFirestore(getAdmin(), FIRESTORE_DATABASE_ID);
    const userRef = db.collection('userPrivate').doc(userId);
    const progress = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(userRef);
      const profile = snapshot.data();
      if (!profile) throw new Error('ACADEMY_PROFILE_NOT_FOUND');
      if (!profile.isPremium || Number(profile.premiumUntil) <= Date.now()) throw new Error('ACADEMY_PREMIUM_REQUIRED');

      const academyProgress = profile.academyProgress || {};
      const completedLessonIds = Array.isArray(academyProgress.completedLessonIds)
        ? academyProgress.completedLessonIds.filter(id => ACADEMY_LESSON_BY_ID.has(id))
        : [];
      let xp = Number(academyProgress.xp) || 0;
      if (!completedLessonIds.includes(lesson.id)) {
        transaction.update(userRef, {
          'academyProgress.completedLessonIds': FieldValue.arrayUnion(lesson.id),
          'academyProgress.xp': FieldValue.increment(lesson.xp)
        });
        completedLessonIds.push(lesson.id);
        xp += lesson.xp;
      }
      return { completedLessonIds, xp };
    });
    res.json({ success: true, progress });
  } catch (error) {
    if (error.message === 'ACADEMY_PREMIUM_REQUIRED') return res.status(403).json({ error: 'Sua assinatura VIP não está ativa.' });
    if (error.message === 'ACADEMY_PROFILE_NOT_FOUND') return res.status(404).json({ error: 'Perfil não encontrado.' });
    console.error('Academy progress error:', error);
    res.status(500).json({ error: 'Não foi possível salvar seu progresso.' });
  }
});

const STORE_COSMETICS = {
  theme: { blue: 150, coral: 150, dark: 200, neon: 500, marble: 600, gold: 1000, amethyst: 750, forest: 800, ruby: 1200, obsidian: 2000, galaxy: 3000 },
  background: { 'deep-space': 300, 'cyber-grid': 400, 'crimson-fade': 500, 'golden-sand': 600, 'ocean-depth': 700, 'chess-pattern': 200, 'emerald-glow': 400, 'purple-nebula': 800, 'abstract-waves': 1000 }
};

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const VALID_TIME_CONTROLS = new Set([60, 180, 300, 600]);

function makeGameData(white, black, timeControl, status = 'playing') {
  const now = Date.now();
  return {
    whiteId: white.uid, whiteName: String(white.displayName || 'Jogador').slice(0, 40), whiteElo: Number(white.elo) || 1200,
    blackId: black?.uid || '', blackName: black ? String(black.displayName || 'Jogador').slice(0, 40) : '', blackElo: Number(black?.elo) || 1200,
    status, fen: START_FEN, pgn: '', turn: 'w', whiteThemeId: white.activeTheme || 'luxury',
    lastMoveAt: now, timeControl, whiteTime: timeControl, blackTime: timeControl,
    spectatorsAllowedWhite: true, spectatorsAllowedBlack: true
  };
}

async function recordRatedResult(transaction, db, game, status) {
  if (game.resultsRecorded || !['white_won', 'black_won', 'draw'].includes(status)) return false;
  if (!game.whiteId || !game.blackId || game.whiteId === game.blackId) throw new Error('Game participants are invalid');
  const whiteRef = db.collection('users').doc(game.whiteId);
  const blackRef = db.collection('users').doc(game.blackId);
  const whitePrivateRef = db.collection('userPrivate').doc(game.whiteId);
  const blackPrivateRef = db.collection('userPrivate').doc(game.blackId);
  const [whiteDoc, blackDoc, whitePrivateDoc, blackPrivateDoc] = await Promise.all([
    transaction.get(whiteRef), transaction.get(blackRef),
    transaction.get(whitePrivateRef), transaction.get(blackPrivateRef)
  ]);
  if (!whiteDoc.exists || !blackDoc.exists) throw new Error('Game player profile is missing');
  const white = whiteDoc.data() || {};
  const black = blackDoc.data() || {};
  const whitePrivate = whitePrivateDoc.data() || {};
  const blackPrivate = blackPrivateDoc.data() || {};
  const whiteHasVerifiedRating = whitePrivate.competitiveDataVersion === 1;
  const blackHasVerifiedRating = blackPrivate.competitiveDataVersion === 1;
  const whiteElo = whiteHasVerifiedRating ? Number(white.elo) || 1200 : 1200;
  const blackElo = blackHasVerifiedRating ? Number(black.elo) || 1200 : 1200;
  const whiteScore = status === 'white_won' ? 1 : status === 'black_won' ? 0 : 0.5;
  const expectedWhite = 1 / (1 + Math.pow(10, (blackElo - whiteElo) / 400));
  const whiteChange = Math.round(32 * (whiteScore - expectedWhite));
  const blackChange = -whiteChange;
  const whiteStats = whiteHasVerifiedRating ? white.stats || {} : {};
  const blackStats = blackHasVerifiedRating ? black.stats || {} : {};
  const whiteField = whiteScore === 1 ? 'wins' : whiteScore === 0 ? 'losses' : 'draws';
  const blackField = whiteScore === 0 ? 'wins' : whiteScore === 1 ? 'losses' : 'draws';
  const whiteSnapshot = legacyCompetitiveSnapshot(white);
  const blackSnapshot = legacyCompetitiveSnapshot(black);
  if (!whiteHasVerifiedRating) transaction.set(whitePrivateRef, {
    competitiveDataVersion: 1,
    legacyCompetitiveRecord: whitePrivate.legacyCompetitiveRecord || whiteSnapshot
  }, { merge: true });
  if (!blackHasVerifiedRating) transaction.set(blackPrivateRef, {
    competitiveDataVersion: 1,
    legacyCompetitiveRecord: blackPrivate.legacyCompetitiveRecord || blackSnapshot
  }, { merge: true });
  const whiteResultStats = { wins: Number(whiteStats.wins) || 0, losses: Number(whiteStats.losses) || 0, draws: Number(whiteStats.draws) || 0 };
  const blackResultStats = { wins: Number(blackStats.wins) || 0, losses: Number(blackStats.losses) || 0, draws: Number(blackStats.draws) || 0 };
  whiteResultStats[whiteField] += 1;
  blackResultStats[blackField] += 1;
  const whiteHistoryEntry = { date: Date.now(), elo: whiteElo + whiteChange };
  const blackHistoryEntry = { date: Date.now(), elo: blackElo + blackChange };
  transaction.update(whiteRef, {
    elo: whiteElo + whiteChange,
    gamesPlayed: (whiteHasVerifiedRating ? Number(white.gamesPlayed) || 0 : 0) + 1,
    stats: whiteResultStats,
    eloHistory: whiteHasVerifiedRating ? FieldValue.arrayUnion(whiteHistoryEntry) : [whiteHistoryEntry]
  });
  transaction.update(blackRef, {
    elo: blackElo + blackChange,
    gamesPlayed: (blackHasVerifiedRating ? Number(black.gamesPlayed) || 0 : 0) + 1,
    stats: blackResultStats,
    eloHistory: blackHasVerifiedRating ? FieldValue.arrayUnion(blackHistoryEntry) : [blackHistoryEntry]
  });
  return true;
}

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

function isValidMercadoPagoSignature(req, dataId) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  const signature = req.get('x-signature');
  const requestId = req.get('x-request-id');
  if (!secret || !signature || !requestId || !dataId) return false;
  const parts = Object.fromEntries(signature.split(',').map((part) => {
    const separator = part.indexOf('=');
    return separator < 0 ? ['', ''] : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  }));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest();
  let received;
  try { received = Buffer.from(parts.v1, 'hex'); } catch { return false; }
  return received.length === expected.length && timingSafeEqual(received, expected);
}

  app.post("/api/move", async (req, res) => {
    try {
      const userId = await authenticatedUid(req, res);
      if (!userId) return;
      if (!allowRateLimit(userId, 'move', 90, 60_000)) return res.status(429).json({ error: 'Muitos lances. Tente novamente em um minuto.' });
      const adminApp = getAdmin();
      const db = getFirestore(adminApp, FIRESTORE_DATABASE_ID);
      const { gameId, source, target, promotion } = req.body;
      if (typeof gameId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(gameId) ||
          !/^[a-h][1-8]$/.test(source) || !/^[a-h][1-8]$/.test(target) ||
          (promotion !== undefined && !['q', 'r', 'b', 'n'].includes(promotion))) {
        return res.status(400).json({ error: 'Invalid move request' });
      }

      const gameRef = db.collection("games").doc(gameId);
      const result = await db.runTransaction(async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists) throw Object.assign(new Error('Game not found'), { statusCode: 404 });
        const game = gameDoc.data()!;
        if (game.status !== 'playing') throw Object.assign(new Error('Game is not active'), { statusCode: 409 });
        const isWhiteTurn = game.turn === 'w';
        if ((isWhiteTurn && game.whiteId !== userId) || (!isWhiteTurn && game.blackId !== userId)) {
          throw Object.assign(new Error('Not your turn'), { statusCode: 403 });
        }

        const chess = new Chess();
        if (typeof game.pgn === 'string' && game.pgn.length > 0) {
          chess.loadPgn(game.pgn);
          if (typeof game.fen !== 'string' || chess.fen() !== game.fen) {
            throw Object.assign(new Error('Game state is inconsistent'), { statusCode: 409 });
          }
        } else if (typeof game.fen === 'string') {
          chess.load(game.fen);
        } else {
          throw Object.assign(new Error('Game state is invalid'), { statusCode: 409 });
        }
        if (chess.turn() !== game.turn) throw Object.assign(new Error('Game turn is inconsistent'), { statusCode: 409 });

        const now = Date.now();
        const previousMoveAt = Number(game.lastMoveAt);
        const elapsed = Number.isFinite(previousMoveAt) ? Math.max(0, (now - previousMoveAt) / 1000) : 0;
        const whiteTime = Number(game.whiteTime ?? game.timeControl ?? 0);
        const blackTime = Number(game.blackTime ?? game.timeControl ?? 0);
        const moverTime = isWhiteTurn ? whiteTime : blackTime;
        if (Number(game.timeControl) > 0 && Number.isFinite(moverTime) && elapsed >= moverTime) {
          const status = isWhiteTurn ? 'black_won' : 'white_won';
          const update: Record<string, unknown> = { status, endedReason: 'timeout', lastMoveAt: now };
          if (await recordRatedResult(transaction, db, game, status)) update.resultsRecorded = true;
          transaction.update(gameRef, update);
          return { success: false, status, error: 'Time expired' };
        }

        chess.move({ from: source, to: target, promotion: promotion || 'q' });
        let status = 'playing';
        let endedReason: string | undefined;
        if (chess.isCheckmate()) {
          status = chess.turn() === 'w' ? 'black_won' : 'white_won';
          endedReason = 'checkmate';
        } else if (chess.isDraw()) {
          status = 'draw';
          if (chess.isStalemate()) endedReason = 'stalemate';
        }
        const nextWhiteTime = Number(game.timeControl) > 0 ? Math.max(0, whiteTime - (isWhiteTurn ? elapsed : 0)) : whiteTime;
        const nextBlackTime = Number(game.timeControl) > 0 ? Math.max(0, blackTime - (isWhiteTurn ? 0 : elapsed)) : blackTime;
        const update: Record<string, unknown> = {
          fen: chess.fen(), pgn: chess.pgn(), turn: chess.turn(), lastMoveAt: now,
          status, whiteTime: nextWhiteTime, blackTime: nextBlackTime, drawOffer: null
        };
        if (endedReason) update.endedReason = endedReason;
        if (status !== 'playing' && await recordRatedResult(transaction, db, game, status)) update.resultsRecorded = true;
        transaction.update(gameRef, update);
        return { success: true, status, fen: chess.fen(), pgn: chess.pgn(), whiteTime: nextWhiteTime, blackTime: nextBlackTime };
      });

      if (!result.success) return res.status(409).json(result);
      res.json(result);
    } catch (error) {
      const statusCode = Number(error?.statusCode);
      if (statusCode) return res.status(statusCode).json({ error: error.message });
      if (error instanceof Error && /Invalid move|Invalid FEN|Invalid PGN/.test(error.message)) return res.status(400).json({ error: 'Illegal move or invalid game state' });
      if (error.message === "FIREBASE_SERVICE_ACCOUNT_MISSING") {
        return res.status(501).json({ error: "Server Authority not configured." });
      }
      console.error("Move error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Global Chat Translation Endpoint
  app.post("/api/chat/send", async (req, res) => {
    try {
      const userId = await authenticatedUid(req, res);
      if (!userId) return;
      if (!allowRateLimit(userId, 'chat', 12, 60_000)) return res.status(429).json({ error: 'Limite de mensagens atingido. Tente novamente em um minuto.' });
      const { text } = req.body;
      if (typeof text !== 'string' || text.trim().length < 1 || text.length > 1000) {
        return res.status(400).json({ error: 'Message must be between 1 and 1000 characters' });
      }
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const adminApp = getAdmin();
      const db = getFirestore(adminApp, FIRESTORE_DATABASE_ID);
      const userSnapshot = await db.collection('users').doc(userId).get();
      if (!userSnapshot.exists) return res.status(403).json({ error: 'User profile not found' });
      const userName = String(userSnapshot.data()?.displayName || 'Jogador').slice(0, 40);

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const prompt = `Translate the following chat message into English, Portuguese, and Spanish.
Return ONLY a valid JSON object with the keys "en", "pt", and "es". Do not include any markdown formatting like \`\`\`json.
Original message: "${text}"`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      let translations;
      try {
        let rawText = response.text.trim();
        if (rawText.startsWith('\`\`\`json')) rawText = rawText.substring(7);
        if (rawText.startsWith('\`\`\`')) rawText = rawText.substring(3);
        if (rawText.endsWith('\`\`\`')) rawText = rawText.substring(0, rawText.length - 3);
        translations = JSON.parse(rawText.trim());
      } catch (err) {
        // Fallback to original text if parsing fails
        translations = { en: text, pt: text, es: text };
      }

      const messageDoc = {
        userId,
        userName,
        originalText: text,
        translations,
        timestamp: Date.now()
      };

      await db.collection('globalChat').add(messageDoc);
      res.json({ success: true, message: messageDoc });
    } catch (error) {
      console.error("Chat send error:", error);
      res.status(500).json({ error: "Failed to send chat message" });
    }
  });

  app.post('/api/game/chat/send', async (req, res) => {
    try {
      const userId = await authenticatedUid(req, res);
      if (!userId) return;
      if (!allowRateLimit(userId, 'game-chat', 20, 60_000)) return res.status(429).json({ error: 'Limite de mensagens da partida atingido.' });
      const { gameId, text } = req.body;
      if (typeof gameId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(gameId) ||
          typeof text !== 'string' || text.trim().length < 1 || text.trim().length > 500) {
        return res.status(400).json({ error: 'Invalid game chat message' });
      }
      const db = getFirestore(getAdmin(), FIRESTORE_DATABASE_ID);
      const [gameDoc, userDoc] = await Promise.all([
        db.collection('games').doc(gameId).get(),
        db.collection('users').doc(userId).get()
      ]);
      if (!gameDoc.exists || ![gameDoc.data()?.whiteId, gameDoc.data()?.blackId].includes(userId)) {
        return res.status(403).json({ error: 'Only players in this game can send chat messages' });
      }
      if (!userDoc.exists) return res.status(403).json({ error: 'User profile not found' });
      const message = {
        roomId: `game_${gameId}`,
        uid: userId,
        displayName: String(userDoc.data()?.displayName || 'Jogador').slice(0, 40),
        text: text.trim(),
        createdAt: Date.now()
      };
      await db.collection('messages').add(message);
      res.json({ success: true });
    } catch (error) {
      console.error('Game chat error:', error);
      res.status(500).json({ error: 'Could not send game chat message' });
    }
  });

  app.post("/api/game-end", async (req, res) => {
    // Do not issue ELO/wallet rewards from client-owned game documents.
    return res.status(503).json({ error: 'Server-authoritative game results are not configured' });
    /* Disabled legacy payout implementation retained temporarily for migration review.
    try {
      const userId = await authenticatedUid(req, res);
      if (!userId) return;
      const adminApp = getAdmin();
      const db = getFirestore(adminApp, FIRESTORE_DATABASE_ID);
      const { gameId } = req.body;
      if (typeof gameId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(gameId)) {
        return res.status(400).json({ error: 'Invalid game id' });
      }

      const gameRef = db.collection("games").doc(gameId);

      await db.runTransaction(async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists) throw new Error("Game not found");

        const game: any = gameDoc.data();
        if (game.whiteId !== userId && game.blackId !== userId) throw new Error("Not a player in this game");
        if (game.status === 'playing' || game.status === 'waiting_friend') throw new Error("Game still playing");
        if (game.rewardsDistributed) throw new Error("Rewards already distributed");

        const whiteRef = db.collection("users").doc(game.whiteId);
        const blackRef = db.collection("users").doc(game.blackId);

        const whiteDoc = await transaction.get(whiteRef);
        const blackDoc = await transaction.get(blackRef);

        const whiteUser = whiteDoc.data();
        const blackUser = blackDoc.data();

        let whiteResult = 0.5;
        let blackResult = 0.5;

        if (game.status === 'white_won') {
           whiteResult = 1; blackResult = 0;
        } else if (game.status === 'black_won') {
           whiteResult = 0; blackResult = 1;
        }

        const K = 32;
        const expectedWhite = 1 / (1 + Math.pow(10, (blackUser.elo - whiteUser.elo) / 400));
        const expectedBlack = 1 / (1 + Math.pow(10, (whiteUser.elo - blackUser.elo) / 400));

        const whiteEloChange = Math.round(K * (whiteResult - expectedWhite));
        const blackEloChange = Math.round(K * (blackResult - expectedBlack));

        const whiteCoins = whiteResult === 1 ? 50 : (whiteResult === 0.5 ? 10 : 0);
        const blackCoins = blackResult === 1 ? 50 : (blackResult === 0.5 ? 10 : 0);

        transaction.update(whiteRef, {
          elo: FieldValue.increment(whiteEloChange),
          coins: FieldValue.increment(whiteCoins),
          'stats.wins': FieldValue.increment(whiteResult === 1 ? 1 : 0),
          'stats.losses': FieldValue.increment(whiteResult === 0 ? 1 : 0),
          'stats.draws': FieldValue.increment(whiteResult === 0.5 ? 1 : 0),
          eloHistory: FieldValue.arrayUnion({ date: Date.now(), elo: whiteUser.elo + whiteEloChange })
        });

        transaction.update(blackRef, {
          elo: FieldValue.increment(blackEloChange),
          coins: FieldValue.increment(blackCoins),
          'stats.wins': FieldValue.increment(blackResult === 1 ? 1 : 0),
          'stats.losses': FieldValue.increment(blackResult === 0 ? 1 : 0),
          'stats.draws': FieldValue.increment(blackResult === 0.5 ? 1 : 0),
          eloHistory: FieldValue.arrayUnion({ date: Date.now(), elo: blackUser.elo + blackEloChange })
        });

        transaction.update(gameRef, {
          rewardsDistributed: true
        });
      });

      res.json({ success: true });
    } catch (error) {
      if (error.message === "FIREBASE_SERVICE_ACCOUNT_MISSING") {
        return res.status(501).json({ error: "Server Authority not configured." });
      }
      console.error("Game end error:", error);
      res.status(500).json({ error: error.message });
    }
    */
  });

  app.post('/api/game/invite/create', async (req, res) => {
    try {
      const userId = await authenticatedUid(req, res);
      if (!userId) return;
      const timeControl = Number(req.body.timeControl);
      if (!VALID_TIME_CONTROLS.has(timeControl)) return res.status(400).json({ error: 'Invalid time control' });
      const db = getFirestore(getAdmin(), FIRESTORE_DATABASE_ID);
      const profile = await db.collection('users').doc(userId).get();
      if (!profile.exists) return res.status(403).json({ error: 'User profile not found' });
      const ref = db.collection('games').doc();
      const profileData: any = profile.data() || {};
      await ref.create({ ...makeGameData({ uid: userId, ...profileData }, null, timeControl, 'waiting_friend'), id: ref.id });
      res.json({ success: true, gameId: ref.id });
    } catch (error) {
      console.error('Invite create error:', error);
      res.status(500).json({ error: 'Could not create invite' });
    }
  });

  app.post('/api/game/invite/join', async (req, res) => {
    try {
      const userId = await authenticatedUid(req, res);
      if (!userId) return;
      const { gameId } = req.body;
      if (typeof gameId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(gameId)) return res.status(400).json({ error: 'Invalid game id' });
      const db = getFirestore(getAdmin(), FIRESTORE_DATABASE_ID);
      const gameRef = db.collection('games').doc(gameId);
      const profileRef = db.collection('users').doc(userId);
      await db.runTransaction(async (tx) => {
        const [gameDoc, profile] = await Promise.all([tx.get(gameRef), tx.get(profileRef)]);
        if (!gameDoc.exists) throw Object.assign(new Error('Invite not found'), { statusCode: 404 });
        if (!profile.exists) throw Object.assign(new Error('User profile not found'), { statusCode: 403 });
        const game = gameDoc.data();
        if (game.status !== 'waiting_friend' || game.blackId || game.whiteId === userId) throw Object.assign(new Error('Invite is no longer available'), { statusCode: 409 });
        const player: any = { uid: userId, ...(profile.data() || {}) };
        tx.update(gameRef, {
          blackId: player.uid, blackName: String(player.displayName || 'Jogador').slice(0, 40), blackElo: Number(player.elo) || 1200,
          status: 'playing', lastMoveAt: Date.now(), whiteTime: Number(game.timeControl) || 300, blackTime: Number(game.timeControl) || 300
        });
      });
      res.json({ success: true, gameId });
    } catch (error) {
      const status = Number(error?.statusCode);
      if (status) return res.status(status).json({ error: error.message });
      console.error('Invite join error:', error);
      res.status(500).json({ error: 'Could not join invite' });
    }
  });

  app.post('/api/game/match', async (req, res) => {
    try {
      const userId = await authenticatedUid(req, res);
      if (!userId) return;
      const { opponentId } = req.body;
      const timeControl = Number(req.body.timeControl);
      if (typeof opponentId !== 'string' || opponentId === userId || !/^[A-Za-z0-9_-]{1,128}$/.test(opponentId) || !VALID_TIME_CONTROLS.has(timeControl)) {
        return res.status(400).json({ error: 'Invalid match request' });
      }
      const db = getFirestore(getAdmin(), FIRESTORE_DATABASE_ID);
      const ownQueue = db.collection('queue').doc(userId);
      const opponentQueue = db.collection('queue').doc(opponentId);
      const ownProfile = db.collection('users').doc(userId);
      const opponentProfile = db.collection('users').doc(opponentId);
      const gameRef = db.collection('games').doc();
      const created = await db.runTransaction(async (tx) => {
        const [myQueue, theirQueue, myUser, theirUser] = await Promise.all([tx.get(ownQueue), tx.get(opponentQueue), tx.get(ownProfile), tx.get(opponentProfile)]);
        if (!myQueue.exists || !theirQueue.exists || !myUser.exists || !theirUser.exists || Number(theirQueue.data().timeControl) !== timeControl || Number(myQueue.data().timeControl) !== timeControl) {
          return false;
        }
        const whiteFirst = Math.random() < 0.5;
        const me = { uid: userId, ...myUser.data() };
        const opponent = { uid: opponentId, ...theirUser.data() };
        tx.create(gameRef, { ...makeGameData(whiteFirst ? me : opponent, whiteFirst ? opponent : me, timeControl), id: gameRef.id });
        tx.delete(ownQueue);
        tx.delete(opponentQueue);
        return true;
      });
      if (!created) return res.status(409).json({ error: 'Opponent already matched' });
      res.json({ success: true, gameId: gameRef.id });
    } catch (error) {
      console.error('Match create error:', error);
      res.status(500).json({ error: 'Could not create match' });
    }
  });

  app.post('/api/challenge/create', async (req, res) => {
    try {
      const userId = await authenticatedUid(req, res);
      if (!userId) return;
      if (!allowRateLimit(userId, 'challenge-create', 10, 60_000)) return res.status(429).json({ error: 'Muitos convites. Tente novamente em um minuto.' });
      const { challengedId } = req.body;
      if (typeof challengedId !== 'string' || challengedId.length < 1 || challengedId.length > 128 || challengedId.includes('/') || challengedId === userId) {
        return res.status(400).json({ error: 'Invalid challenge target' });
      }
      const db = getFirestore(getAdmin(), FIRESTORE_DATABASE_ID);
      const [challengerProfile, challengedProfile] = await Promise.all([
        db.collection('users').doc(userId).get(),
        db.collection('users').doc(challengedId).get()
      ]);
      if (!challengerProfile.exists || !challengedProfile.exists || challengedProfile.data()?.profileSchemaVersion !== 2) {
        return res.status(404).json({ error: 'Player profile not found' });
      }
      const challenger = challengerProfile.data() || {};
      const challengeRef = db.collection('challenges').doc();
      await challengeRef.create({
        challengerId: userId,
        challengedId,
        challengerName: String(challenger.displayName || 'Jogador').slice(0, 40),
        challengerElo: Number(challenger.elo) || 1200,
        status: 'pending',
        createdAt: Date.now()
      });
      res.json({ success: true, challengeId: challengeRef.id });
    } catch (error) {
      console.error('Challenge create error:', error);
      res.status(500).json({ error: 'Could not create challenge' });
    }
  });

  app.post('/api/challenge/accept', async (req, res) => {
    try {
      const userId = await authenticatedUid(req, res);
      if (!userId) return;
      if (!allowRateLimit(userId, 'challenge-accept', 10, 60_000)) return res.status(429).json({ error: 'Muitas tentativas de aceitar convites.' });
      const { challengeId } = req.body;
      if (typeof challengeId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(challengeId)) return res.status(400).json({ error: 'Invalid challenge id' });
      const db = getFirestore(getAdmin(), FIRESTORE_DATABASE_ID);
      const challengeRef = db.collection('challenges').doc(challengeId);
      const ownRef = db.collection('users').doc(userId);
      const challenge = await challengeRef.get();
      if (!challenge.exists || challenge.data().challengedId !== userId || challenge.data().status !== 'pending') return res.status(409).json({ error: 'Challenge is no longer available' });
      const challengerId = challenge.data().challengerId;
      const challengerProfileRef = db.collection('users').doc(challengerId);
      const gameRef = db.collection('games').doc();
      await db.runTransaction(async (tx) => {
        const [freshChallenge, challenger, own] = await Promise.all([tx.get(challengeRef), tx.get(challengerProfileRef), tx.get(ownRef)]);
        if (!freshChallenge.exists || freshChallenge.data().challengedId !== userId || freshChallenge.data().status !== 'pending') throw Object.assign(new Error('Challenge is no longer available'), { statusCode: 409 });
        if (!challenger.exists || !own.exists) throw Object.assign(new Error('User profile not found'), { statusCode: 404 });
        const white = { uid: challengerId, ...challenger.data() };
        const black = { uid: userId, ...own.data() };
        tx.create(gameRef, { ...makeGameData(white, black, 300), id: gameRef.id });
        tx.update(challengeRef, { status: 'accepted', gameId: gameRef.id });
      });
      res.json({ success: true, gameId: gameRef.id });
    } catch (error) {
      const status = Number(error?.statusCode);
      if (status) return res.status(status).json({ error: error.message });
      console.error('Challenge accept error:', error);
      res.status(500).json({ error: 'Could not accept challenge' });
    }
  });

  app.post('/api/game/action', async (req, res) => {
    try {
      const userId = await authenticatedUid(req, res);
      if (!userId) return;
      if (!allowRateLimit(userId, 'game-action', 40, 60_000)) return res.status(429).json({ error: 'Muitas ações de partida.' });
      const { gameId, action } = req.body;
      if (typeof gameId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(gameId) || !['presence', 'spectators', 'offer_draw', 'decline_draw', 'accept_draw', 'resign', 'claim_inactivity', 'claim_timeout', 'cancel_invite'].includes(action)) {
        return res.status(400).json({ error: 'Invalid game action' });
      }
      const db = getFirestore(getAdmin(), FIRESTORE_DATABASE_ID);
      const gameRef = db.collection('games').doc(gameId);
      const now = Date.now();
      const outcome = await db.runTransaction(async (tx) => {
        const snap = await tx.get(gameRef);
        if (!snap.exists) throw Object.assign(new Error('Game not found'), { statusCode: 404 });
        const game: any = snap.data();
        const color = game.whiteId === userId ? 'w' : game.blackId === userId ? 'b' : null;
        if (!color) throw Object.assign(new Error('Not a player in this game'), { statusCode: 403 });
        const patch: Record<string, any> = {};
        if (action === 'presence') {
          if (typeof req.body.online !== 'boolean') throw Object.assign(new Error('Invalid presence'), { statusCode: 400 });
          patch[color === 'w' ? 'whiteOnline' : 'blackOnline'] = req.body.online;
          patch[color === 'w' ? 'whiteHeartbeat' : 'blackHeartbeat'] = now;
        } else if (action === 'spectators') {
          if (typeof req.body.allowed !== 'boolean') throw Object.assign(new Error('Invalid spectator setting'), { statusCode: 400 });
          patch[color === 'w' ? 'spectatorsAllowedWhite' : 'spectatorsAllowedBlack'] = req.body.allowed;
        } else {
          if (game.status === 'waiting_friend' && action === 'cancel_invite' && game.whiteId === userId) {
            tx.delete(gameRef);
            return { success: true, deleted: true };
          }
          if (game.status !== 'playing') throw Object.assign(new Error('Game is not active'), { statusCode: 409 });
          if (action === 'offer_draw') patch.drawOffer = color;
          if (action === 'decline_draw') {
            if (game.drawOffer !== (color === 'w' ? 'b' : 'w')) throw Object.assign(new Error('No opponent draw offer'), { statusCode: 409 });
            patch.drawOffer = null;
          }
          if (action === 'accept_draw') {
            if (game.drawOffer !== (color === 'w' ? 'b' : 'w')) throw Object.assign(new Error('No opponent draw offer'), { statusCode: 409 });
            Object.assign(patch, { status: 'draw', endedReason: 'draw_agreement', drawOffer: null, lastMoveAt: now });
          }
          if (action === 'resign') Object.assign(patch, { status: color === 'w' ? 'black_won' : 'white_won', endedReason: 'resignation', resignedBy: userId, lastMoveAt: now });
          if (action === 'claim_inactivity') {
            if ((game.turn === color) || now - Number(game.lastMoveAt || now) < 140_000) throw Object.assign(new Error('Opponent is not inactive long enough'), { statusCode: 409 });
            Object.assign(patch, { status: color === 'w' ? 'white_won' : 'black_won', endedReason: 'inactivity', abandonedBy: game.turn === 'w' ? game.whiteId : game.blackId, lastMoveAt: now });
          }
          if (action === 'claim_timeout') {
            const elapsed = Math.max(0, (now - Number(game.lastMoveAt || now)) / 1000);
            const remaining = Number(game[game.turn === 'w' ? 'whiteTime' : 'blackTime'] ?? game.timeControl ?? 0);
            if (Number(game.timeControl) <= 0 || elapsed < remaining) throw Object.assign(new Error('Clock has not expired'), { statusCode: 409 });
            Object.assign(patch, { status: game.turn === 'w' ? 'black_won' : 'white_won', endedReason: 'timeout', lastMoveAt: now });
          }
        }
        if (patch.status && await recordRatedResult(tx, db, game, patch.status)) patch.resultsRecorded = true;
        tx.update(gameRef, patch);
        return { success: true, ...patch };
      });
      res.json(outcome);
    } catch (error) {
      const status = Number(error?.statusCode);
      if (status) return res.status(status).json({ error: error.message });
      console.error('Game action error:', error);
      res.status(500).json({ error: 'Could not apply game action' });
    }
  });


  // Rewarded ads are disabled until a real ad network can verify completion.
  app.post("/api/reward-ad", async (req, res) => {
    res.status(503).json({ error: 'Rewarded ads are not configured' });
  });

  app.post('/api/store/purchase', async (req, res) => {
    try {
      const userId = await authenticatedUid(req, res);
      if (!userId) return;
      if (!allowRateLimit(userId, 'store-purchase', 20, 60_000)) return res.status(429).json({ error: 'Muitas tentativas de compra. Tente novamente em um minuto.' });
      const { kind, itemId } = req.body;
      if ((kind !== 'theme' && kind !== 'background') || typeof itemId !== 'string') {
        return res.status(400).json({ error: 'Invalid store item' });
      }
      const price = STORE_COSMETICS[kind][itemId];
      if (typeof price !== 'number') return res.status(400).json({ error: 'Unknown store item' });
      const db = getFirestore(getAdmin(), FIRESTORE_DATABASE_ID);
      const userRef = db.collection('userPrivate').doc(userId);
      const publicUserRef = db.collection('users').doc(userId);
      const result = await db.runTransaction(async (transaction) => {
        const [userDoc, publicUser] = await Promise.all([transaction.get(userRef), transaction.get(publicUserRef)]);
        if (!userDoc.exists || !publicUser.exists) throw new Error('USER_NOT_FOUND');
        const user = userDoc.data();
        const unlockedField = kind === 'theme' ? 'unlockedThemes' : 'unlockedBackgrounds';
        const unlocked = Array.isArray(user[unlockedField]) ? user[unlockedField] : [];
        if (unlocked.includes(itemId)) throw new Error('ALREADY_OWNED');
        if (Number(user.coins || 0) < price) throw new Error('INSUFFICIENT_COINS');
        transaction.update(userRef, {
          coins: FieldValue.increment(-price),
          [unlockedField]: FieldValue.arrayUnion(itemId)
        });
        transaction.update(publicUserRef, { [kind === 'theme' ? 'activeTheme' : 'activeBackground']: itemId });
        return { coins: Number(user.coins || 0) - price };
      });
      res.json({ success: true, ...result });
    } catch (error) {
      if (error.message === 'USER_NOT_FOUND') return res.status(404).json({ error: 'User profile not found' });
      if (error.message === 'ALREADY_OWNED') return res.status(409).json({ error: 'Item already owned' });
      if (error.message === 'INSUFFICIENT_COINS') return res.status(409).json({ error: 'Not enough coins' });
      console.error('Store purchase error:', error);
      res.status(500).json({ error: 'Purchase failed' });
    }
  });

  app.post("/api/payment/create-preference", async (req, res) => {
    try {
      const userId = await authenticatedUid(req, res);
      if (!userId) return;
      if (!allowRateLimit(userId, 'payment-preference', 6, 60_000)) return res.status(429).json({ error: 'Muitos checkouts iniciados. Tente novamente em um minuto.' });
      const { packageId } = req.body;
      const product = typeof packageId === 'string' ? STORE_PRODUCTS[packageId] : null;
      if (!product) return res.status(400).json({ error: 'Unknown product' });

      if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
        return res.status(500).json({ error: "MERCADO_PAGO_ACCESS_TOKEN is not configured in Settings > Secrets." });
      }
      const appUrl = process.env.APP_URL;
      if (!appUrl || !/^https:\/\//i.test(appUrl)) {
        return res.status(503).json({ error: 'A public HTTPS APP_URL is required for payments' });
      }

      const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });
      const preference = new Preference(client);

      const result = await preference.create({
        body: {
          items: [
            {
              id: packageId,
              title: product.title,
              quantity: 1,
              unit_price: product.price,
              currency_id: 'BRL',
            }
          ],
          metadata: {
            user_id: userId,
            package_id: packageId
          },
          external_reference: userId,
          back_urls: {
            success: `${appUrl}`,
            failure: `${appUrl}`,
            pending: `${appUrl}`
          },
          auto_return: "approved",
          notification_url: `${appUrl.replace(/\/$/, '')}/api/payment/webhook`
        }
      });

      res.json({ init_point: result.init_point });
    } catch (error) {
      console.error("Error creating preference:", error);
      res.status(500).json({ error: "Failed to create payment preference" });
    }
  });

  app.post("/api/payment/webhook", async (req, res) => {
    try {
      const { type, data } = req.body;
      const dataId = String(req.query['data.id'] || data?.id || '');
      if (type !== 'payment' || !/^\d+$/.test(dataId)) return res.sendStatus(200);
      if (!isValidMercadoPagoSignature(req, dataId)) return res.status(401).send('Invalid signature');
      if (!process.env.MERCADO_PAGO_ACCESS_TOKEN || !process.env.FIREBASE_SERVICE_ACCOUNT) {
        return res.status(503).send('Payment processing is not configured');
      }

      const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });
      const payment = new Payment(client);
      const paymentData = await payment.get({ id: dataId });
      if (paymentData.status !== 'approved') return res.sendStatus(200);

      const userId = paymentData.external_reference;
      const packageId = paymentData.metadata?.package_id;
      const product = typeof packageId === 'string' ? STORE_PRODUCTS[packageId] : null;
      if (!userId || !product || paymentData.currency_id !== 'BRL' ||
          Number(paymentData.transaction_amount) !== product.price ||
          paymentData.metadata?.user_id !== userId) {
        console.error('Rejected Mercado Pago payment with mismatched product or owner', dataId);
        return res.status(400).send('Payment details do not match the product');
      }

      const db = getFirestore(getAdmin(), FIRESTORE_DATABASE_ID);
      const paymentRef = db.collection('processedPayments').doc(dataId);
      const userRef = db.collection('userPrivate').doc(userId);
      const publicUserRef = db.collection('users').doc(userId);
      await db.runTransaction(async (transaction) => {
        const [processed, userDoc, publicUserDoc] = await Promise.all([
          transaction.get(paymentRef),
          transaction.get(userRef),
          transaction.get(publicUserRef)
        ]);
        if (processed.exists) return;
        if (!userDoc.exists || !publicUserDoc.exists) throw new Error('Payment user profile not found');
        if ('premium' in product) {
          const premiumUntil = Math.max(Date.now(), Number(userDoc.data().premiumUntil) || 0) + 30 * 24 * 60 * 60 * 1000;
          transaction.update(userRef, { isPremium: true, premiumUntil });
          transaction.update(publicUserRef, { hasPremiumBadge: true });
        } else {
          transaction.update(userRef, { coins: FieldValue.increment(product.coins) });
        }
        transaction.create(paymentRef, {
          userId,
          packageId,
          amount: product.price,
          currency: 'BRL',
          processedAt: FieldValue.serverTimestamp()
        });
      });

      res.sendStatus(200);
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).send("Error");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Fallback for SPA
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
