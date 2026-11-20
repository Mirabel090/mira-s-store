/* ==========================================================
   routes/auth.js
   POST /api/auth/login             public
   POST /api/auth/change-password   admin only
   ========================================================== */

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const requireAdmin = require("../middleware/auth");

const router = express.Router();

/* ---------- Simple brute-force protection ---------- */
const attempts = new Map();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

function isBlocked(ip) {
  const entry = attempts.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.start > WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip) {
  const entry = attempts.get(ip);
  if (!entry || Date.now() - entry.start > WINDOW_MS) {
    attempts.set(ip, { count: 1, start: Date.now() });
  } else {
    entry.count++;
  }
}

// Used when the email doesn't exist, so the response takes the same time either way
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

/* ---------- Login ---------- */
router.post("/login", async (req, res) => {
  const body = req.body || {};
  const ip = req.ip;

  if (isBlocked(ip)) {
    return res.status(429).json({ message: "Too many attempts. Please try again in 15 minutes." });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return res.status(400).json({ message: "Please enter your email and password." });
  }

  try {
    const result = await pool.query(
      "SELECT id, email, password_hash FROM admins WHERE email = $1",
      [email]
    );
    const admin = result.rows[0];

    const valid = await bcrypt.compare(password, admin ? admin.password_hash : DUMMY_HASH);

    if (!admin || !valid) {
      recordFailure(ip);
      return res.status(401).json({ message: "Invalid email or password." });
    }

    attempts.delete(ip);

    const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_SECRET, {
      expiresIn: "8h",
    });

    res.json({ token });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

/* ---------- Change password (admin must be logged in) ---------- */
router.post("/change-password", requireAdmin, async (req, res) => {
  const body = req.body || {};
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Please fill in both password fields." });
  }
  if (newPassword.length < 12 || newPassword.length > 72) {
    return res.status(400).json({ message: "New password must be 12 to 72 characters long." });
  }
  if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return res.status(400).json({ message: "New password must include letters and numbers." });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ message: "New password must be different from the current one." });
  }

  try {
    const result = await pool.query("SELECT password_hash FROM admins WHERE id = $1", [req.admin.id]);
    const admin = result.rows[0];
    if (!admin) return res.status(401).json({ message: "Please log in again." });

    const valid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!valid) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE admins SET password_hash = $1 WHERE id = $2", [hash, req.admin.id]);

    res.json({ message: "Password updated." });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Could not update the password." });
  }
});

module.exports = router;