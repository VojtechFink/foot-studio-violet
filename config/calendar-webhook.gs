/**
 * ============================================================
 *  Google Apps Script — Calendar Webhook
 *  Studio Violet
 * ============================================================
 *
 *  Nasazení:
 *  1. Otevři script.google.com → Nový projekt
 *  2. Zkopíruj tento kód
 *  3. Nasadit → Nové nasazení → Typ: Webová aplikace
 *     - Spustit jako: Já (vlastník)
 *     - Kdo má přístup: Kdokoliv
 *  4. Zkopíruj URL a vlož do contacts.js → calendarWebhook.url
 *
 *  DŮLEŽITÉ: ID_KALENDÁŘE níže změň na svůj Google Calendar ID.
 *  Najdeš ho v Google Calendar → Nastavení kalendáře → ID kalendáře
 *  (obvykle ve formátu xxx@group.calendar.google.com nebo
 *   tvůj gmail pro primární kalendář = 'primary')
 * ============================================================
 */

// ← ZMĚŇ NA SVÉ ID KALENDÁŘE (nebo 'primary' pro hlavní kalendář)
var CALENDAR_ID = 'primary';

// Klíčové slovo v popisu události pro vyhledávání — neměň
var RESERVATION_ID_PREFIX = 'ReservationID:';

/* ----------------------------------------------------------
   HLAVNÍ HANDLER — přijímá POST požadavky
---------------------------------------------------------- */
function doPost(e) {
  try {
    var body = e.postData ? e.postData.contents : '';
    var data = JSON.parse(body);

    var action = data.action || '';

    if (action === 'reservation.created') {
      return handleCreate(data);
    } else if (action === 'reservation.cancelled') {
      return handleCancel(data);
    } else {
      return jsonResponse({ ok: false, error: 'Unknown action: ' + action });
    }

  } catch (err) {
    Logger.log('❌ doPost error: ' + err.toString());
    return jsonResponse({ ok: false, error: err.toString() });
  }
}

/* ----------------------------------------------------------
   HANDLER GET — test dostupnosti
---------------------------------------------------------- */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, message: 'Calendar webhook is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ----------------------------------------------------------
   VYTVOŘENÍ UDÁLOSTI
---------------------------------------------------------- */
function handleCreate(data) {
  var r = data.reservation;
  if (!r) return jsonResponse({ ok: false, error: 'Missing reservation data' });

  var tz        = data.timezone || 'Europe/Prague';
  var startIso  = r.startIso || (r.date + 'T' + r.time + ':00');
  var duration  = Number(r.durationMinutes) || 60;

  var startDate = new Date(startIso);
  var endDate   = new Date(startDate.getTime() + duration * 60 * 1000);

  var title = '💆 ' + (r.serviceName || 'Rezervace') + ' — ' + (r.clientName || '');

  var description = [
    RESERVATION_ID_PREFIX + ' ' + r.id,
    '',
    '👤 Klient: ' + (r.clientName || ''),
    '📧 Email: ' + (r.clientEmail || ''),
    '📞 Telefon: ' + (r.clientPhone || ''),
    '💅 Služba: ' + (r.serviceName || ''),
    '⏱️ Délka: ' + duration + ' min',
    '📝 Poznámka: ' + (r.note || 'Bez poznámky'),
  ].join('\n');

  var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!calendar) {
    return jsonResponse({ ok: false, error: 'Calendar not found: ' + CALENDAR_ID });
  }

  // Zkontroluj jestli událost pro toto ID už neexistuje (ochrana proti duplicitám)
  var existing = findEventByReservationId(calendar, r.id, startDate);
  if (existing) {
    Logger.log('ℹ️ Událost pro rezervaci ' + r.id + ' už existuje, přeskakuji vytvoření.');
    return jsonResponse({ ok: true, eventId: existing.getId(), duplicate: true });
  }

  var event = calendar.createEvent(title, startDate, endDate, {
    description: description,
  });

  Logger.log('✅ Událost vytvořena: ' + event.getId() + ' pro rezervaci ' + r.id);
  return jsonResponse({ ok: true, eventId: event.getId() });
}

