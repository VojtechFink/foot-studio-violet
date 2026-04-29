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
        this.summaryEl = document.getElementById("reviewsSummary");
        this.averageValueEl = document.getElementById("reviewsAverageValue");
        this.averageStarsEl = document.getElementById("reviewsAverageStars");
        this.averageTextEl = document.getElementById("reviewsAverageText");
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
            // Firestore filtruje přímo schválené recenze — nečteme pending záznamy
            const snapshot = await firebaseService.db
                .collection("reviews")
                .where("approved", "==", true)
                .orderBy("createdAt", "desc")
                .limit(cfg.maxFetch)
                .get();

            const approvedVisibleReviews = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(r => r.visible !== false);

            this._renderReviewsSummary(approvedVisibleReviews);

            const reviews = approvedVisibleReviews
                .filter(r => Number(r.rating) >= cfg.minRating)
                .filter(r => String(r.comment || "").trim().length >= cfg.minCommentLength);

            this._renderReviews(this._selectDisplayReviews(reviews, cfg.maxItems));
        } catch (error) {
            console.error("❌ ReviewsService: chyba při načítání recenzí →", error);
            this._renderReviewsSummary([]);
            this._renderError(this._mapFirebaseErrorToMessage(error, "load"));
        }
    }

    _renderReviewsSummary(reviews) {
        if (!this.summaryEl || !this.averageValueEl || !this.averageStarsEl || !this.averageTextEl) {
            return;
        }

        if (!reviews.length) {
            this.summaryEl.hidden = true;
            return;
        }

        const totalRating = reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0);
        const averageRating = totalRating / reviews.length;
        const roundedStars = Math.round(averageRating);
        const stars = "★".repeat(roundedStars) + "☆".repeat(5 - roundedStars);

        this.averageValueEl.textContent = `${averageRating.toFixed(1)} / 5`;
        this.averageStarsEl.textContent = stars;
        this.averageStarsEl.setAttribute("aria-label", `Průměrné hodnocení ${averageRating.toFixed(1)} z 5`);
        this.averageTextEl.textContent = `${reviews.length} ${reviews.length === 1 ? "recenze" : (reviews.length >= 2 && reviews.length <= 4 ? "recenze" : "recenzí")}`;
        this.summaryEl.hidden = false;
    }

    _sortReviewsByQuality(reviews) {
        return [...reviews].sort((a, b) => {
            const ratingDiff = Number(b.rating || 0) - Number(a.rating || 0);
            if (ratingDiff !== 0) return ratingDiff;

            const commentDiff = String(b.comment || "").trim().length - String(a.comment || "").trim().length;
            if (commentDiff !== 0) return commentDiff;

            const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
            const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
            return bTime - aTime;
        });
    }

    _selectDisplayReviews(reviews, maxItems) {
        const sorted = this._sortReviewsByQuality(reviews);
        const selected = sorted.slice(0, maxItems);

        const hasVisibleFourStar = selected.some(review => Number(review.rating) === 4);
        const bestFourStar = sorted.find(review => Number(review.rating) === 4);

        if (!hasVisibleFourStar && bestFourStar && selected.length > 1) {
            selected[selected.length - 1] = bestFourStar;
        }

        return Array.from(new Map(selected.map(review => [review.id, review])).values());
    }

    _renderReviews(reviews) {
        if (!this.listEl) return;

        if (!reviews.length) {
            this.listEl.innerHTML = "<p class=\"reviews__hint\">Zatím nejsou dostupné žádné recenze.</p>";
            this._applyInlineReviewsLayout();
            return;
        }

        const cards = reviews.map((review) => {
            const rating = Math.max(1, Math.min(5, Number(review.rating) || 0));
            const stars = "★".repeat(rating) + "☆".repeat(5 - rating);

            return `
                <article class="review-card" aria-label="Recenze od ${this._escapeHtml(review.clientName || "Anonym")}">
                    <div class="review-card__header">
                        <strong class="review-card__name">${this._escapeHtml(review.clientName || "Anonym")}</strong>
                    </div>
                    <div class="review-card__rating" aria-label="Hodnocení ${rating} z 5">${stars}</div>
                    <p class="review-card__comment">${this._escapeHtml(review.comment || "")}</p>
                </article>
            `;
        }).join("");

        this.listEl.innerHTML = cards;
        this._applyInlineReviewsLayout();
    }

    _renderError(message) {
        if (!this.listEl) return;
        this.listEl.innerHTML = `<p class=\"reviews__hint reviews__hint--error\">${this._escapeHtml(message)}</p>`;
        this._applyInlineReviewsLayout();
    }

    _applyInlineReviewsLayout() {
        if (!this.listEl) return;

        this.listEl.style.display = "grid";
        this.listEl.style.gridTemplateColumns = "repeat(auto-fit, minmax(260px, 1fr))";
        this.listEl.style.gap = "1.25rem";
        this.listEl.style.marginBottom = "2.5rem";

        this.listEl.querySelectorAll(".review-card").forEach((card) => {
            card.style.display = "flex";
            card.style.flexDirection = "column";
            card.style.width = "100%";
            card.style.background = "#1f1830";
            card.style.border = "1px solid rgba(155, 89, 182, 0.55)";
            card.style.borderRadius = "16px";
            card.style.padding = "1.1rem 1.2rem";
            card.style.boxShadow = "0 10px 24px rgba(0, 0, 0, 0.28)";
        });
    }

    _bindForm() {
        if (!this.form) return;

        this.form.addEventListener("submit", async (e) => {
            e.preventDefault();

            // Honeypot check — robot vyplní skryté pole, člověk ne
            const honeypot = this.form.querySelector('input[name="_hp_website"]');
            if (honeypot && honeypot.value) {
                return; // Tichá ignorace — robot si nemá všimnout
            }

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
                approved: false,
                status: "pending",
                visible: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

            analyticsService?.trackEvent?.("review_submitted", {
                rating: data.rating,
                hasComment: true,
            });

            this.form.reset();
            this._showMessage("Děkujeme za recenzi! Po kontrole ji zveřejníme.", "success");
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
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }
}

const reviewsService = new ReviewsService();

