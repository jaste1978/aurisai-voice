#!/usr/bin/env node

/**
 * Import synced data to GCP Cloud SQL
 * Run this script with GCP Cloud SQL proxy running or with proper connection
 */

const { Pool } = require('pg');
const fs = require('fs');

// GCP Cloud SQL connection
const gcpPool = new Pool({
  user: process.env.GCP_DB_USER || 'appuser',
  password: process.env.GCP_DB_PASSWORD,
  host: process.env.GCP_DB_HOST || '/cloudsql/aiagents-490508:asia-south1:augmont-db',
  database: process.env.GCP_DB_NAME || 'bolna_calls',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function importDataToGCP() {
  try {
    console.log('📤 Importing data to GCP Cloud SQL...\n');

    // Load sync data
    const syncData = JSON.parse(fs.readFileSync('./gcp-sync-data.json', 'utf8'));
    const { customers, calls, scripts, agent_configs } = syncData.tables;

    // Import customers
    console.log('📥 Importing customers...');
    for (const customer of customers) {
      await gcpPool.query(
        `INSERT INTO customers (id, customer_id, name, phone_number, email, language, notes, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (customer_id) DO UPDATE SET
         name = $3, phone_number = $4, email = $5, language = $6, notes = $7, status = $8, updated_at = $10`,
        [customer.id, customer.customer_id, customer.name, customer.phone_number, customer.email, 
         customer.language, customer.notes, customer.status, customer.created_at, customer.updated_at]
      );
    }
    console.log(`   ✅ Imported ${customers.length} customers`);

    // Import calls
    console.log('📥 Importing calls...');
    for (const call of calls) {
      await gcpPool.query(
        `INSERT INTO calls (id, call_id, customer_id, bolna_execution_id, phone_number, status, agent_id, 
         agent_name, call_start_time, call_end_time, duration, transcript, recording_url, recording_duration,
         agent_response_outcome, agent_response_notes, customer_feedback_rating, customer_feedback_comments,
         error_message, error_code, language, transferred_to_agent, transferred_agent_name, bolna_response,
         behavioral_insights, freshdesk_ticket, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
         ON CONFLICT (call_id) DO UPDATE SET status = $6, transcript = $12, recording_url = $13, updated_at = $28`,
        [call.id, call.call_id, call.customer_id, call.bolna_execution_id, call.phone_number, call.status,
         call.agent_id, call.agent_name, call.call_start_time, call.call_end_time, call.duration, call.transcript,
         call.recording_url, call.recording_duration, call.agent_response_outcome, call.agent_response_notes,
         call.customer_feedback_rating, call.customer_feedback_comments, call.error_message, call.error_code,
         call.language, call.transferred_to_agent, call.transferred_agent_name, call.bolna_response,
         call.behavioral_insights, call.freshdesk_ticket, call.created_at, call.updated_at]
      );
    }
    console.log(`   ✅ Imported ${calls.length} calls`);

    // Import agent configs
    console.log('📥 Importing agent configs...');
    for (const config of agent_configs) {
      await gcpPool.query(
        `INSERT INTO agent_configs (id, agent_id, freshdesk_enabled, freshdesk_domain, freshdesk_api_key, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (agent_id) DO UPDATE SET 
         freshdesk_enabled = $3, freshdesk_domain = $4, freshdesk_api_key = $5, updated_at = $7`,
        [config.id, config.agent_id, config.freshdesk_enabled, config.freshdesk_domain, config.freshdesk_api_key,
         config.created_at, config.updated_at]
      );
    }
    console.log(`   ✅ Imported ${agent_configs.length} agent configs`);

    console.log('\n✅ Data sync to GCP Cloud SQL completed!');
    console.log('\n📊 IMPORT SUMMARY:');
    console.log(`   - Customers: ${customers.length}`);
    console.log(`   - Calls: ${calls.length}`);
    console.log(`   - Agent Configs: ${agent_configs.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

importDataToGCP();
