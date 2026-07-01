// ============================================================
// feedback.js
// "Share Your Experience" — form handling + realtime review feed
// ============================================================
// Depends on: firebase-config.js (exports the initialized `db`)
// Firestore collection used: "feedback"
// Document shape:
//   { name, email, rating, message, createdAt, approved }
// ============================================================

import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* ------------------------------------------------------------
   DOM references
------------------------------------------------------------ */
const form = document.getElementById("feedbackForm");
const nameInput = document.getElementById("fbName");
const emailInput = document.getElementById("fbEmail");
const messageInput = document.getElementById("fbMessage");

const ratingWrap = document.getElementById("ratingStars");
const ratingButtons = ratingWrap ? Array.from(ratingWrap.querySelectorAll(".share__star")) : [];
const ratingError = document.getElementById("ratingError");
const messageError = document.getElementById("messageError");

const submitBtn = document.getElementById("submitBtn");
const successMsg = document.getElementById("successMsg");
const errorMsg = document.getElementById("errorMsg");

const summaryStarsEl = document.getElementById("summaryStars");
const summaryAvgEl = document.getElementById("summaryAvgNumber");
const summaryCountEl = document.getElementById("summaryCount");

const reviewsList = document.getElementById("reviewsList");
const reviewsEmpty = document.getElementById("reviewsEmpty");

let selectedRating = 0;

/* ------------------------------------------------------------
   Star rating widget
------------------------------------------------------------ */
function paintRatingStars(value) {
  ratingButtons.forEach((btn) => {
    const starValue = Number(btn.dataset.value);
    btn.classList.toggle("is-filled", starValue <= value);
  });
}

ratingButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedRating = Number(btn.dataset.value);
    paintRatingStars(selectedRating);
    hideFieldError(ratingError);
  });

  btn.addEventListener("mouseenter", () => paintRatingStars(Number(btn.dataset.value)));
  btn.addEventListener("mouseleave", () => paintRatingStars(selectedRating));
});

/* ------------------------------------------------------------
   Small helpers
------------------------------------------------------------ */
function showFieldError(el) {
  el.classList.add("is-visible");
}

function hideFieldError(el) {
  el.classList.remove("is-visible");
}

function hideStatusMessages() {
  successMsg.classList.remove("is-visible");
  errorMsg.classList.remove("is-visible");
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.classList.toggle("is-loading", isLoading);
}

// Escape any user-entered text before injecting it as HTML.
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") return "Just now";
  return timestamp.toDate().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function starsMarkup(rating) {
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += `<span class="share__star-icon${i <= rating ? " is-filled" : ""}">&#9733;</span>`;
  }
  return html;
}

/* ------------------------------------------------------------
   reCAPTCHA v3 — Spam protection (placeholder)
   ------------------------------------------------------------
   1. Add this line to the <head> of index.html:
        <script src="https://www.google.com/recaptcha/api.js?render=YOUR_RECAPTCHA_SITE_KEY"></script>
   2. Replace YOUR_RECAPTCHA_SITE_KEY below with your real site key.
   3. Uncomment the grecaptcha.execute() call.
   4. Send the returned token to a backend (e.g. a Firebase Cloud
      Function) and verify it with your reCAPTCHA secret key before
      trusting the submission — a token/score check must happen
      server-side, since anything done only in the browser can be
      bypassed.
------------------------------------------------------------ */
async function getRecaptchaToken() {
  // if (window.grecaptcha) {
  //   return await window.grecaptcha.execute("YOUR_RECAPTCHA_SITE_KEY", {
  //     action: "submit_feedback"
  //   });
  // }
  return null;
}

/* ------------------------------------------------------------
   Form submission
------------------------------------------------------------ */
form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideStatusMessages();

  let isValid = true;

  if (selectedRating < 1) {
    showFieldError(ratingError);
    isValid = false;
  }

  const messageValue = messageInput.value.trim();
  if (!messageValue) {
    showFieldError(messageError);
    isValid = false;
  }

  if (!isValid) return;

  setLoading(true);

  try {
    // const recaptchaToken = await getRecaptchaToken();
    // Pass recaptchaToken along to your backend/Cloud Function for verification if enabled.

    await addDoc(collection(db, "feedback"), {
      name: nameInput.value.trim() || "Anonymous",
      email: emailInput.value.trim() || "",
      rating: selectedRating,
      message: messageValue,
      createdAt: serverTimestamp(),
      approved: true
    });

    form.reset();
    selectedRating = 0;
    paintRatingStars(0);
    successMsg.classList.add("is-visible");
  } catch (err) {
    console.error("Error submitting feedback:", err);
    errorMsg.classList.add("is-visible");
  } finally {
    setLoading(false);
  }
});

/* ------------------------------------------------------------
   Realtime reviews feed (newest first, approved only)
------------------------------------------------------------ */
function subscribeToReviews() {
  const reviewsQuery = query(
    collection(db, "feedback"),
    where("approved", "==", true),
    orderBy("createdAt", "desc")
  );

  onSnapshot(
    reviewsQuery,
    (snapshot) => {
      const reviews = snapshot.docs.map((doc) => doc.data());
      renderSummary(reviews);
      renderReviews(reviews);
    },
    (err) => {
      console.error("Error loading reviews:", err);
      if (summaryCountEl) summaryCountEl.textContent = "Unable to load reviews right now.";
    }
  );
}

function renderSummary(reviews) {
  const total = reviews.length;

  if (total === 0) {
    summaryStarsEl.innerHTML = starsMarkup(0);
    summaryAvgEl.textContent = "–";
    summaryCountEl.textContent = "No reviews yet";
    return;
  }

  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  const average = sum / total;

  summaryStarsEl.innerHTML = starsMarkup(Math.round(average));
  summaryAvgEl.textContent = average.toFixed(1);
  summaryCountEl.textContent = `Based on ${total} Review${total === 1 ? "" : "s"}`;
}

function renderReviews(reviews) {
  // Remove previously rendered cards, keep the "empty state" element in the DOM.
  reviewsList.querySelectorAll(".share__review-card").forEach((el) => el.remove());

  if (reviews.length === 0) {
    reviewsEmpty.style.display = "block";
    return;
  }

  reviewsEmpty.style.display = "none";

  const fragment = document.createDocumentFragment();

  reviews.forEach((review) => {
    const card = document.createElement("div");
    card.className = "share__review-card";
    card.innerHTML = `
      <div class="share__review-stars">${starsMarkup(review.rating)}</div>
      <p class="share__review-text">"${escapeHTML(review.message)}"</p>
      <div class="share__review-footer">
        <span class="share__review-name">${escapeHTML(review.name || "Anonymous")}</span>
        <span class="share__review-date">${formatDate(review.createdAt)}</span>
      </div>
    `;
    fragment.appendChild(card);
  });

  reviewsList.appendChild(fragment);
}

subscribeToReviews();
