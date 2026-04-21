/* ============================================================
   STORAGE SERVICE — Foot Studio Violet
   ============================================================
   Třída která propojuje Firebase a Email služby dohromady.
   Stará se o:
     - Uložení rezervace do Firebase
     - Odeslání emailů přes EmailJS
     - Výpočet obsazených časů pro daný den
     - Validaci dat před uložením
   ============================================================ */

class StorageService {

    constructor() {
        this.initialized = false;
    }

    /* ----------------------------------------------------------
       INICIALIZACE
       Volá se z main.js po inicializaci Firebase a EmailJS
    ---------------------------------------------------------- */
    init() {
        this.initialized = true;
        console.log("✅ StorageService: úspěšně inicializován");
    }

    /* ----------------------------------------------------------
       VALIDACE DAT REZERVACE
       Zkontroluje že všechna povinná pole jsou vyplněna
       a mají správný formát.

       Parametry:
         data {Object} — data z formuláře

       Návratová hodnota:
         Object — { valid: bool, errors: string[] }
    ---------------------------------------------------------- */
    validateReservation(data) {
        const errors = [];

        // Jméno
        if (!data.clientName || data.clientName.trim().length < 2) {
            errors.push("Jméno musí mít alespoň 2 znaky.");
        }

        // Email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!data.clientEmail || !emailRegex.test(data.clientEmail)) {
            errors.push("Zadejte platnou e-mailovou adresu.");
        }

        // Telefon
        const phoneRegex = /^[+]?[\d\s\-()]{9,15}$/;
        if (!data.clientPhone || !phoneRegex.test(data.clientPhone)) {
            errors.push("Zadejte platné telefonní číslo.");
        }

        // Služba
        if (!data.serviceId) {
            errors.push("Vyberte prosím službu.");
        }

        // Datum
        if (!data.date) {
            errors.push("Vyberte prosím datum.");
        } else {
            const selectedDate = new Date(data.date);
            const minDate      = new Date();
            minDate.setHours(0, 0, 0, 0);
            minDate.setDate(minDate.getDate() + 1);

            if (selectedDate < minDate) {
                errors.push("První možný termín rezervace je od zítřka.");
            }
        }

        // Čas
        if (!data.time) {
            errors.push("Vyberte prosím čas.");
        }

        // GDPR souhlas
        if (data.privacyConsent !== true) {
            errors.push("Pro odeslání rezervace je nutný souhlas se zpracováním osobních údajů.");
        }

