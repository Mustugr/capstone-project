const { Pool } = require('pg');
require('dotenv').config();

const useSupabase = process.env.DB_TARGET === 'supabase';

const pool = useSupabase
  ? new Pool({
      connectionString: process.env.SUPABASE_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || undefined,
    });

pool.on('connect', () => {
  console.log(`Connected to PostgreSQL (${useSupabase ? 'Supabase' : 'local'})`);
});

module.exports = pool;
