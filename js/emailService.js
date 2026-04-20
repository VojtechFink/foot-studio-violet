/* ============================================================
   EMAIL SERVICE — Foot Studio Violet
   ============================================================
   Třída která zajišťuje odesílání emailů přes EmailJS.
   Aktuálně odesílá pouze notifikaci provozovateli salónu.
   ============================================================ */

class EmailService {

    constructor() {
        this.initialized = false;
    }

    /* ----------------------------------------------------------
       INICIALIZACE
       Volá se jednou při startu aplikace z main.js
    ---------------------------------------------------------- */
    init() {
        try {
            const { publicKey } = CONTACT_CONFIG.emailJS;

            // Inicializuje EmailJS s veřejným klíčem
            emailjs.init(publicKey);

            this.initialized = true;
            console.log("✅ EmailJS: úspěšně inicializován");

        } catch (error) {
            console.error("❌ EmailJS: chyba při inicializaci →", error);
            this.initialized = false;
        }
    }

    /* ----------------------------------------------------------
       KONTROLA INICIALIZACE
    ---------------------------------------------------------- */
    _checkInit() {
        if (!this.initialized) {
            throw new Error("EmailJS není inicializován. Zavolej nejprve init().");
        }
    }

    /* ----------------------------------------------------------
       SESTAVENÍ PARAMETRŮ EMAILU
       Interní helper — připraví společné parametry pro
       oba typy emailů z dat rezervace.

       Parametry:
         reservation {Object} — data rezervace

       Návratová hodnota:
         Object — parametry pro EmailJS šablonu
    ---------------------------------------------------------- */
    _buildEmailParams(reservation) {
        // Najde název služby podle ID
        const service = SERVICES_CONFIG.find(s => s.id === Number(reservation.serviceId));
        const serviceName = service ? service.name : reservation.serviceId;

        // Formátuje datum do čitelné podoby (např. "15. 3. 2025")
        const dateObj     = new Date(reservation.date);
        const formattedDate = dateObj.toLocaleDateString("cs-CZ", {
            day:   "numeric",
            month: "long",
            year:  "numeric",
        });

        const common = {
            // Údaje o klientce
            client_name:    reservation.clientName,
            client_email:   reservation.clientEmail,
            client_phone:   reservation.clientPhone,

            // Údaje o rezervaci
            service_name:   serviceName,
            service_price:  service ? `${service.price} Kč` : "—",
            service_duration: service ? `${service.duration} min` : "—",
            date:           formattedDate,
            time:           reservation.time,
            note:           reservation.clientNote || "Bez poznámky",

            // Údaje o salónu
            salon_name:     CONTACT_CONFIG.salonName,
            salon_address:  CONTACT_CONFIG.address,
            salon_phone:    CONTACT_CONFIG.phone,
            salon_email:    CONTACT_CONFIG.email,

            // Admin email (pro notifikaci provozovateli)
            admin_email:    CONTACT_CONFIG.emailJS.adminEmail,
        };

        // Kompatibilita s různými názvy proměnných v EmailJS šablonách.
        return {
            ...common,

            // Často používané aliasy
            name:          common.client_name,
            email:         common.client_email,
            phone:         common.client_phone,
            service:       common.service_name,
            service_name:  common.service_name,
            price:         common.service_price,
            duration:      common.service_duration,
            date:          common.date,
            time:          common.time,
            note:          common.note,

            salon:         common.salon_name,
            salon_name:    common.salon_name,
            salon_email:   common.salon_email,
            salon_phone:   common.salon_phone,
            salon_address: common.salon_address,
        };
    }

    /* ----------------------------------------------------------
       ODESLÁNÍ NOTIFIKACE PROVOZOVATELI
       Upozorní provozovatele salónu na novou rezervaci.

       Parametry:
         reservation {Object} — data rezervace

       Návratová hodnota:
         Promise<void>
    ---------------------------------------------------------- */
    async sendAdminNotification(reservation) {
        this._checkInit();

        try {
            const params = this._buildEmailParams(reservation);

            await emailjs.send(
                CONTACT_CONFIG.emailJS.serviceId,
                CONTACT_CONFIG.emailJS.templateIdAdmin,
                {
                    ...params,
                    to_email: CONTACT_CONFIG.emailJS.adminEmail,
                    recipient_email: CONTACT_CONFIG.emailJS.adminEmail,
                    reply_to: reservation.clientEmail,
                    mail_type: "admin",
                }
            );

            console.log("✅ EmailJS: notifikace odeslána provozovateli →", CONTACT_CONFIG.emailJS.adminEmail);

        } catch (error) {
            console.error("❌ EmailJS: chyba při odesílání notifikace provozovateli →", error);
            throw error;
        }
    }

    /* ----------------------------------------------------------
       ODESLÁNÍ EMAILU PRO SALÓN
       Hlavní metoda — volá se po úspěšném uložení rezervace.

       Parametry:
         reservation {Object} — data rezervace

       Návratová hodnota:
         Promise<void>
    ---------------------------------------------------------- */
    async sendAll(reservation) {
        this._checkInit();

        try {
            await this.sendAdminNotification(reservation);

            console.log("✅ EmailJS: email pro salón úspěšně odeslán");

        } catch (error) {
            // Email selhal — ale rezervace už je uložena v Firebase.
            console.warn("⚠️ EmailJS: email pro salón se nepodařilo odeslat →", error);
        }
    }
}

/* ============================================================
   GLOBÁLNÍ INSTANCE
   Přístupná ze všech ostatních JS souborů jako `emailService`
   ============================================================ */
const emailService = new EmailService();
