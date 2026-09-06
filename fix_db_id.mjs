import fs from 'fs';

// 1. Fix firebase-applet-config.json
const configPath = 'firebase-applet-config.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.firestoreDatabaseId = 'ai-studio-fcb48dec-7903-4132-9310-02b17375279b';
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

// 2. Fix src/lib/firebase.ts
let firebaseTs = fs.readFileSync('src/lib/firebase.ts', 'utf8');
firebaseTs = firebaseTs.replace(
  'db = getFirestore(app);',
  'db = getFirestore(app, firebaseConfig.firestoreDatabaseId);'
);
fs.writeFileSync('src/lib/firebase.ts', firebaseTs);

// 3. Fix server.ts for admin SDK
let serverTs = fs.readFileSync('server.ts', 'utf8');
serverTs = serverTs.replace(/getFirestore\(adminApp\)/g, "getFirestore(adminApp, 'ai-studio-fcb48dec-7903-4132-9310-02b17375279b')");
fs.writeFileSync('server.ts', serverTs);

console.log("Fixed database IDs in all files");