/* ----------------------------------------------------------
   ZRUŠENÍ / SMAZÁNÍ UDÁLOSTI
---------------------------------------------------------- */
function handleCancel(data) {
  var r = data.reservation;
  if (!r) return jsonResponse({ ok: false, error: 'Missing reservation data' });

  var tz       = data.timezone || 'Europe/Prague';
  var dateStr  = r.date || '';
  var timeStr  = r.time || '';
  var startIso = r.startIso || (dateStr + 'T' + timeStr + ':00');

  var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!calendar) {
    return jsonResponse({ ok: false, error: 'Calendar not found: ' + CALENDAR_ID });
  }

  // Hledáme událost v okně ±1 den kolem data rezervace (pro jistotu)
  var searchDate = new Date(startIso);
  var searchFrom = new Date(searchDate);
  searchFrom.setDate(searchFrom.getDate() - 1);
  var searchTo = new Date(searchDate);
  searchTo.setDate(searchTo.getDate() + 2);

  var event = findEventByReservationId(calendar, r.id, searchDate, searchFrom, searchTo);

  if (!event) {
    // Pokud nenajdeme podle ID, zkusíme podle přesného času a jména klienta
    Logger.log('⚠️ Událost pro rezervaci ' + r.id + ' nenalezena podle ID, zkouším fallback...');
    event = findEventByTimeAndName(calendar, searchDate, r.clientName || '', r.serviceName || '');
  }

  if (!event) {
    Logger.log('⚠️ Událost pro zrušení nenalezena, rezervace: ' + r.id);
    return jsonResponse({ ok: true, deleted: false, reason: 'Event not found' });
  }

  var eventId = event.getId();
  event.deleteEvent();
  Logger.log('✅ Událost smazána: ' + eventId + ' pro rezervaci ' + r.id);
  return jsonResponse({ ok: true, deleted: true, eventId: eventId });
}

/* ----------------------------------------------------------
   POMOCNÁ FUNKCE — hledání události podle reservation ID
   v popisu události
---------------------------------------------------------- */
function findEventByReservationId(calendar, reservationId, searchDate, searchFrom, searchTo) {
  if (!searchFrom) {
    searchFrom = new Date(searchDate);
    searchFrom.setHours(0, 0, 0, 0);
  }
  if (!searchTo) {
    searchTo = new Date(searchDate);
    searchTo.setHours(23, 59, 59, 999);
  }

  var events = calendar.getEvents(searchFrom, searchTo);
  var idToFind = RESERVATION_ID_PREFIX + ' ' + reservationId;

  for (var i = 0; i < events.length; i++) {
    var desc = events[i].getDescription() || '';
    if (desc.indexOf(idToFind) !== -1) {
      return events[i];
    }
  }
  return null;
}

/* ----------------------------------------------------------
   FALLBACK — hledání podle přesného času + jméno klienta
---------------------------------------------------------- */
function findEventByTimeAndName(calendar, startDate, clientName, serviceName) {
  // Hledáme v okně 30 minut kolem daného času
  var from = new Date(startDate.getTime() - 15 * 60 * 1000);
  var to   = new Date(startDate.getTime() + 15 * 60 * 1000);
  var events = calendar.getEvents(from, to);

  var nameLower    = (clientName || '').toLowerCase();
  var serviceUpper = (serviceName || '').toUpperCase();

  for (var i = 0; i < events.length; i++) {
    var title = events[i].getTitle() || '';
    var desc  = events[i].getDescription() || '';
    if (
      (nameLower && (title.toLowerCase().indexOf(nameLower) !== -1 || desc.toLowerCase().indexOf(nameLower) !== -1)) ||
      (serviceUpper && title.toUpperCase().indexOf(serviceUpper) !== -1)
    ) {
      return events[i];
    }
  }
  return null;
}

/* ----------------------------------------------------------
   HELPER — JSON odpověď
---------------------------------------------------------- */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

