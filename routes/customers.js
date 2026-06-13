const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Customer = require('../models/Customer');

router.get('/', async (req, res) => {
  try {
    const { status, language, page = 1, limit = 20 } = req.query;
    const { rows, total } = await Customer.findAll({ status, language, page, limit });
    res.json({
      success: true,
      data: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, phoneNumber, email, language, notes } = req.body;
    if (!name || !phoneNumber) {
      return res.status(400).json({ success: false, error: 'Name and phone number are required' });
    }
    const customer = await Customer.create({
      customerId: uuidv4(), name, phoneNumber, email, language, notes
    });
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const customer = await Customer.update(req.params.id, req.body);
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.delete(req.params.id);
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
    res.json({ success: true, message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
