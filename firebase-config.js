// ============================================================
// firebase-config.js
// Firebase App + Cloud Firestore initialization (Modular SDK v12)
// ============================================================
//
// The actual config values (apiKey, projectId, etc.) live in
// firebase-env.js, which is AUTO-GENERATED and NOT committed to git.
//
// Local development:
//   1. Copy .env.example to .env and fill in your real values.
//   2. Run: node scripts/generate-env.js
//      (this creates firebase-env.js from your .env file)
//   3. Serve the folder locally (e.g. `npx serve .`) and open the site.
//
// Deployment (GitHub Pages via GitHub Actions):
//   The included workflow (.github/workflows/deploy.yml) runs the same
//   generator using GitHub repository Secrets, so firebase-env.js is
//   created fresh on every deploy and never stored in the repo.
//
// See FIREBASE_SETUP_GUIDE.md for full step-by-step instructions.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-env.js";

// Initialize Firebase App + Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
