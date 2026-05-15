const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { generateTicket } = require('../utils/ticket');

const router = express.Router();

// GET /api/reports — student gets own reports; admin gets all
router.get('/', requireAuth, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'admin') {
      result = await pool.query(
        `SELECT lr.*, p.full_name AS student_name, p.email AS student_email
         FROM lost_reports lr
         JOIN profiles p ON lr.student_id = p.id
         ORDER BY lr.created_at DESC`
      );
    } else {
      result = await pool.query(
        'SELECT * FROM lost_reports WHERE student_id = $1 ORDER BY created_at DESC',
        [req.user.id]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/reports — student submits a lost item report
router.post('/', requireAuth, async (req, res) => {
  const { item_name, category, location_lost, date_lost, description, image_url } = req.body;

  if (!item_name) {
    return res.status(400).json({ error: 'Item name is required' });
  }

  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const ticket = generateTicket();
      const result = await pool.query(
        `INSERT INTO lost_reports
           (ticket_number, student_id, item_name, category, location_lost, date_lost, description, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [ticket, req.user.id, item_name, category, location_lost, date_lost, description, image_url]
      );

      const io = req.app.get('io');
      if (io) {
        io.to('admin').emit('report:new', {
          id: result.rows[0].id,
          ticket_number: result.rows[0].ticket_number,
          item_name: result.rows[0].item_name,
        });
      }

      return res.status(201).json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505' && err.constraint && err.constraint.includes('ticket_number')) {
        continue; // collision — try a new ticket
      }
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  res.status(500).json({ error: 'Could not generate a unique ticket. Please try again.' });
});

// GET /api/reports/unviewed-count — admin: how many lost_reports the admin hasn't opened yet.
// Declared BEFORE the `:id` route so Express doesn't treat "unviewed-count" as an id.
router.get('/unviewed-count', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS count FROM lost_reports WHERE viewed_by_admin = false'
    );
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/:id — get single report (student owns it or admin)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT lr.*, p.full_name AS student_name, p.email AS student_email
       FROM lost_reports lr
       JOIN profiles p ON lr.student_id = p.id
       WHERE lr.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });

    const report = result.rows[0];
    if (req.user.role !== 'admin' && report.student_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/reports/:id/match — admin matches a report to a found item
router.patch('/:id/match', requireAdmin, async (req, res) => {
  const { found_item_id } = req.body;

  if (!found_item_id) {
    return res.status(400).json({ error: 'found_item_id is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE lost_reports SET status = 'Matched', matched_item_id = $1 WHERE id = $2`,
      [found_item_id, req.params.id]
    );

    await client.query(
      `UPDATE found_items SET status = 'Matched' WHERE id = $1`,
      [found_item_id]
    );

    await client.query('COMMIT');

    const result = await pool.query('SELECT * FROM lost_reports WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// PATCH /api/reports/:id/unmatch — admin clears a match
router.patch('/:id/unmatch', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reportResult = await client.query(
      'SELECT matched_item_id FROM lost_reports WHERE id = $1',
      [req.params.id]
    );
    if (reportResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Report not found' });
    }

    const { matched_item_id } = reportResult.rows[0];

    await client.query(
      `UPDATE lost_reports SET status = 'Pending', matched_item_id = NULL WHERE id = $1`,
      [req.params.id]
    );

    if (matched_item_id) {
      await client.query(
        `UPDATE found_items SET status = 'Unclaimed' WHERE id = $1`,
        [matched_item_id]
      );
    }

    await client.query('COMMIT');
    const result = await pool.query('SELECT * FROM lost_reports WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// PATCH /api/reports/:id/viewed — admin marks a single report as viewed.
// Idempotent: no-op if already viewed.
router.patch('/:id/viewed', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE lost_reports SET viewed_by_admin = true
        WHERE id = $1
        RETURNING id, viewed_by_admin`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/reports/:id/resolve — admin marks report as resolved
router.patch('/:id/resolve', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reportResult = await client.query(
      `UPDATE lost_reports SET status = 'Resolved' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (reportResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Report not found' });
    }

    const { matched_item_id } = reportResult.rows[0];
    if (matched_item_id) {
      await client.query(
        `UPDATE found_items SET status = 'Returned' WHERE id = $1`,
        [matched_item_id]
      );
    }

    await client.query('COMMIT');
    res.json(reportResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
