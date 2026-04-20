/* ============================================================
   SERVICES RENDERER — Foot Studio Violet
   ============================================================
   Vykresluje karty služeb do sekce #sluzby.
   Data čte z SERVICES_CONFIG (config/services.js).
   Stará se o:
     - Vykreslení karet služeb
     - Filtrování podle kategorie
     - Animaci karet při scrollu
     - Tlačítko "Rezervovat" na každé kartě
   ============================================================ */

class ServicesRenderer {

    constructor() {
        this.container    = document.getElementById("servicesGrid");
        this.filterBtns   = document.querySelectorAll(".services__filter-btn");
        this.activeFilter = "all";   // výchozí filtr — zobrazí vše
    }

    /* ----------------------------------------------------------
       INICIALIZACE
       Volá se z main.js při startu aplikace
    ---------------------------------------------------------- */
    init() {
        if (!this.container) {
            console.warn("⚠️ ServicesRenderer: kontejner #servicesGrid nenalezen");
            return;
        }

        this._render(SERVICES_CONFIG);
        this._bindFilterButtons();
        this._bindScrollAnimation();
        console.log("✅ ServicesRenderer: úspěšně inicializován");
    }

    /* ----------------------------------------------------------
       VYKRESLENÍ KARET
       Přijme pole služeb a vykreslí je do kontejneru

       Parametry:
         services {Array} — pole objektů služeb ze SERVICES_CONFIG
    ---------------------------------------------------------- */
    _render(services) {
        // Vyčistí kontejner
        this.container.innerHTML = "";

        if (services.length === 0) {
            this.container.innerHTML = `
                <p class="services__empty">
                    V této kategorii zatím nejsou žádné služby.
                </p>
            `;
            return;
        }

        // Vykreslí každou kartu
        services.forEach((service, index) => {
            const card = this._createCard(service, index);
            this.container.appendChild(card);
        });

        // Spustí animaci pro nově vykreslené karty
        this._triggerVisibleCards();
    }

    /* ----------------------------------------------------------
       VYTVOŘENÍ KARTY SLUŽBY
       Vrátí DOM element karty pro jednu službu

       Parametry:
         service {Object} — objekt služby ze SERVICES_CONFIG
         index   {number} — pořadí karty (pro animační zpoždění)

       Návratová hodnota:
         HTMLElement — article element karty
    ---------------------------------------------------------- */
    _createCard(service, index) {
        const card = document.createElement("article");
        card.classList.add("service-card");
        card.dataset.serviceId = service.id;

        // Zpoždění animace podle pořadí karty
        card.style.animationDelay = `${index * 0.1}s`;

        // Sestaví badge pro populární/novou službu
        const badge = this._createBadge(service);

        card.innerHTML = `
            <div class="service-card__icon" aria-hidden="true">
                ${service.icon}
            </div>

            ${badge}

            <div class="service-card__body">
                <h3 class="service-card__name">${service.name}</h3>
                <p class="service-card__description">${service.description}</p>
            </div>

            <div class="service-card__footer">
                <div class="service-card__meta">
                    <span class="service-card__duration">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        ${service.duration} min
                    </span>
                    <span class="service-card__price">${service.price} Kč</span>
                </div>

                <button
                    class="service-card__btn btn btn--primary"
                    onclick="servicesRenderer.selectService(${service.id})"
                    aria-label="Rezervovat službu ${service.name}"
                >
                    Rezervovat
                </button>
            </div>
        `;

        return card;
    }

    /* ----------------------------------------------------------
       VYTVOŘENÍ BADGE
       Vrátí HTML badge pro populární nebo novou službu

       Parametry:
         service {Object} — objekt služby

       Návratová hodnota:
         string — HTML string badge nebo prázdný string
    ---------------------------------------------------------- */
    _createBadge(service) {
        if (service.popular) {
            return `<span class="service-card__badge service-card__badge--popular">Nejoblíbenější</span>`;
        }
        if (service.isNew) {
            return `<span class="service-card__badge service-card__badge--new">Novinka</span>`;
        }
        return "";
    }

    /* ----------------------------------------------------------
       FILTROVÁNÍ PODLE KATEGORIE
       Zobrazí pouze služby z vybrané kategorie
    ---------------------------------------------------------- */
    _bindFilterButtons() {
        this.filterBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const filter = btn.dataset.filter;

                // Aktualizuje aktivní tlačítko
                this.filterBtns.forEach(b => b.classList.remove("services__filter-btn--active"));
                btn.classList.add("services__filter-btn--active");

                this.activeFilter = filter;
                this._applyFilter(filter);
            });
        });
    }

    /* ----------------------------------------------------------
       APLIKACE FILTRU
       Filtruje SERVICES_CONFIG podle kategorie a překreslí

       Parametry:
         filter {string} — kategorie nebo "all"
    ---------------------------------------------------------- */
    _applyFilter(filter) {
        let filtered;

        if (filter === "all") {
            filtered = SERVICES_CONFIG;
        } else {
            filtered = SERVICES_CONFIG.filter(s => s.category === filter);
        }

        this._render(filtered);
    }

    /* ----------------------------------------------------------
       ANIMACE KARET PŘI SCROLLU
       Použije IntersectionObserver pro plynulý nájezd karet
    ---------------------------------------------------------- */
    _bindScrollAnimation() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("service-card--visible");
                    observer.unobserve(entry.target); // animuje se jen jednou
                }
            });
        }, {
            threshold:  0.1,    // spustí se když je 10 % karty viditelné
            rootMargin: "0px 0px -50px 0px",
        });

        // Pozoruje všechny karty v kontejneru
        this._observeCards(observer);

        // Uloží observer pro použití po překreslení
        this._observer = observer;
    }

    /* ----------------------------------------------------------
       REGISTRACE KARET DO OBSERVERU
    ---------------------------------------------------------- */
    _observeCards(observer) {
        const cards = this.container.querySelectorAll(".service-card");
        cards.forEach(card => observer.observe(card));
    }

    /* ----------------------------------------------------------
       OKAMŽITÉ ZOBRAZENÍ VIDITELNÝCH KARET
       Spustí se po překreslení — zobrazí karty které jsou
       již ve viewportu bez čekání na scroll
    ---------------------------------------------------------- */
    _triggerVisibleCards() {
        if (this._observer) {
            this._observeCards(this._observer);
        }
    }

    /* ----------------------------------------------------------
       VÝBĚR SLUŽBY A PŘECHOD NA FORMULÁŘ
       Volá se po kliknutí na "Rezervovat" na kartě.
       Předvyplní select ve formuláři a scrolluje na sekci.

       Parametry:
         serviceId {number} — ID vybrané služby
    ---------------------------------------------------------- */
    selectService(serviceId) {
        // Předvyplní select ve formuláři
        const serviceSelect = document.getElementById("serviceSelect");
        if (serviceSelect) {
            serviceSelect.value = serviceId;

            // Spustí change event aby se aktualizovaly závislé prvky
            serviceSelect.dispatchEvent(new Event("change"));
        }

        // Scrolluje na sekci rezervace
        navigation.scrollToSection("rezervace");

        console.log(`✅ ServicesRenderer: vybrána služba ID ${serviceId}`);
    }
}

/* ============================================================
   GLOBÁLNÍ INSTANCE
   ============================================================ */
const servicesRenderer = new ServicesRenderer();
