const { Client } = require('pg');
require('dotenv').config();

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log('Postgres Raw OK');
    const res = await client.query('SELECT current_database(), current_user');
    console.log('Query Result:', res.rows[0]);
  } catch (e) {
    console.error('Postgres Raw Error:', e.message);
  } finally {
    await client.end();
  }
}

check();
