/* ============================================================
   ANALYTICS SERVICE — Foot Studio Violet
   ============================================================
   Třída která sleduje všechny akce na webu a ukládá je do Firestore.
   Automaticky sbírá data o:
     - Návštěvách stránky
     - Kliknutích na sekcí a tlačítka
     - Prohlížení služeb
     - Hotových rezervacích
   ============================================================ */

class AnalyticsService {

    constructor() {
        this.initialized = false;
        this.sessionId = this._generateSessionId();
        this.sessionStartTime = new Date();
        this.pageViewTracked = false;
    }

    /* ----------------------------------------------------------
       INICIALIZACE
       Volá se z main.js po inicializaci Firebase
    ---------------------------------------------------------- */
    init() {
        try {
            this.initialized = true;

            // Zaznamenaj návštěvu stránky
            this._trackPageView();

            // Připrav event listeners
            this._setupEventListeners();

            // Zaznamenávej statistiky o sezení periodicky
            this._setupSessionTracking();

            console.log("✅ AnalyticsService: úspěšně inicializován");
        } catch (error) {
            console.error("❌ AnalyticsService: chyba při inicializaci →", error);
        }
    }

    /* ----------------------------------------------------------
       PRIVÁTNÍ FUNKCE — Generování Session ID
    ---------------------------------------------------------- */
    _generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /* ----------------------------------------------------------
       PRIVÁTNÍ FUNKCE — Náhodný User ID (anonymní)
       Uloží si ho v localStorage aby měl konzistentní ID
    ---------------------------------------------------------- */
    _getOrCreateUserId() {
        let userId = localStorage.getItem('analyticsUserId');
        if (!userId) {
            userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('analyticsUserId', userId);
        }
        return userId;
    }

    _isPrivacyPage(urlValue) {
        try {
            const url = new URL(urlValue, window.location.origin);
            return url.pathname.toLowerCase().endsWith('/privacy.html') || url.pathname.toLowerCase() === '/privacy';
        } catch (_) {
            return String(urlValue || '').toLowerCase().includes('privacy.html');
        }
    }

    _shouldTrackPageView() {
        const currentUrl = window.location.href;
        const referrer = document.referrer || '';

        // Nezapočítáváme návštěvu privacy stránky ani návrat z privacy stránky.
        if (this._isPrivacyPage(currentUrl)) return false;
        if (referrer && this._isPrivacyPage(referrer)) return false;

        return true;
    }

    /* ----------------------------------------------------------
       PRIVÁTNÍ FUNKCE — Zaznamenání návštěvy stránky
    ---------------------------------------------------------- */
    async _trackPageView() {
        if (this.pageViewTracked) return;

        if (!this._shouldTrackPageView()) {
            this.pageViewTracked = true;
            console.log('ℹ️ AnalyticsService: page_view přeskočen (privacy filtr).');
            return;
        }

        try {
            const pageViewData = {
                type: 'page_view',
                url: window.location.href,
                referrer: document.referrer || 'direct',
                userAgent: navigator.userAgent,
                sessionId: this.sessionId,
                userId: this._getOrCreateUserId(),
                timestamp: new Date(),
                locale: navigator.language || 'cs-CZ'
            };

            await firebaseService.db.collection('analytics').add(pageViewData);
            this.pageViewTracked = true;
        } catch (error) {
            console.warn("⚠️ AnalyticsService: chyba při zaznamenání page view →", error);
        }
    }

