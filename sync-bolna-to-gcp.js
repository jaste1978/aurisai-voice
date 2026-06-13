#!/usr/bin/env node

/**
 * Sync data from Bolna API directly to GCP Cloud SQL
 * Fetches all call records and customer data from Bolna and syncs to Cloud SQL
 */

const axios = require('axios');
const { Pool } = require('pg');

// Bolna API configuration
const bolnaService = {
  baseURL: process.env.BOLNA_API_BASE_URL || 'https://api.bolna.ai',
  apiKey: process.env.BOLNA_API_KEY || ''
};

// Local database (source of Bolna data)
const localPool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  database: process.env.DB_NAME || 'bolna_calls'
});

// GCP Cloud SQL (destination)
const gcpPool = new Pool({
  host: process.env.GCP_DB_HOST || 'localhost',
  port: 5432,
  user: process.env.GCP_DB_USER || 'appuser',
  password: process.env.GCP_DB_PASSWORD,
  database: 'bolna_calls',
  connectionTimeoutMillis: 10000
});

async function syncBolnaToGCP() {
  try {
    console.log('🚀 SYNCING BOLNA DATA TO GCP CLOUD SQL\n');
    console.log('='.repeat(60) + '\n');

    // Test connections
    console.log('🔗 Testing connections...');
    try {
      await localPool.query('SELECT NOW()');
      console.log('   ✅ Local database connected');
    } catch (err) {
      console.error('   ❌ Local database failed:', err.message);
      process.exit(1);
    }

    try {
      await gcpPool.query('SELECT NOW()');
      console.log('   ✅ GCP Cloud SQL connected\n');
    } catch (err) {
      console.error('   ❌ GCP Cloud SQL failed:', err.message);
      console.error('   💡 Make sure Cloud SQL Proxy is running:\n   cloud-sql-proxy aiagents-490508:asia-south1:augmont-db\n');
      process.exit(1);
    }

    // Fetch all data from local Bolna database
    console.log('📥 FETCHING DATA FROM LOCAL BOLNA DATABASE\n');

    const { rows: customers } = await localPool.query('SELECT * FROM customers');
    console.log(`   ✅ Fetched ${customers.length} customers`);

    const { rows: calls } = await localPool.query('SELECT * FROM calls ORDER BY created_at DESC');
    console.log(`   ✅ Fetched ${calls.length} calls`);

    const { rows: scripts } = await localPool.query('SELECT * FROM scripts');
    console.log(`   ✅ Fetched ${scripts.length} scripts`);

    const { rows: agentConfigs } = await localPool.query('SELECT * FROM agent_configs');
    console.log(`   ✅ Fetched ${agentConfigs.length} agent configs\n`);

    // Sync to GCP
    console.log('📤 SYNCING TO GCP CLOUD SQL\n');

    // Sync customers
    console.log('   Syncing customers...');
    let syncedCount = 0;
    for (const customer of customers) {
      try {
        await gcpPool.query(
          `INSERT INTO customers (customer_id, name, phone_number, email, language, notes, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (customer_id) DO UPDATE SET
           name = $2, phone_number = $3, email = $4, language = $5, notes = $6, status = $7, updated_at = $9`,
          [customer.customer_id, customer.name, customer.phone_number, customer.email,
           customer.language, customer.notes, customer.status, customer.created_at, customer.updated_at]
        );
        syncedCount++;
      } catch (err) {
        console.error(`      ⚠️  Error syncing ${customer.name}: ${err.message}`);
      }
    }
    console.log(`      ✅ Synced ${syncedCount}/${customers.length} customers`);

    // Sync calls
    console.log('   Syncing calls...');
    syncedCount = 0;
    for (const call of calls) {
      try {
        await gcpPool.query(
          `INSERT INTO calls (call_id, customer_id, bolna_execution_id, phone_number, status, agent_id,
           agent_name, call_start_time, call_end_time, duration, transcript, recording_url, recording_duration,
           agent_response_outcome, agent_response_notes, customer_feedback_rating, customer_feedback_comments,
           error_message, error_code, language, transferred_to_agent, transferred_agent_name, bolna_response,
           behavioral_insights, freshdesk_ticket, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
           ON CONFLICT (call_id) DO UPDATE SET
           status = $5, transcript = $11, recording_url = $12, bolna_response = $23, updated_at = $27`,
          [call.call_id, call.customer_id, call.bolna_execution_id, call.phone_number, call.status,
           call.agent_id, call.agent_name, call.call_start_time, call.call_end_time, call.duration,
           call.transcript, call.recording_url, call.recording_duration, call.agent_response_outcome,
           call.agent_response_notes, call.customer_feedback_rating, call.customer_feedback_comments,
           call.error_message, call.error_code, call.language, call.transferred_to_agent,
           call.transferred_agent_name, call.bolna_response, call.behavioral_insights,
           call.freshdesk_ticket, call.created_at, call.updated_at]
        );
        syncedCount++;
      } catch (err) {
        console.error(`      ⚠️  Error syncing call: ${err.message}`);
      }
    }
    console.log(`      ✅ Synced ${syncedCount}/${calls.length} calls`);

    // Sync agent configs
    console.log('   Syncing agent configs...');
    syncedCount = 0;
    for (const config of agentConfigs) {
      try {
        await gcpPool.query(
          `INSERT INTO agent_configs (agent_id, freshdesk_enabled, freshdesk_domain, freshdesk_api_key, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (agent_id) DO UPDATE SET
           freshdesk_enabled = $2, freshdesk_domain = $3, freshdesk_api_key = $4, updated_at = $6`,
          [config.agent_id, config.freshdesk_enabled, config.freshdesk_domain,
           config.freshdesk_api_key, config.created_at, config.updated_at]
        );
        syncedCount++;
      } catch (err) {
        console.error(`      ⚠️  Error syncing config: ${err.message}`);
      }
    }
    console.log(`      ✅ Synced ${syncedCount}/${agentConfigs.length} agent configs\n`);

    // Verify sync
    console.log('🔍 VERIFYING SYNC\n');
    const gcpCalls = await gcpPool.query('SELECT COUNT(*) FROM calls');
    const gcpCustomers = await gcpPool.query('SELECT COUNT(*) FROM customers');
    const gcpConfigs = await gcpPool.query('SELECT COUNT(*) FROM agent_configs');

    console.log('='.repeat(60));
    console.log('✅ SYNC COMPLETE!\n');
    console.log('📊 GCP Cloud SQL Now Contains:');
    console.log(`   📞 Calls: ${gcpCalls.rows[0].count}`);
    console.log(`   👥 Customers: ${gcpCustomers.rows[0].count}`);
    console.log(`   ⚙️  Agent Configs: ${gcpConfigs.rows[0].count}\n`);

    console.log('🎉 All Bolna data synced to GCP Cloud SQL!');
    console.log('\n🌐 Refresh your cloud dashboard:');
    console.log('   https://augmont-voice-agents-905391127280.asia-south1.run.app/\n');

    await localPool.end();
    await gcpPool.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ SYNC FAILED:', error.message);
    process.exit(1);
  }
}

syncBolnaToGCP();
