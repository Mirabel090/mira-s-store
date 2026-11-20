/* ==========================================================
   shop.js — Filtering, searching and sorting on the Shop page
   Depends on main.js (getProducts, renderProductCard, escapeHTML)
   ========================================================== */

let allProducts = [];

// Current filter state (initial values come from the URL)
const params = new URLSearchParams(window.location.search);
const state = {
  category: params.get("category") || "All",
  search: params.get("q") || "",
  sort: "default",
};

const grid = document.getElementById("product-grid");
const filtersBox = document.getElementById("category-filters");
const countText = document.getElementById("results-count");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");

/* ---------- Category buttons ---------- */
// Built from the products, so new categories added by the admin appear automatically
function renderCategoryButtons() {
  const categories = ["All", ...new Set(allProducts.map((p) => p.category))];

  filtersBox.innerHTML = categories
    .map(
      (cat) => `
        <button class="filter-btn ${cat === state.category ? "active" : ""}"
                data-category="${escapeHTML(cat)}">
          ${escapeHTML(cat)}
        </button>`
    )
    .join("");
}

/* ---------- Filter + sort ---------- */
function getVisibleProducts() {
  let list = [...allProducts];

  if (state.category !== "All") {
    list = list.filter((p) => p.category === state.category);
  }

  const term = state.search.trim().toLowerCase();
  if (term) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        (p.description || "").toLowerCase().includes(term)
    );
  }

  switch (state.sort) {
    case "price-asc":
      list.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      list.sort((a, b) => b.price - a.price);
      break;
    case "name-asc":
      list.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  return list;
}

/* ---------- Render ---------- */
function renderProducts() {
  const products = getVisibleProducts();

  countText.textContent = `${products.length} product${products.length === 1 ? "" : "s"} found`;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>No products found</h3>
        <p>Try a different search or category.</p>
      </div>`;
    return;
  }

  grid.innerHTML = products.map(renderProductCard).join("");
}

// Keeps the address bar in sync so filtered pages can be shared or bookmarked
function updateURL() {
  const newParams = new URLSearchParams();
  if (state.category !== "All") newParams.set("category", state.category);
  if (state.search.trim()) newParams.set("q", state.search.trim());

  const query = newParams.toString();
  history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
}

function refresh() {
  renderCategoryButtons();
  renderProducts();
  updateURL();
}

/* ---------- Events ---------- */
filtersBox.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;

  state.category = button.dataset.category;
  refresh();
});

searchInput.addEventListener("input", () => {
  state.search = searchInput.value;
  renderProducts();
  updateURL();
});

sortSelect.addEventListener("change", () => {
  state.sort = sortSelect.value;
  renderProducts();
});

/* ---------- Start ---------- */
async function initShop() {
  try {
    allProducts = await getProducts();
  } catch (error) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>Something went wrong</h3>
        <p>We couldn't load the products. Please refresh the page.</p>
      </div>`;
    return;
  }

  searchInput.value = state.search;
  refresh();
}

initShop();