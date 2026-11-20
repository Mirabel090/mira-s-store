/* ==========================================================
   admin-change-password.js — Change the admin password
   Depends on admin-api.js (requireAdmin, adminChangePassword, logoutAdmin)
   ========================================================== */

requireAdmin(); // not signed in? go back to login

const passwordForm = document.getElementById("password-form");
const messageBox = document.getElementById("form-message");
const saveBtn = document.getElementById("save-btn");

function showMessage(text, type) {
  messageBox.innerHTML = "";
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.textContent = text; // textContent keeps this safe from injected HTML
  messageBox.appendChild(alert);
  messageBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  messageBox.innerHTML = "";

  const current = document.getElementById("currentPassword").value;
  const next = document.getElementById("newPassword").value;
  const confirm = document.getElementById("confirmPassword").value;

  if (!current || !next || !confirm) {
    showMessage("Please fill in all three fields.", "error");
    return;
  }
  if (next.length < 12) {
    showMessage("New password must be at least 12 characters.", "error");
    return;
  }
  if (next.length > 72) {
    showMessage("New password must be 72 characters or fewer.", "error");
    return;
  }
  if (!/[A-Za-z]/.test(next) || !/[0-9]/.test(next)) {
    showMessage("New password must include letters and numbers.", "error");
    return;
  }
  if (next === current) {
    showMessage("New password must be different from the current one.", "error");
    return;
  }
  if (next !== confirm) {
    showMessage("The new passwords do not match.", "error");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Updating...";

  try {
    await adminChangePassword(current, next);
    passwordForm.reset();
    showMessage("Password updated. Use it the next time you log in.", "success");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Update Password";
  }
});

document.getElementById("logout-btn").addEventListener("click", logoutAdmin);