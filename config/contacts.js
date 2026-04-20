/* ============================================================
   KONFIGURACE KONTAKTŮ — Foot Studio Violet
   ============================================================
   Zde upravuj kontaktní údaje, otevírací dobu a nastavení
   emailů. Tento soubor je jediné místo kde měníš údaje.
   ============================================================ */

const CONTACT_CONFIG = {

    /* ----------------------------------------------------------
       ZÁKLADNÍ INFORMACE
    ---------------------------------------------------------- */
    salonName:      "Studio Violet",
    operatorName:   "Andrea Fink Krýslová",                  // ← provozovatel
    address:        "Rosnice, Karlovy Vary 360 17",       // ← uprav
    phone:          "+420 774 400 020",                  // ← uprav
    email:          "info@studioviolet.cz",          // ← uprav

    /* ----------------------------------------------------------
       EMAIL NASTAVENÍ (EmailJS)
       Postup v souboru: SETUP_FIREBASE_EMAILJS.md (kapitola 2)
    ---------------------------------------------------------- */
    emailJS: {
        serviceId:          "service_xnywr8b",           // ← ze https://emailjs.com → Account → API Keys
        templateIdClient:   "template_bnuehx8",          // ← ID šablony
        templateIdAdmin:    "template_bnuehx8",          // ← stejná šablona pro obě
        publicKey:          "uq6hcM_y-kTna7lL0",         // ← ze https://emailjs.com → Account → API Keys
        adminEmail:         "vojtechfink11@gmail.com",   // ← tvůj email
    },

    /* ----------------------------------------------------------
       KALENDÁŘ (webhook, např. Google Apps Script)
       enabled=true + url => po rezervaci se odešle payload.
       Rezervace zůstane úspěšná i při chybě webhooku.
    ---------------------------------------------------------- */
    calendarWebhook: {
        enabled:   true,
        url:       "https://script.google.com/macros/s/AKfycbwqPTgcIrXwLxCZwenkSWKVZXz81FjXEqb53Fvrn-HFoZqnchDHcqus4oi7Iy5IIXgZeg/exec", // např. https://script.google.com/macros/s/XXXX/exec
        timeoutMs: 8000,
        timezone:  "Europe/Prague",
        corsMode:  "no-cors", // Apps Script obvykle nevrací CORS hlavičky
    },

    /* ----------------------------------------------------------
       GOOGLE MAPS
       Jak získat embed URL:
       1. Jdi na maps.google.com
       2. Vyhledej svou adresu
       3. Klikni Sdílet → Vložit mapu → zkopíruj src z iframe
    ---------------------------------------------------------- */
    googleMapsEmbedUrl: "https://www.google.com/maps?q=loc:50.252551,12.843525&hl=cs&z=17&t=m&output=embed", // běžná mapa + pin


    /* ----------------------------------------------------------
       OTEVÍRACÍ DOBA
       null = zavřeno celý den
    ---------------------------------------------------------- */
    openingHours: {
        monday:    { open: "08:00", close: "17:00" },
        tuesday:   { open: "08:00", close: "17:00" },
        wednesday: { open: "08:00", close: "17:00" },
        thursday:  { open: "08:00", close: "17:00" },
        friday:    { open: "08:00", close: "17:00" },
        saturday:  null,
        sunday:    null,
    },

    /* ----------------------------------------------------------
       REZERVAČNÍ HODINY
       Poslední rezervace musí skončit před zavírací dobou.
       Systém automaticky vypočítá dostupné časy.
    ---------------------------------------------------------- */
    reservationHours: {
        start: 8,    // od 8:00
        end:   16,   // poslední začátek rezervace v 16:00
    },

    /* ----------------------------------------------------------
       FIREBASE KONFIGURACE
       Postup v souboru: SETUP_FIREBASE_EMAILJS.md (kapitola 1)

       Získáš to z: https://console.firebase.google.com
       → Nastavení projektu → Vaše aplikace → Web
    ---------------------------------------------------------- */
    firebase: {
        apiKey:             "AIzaSyDU6PZ9jAZQmh93j5mdMqjgQ0CgjQWdn7I",
        authDomain:         "studio-violet.firebaseapp.com",
        projectId:          "studio-violet",
        storageBucket:      "studio-violet.firebasestorage.app",
        messagingSenderId:  "783394608598",
        appId:              "1:783394608598:web:cfbbc2f0e7412dbd234077",
    },
};
