import fs from 'fs';

const filePath = 'src/components/Leaderboard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('import { Crown, Medal, User, Swords, TrendingUp, Shield, Star }')) {
  content = content.replace(
    "import { Crown, Medal, User, Swords, TrendingUp, Shield } from 'lucide-react';",
    "import { Crown, Medal, User, Swords, TrendingUp, Shield, Star } from 'lucide-react';"
  );
}

// Top 3
content = content.replace(
  "<p className=\"font-bold text-white text-lg truncate w-full text-center\">{top3[1].displayName}</p>",
  "<p className=\"font-bold text-white text-lg truncate w-full text-center flex items-center justify-center gap-1\">{top3[1].displayName} {top3[1].isPremium && <Star className=\"w-4 h-4 text-fuchsia-500 fill-fuchsia-500\" title=\"VIP\" />}</p>"
);

content = content.replace(
  "<p className=\"font-black text-white text-xl truncate w-full text-center\">{top3[0].displayName}</p>",
  "<p className=\"font-black text-white text-xl truncate w-full text-center flex items-center justify-center gap-1\">{top3[0].displayName} {top3[0].isPremium && <Star className=\"w-5 h-5 text-fuchsia-500 fill-fuchsia-500\" title=\"VIP\" />}</p>"
);

content = content.replace(
  "<p className=\"font-bold text-white text-lg truncate w-full text-center\">{top3[2].displayName}</p>",
  "<p className=\"font-bold text-white text-lg truncate w-full text-center flex items-center justify-center gap-1\">{top3[2].displayName} {top3[2].isPremium && <Star className=\"w-4 h-4 text-fuchsia-500 fill-fuchsia-500\" title=\"VIP\" />}</p>"
);

// Rest
content = content.replace(
  "<div className=\"font-bold text-white\">{user.displayName}</div>",
  "<div className=\"font-bold text-white flex items-center gap-1\">{user.displayName} {user.isPremium && <Star className=\"w-3.5 h-3.5 text-fuchsia-500 fill-fuchsia-500\" title=\"VIP\" />}</div>"
);

fs.writeFileSync(filePath, content);
console.log('Leaderboard.tsx patched for VIP.');
