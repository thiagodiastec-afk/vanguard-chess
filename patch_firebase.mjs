import fs from 'fs';

const fp = 'src/lib/firebase.ts';
let code = fs.readFileSync(fp, 'utf8');

// Replace the firebaseConfig block
const newConfig = `
const firebaseConfig = {
  apiKey: "AIzaSyBCdqt3E7hAV3quWhAyrGLMH8XfS1WyuAc",
  authDomain: "gen-lang-client-0036916917.firebaseapp.com",
  projectId: "gen-lang-client-0036916917",
  storageBucket: "gen-lang-client-0036916917.firebasestorage.app",
  messagingSenderId: "560833797194",
  appId: "1:560833797194:web:fded8bb86f218d8e441ab3"
};
`;

code = code.replace(/const firebaseConfig = \{[\s\S]*?\};/, newConfig);

// Update firestore initialization to NOT use the custom databaseId if we are migrating to their default database
code = code.replace(
  "const db = getFirestore(app, 'ai-studio-fcb48dec-7903-4132-9310-02b17375279b');",
  "const db = getFirestore(app);" // Removed the custom db id to use the project's default database
);


fs.writeFileSync(fp, code);
console.log("Patched firebase config");
