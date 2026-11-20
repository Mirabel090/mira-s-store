/* ==========================================================
   main.js — Shared logic used on every page
   ========================================================== */

/* ---------- 1. Settings ---------- */
const CURRENCY = { locale: "en-NG", code: "NGN" }; // change here to switch currency site-wide

/* ---------- 2. Helpers ---------- */
function formatPrice(amount) {
  return new Intl.NumberFormat(CURRENCY.locale, {
    style: "currency",
    currency: CURRENCY.code,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Prevents malicious text (e.g. from admin input) from running as HTML
function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* ---------- 3. Product data ---------- */
// The ONE function every page uses to get products (from the Neon database)
async function getProducts() {
  const response = await fetch("/api/products", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load products.");
  return response.json();
}

/* ---------- 4. Product card (reused on Home and Shop pages) ---------- */
function renderProductCard(product) {
  return `
    <article class="product-card">
      <a href="product.html?id=${product.id}" class="product-card-image">
        <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}" loading="lazy" />
      </a>
      <div class="product-card-body">
        <span class="product-category">${escapeHTML(product.category)}</span>
        <h3 class="product-name">
          <a href="product.html?id=${product.id}">${escapeHTML(product.name)}</a>
        </h3>
        <p class="product-price">${formatPrice(product.price)}</p>
        <button class="btn btn-primary" data-add-to-cart="${product.id}">Add to Cart</button>
      </div>
    </article>
  `;
}

/* ---------- 5. Cart (stored in the browser's localStorage) ---------- */
function getCart() {
  try {
    return JSON.parse(localStorage.getItem("cart")) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(productId) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === productId);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: productId, qty: 1 });
  }
  saveCart(cart);
}

function updateCartBadge() {
  const badge = document.getElementById("cart-count");
  if (!badge) return;
  badge.textContent = getCart().reduce((total, item) => total + item.qty, 0);
}

// One click handler for every "Add to Cart" button on the page
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-to-cart]");
  if (!button) return;

  addToCart(Number(button.dataset.addToCart));

  const original = button.textContent;
  button.textContent = "Added ✓";
  setTimeout(() => (button.textContent = original), 1200);
});

/* ---------- 6. Mobile menu ---------- */
const menuToggle = document.getElementById("menu-toggle");
const navLinks = document.getElementById("nav-links");

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
}

/* ---------- 7. Page setup ---------- */
async function loadFeaturedProducts() {
  const container = document.getElementById("featured-products");
  if (!container) return; // not on the home page

  try {
    const products = await getProducts();
    const featured = products.filter((p) => p.featured).slice(0, 4);
    container.innerHTML = featured.length
      ? featured.map(renderProductCard).join("")
      : `<p class="empty-state text-center">No featured products yet.</p>`;
  } catch (error) {
    container.innerHTML = `<p class="empty-state text-center">Could not load products. Please refresh the page.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  loadFeaturedProducts();

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
});