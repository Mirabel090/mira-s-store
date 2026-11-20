/* ==========================================================
   admin-orders.js — Orders list, details and status updates
   Depends on main.js (formatPrice, escapeHTML) and admin-api.js
   ========================================================== */

requireAdmin(); // not signed in? go back to login

const rowsBox = document.getElementById("order-rows");
const filtersBox = document.getElementById("status-filters");
const messageBox = document.getElementById("orders-message");
const modal = document.getElementById("order-modal");
const modalContent = document.getElementById("modal-content");

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "confirmed", label: "Confirmed" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

// Which buttons to show for each status
const ACTIONS = {
  new: [
    { status: "confirmed", label: "Confirm order", cls: "btn-primary" },
    { status: "cancelled", label: "Cancel order", cls: "btn-danger" },
  ],
  confirmed: [
    { status: "delivered", label: "Mark as delivered", cls: "btn-primary" },
    { status: "cancelled", label: "Cancel order", cls: "btn-danger" },
  ],
  delivered: [],
  cancelled: [{ status: "new", label: "Reopen order", cls: "btn-outline" }],
};

// ?status=new in the address opens that tab (the dashboard links here)
let currentFilter = new URLSearchParams(window.location.search).get("status") || "all";
if (!STATUS_TABS.some((tab) => tab.key === currentFilter)) currentFilter = "all";

