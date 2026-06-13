const axios = require('axios');

/**
 * Creates a Freshdesk support ticket.
 * @param {object} opts
 * @param {string} opts.domain        - Freshdesk subdomain (e.g. "augmont")
 * @param {string} opts.apiKey        - Freshdesk API key
 * @param {string} opts.email         - Requester email
 * @param {string} opts.phone         - Requester phone (optional)
 * @param {string} opts.name          - Requester name (optional)
 * @param {string} opts.subject       - Ticket subject
 * @param {string} opts.description   - Ticket description / call summary
 * @returns {object} Ticket result with ticket_id, ticket_url, status, etc.
 */
async function createTicket({ domain, apiKey, email, phone, name, subject, description }) {
  const url = `https://${domain}.freshdesk.com/api/v2/tickets`;
  const token = Buffer.from(`${apiKey}:X`).toString('base64');

  const payload = {
    email,
    name: name || 'Voice Caller',
    subject: subject || 'Support Request via Voice Call',
    description: description || 'Support ticket raised via Bolna AI voice call.',
    priority: 2,  // Medium
    status: 2,    // Open
    type: 'Other',
    tags: ['voice-call', 'bolna-ai'],
    // Augmont Freshdesk required custom fields
    custom_fields: {
      cf_environment: 'Production',
      cf_request_type: 'Issue',
      cf_product: 'Other',
      cf_data_change_request: 'Not Bug',
      cf_data_change: 'No',
    },
  };
  if (phone) payload.phone = phone;

  const response = await axios.post(url, payload, {
    headers: {
      'Authorization': `Basic ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

  const ticket = response.data;
  return {
    ticket_id: ticket.id,
    ticket_url: `https://${domain}.freshdesk.com/helpdesk/tickets/${ticket.id}`,
    status: 'open',
    subject: ticket.subject,
    email: ticket.email || email,
    phone: phone || null,
    created_at: ticket.created_at || new Date().toISOString(),
  };
}

module.exports = { createTicket };
