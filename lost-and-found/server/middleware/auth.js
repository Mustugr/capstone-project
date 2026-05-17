const jwt = require('jsonwebtoken');
const pool = require('../db');

// Verifies the JWT for identity, then re-reads the user's current role from
// the DB. The JWT's `role` claim is a 7-day-old snapshot and can lie if a
// user was demoted or deleted after the token was issued — so we don't trust
// it for authorization. Same pattern as the socket handshake in index.js.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, email, role FROM profiles WHERE id = $1',
      [decoded.id]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'User no longer exists' });
    }
    req.user = { id: rows[0].id, email: rows[0].email, role: rows[0].role };
    next();
  } catch (err) {
    console.error('requireAuth db error:', err);
    return res.status(500).json({ error: 'Auth error' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
