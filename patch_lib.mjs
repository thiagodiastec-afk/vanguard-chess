import fs from 'fs';
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');
code = code.replace("db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');", "db = getFirestore(app);");
fs.writeFileSync('src/lib/firebase.ts', code);
