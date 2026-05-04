const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/messages — admin gets all conversations; student gets their own
router.get('/', requireAuth, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'admin') {
      // All reports so admin can initiate chats on any of them
      result = await pool.query(
        `SELECT lr.id AS report_id, lr.item_name, lr.status,
                p.full_name AS student_name, p.email AS student_email,
                (SELECT content FROM messages WHERE report_id = lr.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                (SELECT created_at FROM messages WHERE report_id = lr.id ORDER BY created_at DESC LIMIT 1) AS last_message_at
         FROM lost_reports lr
         JOIN profiles p ON lr.student_id = p.id
         ORDER BY COALESCE(
           (SELECT created_at FROM messages WHERE report_id = lr.id ORDER BY created_at DESC LIMIT 1),
           lr.created_at
         ) DESC`
      );
    } else {
      // Show all student reports so they can start conversations with admin
      result = await pool.query(
        `SELECT lr.id AS report_id, lr.item_name, lr.status,
                (SELECT content FROM messages WHERE report_id = lr.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                (SELECT created_at FROM messages WHERE report_id = lr.id ORDER BY created_at DESC LIMIT 1) AS last_message_at
         FROM lost_reports lr
         WHERE lr.student_id = $1
         ORDER BY COALESCE(
           (SELECT created_at FROM messages WHERE report_id = lr.id ORDER BY created_at DESC LIMIT 1),
           lr.created_at
         ) DESC`,
        [req.user.id]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/messages/:reportId — get all messages for a report
router.get('/:reportId', requireAuth, async (req, res) => {
  try {
    // Verify access: student must own the report
    if (req.user.role !== 'admin') {
      const report = await pool.query(
        'SELECT student_id FROM lost_reports WHERE id = $1',
        [req.params.reportId]
      );
      if (report.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
      if (report.rows[0].student_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = await pool.query(
      `SELECT m.*, p.full_name AS sender_name
       FROM messages m
       JOIN profiles p ON m.sender_id = p.id
       WHERE m.report_id = $1
       ORDER BY m.created_at ASC`,
      [req.params.reportId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/messages/:reportId — send a message
router.post('/:reportId', requireAuth, async (req, res) => {
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  try {
    // Verify student owns the report (admins can message any report)
    if (req.user.role !== 'admin') {
      const report = await pool.query(
        'SELECT student_id FROM lost_reports WHERE id = $1',
        [req.params.reportId]
      );
      if (report.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
      if (report.rows[0].student_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = await pool.query(
      `INSERT INTO messages (report_id, sender_id, sender_role, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.reportId, req.user.id, req.user.role, content.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
