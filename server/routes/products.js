/* ==========================================================
   routes/products.js
   GET    /api/products        public
   POST   /api/products        admin only
   PUT    /api/products/:id    admin only
   DELETE /api/products/:id    admin only
   ========================================================== */

const express = require("express");
const pool = require("../db");
const requireAdmin = require("../middleware/auth");

const router = express.Router();

const COLUMNS = "id, name, category, price, image, description, featured";

/* ---------- Checks and cleans what the admin sends ---------- */
function cleanProduct(body) {
  const name = String(body.name || "").trim();
  const category = String(body.category || "").trim();
  const price = Number(body.price);
  let image = String(body.image || "").trim();
  const description = String(body.description || "").trim();
  const featured = body.featured === true;

  if (!name || name.length > 120) return { error: "Product name is required (max 120 characters)." };
  if (!category || category.length > 50) return { error: "Category is required (max 50 characters)." };
  if (!Number.isInteger(price) || price <= 0 || price > 2000000000) {
    return { error: "Price must be a whole number greater than zero." };
  }
  if (description.length > 600) return { error: "Description is too long (max 600 characters)." };

  if (!image) {
    image = "https://placehold.co/600x450/e8dccb/6f4a2d?text=" + encodeURIComponent(name);
  } else if (!/^https?:\/\//i.test(image) && !/^\/api\/images\/\d+$/.test(image)) {
    return { error: "Invalid product image." };
  }

  return { data: { name, category, price, image, description, featured } };
}

function readId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ message: "Invalid product id." });
    return null;
  }
  return id;
}

/* ---------- List all products (public) ---------- */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`SELECT ${COLUMNS} FROM products ORDER BY id`);
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Could not load products." });
  }
});

/* ---------- Add a product (admin) ---------- */
router.post("/", requireAdmin, async (req, res) => {
  const { data, error } = cleanProduct(req.body || {});
  if (error) return res.status(400).json({ message: error });

  try {
    const result = await pool.query(
      `INSERT INTO products (name, category, price, image, description, featured)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${COLUMNS}`,
      [data.name, data.category, data.price, data.image, data.description, data.featured]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Could not save the product." });
  }
});

/* ---------- Edit a product (admin) ---------- */
router.put("/:id", requireAdmin, async (req, res) => {
  const id = readId(req, res);
  if (id === null) return;

  const { data, error } = cleanProduct(req.body || {});
  if (error) return res.status(400).json({ message: error });

  try {
    const result = await pool.query(
      `UPDATE products
       SET name = $1, category = $2, price = $3, image = $4, description = $5, featured = $6
       WHERE id = $7
       RETURNING ${COLUMNS}`,
      [data.name, data.category, data.price, data.image, data.description, data.featured, id]
    );

    if (result.rowCount === 0) return res.status(404).json({ message: "Product not found." });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Could not update the product." });
  }
});

/* ---------- Delete a product (admin) ---------- */
router.delete("/:id", requireAdmin, async (req, res) => {
  const id = readId(req, res);
  if (id === null) return;

  try {
    const result = await pool.query("DELETE FROM products WHERE id = $1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: "Product not found." });
    res.json({ message: "Product deleted." });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Could not delete the product." });
  }
});

module.exports = router;