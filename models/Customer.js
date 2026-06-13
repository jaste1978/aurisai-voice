const { pool } = require('../db');

const Customer = {
  async findAll({ status, language, page = 1, limit = 20 } = {}) {
    let conditions = [];
    let values = [];
    let i = 1;

    if (status) { conditions.push(`status = $${i++}`); values.push(status); }
    if (language) { conditions.push(`language = $${i++}`); values.push(language); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT * FROM customers ${where} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`,
      [...values, limit, offset]
    );
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM customers ${where}`, values
    );
    return { rows, total: parseInt(countRows[0].count) };
  },

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async create({ customerId, name, phoneNumber, email, language = 'en', notes }) {
    const { rows } = await pool.query(
      `INSERT INTO customers (customer_id, name, phone_number, email, language, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [customerId, name, phoneNumber, email, language, notes]
    );
    return rows[0];
  },

  async update(id, fields) {
    const allowed = ['name', 'phone_number', 'email', 'language', 'notes', 'status'];
    const map = { phoneNumber: 'phone_number' };
    const sets = [];
    const values = [];
    let i = 1;

    for (const [key, val] of Object.entries(fields)) {
      const col = map[key] || key;
      if (allowed.includes(col)) {
        sets.push(`${col} = $${i++}`);
        values.push(val);
      }
    }
    if (!sets.length) return this.findById(id);

    sets.push(`updated_at = NOW()`);
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE customers SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, values
    );
    return rows[0] || null;
  },

  async delete(id) {
    const { rows } = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING *', [id]);
    return rows[0] || null;
  }
};

module.exports = Customer;
