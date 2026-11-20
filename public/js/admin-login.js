/* ==========================================================
   admin-login.js — Admin login page
   ========================================================== */

const loginForm = document.getElementById("login-form");
const messageBox = document.getElementById("login-message");
const loginBtn = document.getElementById("login-btn");
const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("password-toggle");

/* ---------- Logging in (checked by the server against the database) ---------- */
async function loginAdmin(email, password) {
  let response;
  try {
    response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    throw new Error("Could not reach the server. Please try again.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Login failed. Please try again.");
  }
  return data; // { token: "..." }
}

/* ---------- Session ---------- */
// sessionStorage clears when the browser tab is closed
function saveSession(token) {
  sessionStorage.setItem("adminToken", token);
}

function isLoggedIn() {
  return Boolean(sessionStorage.getItem("adminToken"));
}

/* ---------- UI helpers ---------- */
function showError(text) {
  messageBox.innerHTML = "";
  const alert = document.createElement("div");
  alert.className = "alert alert-error";
  alert.textContent = text; // textContent keeps this safe from injected HTML
  messageBox.appendChild(alert);
}

function setLoading(isLoading) {
  loginBtn.disabled = isLoading;
  loginBtn.textContent = isLoading ? "Signing in..." : "Sign In";
}

/* ---------- Show / hide password ---------- */
passwordToggle.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  passwordToggle.textContent = isHidden ? "Hide" : "Show";
});

/* ---------- Submit ---------- */
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  messageBox.innerHTML = "";

  const email = document.getElementById("email").value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError("Please enter your email and password.");
    return;
  }

  setLoading(true);

  try {
    const result = await loginAdmin(email, password);
    saveSession(result.token);
    window.location.href = "dashboard.html";
  } catch (error) {
    setLoading(false);
    showError(error.message);
    passwordInput.value = "";
    passwordInput.focus();
  }
});

/* ---------- Already signed in? Skip the login page ---------- */
if (isLoggedIn()) {
  window.location.href = "dashboard.html";
}