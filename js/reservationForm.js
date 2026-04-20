/* ============================================================
   RESERVATION FORM — Foot Studio Violet
   Rezervační formulář s výběrem služby, kalendářem a sloty.
   Služba určuje počet blokovaných hodinových slotů.
============================================================ */

class ReservationForm {

    constructor() {
        this.form           = document.getElementById("reservationForm");
        this.formMessage    = document.getElementById("formMessage");
        this.submitBtn      = document.getElementById("submitBtn");

        // Vybraná hodnota
        this.selectedDate    = null;
        this.selectedTime    = null;
        this.selectedService = null;   // ← NOVÉ: objekt služby ze SERVICES_CONFIG

        // Aktuálně zobrazený měsíc v kalendáři
        this.currentMonth   = new Date().getMonth();
        this.currentYear    = new Date().getFullYear();

        // Zabrání dvojitému odeslání
        this.isSubmitting   = false;

        // Obsazené časy (načtené z Firebase) — cache per datum
        this.bookedSlots    = {};
    }

    /* ----------------------------------------------------------
       INICIALIZACE
    ---------------------------------------------------------- */
    init() {
        if (!this.form) {
            console.warn("⚠️ ReservationForm: #reservationForm nenalezen");
            return;
        }

        this._populateServiceSelect();   // ← NOVÉ: naplní select ze SERVICES_CONFIG
        this._bindServiceSelect();       // ← NOVÉ: poslouchá změnu služby
        this._renderCalendar();
        this._bindFormSubmit();
        this._bindInputValidation();

        console.log("✅ ReservationForm: inicializován");
    }

    /* ----------------------------------------------------------
       NAPLNĚNÍ SELECTU SLUŽBAMI
       Vezme SERVICES_CONFIG a vygeneruje <option> pro každou
       dostupnou službu.
    ---------------------------------------------------------- */
    _populateServiceSelect() {
        const select = document.getElementById("serviceSelect");
        if (!select) return;

        SERVICES_CONFIG
            .filter(s => s.available)
            .forEach(service => {
                const option = document.createElement("option");
                option.value       = service.id;
                option.textContent = `${service.icon} ${service.name} — ${service.price} Kč`;
                select.appendChild(option);
            });
    }

    /* ----------------------------------------------------------
       POSLUCHAČ ZMĚNY SLUŽBY
       Při výběru služby:
         1. Uloží vybranou službu
         2. Zobrazí info (délka, cena)
         3. Překreslí časové sloty (pokud je datum vybráno)
    ---------------------------------------------------------- */
    _bindServiceSelect() {
        const select = document.getElementById("serviceSelect");
        if (!select) return;

        select.addEventListener("change", () => {
            const serviceId = Number(select.value);
            this.selectedService = SERVICES_CONFIG.find(s => s.id === serviceId) || null;
            this.selectedTime    = null;   // reset vybraného času

            this._updateServiceInfo();

            // Pokud je datum vybráno, znovu načti sloty
            if (this.selectedDate) {
                this._loadTimeSlotsForDate(this.selectedDate);
            }
        });
    }

    /* ----------------------------------------------------------
       ZOBRAZENÍ INFO O VYBRANÉ SLUŽBĚ
    ---------------------------------------------------------- */
    _updateServiceInfo() {
        const box      = document.getElementById("selectedServiceInfo");
        const duration = document.getElementById("serviceInfoDuration");
        const price    = document.getElementById("serviceInfoPrice");
        const note     = document.getElementById("serviceInfoNote");

        if (!box) return;

        if (!this.selectedService) {
            box.style.display = "none";
            return;
        }

        const slots     = this._slotsNeeded(this.selectedService.duration);
        const hoursText = slots === 1 ? "1 hodina" : `${slots} hodiny`;

        duration.textContent = `${this.selectedService.duration} min`;
        price.textContent    = `${this.selectedService.price} Kč`;
        note.textContent     = slots > 1
            ? `(zabere ${hoursText} v kalendáři)`
            : "";

        box.style.display = "flex";
    }

    /* ----------------------------------------------------------
       POMOCNÁ FUNKCE — kolik hodinových slotů služba zabere

       Parametry:
         durationMinutes {number} — délka služby v minutách

       Návratová hodnota:
         number — počet slotů (vždy zaokrouhleno nahoru)
    ---------------------------------------------------------- */
    _slotsNeeded(durationMinutes) {
        return Math.ceil(durationMinutes / 60);
    }

