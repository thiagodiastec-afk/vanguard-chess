with open("src/types.ts", "r") as f:
    code = f.read()

code = code.replace("unlockedThemes?: string[];", "unlockedThemes?: string[];\n  unlockedBackgrounds?: string[];\n  activeBackground?: string;")

with open("src/types.ts", "w") as f:
    f.write(code)


with open("src/components/Store.tsx", "r") as f:
    store = f.read()

store = store.replace("import { Store as StoreIcon, Lock, Unlock, Check, Crown, Palette, Coins, Eye, X, CreditCard, Gift, ShieldCheck, Star } from 'lucide-react';", "import { Store as StoreIcon, Lock, Unlock, Check, Crown, Palette, Coins, Eye, X, CreditCard, Gift, ShieldCheck, Star, Image as ImageIcon } from 'lucide-react';")

with open("src/components/Store.tsx", "w") as f:
    f.write(store)

