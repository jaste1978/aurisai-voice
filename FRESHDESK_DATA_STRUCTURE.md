# Freshdesk Ticket System - Data Structure Reference

## 🔗 Where Email Comes From

The flow:
```
Bolna Agent Extracts → agent_extraction JSON → Bolna Returns → Our Webhook → Parse → Create Ticket
```

---

## 📥 Input: Bolna Webhook Data

When a call completes, Bolna sends a webhook to our server:

```
POST /webhooks/bolna
```

### Webhook Payload Structure

```json
{
  "execution_id": "2dab3c72-462a-46fa-ab20-27fc6bbf100e",
  "status": "completed",
  "transcript": "assistant: Hi...\nuser: Can you raise...",
  "recording_url": "https://s3.example.com/call.wav",
  "duration": 130,
  "summary": "User requested support ticket",
  "agent_extraction": {
    "support_email": "customer@example.com",
    "support_phone": "+919876543210",
    "issue_type": "bug",
    "severity": "high"
  }
}
```

### Key Field: `agent_extraction`

This is where the AI agent **MUST** return the email and phone number.

```json
{
  "agent_extraction": {
    "support_email": "john.doe@example.com",
    "support_phone": "+919876543210",
    "issue_type": "app_crash",
    "severity": "high",
    "issue_summary": "App crashes on login page"
  }
}
```

---

## 🔍 How We Extract It

In `services/bolnaService.js:135-137`:

```javascript
const extraction = typeof webhookData.agent_extraction === 'string'
  ? JSON.parse(webhookData.agent_extraction)
  : (webhookData.agent_extraction || {});

const supportEmail = extraction.support_email;
const supportPhone = extraction.support_phone;
```

We handle both cases:
- ✅ `agent_extraction` as **object** → use directly
- ✅ `agent_extraction` as **string (JSON)** → parse it
- ✅ Missing → defaults to `{}`

---

## ✅ Condition Check

In `services/bolnaService.js:142`:

```javascript
if (supportEmail && callRecord.agent_id) {
  // All required data is present
  // Proceed to create Freshdesk ticket
}
```

**Both conditions must be true:**
1. `supportEmail` is not empty/null/undefined
2. `callRecord.agent_id` exists

---

## 🎫 Freshdesk Ticket Created

Once conditions pass, we call `freshdeskService.createTicket()`:

```javascript
const ticket = await freshdeskService.createTicket({
  domain: config.freshdesk_domain,        // "augmont"
  apiKey: config.freshdesk_api_key,       // Secret key
  email: supportEmail,                    // ← From agent extraction
  phone: supportPhone || '',              // ← From agent extraction
  name: updated.customer_name || 'Voice Caller',
  subject: 'Support Request via Voice Call',
  description: webhookData.summary || transcript || 'Support ticket raised via Bolna AI voice call.'
});
```

---

## 📤 Output: Freshdesk API Request

We send to Freshdesk:

```
POST https://augmont.freshdesk.com/api/v2/tickets

Headers:
  Authorization: Basic [base64(api_key:X)]
  Content-Type: application/json

Body:
{
  "email": "customer@example.com",
  "name": "Voice Caller",
  "subject": "Support Request via Voice Call",
  "description": "Customer needs help with app crash",
  "priority": 2,
  "status": 2,
  "type": "Other",
  "tags": ["voice-call", "bolna-ai"],
  "custom_fields": {
    "cf_environment": "Production",
    "cf_request_type": "Issue",
    "cf_product": "Other",
    "cf_data_change_request": "Not Bug",
    "cf_data_change": "No"
  }
}
```

---

## 💾 Response: Ticket Created

Freshdesk responds:

```json
{
  "id": 12345,
  "subject": "Support Request via Voice Call",
  "email": "customer@example.com",
  "phone": "+919876543210",
  "status": 2,
  "priority": 2,
  "created_at": "2026-04-02T10:30:00Z"
}
```

---

## 📝 Database Record

We save the ticket info to the `calls` table:

```sql
UPDATE calls
SET freshdesk_ticket = {
  "ticket_id": 12345,
  "ticket_url": "https://augmont.freshdesk.com/helpdesk/tickets/12345",
  "status": "open",
  "subject": "Support Request via Voice Call",
  "email": "customer@example.com",
  "phone": "+919876543210",
  "created_at": "2026-04-02T10:30:00Z"
}
WHERE id = 21
```