    /* ----------------------------------------------------------
       VYKRESLENÍ KALENDÁŘE
    ---------------------------------------------------------- */
    _renderCalendar() {
        const container = document.getElementById("calendarContainer");
        if (!container) return;

        const year  = this.currentYear;
        const month = this.currentMonth;

        const firstDay     = new Date(year, month, 1).getDay();
        const daysInMonth  = new Date(year, month + 1, 0).getDate();
        const today        = new Date();
        today.setHours(0, 0, 0, 0);

        // Rezervace lze vytvorit nejdrive na nasledujici den.
        const minDate = new Date(today);
        minDate.setDate(minDate.getDate() + 1);

        // Pondělí jako první den (0=Po, 6=Ne)
        const startOffset = (firstDay === 0) ? 6 : firstDay - 1;

        const monthNames = [
            "Leden","Únor","Březen","Duben","Květen","Červen",
            "Červenec","Srpen","Září","Říjen","Listopad","Prosinec"
        ];

        let html = `
            <div class="calendar">
                <div class="calendar__header">
                    <button class="calendar__nav" id="calPrev" aria-label="Předchozí měsíc">‹</button>
                    <span class="calendar__month-label">${monthNames[month]} ${year}</span>
                    <button class="calendar__nav" id="calNext" aria-label="Následující měsíc">›</button>
                </div>
                <div class="calendar__weekdays">
                    <span>Po</span><span>Út</span><span>St</span>
                    <span>Čt</span><span>Pá</span><span>So</span><span>Ne</span>
                </div>
                <div class="calendar__days">
        `;

        // Prázdné buňky před prvním dnem
        for (let i = 0; i < startOffset; i++) {
            html += `<span class="calendar__day calendar__day--empty"></span>`;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date    = new Date(year, month, day);
            const dateStr = this._formatDate(date);
            const dow     = date.getDay(); // 0=Ne, 6=So

            const isPastOrToday = date < minDate;
            const isWeekend  = dow === 0 || dow === 6;
            const isSelected = dateStr === this.selectedDate;

            let cls = "calendar__day";
            if (isPastOrToday || isWeekend) cls += " calendar__day--disabled";
            else                      cls += " calendar__day--available";
            if (isSelected)           cls += " calendar__day--selected";

            const disabled = (isPastOrToday || isWeekend) ? "disabled" : "";

            html += `
                <button class="${cls}"
                        data-date="${dateStr}"
                        ${disabled}
                        aria-label="${day}. ${monthNames[month]} ${year}"
                        aria-pressed="${isSelected}">
                    ${day}
                </button>
            `;
        }

        html += `</div></div>`;
        container.innerHTML = html;

        // Navigace měsíců
        document.getElementById("calPrev")?.addEventListener("click", () => {
            this.currentMonth--;
            if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
            this._renderCalendar();
        });
        document.getElementById("calNext")?.addEventListener("click", () => {
            this.currentMonth++;
            if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
            this._renderCalendar();
        });

        // Kliknutí na den
        container.querySelectorAll(".calendar__day--available").forEach(btn => {
            btn.addEventListener("click", () => {
                this.selectedDate = btn.dataset.date;
                this.selectedTime = null;
                this._renderCalendar();
                this._loadTimeSlotsForDate(this.selectedDate);
            });
        });
    }

    /* ----------------------------------------------------------
       NAČTENÍ SLOTŮ PRO DATUM
       Načte obsazené časy z Firebase a překreslí sloty.
    ---------------------------------------------------------- */
    async _loadTimeSlotsForDate(date) {
        const container = document.getElementById("timeSlotsContainer");
        if (!container) return;

        // Pokud není vybrána služba, upozorni uživatele
        if (!this.selectedService) {
            container.innerHTML = `
                <p class="time-slots__hint">Nejprve vyberte službu.</p>
            `;
            return;
        }

        container.innerHTML = `<p class="time-slots__hint">Načítám dostupné časy…</p>`;

        try {
            const bookedTimes = await storageService.getBookedTimes(date);
            this._renderTimeSlots(bookedTimes);
        } catch (error) {
            console.error("❌ ReservationForm: chyba při načítání časů →", error);
            container.innerHTML = `
                <p class="time-slots__error">
                    Nepodařilo se načíst časy. Zkuste to prosím znovu.
                </p>
            `;
        }
    }

