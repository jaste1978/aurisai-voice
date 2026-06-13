const { pool } = require('../db');

const AgentConfig = {
  async findByAgentId(agentId) {
    const { rows } = await pool.query(
      'SELECT * FROM agent_configs WHERE agent_id = $1',
      [agentId]
    );
    return rows[0] || null;
  },

  async upsert({ agentId, freshdeskEnabled, freshdeskDomain, freshdeskApiKey }) {
    const { rows } = await pool.query(
      `INSERT INTO agent_configs (agent_id, freshdesk_enabled, freshdesk_domain, freshdesk_api_key, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (agent_id)
       DO UPDATE SET
         freshdesk_enabled  = EXCLUDED.freshdesk_enabled,
         freshdesk_domain   = EXCLUDED.freshdesk_domain,
         freshdesk_api_key  = COALESCE(NULLIF($4, ''), agent_configs.freshdesk_api_key),
         updated_at         = NOW()
       RETURNING *`,
      [agentId, freshdeskEnabled ?? false, freshdeskDomain || null, freshdeskApiKey || null]
    );
    return rows[0];
  },
};

module.exports = AgentConfig;
