const { Client } = require('pg');
require('dotenv').config();

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log('Postgres Connected');
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bounties'
    `);
    console.log('Columns in "bounties":');
    res.rows.forEach(row => console.log(`- ${row.column_name} (${row.data_type})`));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}

check();
