/* ============================================================
   FIREBASE SERVICE — Foot Studio Violet
   ============================================================
   Třída která zajišťuje veškerou komunikaci s Firebase.
   Ostatní soubory ji používají přes globální instanci
   `firebaseService` — nikdy nepracují s Firebase přímo.
   ============================================================ */

class FirebaseService {

    constructor() {
        this.db          = null;   // reference na Firestore databázi
        this.initialized = false;  // příznak úspěšné inicializace
    }

    /* ----------------------------------------------------------
       INICIALIZACE
       Volá se jednou při startu aplikace z main.js
    ---------------------------------------------------------- */
    init() {
        try {
            // Vezme konfiguraci z config/contact.js
            const firebaseConfig = CONTACT_CONFIG.firebase;

            // Inicializuje Firebase aplikaci
            firebase.initializeApp(firebaseConfig);

            // Získá referenci na Firestore databázi
            this.db = firebase.firestore();

            this.initialized = true;
            console.log("✅ Firebase: úspěšně inicializován");

        } catch (error) {
            console.error("❌ Firebase: chyba při inicializaci →", error);
            this.initialized = false;
        }
    }

    /* ----------------------------------------------------------
       KONTROLA INICIALIZACE
       Interní helper — zabrání chybám pokud Firebase nespadl
    ---------------------------------------------------------- */
    _checkInit() {
        if (!this.initialized || !this.db) {
            throw new Error("Firebase není inicializován. Zavolej nejprve init().");
        }
    }

    /* ----------------------------------------------------------
       ULOŽENÍ REZERVACE
       Přijme objekt rezervace a uloží ho do Firestore.
       Vrátí Promise s ID nově vytvořeného dokumentu.

       Parametry:
         reservationData {Object} — data z formuláře

       Návratová hodnota:
         Promise<string> — ID uložené rezervace
    ---------------------------------------------------------- */
    async saveReservation(reservationData) {
        this._checkInit();

        try {
            // Přidá časové razítko vytvoření
            const dataToSave = {
                ...reservationData,
                status:    "pending",                  // výchozí stav: čeká na potvrzení
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            };

            // Uloží do kolekce "reservations"
            const docRef = await this.db
                .collection("reservations")
                .add(dataToSave);

            console.log("✅ Firebase: rezervace uložena, ID →", docRef.id);
            return docRef.id;

        } catch (error) {
            console.error("❌ Firebase: chyba při ukládání rezervace →", error);
            throw error;
        }
    }

    /* ----------------------------------------------------------
       NAČTENÍ VŠECH REZERVACÍ
       Vrátí všechny rezervace seřazené od nejnovější.
       Používá admin panel (sprava.html).

       Návratová hodnota:
         Promise<Array> — pole objektů rezervací
    ---------------------------------------------------------- */
    async getAllReservations() {
        this._checkInit();

        try {
            const snapshot = await this.db
                .collection("reservations")
                .orderBy("createdAt", "desc")
                .get();

            // Převede Firestore dokumenty na pole objektů
            const reservations = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));

