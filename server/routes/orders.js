/* ==========================================================
   routes/orders.js
   POST /api/orders              public (used by checkout)
   GET  /api/orders/summary      admin: how many orders per status
   GET  /api/orders              admin: list orders (?status=new)
   GET  /api/orders/:id          admin: one order with its items
   PUT  /api/orders/:id/status   admin: change the status
   Prices are read from the database, never trusted from the browser
   ========================================================== */

const express = require("express");
const crypto = require("crypto");
const pool = require("../db");
const requireAdmin = require("../middleware/auth");

const router = express.Router();

const STATUSES = ["new", "confirmed", "delivered", "cancelled"];

/* ==========================================================
   PUBLIC: place an order
   ========================================================== */
router.post("/", async (req, res) => {
  const body = req.body || {};
  const c = body.customer || {};

  const customer = {
    fullName: String(c.fullName || "").trim(),
    phone: String(c.phone || "").trim(),
    email: String(c.email || "").trim(),
    address: String(c.address || "").trim(),
    city: String(c.city || "").trim(),
    state: String(c.state || "").trim(),
  };
  const notes = String(body.notes || "").trim();

  /* ---------- Check the customer details ---------- */
  if (!customer.fullName || customer.fullName.length > 120) {
    return res.status(400).json({ message: "Please enter your full name." });
  }
  if (!/^[0-9+\s()-]{7,20}$/.test(customer.phone)) {
    return res.status(400).json({ message: "Please enter a valid phone number." });
  }
  if (customer.email && (customer.email.length > 255 || !/^\S+@\S+\.\S+$/.test(customer.email))) {
    return res.status(400).json({ message: "Please enter a valid email address." });
  }
  if (!customer.address || customer.address.length > 500) {
    return res.status(400).json({ message: "Please enter your delivery address." });
  }
  if (!customer.city || !customer.state || customer.city.length > 80 || customer.state.length > 80) {
    return res.status(400).json({ message: "Please enter your city and state." });
  }
  if (notes.length > 500) {
    return res.status(400).json({ message: "Order notes are too long." });
  }

  /* ---------- Check the items (only ids and quantities are used) ---------- */
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50) {
    return res.status(400).json({ message: "Your cart is empty." });
  }

  const wanted = new Map(); // product id -> quantity
  for (const item of body.items) {
    const id = Number(item.productId);
    const qty = Number(item.qty);
    if (!Number.isInteger(id) || !Number.isInteger(qty) || qty < 1 || qty > 10) {
      return res.status(400).json({ message: "Invalid items in your cart." });
    }
    wanted.set(id, Math.min((wanted.get(id) || 0) + qty, 10));
  }

  /* ---------- Save the order ---------- */
  const client = await pool.connect();
  try {
    const found = await client.query(
      "SELECT id, name, price FROM products WHERE id = ANY($1::int[])",
      [[...wanted.keys()]]
    );

    if (found.rows.length !== wanted.size) {
      return res.status(400).json({
        message: "Some items in your cart are no longer available. Please review your cart.",
      });
    }

    let total = 0;
    for (const product of found.rows) {
      total += product.price * wanted.get(product.id);
    }

    const reference = "ORD-" + crypto.randomBytes(4).toString("hex").toUpperCase();

    await client.query("BEGIN");

    const orderResult = await client.query(
      `INSERT INTO orders
         (reference, full_name, phone, email, address, city, state, notes, payment_method, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pay on Delivery', $9)
       RETURNING id`,
      [reference, customer.fullName, customer.phone, customer.email, customer.address,
       customer.city, customer.state, notes, total]
    );
    const orderId = orderResult.rows[0].id;

    for (const product of found.rows) {
      await client.query(
        "INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES ($1, $2, $3, $4, $5)",
        [orderId, product.id, product.name, product.price, wanted.get(product.id)]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ reference });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(error.message);
    res.status(500).json({ message: "Could not place your order. Please try again." });
  } finally {
    client.release();
  }
});

/* ==========================================================
   ADMIN ONLY
   ========================================================== */

/* ---------- Count of orders per status ---------- */
// Must stay ABOVE "/:id" so "summary" is not read as an id
router.get("/summary", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status"
    );
    const summary = {};
    for (const row of result.rows) summary[row.status] = row.count;
    res.json(summary);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Could not load order counts." });
  }
});

/* ---------- List orders, newest first ---------- */
router.get("/", requireAdmin, async (req, res) => {
  const status = String(req.query.status || "");
  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid status." });
  }

  try {
    const params = [];
    let where = "";
    if (status) {
      params.push(status);
      where = "WHERE o.status = $1";
    }

    const result = await pool.query(
      `SELECT o.id, o.reference, o.full_name, o.phone, o.total, o.status, o.created_at,
              COALESCE(SUM(i.qty), 0)::int AS item_count
       FROM orders o
       LEFT JOIN order_items i ON i.order_id = o.id
       ${where}
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT 200`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Could not load orders." });
  }
});

/* ---------- One order with its items ---------- */
router.get("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Invalid order id." });
  }

  try {
    const orderResult = await pool.query(
      `SELECT id, reference, full_name, phone, email, address, city, state,
              notes, payment_method, total, status, created_at
       FROM orders WHERE id = $1`,
      [id]
    );
    if (orderResult.rowCount === 0) {
      return res.status(404).json({ message: "Order not found." });
    }

    const itemsResult = await pool.query(
      "SELECT product_id, name, price, qty FROM order_items WHERE order_id = $1 ORDER BY id",
      [id]
    );

    res.json({ ...orderResult.rows[0], items: itemsResult.rows });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Could not load the order." });
  }
});

/* ---------- Change an order's status ---------- */
router.put("/:id/status", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const status = String((req.body || {}).status || "");

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Invalid order id." });
  }
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid status." });
  }

  try {
    const result = await pool.query(
      "UPDATE orders SET status = $1 WHERE id = $2 RETURNING id, status",
      [status, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Order not found." });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Could not update the order." });
  }
});

module.exports = router;