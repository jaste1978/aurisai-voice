const { pool } = require('../db');

const Call = {
  async findAll({ status, customerId, page = 1, limit = 20 } = {}) {
    let conditions = [];
    let values = [];
    let i = 1;

    if (status) { conditions.push(`c.status = $${i++}`); values.push(status); }
    if (customerId) { conditions.push(`c.customer_id = $${i++}`); values.push(customerId); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT c.*, cu.name AS customer_name, cu.phone_number AS customer_phone, cu.email AS customer_email
       FROM calls c LEFT JOIN customers cu ON c.customer_id = cu.id
       ${where} ORDER BY c.created_at DESC LIMIT $${i++} OFFSET $${i++}`,
      [...values, limit, offset]
    );
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM calls c ${where}`, values
    );
    return { rows, total: parseInt(countRows[0].count) };
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT c.*, cu.name AS customer_name, cu.phone_number AS customer_phone,
              cu.email AS customer_email, cu.language AS customer_language
       FROM calls c LEFT JOIN customers cu ON c.customer_id = cu.id
       WHERE c.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async findByBolnaExecutionId(executionId) {
    const { rows } = await pool.query(
      'SELECT * FROM calls WHERE bolna_execution_id = $1', [executionId]
    );
    return rows[0] || null;
  },

  async create({ callId, customerId, phoneNumber, status = 'queued', agentId, language }) {
    const { rows } = await pool.query(
      `INSERT INTO calls (call_id, customer_id, phone_number, status, agent_id, language)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [callId, customerId, phoneNumber, status, agentId, language]
    );
    return rows[0];
  },

  async update(id, fields) {
    const map = {
      bolnaExecutionId: 'bolna_execution_id',
      callStartTime: 'call_start_time',
      callEndTime: 'call_end_time',
      errorMessage: 'error_message',
      errorCode: 'error_code',
      transferredToAgent: 'transferred_to_agent',
      transferredAgentName: 'transferred_agent_name',
      bolnaResponse: 'bolna_response',
      agentName: 'agent_name',
      recordingUrl: 'recording_url',
      recordingDuration: 'recording_duration',
      agentResponseNotes: 'agent_response_notes',
      agentResponseOutcome: 'agent_response_outcome',
      behavioralInsights: 'behavioral_insights',
      freshdeskTicket: 'freshdesk_ticket',
      totalCost: 'total_cost',
    };

    const sets = [];
    const values = [];
    let i = 1;

    for (const [key, val] of Object.entries(fields)) {
      const col = map[key] || key;
      sets.push(`${col} = $${i++}`);
      values.push(typeof val === 'object' && val !== null && !(val instanceof Date)
        ? JSON.stringify(val) : val);
    }
    if (!sets.length) return this.findById(id);

    sets.push(`updated_at = NOW()`);
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE calls SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, values
    );
    return rows[0] || null;
  },

  async stats() {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE transferred_to_agent = TRUE) AS transferred,
        AVG(duration) FILTER (WHERE status = 'completed') AS avg_duration
      FROM calls
    `);
    return rows[0];
  }
};

module.exports = Call;