    /* ----------------------------------------------------------
       PRIVÁTNÍ FUNKCE — Nastavení event listenerů
       Sleduje kliknutí na tlačítka a navigaci
    ---------------------------------------------------------- */
    _setupEventListeners() {
        // Sleduj navigační kliknutí
        document.querySelectorAll('nav a, .navbar__cta, .btn').forEach(element => {
            element.addEventListener('click', (e) => {
                const target = e.target.closest('a, button');
                if (target) {
                    const text = target.textContent.trim();
                    const href = target.getAttribute('href') || target.getAttribute('onclick') || '';

                    this.trackEvent('button_click', {
                        text: text,
                        href: href,
                        elementClass: target.className
                    });
                }
            });
        });

        // Sleduj výběr služby
        const serviceSelect = document.getElementById('serviceSelect');
        if (serviceSelect) {
            serviceSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.trackEvent('service_selected', {
                        serviceId: e.target.value,
                        serviceName: e.target.options[e.target.selectedIndex].text
                    });
                }
            });
        }

        // Sleduj výběr dne v kalendáři
        document.addEventListener('dateSelected', (e) => {
            this.trackEvent('date_selected', {
                date: e.detail?.date || 'unknown'
            });
        });

        // Sleduj výběr času
        document.addEventListener('timeSelected', (e) => {
            this.trackEvent('time_selected', {
                time: e.detail?.time || 'unknown'
            });
        });
    }

    /* ----------------------------------------------------------
       PRIVÁTNÍ FUNKCE — Sledování sezení
       Periodicky zaznamenávej že uživatel je aktivní
    ---------------------------------------------------------- */
    _setupSessionTracking() {
        // Zaznamenávej aktivitu každých 5 minut
        setInterval(() => {
            if (this.initialized) {
                this.trackEvent('session_active', {
                    sessionDuration: Math.round((new Date() - this.sessionStartTime) / 1000) // v sekundách
                });
            }
        }, 5 * 60 * 1000); // 5 minut
    }

    /* ----------------------------------------------------------
       VEŘEJNÁ FUNKCE — Sledování vlastních eventů

       Parametry:
         eventName {string} — název eventu, např. "reservation_completed"
         data {Object} — přidaná data (volitelné)
    ---------------------------------------------------------- */
    trackEvent(eventName, data = {}) {
        if (!this.initialized) return;

        this._trackEventAsync(eventName, data).catch(error => {
            console.warn(`⚠️ AnalyticsService: chyba při zaznamenání ${eventName} →`, error);
        });
    }

    /* ----------------------------------------------------------
       PRIVÁTNÍ ASYNC FUNKCE — Uložení eventu do Firestore
    ---------------------------------------------------------- */
    async _trackEventAsync(eventName, data = {}) {
        try {
            const eventData = {
                type: eventName,
                data: data,
                sessionId: this.sessionId,
                userId: this._getOrCreateUserId(),
                timestamp: new Date(),
                url: window.location.href
            };

            await firebaseService.db.collection('analytics').add(eventData);
        } catch (error) {
            console.warn(`⚠️ AnalyticsService: nemůžu uložit event ${eventName} →`, error);
        }
    }

    /* ----------------------------------------------------------
       VEŘEJNÁ FUNKCE — Zaznamenání hotové rezervace
       Volá se ze storageService.js po úspěšném uložení

       Parametry:
         reservationData {Object} — data rezervace
    ---------------------------------------------------------- */
    trackReservationCompleted(reservationData) {
        this.trackEvent('reservation_completed', {
            reservationId: reservationData.id,
            serviceId: reservationData.serviceId,
            serviceName: reservationData.serviceName,
            date: reservationData.date,
            time: reservationData.time,
            duration: reservationData.duration,
            price: reservationData.price,
            clientEmail: this._hashEmail(reservationData.clientEmail), // Anonymizujem email
            clientName: reservationData.clientName
        });
    }

    /* ----------------------------------------------------------
       PRIVÁTNÍ FUNKCE — Anonymizace emailu
       Vracím jen hash pro privacy (GDPR friendly)
    ---------------------------------------------------------- */
    _hashEmail(email) {
        // Jednoduché hashování emailu
        let hash = 0;
        for (let i = 0; i < email.length; i++) {
            const char = email.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `email_${Math.abs(hash)}`;
    }

    /* ----------------------------------------------------------
       VEŘEJNÁ FUNKCE — Zaznamenání zobrazení služby
       Volá se když uživatel otevře detaily služby
    ---------------------------------------------------------- */
    trackServiceView(serviceId, serviceName) {
        this.trackEvent('service_viewed', {
            serviceId: serviceId,
            serviceName: serviceName
        });
    }

    /* ----------------------------------------------------------
       VEŘEJNÁ FUNKCE — Zaznamenání odeslání formuláře
    ---------------------------------------------------------- */
    trackFormSubmit(formData) {
        this.trackEvent('reservation_form_submitted', {
            hasName: !!formData.clientName,
            hasEmail: !!formData.clientEmail,
            hasPhone: !!formData.clientPhone,
            hasService: !!formData.serviceId,
            hasDate: !!formData.date,
            hasTime: !!formData.time,
            hasNote: !!formData.clientNote
        });
    }

}

/* ----------------------------------------------------------
   GLOBÁLNÍ INSTANCE
   Ostatní moduly ji používají přes `analyticsService`
   (stejně jako firebaseService, emailService, atd.)
---------------------------------------------------------- */
const analyticsService = new AnalyticsService();

