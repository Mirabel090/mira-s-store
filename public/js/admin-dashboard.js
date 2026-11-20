/* ==========================================================
   admin-dashboard.js — Product list with Edit and Delete,
   plus the new-orders counter
   Depends on main.js and admin-api.js
   ========================================================== */

requireAdmin(); // not signed in? go back to login

const rowsBox = document.getElementById("product-rows");
const messageBox = document.getElementById("dashboard-message");

/* ---------- Stats ---------- */
function renderStats(products) {
  document.getElementById("stat-total").textContent = products.length;
  document.getElementById("stat-categories").textContent = new Set(products.map((p) => p.category)).size;
  document.getElementById("stat-featured").textContent = products.filter((p) => p.featured).length;
}

// New orders: fills the stat card and the number beside the Orders link
async function loadOrderStats() {
  try {
    const summary = await adminGetOrderSummary();
    const newCount = summary.new || 0;

    document.getElementById("stat-new-orders").textContent = newCount;
    document.getElementById("stat-new-card").classList.toggle("has-new", newCount > 0);
    document.getElementById("orders-link").textContent = newCount > 0 ? `Orders (${newCount})` : "Orders";
  } catch (error) {
    // leave the counter at 0; the products list still works
  }
}

/* ---------- Table ---------- */
function renderRows(products) {
  if (products.length === 0) {
    rowsBox.innerHTML = `
      <tr><td colspan="6" class="text-center">
        No products yet. <a href="add-product.html" class="link-btn">Add your first product</a>
      </td></tr>`;
    return;
  }

  rowsBox.innerHTML = products
    .map(
      (p) => `
        <tr>
          <td><img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" /></td>
          <td><strong>${escapeHTML(p.name)}</strong></td>
          <td><span class="badge">${escapeHTML(p.category)}</span></td>
          <td>${formatPrice(p.price)}</td>
          <td>${p.featured ? "Yes" : "No"}</td>
          <td>
            <div class="row-actions">
              <a href="add-product.html?id=${p.id}" class="btn btn-outline btn-sm">Edit</a>
              <button type="button" class="btn btn-danger btn-sm" data-delete="${p.id}">Delete</button>
            </div>
          </td>
        </tr>`
    )
    .join("");
}

function showMessage(text, type) {
  messageBox.innerHTML = "";
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.textContent = text;
  messageBox.appendChild(alert);
}

async function loadDashboard() {
  try {
    const products = await getProducts();
    renderStats(products);
    renderRows(products);
  } catch (error) {
    rowsBox.innerHTML = `<tr><td colspan="6" class="text-center">Could not load products. Please refresh.</td></tr>`;
  }
}

/* ---------- Delete ---------- */
rowsBox.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;

  const id = Number(button.dataset.delete);
  if (!confirm("Delete this product? This cannot be undone.")) return;

  button.disabled = true;

  try {
    await adminDeleteProduct(id);
    showMessage("Product deleted.", "success");
    loadDashboard();
  } catch (error) {
    button.disabled = false;
    showMessage(error.message || "Could not delete the product. Please try again.", "error");
  }
});

/* ---------- Logout ---------- */
document.getElementById("logout-btn").addEventListener("click", logoutAdmin);

/* ---------- Start ---------- */
loadDashboard();
loadOrderStats();