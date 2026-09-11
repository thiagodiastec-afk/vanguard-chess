import re

with open("src/components/Store.tsx", "r") as f:
    code = f.read()

# Add background import
if "import { APP_BACKGROUNDS" not in code:
    code = code.replace("import { CHESS_THEMES } from '../lib/themes';", "import { CHESS_THEMES } from '../lib/themes';\nimport { APP_BACKGROUNDS } from '../lib/backgrounds';")
    code = code.replace("import { Palette, PlaySquare, Check, Coins, ShoppingCart, ShieldCheck, Play, Star, Sparkles, Gem, Clock } from 'lucide-react';", "import { Palette, PlaySquare, Check, Coins, ShoppingCart, ShieldCheck, Play, Star, Sparkles, Gem, Clock, Image as ImageIcon } from 'lucide-react';")

# Update tabs state
if "const [activeTab, setActiveTab] = useState<'themes' | 'coins' | 'vip'>('themes');" in code:
    code = code.replace("const [activeTab, setActiveTab] = useState<'themes' | 'coins' | 'vip'>('themes');", "const [activeTab, setActiveTab] = useState<'themes' | 'backgrounds' | 'coins' | 'vip'>('themes');")

# Add backgrounds variables
if "const unlockedBackgrounds =" not in code:
    code = code.replace("const unlockedThemes = currentUser.unlockedThemes || ['luxury', 'classic'];", "const unlockedThemes = currentUser.unlockedThemes || ['luxury', 'classic'];\n  const unlockedBackgrounds = currentUser.unlockedBackgrounds || ['default'];\n  const activeBackground = currentUser.activeBackground || 'default';")

# Add background handler
if "const handleEquipBackground =" not in code:
    handler = """
  const handleEquipBackground = async (bgId: string) => {
    try {
      await updateDoc(doc(getDb(), 'users', currentUser.uid), {
        activeBackground: bgId
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleBuyBackground = async (bgId: string, price: number) => {
    if (coins < price) {
      alert('Moedas insuficientes!');
      return;
    }
    try {
      await updateDoc(doc(getDb(), 'users', currentUser.uid), {
        coins: coins - price,
        unlockedBackgrounds: arrayUnion(bgId),
        activeBackground: bgId
      });
    } catch (e) {
      console.error(e);
    }
  };
"""
    code = code.replace("const handleEquipTheme =", handler + "  const handleEquipTheme =")

# Add the button to select the backgrounds tab
if "Papéis de Parede" not in code:
    new_btn = """
          <button
            onClick={() => setActiveTab('backgrounds')}
            className={`px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'backgrounds' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
            }`}
          >
            <ImageIcon className="w-5 h-5" />
            Papéis de Parede
          </button>
"""
    code = code.replace("          <button\n            onClick={() => setActiveTab('coins')}", new_btn + "          <button\n            onClick={() => setActiveTab('coins')}")

with open("src/components/Store.tsx", "w") as f:
    f.write(code)

