#!/usr/bin/env node

/**
 * Sync local PostgreSQL data to GCP Cloud SQL
 * Exports all data from local DB and prepares for import to Cloud SQL
 */

const { Pool } = require('pg');
const fs = require('fs');

// Local database connection
const localPool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  database: process.env.DB_NAME || 'bolna_calls'
});

async function exportDataForSync() {
  try {
    console.log('📊 Exporting data from local database for GCP sync...\n');

    // 1. Export customers
    console.log('🔍 Fetching customers...');
    const { rows: customers } = await localPool.query('SELECT * FROM customers');
    console.log(`   ✅ Found ${customers.length} customers`);

    // 2. Export calls
    console.log('🔍 Fetching calls...');
    const { rows: calls } = await localPool.query('SELECT * FROM calls');
    console.log(`   ✅ Found ${calls.length} calls`);

    // 3. Export scripts
    console.log('🔍 Fetching scripts...');
    const { rows: scripts } = await localPool.query('SELECT * FROM scripts');
    console.log(`   ✅ Found ${scripts.length} scripts`);

    // 4. Export agent configs
    console.log('🔍 Fetching agent configs...');
    const { rows: agentConfigs } = await localPool.query('SELECT * FROM agent_configs');
    console.log(`   ✅ Found ${agentConfigs.length} agent configs`);

    // Create sync bundle
    const syncData = {
      timestamp: new Date().toISOString(),
      database: 'bolna_calls',
      tables: {
        customers,
        calls,
        scripts,
        agent_configs: agentConfigs
      },
      counts: {
        customers: customers.length,
        calls: calls.length,
        scripts: scripts.length,
        agent_configs: agentConfigs.length
      }
    };

    // Save to file
    const filePath = './gcp-sync-data.json';
    fs.writeFileSync(filePath, JSON.stringify(syncData, null, 2));
    
    console.log(`\n✅ Data exported to: ${filePath}`);
    console.log('\n📋 SYNC SUMMARY:');
    console.log(`   - Customers: ${customers.length}`);
    console.log(`   - Calls: ${calls.length}`);
    console.log(`   - Scripts: ${scripts.length}`);
    console.log(`   - Agent Configs: ${agentConfigs.length}`);

    console.log('\n📌 Next Steps:');
    console.log('   1. Upload gcp-sync-data.json to GCP');
    console.log('   2. Use gcp-import-data.js script to import to Cloud SQL');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

exportDataForSync();
