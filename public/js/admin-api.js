/* ==========================================================
   admin-api.js — Everything the admin pages do to the data
   Depends on main.js (getProducts)
   Every request sends the login token; the server checks it.
   ========================================================== */

/* ---------- Session ---------- */
function getAdminToken() {
  return sessionStorage.getItem("adminToken");
}

// Call at the top of every admin page: sends visitors to login if not signed in
function requireAdmin() {
  if (!getAdminToken()) {
    window.location.replace("login.html");
  }
}

function logoutAdmin() {
  sessionStorage.removeItem("adminToken");
  window.location.href = "login.html";
}

/* ---------- Request helper ---------- */
async function adminRequest(url, method, body) {
  let response;
  try {
    response = await fetch(url, {
      method,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + getAdminToken(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new Error("Could not reach the server. Please try again.");
  }

  // Token missing, expired or fake: sign out and go to login
  if (response.status === 401) {
    logoutAdmin();
    throw new Error("Session expired. Please log in again.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

/* ---------- Products ---------- */
async function adminDeleteProduct(id) {
  return adminRequest("/api/products/" + id, "DELETE");
}

// Creates a new product, or updates one if it already has an id
async function adminSaveProduct(product) {
  if (product.id) {
    return adminRequest("/api/products/" + product.id, "PUT", product);
  }
  return adminRequest("/api/products", "POST", product);
}

/* ---------- Product images ---------- */
// Uploads one image (already shrunk to a JPEG by the browser). Returns { url }
async function adminUploadImage(blob) {
  let response;
  try {
    response = await fetch("/api/images", {
      method: "POST",
      headers: {
        "Content-Type": "image/jpeg",
        Authorization: "Bearer " + getAdminToken(),
      },
      body: blob,
    });
  } catch (error) {
    throw new Error("Could not reach the server. Please try again.");
  }

  if (response.status === 401) {
    logoutAdmin();
    throw new Error("Session expired. Please log in again.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Could not upload the image.");
  return data; // { url: "/api/images/5" }
}

/* ---------- Password ---------- */
async function adminChangePassword(currentPassword, newPassword) {
  return adminRequest("/api/auth/change-password", "POST", { currentPassword, newPassword });
}

/* ---------- Orders ---------- */
// How many orders in each status, e.g. { new: 2, delivered: 5 }
async function adminGetOrderSummary() {
  return adminRequest("/api/orders/summary", "GET");
}

// List of orders, newest first. status: "all" | "new" | "confirmed" | "delivered" | "cancelled"
async function adminGetOrders(status) {
  const query = status && status !== "all" ? "?status=" + encodeURIComponent(status) : "";
  return adminRequest("/api/orders" + query, "GET");
}

// One order, including its items
async function adminGetOrder(id) {
  return adminRequest("/api/orders/" + id, "GET");
}

async function adminUpdateOrderStatus(id, status) {
  return adminRequest("/api/orders/" + id + "/status", "PUT", { status });
}