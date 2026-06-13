const { Pool } = require('pg');

async function checkDatabases() {
  console.log('🔍 CHECKING LOCAL DATABASE (127.0.0.1:5432)\n');
  
  const localPool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'postgres123',
    database: 'bolna_calls'
  });

  try {
    const calls = await localPool.query('SELECT COUNT(*) FROM calls');
    const customers = await localPool.query('SELECT COUNT(*) FROM customers');
    const agents = await localPool.query('SELECT COUNT(*) FROM agent_configs');
    
    console.log('✅ LOCAL DATABASE CONNECTED');
    console.log(`   📞 Calls: ${calls.rows[0].count}`);
    console.log(`   👥 Customers: ${customers.rows[0].count}`);
    console.log(`   ⚙️  Agent Configs: ${agents.rows[0].count}\n`);
    
    // Show sample data
    const sampleCalls = await localPool.query('SELECT id, call_id, phone_number, status FROM calls LIMIT 3');
    console.log('📋 Sample Calls (Local):');
    sampleCalls.rows.forEach(call => {
      console.log(`   - ${call.call_id.substring(0, 8)}...: ${call.phone_number} (${call.status})`);
    });
    
    await localPool.end();
  } catch (error) {
    console.error('❌ Local DB Error:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');
  console.log('🔍 CHECKING GCP CLOUD SQL\n');
  
  // Try to connect to Cloud SQL via proxy
  const gcpPool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'appuser',
    password: process.env.GCP_DB_PASSWORD || 'test123',
    database: 'bolna_calls',
    connectionTimeoutMillis: 5000
  });

  try {
    const calls = await gcpPool.query('SELECT COUNT(*) FROM calls');
    const customers = await gcpPool.query('SELECT COUNT(*) FROM customers');
    const agents = await gcpPool.query('SELECT COUNT(*) FROM agent_configs');
    
    console.log('✅ CLOUD SQL CONNECTED');
    console.log(`   📞 Calls: ${calls.rows[0].count}`);
    console.log(`   👥 Customers: ${customers.rows[0].count}`);
    console.log(`   ⚙️  Agent Configs: ${agents.rows[0].count}\n`);
    
    // Show sample data
    const sampleCalls = await gcpPool.query('SELECT id, call_id, phone_number, status FROM calls LIMIT 3');
    console.log('📋 Sample Calls (Cloud SQL):');
    if (sampleCalls.rows.length > 0) {
      sampleCalls.rows.forEach(call => {
        console.log(`   - ${call.call_id.substring(0, 8)}...: ${call.phone_number} (${call.status})`);
      });
    } else {
      console.log('   ⚠️  No calls found in Cloud SQL');
    }
    
    await gcpPool.end();
  } catch (error) {
    console.error('❌ Cloud SQL Error:', error.message);
    console.error('\n⚠️  SOLUTION: Cloud SQL Proxy is not running!');
    console.error('   Run this in another terminal:');
    console.error('   cloud-sql-proxy aiagents-490508:asia-south1:augmont-db\n');
  }
}

checkDatabases();
