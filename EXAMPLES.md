# 📞 Usage Examples & Agent Configurations

Real-world examples and code snippets to help you get started.

## Example 1: Customer Support Agent

### Agent Configuration

Create this agent on Bolna platform:

```json
{
  "name": "Support Agent",
  "language": "en",
  "systemPrompt": "You are a helpful customer support agent. Answer customer questions about orders, billing, and returns. Be friendly and professional. If you cannot help, offer to transfer to a human agent.",
  "model": "gpt-4",
  "voiceId": "maya",
  "tools": [
    {
      "name": "check_order_status",
      "description": "Check the status of a customer order",
      "url": "https://yourapi.com/api/orders/{orderId}"
    },
    {
      "name": "process_refund",
      "description": "Process a refund for the customer",
      "url": "https://yourapi.com/api/refunds"
    }
  ]
}
```

### Using in Your App

```bash
curl -X POST http://localhost:5000/api/calls/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "64f1a2b3c4d5e6f7g8h9i0j1",
    "agentId": "agent_support_123",
    "purpose": "support",
    "language": "en"
  }'
```

### Expected Flow

```
1. Agent calls customer
2. Greets customer and asks how they can help
3. Customer explains issue
4. Agent checks order using tool
5. Agent processes refund or offers solution
6. Call ends, transcript is stored
```

---

## Example 2: Sales Qualification Agent

### Agent Configuration

```json
{
  "name": "Sales Qualification Agent",
  "language": "en",
  "systemPrompt": "You are a sales representative. Qualify leads by asking about their needs, budget, timeline. Be professional and persuasive. Collect contact information if interested.",
  "model": "gpt-4",
  "voiceId": "josh",
  "tools": [
    {
      "name": "check_product_availability",
      "description": "Check if products are in stock",
      "url": "https://yourapi.com/api/inventory"
    },
    {
      "name": "create_quote",
      "description": "Generate a sales quote",
      "url": "https://yourapi.com/api/quotes"
    }
  ]
}
```

### Node.js Integration

```javascript
const axios = require('axios');

async function triggerSalesCall(customer) {
  const response = await fetch('http://localhost:5000/api/calls/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: customer._id,
      agentId: 'agent_sales_123',
      purpose: 'sales_qualification',
      language: customer.language
    })
  });

  return await response.json();
}

// Usage
const customer = {
  _id: '64f1a2b3c4d5e6f7g8h9i0j1',
  name: 'Jane Smith',
  language: 'en'
};

const result = await triggerSalesCall(customer);
console.log('Call triggered:', result.data.callId);
```

---

## Example 3: Recruitment Interview Agent

### Agent Configuration

```json
{
  "name": "HR Interview Agent",
  "language": "en",
  "systemPrompt": "You are a professional HR recruiter conducting a phone screening. Ask about experience, skills, and availability. Be professional and encouraging. At the end, explain next steps.",
  "model": "gpt-4",
  "voiceId": "nova",
  "tools": [
    {
      "name": "check_position",
      "description": "Check job position details",
      "url": "https://yourapi.com/api/positions"
    },
    {
      "name": "schedule_interview",
      "description": "Schedule next round of interview",
      "url": "https://yourapi.com/api/interviews"
    }
  ]
}
```

### Batch Call Script

```javascript
// scripts/batch-calls.js

const Customer = require('../models/Customer');

async function batchCallCandidates() {
  // Get all pending interview candidates
  const candidates = await Customer.find({
    status: 'active',
    notes: { $regex: 'interview_pending' }
  });

  console.log(`Scheduling ${candidates.length} interviews...`);

  for (const candidate of candidates) {
    try {
      const response = await fetch('http://localhost:5000/api/calls/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: candidate._id,
          agentId: 'agent_hr_123',
          purpose: 'recruitment_interview',
          language: candidate.language || 'en'
        })
      });

      const result = await response.json();
      if (result.success) {
        console.log(`✅ Call scheduled for ${candidate.name}`);
      } else {
        console.log(`❌ Failed for ${candidate.name}: ${result.error}`);
      }

      // Delay to avoid rate limits
      await new Promise(r => setTimeout(r, 1000));
    } catch (error) {
      console.error(`Error for ${candidate.name}:`, error.message);
    }
  }

  console.log('Batch complete!');
}

// Run it
batchCallCandidates();
```

Run with:
```bash
node scripts/batch-calls.js
```

---

## Example 4: Multilingual Support

### Hindi Language Support

```javascript
// Add customer in Hindi
const customer = {
  name: "राज कुमार",
  phoneNumber: "+919876543210",
  language: "hi"  // Hindi
};

// Trigger call in Hindi
const response = await fetch('http://localhost:5000/api/calls/trigger', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: customer._id,
    agentId: 'agent_support_hi',
    language: 'hi'
  })
});
```

Supported languages:
- 🇬🇧 English (en)
- 🇮🇳 Hindi (hi)
- 🇮🇳 Tamil (ta)
- 🇮🇳 Telugu (te)
- 🇮🇳 Kannada (ka)
- 🇮🇳 Malayalam (ml)
- 🇮🇳 Gujarati (gu)
- 🇮🇳 Marathi (mr)
- 🇧🇩 Bengali (bn)
- 🇮🇳 Punjabi (pa)

---

## Example 5: Getting Call Results

### Check Call Status

```javascript
async function checkCallStatus(callId) {
  const response = await fetch(`http://localhost:5000/api/calls/${callId}/status`);
  const result = await response.json();

  return {
    status: result.data.status,
    duration: result.data.duration,
    hasTranscript: !!result.data.transcript,
    hasRecording: !!result.data.recording
  };
}