            console.log(`✅ Firebase: načteno ${reservations.length} rezervací`);
            return reservations;

        } catch (error) {
            console.error("❌ Firebase: chyba při načítání rezervací →", error);
            throw error;
        }
    }

    /* ----------------------------------------------------------
       NAČTENÍ REZERVACÍ PRO KONKRÉTNÍ DATUM
       Používá formulář pro kontrolu obsazených časů.

       Parametry:
         date {string} — datum ve formátu "YYYY-MM-DD"

       Návratová hodnota:
         Promise<Array> — pole rezervací pro daný den
    ---------------------------------------------------------- */
    async getReservationsByDate(date) {
        this._checkInit();

        try {
            console.log("ℹ️ Firebase: getReservationsByDate běží v režimu date-only query");
            const snapshot = await this.db
                .collection("reservations")
                .where("date", "==", date)
                .get();

            // Filtr statusu delame az na klientovi, aby nebyl potreba composite index.
            const reservations = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }))
                .filter(reservation => reservation.status !== "cancelled");

            console.log(`✅ Firebase: načteno ${reservations.length} rezervací pro ${date}`);
            return reservations;

        } catch (error) {
            const errorText = String(error?.message || error || "");

            // Fallback: pokud by v prohlížeči stale bundle stále volal index-dependent query,
            // bezpečně načteme data bez složeného indexu a odfiltrujeme je lokálně.
            if (errorText.includes("requires an index")) {
                console.warn("⚠️ Firebase: dotaz vyžadoval index, přepínám na fallback bez indexu.");

                const fallbackSnapshot = await this.db
                    .collection("reservations")
                    .get();

                const reservations = fallbackSnapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    }))
                    .filter(reservation => reservation.date === date)
                    .filter(reservation => reservation.status !== "cancelled");

                console.log(`✅ Firebase (fallback): načteno ${reservations.length} rezervací pro ${date}`);
                return reservations;
            }

            console.error("❌ Firebase: chyba při načítání rezervací pro datum →", error);
            throw error;
        }
    }

    /* ----------------------------------------------------------
       AKTUALIZACE STAVU REZERVACE
       Používá admin panel pro potvrzení / zrušení rezervace.

       Parametry:
         id     {string} — ID dokumentu ve Firestore
         status {string} — nový stav: "confirmed" | "cancelled" | "pending"

       Návratová hodnota:
         Promise<void>
    ---------------------------------------------------------- */
    async updateReservationStatus(id, status) {
        this._checkInit();

        const allowedStatuses = ["pending", "confirmed", "cancelled"];

        if (!allowedStatuses.includes(status)) {
            throw new Error(`Neplatný stav rezervace: "${status}"`);
        }

        try {
            await this.db
                .collection("reservations")
                .doc(id)
                .update({
                    status:    status,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                });

            console.log(`✅ Firebase: stav rezervace ${id} změněn na "${status}"`);

        } catch (error) {
            console.error("❌ Firebase: chyba při aktualizaci stavu →", error);
            throw error;
        }
    }

    /* ----------------------------------------------------------
       SMAZÁNÍ REZERVACE
       Permanentně smaže rezervaci z databáze.
       Používá admin panel.

       Parametry:
         id {string} — ID dokumentu ve Firestore

       Návratová hodnota:
         Promise<void>
    ---------------------------------------------------------- */
    async deleteReservation(id) {
        this._checkInit();

        try {
            await this.db
                .collection("reservations")
                .doc(id)
                .delete();

            console.log(`✅ Firebase: rezervace ${id} smazána`);

        } catch (error) {
            console.error("❌ Firebase: chyba při mazání rezervace →", error);
            throw error;
        }
    }

    /* ----------------------------------------------------------
       SMAZÁNÍ VŠECH REZERVACÍ
       Vymaže celou kolekci "reservations" po dávkách,
       aby bylo možné bezpečně čistit data i při větším počtu záznamů.

       Návratová hodnota:
         Promise<number> — počet smazaných rezervací
    ---------------------------------------------------------- */
    async deleteAllReservations() {
        this._checkInit();

        const batchSize = 400;
        let deletedCount = 0;

        try {
            while (true) {
                const snapshot = await this.db
                    .collection("reservations")
                    .orderBy(firebase.firestore.FieldPath.documentId())
                    .limit(batchSize)
                    .get();

                if (snapshot.empty) {
                    break;
                }

                const batch = this.db.batch();
                snapshot.docs.forEach((doc) => batch.delete(doc.ref));
                await batch.commit();

                deletedCount += snapshot.size;
            }

            console.log(`✅ Firebase: smazáno ${deletedCount} rezervací`);
            return deletedCount;

        } catch (error) {
            console.error("❌ Firebase: chyba při mazání všech rezervací →", error);
            throw error;
        }
    }

    /* ----------------------------------------------------------
       REAL-TIME POSLUCHAČ
       Sleduje změny v kolekci rezervací v reálném čase.
       Používá admin panel pro automatické obnovení tabulky.

       Parametry:
         callback {Function} — funkce volaná při každé změně

       Návratová hodnota:
         Function — volej pro odpojení posluchače (unsubscribe)
    ---------------------------------------------------------- */
    onReservationsChange(callback) {
        this._checkInit();

        const unsubscribe = this.db
            .collection("reservations")
            .orderBy("createdAt", "desc")
            .onSnapshot(snapshot => {
                const reservations = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                callback(reservations);
            }, error => {
                console.error("❌ Firebase: chyba v real-time posluchači →", error);
            });

        return unsubscribe;
    }
}

/* ============================================================
   GLOBÁLNÍ INSTANCE
   Přístupná ze všech ostatních JS souborů jako `firebaseService`
   ============================================================ */
const firebaseService = new FirebaseService();
