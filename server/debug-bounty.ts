import 'dotenv/config';
import { getBountiesBySupplierQuery } from './src/dbQueries/bounty.Queries.js';

async function debug() {
  const supplierId = '1b867f4f-ddf5-4e33-b3a4-2f11575da96e';
  console.log(`Debugging getBountiesBySupplierQuery for supplier: ${supplierId}`);
  
  try {
    const bounties = await getBountiesBySupplierQuery(supplierId);
    console.log('Bounties found:', bounties.length);
    console.log(JSON.stringify(bounties, null, 2));
  } catch (e: any) {
    console.error('❌ Query failed:');
    console.error(e);
  }
}

debug();
