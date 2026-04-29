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
    // Escapuje HTML znaky v uživatelském vstupu — zabrání HTML injection v emailu
    _escapeHtml(value) {
        return String(value || "")
            .replace(/&/g,  "&amp;")
            .replace(/</g,  "&lt;")
            .replace(/>/g,  "&gt;")
            .replace(/"/g,  "&quot;")
            .replace(/'/g,  "&#39;");
    }

    _buildEmailParams(reservation) {
        const service = SERVICES_CONFIG.find(s => s.id === Number(reservation.serviceId));
        const serviceName = service ? service.name : String(reservation.serviceId || "");

        const dateObj = new Date(reservation.date);
        const formattedDate = dateObj.toLocaleDateString("cs-CZ", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });

        const reservationNote = String(reservation.clientNote || "").trim() || "Bez poznámky";

        // HTML email tělo — jednotný font napříč celou zprávu.
        // EmailJS šablona musí obsahovat proměnnou {{{message_html}}} (trojité závorky = neescapované HTML).
        const messageHtml = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',Arial,sans-serif;font-size:15px;line-height:1.6;color:#333333;max-width:560px;margin:0 auto;">
  <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:28px 32px;border-radius:10px 10px 0 0;">
    <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">💜 Studio Violet</h1>
    <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">Nová rezervace</p>
  </div>
  <div style="background:#ffffff;padding:28px 32px;border:1px solid #e8e8e8;border-top:none;border-radius:0 0 10px 10px;">
    <p style="margin:0 0 20px;font-size:15px;color:#555555;">Přišla nová rezervace s těmito údaji:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr>
        <td style="padding:9px 12px;background:#f7f5ff;border-radius:6px;font-weight:600;color:#764ba2;width:38%;">👤 Jméno</td>
        <td style="padding:9px 12px;color:#333333;">${this._escapeHtml(reservation.clientName)}</td>
      </tr>
      <tr>
        <td style="padding:9px 12px;font-weight:600;color:#764ba2;">📧 Email</td>
        <td style="padding:9px 12px;color:#333333;">${this._escapeHtml(reservation.clientEmail)}</td>
      </tr>
      <tr>
        <td style="padding:9px 12px;background:#f7f5ff;border-radius:6px;font-weight:600;color:#764ba2;">📞 Telefon</td>
        <td style="padding:9px 12px;background:#f7f5ff;color:#333333;">${this._escapeHtml(reservation.clientPhone)}</td>
      </tr>
      <tr>
        <td style="padding:9px 12px;font-weight:600;color:#764ba2;">💅 Služba</td>
        <td style="padding:9px 12px;color:#333333;">${this._escapeHtml(serviceName)}</td>
      </tr>
      <tr>
        <td style="padding:9px 12px;background:#f7f5ff;border-radius:6px;font-weight:600;color:#764ba2;">📅 Datum</td>
        <td style="padding:9px 12px;background:#f7f5ff;color:#333333;">${this._escapeHtml(formattedDate)}</td>
      </tr>
      <tr>
        <td style="padding:9px 12px;font-weight:600;color:#764ba2;">🕐 Čas</td>
        <td style="padding:9px 12px;color:#333333;">${this._escapeHtml(reservation.time)}</td>
      </tr>
      <tr>
        <td style="padding:9px 12px;background:#f7f5ff;border-radius:6px;font-weight:600;color:#764ba2;">📝 Poznámka</td>
        <td style="padding:9px 12px;background:#f7f5ff;color:#333333;">${this._escapeHtml(reservationNote)}</td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:#999999;text-align:center;">
      Studio Violet &nbsp;·&nbsp; ${CONTACT_CONFIG.phone} &nbsp;·&nbsp; ${CONTACT_CONFIG.email}
    </p>
  </div>
</div>`.trim();

        // Minimal payload podle aktivní EmailJS šablony.
        return {
            name: reservation.clientName,
            email: reservation.clientEmail,
            phone: reservation.clientPhone,
            service: serviceName,
            date: formattedDate,
            time: reservation.time,
            reservation_note_text: reservationNote,
            message_html: messageHtml,
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
            const payload = this._buildEmailParams(reservation);

            await emailjs.send(
                CONTACT_CONFIG.emailJS.serviceId,
                CONTACT_CONFIG.emailJS.templateIdAdmin,
                {
                    ...payload,
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
