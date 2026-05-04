const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function initDb() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('Database tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err.message);
  } finally {
    await pool.end();
  }
}

initDb();
