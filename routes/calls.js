const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Call = require('../models/Call');
const Customer = require('../models/Customer');
const bolnaService = require('../services/bolnaService');

router.get('/stats/summary', async (req, res) => {
  try {
    const s = await Call.stats();
    const total = parseInt(s.total);
    const completed = parseInt(s.completed);
    res.json({
      success: true,
      data: {
        totalCalls: total,
        completedCalls: completed,
        failedCalls: parseInt(s.failed),
        inProgressCalls: parseInt(s.in_progress),
        transferredCalls: parseInt(s.transferred),
        successRate: total > 0 ? ((completed / total) * 100).toFixed(2) + '%' : '0%',
        averageDuration: parseFloat(s.avg_duration) || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status, customerId, page = 1, limit = 20 } = req.query;
    const { rows, total } = await Call.findAll({ status, customerId, page, limit });
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

// GET /api/calls/support-tickets
// Get all support tickets that were created from calls (have freshdesk_ticket)
router.get('/support-tickets', async (req, res) => {
  try {
    const { page = 1, limit = 20, agentId, status } = req.query;
    const offset = (page - 1) * limit;

    // Query: get calls with freshdesk_ticket data, join with agent info
    let query = `
      SELECT
        c.id,
        c.call_id,
        c.customer_id,
        c.agent_id,
        c.agent_name,
        c.created_at as call_created_at,
        c.call_start_time,
        c.call_end_time,
        c.duration,
        c.status as call_status,
        c.freshdesk_ticket,
        c.transcript,
        cu.name as customer_name,
        cu.phone_number as customer_phone,
        cu.email as customer_email
      FROM calls c
      LEFT JOIN customers cu ON c.customer_id = cu.id
      WHERE c.freshdesk_ticket IS NOT NULL
    `;

    const params = [];
    let paramCount = 1;

    if (agentId) {
      query += ` AND c.agent_id = $${paramCount++}`;
      params.push(agentId);
    }

    if (status) {
      query += ` AND c.status = $${paramCount++}`;
      params.push(status);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total FROM calls c
      WHERE c.freshdesk_ticket IS NOT NULL
      ${agentId ? 'AND c.agent_id = $1' : ''}
      ${status ? (agentId ? 'AND c.status = $2' : 'AND c.status = $1') : ''}
    `;
    const countParams = [];
    if (agentId) countParams.push(agentId);
    if (status) countParams.push(status);

    const { rows: countRows } = await require('../db').pool.query(countQuery, countParams);
    const total = parseInt(countRows[0].total);

    // Get paginated results
    query += ` ORDER BY c.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const { rows } = await require('../db').pool.query(query, params);

    // Parse freshdesk_ticket JSON and add status
    const tickets = rows.map(row => {
      let ticket = {};
      if (row.freshdesk_ticket) {
        ticket = typeof row.freshdesk_ticket === 'string'
          ? JSON.parse(row.freshdesk_ticket)
          : row.freshdesk_ticket;
      }

      return {
        id: row.id,
        call_id: row.call_id,
        agent_id: row.agent_id,
        agent_name: row.agent_name || 'Unknown Agent',
        customer_id: row.customer_id,
        customer_name: row.customer_name,
        customer_phone: row.customer_phone,
        customer_email: row.customer_email,
        call_created_at: row.call_created_at,
        call_start_time: row.call_start_time,
        call_end_time: row.call_end_time,
        duration: row.duration,
        call_status: row.call_status,
        transcript: row.transcript,
        ticket: {
          ticket_id: ticket.ticket_id,
          ticket_url: ticket.ticket_url,
          status: ticket.status,
          subject: ticket.subject,
          email: ticket.email,
          phone: ticket.phone,
          created_at: ticket.created_at,
          error: ticket.error
        }
      };
    });

    res.json({
      success: true,
      data: tickets,
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
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json({ success: false, error: 'Call not found' });
    res.json({ success: true, data: call });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/trigger', async (req, res) => {
  try {
    const { customerId, agentId, phoneNumber, purpose, language } = req.body;
    if (!agentId) {
      return res.status(400).json({ success: false, error: 'agentId is required' });
    }

    // Resolve customer info — either from DB or use raw phone number
    let customer = null;
    let resolvedPhone = phoneNumber;
    if (customerId) {
      customer = await Customer.findById(customerId);
      if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
      resolvedPhone = customer.phone_number;
    }
    if (!resolvedPhone) {
      return res.status(400).json({ success: false, error: 'phoneNumber or a valid customerId is required' });
    }

    const callRecord = await Call.create({
      callId: uuidv4(),
      customerId: customer?.id || null,
      phoneNumber: resolvedPhone,
      status: 'queued',
      language: language || customer?.language || 'en',
      agentId
    });

    try {
      const bolnaResponse = await bolnaService.triggerCall(
        resolvedPhone, agentId, customer?.id || null,
        { customerName: customer?.name || resolvedPhone, purpose: purpose || 'outreach', language: language || customer?.language || 'en' }
      );

      const updated = await Call.update(callRecord.id, {
        bolnaExecutionId: bolnaResponse.execution_id || bolnaResponse.id,
        status: 'in_progress',
        callStartTime: new Date()
      });

      res.status(201).json({ success: true, message: 'Call triggered successfully', data: updated });
    } catch (bolnaError) {
      await Call.update(callRecord.id, {
        status: 'failed',
        errorMessage: bolnaError.response?.data?.message || bolnaError.message,
        errorCode: bolnaError.response?.data?.code
      });
      res.status(400).json({
        success: false,
        error: bolnaError.response?.data?.message || bolnaError.message,
        callId: callRecord.id
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/status', async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json({ success: false, error: 'Call not found' });
    res.json({
      success: true,
      data: {
        callId: call.call_id,
        status: call.status,
        customerId: call.customer_id,
        customerName: call.customer_name,
        phoneNumber: call.customer_phone,
        duration: call.duration,
        transcript: call.transcript ? call.transcript.substring(0, 200) + '...' : null,
        recording: call.recording_url ? { url: call.recording_url } : null,
        errorMessage: call.error_message,
        createdAt: call.created_at,
        updatedAt: call.updated_at
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/transcript', async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json({ success: false, error: 'Call not found' });
    res.json({ success: true, data: { callId: call.call_id, transcript: call.transcript, duration: call.duration } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/recording', async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json({ success: false, error: 'Call not found' });
    if (!call.recording_url) return res.status(404).json({ success: false, error: 'No recording available' });
    res.json({ success: true, data: { callId: call.call_id, recording: { url: call.recording_url } } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stream / proxy recording audio — pipes S3 file so browser can play with range support
router.get('/:id/recording/stream', async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json({ success: false, error: 'Call not found' });
    if (!call.recording_url) return res.status(404).json({ success: false, error: 'No recording available' });

    const axios = require('axios');
    const rangeHeader = req.headers['range'];
    const axiosConfig = {
      responseType: 'stream',
      headers: rangeHeader ? { Range: rangeHeader } : {}
    };

    const upstream = await axios.get(call.recording_url, axiosConfig);

    const headers = {
      'Content-Type': upstream.headers['content-type'] || 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    };
    if (upstream.headers['content-length']) headers['Content-Length'] = upstream.headers['content-length'];
    if (upstream.headers['content-range']) headers['Content-Range'] = upstream.headers['content-range'];
    res.set(headers);
    res.status(rangeHeader ? 206 : 200);
    upstream.data.pipe(res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/transfer', async (req, res) => {
  try {
    const { transferTo } = req.body;
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json({ success: false, error: 'Call not found' });
    if (!call.bolna_execution_id) return res.status(400).json({ success: false, error: 'Call has no execution ID' });

    try {
      await bolnaService.transferCall(call.bolna_execution_id, transferTo);
      const updated = await Call.update(call.id, {
        transferredToAgent: true,
        transferredAgentName: transferTo,
        status: 'transferred'
      });
      res.json({ success: true, message: 'Call transferred successfully', data: updated });
    } catch (error) {
      res.status(400).json({ success: false, error: error.response?.data?.message || error.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk sync ALL calls that have a Bolna execution ID
router.post('/sync-all', async (req, res) => {
  try {
    const { rows: allCalls } = await require('../db').pool.query(
      `SELECT * FROM calls WHERE bolna_execution_id IS NOT NULL ORDER BY created_at DESC`
    );

    const statusMap = {
      'completed': 'completed', 'failed': 'failed', 'busy': 'failed',
      'no-answer': 'failed', 'in_progress': 'in_progress', 'queued': 'queued',
      'transferred': 'transferred', 'canceled': 'failed', 'ringing': 'in_progress'
    };

    const results = { synced: 0, failed: 0, errors: [] };

    for (const call of allCalls) {
      try {
        const exec = await bolnaService.getCallDetails(call.bolna_execution_id);

        const updates = {
          status: statusMap[exec.status] || exec.status,
          transcript: exec.transcript || call.transcript || '',
          duration: Math.round(exec.conversation_duration || 0),
          bolnaResponse: exec
        };

        if (exec.telephony_data?.recording_url) updates.recordingUrl = exec.telephony_data.recording_url;
        if (exec.error_message) updates.errorMessage = exec.error_message;
        if (exec.telephony_data?.hangup_reason) updates.agentResponseNotes = exec.telephony_data.hangup_reason;
        if (exec.summary) updates.agentResponseOutcome = exec.summary;
        if (exec.total_cost != null) updates.totalCost = exec.total_cost;

        await Call.update(call.id, updates);
        results.synced++;
      } catch (err) {
        results.failed++;
        results.errors.push({ callId: call.id, bolnaId: call.bolna_execution_id, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Synced ${results.synced} calls, ${results.failed} failed`,
      data: results
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync call data from Bolna
router.post('/:id/sync', async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json({ success: false, error: 'Call not found' });
    if (!call.bolna_execution_id) return res.status(400).json({ success: false, error: 'No Bolna execution ID' });

    const exec = await bolnaService.getCallDetails(call.bolna_execution_id);

    const statusMap = {
      'completed': 'completed', 'failed': 'failed', 'busy': 'failed',
      'no-answer': 'failed', 'in_progress': 'in_progress', 'queued': 'queued',
      'transferred': 'transferred', 'canceled': 'failed'
    };

    const updates = {
      status: statusMap[exec.status] || exec.status,
      transcript: exec.transcript || call.transcript || '',
      duration: Math.round(exec.conversation_duration || 0),
      bolnaResponse: exec
    };

    if (exec.telephony_data?.recording_url) {
      updates.recordingUrl = exec.telephony_data.recording_url;
    }
    if (exec.error_message) updates.errorMessage = exec.error_message;
    if (exec.telephony_data?.hangup_reason) {
      updates.agentResponseNotes = exec.telephony_data.hangup_reason;
    }
    if (exec.summary) updates.agentResponseOutcome = exec.summary;

    const updated = await Call.update(call.id, updates);
    res.json({ success: true, message: 'Call synced from Bolna', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/analyze', async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json({ success: false, error: 'Call not found' });

    const transcript = call.transcript || call.bolna_response?.transcript;
    if (!transcript || transcript.trim().length < 20) {
      return res.status(400).json({ success: false, error: 'No transcript available to analyze' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ success: false, error: 'OPENAI_API_KEY not configured' });
    }

    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `You are an expert call analyst specializing in both sales/service calls AND recruitment/interview calls. Analyze this transcript and return ONLY valid JSON (no markdown, no explanation).

TRANSCRIPT:
${transcript}

Return this exact JSON structure:
{
  "overall_sentiment": "positive|neutral|negative",
  "sentiment_score": 0-100,
  "engagement_level": "high|medium|low",
  "engagement_score": 0-100,
  "conversion_likelihood": 0-100,
  "emotional_tone": "string describing user's emotional state",
  "sentiment_journey": [
    { "speaker": "user|agent", "text": "short excerpt", "sentiment": "positive|neutral|negative", "score": 0-100 }
  ],
  "objections": ["array of specific objections raised by user"],
  "intent_signals": ["array of positive buying/engagement signals"],
  "key_moments": [
    { "moment": "description of key moment", "type": "objection|interest|confusion|agreement|callback_request|language_switch|disengagement" }
  ],
  "behavioral_tags": ["array of tags like: price_sensitive, time_constrained, language_barrier, app_issue, already_customer, not_interested, callback_requested, voicemail, engaged, disengaged"],
  "user_profile_summary": "2-3 sentence behavioral summary of this user",
  "follow_up_recommendation": "specific actionable recommendation for next contact",
  "agent_performance": {
    "clarity": 0-100,
    "empathy": 0-100,
    "objection_handling": 0-100,
    "notes": "brief agent performance note"
  },
  "communication_skills": {
    "overall_score": 0-100,
    "overall_grade": "A|B|C|D|F",
    "summary": "2-3 sentence summary of the candidate/user's communication quality",
    "metrics": {
      "clarity": { "score": 0-100, "label": "Clarity of Expression", "observation": "one line observation from transcript" },
      "confidence": { "score": 0-100, "label": "Confidence Level", "observation": "one line observation from transcript" },
      "vocabulary": { "score": 0-100, "label": "Vocabulary & Language", "observation": "one line observation from transcript" },
      "listening": { "score": 0-100, "label": "Listening & Comprehension", "observation": "one line observation from transcript" },
      "relevance": { "score": 0-100, "label": "Response Relevance", "observation": "one line observation from transcript" },
      "fluency": { "score": 0-100, "label": "Fluency & Articulation", "observation": "one line observation from transcript" },
      "professionalism": { "score": 0-100, "label": "Professional Tone", "observation": "one line observation from transcript" }
    },
    "strengths": ["array of 2-3 specific communication strengths observed"],
    "areas_for_improvement": ["array of 2-3 specific areas to improve"],
    "language_used": "English|Hindi|Hinglish|Mixed",
    "filler_words_detected": ["array of filler words/phrases noticed if any"],
    "notable_quotes": ["1-2 direct quotes from user that best represent their communication style"]
  },
  "analyzed_at": "${new Date().toISOString()}"
}`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const insights = JSON.parse(response.choices[0].message.content);
    const updated = await Call.update(call.id, { behavioralInsights: insights });
    res.json({ success: true, data: insights });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
