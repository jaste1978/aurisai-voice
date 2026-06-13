#!/usr/bin/env node

/**
 * Export all call records, audio data, and transcripts from Bolna
 * Usage: node export-all-data.js [format] [output-dir]
 * Formats: json, csv, all (default: all)
 * Output: exports/ directory
 */

const { pool } = require('./db');
const fs = require('fs');
const path = require('path');
const { createWriteStream } = require('fs');

const format = process.argv[2] || 'all';
const outputDir = process.argv[3] || './exports';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`✅ Created output directory: ${outputDir}`);
}

async function exportAllData() {
  try {
    console.log('📊 Starting Bolna data export...\n');

    // 1. Fetch all calls with customer info
    console.log('🔍 Fetching all call records...');
    const { rows: calls } = await pool.query(`
      SELECT
        c.*,
        cu.name AS customer_name,
        cu.phone_number AS customer_phone,
        cu.email AS customer_email,
        cu.language AS customer_language
      FROM calls c
      LEFT JOIN customers cu ON c.customer_id = cu.id
      ORDER BY c.created_at DESC
    `);

    console.log(`✅ Found ${calls.length} call records\n`);

    // 2. Fetch all customers
    console.log('🔍 Fetching all customer records...');
    const { rows: customers } = await pool.query(`
      SELECT * FROM customers ORDER BY created_at DESC
    `);
    console.log(`✅ Found ${customers.length} customer records\n`);

    // 3. Fetch call statistics
    console.log('🔍 Calculating statistics...');
    const { rows: stats } = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE transferred_to_agent = TRUE) AS transferred,
        COALESCE(AVG(duration) FILTER (WHERE status = 'completed'), 0) AS avg_duration,
        COUNT(*) FILTER (WHERE recording_url IS NOT NULL) AS with_recordings,
        COUNT(*) FILTER (WHERE transcript IS NOT NULL AND transcript != '') AS with_transcripts,
        COUNT(DISTINCT customer_id) AS unique_customers
      FROM calls
    `);

    const statsData = stats[0];
    console.log(`✅ Statistics calculated\n`);

    // 3a. Export statistics
    if (format === 'json' || format === 'all') {
      const statsPath = path.join(outputDir, 'statistics.json');
      fs.writeFileSync(statsPath, JSON.stringify(statsData, null, 2));
      console.log(`📄 Exported statistics to: ${statsPath}`);
    }

    // Export formats
    if (format === 'json' || format === 'all') {
      await exportJSON(calls, customers, statsData, outputDir);
    }

    if (format === 'csv' || format === 'all') {
      await exportCSV(calls, customers, outputDir);
    }

    // 4. Create audio/recording summary
    await createRecordingManifest(calls, outputDir);

    // 5. Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 EXPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Calls: ${statsData.total}`);
    console.log(`Completed: ${statsData.completed} | Failed: ${statsData.failed} | In Progress: ${statsData.in_progress}`);
    console.log(`Transferred to Agent: ${statsData.transferred}`);
    console.log(`Average Duration: ${parseFloat(statsData.avg_duration).toFixed(2)}s`);
    console.log(`Calls with Recordings: ${statsData.with_recordings}`);
    console.log(`Calls with Transcripts: ${statsData.with_transcripts}`);
    console.log(`Unique Customers: ${statsData.unique_customers}`);
    console.log('='.repeat(60));
    console.log('\n✅ Export completed successfully!');
    console.log(`📁 All files saved to: ${outputDir}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during export:', error);
    process.exit(1);
  }
}

async function exportJSON(calls, customers, stats, outputDir) {
  // Calls with full details
  const callsPath = path.join(outputDir, 'calls-full.json');
  fs.writeFileSync(callsPath, JSON.stringify(calls, null, 2));
  console.log(`📄 Exported ${calls.length} calls to: ${callsPath}`);

  // Customers
  const customersPath = path.join(outputDir, 'customers.json');
  fs.writeFileSync(customersPath, JSON.stringify(customers, null, 2));
  console.log(`📄 Exported ${customers.length} customers to: ${customersPath}`);

  // Simplified calls (for easier viewing)
  const simplifiedCalls = calls.map(c => ({
    id: c.id,
    call_id: c.call_id,
    customer_name: c.customer_name || 'Unknown',
    phone_number: c.phone_number,
    status: c.status,
    duration: c.duration,
    created_at: c.created_at,
    recording_url: c.recording_url || null,
    has_transcript: !!c.transcript && c.transcript.length > 0,
    agent_name: c.agent_name,
    transferred: c.transferred_to_agent
  }));

  const simplifiedPath = path.join(outputDir, 'calls-summary.json');
  fs.writeFileSync(simplifiedPath, JSON.stringify(simplifiedCalls, null, 2));
  console.log(`📄 Exported simplified call summary to: ${simplifiedPath}`);
}

async function exportCSV(calls, customers, outputDir) {
  // Calls to CSV
  const callsCSVPath = path.join(outputDir, 'calls.csv');
  const callsCSV = [
    ['ID', 'Call ID', 'Customer Name', 'Phone', 'Status', 'Duration (s)', 'Created At', 'Recording URL', 'Has Transcript', 'Agent'].join(',')
  ];

  calls.forEach(c => {
    const row = [
      c.id,
      c.call_id,
      `"${c.customer_name || 'Unknown'}"`,
      c.phone_number,
      c.status,
      c.duration || 0,
      c.created_at,
      c.recording_url || '',
      c.transcript && c.transcript.length > 0 ? 'Yes' : 'No',
      `"${c.agent_name || ''}"'`
    ].join(',');
    callsCSV.push(row);
  });

  fs.writeFileSync(callsCSVPath, callsCSV.join('\n'));
  console.log(`📄 Exported ${calls.length} calls to CSV: ${callsCSVPath}`);

  // Customers to CSV
  const customersCSVPath = path.join(outputDir, 'customers.csv');
  const customersCSV = [
    ['ID', 'Name', 'Phone', 'Email', 'Language', 'Status', 'Created At'].join(',')
  ];

  customers.forEach(cu => {
    const row = [
      cu.id,
      `"${cu.name}"`,
      cu.phone_number,
      cu.email || '',
      cu.language || 'en',
      cu.status || 'active',
      cu.created_at
    ].join(',');
    customersCSV.push(row);
  });

  fs.writeFileSync(customersCSVPath, customersCSV.join('\n'));
  console.log(`📄 Exported ${customers.length} customers to CSV: ${customersCSVPath}`);
}

