const express = require('express');
const router = express.Router();
const Script = require('../models/Script');
const { generateScript } = require('../services/scriptGeneratorService');
const { authenticate } = require('../middleware/auth');

// All routes require auth
router.use(authenticate);

// GET /api/scripts — list all
router.get('/', async (req, res) => {
  try {
    const scripts = await Script.findAll();
    res.json({ success: true, data: scripts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/scripts/:id
router.get('/:id', async (req, res) => {
  try {
    const script = await Script.findById(req.params.id);
    if (!script) return res.status(404).json({ success: false, error: 'Script not found' });
    res.json({ success: true, data: script });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/scripts/generate — generate via LLM
router.post('/generate', async (req, res) => {
  try {
    const {
      provider = 'openai',
      agentName, agentGender, company, purpose, context,
      tone, language, callDuration, sections, faqTopics,
      guardrails, extraInstructions
    } = req.body;

    if (!purpose || !context) {
      return res.status(400).json({ success: false, error: 'purpose and context are required' });
    }

    // Key check per provider
    if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
      return res.status(400).json({ success: false, error: 'OPENAI_API_KEY is not set in .env' });
    }
    if (provider === 'gemini' && !process.env.GEMINI_API_KEY) {
      return res.status(400).json({ success: false, error: 'GEMINI_API_KEY is not set in .env' });
    }

    const content = await generateScript({
      provider,
      agentName, agentGender, company, purpose, context,
      tone, language, callDuration, sections, faqTopics,
      guardrails, extraInstructions
    });

    res.json({ success: true, data: { content } });
  } catch (err) {
    const msg = err?.status === 401
      ? 'Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY in .env.'
      : err.message;
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/scripts — save a script
router.post('/', async (req, res) => {
  try {
    const { name, agentName, agentGender, company, purpose, description, content, metadata } = req.body;
    if (!name || !content) {
      return res.status(400).json({ success: false, error: 'name and content are required' });
    }
    const script = await Script.create({
      name, agentName, agentGender, company, purpose, description, content, metadata,
      createdBy: req.user.id
    });
    res.status(201).json({ success: true, data: script });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/scripts/:id
router.put('/:id', async (req, res) => {
  try {
    const script = await Script.update(req.params.id, req.body);
    if (!script) return res.status(404).json({ success: false, error: 'Script not found' });
    res.json({ success: true, data: script });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/scripts/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Script.delete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Script not found' });
    res.json({ success: true, message: 'Script deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
