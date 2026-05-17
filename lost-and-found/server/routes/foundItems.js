const express = require('express');
const multer  = require('multer');
const path    = require('path');
const { createClient } = require('@supabase/supabase-js');
const pool    = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = 'found-items';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) &&
               allowed.test(file.mimetype);
    ok ? cb(null, true) : cb(new Error('Only image files are allowed'));
  },
});

// GET /api/found-items — admin only. Students must never see the inventory
// (see PURPOSE.md §4 "Students never see found items").
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { category, status } = req.query;
    let query = 'SELECT * FROM found_items WHERE 1=1';
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/found-items — admin adds a found item (multipart/form-data)
router.post('/', requireAdmin, upload.single('image'), async (req, res) => {
  const { item_name, category, location_found, date_found, description, storage_location } = req.body;

  if (!item_name) {
    return res.status(400).json({ error: 'Item name is required' });
  }

  let image_url = null;

  if (req.file) {
    const ext = path.extname(req.file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    image_url = urlData.publicUrl;
  }

  try {
    const result = await pool.query(
      `INSERT INTO found_items (item_name, category, location_found, date_found, description, image_url, storage_location, added_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [item_name, category, location_found, date_found || null, description, image_url, storage_location, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/found-items/:id — admin only (same reason as the list endpoint).
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM found_items WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/found-items/:id — admin only
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM found_items WHERE id = $1', [req.params.id]);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
