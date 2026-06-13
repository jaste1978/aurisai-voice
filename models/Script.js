const { pool } = require('../db');

const Script = {
  async findAll() {
    const { rows } = await pool.query(
      `SELECT s.*, u.name AS created_by_name
       FROM scripts s LEFT JOIN users u ON s.created_by = u.id
       ORDER BY s.created_at DESC`
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT s.*, u.name AS created_by_name
       FROM scripts s LEFT JOIN users u ON s.created_by = u.id
       WHERE s.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async create({ name, agentName, agentGender, company, purpose, description, content, metadata, createdBy }) {
    const { rows } = await pool.query(
      `INSERT INTO scripts (name, agent_name, agent_gender, company, purpose, description, content, metadata, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, agentName, agentGender || 'Female', company, purpose, description, content,
       JSON.stringify(metadata || {}), createdBy]
    );
    return rows[0];
  },

  async update(id, { name, agentName, agentGender, company, purpose, description, content, metadata }) {
    const sets = [];
    const values = [];
    let i = 1;
    if (name !== undefined)        { sets.push(`name = $${i++}`);         values.push(name); }
    if (agentName !== undefined)   { sets.push(`agent_name = $${i++}`);   values.push(agentName); }
    if (agentGender !== undefined) { sets.push(`agent_gender = $${i++}`); values.push(agentGender); }
    if (company !== undefined)     { sets.push(`company = $${i++}`);      values.push(company); }
    if (purpose !== undefined)     { sets.push(`purpose = $${i++}`);      values.push(purpose); }
    if (description !== undefined) { sets.push(`description = $${i++}`);  values.push(description); }
    if (content !== undefined)     { sets.push(`content = $${i++}`);      values.push(content); }
    if (metadata !== undefined)    { sets.push(`metadata = $${i++}`);     values.push(JSON.stringify(metadata)); }
    if (!sets.length) return this.findById(id);
    sets.push(`updated_at = NOW()`);
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE scripts SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, values
    );
    return rows[0] || null;
  },

  async delete(id) {
    const { rowCount } = await pool.query('DELETE FROM scripts WHERE id = $1', [id]);
    return rowCount > 0;
  }
};

module.exports = Script;
