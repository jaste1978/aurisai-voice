const express = require('express');
const router = express.Router();
const AgentConfig = require('../models/AgentConfig');
const { authenticate } = require('../middleware/auth');

// GET /api/agent-configs/:agentId
// Returns the config for an agent; API key is masked for security
router.get('/:agentId', authenticate, async (req, res) => {
  try {
    const config = await AgentConfig.findByAgentId(req.params.agentId);
    if (!config) {
      return res.json({
        success: true,
        data: {
          agentId: req.params.agentId,
          freshdeskEnabled: false,
          freshdeskDomain: '',
          freshdeskApiKeySet: false,
          freshdeskApiKeyMasked: '',
        }
      });
    }

    const key = config.freshdesk_api_key || '';
    res.json({
      success: true,
      data: {
        agentId: config.agent_id,
        freshdeskEnabled: config.freshdesk_enabled,
        freshdeskDomain: config.freshdesk_domain || '',
        freshdeskApiKeySet: !!key,
        freshdeskApiKeyMasked: key ? `****${key.slice(-4)}` : '',
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/agent-configs/:agentId
// Upserts config; pass empty string for freshdeskApiKey to keep existing key
router.put('/:agentId', authenticate, async (req, res) => {
  try {
    const { freshdeskEnabled, freshdeskDomain, freshdeskApiKey } = req.body;
    const config = await AgentConfig.upsert({
      agentId: req.params.agentId,
      freshdeskEnabled: !!freshdeskEnabled,
      freshdeskDomain: freshdeskDomain || '',
      freshdeskApiKey: freshdeskApiKey || '',
    });

    const key = config.freshdesk_api_key || '';
    res.json({
      success: true,
      data: {
        agentId: config.agent_id,
        freshdeskEnabled: config.freshdesk_enabled,
        freshdeskDomain: config.freshdesk_domain || '',
        freshdeskApiKeySet: !!key,
        freshdeskApiKeyMasked: key ? `****${key.slice(-4)}` : '',
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/agent-configs/:agentId/diagnostic
// Check Freshdesk readiness and requirements
router.get('/:agentId/diagnostic', authenticate, async (req, res) => {
  try {
    const config = await AgentConfig.findByAgentId(req.params.agentId);

    const checks = {
      agent_id: {
        status: !!req.params.agentId,
        message: req.params.agentId ? '✅ Agent ID provided' : '❌ No agent ID'
      },
      freshdesk_enabled: {
        status: config?.freshdesk_enabled,
        message: config?.freshdesk_enabled ? '✅ Freshdesk enabled' : '⚠️  Freshdesk not enabled - enable it first'
      },
      freshdesk_domain: {
        status: !!config?.freshdesk_domain,
        message: config?.freshdesk_domain ? `✅ Domain set: ${config.freshdesk_domain}` : '❌ Freshdesk domain not configured'
      },
      freshdesk_api_key: {
        status: !!config?.freshdesk_api_key,
        message: config?.freshdesk_api_key ? '✅ API key configured' : '❌ Freshdesk API key not set'
      }
    };

    const allConfigured = Object.values(checks).every(c => c.status);

    res.json({
      success: true,
      data: {
        agentId: req.params.agentId,
        freshdeskConfigured: allConfigured,
        checks,
        nextSteps: allConfigured
          ? [
              '✅ Agent is ready for Freshdesk tickets',
              '📝 Agent must extract support_email during calls',
              '💡 Update agent system prompt to ask for: "May I have your email for our records?"',
              '🎯 Email must be returned in agent_extraction.support_email'
            ]
          : [
              '⚠️  Complete these steps:',
              'Step 1: Enable Freshdesk in agent config',
              'Step 2: Set Freshdesk domain (e.g., "augmont")',
              'Step 3: Configure Freshdesk API key',
              'Step 4: Update agent system prompt to collect email'
            ]
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
