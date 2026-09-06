import fs from 'fs';

let serverTs = fs.readFileSync('server.ts', 'utf8');

const mpImports = `import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';\n`;

const mpRoutes = `
  // MERCADO PAGO INTEGRATION
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
            success: \`\${appUrl}\`,
            failure: \`\${appUrl}\`,
            pending: \`\${appUrl}\`
          },
          auto_return: "approved",
          notification_url: \`\${appUrl}/api/payment/webhook\`
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
`;

serverTs = mpImports + serverTs;
serverTs = serverTs.replace('// Vite middleware for development', mpRoutes + '\n  // Vite middleware for development');

fs.writeFileSync('server.ts', serverTs);
console.log("Patched server.ts");