    /* ----------------------------------------------------------
       VYKRESLENÍ ČASOVÝCH SLOTŮ
       Zobrazí pouze časy kde je dost volných slotů za sebou.

       Parametry:
         bookedTimes {string[]} — obsazené časy ["08:00", "09:00", …]
    ---------------------------------------------------------- */
    _renderTimeSlots(bookedTimes) {
        const container = document.getElementById("timeSlotsContainer");
        if (!container) return;

        const slotsNeeded = this._slotsNeeded(this.selectedService.duration);

        // Všechny hodinové sloty 8:00–16:00
        const allSlots = [];
        for (let h = OPENING_HOURS.firstSlot; h <= OPENING_HOURS.lastSlot; h++) {
            allSlots.push(`${String(h).padStart(2, "0")}:00`);
        }

        // Zjistí které časy jsou dostupné — musí být volných N slotů za sebou
        const availableSlots = allSlots.filter((slot, index) => {
            // Zkontroluje zda je dost slotů za sebou (včetně tohoto)
            for (let i = 0; i < slotsNeeded; i++) {
                const checkSlot = allSlots[index + i];
                if (!checkSlot) return false;                    // přesahuje konec dne
                if (bookedTimes.includes(checkSlot)) return false; // obsazeno
            }
            return true;
        });

        if (availableSlots.length === 0) {
            container.innerHTML = `
                <p class="time-slots__hint">
                    Pro tento den nejsou dostupné žádné termíny pro zvolenou službu.
                    Zkuste jiný den.
                </p>
            `;
            return;
        }

        const grid = document.createElement("div");
        grid.className = "time-slots__grid";

        allSlots.forEach(slot => {
            const btn = document.createElement("button");
            btn.type        = "button";
            btn.textContent = slot;
            btn.dataset.time = slot;

            if (bookedTimes.includes(slot)) {
                btn.className = "time-slot time-slot--booked";
                btn.disabled  = true;
                btn.setAttribute("aria-label", `${slot} — obsazeno`);
            } else if (availableSlots.includes(slot)) {
                btn.className = "time-slot time-slot--free";
                btn.setAttribute("aria-label", `${slot} — dostupné`);
                btn.setAttribute("aria-pressed", "false");
                btn.addEventListener("click", () => this._selectTime(slot, btn));
            } else {
                // Slot je volný, ale nestačí místo pro celou službu
                btn.className = "time-slot time-slot--insufficient";
                btn.disabled  = true;
                btn.setAttribute("aria-label", `${slot} — nedostatek času pro zvolenou službu`);
            }

            grid.appendChild(btn);
        });

        container.innerHTML = "";
        container.appendChild(grid);
    }

    /* ----------------------------------------------------------
       VÝBĚR ČASU
    ---------------------------------------------------------- */
    _selectTime(time, btn) {
        document.querySelectorAll(".time-slot--selected").forEach(el => {
            el.classList.remove("time-slot--selected");
            el.setAttribute("aria-pressed", "false");
        });

        btn.classList.add("time-slot--selected");
        btn.setAttribute("aria-pressed", "true");

        this.selectedTime = time;
        console.log(`🕐 ReservationForm: vybrán čas → ${time}`);
    }

    /* ----------------------------------------------------------
       LIVE VALIDACE POLÍ
    ---------------------------------------------------------- */
    _bindInputValidation() {
        const inputs = this.form.querySelectorAll("input");
        inputs.forEach(input => {
            input.addEventListener("blur", () => {
                if (input.required && !input.value.trim()) {
                    this._showFieldError(input, "Toto pole je povinné.");
                } else {
                    this._clearFieldError(input);
                }
            });
        });
    }

    /* ----------------------------------------------------------
       VALIDACE POLE
    ---------------------------------------------------------- */
    _validateField(field) {
        let error = "";

        switch (field.id) {
            case "clientName":
                if (field.value.trim().length < 2) {
                    error = "Zadejte celé jméno.";
                }
                break;

            case "clientEmail":
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim())) {
                    error = "Zadejte platnou e-mailovou adresu.";
                }
                break;

