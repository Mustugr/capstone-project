const pool = require('../db');

const DAILY_MESSAGE_LIMIT = 30;
const DAILY_TOOL_CALL_LIMIT = 10;

const counters = new Map();

function bucketKey(userId) {
  const day = new Date().toISOString().slice(0, 10);
  return `${userId}:${day}`;
}

function getBucket(userId) {
  const key = bucketKey(userId);
  let bucket = counters.get(key);
  if (!bucket) {
    bucket = { messages: 0, toolCalls: 0 };
    counters.set(key, bucket);
    if (counters.size > 5000) {
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().slice(0, 10);
      for (const k of counters.keys()) {
        if (k.split(':')[1] < cutoff) counters.delete(k);
      }
    }
  }
  return bucket;
}

async function checkChatLimit(req, res, next) {
  try {
    const userId = req.user.id;

    const { rows } = await pool.query(
      'SELECT chat_locked_until FROM profiles WHERE id = $1',
      [userId]
    );
    const lockedUntil = rows[0]?.chat_locked_until;
    if (lockedUntil && new Date(lockedUntil) > new Date()) {
      return res.status(403).json({
        error: 'Your chat access is temporarily disabled. Please contact the lost-and-found office.',
        locked_until: lockedUntil,
      });
    }

    const bucket = getBucket(userId);
    if (bucket.messages >= DAILY_MESSAGE_LIMIT) {
      return res.status(429).json({
        error: `Daily message limit reached (${DAILY_MESSAGE_LIMIT} per day). Try again tomorrow.`,
      });
    }

    bucket.messages += 1;
    req.chatBucket = bucket;
    next();
  } catch (err) {
    console.error('chatLimit error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

function canCallTool(req) {
  return (req.chatBucket?.toolCalls || 0) < DAILY_TOOL_CALL_LIMIT;
}

function recordToolCall(req) {
  if (req.chatBucket) req.chatBucket.toolCalls += 1;
}

module.exports = {
  checkChatLimit,
  canCallTool,
  recordToolCall,
  DAILY_MESSAGE_LIMIT,
  DAILY_TOOL_CALL_LIMIT,
};
