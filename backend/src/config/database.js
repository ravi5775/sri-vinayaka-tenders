const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sri_vinayaka',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected:', result.rows[0].now);
    client.release();
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    console.error('   Check your .env file and ensure PostgreSQL is running.');
    process.exit(1);
  }
};

module.exports = { pool, testConnection };
