/* ============================================================
   EMAILJS CONFIG — Placeholder pro vývoj
   ============================================================
   POZOR: Toto jsou DUMMY údaje! Slouží pouze pro vývoj.

   Až si registruješ EmailJS, sem vložíš jeho údaje.

   KROKY K ZÍSKÁNÍ ÚDAJŮ:
   1. Jdi na https://www.emailjs.com/
   2. Klikni "Sign Up" (registrace je FREE)
   3. Přihláš se
   4. Jdi do "Email Services" a přidej svoje SMTP (Gmail, Outlook, atd.)
   5. V "Email Templates" vytvoř 2 šablony:
      - Jednu pro klienta (potvrzení rezervace)
      - Jednu pro tebe (notifikace o nové rezervaci)
   6. V Account → API Keys najdeš:
      - Service ID (service_xxx)
      - Template IDs (template_xxx)
      - Public Key (abcdef123456)
   7. Zkopíruj je sem do contacts.js v konfiguraci emailJS
   ============================================================ */

// DUMMY konfigurace pro vývoj — bude se ignorovat v JS
// EmailJS se aktivuje až když sem vložíš PRAVÉ údaje v contacts.js

const EMAILJS_CONFIG = {
    serviceId:        "service_DUMMY_CHANGE_THIS",
    templateIdClient: "template_DUMMY_CHANGE_THIS",
    templateIdAdmin:  "template_DUMMY_CHANGE_THIS",
    publicKey:        "DUMMY_PUBLIC_KEY_CHANGE_THIS"
};

// Pozn: Tento soubor se načítá v HTML, ale config se čte z contacts.js

