import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'import * as admin from "firebase-admin";',
  'import { initializeApp, cert } from "firebase-admin/app";\nimport { getFirestore, FieldValue } from "firebase-admin/firestore";'
);

code = code.replace(
  /admin\.initializeApp\(\{[\s\n]*credential: admin\.credential\.cert\((.*?)\),?[\s\n]*\}\);/s,
  'initializeApp({ credential: cert($1) });'
);

code = code.replace(/adminApp\.firestore\(\)/g, 'getFirestore(adminApp)');
code = code.replace(/admin\.firestore\.FieldValue/g, 'FieldValue');

fs.writeFileSync('server.ts', code);
