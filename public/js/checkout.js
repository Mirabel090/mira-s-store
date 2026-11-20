/* ==========================================================
   checkout.js — Checkout page
   Depends on main.js (getProducts, formatPrice, escapeHTML,
   getCart, saveCart)
   ========================================================== */

const checkoutContainer = document.getElementById("checkout-container");

/* ---------- Sending the order to the server (saved in Neon) ---------- */
async function placeOrder(order) {
  let response;
  try {
    response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
  } catch (error) {
    throw new Error("Could not reach the server. Check your connection and try again.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Something went wrong while placing your order.");
  }
  return data; // { reference: "ORD-XXXXXXXX" }
}

/* ---------- Screens ---------- */
function renderEmpty() {
  checkoutContainer.innerHTML = `
    <div class="empty-state text-center">
      <h2>Your cart is empty</h2>
      <p class="mt-1">Add some products before checking out.</p>
      <a href="shop.html" class="btn btn-primary mt-2">Start Shopping</a>
    </div>`;
}

function renderSuccess(reference) {
  checkoutContainer.innerHTML = `
    <div class="order-success">
      <div class="success-icon">&#10003;</div>
      <h2>Thank you for your order!</h2>
      <p class="mt-1">We've received your order and will contact you shortly to confirm delivery.</p>
      <span class="order-ref">${escapeHTML(reference)}</span>
      <p>Please keep this reference number.</p>
      <a href="shop.html" class="btn btn-primary mt-2">Continue Shopping</a>
    </div>`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderCheckout(lines, total) {
  const summaryRows = lines
    .map(
      (line) => `
        <div class="summary-item">
          <span>${escapeHTML(line.name)} &times; ${line.qty}</span>
          <span>${formatPrice(line.price * line.qty)}</span>
        </div>`
    )
    .join("");

  checkoutContainer.innerHTML = `
    <div class="cart-layout">

      <form id="checkout-form" class="checkout-form-box" novalidate>
        <h3>Delivery Details</h3>

        <div id="form-message"></div>

        <div class="form-row">
          <div class="form-group">
            <label for="fullName">Full name</label>
            <input type="text" id="fullName" name="fullName" class="form-control" required autocomplete="name" />
          </div>
          <div class="form-group">
            <label for="phone">Phone number</label>
            <input type="tel" id="phone" name="phone" class="form-control" required autocomplete="tel" />
          </div>
        </div>

        <div class="form-group">
          <label for="email">Email (optional)</label>
          <input type="email" id="email" name="email" class="form-control" autocomplete="email" />
        </div>

        <div class="form-group">
          <label for="address">Delivery address</label>
          <textarea id="address" name="address" class="form-control" required autocomplete="street-address"></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="city">City</label>
            <input type="text" id="city" name="city" class="form-control" required />
          </div>
          <div class="form-group">
            <label for="state">State</label>
            <input type="text" id="state" name="state" class="form-control" required />
          </div>
        </div>

        <div class="form-group">
          <label for="notes">Order notes (optional)</label>
          <textarea id="notes" name="notes" class="form-control" placeholder="Landmarks, preferred delivery time..."></textarea>
        </div>

        <h3 class="mt-2">Payment</h3>
        <div class="payment-option">
          <span>&#10003;</span>
          <div>
            <strong>Pay on Delivery</strong>
            <p>Pay when your furniture arrives.</p>
          </div>
        </div>
      </form>

      <aside class="cart-summary">
        <h3>Your Order</h3>
        <div class="summary-items">${summaryRows}</div>
        <div class="summary-row">
          <span>Delivery</span>
          <span>Confirmed by phone</span>
        </div>
        <div class="summary-row summary-total">
          <span>Total</span>
          <span>${formatPrice(total)}</span>
        </div>
        <button type="submit" form="checkout-form" class="btn btn-primary btn-block" id="place-btn">
          Place Order
        </button>
        <p class="summary-note"><a href="cart.html" class="link-btn">&larr; Back to cart</a></p>
      </aside>

    </div>`;

  document
    .getElementById("checkout-form")
    .addEventListener("submit", (event) => handleSubmit(event, lines, total));
}

/* ---------- Validation ---------- */
function validate(data) {
  if (!data.fullName.trim()) return "Please enter your full name.";
  if (!/^[0-9+\s()-]{7,20}$/.test(data.phone.trim())) return "Please enter a valid phone number.";
  if (data.email.trim() && !/^\S+@\S+\.\S+$/.test(data.email.trim())) return "Please enter a valid email address.";
  if (!data.address.trim()) return "Please enter your delivery address.";
  if (!data.city.trim() || !data.state.trim()) return "Please enter your city and state.";
  return null;
}

function showMessage(text) {
  const box = document.getElementById("form-message");
  box.innerHTML = `<div class="alert alert-error">${escapeHTML(text)}</div>`;
  box.scrollIntoView({ behavior: "smooth", block: "center" });
}

/* ---------- Submit ---------- */
async function handleSubmit(event, lines, total) {
  event.preventDefault();

  const data = Object.fromEntries(new FormData(event.target).entries());
  const error = validate(data);
  if (error) {
    showMessage(error);
    return;
  }

  const button = document.getElementById("place-btn");
  button.disabled = true;
  button.textContent = "Placing order...";

  // Only ids and quantities matter: the server looks up the real prices itself
  const order = {
    customer: {
      fullName: data.fullName.trim(),
      phone: data.phone.trim(),
      email: data.email.trim(),
      address: data.address.trim(),
      city: data.city.trim(),
      state: data.state.trim(),
    },
    notes: data.notes.trim(),
    paymentMethod: "Pay on Delivery",
    items: lines.map((l) => ({ productId: l.id, qty: l.qty })),
  };

  try {
    const result = await placeOrder(order);
    saveCart([]); // empty the cart
    renderSuccess(result.reference);
  } catch (err) {
    button.disabled = false;
    button.textContent = "Place Order";
    showMessage(err.message || "Something went wrong while placing your order. Please try again.");
  }
}

/* ---------- Start ---------- */
async function initCheckout() {
  let products;
  try {
    products = await getProducts();
  } catch (error) {
    checkoutContainer.innerHTML = `
      <div class="empty-state text-center">
        <h2>Something went wrong</h2>
        <p class="mt-1">We couldn't load checkout. Please refresh the page.</p>
      </div>`;
    return;
  }

  // Match cart items with real product data (ignore deleted products)
  const lines = getCart()
    .map((item) => {
      const product = products.find((p) => p.id === item.id);
      return product ? { id: product.id, name: product.name, price: product.price, qty: item.qty } : null;
    })
    .filter(Boolean);

  if (lines.length === 0) {
    renderEmpty();
    return;
  }

  const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  renderCheckout(lines, total);
}

initCheckout();