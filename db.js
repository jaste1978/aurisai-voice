const { Pool } = require('pg');

// Support both DATABASE_URL and individual DB_* env vars
let poolConfig;

if (process.env.DATABASE_URL) {
  // Cloud SQL or production environment
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
  };
} else {
  // Local development
  poolConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    database: process.env.DB_NAME || 'bolna_calls'
  };
}

const pool = new Pool(poolConfig);

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      customer_id UUID UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      phone_number VARCHAR(50) NOT NULL,
      email VARCHAR(255),
      language VARCHAR(10) DEFAULT 'en',
      notes TEXT,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS calls (
      id SERIAL PRIMARY KEY,
      call_id UUID UNIQUE NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      bolna_execution_id VARCHAR(255),
      phone_number VARCHAR(50),
      status VARCHAR(20) DEFAULT 'queued',
      agent_id VARCHAR(255),
      agent_name VARCHAR(255),
      call_start_time TIMESTAMPTZ,
      call_end_time TIMESTAMPTZ,
      duration INTEGER DEFAULT 0,
      transcript TEXT DEFAULT '',
      recording_url VARCHAR(500),
      recording_duration INTEGER,
      agent_response_outcome TEXT,
      agent_response_notes TEXT,
      agent_response_metadata JSONB,
      customer_feedback_rating INTEGER,
      customer_feedback_comments TEXT,
      error_message TEXT,
      error_code VARCHAR(100),
      language VARCHAR(10),
      transferred_to_agent BOOLEAN DEFAULT FALSE,
      transferred_agent_name VARCHAR(255),
      bolna_response JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS batches (
      id SERIAL PRIMARY KEY,
      batch_id VARCHAR(255) UNIQUE,
      bolna_batch_id VARCHAR(255),
      name VARCHAR(255),
      agent_id VARCHAR(255),
      agent_name VARCHAR(255),
      from_phone_number VARCHAR(50),
      total_contacts INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'created',
      file_name VARCHAR(255),
      webhook_url VARCHAR(500),
      bolna_response JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS scripts (
      id SERIAL PRIMARY KEY,
      script_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      agent_name VARCHAR(255),
      agent_gender VARCHAR(20) DEFAULT 'Female',
      company VARCHAR(255),
      purpose TEXT,
      description TEXT,
      content TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      user_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'user',
      permissions JSONB DEFAULT '{"dashboard":true,"customers":{"view":true,"manage":false},"calls":{"view":true,"trigger":false},"bulk":{"view":false,"manage":false}}',
      is_active BOOLEAN DEFAULT true,
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE calls ADD COLUMN IF NOT EXISTS behavioral_insights JSONB;`);
  await pool.query(`ALTER TABLE calls ADD COLUMN IF NOT EXISTS freshdesk_ticket JSONB;`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_configs (
      id                 SERIAL PRIMARY KEY,
      agent_id           VARCHAR(255) UNIQUE NOT NULL,
      freshdesk_enabled  BOOLEAN DEFAULT FALSE,
      freshdesk_domain   VARCHAR(255),
      freshdesk_api_key  VARCHAR(500),
      created_at         TIMESTAMPTZ DEFAULT NOW(),
      updated_at         TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ PostgreSQL tables ready');

  const bcrypt = require('bcryptjs');
  // Seed default admin
  const adminCheck = await pool.query("SELECT id FROM users WHERE email = 'admin@augmont.com'");
  if (adminCheck.rows.length === 0) {
    const hash = await bcrypt.hash('Admin@123', 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, permissions) VALUES ($1, $2, $3, $4, $5)`,
      ['Admin', 'admin@augmont.com', hash, 'admin', JSON.stringify({
        dashboard: true,
        customers: { view: true, manage: true },
        calls: { view: true, trigger: true },
        bulk: { view: true, manage: true },
        users: { view: true, manage: true }
      })]
    );
    console.log('✅ Default admin created: admin@augmont.com / Admin@123');
  }
}

module.exports = { pool, initDB };
