import fs from 'fs';

const fp = 'server.ts';
let code = fs.readFileSync(fp, 'utf8');

// Add imports
code = code.replace(
  'import { GoogleGenAI } from "@google/genai";',
  'import { GoogleGenAI } from "@google/genai";\nimport * as admin from "firebase-admin";\nimport { Chess } from "chess.js";'
);

// Add initialization and routes before Vite middleware
const serverAuthorityCode = `
// Server Authority Lazy Init
let adminApp = null;
function getAdmin() {
  if (!adminApp) {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountStr) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_MISSING");
    }
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountStr)),
    });
  }
  return adminApp;
}

  app.post("/api/move", async (req, res) => {
    try {
      const adminApp = getAdmin();
      const db = adminApp.firestore();
      const { gameId, source, target, promotion, userId } = req.body;

      const gameRef = db.collection("games").doc(gameId);
      const gameDoc = await gameRef.get();
      
      if (!gameDoc.exists) {
        return res.status(404).json({ error: "Game not found" });
      }

      const game = gameDoc.data();
      
      if (game.status !== "playing" && game.status !== "waiting_friend") {
        return res.status(400).json({ error: "Game is not active" });
      }

      const isWhiteTurn = game.turn === 'w';
      if (isWhiteTurn && game.whiteId !== userId) {
        return res.status(403).json({ error: "Not your turn" });
      }
      if (!isWhiteTurn && game.blackId !== userId) {
        return res.status(403).json({ error: "Not your turn" });
      }

      const chess = new Chess();
      if (game.pgn) {
        chess.loadPgn(game.pgn);
      } else {
        chess.load(game.fen);
      }

      try {
        const move = chess.move({
          from: source,
          to: target,
          promotion: promotion || "q"
        });
        
        if (!move) {
          return res.status(400).json({ error: "Illegal move" });
        }
      } catch (err) {
        return res.status(400).json({ error: "Illegal move" });
      }

      let newStatus = "playing";
      if (chess.isGameOver()) {
        if (chess.isCheckmate()) {
          newStatus = chess.turn() === "w" ? "black_won" : "white_won";
        } else {
          newStatus = "draw";
        }
      }

      await gameRef.update({
        fen: chess.fen(),
        pgn: chess.pgn(),
        turn: chess.turn(),
        lastMoveAt: Date.now(),
        status: newStatus
      });

      res.json({ success: true, status: newStatus, fen: chess.fen(), pgn: chess.pgn() });
    } catch (error) {
      if (error.message === "FIREBASE_SERVICE_ACCOUNT_MISSING") {
        return res.status(501).json({ error: "Server Authority not configured." });
      }
      console.error("Move error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/game-end", async (req, res) => {
    try {
      const adminApp = getAdmin();
      const db = adminApp.firestore();
      const { gameId } = req.body;

      const gameRef = db.collection("games").doc(gameId);
      
      await db.runTransaction(async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists) throw new Error("Game not found");
        
        const game = gameDoc.data();
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
          elo: admin.firestore.FieldValue.increment(whiteEloChange),
          coins: admin.firestore.FieldValue.increment(whiteCoins),
          'stats.wins': admin.firestore.FieldValue.increment(whiteResult === 1 ? 1 : 0),
          'stats.losses': admin.firestore.FieldValue.increment(whiteResult === 0 ? 1 : 0),
          'stats.draws': admin.firestore.FieldValue.increment(whiteResult === 0.5 ? 1 : 0),
        });

        transaction.update(blackRef, {
          elo: admin.firestore.FieldValue.increment(blackEloChange),
          coins: admin.firestore.FieldValue.increment(blackCoins),
          'stats.wins': admin.firestore.FieldValue.increment(blackResult === 1 ? 1 : 0),
          'stats.losses': admin.firestore.FieldValue.increment(blackResult === 0 ? 1 : 0),
          'stats.draws': admin.firestore.FieldValue.increment(blackResult === 0.5 ? 1 : 0),
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
  });
`;

code = code.replace('  // Vite middleware for development', serverAuthorityCode + '\n  // Vite middleware for development');

fs.writeFileSync(fp, code);
console.log("Patched server.ts");
