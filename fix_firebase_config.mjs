import fs from 'fs';

const fp = 'firebase-applet-config.json';
const config = JSON.parse(fs.readFileSync(fp, 'utf8'));

// Delete the specific database ID so it points to the default Firestore database of the new project
delete config.firestoreDatabaseId;

fs.writeFileSync(fp, JSON.stringify(config, null, 2));
console.log("Fixed firebase-applet-config.json");
