/* ==========================================================
   routes/images.js
   POST /api/images        admin only (uploads one JPEG)
   GET  /api/images/:id    public (shows the image)
   ========================================================== */

const express = require("express");
const pool = require("../db");
const requireAdmin = require("../middleware/auth");

const router = express.Router();

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB (the browser shrinks photos well below this)

/* ---------- Upload ---------- */
router.post(
  "/",
  requireAdmin,
  express.raw({ type: "image/jpeg", limit: MAX_BYTES }),
  async (req, res) => {
    const data = req.body;

    if (!Buffer.isBuffer(data) || data.length < 4) {
      return res.status(400).json({ message: "Please choose an image to upload." });
    }

    // Every real JPEG file starts with the bytes FF D8 FF
    if (!(data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff)) {
      return res.status(400).json({ message: "That file is not a valid image." });
    }

    try {
      const result = await pool.query(
        "INSERT INTO product_images (data, content_type) VALUES ($1, 'image/jpeg') RETURNING id",
        [data]
      );
      res.status(201).json({ url: "/api/images/" + result.rows[0].id });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ message: "Could not save the image." });
    }
  }
);

/* ---------- Show an image ---------- */
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).end();

  try {
    const result = await pool.query(
      "SELECT data, content_type FROM product_images WHERE id = $1",
      [id]
    );
    if (result.rowCount === 0) return res.status(404).end();

    res.set("Content-Type", result.rows[0].content_type);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.send(result.rows[0].data);
  } catch (error) {
    console.error(error.message);
    res.status(500).end();
  }
});

module.exports = router;