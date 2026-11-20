/* ==========================================================
   createAdmin.js — Creates the admin account in the database
   Usage:  npm run create-admin -- you@example.com YourStrongPassword
   ========================================================== */

const bcrypt = require("bcryptjs");
const pool = require("./db");

async function createAdmin() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.log("Usage: npm run create-admin -- <email> <password>");
    process.exit(1);
  }

  if (password.length < 8) {
    console.log("Please use a password with at least 8 characters.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);

  // If this email already exists, just update its password
  await pool.query(
    `INSERT INTO admins (email, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [email.trim().toLowerCase(), hash]
  );

  console.log(`Admin account ready for ${email.trim().toLowerCase()}`);
  await pool.end();
}

createAdmin().catch((error) => {
  console.error("Could not create admin:", error.message);
  process.exit(1);
});