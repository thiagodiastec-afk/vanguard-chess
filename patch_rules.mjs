import fs from 'fs';
const fp = 'firestore.rules';
let code = fs.readFileSync(fp, 'utf8');

const newRule = `    // Reports (Anti-Cheat)
    match /reports/{reportId} {
      allow create: if isSignedIn() && incoming().reporterId == request.auth.uid;
      allow read: if false; // Only admins/backend can read
    }
  }
}`;

code = code.replace("  }\n}", newRule);
fs.writeFileSync(fp, code);
console.log("Patched rules");
