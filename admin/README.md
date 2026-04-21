# 📊 Admin Dashboard — Studio Violet

## 🎯 Co to dělá?

Admin dashboard automaticky sleduje všechny akce na vaší webové stránce a ukazuje vám detailní statistiky:

- **👥 Návštěvy** — kolik lidí přišlo na stránku (dnes a celkem)
- **📅 Rezervace** — počet rezervací (dnes a celkem)
- **💰 Tržba** — soupis příjmů z rezervací
- **⏱️ Průměrná doba** — jak dlouho lidé na stránce tráví
- **🏆 Nejpopulárnější služby** — které služby si vybírají nejčastěji
- **⏰ Nejčastější časy** — kdy si lidé nejčastěji rezervují
- **📋 Poslední rezervace** — tabulka s nejnovějšími rezervacemi

## 🔐 Jak se přihlásit?

1. Jdi na: **`https://studio-violet.cz/admin/dashboard.html`** (nebo na `localhost:8000/admin/dashboard.html` při místním vývoji)

2. Zadej heslo: **`violet123`**

   ⚠️ **DŮLEŽITÉ**: Změň heslo v souboru `admin/dashboard.html` na řádku ~335!

## 📝 Jak se heslo změní?

Otevři soubor `admin/dashboard.html` a najdi:

```javascript
const ADMIN_PASSWORD = 'violet123'; // TODO: Změň na lepší heslo!
```

Změň `'violet123'` na lepší heslo (např. `'mojeSileneheslo2024'`) a ulož.

## 🔍 Co se sleduje automaticky?

Analytika automaticky zaznamenává:

✅ Každou návštěvu stránky
✅ Kliknutí na tlačítka a navigaci
✅ Výběr služby
✅ Výběr dne a času
✅ Odeslání rezervace
✅ Jak dlouho uživatel zůstane na stránce

Všechna data se ukládají v **Firestore databázi** (Firebase).

## 📊 Kde se data ukazují?

1. **Statistické karty** v horní části dashboardu
2. **Grafy** s nejpopulárnějšími službami a časy
3. **Tabulka** s posledními 10 rezervacemi

## 🛡️ Bezpečnost

- Dashboard je chráněn heslem
- Emaily zákazníků jsou anonymizovány (hashovány)
- Data se ukládají v tvé Firebase databázi (nikde jinde)
- Session je uložena v `sessionStorage` (zmizí po zavření prohlížeče)

## 🚀 Jak to funguje?

1. **analyticsService.js** — automaticky sbírá data v pozadí
2. **StorageService** — zaznamenává hotové rezervace
3. **Firebase (Firestore)** — ukládá všechna data
4. **dashboard.html** — zobrazuje data a dělá statistiky

## 🔧 Přizpůsobení

### Změna hesla

Otevři `admin/dashboard.html` a změň řádek ~335:

```javascript
const ADMIN_PASSWORD = 'tvoje_nejake_sila_heslo_2024';
```

### Zobrazení více/méně rezervací

V `dashboard.html` najdi řádek s `.limit(50)` nebo `.slice(0, 10)` a změň číslo.

### Přidání nové metriky

Jdi do `js/analyticsService.js` a přidej nový event:

```javascript
trackMyCustomEvent(data) {
    this.trackEvent('my_custom_event', data);
}
```

Pak v dashboardu si ho můžeš vyčíst z Firestore.

## ⚠️ Důležité poznámky

1. **Bezpečnost**: Heslo je vidět v kódu. Pro produkci:
   - Ulož heslo v **Firebase Authentication**
   - Nebo ulož v **environment variables** (pokud máš backend)
   - Nebo používej Google login pro adminy

2. **GDPR**: Emaily jsou hashovány pro soukromí. Pokud chceš vidět reálné emaily, odstraň anonymizaci v `analyticsService.js`.

3. **Výkon**: Na velkém počtu dat (>10k events) se dashboard může pomalit. Pak bys měl:
   - Archivovat staré data
   - Nebo používat Firebase **Realtime Database** místo Firestore

## 📱 Přístup

Dashboard funguje na:
- ✅ Počítačích (desktop)
- ✅ Tabletech (tablet)
- ⚠️ Mobilech (funguje, ale je těsné)

## 🐛 Řešení problémů

### Dashboard se nenahrál nebo chybí data

1. Zkontroluj **Firebase Firestore** — jsou tam data?
   - Jdi do [Firebase Console](https://console.firebase.google.com)
   - Vyber projekt "studio-violet"
   - Jdi na "Firestore Database"
   - Měl bys vidět kolekci "analytics"

2. Zkontroluj **Console v DevTools** (F12) — jsou tam chyby?

3. Zkontroluj **Firebase Security Rules** — mají správná oprávnění?

### Heslo nefunguje

1. Zkontroluj soubor `admin/dashboard.html` — je heslo správně napsáno?
2. Zkontroluj **sessionStorage** (F12 → Application → Session Storage) — je tam "adminDashboardSession"?
3. Vymaž cookies a zkus znovu

### Data se neupdatují

1. Stránka se automaticky aktualizuje jen při novém přihlášení
2. Stiskni **F5** (refresh)
3. Nebo zavři a znovu otevři admin panel

## 📞 Potřebuješ pomoct?

Všechny analytické data jsou v **Firestore** v kolekci `analytics`. Tam si je můžeš sám prozkoumat a vytvořit si vlastní reporty.

Enjoy! 🌸

