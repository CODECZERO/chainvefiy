import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log('Connecting to DB directly via pg...');
  try {
    await client.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT 1;');
    console.log('Query result:', res.rows);
    await client.end();
  } catch (err) {
    console.error('Connection failed:', err);
    process.exit(1);
  }
}

main();
