/**
 * ============================================================
 *  Google Apps Script — Calendar Webhook
 *  Studio Violet  |  v2
 * ============================================================
 *
 *  NASAZENI:
 *  1. Otevri script.google.com → projekt (nebo novy)
 *  2. Nahrad VESKER stary kod timto souborem
 *  3. Nastaveni projektu (ozubene kolo) → Casove pasmo → Europe/Prague
 *  4. Nasadit → Nové nasazení → Typ: Webová aplikace
 *       Spustit jako:  Já (vlastník)
 *       Kdo ma pristup: Kdokoliv
 *  5. Zkopiruj URL → vloz do contacts.js → calendarWebhook.url
 *
 *  KALENDAR ID:
 *  Google Calendar → ozubene kolo u kalendare → Nastaveni
 *  → sekce "ID kalendare" (napr. xxx@group.calendar.google.com)
 *  Pro hlavni/primarni kalendar pouzij hodnotu 'primary'.
 * ============================================================
 */

// ← ZDE ZMEN NA SVE ID KALENDARE
var CALENDAR_ID = 'primary';

var RESERVATION_ID_PREFIX = 'ReservationID:';

/* ----------------------------------------------------------
   HLAVNI HANDLER — POST
---------------------------------------------------------- */
function doPost(e) {
  try {
    var raw  = (e && e.postData) ? e.postData.contents : '{}';
    var data = JSON.parse(raw);
    Logger.log('doPost action=' + data.action + ' reservationId=' + data.reservationId);

    if (data.action === 'reservation.created') {
      return handleCreate(data);
    }
    if (data.action === 'reservation.cancelled') {
      return handleCancel(data);
    }
    return jsonOk({ warning: 'Unknown action: ' + data.action });

  } catch (err) {
    Logger.log('doPost ERROR: ' + err);
    return jsonErr(err.toString());
  }
}

/* ----------------------------------------------------------
   TEST ENDPOINT — GET
---------------------------------------------------------- */
function doGet() {
  return jsonOk({ message: 'Webhook OK', calendarId: CALENDAR_ID });
}

/* ----------------------------------------------------------
   VYTVORENI UDALOSTI
---------------------------------------------------------- */
function handleCreate(data) {
  var r = data.reservation;
  if (!r || !r.id) return jsonErr('Missing reservation.id');

  var cal = getCalendar();
  if (!cal) return jsonErr('Calendar not found: ' + CALENDAR_ID);

  var start    = parseDateTime(r.date, r.time);
  var duration = parseInt(r.durationMinutes, 10) || 60;
  var end      = new Date(start.getTime() + duration * 60000);

  // Ochrana proti duplicitam — hledame dle ID v sirdem okne (cely den)
  var existing = findById(cal, r.id, start);
  if (existing) {
    Logger.log('Duplicate skipped for ' + r.id);
    return jsonOk({ duplicate: true, eventId: existing.getId() });
  }

  var title = (r.serviceName || 'Rezervace') + ' — ' + (r.clientName || '');
  var desc  = buildDescription(r, duration);

  var ev = cal.createEvent(title, start, end, { description: desc });
  Logger.log('Created event ' + ev.getId() + ' for reservation ' + r.id);
  return jsonOk({ created: true, eventId: ev.getId() });
}

/* ----------------------------------------------------------
   ZRUSENI / SMAZANI UDALOSTI
---------------------------------------------------------- */
function handleCancel(data) {
  var r = data.reservation;
  if (!r || !r.id) return jsonErr('Missing reservation.id');

  var cal = getCalendar();
  if (!cal) return jsonErr('Calendar not found: ' + CALENDAR_ID);

  var start = parseDateTime(r.date, r.time);

  // 1. pokus — hledej dle ReservationID v popisu (sirsi okno: -2 az +2 dny)
  var ev = findById(cal, r.id, start, 2);

  // 2. pokus — fallback dle jmena klienta / nazvu sluzby v okne +/-60 min
  if (!ev) {
    Logger.log('ID not found, trying name/service fallback for ' + r.id);
    ev = findByNameOrService(cal, start, r.clientName, r.serviceName);
  }

  if (!ev) {
    Logger.log('Event not found for reservation ' + r.id + ', date=' + r.date + ' time=' + r.time);
    // Vratime ok=true aby web nevypisoval chybu, ale informujeme o nenalezeni
    return jsonOk({ deleted: false, reason: 'event_not_found', reservationId: r.id });
  }

  var evId = ev.getId();
  ev.deleteEvent();
  Logger.log('Deleted event ' + evId + ' for reservation ' + r.id);
  return jsonOk({ deleted: true, eventId: evId });
}

