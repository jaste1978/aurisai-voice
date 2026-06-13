const { Pool } = require('pg');
const fs = require('fs');

async function syncData() {
  console.log('🚀 Starting data sync to GCP Cloud SQL...\n');

  // Load sync data
  const syncData = JSON.parse(fs.readFileSync('./gcp-sync-data.json', 'utf8'));
  const { customers, calls, agent_configs } = syncData.tables;

  // GCP Cloud SQL connection
  const gcpPool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'appuser',
    password: process.env.GCP_DB_PASSWORD,
    database: 'bolna_calls',
    connectionTimeoutMillis: 10000
  });

  try {
    console.log('🔗 Connecting to Cloud SQL...');
    await gcpPool.query('SELECT NOW()');
    console.log('✅ Connected to Cloud SQL!\n');

    // Import customers
    console.log(`📥 Importing ${customers.length} customers...`);
    let importedCount = 0;
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
        importedCount++;
      } catch (err) {
        console.log(`   ⚠️  Skipped customer ${customer.name}: ${err.message}`);
      }
    }
    console.log(`   ✅ Imported ${importedCount}/${customers.length} customers\n`);

    // Import calls
    console.log(`📥 Importing ${calls.length} calls...`);
    importedCount = 0;
    for (const call of calls) {
      try {
        await gcpPool.query(
          `INSERT INTO calls (call_id, customer_id, bolna_execution_id, phone_number, status, agent_id, 
           agent_name, call_start_time, call_end_time, duration, transcript, recording_url, recording_duration,
           agent_response_outcome, agent_response_notes, customer_feedback_rating, customer_feedback_comments,
           error_message, error_code, language, transferred_to_agent, transferred_agent_name, bolna_response,
           behavioral_insights, freshdesk_ticket, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
           ON CONFLICT (call_id) DO UPDATE SET status = $5, transcript = $11, recording_url = $12, updated_at = $27`,
          [call.call_id, call.customer_id, call.bolna_execution_id, call.phone_number, call.status,
           call.agent_id, call.agent_name, call.call_start_time, call.call_end_time, call.duration, call.transcript,
           call.recording_url, call.recording_duration, call.agent_response_outcome, call.agent_response_notes,
           call.customer_feedback_rating, call.customer_feedback_comments, call.error_message, call.error_code,
           call.language, call.transferred_to_agent, call.transferred_agent_name, call.bolna_response,
           call.behavioral_insights, call.freshdesk_ticket, call.created_at, call.updated_at]
        );
        importedCount++;
      } catch (err) {
        console.log(`   ⚠️  Skipped call ${call.call_id.substring(0, 8)}: ${err.message}`);
      }
    }
    console.log(`   ✅ Imported ${importedCount}/${calls.length} calls\n`);

    // Import agent configs
    console.log(`📥 Importing ${agent_configs.length} agent configs...`);
    importedCount = 0;
    for (const config of agent_configs) {
      try {
        await gcpPool.query(
          `INSERT INTO agent_configs (agent_id, freshdesk_enabled, freshdesk_domain, freshdesk_api_key, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (agent_id) DO UPDATE SET 
           freshdesk_enabled = $2, freshdesk_domain = $3, freshdesk_api_key = $4, updated_at = $6`,
          [config.agent_id, config.freshdesk_enabled, config.freshdesk_domain, config.freshdesk_api_key,
           config.created_at, config.updated_at]
        );
        importedCount++;
      } catch (err) {
        console.log(`   ⚠️  Skipped config ${config.agent_id}: ${err.message}`);
      }
    }
    console.log(`   ✅ Imported ${importedCount}/${agent_configs.length} agent configs\n`);

    // Verify sync
    console.log('🔍 Verifying sync...\n');
    const callCount = await gcpPool.query('SELECT COUNT(*) FROM calls');
    const customerCount = await gcpPool.query('SELECT COUNT(*) FROM customers');
    const configCount = await gcpPool.query('SELECT COUNT(*) FROM agent_configs');

    console.log('📊 SYNC COMPLETE!\n');
    console.log('✅ Cloud SQL Now Contains:');
    console.log(`   📞 Calls: ${callCount.rows[0].count}`);
    console.log(`   👥 Customers: ${customerCount.rows[0].count}`);
    console.log(`   ⚙️  Agent Configs: ${configCount.rows[0].count}\n`);

    console.log('🎉 Your data is now synced to GCP Cloud SQL!');
    console.log('\n🌐 Refresh your dashboard:');
    console.log('   https://augmont-voice-agents-905391127280.asia-south1.run.app/\n');

    await gcpPool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync Failed:', error.message);
    console.error('\n💡 Make sure Cloud SQL Proxy is running:');
    console.error('   cloud-sql-proxy aiagents-490508:asia-south1:augmont-db\n');
    process.exit(1);
  }
}

syncData();
