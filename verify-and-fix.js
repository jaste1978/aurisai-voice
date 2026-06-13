const { Pool } = require('pg');

async function verifyAndFix() {
  console.log('🔍 VERIFYING NEW SQL PASSWORD\n');
  console.log('='.repeat(60) + '\n');

  const newPassword = '-qM*uusk2N6e/v+2';

  console.log('Testing with password: -qM*uusk2N6e/v+2\n');

  const testPool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'appuser',
    password: newPassword,
    database: 'bolna_calls',
    connectionTimeoutMillis: 5000
  });

  try {
    const result = await testPool.query('SELECT NOW()');
    console.log('✅ SUCCESS! Password verified!\n');
    
    const callCount = await testPool.query('SELECT COUNT(*) FROM calls');
    console.log(`Database Connection: ✅ Working`);
    console.log(`Database: bolna_calls`);
    console.log(`Calls accessible: ${callCount.rows[0].count}\n`);
    
    await testPool.end();
    return true;
  } catch (error) {
    console.error('❌ FAILED!');
    console.error(`Error: ${error.message}\n`);
    return false;
  }
}

verifyAndFix();
