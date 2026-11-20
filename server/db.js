/* ==========================================================
   db.js — Connection to the Neon PostgreSQL database
   ========================================================== */

require("dotenv").config();
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL. Add it to your .env file.");
  process.exit(1);
}

// A pool keeps a few connections open and reuses them
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (error) => {
  console.error("Unexpected database error:", error.message);
});

module.exports = pool;