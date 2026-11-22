const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.database.url,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  // Connected successfully
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err.message);
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (config.env === 'development') {
      // debug logging can be placed here if needed
    }
    return res;
  } catch (error) {
    console.error('[PostgreSQL Query Error]:', { text, error: error.message });
    throw error;
  }
};

module.exports = {
  pool,
  query,
};
