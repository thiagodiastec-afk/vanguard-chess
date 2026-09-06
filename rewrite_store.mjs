import fs from 'fs';

const filePath = 'src/components/Store.tsx';
const content = `import { Store as StoreIcon, Lock, Unlock, Check, Crown, Palette, Coins, Eye, X, CreditCard, Gift, ShieldCheck } from 'lucide-react';
import { CHESS_THEMES } from '../lib/themes';
import { UserData } from '../types';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { customPieces } from '../lib/chessPieces';

interface StoreProps {
  currentUser: UserData;
}

const COIN_PACKAGES = [
  { id: 'pack_1', name: 'Mão Cheia', coins: 500, priceBRL: '4,90', bonus: 0, popular: false },
  { id: 'pack_2', name: 'Baú de Ouro', coins: 1500, priceBRL: '12,90', bonus: 15, popular: true },
  { id: 'pack_3', name: 'Tesouro do Rei', coins: 5000, priceBRL: '39,90', bonus: 30, popular: false }
];

export default function Store({ currentUser }: StoreProps) {
  const [buying, setBuying] = useState<string | null>(null);
  const [previewTheme, setPreviewTheme] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'themes' | 'coins'>('themes');
  const [checkoutPack, setCheckoutPack] = useState<any>(null);

  const coins = currentUser.coins || 0;
  const unlockedThemes = currentUser.unlockedThemes || ['luxury', 'classic'];
  const activeTheme = currentUser.activeTheme || 'luxury';

  const handleBuy = async (themeId: string, price: number) => {
    if (coins < price || unlockedThemes.includes(themeId)) return;
    setBuying(themeId);
    try {
      const db = getDb();
      await updateDoc(doc(db, 'users', currentUser.uid), {
        coins: coins - price,
        unlockedThemes: arrayUnion(themeId)
      });
    } catch (err) {
      console.error('Error buying theme:', err);
    } finally {
      setBuying(null);
    }
  };

  const handleEquip = async (themeId: string) => {
    if (!unlockedThemes.includes(themeId)) return;
    try {
      const db = getDb();
      await updateDoc(doc(db, 'users', currentUser.uid), {
        activeTheme: themeId
      });
      localStorage.setItem('chess-theme', themeId);
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Error equipping theme:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 bg-neutral-800 p-6 rounded-2xl border border-neutral-700/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <StoreIcon className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight">Loja Premium</h2>
              <p className="text-neutral-400 mt-1">
                Personalize sua experiência com novos visuais exclusivos.
              </p>
            </div>
          </div>
          
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl px-6 py-4 flex items-center gap-4 shadow-inner">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <Coins className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Seu Saldo Atual</p>
              <p className="text-3xl font-black text-white">{coins}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('themes')}
            className={\`px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 \${
              activeTab === 'themes' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
            }\`}
          >
            <Palette className="w-5 h-5" />
            Temas de Tabuleiro
          </button>
          <button
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
        </div>

        {activeTab === 'themes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CHESS_THEMES.map(theme => {
              const isUnlocked = unlockedThemes.includes(theme.id) || theme.price === 0;
              const isEquipped = activeTheme === theme.id || (!currentUser.activeTheme && theme.id === 'luxury');
              
              return (
                <div key={theme.id} className={\`bg-neutral-800 rounded-xl p-6 border flex flex-col relative overflow-hidden group transition-colors \${isEquipped ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border-neutral-700/50 hover:border-neutral-600'}\`}>
                  
                  <div className="absolute top-0 right-0 p-3 z-20">
                    {isEquipped ? (
                      <div className="bg-emerald-500 p-1.5 rounded-full shadow-lg">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    ) : isUnlocked ? (
                      <div className="bg-neutral-700 p-1.5 rounded-full shadow-lg">
                        <Unlock className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <div className="bg-black/50 backdrop-blur-sm p-1.5 rounded-full shadow-lg">
                        <Lock className="w-4 h-4 text-neutral-300" />
                      </div>
                    )}
                  </div>
                  
                  <div 
                    className="w-full h-32 rounded-lg mb-5 flex border border-neutral-700/50 overflow-hidden shadow-inner cursor-pointer relative group/preview"
                    onClick={() => setPreviewTheme(theme)}
                  >
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 flex items-center justify-center transition-opacity z-10 backdrop-blur-sm">
                      <Eye className="w-8 h-8 text-white mb-1" />
                      <span className="text-white text-sm font-bold ml-2">Visualizar em 3D</span>
                    </div>
                    <div className="flex-1 flex flex-col">
                      <div className="flex-1" style={{ backgroundColor: theme.lightSquareStyle.backgroundColor }} />
                      <div className="flex-1" style={{ backgroundColor: theme.darkSquareStyle.backgroundColor }} />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <div className="flex-1" style={{ backgroundColor: theme.darkSquareStyle.backgroundColor }} />
                      <div className="flex-1" style={{ backgroundColor: theme.lightSquareStyle.backgroundColor }} />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2">{theme.name}</h3>
                  <p className="text-sm text-neutral-400 mb-6 flex-1">
                    {theme.description || 'Um tema incrível para suas partidas.'}
                  </p>
                  
                  {isEquipped ? (
                    <button disabled className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2">
                      <Check className="w-5 h-5" /> Equipado Atualmente
                    </button>
                  ) : isUnlocked ? (
                    <button 
                      onClick={() => handleEquip(theme.id)}
                      className="w-full bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-3 px-4 rounded-xl transition-colors"
                    >
                      Equipar Tema
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleBuy(theme.id, theme.price)}
                      disabled={coins < theme.price || buying === theme.id}
                      className={\`w-full font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg \${
                        coins >= theme.price 
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' 
                          : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                      }\`}
                    >
                      {buying === theme.id ? (
                        <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Coins className="w-5 h-5" /> Comprar por {theme.price}
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'coins' && (
          <div className="bg-neutral-800 rounded-2xl border border-neutral-700/50 p-8 shadow-xl">
            <div className="text-center mb-10">
              <h3 className="text-3xl font-bold text-white mb-4">Turbine sua conta</h3>
              <p className="text-neutral-400 max-w-2xl mx-auto">
                Adquira moedas instantaneamente para desbloquear temas lendários e apoiar o desenvolvimento contínuo do jogo. Pagamento 100% seguro.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {COIN_PACKAGES.map(pack => (
                <div key={pack.id} className={\`bg-neutral-900 rounded-2xl border p-6 flex flex-col text-center relative overflow-hidden transition-transform hover:-translate-y-1 \${pack.popular ? 'border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.15)]' : 'border-neutral-700'}\`}>
                  {pack.popular && (
                    <div className="bg-yellow-500 text-yellow-950 text-xs font-black uppercase tracking-wider py-1 px-3 absolute top-0 left-0 right-0">
                      Mais Popular
                    </div>
                  )}
                  
                  <div className={\`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 \${pack.popular ? 'bg-yellow-500/20 mt-4' : 'bg-neutral-800'}\`}>
                    <Coins className={\`w-10 h-10 \${pack.popular ? 'text-yellow-500' : 'text-neutral-400'}\`} />
                  </div>
                  
                  <h4 className="text-xl font-bold text-white mb-2">{pack.name}</h4>
                  
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-3xl font-black text-yellow-500">{pack.coins}</span>
                    <span className="text-neutral-400 font-medium">Moedas</span>
                  </div>
                  
                  {pack.bonus > 0 && (
                    <div className="text-sm text-emerald-400 font-bold mb-6">
                      +{pack.bonus}% de Bônus incluso
                    </div>
                  )}
                  
                  <div className="mt-auto pt-6">
                    <button 
                      onClick={() => setCheckoutPack(pack)}
                      className={\`w-full py-3 px-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 \${
                        pack.popular 
                          ? 'bg-yellow-500 hover:bg-yellow-400 text-yellow-950' 
                          : 'bg-neutral-700 hover:bg-neutral-600 text-white'
                      }\`}
                    >
                      <CreditCard className="w-5 h-5" />
                      R$ {pack.priceBRL}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-10 flex items-center justify-center gap-6 text-sm text-neutral-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Pagamento Seguro via Pix
              </div>
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4" /> Entrega Imediata
              </div>
            </div>
          </div>
        )}
        
      </div>
      
      {/* Theme Preview Modal */}
      {previewTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewTheme(null)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setPreviewTheme(null)}
              className="absolute -top-3 -right-3 p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-full transition-colors z-20 border border-neutral-700"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Palette className="w-6 h-6 text-emerald-500" />
                {previewTheme.name}
              </h3>
              <p className="text-neutral-400 text-sm mt-1">{previewTheme.description}</p>
            </div>
            
            <div className="w-full aspect-square rounded-xl overflow-hidden shadow-2xl ring-4 ring-black/50 bg-black">
              {/* @ts-ignore */}
              <Chessboard 
                options={{
                  id: "PreviewBoard",
                  position: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
                  boardOrientation: "white",
                  darkSquareStyle: previewTheme.darkSquareStyle,
                  lightSquareStyle: previewTheme.lightSquareStyle,
                  pieces: customPieces,
                  animationDurationInMs: 300,
                  arePiecesDraggable: false
                }}
              />
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setPreviewTheme(null)}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-4 rounded-xl transition-colors"
              >
                Fechar
              </button>
              
              {(!currentUser.unlockedThemes?.includes(previewTheme.id) && previewTheme.price > 0) && (
                <button
                  onClick={() => {
                    handleBuy(previewTheme.id, previewTheme.price);
                    setPreviewTheme(null);
                  }}
                  disabled={coins < previewTheme.price}
                  className={\`flex-1 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors \${
                    coins >= previewTheme.price 
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                      : 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                  }\`}
                >
                  <Coins className="w-5 h-5" /> Comprar por {previewTheme.price}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkout Mock Modal */}
      {checkoutPack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setCheckoutPack(null)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-8 max-w-md w-full shadow-2xl relative text-center" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setCheckoutPack(null)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-10 h-10 text-emerald-500" />
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2">Finalizar Compra</h3>
            <p className="text-neutral-400 mb-6">Você está adquirindo o pacote <strong className="text-white">{checkoutPack.name}</strong> por R$ {checkoutPack.priceBRL}.</p>
            
            <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 mb-8">
              <p className="text-sm text-neutral-400 mb-4">Escaneie o QR Code abaixo com o app do seu banco para pagar via Pix:</p>
              
              <div className="w-48 h-48 bg-white mx-auto rounded-lg p-2 flex items-center justify-center relative overflow-hidden group">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=simulated-pix-payment" alt="QR Code Pix" className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs text-center px-4">
                    Este é um ambiente de demonstração. Integração real requer chave de API (Stripe/MercadoPago).
                  </p>
                </div>
              </div>
              
              <div className="mt-4 break-all bg-neutral-900 p-3 rounded text-xs text-neutral-500 font-mono">
                00020126580014br.gov.bcb.pix0136simulated-pix-key...
              </div>
            </div>
            
            <button
              onClick={() => {
                alert("Simulação concluída! Em produção, o webhook do MercadoPago/Stripe liberaria as moedas automaticamente após o pagamento.");
                setCheckoutPack(null);
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition-colors"
            >
              Simular Pagamento Aprovado
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
`
fs.writeFileSync(filePath, content);
console.log('Store.tsx overwritten.');
