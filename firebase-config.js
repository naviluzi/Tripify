// ============================================================
// firebase-config.js — TravelHack SL
// Paste your Firebase project config here.
//
// How to get this config:
//  1. Go to https://console.firebase.google.com
//  2. Open your project → Project Settings (gear icon)
//  3. Scroll to "Your apps" → Web app → copy firebaseConfig
// ============================================================

// ============================================================
// firebase-config.js — Tripify
// ============================================================

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyD5OINwjKxBZWjl6eHAsGbQEgJumSUZyWQ",
  authDomain: "tripify-53bc5.firebaseapp.com",
  databaseURL: "https://tripify-53bc5-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "tripify-53bc5",
  storageBucket: "tripify-53bc5.firebasestorage.app",
  messagingSenderId: "413541112050",
  appId: "1:413541112050:web:4c136a1ed1dab73d19586b",
  measurementId: "G-N0M6EMBNGT"
};

// The Bridge: This waits for the 'firebase' variable to exist
function startFirebase() {
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
      firebase.initializeApp(window.FIREBASE_CONFIG);
      console.log("✅ Tripify: Firebase Bridge Connected Successfully.");
    }
  } else {
    // If not ready, wait 50ms and try again
    setTimeout(startFirebase, 50);
  }
}

startFirebase();