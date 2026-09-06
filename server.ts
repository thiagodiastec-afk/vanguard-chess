import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import dotenv from "dotenv";
dotenv.config({ override: true });
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { Chess } from "chess.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/analyze", async (req, res) => {
    try {
      const { pgn, color } = req.body;
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

  app.post("/api/move", async (req, res) => {
    try {
      const adminApp = getAdmin();
      const db = getFirestore(adminApp, 'ai-studio-fcb48dec-7903-4132-9310-02b17375279b');
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

  // Global Chat Translation Endpoint
  app.post("/api/chat/send", async (req, res) => {
    try {
      const { text, userId, userName } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }
      
      const adminApp = getAdmin();
      const db = getFirestore(adminApp, 'ai-studio-fcb48dec-7903-4132-9310-02b17375279b');

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

  app.post("/api/game-end", async (req, res) => {
    try {
      const adminApp = getAdmin();
      const db = getFirestore(adminApp, 'ai-studio-fcb48dec-7903-4132-9310-02b17375279b');
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
  });

  
  // MERCADO PAGO INTEGRATION
  app.post("/api/reward-ad", async (req, res) => {
    try {
      const adminApp = getAdmin();
      const db = getFirestore(adminApp, 'ai-studio-fcb48dec-7903-4132-9310-02b17375279b');
      const { userId } = req.body;
      
      const userRef = db.collection("users").doc(userId);
      await userRef.update({
        coins: FieldValue.increment(10)
      });
      
      res.json({ success: true, reward: 10 });
    } catch (error: any) {
      console.error("Reward Ad error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/payment/create-preference", async (req, res) => {
    try {
      const { userId, packageId, packageName, priceBRL, isVip } = req.body;
      
      if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
        return res.status(500).json({ error: "MERCADO_PAGO_ACCESS_TOKEN is not configured in Settings > Secrets." });
      }

      const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });
      const preference = new Preference(client);

      const appUrl = process.env.APP_URL || 'http://localhost:3000';

      const result = await preference.create({
        body: {
          items: [
            {
              id: packageId,
              title: packageName,
              quantity: 1,
              unit_price: parseFloat(priceBRL.replace(',', '.')),
              currency_id: 'BRL',
            }
          ],
          metadata: {
            user_id: userId,
            is_vip: isVip,
            package_id: packageId
          },
          back_urls: {
            success: `${appUrl}`,
            failure: `${appUrl}`,
            pending: `${appUrl}`
          },
          auto_return: "approved",
          notification_url: `${appUrl}/api/payment/webhook`
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
      
      if (type === 'payment' && data && data.id) {
        if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
           return res.status(500).send("No token");
        }
        
        const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });
        const payment = new Payment(client);
        
        const paymentData = await payment.get({ id: data.id });
        
        if (paymentData.status === 'approved') {
           const { user_id, is_vip, package_id } = paymentData.metadata;
           
           const adminApp = getAdmin();
           const db = getFirestore(adminApp, 'ai-studio-fcb48dec-7903-4132-9310-02b17375279b');
           
           const userRef = db.collection("users").doc(user_id);
           const userDoc = await userRef.get();
           
           if (userDoc.exists) {
              if (is_vip) {
                 await userRef.update({
                   isPremium: true,
                   coins: FieldValue.increment(500)
                 });
              } else {
                 let coinsToAdd = 0;
                 if (package_id === 'coins_small') coinsToAdd = 500;
                 else if (package_id === 'coins_medium') coinsToAdd = 1200;
                 else if (package_id === 'coins_large') coinsToAdd = 3000;
                 
                 if (coinsToAdd > 0) {
                   await userRef.update({
                     coins: FieldValue.increment(coinsToAdd)
                   });
                 }
              }
           }
        }
      }
      
      res.status(200).send("OK");
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
