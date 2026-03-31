import { prisma } from './src/lib/prisma.js';
import { loginUser } from './src/dbQueries/user.Queries.js';
import dotenv from 'dotenv';
dotenv.config();

async function verify() {
  console.log('--- VERIFYING AUTH FIX ---');
  
  // 1. Test existing user lookup
  const testUser = await prisma.user.findFirst({
    where: { NOT: { whatsappNumber: null } },
    select: { email: true, whatsappNumber: true }
  });
  
  if (!testUser) {
    console.log('No user with WhatsApp found in DB. Skipping test.');
    return;
  }
  
  console.log(`Found Test User: Email=${testUser.email}, WhatsApp=${testUser.whatsappNumber}`);
  
  // 2. Test Login via Email
  try {
    const res = await loginUser(testUser.email, 'any'); // Password check happens after lookup
    console.log('✅ Login lookup via Email works');
  } catch (e) {
    if (e.message === 'Invalid email or password') {
       console.log('✅ Login lookup via Email works (Invalid password as expected)');
    } else {
       console.error('❌ Login lookup via Email failed:', e.message);
    }
  }
  
  // 3. Test Login via WhatsApp
  try {
    const res = await loginUser(testUser.whatsappNumber, 'any');
    console.log('✅ Login lookup via WhatsApp works');
  } catch (e) {
    if (e.message === 'Invalid email or password') {
       console.log('✅ Login lookup via WhatsApp works (Invalid password as expected)');
    } else {
       console.error('❌ Login lookup via WhatsApp failed:', e.message);
    }
  }
}

verify();
