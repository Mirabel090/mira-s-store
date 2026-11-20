/* ==========================================================
   product.js — Single product page
   Depends on main.js (getProducts, formatPrice, escapeHTML,
   renderProductCard, getCart, saveCart)
   ========================================================== */

const container = document.getElementById("product-container");
const relatedSection = document.getElementById("related-section");
const relatedGrid = document.getElementById("related-products");

let quantity = 1;

/* ---------- Not found ---------- */
function showNotFound() {
  document.getElementById("page-title").textContent = "Product not found | Oakline Furniture";
  container.innerHTML = `
    <div class="empty-state text-center">
      <h2>Product not found</h2>
      <p class="mt-1">This product may have been removed.</p>
      <a href="shop.html" class="btn btn-primary mt-2">Back to Shop</a>
    </div>`;
}

/* ---------- Product layout ---------- */
function renderProduct(product) {
  document.getElementById("page-title").textContent = `${product.name} | Oakline Furniture`;

  container.innerHTML = `
    <nav class="breadcrumb">
      <a href="index.html">Home</a><span>/</span>
      <a href="shop.html">Shop</a><span>/</span>
      <a href="shop.html?category=${encodeURIComponent(product.category)}">${escapeHTML(product.category)}</a>
    </nav>

    <div class="product-detail">
      <div class="product-detail-image">
        <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}" />
      </div>

      <div class="product-detail-info">
        <span class="product-category">${escapeHTML(product.category)}</span>
        <h1>${escapeHTML(product.name)}</h1>
        <p class="detail-price">${formatPrice(product.price)}</p>
        <p class="detail-description">${escapeHTML(product.description || "")}</p>

        <ul class="detail-meta">
          <li><span>Category</span><span>${escapeHTML(product.category)}</span></li>
          <li><span>Availability</span><span>In stock</span></li>
          <li><span>Delivery</span><span>Nationwide</span></li>
        </ul>

        <div class="detail-actions">
          <div class="qty-selector">
            <button type="button" id="qty-minus" aria-label="Decrease quantity">&minus;</button>
            <span id="qty-value">1</span>
            <button type="button" id="qty-plus" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="btn btn-primary" id="add-btn">Add to Cart</button>
        </div>
      </div>
    </div>
  `;

  setupQuantityControls(product);
}

/* ---------- Quantity and Add to Cart ---------- */
function setupQuantityControls(product) {
  const qtyValue = document.getElementById("qty-value");
  const addBtn = document.getElementById("add-btn");

  document.getElementById("qty-minus").addEventListener("click", () => {
    if (quantity > 1) quantity--;
    qtyValue.textContent = quantity;
  });

  document.getElementById("qty-plus").addEventListener("click", () => {
    if (quantity < 10) quantity++;
    qtyValue.textContent = quantity;
  });

  addBtn.addEventListener("click", () => {
    const cart = getCart();
    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      existing.qty += quantity;
    } else {
      cart.push({ id: product.id, qty: quantity });
    }
    saveCart(cart);

    addBtn.textContent = "Added ✓";
    setTimeout(() => (addBtn.textContent = "Add to Cart"), 1200);
  });
}

/* ---------- Related products ---------- */
function renderRelated(product, allProducts) {
  const related = allProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  if (related.length === 0) return;

  relatedGrid.innerHTML = related.map(renderProductCard).join("");
  relatedSection.classList.remove("hidden");
}

/* ---------- Start ---------- */
async function initProduct() {
  const id = Number(new URLSearchParams(window.location.search).get("id"));

  if (!id) {
    showNotFound();
    return;
  }

  let allProducts;
  try {
    allProducts = await getProducts();
  } catch (error) {
    container.innerHTML = `
      <div class="empty-state text-center">
        <h2>Something went wrong</h2>
        <p class="mt-1">We couldn't load this product. Please refresh the page.</p>
      </div>`;
    return;
  }

  const product = allProducts.find((p) => p.id === id);

  if (!product) {
    showNotFound();
    return;
  }

  renderProduct(product);
  renderRelated(product, allProducts);
}

initProduct();