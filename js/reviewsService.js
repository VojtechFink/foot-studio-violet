/* ============================================================
   REVIEWS SERVICE — Studio Violet
   ============================================================
   Spravuje recenze na webu:
     - Načtení nejlépe hodnocených recenzí z Firestore
     - Odeslání nové recenze klientem
   Kolekce: reviews
   ============================================================ */

class ReviewsService {

    constructor() {
        this.listEl = document.getElementById("reviewsList");
        this.form = document.getElementById("reviewForm");
        this.messageEl = document.getElementById("reviewMessage");
        this.submitBtn = document.getElementById("reviewSubmitBtn");
    }

    init() {
        if (!this.listEl) {
            return;
        }

        this.loadTopReviews();
        this._bindForm();
        console.log("✅ ReviewsService: úspěšně inicializován");
    }

    _getConfig() {
        const cfg = CONTACT_CONFIG?.reviews || {};
        return {
            maxItems: Number(cfg.maxItems) || 6,
            minRating: Number(cfg.minRating) || 4,
            minCommentLength: Number(cfg.minCommentLength) || 20,
            maxFetch: Number(cfg.maxFetch) || 100,
        };
    }

    async loadTopReviews() {
        if (!firebaseService?.db) {
            this._renderError("Recenze se nepodařilo načíst.");
            return;
        }

        const cfg = this._getConfig();

        try {
            const snapshot = await firebaseService.db
                .collection("reviews")
                .orderBy("createdAt", "desc")
                .limit(cfg.maxFetch)
                .get();

            const reviews = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(r => r.visible !== false)
                .filter(r => r.approved !== false)
                .filter(r => Number(r.rating) >= cfg.minRating)
                .filter(r => String(r.comment || "").trim().length >= cfg.minCommentLength)
                .sort((a, b) => {
                    const ratingDiff = Number(b.rating || 0) - Number(a.rating || 0);
                    if (ratingDiff !== 0) return ratingDiff;

                    const commentDiff = String(b.comment || "").trim().length - String(a.comment || "").trim().length;
                    if (commentDiff !== 0) return commentDiff;

                    const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                    const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                    return bTime - aTime;
                })
                .slice(0, cfg.maxItems);

            this._renderReviews(reviews);
        } catch (error) {
            console.error("❌ ReviewsService: chyba při načítání recenzí →", error);
            this._renderError(this._mapFirebaseErrorToMessage(error, "load"));
        }
    }

    _renderReviews(reviews) {
        if (!this.listEl) return;

        if (!reviews.length) {
            this.listEl.innerHTML = "<p class=\"reviews__hint\">Zatím nejsou dostupné žádné recenze.</p>";
            return;
        }

        const cards = reviews.map((review) => {
            const rating = Math.max(1, Math.min(5, Number(review.rating) || 0));
            const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
            const source = review.source === "google" ? "Google" : "Ověřená recenze";

            return `
                <article class="review-card" aria-label="Recenze od ${this._escapeHtml(review.clientName || "Anonym")}">
                    <div class="review-card__header">
                        <strong class="review-card__name">${this._escapeHtml(review.clientName || "Anonym")}</strong>
                        <span class="review-card__source">${source}</span>
                    </div>
                    <div class="review-card__rating" aria-label="Hodnocení ${rating} z 5">${stars}</div>
                    <p class="review-card__comment">${this._escapeHtml(review.comment || "")}</p>
                </article>
            `;
        }).join("");

        this.listEl.innerHTML = cards;
    }

    _renderError(message) {
        if (!this.listEl) return;
        this.listEl.innerHTML = `<p class=\"reviews__hint reviews__hint--error\">${this._escapeHtml(message)}</p>`;
    }

    _bindForm() {
        if (!this.form) return;

        this.form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const name = document.getElementById("reviewName")?.value.trim() || "";
            const rating = Number(document.getElementById("reviewRating")?.value || 0);
            const comment = document.getElementById("reviewComment")?.value.trim() || "";

            if (name.length < 2) {
                this._showMessage("Zadejte prosím jméno.", "error");
                return;
            }
            if (rating < 1 || rating > 5) {
                this._showMessage("Vyberte prosím hodnocení.", "error");
                return;
            }
            if (comment.length < 10) {
                this._showMessage("Komentář musí mít alespoň 10 znaků.", "error");
                return;
            }

            await this._submitReview({
                clientName: name,
                rating,
                comment,
            });
        });
    }

    async _submitReview(data) {
        this._setLoading(true);
        this._showMessage("", "");

        try {
            await firebaseService.db.collection("reviews").add({
                clientName: data.clientName,
                rating: data.rating,
                comment: data.comment,
                source: "user",
                approved: true,
                visible: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

            analyticsService?.trackEvent?.("review_submitted", {
                rating: data.rating,
                hasComment: true,
            });

            this.form.reset();
            this._showMessage("Děkujeme za recenzi!", "success");
            await this.loadTopReviews();
        } catch (error) {
            console.error("❌ ReviewsService: chyba při ukládání recenze →", error);
            this._showMessage(this._mapFirebaseErrorToMessage(error, "submit"), "error");
        } finally {
            this._setLoading(false);
        }
    }

    _mapFirebaseErrorToMessage(error, action) {
        const code = String(error?.code || "").toLowerCase();

        if (code.includes("permission-denied")) {
            return action === "submit"
                ? "Recenzi teď nelze odeslat kvůli oprávněním databáze (Firestore Rules)."
                : "Recenze teď nelze načíst kvůli oprávněním databáze (Firestore Rules).";
        }

        if (code.includes("unavailable") || code.includes("failed-precondition")) {
            return "Služba recenzí je dočasně nedostupná. Zkuste to prosím za chvíli.";
        }

        return action === "submit"
            ? "Recenzi se nepodařilo odeslat. Zkuste to prosím znovu."
            : "Recenze se nepodařilo načíst.";
    }

    _setLoading(loading) {
        if (!this.submitBtn) return;
        if (loading) {
            this.submitBtn.disabled = true;
            this.submitBtn.dataset.originalText = this.submitBtn.textContent;
            this.submitBtn.innerHTML = "<span class=\"spinner\" aria-hidden=\"true\"></span> Odesílám...";
        } else {
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = this.submitBtn.dataset.originalText || "Odeslat recenzi";
        }
    }

    _showMessage(text, type) {
        if (!this.messageEl) return;
        this.messageEl.textContent = text;
        this.messageEl.className = type ? `form-message form-message--${type}` : "form-message";
    }

    _escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }
}

const reviewsService = new ReviewsService();

