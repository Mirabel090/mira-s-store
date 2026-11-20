/* ==========================================================
   cart.js — Cart page
   Depends on main.js (getProducts, formatPrice, escapeHTML,
   getCart, saveCart)
   ========================================================== */

const cartContainer = document.getElementById("cart-container");
let products = [];

/* ---------- Empty cart ---------- */
function renderEmpty() {
  cartContainer.innerHTML = `
    <div class="empty-state text-center">
      <h2>Your cart is empty</h2>
      <p class="mt-1">Looks like you haven't added anything yet.</p>
      <a href="shop.html" class="btn btn-primary mt-2">Start Shopping</a>
    </div>`;
}

/* ---------- One cart row ---------- */
function renderCartItem(product, qty) {
  return `
    <article class="cart-item">
      <a href="product.html?id=${product.id}" class="cart-item-image">
        <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}" />
      </a>

      <div class="cart-item-info">
        <span class="product-category">${escapeHTML(product.category)}</span>
        <h3><a href="product.html?id=${product.id}">${escapeHTML(product.name)}</a></h3>
        <p class="unit-price">${formatPrice(product.price)} each</p>
      </div>

      <div class="cart-item-side">
        <div class="qty-selector">
          <button type="button" data-action="decrease" data-id="${product.id}" aria-label="Decrease quantity">&minus;</button>
          <span>${qty}</span>
          <button type="button" data-action="increase" data-id="${product.id}" aria-label="Increase quantity">+</button>
        </div>
        <span class="line-total">${formatPrice(product.price * qty)}</span>
        <button type="button" class="remove-btn" data-action="remove" data-id="${product.id}">Remove</button>
      </div>
    </article>`;
}

/* ---------- Whole page ---------- */
function renderCart() {
  let cart = getCart();

  // Drop items whose product no longer exists (e.g. deleted by the admin)
  const cleaned = cart.filter((item) => products.some((p) => p.id === item.id));
  if (cleaned.length !== cart.length) {
    saveCart(cleaned);
    cart = cleaned;
  }

  if (cart.length === 0) {
    renderEmpty();
    return;
  }

  let subtotal = 0;
  let totalItems = 0;

  const rows = cart
    .map((item) => {
      const product = products.find((p) => p.id === item.id);
      subtotal += product.price * item.qty;
      totalItems += item.qty;
      return renderCartItem(product, item.qty);
    })
    .join("");

  cartContainer.innerHTML = `
    <div class="cart-layout">
      <div>
        ${rows}
        <div class="cart-actions">
          <a href="shop.html" class="link-btn">&larr; Continue shopping</a>
          <button type="button" class="link-btn" data-action="clear">Clear cart</button>
        </div>
      </div>

      <aside class="cart-summary">
        <h3>Order Summary</h3>
        <div class="summary-row">
          <span>Items (${totalItems})</span>
          <span>${formatPrice(subtotal)}</span>
        </div>
        <div class="summary-row">
          <span>Delivery</span>
          <span>Calculated at checkout</span>
        </div>
        <div class="summary-row summary-total">
          <span>Subtotal</span>
          <span>${formatPrice(subtotal)}</span>
        </div>
        <a href="checkout.html" class="btn btn-primary btn-block">Proceed to Checkout</a>
        <p class="summary-note">Secure checkout</p>
      </aside>
    </div>`;
}

/* ---------- Buttons (one handler for the whole page) ---------- */
cartContainer.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const id = Number(button.dataset.id);
  let cart = getCart();

  if (action === "clear") {
    if (!confirm("Remove all items from your cart?")) return;
    cart = [];
  } else {
    const item = cart.find((i) => i.id === id);
    if (!item) return;

    if (action === "increase" && item.qty < 10) item.qty++;
    if (action === "decrease" && item.qty > 1) item.qty--;
    if (action === "remove") cart = cart.filter((i) => i.id !== id);
  }

  saveCart(cart);
  renderCart();
});

/* ---------- Start ---------- */
async function initCart() {
  try {
    products = await getProducts();
  } catch (error) {
    cartContainer.innerHTML = `
      <div class="empty-state text-center">
        <h2>Something went wrong</h2>
        <p class="mt-1">We couldn't load your cart. Please refresh the page.</p>
      </div>`;
    return;
  }

  renderCart();
}

initCart();