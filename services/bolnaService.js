const axios = require('axios');
const Call = require('../models/Call');

const bolnaAPI = axios.create({
  baseURL: process.env.BOLNA_API_BASE_URL || 'https://api.bolna.ai',
  headers: {
    'Authorization': `Bearer ${process.env.BOLNA_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

async function createAgent(agentConfig) {
  try {
    const response = await bolnaAPI.post('/agents', {
      name: agentConfig.name || 'Default Agent',
      language: agentConfig.language || 'en',
      systemPrompt: agentConfig.systemPrompt || 'You are a helpful assistant',
      model: agentConfig.model || 'gpt-4',
      voiceId: agentConfig.voiceId,
      transcriber: agentConfig.transcriber || 'deepgram',
      llm: {
        model: agentConfig.model || 'gpt-4',
        temperature: agentConfig.temperature || 0.7,
        max_tokens: agentConfig.maxTokens || 100
      },
      tools: agentConfig.tools || [],
      enableRecording: true,
      enableTranscription: true,
      interruptionConfig: { enabled: true, sensitivity: 0.5 }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating agent:', error.response?.data || error.message);
    throw error;
  }
}

async function triggerCall(phoneNumber, agentId, customerId, callData) {
  try {
    const response = await bolnaAPI.post('/call', {
      agent_id: agentId,
      recipient_phone_number: phoneNumber,
      user_data: {
        customer_id: String(customerId),
        customer_name: callData.customerName,
        call_purpose: callData.purpose || 'customer_outreach',
        language: callData.language || 'en'
      },
      webhook_url: process.env.WEBHOOK_URL || 'http://localhost:3000/webhooks/bolna'
    });
    console.log('Call triggered:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error triggering call:', error.response?.data || error.message);
    throw error;
  }
}

async function getCallDetails(executionId) {
  try {
    const response = await bolnaAPI.get(`/executions/${executionId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching call details:', error.response?.data || error.message);
    throw error;
  }
}

async function getCallTranscript(executionId) {
  try {
    const response = await bolnaAPI.get(`/executions/${executionId}/transcript`);
    return response.data;
  } catch (error) {
    console.error('Error fetching transcript:', error.response?.data || error.message);
    throw error;
  }
}

async function getCallRecording(executionId) {
  try {
    const response = await bolnaAPI.get(`/executions/${executionId}/recording`);
    return response.data;
  } catch (error) {
    console.error('Error fetching recording:', error.response?.data || error.message);
    throw error;
  }
}

async function getAllCalls(limit = 50, offset = 0) {
  try {
    const response = await bolnaAPI.get('/executions', { params: { limit, offset } });
    return response.data;
  } catch (error) {
    console.error('Error fetching calls:', error.response?.data || error.message);
    throw error;
  }
}

async function transferCall(executionId, transferTo) {
  try {
    const response = await bolnaAPI.post(`/executions/${executionId}/transfer`, { transferTo });
    return response.data;
  } catch (error) {
    console.error('Error transferring call:', error.response?.data || error.message);
    throw error;
  }
}

async function processCallWebhook(webhookData) {
  try {
    const { execution_id, status, transcript, recording_url, duration, error } = webhookData;

    const callRecord = await Call.findByBolnaExecutionId(execution_id);
    if (callRecord) {
      const updates = {
        status: mapBolnaStatus(status),
        transcript: transcript || '',
        duration: duration || 0,
        callEndTime: new Date(),
        bolnaResponse: webhookData
      };
      if (recording_url) {
        updates.recordingUrl = recording_url;
        updates.recordingDuration = duration;
      }
      if (error) {
        updates.errorMessage = error.message;
        updates.errorCode = error.code;
      }
      const updated = await Call.update(callRecord.id, updates);
      console.log('Call updated:', updated.id);

      // ── Post-call: auto-create Freshdesk ticket if support data was collected ──
      try {
        const extraction = typeof webhookData.agent_extraction === 'string'
          ? JSON.parse(webhookData.agent_extraction)
          : (webhookData.agent_extraction || {});

        const supportEmail = extraction.support_email;
        const supportPhone = extraction.support_phone;

        console.log(`\n📞 Freshdesk Ticket Check for Call ${callRecord.id}:`);
        console.log(`   - support_email: ${supportEmail ? '✅ ' + supportEmail : '❌ NOT FOUND'}`);
        console.log(`   - support_phone: ${supportPhone ? '✅ ' + supportPhone : 'ℹ️  optional'}`);
        console.log(`   - agent_id: ${callRecord.agent_id ? '✅ ' + callRecord.agent_id : '❌ MISSING'}`);

        if (!supportEmail) {
          console.log(`   ⚠️  SKIPPING: No support_email extracted. Agent must collect customer email during call.`);
        } else if (!callRecord.agent_id) {
          console.log(`   ⚠️  SKIPPING: No agent_id in call record.`);
        } else {
          const AgentConfig = require('../models/AgentConfig');
          const config = await AgentConfig.findByAgentId(callRecord.agent_id);

          console.log(`   - Freshdesk enabled: ${config?.freshdesk_enabled ? '✅' : '❌'}`);
          console.log(`   - Freshdesk domain: ${config?.freshdesk_domain ? '✅' : '❌'}`);
          console.log(`   - Freshdesk API key: ${config?.freshdesk_api_key ? '✅' : '❌'}`);

          if (config?.freshdesk_enabled && config.freshdesk_domain && config.freshdesk_api_key) {
            const freshdeskService = require('./freshdeskService');
            const description = webhookData.summary
              || (webhookData.transcript || '').substring(0, 800)
              || 'Support ticket raised via Bolna AI voice call.';

            console.log(`   🚀 Creating Freshdesk ticket...`);
            try {
              const ticket = await freshdeskService.createTicket({
                domain: config.freshdesk_domain,
                apiKey: config.freshdesk_api_key,
                email: supportEmail,
                phone: supportPhone || '',
                name: updated.customer_name || 'Voice Caller',
                subject: 'Support Request via Voice Call',
                description,
              });
              await Call.update(callRecord.id, { freshdeskTicket: ticket });
              console.log(`   ✅ Freshdesk ticket #${ticket.ticket_id} created successfully!`);
              console.log(`   📋 URL: ${ticket.ticket_url}`);
            } catch (fdErr) {
              console.error(`   ❌ Freshdesk ticket creation failed: ${fdErr.message}`);
              await Call.update(callRecord.id, {
                freshdeskTicket: { error: fdErr.message, attempted_at: new Date().toISOString() }
              });
            }
          } else {
            console.log(`   ⚠️  SKIPPING: Freshdesk not fully configured for this agent.`);
          }
        }
      } catch (fdLookupErr) {
        console.error(`Freshdesk ticket check error: ${fdLookupErr.message}`);
      }
      // ──────────────────────────────────────────────────────────────────────────

      return updated;
    }
  } catch (error) {
    console.error('Error processing webhook:', error.message);
    throw error;
  }
}

function mapBolnaStatus(bolnaStatus) {
  const statusMap = {
    'COMPLETED': 'completed',
    'FAILED': 'failed',
    'TRANSFERRED': 'transferred',
    'IN_PROGRESS': 'in_progress',
    'QUEUED': 'queued'
  };
  return statusMap[bolnaStatus] || bolnaStatus;
}

module.exports = {
  createAgent, triggerCall, getCallDetails, getCallTranscript,
  getCallRecording, getAllCalls, transferCall, processCallWebhook
};