        return {
            valid:  errors.length === 0,
            errors: errors,
        };
    }

    /* ----------------------------------------------------------
       ZÍSKÁNÍ OBSAZENÝCH ČASŮ PRO DATUM
       Načte z Firebase všechny rezervace pro daný den
       a vrátí pole obsazených časových slotů.

       Parametry:
         date {string} — datum ve formátu "YYYY-MM-DD"

       Návratová hodnota:
         Promise<string[]> — pole obsazených časů, např. ["09:00", "10:30"]
    ---------------------------------------------------------- */
    async getBookedTimes(date) {
    try {
        const reservations = await firebaseService.getReservationsByDate(date);

        // Sbírá všechny blokované sloty ze všech rezervací
        const bookedTimes = [];
        reservations.forEach(r => {
            if (Array.isArray(r.bookedSlots)) {
                // Nový formát — více slotů
                bookedTimes.push(...r.bookedSlots);
            } else if (r.time) {
                // Zpětná kompatibilita se starými rezervacemi
                bookedTimes.push(r.time);
            }
        });

        console.log(`✅ StorageService: obsazené časy pro ${date} →`, bookedTimes);
        return bookedTimes;

    } catch (error) {
        console.error("❌ StorageService: chyba při načítání obsazených časů →", error);
        return [];
    }
}

    /* ----------------------------------------------------------
       SYNC REZERVACE DO KALENDÁŘE (WEBHOOK)
       Odesílá rezervaci na externí webhook (Google Apps Script).
       Při chybě pouze loguje, neblokuje úspěch rezervace.

       Parametry:
         reservationData {Object} — data rezervace včetně id

       Návratová hodnota:
         Promise<Object> — { attempted: bool, success?: bool, ... }
    ---------------------------------------------------------- */
    async syncReservationToCalendar(reservationData) {
        const cfg = CONTACT_CONFIG.calendarWebhook;

        if (!cfg || !cfg.enabled || !cfg.url) {
            return { attempted: false, reason: "disabled" };
        }

        const service = SERVICES_CONFIG.find(s => s.id === Number(reservationData.serviceId));
        const serviceDurationMin = service ? service.duration : 60;

        const startIso = `${reservationData.date}T${reservationData.time}:00`;
        const payload = {
            version: "1.0",
            action: "reservation.created",
            reservationId: reservationData.id,
            salonName: CONTACT_CONFIG.salonName,
            timezone: cfg.timezone || "Europe/Prague",
            reservation: {
                id: reservationData.id,
                clientName: reservationData.clientName,
                clientEmail: reservationData.clientEmail,
                clientPhone: reservationData.clientPhone,
                serviceId: Number(reservationData.serviceId),
                serviceName: service ? service.name : String(reservationData.serviceId),
                durationMinutes: serviceDurationMin,
                date: reservationData.date,
                time: reservationData.time,
                startIso,
                note: reservationData.clientNote || "",
            },
        };

        const timeoutMs = Number(cfg.timeoutMs) || 8000;
        const corsMode = cfg.corsMode || "no-cors";
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(cfg.url, {
                method: "POST",
                // text/plain + no-cors zabrani preflightu proti Apps Script endpointu
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload),
                signal: controller.signal,
                mode: corsMode,
            });

            clearTimeout(timeout);

            if (response.type === "opaque") {
                // no-cors: browser neumi precist status ani body, request byl pouze odeslan.
                console.warn("⚠️ StorageService: kalendář sync odeslán (no-cors), ale výsledek nelze ověřit");
                return { attempted: true, success: null, opaque: true };
            }

            if (!response.ok) {
                throw new Error(`Webhook returned HTTP ${response.status}`);
            }

            // Apps Script bezne vraci HTTP 200 i pri chybe v logice,
            // proto kontrolujeme i obsah odpovedi.
            let responseData = null;
            try {
                responseData = await response.json();
            } catch (_) {
                // Pokud JSON nejde parsovat, bereme to jako selhani webhooku.
                throw new Error("Webhook response is not valid JSON");
            }

            if (!responseData || responseData.ok !== true) {
                const detail = responseData && responseData.error ? responseData.error : "Unknown webhook error";
                throw new Error(`Webhook logical error: ${detail}`);
            }

            console.log("✅ StorageService: kalendář sync úspěšný", responseData);
            return { attempted: true, success: true, response: responseData };

        } catch (error) {
            clearTimeout(timeout);
            console.warn("⚠️ StorageService: kalendář sync selhal →", error);
            return { attempted: true, success: false, error: String(error) };
        }
    }

    /* ----------------------------------------------------------
       GENEROVÁNÍ DOSTUPNÝCH ČASŮ
       Vytvoří seznam všech časových slotů pro daný den
       a odfiltruje již obsazené.

       Parametry:
         date       {string}   — datum ve formátu "YYYY-MM-DD"
         bookedTimes {string[]} — pole obsazených časů

       Návratová hodnota:
         string[] — pole dostupných časů, např. ["08:00", "08:30", ...]
    ---------------------------------------------------------- */
    generateAvailableTimes(date, bookedTimes = []) {
        const { start, end } = CONTACT_CONFIG.reservationHours;
        const availableTimes = [];

        // Zkontroluje zda vybraný den není zavřeno
        const dayNames = [
            "sunday", "monday", "tuesday", "wednesday",
            "thursday", "friday", "saturday"
        ];
        const dayOfWeek  = new Date(date).getDay();
        const dayName    = dayNames[dayOfWeek];
        const dayHours   = CONTACT_CONFIG.openingHours[dayName];

        if (!dayHours) {
            // Salón je v tento den zavřen
            console.log(`ℹ️ StorageService: salón je ${dayName} zavřen`);
            return [];
        }

        // Generuje sloty po 30 minutách
        for (let hour = start; hour <= end; hour++) {
            for (let minute of [0, 30]) {
                // Přeskočí časy po konci rezervačních hodin
                if (hour === end && minute > 0) break;

                const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

                // Přidá pouze pokud není obsazený
                if (!bookedTimes.includes(timeStr)) {
                    availableTimes.push(timeStr);
                }
            }
        }

        return availableTimes;
    }

    /* ----------------------------------------------------------
       ULOŽENÍ REZERVACE
       Hlavní metoda — validuje data, uloží do Firebase
       a odešle emaily.

       Parametry:
         formData {Object} — surová data z formuláře

       Návratová hodnota:
         Promise<Object> — { success: bool, message: string, id?: string }
    ---------------------------------------------------------- */
    async saveReservation(formData) {

        // 1. Validace
        const validation = this.validateReservation(formData);
        if (!validation.valid) {
            return {
                success: false,
                message: validation.errors.join(" "),
            };
        }

        // 2. Připraví čistá data pro uložení
        const selectedService = SERVICES_CONFIG.find(s => s.id === Number(formData.serviceId));
        const durationMinutes = selectedService ? selectedService.duration : 60;
        const slotsNeeded = Math.ceil(durationMinutes / 60);
        const startHour = Number(String(formData.time).split(":")[0]);
        const bookedSlots = Array.from({ length: slotsNeeded }, (_, i) => {
            const h = startHour + i;
            return `${String(h).padStart(2, "0")}:00`;
        });

        const reservationData = {
            clientName:  formData.clientName.trim(),
            clientEmail: formData.clientEmail.trim().toLowerCase(),
            clientPhone: formData.clientPhone.trim(),
            serviceId:   Number(formData.serviceId),
            date:        formData.date,
            time:        formData.time,
            clientNote:  formData.clientNote ? formData.clientNote.trim() : "",
            privacyConsent: true,
            privacyConsentAt: formData.privacyConsentAt || new Date().toISOString(),
            bookedSlots: bookedSlots,
        };

         try {
             // 3. Uloží do Firebase
             const reservationId = await firebaseService.saveReservation(reservationData);

             // 4. Zaznamenání do analytiky
             const selectedService = SERVICES_CONFIG.find(s => s.id === Number(formData.serviceId));
             analyticsService.trackReservationCompleted({
                 id: reservationId,
                 serviceId: formData.serviceId,
                 serviceName: selectedService ? selectedService.name : 'Neznámá služba',
                 date: formData.date,
                 time: formData.time,
                 duration: selectedService ? selectedService.duration : 60,
                 price: selectedService ? selectedService.price : 0,
                 clientEmail: reservationData.clientEmail,
                 clientName: reservationData.clientName
             });

             // 5. Odešle emaily (chyba emailu neblokuje úspěch rezervace)
             await emailService.sendAll({
                 ...reservationData,
                 id: reservationId,
             });

             // 6. Volitelný sync do kalendáře (neblokuje úspěch rezervace)
             await this.syncReservationToCalendar({
                 ...reservationData,
                 id: reservationId,
             });

             console.log("✅ StorageService: rezervace kompletně zpracována, ID →", reservationId);

             return {
                 success: true,
                 message: `Děkujeme, ${reservationData.clientName.split(" ")[0]}! Vaše rezervace byla přijata. Brzy vás budeme kontaktovat s potvrzením termínu.`,
                 id:      reservationId,
             };

         } catch (error) {
             console.error("❌ StorageService: chyba při ukládání rezervace →", error);

             return {
                 success: false,
                message: "Omlouváme se, při zpracování rezervace došlo k chybě. Zkuste to prosím znovu nebo nás kontaktujte telefonicky.",
            };
        }
    }

    /* ----------------------------------------------------------
       NAČTENÍ VŠECH REZERVACÍ (pro admin panel)

       Návratová hodnota:
         Promise<Array> — pole všech rezervací
    ---------------------------------------------------------- */
    async getAllReservations() {
        try {
            return await firebaseService.getAllReservations();
        } catch (error) {
            console.error("❌ StorageService: chyba při načítání rezervací →", error);
            return [];
        }
    }

    /* ----------------------------------------------------------
       AKTUALIZACE STAVU REZERVACE (pro admin panel)

       Parametry:
         id     {string} — ID rezervace
         status {string} — nový stav
    ---------------------------------------------------------- */
    async updateStatus(id, status) {
        try {
            await firebaseService.updateReservationStatus(id, status);
            return { success: true };
        } catch (error) {
            console.error("❌ StorageService: chyba při aktualizaci stavu →", error);
            return { success: false };
        }
    }

    /* ----------------------------------------------------------
       SMAZÁNÍ REZERVACE (pro admin panel)

       Parametry:
         id {string} — ID rezervace
    ---------------------------------------------------------- */
    async deleteReservation(id) {
        try {
            await firebaseService.deleteReservation(id);
            return { success: true };
        } catch (error) {
            console.error("❌ StorageService: chyba při mazání rezervace →", error);
            return { success: false };
        }
    }
}

/* ============================================================
   GLOBÁLNÍ INSTANCE
   Přístupná ze všech ostatních JS souborů jako `storageService`
   ============================================================ */
const storageService = new StorageService();
