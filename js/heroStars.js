/* ============================================================
   HERO STARS — Foot Studio Violet
   ============================================================
   Vytváří animované hvězdičky/částice v hero sekci.
   Hvězdičky se generují náhodně a plynule blikají.
   ============================================================ */

class HeroStars {

    constructor() {
        this.container  = document.getElementById("heroStars");
        this.stars      = [];

        // Nastavení
        this.config = {
            count:       80,    // počet hvězdiček
            minSize:     1,     // minimální velikost (px)
            maxSize:     4,     // maximální velikost (px)
            minDuration: 2,     // minimální délka animace (s)
            maxDuration: 6,     // maximální délka animace (s)
            minDelay:    0,     // minimální zpoždění (s)
            maxDelay:    4,     // maximální zpoždění (s)
            symbols:     ["✦", "✧", "·", "⋆", "✶"],  // tvary hvězdiček
        };
    }

    /* ----------------------------------------------------------
       INICIALIZACE
       Volá se z main.js při startu aplikace
    ---------------------------------------------------------- */
    init() {
        if (!this.container) {
            console.warn("⚠️ HeroStars: kontejner #heroStars nenalezen");
            return;
        }

        this._generate();
        this._bindResizeEvent();
        console.log("✅ HeroStars: úspěšně inicializovány");
    }

    /* ----------------------------------------------------------
       POMOCNÁ FUNKCE — náhodné číslo v rozsahu
    ---------------------------------------------------------- */
    _random(min, max) {
        return Math.random() * (max - min) + min;
    }

    /* ----------------------------------------------------------
       POMOCNÁ FUNKCE — náhodný prvek z pole
    ---------------------------------------------------------- */
    _randomItem(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /* ----------------------------------------------------------
       GENEROVÁNÍ HVĚZDIČEK
       Vytvoří DOM elementy pro každou hvězdičku
       s náhodnými vlastnostmi
    ---------------------------------------------------------- */
    _generate() {
        // Vyčistí kontejner před regenerací
        this.container.innerHTML = "";
        this.stars = [];

        for (let i = 0; i < this.config.count; i++) {
            const star = this._createStar();
            this.container.appendChild(star);
            this.stars.push(star);
        }
    }

    /* ----------------------------------------------------------
       VYTVOŘENÍ JEDNÉ HVĚZDIČKY
       Vrátí DOM element s náhodným stylem a animací

       Návratová hodnota:
         HTMLElement — span element hvězdičky
    ---------------------------------------------------------- */
    _createStar() {
        const star = document.createElement("span");

        // Náhodné vlastnosti
        const size     = this._random(this.config.minSize, this.config.maxSize);
        const posX     = this._random(0, 100);   // % od levého okraje
        const posY     = this._random(0, 100);   // % od horního okraje
        const duration = this._random(this.config.minDuration, this.config.maxDuration);
        const delay    = this._random(this.config.minDelay, this.config.maxDelay);
        const symbol   = this._randomItem(this.config.symbols);
        const opacity  = this._random(0.3, 0.9);

        // Přiřadí třídu a obsah
        star.classList.add("hero__star");
        star.textContent = symbol;

        // Inline styly pro náhodné pozicování
        star.style.cssText = `
            position:   absolute;
            left:       ${posX}%;
            top:        ${posY}%;
            font-size:  ${size * 4}px;
            opacity:    0;
            color:      rgba(255, 255, 255, ${opacity});
            animation:  starTwinkle ${duration}s ${delay}s infinite ease-in-out;
            pointer-events: none;
            user-select:    none;
            will-change:    opacity, transform;
        `;

        return star;
    }

    /* ----------------------------------------------------------
       REGENERACE PŘI ZMĚNĚ VELIKOSTI OKNA
       Přizpůsobí počet hvězdiček velikosti obrazovky
    ---------------------------------------------------------- */
    _bindResizeEvent() {
        let resizeTimer;

        window.addEventListener("resize", () => {
            // Debounce — nespouštět příliš často
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this._adjustCountForScreenSize();
                this._generate();
            }, 300);
        }, { passive: true });
    }

    /* ----------------------------------------------------------
       PŘIZPŮSOBENÍ POČTU HVĚZDIČEK VELIKOSTI OBRAZOVKY
       Na mobilu méně hvězdiček pro lepší výkon
    ---------------------------------------------------------- */
    _adjustCountForScreenSize() {
        const width = window.innerWidth;

        if (width < 480) {
            this.config.count = 30;   // mobil
        } else if (width < 768) {
            this.config.count = 50;   // tablet
        } else {
            this.config.count = 80;   // desktop
        }
    }

    /* ----------------------------------------------------------
       POZASTAVENÍ ANIMACÍ
       Šetří výkon když je stránka skrytá
    ---------------------------------------------------------- */
    pause() {
        this.stars.forEach(star => {
            star.style.animationPlayState = "paused";
        });
    }

    /* ----------------------------------------------------------
       OBNOVENÍ ANIMACÍ
    ---------------------------------------------------------- */
    resume() {
        this.stars.forEach(star => {
            star.style.animationPlayState = "running";
        });
    }
}

/* ============================================================
   GLOBÁLNÍ INSTANCE
   ============================================================ */
const heroStars = new HeroStars();

/* ============================================================
   OPTIMALIZACE VÝKONU
   Pozastaví animace když uživatel přepne záložku
   ============================================================ */
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        heroStars.pause();
    } else {
        heroStars.resume();
    }
});
