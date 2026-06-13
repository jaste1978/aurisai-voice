# Freshdesk Ticket Auto-Creation Requirements

## Overview
Freshdesk support tickets are **automatically created** after each call completes, but **ONLY if certain conditions are met**.

## Required Conditions

### 1. **Freshdesk Configuration** ✅ (Already Set)
- Agent must have Freshdesk enabled in `agent_configs` table
- `freshdesk_domain` must be set (e.g., `augmont`)
- `freshdesk_api_key` must be configured

### 2. **Support Email** ❌ **CRITICAL - NOT BEING COLLECTED**
The AI agent **MUST extract and return** the customer's email address in the call.

**What needs to happen:**
- During the call, the AI should ask: *"May I have your email address for our records?"*
- The email must be extracted and returned in the Bolna `agent_extraction` JSON field
- Key field name: `support_email`

**Example extraction JSON (from Bolna):**
```json
{
  "agent_extraction": {
    "support_email": "customer@example.com",
    "support_phone": "+919876543210",
    "issue_type": "app_bug",
    "severity": "high"
  }
}
```

### 3. **Agent Must Be Configured**
- Agent ID must exist in the call record
- Agent must have Freshdesk settings enabled

## Current Status

### Last 5 Calls Analysis:
```
Call #21 (2026-04-02)
  Status: completed ✅
  Agent Configured: Yes ✅
  support_email extracted: NO ❌ → TICKET NOT CREATED
  support_phone extracted: NO ❌

Call #20 (2026-04-02)
  Status: completed ✅
  Agent Configured: Yes ✅
  support_email extracted: NO ❌ → TICKET NOT CREATED
  support_phone extracted: NO ❌
```

## What Happens When Ticket IS Created

When all conditions are met, the system:
1. ✅ Extracts `support_email` and `support_phone` from `agent_extraction`
2. ✅ Checks if agent has Freshdesk enabled
3. ✅ Calls Freshdesk API to create ticket
4. ✅ Saves ticket ID, URL, and status to the `calls.freshdesk_ticket` column
5. ✅ Logs success/failure for audit

## Ticket Details When Created

**Priority:** Medium (2)
**Status:** Open
**Subject:** "Support Request via Voice Call"
**Description:** Call summary or transcript (first 800 chars)
**Tags:** `voice-call`, `bolna-ai`
**Custom Fields:** Environment, Request Type, Product, etc.

## Solution

### For Each Agent:
1. Go to **Bolna Agent Settings** (https://platform.bolna.ai/agents)
2. Edit the agent's **System Prompt**
3. **Add this instruction:**

```
During the call:
- Ask for the customer's email: "May I please have your email address so we can help you better?"
- Ask for phone if needed: "What's the best phone number to reach you?"
- Extract these EXACTLY in JSON as:
{
  "support_email": "<their_email>",
  "support_phone": "<their_phone>",
  "issue_summary": "<brief description>"
}
```

## How to Verify It's Working

1. Trigger a test call
2. When the AI asks for email, provide: `test@augmont.com`
3. Call completes
4. Check the call record: `curl http://localhost:3000/api/calls`
5. If `freshdesk_ticket` field has a ticket ID → ✅ **SUCCESS**
6. If `freshdesk_ticket` is null → check if email was extracted

## Code Reference

**Webhook Handler:** `services/bolnaService.js:134-176` - This is where ticket creation is triggered
**Freshdesk Service:** `services/freshdeskService.js:15-57` - Creates the ticket
**Condition Check:** `services/bolnaService.js:142` - Requires `supportEmail` + `agent_id`

