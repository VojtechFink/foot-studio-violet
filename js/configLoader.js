/* ============================================================
   CONFIG LOADER — Dynamické načítání konfigurace
   ============================================================
   Tento soubor automaticky vloží údaje z CONTACT_CONFIG
   do HTML. Spouští se po načtení config/contacts.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {
    initializeContactData();
});

function initializeContactData() {
    // Ověř, že CONTACT_CONFIG je dostupný
    if (typeof CONTACT_CONFIG === 'undefined') {
        console.error('CONTACT_CONFIG není dostupný. Zkontroluj pořadí skriptů.');
        return;
    }

    // ========================================================
    // SEKCE: KONTAKT — Naplnění kontaktních údajů
    // ========================================================

    // Telefon
    const phoneElements = document.querySelectorAll('[data-config="phone"]');
    phoneElements.forEach(el => {
        el.textContent = CONTACT_CONFIG.phone;
    });

    // Email
    const emailElements = document.querySelectorAll('[data-config="email"]');
    emailElements.forEach(el => {
        el.textContent = CONTACT_CONFIG.email;
    });

    // Adresa
    const addressElements = document.querySelectorAll('[data-config="address"]');
    addressElements.forEach(el => {
        el.textContent = CONTACT_CONFIG.address;
    });

    // Provozovatel
    const operatorElements = document.querySelectorAll('[data-config="operator-name"]');
    operatorElements.forEach(el => {
        el.textContent = CONTACT_CONFIG.operatorName || "Neuvedeno";
    });

    // ========================================================
    // SEKCE: REZERVACE — Otevírací doba a adresa
    // ========================================================

    // Adresa v boční panel
    const sidebarAddress = document.querySelector('[data-config="sidebar-address"]');
    if (sidebarAddress) {
        const addressParts = CONTACT_CONFIG.address.split(',');
        sidebarAddress.innerHTML = addressParts.map(part => part.trim()).join('<br />');
    }

    // Mapa v kontaktu
    const mapEmbed = document.querySelector('[data-config="map-embed-src"]');
    if (mapEmbed && CONTACT_CONFIG.googleMapsEmbedUrl) {
        mapEmbed.src = CONTACT_CONFIG.googleMapsEmbedUrl;
    }

    // ========================================================
    // SEKCE: KONTAKT — Vytváření odkazů
    // ========================================================

    // Telefonní odkaz
    const phoneLink = document.querySelector('[data-config="phone-link"]');
    if (phoneLink) {
        phoneLink.href = 'tel:' + CONTACT_CONFIG.phone.replace(/\s+/g, '');
        phoneLink.setAttribute('aria-label', `Zavolat na číslo ${CONTACT_CONFIG.phone}`);
    }

    // Email odkaz
    const emailLink = document.querySelector('[data-config="email-link"]');
    if (emailLink) {
        emailLink.href = 'mailto:' + CONTACT_CONFIG.email;
        emailLink.setAttribute('aria-label', `Napsat e-mail na ${CONTACT_CONFIG.email}`);
    }

    console.log('✓ Konfigurace byla úspěšně načtena.');
}