---

## 🎯 Agent's Responsibility

The Bolna AI agent **MUST** do this:

### 1. Listen for Support Keywords
```
User says: "I need support", "I have a problem", "Help me", etc.
```

### 2. Ask for Email
```
Agent: "May I please have your email address so we can help you better?"
```

### 3. Extract and Confirm
```
User: "It's john.doe@example.com"
Agent: "Thank you, I've noted john.doe@example.com. A support ticket will be created."
```

### 4. Return Structured Data
```json
{
  "support_email": "john.doe@example.com",
  "support_phone": "+919876543210",  // optional
  "issue_type": "app_crash",
  "issue_summary": "App crashes on login page"
}
```

**CRITICAL:** This must be in `agent_extraction` field in the webhook!

---

## 🔬 Example: Complete Call Lifecycle

### 1. Call Starts
```
POST /api/calls/trigger
{
  "agentId": "a7487186-b053-4ae2-b98e-2fe97bae6a30",
  "phoneNumber": "+919876543210",
  "purpose": "support_call"
}
```

→ Call record created with `id=21`, `status='queued'`

### 2. Bolna Processes Call
```
AI: "Hi, how can I help?"
Customer: "My app is crashing"
AI: "I'm sorry. May I have your email?"
Customer: "john.doe@example.com"
AI: "A ticket will be created for you"
```

### 3. Call Completes - Bolna Sends Webhook
```
POST /webhooks/bolna
{
  "execution_id": "exec-123",
  "status": "completed",
  "transcript": "[full conversation]",
  "agent_extraction": {
    "support_email": "john.doe@example.com",
    "support_phone": "+919876543210",
    "issue_type": "app_crash"
  }
}
```

### 4. Our Webhook Handler Processes
```javascript
// Check: extraction has email? ✅ john.doe@example.com
// Check: call has agent_id? ✅ a7487186-b053-4ae2-b98e-2fe97bae6a30
// Check: agent has Freshdesk enabled? ✅
// Check: agent has API key? ✅
// Result: CREATE TICKET ✅
```

### 5. Freshdesk Ticket Created
```
Ticket #12345
Subject: Support Request via Voice Call
Email: john.doe@example.com
Status: Open
URL: https://augmont.freshdesk.com/helpdesk/tickets/12345
```

### 6. Database Updated
```sql
UPDATE calls SET
  status = 'completed',
  duration = 130,
  freshdesk_ticket = {
    "ticket_id": 12345,
    "ticket_url": "https://augmont.freshdesk.com/helpdesk/tickets/12345",
    "status": "open",
    "email": "john.doe@example.com"
  }
WHERE id = 21
```

---

## 🚨 Failure Cases

### Scenario 1: No Email Extracted
```json
{
  "agent_extraction": {
    "issue_type": "app_crash"
    // ❌ Missing: support_email
  }
}
```

**Result:** Ticket NOT created
**Log:** `⚠️  SKIPPING: No support_email extracted`
**Fix:** Update agent to ask for & extract email

### Scenario 2: Freshdesk Not Configured
```
agent_configs table:
{
  freshdesk_enabled: false,
  freshdesk_api_key: null
}
```

**Result:** Ticket NOT created
**Log:** `⚠️  SKIPPING: Freshdesk not fully configured`
**Fix:** Enable Freshdesk and set API key

### Scenario 3: Agent Config Missing
```sql
SELECT * FROM agent_configs
WHERE agent_id = 'xyz'
-- Returns: no rows
```

**Result:** Ticket NOT created
**Log:** `⚠️  SKIPPING: Freshdesk not fully configured`
**Fix:** Create agent config

### Scenario 4: Freshdesk API Error
```
POST to Freshdesk fails with:
401 Unauthorized (bad API key)
500 Server Error
```

**Result:** Ticket creation attempted but failed
**Log:** `❌ Freshdesk ticket creation failed: [error]`
**Database:** `freshdesk_ticket.error` recorded for audit
**Fix:** Check Freshdesk API key validity

---

## 🔧 Test the Agent Extraction

To verify agent is returning correct data:

```bash
# Check call record
curl http://localhost:3000/api/calls/21

# Look for:
{
  "bolna_response": {
    "agent_extraction": {
      "support_email": "...",
      "support_phone": "..."
    }
  }
}
```

If `agent_extraction` is empty or missing fields → update agent prompt.

