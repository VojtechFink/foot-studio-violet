/* ============================================================
   MAIN — Foot Studio Violet
   ============================================================
   Hlavní vstupní bod aplikace.
   Inicializuje všechny moduly ve správném pořadí:

   1. Firebase (databáze)
   2. AnalyticsService (sledování akcí)
   3. EmailJS (odesílání emailů)
   4. StorageService (propojení Firebase + Email)
   5. Navigation (navbar, scroll, hamburger)
   6. HeroStars (animované hvězdičky)
   7. ServicesRenderer (karty služeb)
   8. ReservationForm (rezervační formulář)
   9. ReviewsService (recenze)
   ============================================================ */

/* ----------------------------------------------------------
   POMOCNÁ FUNKCE — čekání na DOM
   Spustí callback až když je DOM plně načten
---------------------------------------------------------- */
function onDOMReady(callback) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", callback);
    } else {
        // DOM je již připraven
        callback();
    }
}

/* ----------------------------------------------------------
   HLAVNÍ INICIALIZAČNÍ FUNKCE
   Spouští všechny moduly v správném pořadí
---------------------------------------------------------- */
async function initApp() {
    console.log("🌸 Foot Studio Violet — spouštím aplikaci…");

    try {

        /* ------------------------------------------------
           KROK 1 — Firebase
           Inicializuje připojení k databázi
        ------------------------------------------------ */
        firebaseService.init();

         /* ------------------------------------------------
            KROK 2 — AnalyticsService
            Inicializuje sledování akcí a návštěv
         ------------------------------------------------ */
         analyticsService.init();

         /* ------------------------------------------------
            KROK 3 — EmailJS
            Inicializuje emailovou službu
         ------------------------------------------------ */
         emailService.init();

         /* ------------------------------------------------
            KROK 4 — StorageService
            Propojí Firebase a EmailJS dohromady
         ------------------------------------------------ */
         storageService.init();

         /* ------------------------------------------------
            KROK 5 — Navigation
            Navbar, scroll efekty, hamburger menu
         ------------------------------------------------ */
         navigation.init();

         /* ------------------------------------------------
            KROK 6 — HeroStars
            Animované hvězdičky v hero sekci
         ------------------------------------------------ */
         heroStars.init();

         /* ------------------------------------------------
            KROK 7 — ServicesRenderer
            Vykreslí karty služeb ze SERVICES_CONFIG
         ------------------------------------------------ */
         servicesRenderer.init();

         /* ------------------------------------------------
            KROK 8 — ReservationForm
            Inicializuje rezervační formulář
         ------------------------------------------------ */
         reservationForm.init();

         /* ------------------------------------------------
            KROK 9 — ReviewsService
            Načte nejlepší recenze a nastaví formulář recenzí
         ------------------------------------------------ */
         reviewsService.init();

        console.log("✅ Foot Studio Violet — aplikace úspěšně spuštěna!");

    } catch (error) {
        console.error("❌ Foot Studio Violet — chyba při inicializaci →", error);
    }
}

/* ----------------------------------------------------------
   SPUŠTĚNÍ APLIKACE
   Čeká na načtení DOM a pak spustí initApp()
---------------------------------------------------------- */
onDOMReady(initApp);

/* ----------------------------------------------------------
   GLOBÁLNÍ ZACHYCENÍ NEOŠETŘENÝCH CHYB
   Zabrání pádu aplikace při neočekávané chybě
---------------------------------------------------------- */
window.addEventListener("error", (event) => {
    console.error("❌ Globální chyba →", event.message, "→", event.filename);
});

window.addEventListener("unhandledrejection", (event) => {
    console.error("❌ Neošetřený Promise reject →", event.reason);
});
