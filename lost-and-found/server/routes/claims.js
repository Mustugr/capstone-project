const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const FRAUD_LOCKOUT_DAYS = 14;

const approveMessage = (ticket) =>
  `Your Hawk AI claim for ticket ${ticket} has been approved. Please come to the Lost & Found office during business hours to pick up your item — bring your CUNY ID. If you have any questions, reply to this message.`;

const rejectMessage = (ticket) =>
  `Your Hawk AI claim for ticket ${ticket} was not approved. If you'd like to provide more details or have questions, reply to this message and an admin will follow up.`;

const rejectFraudMessage = (ticket) =>
  `Your Hawk AI claim for ticket ${ticket} was rejected and flagged for review. Your chat access has been temporarily disabled. If you believe this is a mistake, reply to this message and an admin will follow up.`;

async function postSystemMessage(client, { io, reportId, studentId, adminId, content }) {
  const result = await client.query(
    `INSERT INTO messages (report_id, sender_id, sender_role, content)
     VALUES ($1, $2, 'admin', $3) RETURNING *`,
    [reportId, adminId, content]
  );
  const message = result.rows[0];
  if (io) {
    io.to('admin').emit('message:new', message);
    io.to(`user:${studentId}`).emit('message:new', message);
  }
  return message;
}

// GET /api/claims — admin lists all claims (filterable by status)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const status = req.query.status;
    let query = `
      SELECT c.*,
             p.full_name AS student_name, p.email AS student_email,
             lr.item_name AS report_item_name, lr.status AS report_status,
             lr.matched_item_id
      FROM claims c
      JOIN profiles p ON c.student_id = p.id
      LEFT JOIN lost_reports lr ON c.report_id = lr.id
    `;
    const params = [];
    if (status) {
      params.push(status);
      query += ` WHERE c.status = $${params.length}`;
    }
    query += ' ORDER BY c.created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/claims/report/:reportId — fetch the latest claim attached to a report
router.get('/report/:reportId', requireAuth, async (req, res) => {
  try {
    const reportRes = await pool.query(
      'SELECT student_id FROM lost_reports WHERE id = $1',
      [req.params.reportId]
    );
    if (reportRes.rowCount === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    const report = reportRes.rows[0];
    if (req.user.role !== 'admin' && report.student_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows } = await pool.query(
      `SELECT * FROM claims
        WHERE report_id = $1
        ORDER BY created_at DESC LIMIT 1`,
      [req.params.reportId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/claims/:id/approve — admin marks claim as approved
router.patch('/:id/approve', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updateRes = await client.query(
      `UPDATE claims
         SET status = 'Approved',
             reviewed_by = $1,
             reviewed_at = NOW()
       WHERE id = $2 AND status = 'Pending Review'
       RETURNING *`,
      [req.user.id, req.params.id]
    );

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Claim not found or already reviewed' });
    }

    const claim = updateRes.rows[0];

    const ticketRes = await client.query(
      'SELECT ticket_number FROM lost_reports WHERE id = $1',
      [claim.report_id]
    );
    const ticket = ticketRes.rows[0]?.ticket_number || '—';

    await postSystemMessage(client, {
      io: req.app.get('io'),
      reportId: claim.report_id,
      studentId: claim.student_id,
      adminId: req.user.id,
      content: approveMessage(ticket),
    });

    await client.query('COMMIT');
    res.json(claim);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// PATCH /api/claims/:id/reject — admin rejects; optional is_fraudulent triggers lockout
router.patch('/:id/reject', requireAdmin, async (req, res) => {
  const { reason, is_fraudulent } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updateRes = await client.query(
      `UPDATE claims
         SET status = 'Rejected',
             rejected_reason = $1,
             is_fraudulent = $2,
             reviewed_by = $3,
             reviewed_at = NOW()
       WHERE id = $4 AND status = 'Pending Review'
       RETURNING *`,
      [reason || null, !!is_fraudulent, req.user.id, req.params.id]
    );

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Claim not found or already reviewed' });
    }

    const claim = updateRes.rows[0];

    if (is_fraudulent) {
      const lockUntil = new Date(Date.now() + FRAUD_LOCKOUT_DAYS * 24 * 3600 * 1000);
      await client.query(
        'UPDATE profiles SET chat_locked_until = $1 WHERE id = $2',
        [lockUntil, claim.student_id]
      );
    }

    const ticketRes = await client.query(
      'SELECT ticket_number FROM lost_reports WHERE id = $1',
      [claim.report_id]
    );
    const ticket = ticketRes.rows[0]?.ticket_number || '—';

    await postSystemMessage(client, {
      io: req.app.get('io'),
      reportId: claim.report_id,
      studentId: claim.student_id,
      adminId: req.user.id,
      content: is_fraudulent ? rejectFraudMessage(ticket) : rejectMessage(ticket),
    });

    await client.query('COMMIT');
    res.json(claim);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
