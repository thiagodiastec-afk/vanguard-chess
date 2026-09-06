import fs from 'fs';

const filePath = 'src/components/Store.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Import Star icon
content = content.replace(
  "import { Store as StoreIcon, Lock, Unlock, Check, Crown, Palette, Coins, Eye, X, CreditCard, Gift, ShieldCheck } from 'lucide-react';",
  "import { Store as StoreIcon, Lock, Unlock, Check, Crown, Palette, Coins, Eye, X, CreditCard, Gift, ShieldCheck, Star } from 'lucide-react';"
);

// 2. Change activeTab type
content = content.replace(
  "const [activeTab, setActiveTab] = useState<'themes' | 'coins'>('themes');",
  "const [activeTab, setActiveTab] = useState<'themes' | 'coins' | 'vip'>('themes');"
);

// 3. Add VIP tab button
const oldTabs = `        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('themes')}`;

const newTabs = `        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={() => setActiveTab('themes')}`;
content = content.replace(oldTabs, newTabs);

const oldCoinsTab = `          <button
            onClick={() => setActiveTab('coins')}
            className={\`px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 \${
              activeTab === 'coins' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
            }\`}
          >
            <Coins className="w-5 h-5" />
            Comprar Moedas
          </button>
        </div>`;

const newCoinsTab = `          <button
            onClick={() => setActiveTab('coins')}
            className={\`px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 \${
              activeTab === 'coins' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
            }\`}
          >
            <Coins className="w-5 h-5" />
            Comprar Moedas
          </button>
          
          <button
            onClick={() => setActiveTab('vip')}
            className={\`px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 \${
              activeTab === 'vip' 
                ? 'bg-fuchsia-600 text-white' 
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
            }\`}
          >
            <Star className="w-5 h-5" />
            Assinatura VIP (Sem Anúncios)
          </button>
        </div>`;
content = content.replace(oldCoinsTab, newCoinsTab);

// 4. Add VIP section rendering
const oldCoinsSectionEnd = `        {activeTab === 'coins' && (
          <div className="bg-neutral-800 rounded-2xl border border-neutral-700/50 p-8 shadow-xl">`;

const vipSection = `
        {activeTab === 'vip' && (
          <div className="bg-neutral-800 rounded-2xl border border-fuchsia-900/50 p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="text-center mb-10 relative z-10">
              <div className="w-20 h-20 bg-fuchsia-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(217,70,239,0.2)]">
                <Star className="w-10 h-10 text-fuchsia-400" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">Assinatura Premium VIP</h3>
              <p className="text-neutral-400 max-w-2xl mx-auto">
                Eleve sua experiência para o próximo nível. Jogue sem interrupções, sem anúncios e com benefícios exclusivos na comunidade.
              </p>
            </div>

            <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              <div className="space-y-6">
                <h4 className="text-xl font-bold text-white border-b border-neutral-700 pb-2">Benefícios</h4>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 text-neutral-300">
                    <div className="bg-emerald-500/20 p-1.5 rounded-full"><Check className="w-4 h-4 text-emerald-500" /></div>
                    Zero anúncios em todo o aplicativo
                  </li>
                  <li className="flex items-center gap-3 text-neutral-300">
                    <div className="bg-emerald-500/20 p-1.5 rounded-full"><Check className="w-4 h-4 text-emerald-500" /></div>
                    Badge exclusivo "VIP" no Ranking e Chat
                  </li>
                  <li className="flex items-center gap-3 text-neutral-300">
                    <div className="bg-emerald-500/20 p-1.5 rounded-full"><Check className="w-4 h-4 text-emerald-500" /></div>
                    +500 Moedas mensais bônus
                  </li>
                  <li className="flex items-center gap-3 text-neutral-300">
                    <div className="bg-emerald-500/20 p-1.5 rounded-full"><Check className="w-4 h-4 text-emerald-500" /></div>
                    Análise básica da IA pós-partida (em breve)
                  </li>
                </ul>
              </div>
              
              <div className="bg-neutral-900 border border-fuchsia-500/30 rounded-2xl p-6 flex flex-col text-center">
                <h4 className="text-lg font-bold text-fuchsia-400 mb-2">Plano Mensal</h4>
                <div className="text-4xl font-black text-white mb-6">
                  R$ 9,90<span className="text-lg text-neutral-500 font-normal">/mês</span>
                </div>
                
                {currentUser.isPremium ? (
                  <button disabled className="mt-auto w-full bg-neutral-800 text-fuchsia-400 font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-2 border border-fuchsia-500/20">
                    <Check className="w-5 h-5" /> Você já é Premium VIP
                  </button>
                ) : (
                  <button 
                    onClick={() => setCheckoutPack({ id: 'vip', name: 'Assinatura VIP (Mensal)', priceBRL: '9,90', isVip: true })}
                    className="mt-auto w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-4 px-4 rounded-xl transition-colors shadow-[0_0_20px_rgba(217,70,239,0.3)]"
                  >
                    Assinar Agora
                  </button>
                )}
                <p className="text-xs text-neutral-500 mt-4">Cancele a qualquer momento.</p>
              </div>
            </div>
          </div>
        )}
`;

content = content.replace(oldCoinsSectionEnd, vipSection + oldCoinsSectionEnd);


// 5. Update Checkout Mock Modal to handle VIP purchase
const handleCheckoutApproveOld = `              onClick={() => {
                alert("Simulação concluída! Em produção, o webhook do MercadoPago/Stripe liberaria as moedas automaticamente após o pagamento.");
                setCheckoutPack(null);
              }}`;

const handleCheckoutApproveNew = `              onClick={async () => {
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
              }}`;
content = content.replace(handleCheckoutApproveOld, handleCheckoutApproveNew);

fs.writeFileSync(filePath, content);
console.log('Store.tsx patched for VIP.');