/* ----------------------------------------------------------
   POMOCNE FUNKCE
---------------------------------------------------------- */

/**
 * Parsuje datum "YYYY-MM-DD" a cas "HH:MM" do objektu Date
 * pouzitim casoveho pasma scriptu (nastaveného na Europe/Prague).
 * Vyhyba se problemum s UTC parsovanim ISO stringu.
 */
function parseDateTime(dateStr, timeStr) {
  // dateStr = "2026-04-22", timeStr = "10:00"
  var dp = (dateStr || '').split('-');
  var tp = (timeStr || '00:00').split(':');
  var yr = parseInt(dp[0], 10) || 2026;
  var mo = (parseInt(dp[1], 10) || 1) - 1;  // 0-based
  var dy = parseInt(dp[2], 10) || 1;
  var hr = parseInt(tp[0], 10) || 0;
  var mn = parseInt(tp[1], 10) || 0;
  // new Date(y,m,d,h,m) pouziva lokalni cas scriptu → Europe/Prague
  return new Date(yr, mo, dy, hr, mn, 0, 0);
}

function getCalendar() {
  if (CALENDAR_ID === 'primary') {
    return CalendarApp.getDefaultCalendar();
  }
  return CalendarApp.getCalendarById(CALENDAR_ID);
}

/**
 * Hleda udalost s "ReservationID: <id>" v popisu.
 * dayRadius = kolik dni pred/po datu prohledavat (default 2).
 */
function findById(cal, reservationId, centerDate, dayRadius) {
  var radius = dayRadius || 2;
  var from = new Date(centerDate.getTime() - radius * 86400000);
  var to   = new Date(centerDate.getTime() + (radius + 1) * 86400000);
  var events = cal.getEvents(from, to);
  var needle = RESERVATION_ID_PREFIX + ' ' + reservationId;
  for (var i = 0; i < events.length; i++) {
    if ((events[i].getDescription() || '').indexOf(needle) !== -1) {
      return events[i];
    }
  }
  return null;
}

/**
 * Fallback — hleda dle jmena klienta nebo nazvu sluzby
 * v okne centerDate ± 90 minut.
 */
function findByNameOrService(cal, centerDate, clientName, serviceName) {
  var from = new Date(centerDate.getTime() - 90 * 60000);
  var to   = new Date(centerDate.getTime() + 90 * 60000);
  var events = cal.getEvents(from, to);
  var name    = (clientName  || '').toLowerCase().trim();
  var service = (serviceName || '').toLowerCase().trim();
  for (var i = 0; i < events.length; i++) {
    var title = (events[i].getTitle()       || '').toLowerCase();
    var desc  = (events[i].getDescription() || '').toLowerCase();
    var combined = title + ' ' + desc;
    if ((name    && combined.indexOf(name)    !== -1) ||
        (service && combined.indexOf(service) !== -1)) {
      return events[i];
    }
  }
  return null;
}

function buildDescription(r, duration) {
  return [
    RESERVATION_ID_PREFIX + ' ' + r.id,
    '',
    'Klient:  ' + (r.clientName  || ''),
    'Email:   ' + (r.clientEmail || ''),
    'Telefon: ' + (r.clientPhone || ''),
    'Sluzba:  ' + (r.serviceName || ''),
    'Delka:   ' + duration + ' min',
    'Datum:   ' + (r.date || '') + ' ' + (r.time || ''),
    'Poznamka: ' + (r.note || 'bez poznamky'),
  ].join('\n');
}

function jsonOk(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(Object.assign({ ok: true }, obj)))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonErr(msg) {
  Logger.log('ERROR: ' + msg);
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
