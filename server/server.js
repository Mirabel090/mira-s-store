/* ==========================================================
   server.js — App entry point
   ========================================================== */

require("dotenv").config();
const express = require("express");
const path = require("path");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.error("Missing JWT_SECRET. Add it to your .env file.");
  process.exit(1);
}

/* ---------- Middleware ---------- */
app.use(express.json()); // lets the server read JSON sent by the pages

/* ---------- Test route: confirms the database connection works ---------- */
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*)::int AS products FROM products");
    res.json({ ok: true, products: result.rows[0].products });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ ok: false, message: "Database connection failed." });
  }
});

/* ---------- API routes (added in Step 12) ---------- */
 app.use("/api/auth", require("./routes/auth"));
 app.use("/api/products", require("./routes/products"));
 app.use("/api/orders", require("./routes/orders"));
 app.use("/api/images", require("./routes/images"));

// Any unknown /api address returns JSON instead of a web page
app.use("/api", (req, res) => {
  res.status(404).json({ message: "Not found." });
});

/* ---------- Serve the website ---------- */
app.use(express.static(path.join(__dirname, "..", "public")));

/* ---------- Start ---------- */
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});


/* ---------- Error handler ---------- */
app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid request." });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "That file is too large." });
  }
  console.error(error.message);
  res.status(500).json({ message: "Something went wrong." });
});