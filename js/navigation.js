/* ============================================================
   NAVIGATION — Foot Studio Violet
   ============================================================
   Stará se o veškeré chování navigační lišty:
     - Změna vzhledu při scrollování
     - Plynulý scroll na sekce
     - Hamburger menu pro mobilní zařízení
     - Zvýraznění aktivní sekce při scrollu
   ============================================================ */

class Navigation {

    constructor() {
        // Reference na DOM elementy
        this.navbar     = document.getElementById("navbar");
        this.navLinks   = document.getElementById("navLinks");
        this.hamburger  = document.getElementById("hamburger");

        // Příznak zda je mobilní menu otevřené
        this.menuOpen   = false;

        // Práh scrollu kdy se navbar "zbarví" (v px)
        this.scrollThreshold = 80;
    }

    /* ----------------------------------------------------------
       INICIALIZACE
       Volá se z main.js při startu aplikace
    ---------------------------------------------------------- */
    init() {
        this._bindScrollEvent();
        this._bindClickOutside();
        this._setMinDate();
        console.log("✅ Navigation: úspěšně inicializována");
    }

    /* ----------------------------------------------------------
       SCROLL UDÁLOST
       Při scrollu přidá/odebere třídu .navbar--scrolled
       a zvýrazní aktivní sekci v navigaci
    ---------------------------------------------------------- */
    _bindScrollEvent() {
        window.addEventListener("scroll", () => {
            this._handleNavbarScroll();
            this._highlightActiveSection();
        }, { passive: true }); // passive = lepší výkon
    }

    /* ----------------------------------------------------------
       ZMĚNA VZHLEDU NAVBARU PŘI SCROLLU
    ---------------------------------------------------------- */
    _handleNavbarScroll() {
        if (!this.navbar) return;

        if (window.scrollY > this.scrollThreshold) {
            this.navbar.classList.add("navbar--scrolled");
        } else {
            this.navbar.classList.remove("navbar--scrolled");
        }
    }

    /* ----------------------------------------------------------
       ZVÝRAZNĚNÍ AKTIVNÍ SEKCE
       Sleduje která sekce je právě ve viewportu
       a přidá třídu .active na odpovídající odkaz v navigaci
    ---------------------------------------------------------- */
    _highlightActiveSection() {
        const sections = document.querySelectorAll("section[id]");
        const navAnchors = document.querySelectorAll(".navbar__links a");

        let currentSectionId = "";

        sections.forEach(section => {
            const sectionTop    = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;

            if (window.scrollY >= sectionTop &&
                window.scrollY < sectionTop + sectionHeight) {
                currentSectionId = section.getAttribute("id");
            }
        });

        // Aktualizuje třídu .active na odkazech
        navAnchors.forEach(anchor => {
            anchor.classList.remove("active");
            if (anchor.getAttribute("href") === `#${currentSectionId}`) {
                anchor.classList.add("active");
            }
        });
    }

    /* ----------------------------------------------------------
       ZAVŘENÍ MENU PŘI KLIKNUTÍ VEN
       Kliknutí mimo navbar zavře mobilní menu
    ---------------------------------------------------------- */
    _bindClickOutside() {
        document.addEventListener("click", (event) => {
            if (!this.menuOpen) return;

            const clickedInsideNav = this.navbar && this.navbar.contains(event.target);
            if (!clickedInsideNav) {
                this.closeMenu();
            }
        });
    }

    /* ----------------------------------------------------------
       NASTAVENÍ MINIMÁLNÍHO DATUMU V REZERVAČNÍM FORMULÁŘI
       Zabrání výběru datumů v minulosti
    ---------------------------------------------------------- */
    _setMinDate() {
        const dateInput = document.getElementById("reservationDate");
        if (!dateInput) return;

        const today = new Date();
        const yyyy  = today.getFullYear();
        const mm    = String(today.getMonth() + 1).padStart(2, "0");
        const dd    = String(today.getDate()).padStart(2, "0");

        dateInput.min = `${yyyy}-${mm}-${dd}`;
    }

    /* ----------------------------------------------------------
       PLYNULÝ SCROLL NA SEKCI
       Volá se z HTML onclick atributů: scrollToSection('sluzby')

       Parametry:
         sectionId {string} — ID sekce bez #
    ---------------------------------------------------------- */
    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) return;

        // Výška navbaru pro offset
        const navbarHeight = this.navbar ? this.navbar.offsetHeight : 70;
        const targetY      = section.offsetTop - navbarHeight;

        window.scrollTo({
            top:      targetY,
            behavior: "smooth",
        });
    }

    /* ----------------------------------------------------------
       PŘEPNUTÍ HAMBURGER MENU (mobil)
    ---------------------------------------------------------- */
    toggleMenu() {
        if (this.menuOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    /* ----------------------------------------------------------
       OTEVŘENÍ MENU
    ---------------------------------------------------------- */
    openMenu() {
        this.menuOpen = true;

        if (this.navLinks)  this.navLinks.classList.add("navbar__links--open");
        if (this.hamburger) this.hamburger.classList.add("navbar__hamburger--open");
    }

    /* ----------------------------------------------------------
       ZAVŘENÍ MENU
    ---------------------------------------------------------- */
    closeMenu() {
        this.menuOpen = false;

        if (this.navLinks)  this.navLinks.classList.remove("navbar__links--open");
        if (this.hamburger) this.hamburger.classList.remove("navbar__hamburger--open");
    }
}

/* ============================================================
   GLOBÁLNÍ INSTANCE
   ============================================================ */
const navigation = new Navigation();

/* ============================================================
   GLOBÁLNÍ POMOCNÉ FUNKCE
   Volány přímo z HTML onclick atributů v index.html
   ============================================================ */

function scrollToSection(sectionId) {
    navigation.scrollToSection(sectionId);
}

function toggleMenu() {
    navigation.toggleMenu();
}

function closeMenu() {
    navigation.closeMenu();
}
