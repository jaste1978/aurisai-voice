const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');

const upload = multer({ dest: '/tmp/bolna-uploads/' });

const bolnaAPI = axios.create({
  baseURL: process.env.BOLNA_API_BASE_URL || 'https://api.bolna.ai',
  headers: { Authorization: `Bearer ${process.env.BOLNA_API_KEY}` }
});

// List all batches
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM batches ORDER BY created_at DESC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get batch status from Bolna
router.get('/:id/status', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM batches WHERE id = $1', [req.params.id]);
    const batch = rows[0];
    if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' });
    if (!batch.bolna_batch_id) return res.json({ success: true, data: batch });

    const response = await bolnaAPI.get(`/batches/${batch.bolna_batch_id}`);
    const bolnaData = response.data;

    // Map Bolna status
    const statusMap = {
      'completed': 'completed', 'failed': 'failed', 'in_progress': 'in_progress',
      'scheduled': 'scheduled', 'created': 'created', 'stopped': 'stopped'
    };
    const newStatus = statusMap[bolnaData.status] || bolnaData.status || batch.status;

    await pool.query(
      'UPDATE batches SET status = $1, bolna_response = $2, updated_at = NOW() WHERE id = $3',
      [newStatus, JSON.stringify(bolnaData), batch.id]
    );

    res.json({ success: true, data: { ...batch, status: newStatus, bolna_response: bolnaData } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get batch executions from Bolna
router.get('/:id/executions', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM batches WHERE id = $1', [req.params.id]);
    const batch = rows[0];
    if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' });
    if (!batch.bolna_batch_id) return res.json({ success: true, data: [] });

    const response = await bolnaAPI.get(`/batches/${batch.bolna_batch_id}/executions`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Preview CSV before upload
router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const content = fs.readFileSync(req.file.path, 'utf8');
    fs.unlinkSync(req.file.path);

    const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
    if (!records.length) return res.status(400).json({ success: false, error: 'CSV is empty' });

    const headers = Object.keys(records[0]);
    if (!headers.includes('contact_number')) {
      return res.status(400).json({
        success: false,
        error: 'CSV must have a "contact_number" column'
      });
    }

    res.json({
      success: true,
      data: {
        headers,
        preview: records.slice(0, 5),
        totalRows: records.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create batch — upload CSV to Bolna
router.post('/', upload.single('file'), async (req, res) => {
  let filePath = null;
  try {
    const { agent_id, agent_name, from_phone_number, name } = req.body;
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    if (!agent_id) return res.status(400).json({ success: false, error: 'agent_id is required' });
    if (!from_phone_number) return res.status(400).json({ success: false, error: 'from_phone_number is required' });

    filePath = req.file.path;

    // Count rows
    const content = fs.readFileSync(filePath, 'utf8');
    const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });

    // Send to Bolna
    const form = new FormData();
    form.append('agent_id', agent_id);
    form.append('from_phone_numbers', from_phone_number);
    form.append('file', fs.createReadStream(filePath), {
      filename: req.file.originalname || 'contacts.csv',
      contentType: 'text/csv'
    });
    form.append('webhook_url', process.env.WEBHOOK_URL || 'http://localhost:3000/webhooks/bolna');

    const bolnaRes = await axios.post(
      `${process.env.BOLNA_API_BASE_URL || 'https://api.bolna.ai'}/batches`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${process.env.BOLNA_API_KEY}`
        }
      }
    );

    const bolnaBatch = bolnaRes.data;

    // Save to DB
    const batchId = uuidv4();
    const { rows } = await pool.query(
      `INSERT INTO batches (batch_id, bolna_batch_id, name, agent_id, agent_name, from_phone_number, total_contacts, status, file_name, bolna_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        batchId,
        bolnaBatch.batch_id || bolnaBatch.id,
        name || req.file.originalname,
        agent_id,
        agent_name || '',
        from_phone_number,
        records.length,
        'created',
        req.file.originalname,
        JSON.stringify(bolnaBatch)
      ]
    );

    fs.unlinkSync(filePath);
    res.status(201).json({ success: true, message: 'Batch created successfully', data: rows[0] });
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error('Batch error:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.detail || error.message });
  }
});

// Stop batch
router.post('/:id/stop', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM batches WHERE id = $1', [req.params.id]);
    const batch = rows[0];
    if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' });

    await bolnaAPI.post(`/batches/${batch.bolna_batch_id}/stop`);
    await pool.query('UPDATE batches SET status = $1, updated_at = NOW() WHERE id = $2', ['stopped', batch.id]);

    res.json({ success: true, message: 'Batch stopped' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.response?.data?.detail || error.message });
  }
});

module.exports = router;
