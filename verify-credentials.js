const { Pool } = require('pg');

async function verifyCredentials() {
  console.log('🔍 VERIFYING SQL CREDENTIALS\n');
  console.log('='.repeat(60) + '\n');

  // Test with new password
  console.log('Testing Cloud SQL with NEW password:');
  console.log('  Host: localhost (via proxy)');
  console.log('  User: appuser');
  console.log('  Password: FUqM:=9@\\[$T"yZ#\n');

  const newPoolConfig = {
    host: 'localhost',
    port: 5432,
    user: 'appuser',
    password: 'FUqM:=9@\\[$T"yZ#',
    database: 'bolna_calls',
    connectionTimeoutMillis: 5000
  };

  const testPool = new Pool(newPoolConfig);

  try {
    const result = await testPool.query('SELECT NOW()');
    console.log('✅ SUCCESS! New password works!\n');
    
    const callCount = await testPool.query('SELECT COUNT(*) FROM calls');
    console.log(`   Database is accessible`);
    console.log(`   Calls in database: ${callCount.rows[0].count}\n`);
    
    await testPool.end();
  } catch (error) {
    console.error('❌ FAILED! New password does NOT work!');
    console.error(`   Error: ${error.message}\n`);
  }

  console.log('='.repeat(60) + '\n');
  console.log('📋 NEXT STEPS:\n');
  console.log('If password works above, you need to UPDATE the Secret Manager:');
  console.log('\n1. Go to Secret Manager:');
  console.log('   https://console.cloud.google.com/security/secret-manager?project=aiagents-490508\n');
  console.log('2. Click on "DATABASE_URL" secret');
  console.log('3. Click "Add New Version"');
  console.log('4. Update the password in the connection string to:');
  console.log('   FUqM:=9@\\[$T"yZ#\n');
  console.log('5. Or paste this exact URL:');
  console.log('   postgresql://appuser:FUqM:=9@\\[$T"yZ#@/bolna_calls?host=/cloudsql/aiagents-490508:asia-south1:augmont-db\n');
}

verifyCredentials();
