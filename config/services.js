/* ============================================================
   KONFIGURACE SLUŽEB — Foot Studio Violet
   ============================================================
   Zde upravuj, přidávej nebo odebírej služby salónu.
   Každá služba musí mít všechny níže uvedené vlastnosti.
   ============================================================ */

const SERVICES_CONFIG = [
    {
        id: 1,
        name: "Klasická pedikúra",
        description: "Kompletní ošetření nohou včetně úpravy nehtů, odstranění ztvrdlé kůže a závěrečného leštění.",
        price: 500,
        duration: 60,       // délka v minutách
        icon: "🌸",
        available: true,    // false = nezobrazí se v nabídce
    },
    {
        id: 2,
        name: "Luxusní pedikúra",
        description: "Rozšířená péče s aromatickým peelingem, zábalem a relaxační masáží chodidel.",
        price: 800,
        duration: 90,
        icon: "✨",
        available: true,
    },
    {
        id: 3,
        name: "Gelové nehty na nohy",
        description: "Profesionální aplikace gelových nehtů s barevným lakem dle vlastního výběru.",
        price: 650,
        duration: 75,
        icon: "💅",
        available: true,
    },
    {
        id: 4,
        name: "Dětská pedikúra",
        description: "Jemné ošetření dětských nožiček přizpůsobené citlivé pokožce.",
        price: 350,
        duration: 45,
        icon: "🌷",
        available: true,
    },
    {
        id: 5,
        name: "Expresní pedikúra",
        description: "Rychlá úprava nehtů a základní péče o chodidla pro zaneprázdněné klientky.",
        price: 300,
        duration: 30,
        icon: "⚡",
        available: true,
    },
];

/* ============================================================
   OTEVÍRACÍ DOBA A ČASOVÉ SLOTY
   ============================================================ */
const OPENING_HOURS = {
    days:          [1, 2, 3, 4, 5],  // 1=Pondělí … 5=Pátek
    firstSlot:     8,                 // První rezervace v 8:00
    lastSlot:      16,                // Poslední rezervace v 16:00
    slotDuration:  60,                // Délka slotu v minutách
};
