/* ============================================================
   KONFIGURACE GALERIE — Foot Studio Violet
   ============================================================
   Přidávej fotky jednoduše — vlož soubor do images/gallery/
   a přidej záznam do pole GALLERY_CONFIG níže.
   ============================================================ */

const GALLERY_CONFIG = [
    {
        src:      "images/gallery/foto1.jpg",
        alt:      "Klasická pedikúra",
        category: "pedikura",
    },
    {
        src:      "images/gallery/foto2.jpg",
        alt:      "Luxusní pedikúra s peelingem",
        category: "pedikura",
    },
    {
        src:      "images/gallery/foto3.jpg",
        alt:      "Gelové nehty — francouzská manikúra",
        category: "gely",
    },
    {
        src:      "images/gallery/foto4.jpg",
        alt:      "Gelové nehty — barevné",
        category: "gely",
    },
    {
        src:      "images/gallery/foto5.jpg",
        alt:      "Interiér salónu",
        category: "salon",
    },
    {
        src:      "images/gallery/foto6.jpg",
        alt:      "Pracovní místo",
        category: "salon",
    },
    // Sem přidávej další fotky stejným způsobem...
];

/* ----------------------------------------------------------
   KATEGORIE PRO FILTROVÁNÍ
   id musí odpovídat hodnotám "category" u fotek výše
---------------------------------------------------------- */
const GALLERY_CATEGORIES_CONFIG = [
    { id: "vse",      label: "Vše" },
    { id: "pedikura", label: "Pedikúra" },
    { id: "gely",     label: "Gelové nehty" },
    { id: "salon",    label: "Salón" },
];
