import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    console.log("Connecting to database...");
    await client.connect();
    console.log("Connected.");
    
    console.log("Adding columns to bounties table...");
    await client.query(`ALTER TABLE "bounties" ADD COLUMN IF NOT EXISTS "solverId" TEXT`);
    await client.query(`ALTER TABLE "bounties" ADD COLUMN IF NOT EXISTS "proofCid" TEXT`);
    await client.query(`ALTER TABLE "bounties" ADD COLUMN IF NOT EXISTS "proofUploadedAt" TIMESTAMP(3)`);
    console.log("Columns added successfully.");
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
