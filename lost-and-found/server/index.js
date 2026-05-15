const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('./db');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const reportsRoutes = require('./routes/reports');
const foundItemsRoutes = require('./routes/foundItems');
const messagesRoutes = require('./routes/messages');
const chatRoutes = require('./routes/chat');
const claimsRoutes = require('./routes/claims');

const app = express();
const httpServer = http.createServer(app);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
    ];

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/found-items', foundItemsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/claims', claimsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return next(new Error('Invalid token'));
  }
  try {
    const { rows } = await pool.query(
      'SELECT id, email, role FROM profiles WHERE id = $1',
      [decoded.id]
    );
    if (rows.length === 0) return next(new Error('User not found'));
    socket.user = { id: rows[0].id, email: rows[0].email, role: rows[0].role };
    next();
  } catch (err) {
    console.error('socket auth db error:', err);
    next(new Error('Auth error'));
  }
});

async function relayTyping(socket, kind, payload) {
  const reportId = Number(payload?.report_id);
  if (!Number.isInteger(reportId)) return;
  try {
    const { rows } = await pool.query(
      'SELECT student_id FROM lost_reports WHERE id = $1',
      [reportId]
    );
    if (rows.length === 0) return;
    const studentId = rows[0].student_id;
    const out = {
      report_id: reportId,
      sender_id: socket.user.id,
      sender_role: socket.user.role,
    };
    if (socket.user.role === 'student') {
      io.to('admin').emit(kind, out);
    } else if (socket.user.role === 'admin') {
      io.to(`user:${studentId}`).emit(kind, out);
    }
  } catch (err) {
    console.error('typing relay error:', err);
  }
}

io.on('connection', (socket) => {
  socket.join(`user:${socket.user.id}`);
  if (socket.user.role === 'admin') socket.join('admin');

  socket.on('typing:start', (payload) => relayTyping(socket, 'typing:start', payload));
  socket.on('typing:stop',  (payload) => relayTyping(socket, 'typing:stop',  payload));
});

app.set('io', io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