async function createRecordingManifest(calls, outputDir) {
  const recordingsWithUrls = calls.filter(c => c.recording_url);

  const manifest = {
    total_calls: calls.length,
    calls_with_recordings: recordingsWithUrls.length,
    export_timestamp: new Date().toISOString(),
    recordings: recordingsWithUrls.map(c => ({
      call_id: c.call_id,
      customer_name: c.customer_name || 'Unknown',
      phone_number: c.phone_number,
      status: c.status,
      duration: c.duration,
      recording_url: c.recording_url,
      created_at: c.created_at,
      has_transcript: !!c.transcript && c.transcript.length > 0
    }))
  };

  const manifestPath = path.join(outputDir, 'recording-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`📄 Exported recording manifest to: ${manifestPath}`);

  // Create a simple m3u playlist for audio players
  const m3uPath = path.join(outputDir, 'recordings-playlist.m3u');
  const m3uContent = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    ...recordingsWithUrls.map(c =>
      `#EXTINF:${c.duration || 0},${c.customer_name || 'Call'} (${c.call_id})\n${c.recording_url}`
    )
  ].join('\n');
  fs.writeFileSync(m3uPath, m3uContent);
  console.log(`📄 Exported M3U playlist to: ${m3uPath}`);
}

// Run export
exportAllData();