// Usage
const status = await checkCallStatus('call_123');
console.log(`Call status: ${status.status}`);
console.log(`Duration: ${status.duration} seconds`);
```

### Get Full Transcript

```javascript
async function getCallTranscript(callId) {
  const response = await fetch(`http://localhost:5000/api/calls/${callId}/transcript`);
  const data = await response.json();

  console.log('Conversation:');
  console.log(data.data.transcript);

  return data.data;
}
```

### Access Recording

```javascript
async function getRecordingLink(callId) {
  const response = await fetch(`http://localhost:5000/api/calls/${callId}/recording`);
  const data = await response.json();

  if (data.data.recording.url) {
    console.log('Recording URL:', data.data.recording.url);
    return data.data.recording.url;
  }
}
```

---

## Example 6: Transfer to Human Agent

If the AI agent can't help, transfer to human:

```javascript
async function transferCallToHuman(callId, humanAgentName) {
  const response = await fetch(`http://localhost:5000/api/calls/${callId}/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transferTo: humanAgentName
    })
  });

  const result = await response.json();
  console.log('Call transferred:', result.data.transferredToAgent);
}

// Usage
await transferCallToHuman('call_123', 'agent_john');
```

---

## Example 7: Analytics & Reporting

### Get Call Statistics

```javascript
async function getCallStats() {
  const response = await fetch('http://localhost:5000/api/calls/stats/summary');
  const data = await response.json();

  const stats = data.data;

  console.log('Call Analytics:');
  console.log(`Total Calls: ${stats.totalCalls}`);
  console.log(`Completed: ${stats.completedCalls}`);
  console.log(`Failed: ${stats.failedCalls}`);
  console.log(`Success Rate: ${stats.successRate}`);
  console.log(`Average Duration: ${Math.round(stats.averageDuration)} seconds`);

  return stats;
}

// Generate report
const stats = await getCallStats();
```

### Export to CSV

```javascript
const fs = require('fs');

async function exportCallsToCSV(filename = 'calls_report.csv') {
  const response = await fetch('http://localhost:5000/api/calls?limit=1000');
  const data = await response.json();

  const calls = data.data;

  // Create CSV header
  const headers = ['Call ID', 'Customer', 'Phone', 'Status', 'Duration', 'Date'];
  const csvContent = [
    headers.join(','),
    ...calls.map(call => [
      call.callId,
      call.customerId?.name,
      call.phoneNumber,
      call.status,
      call.duration,
      new Date(call.createdAt).toLocaleDateString()
    ].join(','))
  ].join('\n');

  fs.writeFileSync(filename, csvContent);
  console.log(`Report exported to ${filename}`);
}

// Run export
await exportCallsToCSV('calls_report.csv');
```

---

## Example 8: Schedule Calls for Later

```javascript
// scripts/schedule-calls.js

async function scheduleCallsForTomorrow() {
  const customers = await fetch('http://localhost:5000/api/customers').then(r => r.json());

  // Schedule for 9 AM tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  for (const customer of customers.data) {
    // Store in database with scheduled_time
    const scheduleData = {
      customerId: customer._id,
      agentId: 'agent_support_123',
      scheduledTime: tomorrow,
      purpose: 'routine_check'
    };

    console.log(`Scheduled call for ${customer.name} at 9 AM`);
  }
}
```

Then create a cron job to trigger calls at scheduled times.

---

## Example 9: CRM Integration

### Sync with Your Database

```javascript
// Sync customers from your CRM to Bolna Tracker

async function syncCustomersFromCRM() {
  // Fetch from your CRM
  const crmCustomers = await getCRMCustomers();

  for (const crmCustomer of crmCustomers) {
    // Check if already exists
    const existing = await fetch(`http://localhost:5000/api/customers?search=${crmCustomer.email}`)
      .then(r => r.json());

    if (!existing.data.length) {
      // Add new customer
      await fetch('http://localhost:5000/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: crmCustomer.name,
          phoneNumber: crmCustomer.phone,
          email: crmCustomer.email,
          notes: `CRM ID: ${crmCustomer.id}`
        })
      });

      console.log(`Added ${crmCustomer.name} from CRM`);
    }
  }
}

// Sync call results back to CRM
async function syncCallsToCRM() {
  const response = await fetch('http://localhost:5000/api/calls?status=completed');
  const calls = await response.json();

  for (const call of calls.data) {
    // Update in your CRM
    await updateCRMWithCallResult({
      customerId: call.customerId,
      callStatus: call.status,
      transcript: call.transcript
    });
  }
}
```

---

## Example 10: Error Handling & Retry Logic

```javascript
async function triggerCallWithRetry(customerId, agentId, maxRetries = 3) {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      const response = await fetch('http://localhost:5000/api/calls/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, agentId })
      });

      if (response.ok) {
        return await response.json();
      }

      attempts++;
      console.log(`Attempt ${attempts} failed, retrying...`);

      // Wait before retry (exponential backoff)
      await new Promise(r => setTimeout(r, Math.pow(2, attempts) * 1000));
    } catch (error) {
      attempts++;
      console.error(`Error on attempt ${attempts}:`, error.message);
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts`);
}

// Usage
try {
  const result = await triggerCallWithRetry(customerId, agentId);
  console.log('Call triggered:', result.data.callId);
} catch (error) {
  console.error('All retries failed:', error.message);
}
```

---

## Next Steps

- Start with **Example 1** for basic setup
- Explore **Example 2 & 3** for your use case
- Use **Example 7 & 8** for analytics and scheduling
- Integrate **Example 9** with your existing system

---

Need more examples? Check the full README.md for detailed documentation!
