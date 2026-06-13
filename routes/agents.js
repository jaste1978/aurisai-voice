const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/', async (req, res) => {
  try {
    const response = await axios.get('https://api.bolna.ai/v2/agent/all', {
      headers: { Authorization: `Bearer ${process.env.BOLNA_API_KEY}` }
    });
    const agents = (response.data || []).map(a => ({
      id: a.id,
      name: a.agent_name,
      status: a.agent_status
    }));
    res.json({ success: true, data: agents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.response?.data?.detail || error.message });
  }
});

module.exports = router;
