/*
  scripts/import-spots.js

  Usage:
    Set GOOGLE_APPLICATION_CREDENTIALS to the path of a Firebase service account JSON file, then run:
      node scripts/import-spots.js

  This script reads src/data/spots.json and imports each spot as a document in Firestore collection `spots`.
*/

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import admin from 'firebase-admin';

async function main() {
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!saPath) {
    console.error('ERROR: Set the GOOGLE_APPLICATION_CREDENTIALS environment variable to your service account JSON path.');
    process.exit(1);
  }

  // Read the service account JSON file
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(await fs.readFile(saPath, 'utf8'));
  } catch (err) {
    console.error('Failed to read service account JSON file:', err);
    process.exit(1);
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'travellers-plan'
    });
  } catch (err) {
    console.error('Failed to initialize Firebase Admin:', err);
    process.exit(1);
  }

  const db = admin.firestore();
  const dataPath = path.resolve(process.cwd(), 'src', 'data', 'spots.json');

  let raw;
  try {
    raw = await fs.readFile(dataPath, 'utf8');
  } catch (err) {
    console.error('Failed to read spots.json:', err);
    process.exit(1);
  }

  let spots;
  try {
    spots = JSON.parse(raw);
    if (!Array.isArray(spots)) throw new Error('spots.json must be an array');
  } catch (err) {
    console.error('Invalid JSON in spots.json:', err);
    process.exit(1);
  }

  const colRef = db.collection('spots');
  let added = 0;

  for (const s of spots) {
    const lat = Number(s.lat);
    const lng = Number(s.lng);
    const title = s.title || '';
  const docId = crypto.createHash('sha1').update(`${lat.toFixed(4)}|${lng.toFixed(4)}|${title}`).digest('hex');

    const docData = {
      lat: Number(lat.toFixed(4)),
      lng: Number(lng.toFixed(4)),
      title,
      description: s.description || '',
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
      // Use deterministic doc ID so re-running the script won't create duplicates.
      await colRef.doc(docId).set(docData, { merge: true });
      added += 1;
      console.log('Imported/updated spot:', title || '(no title)', '->', docId);
    } catch (err) {
      console.error('Failed to import spot', s, err);
    }
  }

  console.log(`Import complete. ${added} spots added/updated in Firestore collection 'spots'.`);
  process.exit(0);
}

main();