            case "clientPhone":
                if (!/^[+]?[\d\s\-()]{9,15}$/.test(field.value.trim())) {
                    error = "Zadejte platné telefonní číslo.";
                }
                break;
        }

        if (error) this._showFieldError(field, error);
    }

    _showFieldError(field, message) {
        this._clearFieldError(field);
        field.classList.add("input--error");
        const el = document.createElement("span");
        el.classList.add("field-error");
        el.textContent = message;
        el.setAttribute("role", "alert");
        field.parentNode.appendChild(el);
    }

    _clearFieldError(field) {
        field.classList.remove("input--error");
        field.parentNode.querySelector(".field-error")?.remove();
    }

    /* ----------------------------------------------------------
       ODESLÁNÍ FORMULÁŘE
    ---------------------------------------------------------- */
    _bindFormSubmit() {
        this.form.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (this.isSubmitting) return;

            // Validace výběrů
            if (!this.selectedService) {
                this._showMessage("Vyberte prosím službu.", "error");
                return;
            }
            if (!this.selectedDate) {
                this._showMessage("Vyberte prosím den rezervace.", "error");
                return;
            }
            if (!this.selectedTime) {
                this._showMessage("Vyberte prosím čas rezervace.", "error");
                return;
            }

            const formData = {
            clientName:  document.getElementById("clientName")?.value.trim()  || "",
            clientEmail: document.getElementById("clientEmail")?.value.trim() || "",   // ← PŘIDAT
            clientPhone: document.getElementById("clientPhone")?.value.trim() || "",
            serviceId:   this.selectedService?.id || null,
            date:        this.selectedDate,
            time:        this.selectedTime,
            clientNote:  document.getElementById("clientNote")?.value.trim()  || "",
            };

            await this._submitReservation(formData);
        });
    }

    /* ----------------------------------------------------------
       VÝPOČET VŠECH SLOTŮ KTERÉ REZERVACE ZABERE
       Vrátí pole časů které budou označeny jako obsazené.

       Příklad: služba 90 min od 10:00 → ["10:00", "11:00"]
    ---------------------------------------------------------- */
    _getBookedSlotsForReservation() {
        const slotsNeeded = this._slotsNeeded(this.selectedService.duration);
        const startHour   = parseInt(this.selectedTime.split(":")[0], 10);
        const slots       = [];

        for (let i = 0; i < slotsNeeded; i++) {
            const h = startHour + i;
            slots.push(`${String(h).padStart(2, "0")}:00`);
        }

        return slots;
    }

    /* ----------------------------------------------------------
       ZPRACOVÁNÍ ODESLÁNÍ
    ---------------------------------------------------------- */
    async _submitReservation(formData) {
        this.isSubmitting = true;
        this._setLoadingState(true);
        this._hideMessage();

        try {
            const result = await storageService.saveReservation(formData);

            if (result.success) {
                this._showMessage(result.message, "success");
                this._resetForm();
            } else {
                this._showMessage(result.message, "error");
            }

        } catch (error) {
            console.error("❌ ReservationForm: neočekávaná chyba →", error);
            this._showMessage(
                "Omlouváme se, došlo k neočekávané chybě. Zkuste to prosím znovu.",
                "error"
            );
        } finally {
            this.isSubmitting  = false;
            this._setLoadingState(false);
        }
    }

    /* ----------------------------------------------------------
       STAV NAČÍTÁNÍ TLAČÍTKA
    ---------------------------------------------------------- */
    _setLoadingState(loading) {
        if (!this.submitBtn) return;
        if (loading) {
            this.submitBtn.disabled  = true;
            this.submitBtn.dataset.originalText = this.submitBtn.textContent;
            this.submitBtn.innerHTML = `<span class="spinner" aria-hidden="true"></span> Odesílám…`;
        } else {
            this.submitBtn.disabled    = false;
            this.submitBtn.textContent = this.submitBtn.dataset.originalText || "Rezervovat";
        }
    }

    /* ----------------------------------------------------------
       ZPRÁVY POD FORMULÁŘEM
    ---------------------------------------------------------- */
    _showMessage(message, type) {
        if (!this.formMessage) return;
        this.formMessage.textContent = message;
        this.formMessage.className   = `form-message form-message--${type}`;
        this.formMessage.setAttribute("role", "alert");
        this.formMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    _hideMessage() {
        if (!this.formMessage) return;
        this.formMessage.textContent = "";
        this.formMessage.className   = "form-message";
    }

    /* ----------------------------------------------------------
       RESET FORMULÁŘE
    ---------------------------------------------------------- */
    _resetForm() {
        this.form.reset();
        this.selectedDate    = null;
        this.selectedTime    = null;
        this.selectedService = null;

        this._updateServiceInfo();
        this._renderCalendar();

        const timeCont = document.getElementById("timeSlotsContainer");
        if (timeCont) {
            timeCont.innerHTML = `<p class="time-slots__hint">Nejprve vyberte službu a den.</p>`;
        }
    }

    /* ----------------------------------------------------------
       POMOCNÁ FUNKCE — formátování data → "YYYY-MM-DD"
    ---------------------------------------------------------- */
    _formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

}

/* ============================================================
   GLOBÁLNÍ INSTANCE
============================================================ */
const reservationForm = new ReservationForm();
