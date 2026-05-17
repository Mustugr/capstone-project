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
        `SELECT lr.id AS report_id, lr.ticket_number, lr.item_name, lr.status,
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
        `SELECT lr.id AS report_id, lr.ticket_number, lr.item_name, lr.status,
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

// GET /api/messages/unread-counts — { reportId: count } for the current user.
// Per-conversation unread = messages newer than the user's last-read timestamp
// for that report, excluding messages the user sent themselves.
// MUST be defined BEFORE /:reportId so Express doesn't capture it as a param.
router.get('/unread-counts', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  const readColumn = isAdmin ? 'admin_last_read_at' : 'student_last_read_at';

  try {
    const baseSql = `
      SELECT m.report_id, COUNT(*)::INT AS unread
        FROM messages m
        JOIN lost_reports lr ON m.report_id = lr.id
       WHERE m.sender_id <> $1
         AND (lr.${readColumn} IS NULL OR m.created_at > lr.${readColumn})
    `;

    const { rows } = isAdmin
      ? await pool.query(baseSql + ' GROUP BY m.report_id', [userId])
      : await pool.query(baseSql + ' AND lr.student_id = $1 GROUP BY m.report_id', [userId]);

    const result = {};
    for (const r of rows) result[r.report_id] = r.unread;
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/messages/:reportId/read — mark the conversation as read for the current user.
// Also emits a read:update socket event so the sender's UI can flip ✓ → ✓✓ live.
router.post('/:reportId/read', requireAuth, async (req, res) => {
  const reportId = Number(req.params.reportId);
  if (!Number.isInteger(reportId)) return res.status(400).json({ error: 'Invalid report id' });

  try {
    const reportRes = await pool.query(
      'SELECT student_id FROM lost_reports WHERE id = $1',
      [reportId]
    );
    if (reportRes.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    const studentId = reportRes.rows[0].student_id;

    if (req.user.role !== 'admin' && studentId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const column = req.user.role === 'admin' ? 'admin_last_read_at' : 'student_last_read_at';
    const upd = await pool.query(
      `UPDATE lost_reports SET ${column} = NOW() WHERE id = $1 RETURNING ${column} AS read_at`,
      [reportId]
    );
    const readAt = upd.rows[0]?.read_at;

    const io = req.app.get('io');
    if (io) {
      const payload = {
        report_id: reportId,
        role_that_read: req.user.role,
        read_at: readAt,
      };
      io.to('admin').emit('read:update', payload);
      io.to(`user:${studentId}`).emit('read:update', payload);
    }

    res.json({ ok: true, read_at: readAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/messages/:reportId — get all messages for a report.
// Each row is annotated with read_by_other (boolean): true when the other
// role's last_read_at timestamp is >= the message's created_at. Drives ✓ / ✓✓.
router.get('/:reportId', requireAuth, async (req, res) => {
  try {
    const reportRes = await pool.query(
      `SELECT student_id, student_last_read_at, admin_last_read_at
         FROM lost_reports WHERE id = $1`,
      [req.params.reportId]
    );
    if (reportRes.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    const { student_id, student_last_read_at, admin_last_read_at } = reportRes.rows[0];

    if (req.user.role !== 'admin' && student_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT m.*, p.full_name AS sender_name
       FROM messages m
       JOIN profiles p ON m.sender_id = p.id
       WHERE m.report_id = $1
       ORDER BY m.created_at ASC`,
      [req.params.reportId]
    );

    const studentReadMs = student_last_read_at ? new Date(student_last_read_at).getTime() : 0;
    const adminReadMs   = admin_last_read_at   ? new Date(admin_last_read_at).getTime()   : 0;

    const rows = result.rows.map((m) => {
      const otherReadMs = m.sender_role === 'student' ? adminReadMs : studentReadMs;
      const read_by_other = otherReadMs >= new Date(m.created_at).getTime();
      return { ...m, read_by_other };
    });

    res.json(rows);
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
    const report = await pool.query(
      'SELECT student_id FROM lost_reports WHERE id = $1',
      [req.params.reportId]
    );
    if (report.rows.length === 0) return res.status(404).json({ error: 'Report not found' });

    const ownerStudentId = report.rows[0].student_id;

    if (req.user.role !== 'admin' && ownerStudentId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `INSERT INTO messages (report_id, sender_id, sender_role, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.reportId, req.user.id, req.user.role, content.trim()]
    );

    const message = result.rows[0];

    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('message:new', message);
      io.to(`user:${ownerStudentId}`).emit('message:new', message);
    }

    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
