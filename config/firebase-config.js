/* ============================================================
   FIREBASE CONFIG — Placeholder pro vývoj
   ============================================================
   POZOR: Toto jsou DUMMY údaje! Slouží pouze pro vývoj.

   Až si registruješ Firebase projekt, sem vložíš jeho údaje.

   KROKY K ZÍSKÁNÍ ÚDAJŮ:
   1. Jdi na https://console.firebase.google.com
   2. Klikni "Nový projekt"
   3. Vyplníš název (např. "Foot Studio Violet")
   4. Vyber "Firestore Database"
   5. V projektu najdeš "Nastavení projektu" → "Vaše aplikace"
   6. Vyber Web (</>)
   7. Zkopíruj "firebaseConfig" objekt odtud a vložíš sem
   ============================================================ */

// DUMMY konfigurace pro vývoj — bude se ignorovat v JS
// Firebase se aktivuje až když sem vložíš PRAVÉ údaje

const FIREBASE_CONFIG = {
    apiKey:            "DUMMY_API_KEY_CHANGE_THIS",
    authDomain:        "dummy-project.firebaseapp.com",
    projectId:         "dummy-project",
    storageBucket:     "dummy-project.appspot.com",
    messagingSenderId: "123456789012",
    appId:             "1:123456789012:web:abcdef1234567890"
};

// Pozn: Tento soubor se načítá v HTML, ale config se čte z contacts.js
// Pokud chceš, můžeš sem přidat i zde Firebase inicializaci