/* ---------- Helpers ---------- */
function formatDate(iso) {
  return new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

function statusPill(status) {
  const safe = escapeHTML(status);
  return `<span class="status status-${safe}">${safe}</span>`;
}

function showMessage(text, type) {
  messageBox.innerHTML = "";
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.textContent = text;
  messageBox.appendChild(alert);
}

function showModalMessage(text, type) {
  const box = document.getElementById("modal-message");
  if (!box) return;
  box.innerHTML = "";
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.textContent = text;
  box.appendChild(alert);
}

/* ---------- Status buttons with counts ---------- */
function renderFilters(summary) {
  const total = Object.values(summary).reduce((sum, n) => sum + n, 0);

  filtersBox.innerHTML = STATUS_TABS.map((tab) => {
    const count = tab.key === "all" ? total : summary[tab.key] || 0;
    return `
      <button type="button" class="filter-btn ${tab.key === currentFilter ? "active" : ""}" data-filter="${tab.key}">
        ${tab.label} (${count})
      </button>`;
  }).join("");
}

/* ---------- Orders table ---------- */
function renderRows(orders) {
  if (orders.length === 0) {
    const label = currentFilter === "all" ? "" : currentFilter + " ";
    rowsBox.innerHTML = `<tr><td colspan="8" class="text-center">No ${label}orders yet.</td></tr>`;
    return;
  }

  rowsBox.innerHTML = orders
    .map(
      (o) => `
        <tr class="order-row" data-id="${o.id}">
          <td><strong>${escapeHTML(o.reference)}</strong></td>
          <td>${escapeHTML(o.full_name)}</td>
          <td>${escapeHTML(o.phone)}</td>
          <td>${o.item_count}</td>
          <td>${formatPrice(o.total)}</td>
          <td>${formatDate(o.created_at)}</td>
          <td>${statusPill(o.status)}</td>
          <td><button type="button" class="btn btn-outline btn-sm">View</button></td>
        </tr>`
    )
    .join("");
}

async function loadOrders() {
  try {
    const [summary, orders] = await Promise.all([
      adminGetOrderSummary(),
      adminGetOrders(currentFilter),
    ]);
    renderFilters(summary);
    renderRows(orders);
  } catch (error) {
    rowsBox.innerHTML = `<tr><td colspan="8" class="text-center">${escapeHTML(
      error.message || "Could not load orders."
    )}</td></tr>`;
  }
}

/* ---------- Order details popup ---------- */
function renderOrderDetail(order) {
  const itemRows = order.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHTML(item.name)}</td>
          <td class="num">${item.qty}</td>
          <td class="num">${formatPrice(item.price)}</td>
          <td class="num">${formatPrice(item.price * item.qty)}</td>
        </tr>`
    )
    .join("");

  const actions = (ACTIONS[order.status] || [])
    .map(
      (a) =>
        `<button type="button" class="btn ${a.cls}" data-status="${a.status}" data-id="${order.id}">${a.label}</button>`
    )
    .join("");

  modalContent.innerHTML = `
    <div class="modal-head">
      <div>
        <h2 id="modal-title">${escapeHTML(order.reference)}</h2>
        <p>${formatDate(order.created_at)}</p>
      </div>
      <div class="modal-head-side">
        ${statusPill(order.status)}
        <button type="button" class="modal-close" data-close aria-label="Close">&times;</button>
      </div>
    </div>

    <div id="modal-message"></div>

    <div class="order-info-grid">
      <div class="order-info-block">
        <h4>Customer</h4>
        <p>${escapeHTML(order.full_name)}</p>
        <p><a href="tel:${escapeHTML(order.phone)}">${escapeHTML(order.phone)}</a></p>
        ${order.email ? `<p>${escapeHTML(order.email)}</p>` : ""}
      </div>
      <div class="order-info-block">
        <h4>Delivery address</h4>
        <p>${escapeHTML(order.address)}</p>
        <p>${escapeHTML(order.city)}, ${escapeHTML(order.state)}</p>
      </div>
      <div class="order-info-block">
        <h4>Payment</h4>
        <p>${escapeHTML(order.payment_method)}</p>
      </div>
      <div class="order-info-block">
        <h4>Order notes</h4>
        <p>${order.notes ? escapeHTML(order.notes) : "None"}</p>
      </div>
    </div>

    <table class="order-items">
      <thead>
        <tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Subtotal</th></tr>
      </thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr><td colspan="3">Total</td><td class="num">${formatPrice(order.total)}</td></tr>
      </tfoot>
    </table>

    <div class="order-actions">
      ${actions || "<p>This order is complete.</p>"}
    </div>
  `;
}

function closeModal() {
  modal.classList.add("hidden");
  document.body.style.overflow = "";
}

async function openOrder(id) {
  modalContent.innerHTML = `<p class="text-center">Loading order...</p>`;
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  try {
    const order = await adminGetOrder(id);
    renderOrderDetail(order);
  } catch (error) {
    modalContent.innerHTML = `
      <p class="text-center">${escapeHTML(error.message || "Could not load the order.")}</p>
      <div class="order-actions">
        <button type="button" class="btn btn-outline" data-close>Close</button>
      </div>`;
  }
}

/* ---------- Clicks ---------- */
// Status tabs
filtersBox.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;

  currentFilter = button.dataset.filter;
  const query = currentFilter === "all" ? window.location.pathname : `?status=${currentFilter}`;
  history.replaceState(null, "", query);
  loadOrders();
});

// Open an order
rowsBox.addEventListener("click", (event) => {
  const row = event.target.closest("[data-id]");
  if (row) openOrder(Number(row.dataset.id));
});

// Inside the popup: close, or change status
modalContent.addEventListener("click", async (event) => {
  if (event.target.closest("[data-close]")) {
    closeModal();
    return;
  }

  const button = event.target.closest("[data-status]");
  if (!button) return;

  const id = Number(button.dataset.id);
  const status = button.dataset.status;

  if (status === "cancelled" && !confirm("Cancel this order?")) return;

  button.disabled = true;

  try {
    await adminUpdateOrderStatus(id, status);
    const order = await adminGetOrder(id);
    renderOrderDetail(order);
    showModalMessage(`Order marked as ${status}.`, "success");
    loadOrders(); // refresh the list and the counts behind the popup
  } catch (error) {
    button.disabled = false;
    showModalMessage(error.message || "Could not update the order.", "error");
  }
});

// Click the dark background, or press Esc, to close
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
});

document.getElementById("refresh-btn").addEventListener("click", loadOrders);
document.getElementById("logout-btn").addEventListener("click", logoutAdmin);

/* ---------- Start ---------- */
loadOrders();

// Check for new orders every minute while this page is open
setInterval(() => {
  if (!document.hidden) loadOrders();
}, 60000);