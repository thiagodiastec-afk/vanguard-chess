import fs from 'fs';

let storeCode = fs.readFileSync('src/components/Store.tsx', 'utf8');

const simulateButton = `<button
              onClick={async () => {
                if (checkoutPack.isVip) {
                  try {
                    const db = getDb();
                    await updateDoc(doc(db, 'users', currentUser.uid), {
                      isPremium: true,
                      coins: (currentUser.coins || 0) + 500
                    });
                    alert("Assinatura ativada! Você agora é VIP (anúncios removidos + 500 moedas de bônus).");
                  } catch(e) {
                    console.error(e);
                  }
                } else {
                  alert("Simulação concluída! Em produção, o webhook do MercadoPago/Stripe liberaria as moedas automaticamente após o pagamento.");
                }
                setCheckoutPack(null);
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition-colors"
            >
              Simular Pagamento Aprovado
            </button>`;

const realButton = `<button
              onClick={async () => {
                try {
                  const response = await fetch('/api/payment/create-preference', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: currentUser.uid,
                      packageId: checkoutPack.id,
                      packageName: checkoutPack.name,
                      priceBRL: checkoutPack.priceBRL,
                      isVip: checkoutPack.isVip
                    })
                  });
                  
                  const data = await response.json();
                  
                  if (data.init_point) {
                    window.location.href = data.init_point;
                  } else if (data.error) {
                    alert('Erro: ' + data.error);
                  }
                } catch(e) {
                  console.error(e);
                  alert('Ocorreu um erro ao conectar com o Mercado Pago.');
                }
              }}
              className="w-full bg-[#009EE3] hover:bg-[#0089C5] text-white font-bold py-3 px-4 rounded-xl transition-colors flex justify-center items-center gap-2"
            >
              Pagar com Mercado Pago
            </button>`;

storeCode = storeCode.replace(simulateButton, realButton);

// We should also replace the button for coins package which might have been hardcoded or not. Wait, the coins packages use \`setCheckoutPack({ ... })\` too. So this one modal handles both.

fs.writeFileSync('src/components/Store.tsx', storeCode);
console.log("Patched Store.tsx");
