# Support Tickets Page - Feature Documentation

## 🎯 Overview

The Support Tickets page provides a centralized dashboard to view all support tickets that have been automatically created from AI voice calls. It displays comprehensive information about each ticket including:

- ✅ Ticket ID from Freshdesk
- ✅ Agent Name and ID
- ✅ Customer Name and Contact Details
- ✅ Date & Time of Call
- ✅ Call Duration
- ✅ Ticket Status
- ✅ Direct Link to Freshdesk

---

## 📍 Access

**Menu Location:** `Support Tickets` (between "Calls" and "Trigger Call")

**Required Permissions:** Same as "Calls" - `hasPermission('calls', 'view')`

**URL:** The page is accessed via the tab system in the main dashboard

---

## 🏗️ Architecture

### Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `client/src/pages/SupportTickets.jsx` | Created | Main React component for ticket display |
| `routes/calls.js` | Added endpoint | `GET /api/calls/support-tickets` |
| `client/src/lib/api.js` | Updated | Added `getSupportTickets()` function |
| `client/src/App.jsx` | Updated | Added page to routing |
| `client/src/components/Layout.jsx` | Updated | Added menu item |

---

## 📊 Features

### 1. **Ticket Table Display**
Shows all support tickets with columns:
- **Ticket ID** - Freshdesk ticket number (with call ID reference)
- **Agent** - Agent name and ID who made the call
- **Customer** - Customer name, email, or phone
- **Date & Time** - When the call was made
- **Duration** - Call length (formatted as minutes and seconds)
- **Status** - Color-coded ticket status (Open, Resolved, Closed, Error)
- **Actions** - Link to view ticket in Freshdesk

### 2. **Filtering**
Users can filter tickets by:
- **Agent ID/Name** - Dropdown shows all agents with tickets
- **Call Status** - Filter by call completion status (Completed, Pending, Failed)
- **Clear Filters** - Reset all filters at once

### 3. **Pagination**
- Adjustable page size (10, 20, 50, 100 records per page)
- Previous/Next navigation
- Shows current page and total ticket count

### 4. **Statistics Dashboard**
Quick metrics displayed at the top:
- **Total Tickets** - All support tickets created
- **Open Tickets** - Tickets still pending
- **Resolved** - Closed/resolved tickets
- **Avg Call Duration** - Average duration across all displayed tickets

### 5. **Status Indicators**
Color-coded badges with icons:
- 🔵 **Open** (Blue) - Ticket is active
- 🟡 **Pending** (Yellow) - Awaiting response
- 🟢 **Resolved/Closed** (Green) - Issue addressed
- 🔴 **Error** (Red) - Creation failed

### 6. **Empty States**
- Shows helpful message when no tickets exist
- Explains that tickets appear once customers provide email
- Suggests checking filters if no results

---

## 🔌 Backend API Endpoint

### Endpoint: `GET /api/calls/support-tickets`

**Query Parameters:**
```
GET /api/calls/support-tickets?page=1&limit=20&agentId=xxx&status=yyy
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Records per page (default: 20) |
| `agentId` | string | No | Filter by agent ID |
| `status` | string | No | Filter by call status (completed, pending, failed) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 21,
      "call_id": "abc-123",
      "agent_id": "agent-xyz",
      "agent_name": "Esha",
      "customer_id": 2,
      "customer_name": "John Doe",
      "customer_phone": "+919876543210",
      "customer_email": "john@example.com",
      "call_created_at": "2026-04-02T10:30:00Z",
      "call_start_time": "2026-04-02T10:30:05Z",
      "call_end_time": "2026-04-02T10:32:15Z",
      "duration": 130,
      "call_status": "completed",
      "transcript": "...",
      "ticket": {
        "ticket_id": 12345,
        "ticket_url": "https://augmont.freshdesk.com/helpdesk/tickets/12345",
        "status": "open",
        "subject": "Support Request via Voice Call",
        "email": "john@example.com",
        "phone": "+919876543210",
        "created_at": "2026-04-02T10:32:16Z",
        "error": null
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalRecords": 45
  }
}
```

---

## 🎨 UI Components

### Built with:
- **React Hooks** - `useState`, `useEffect` for state management
- **Shadcn UI Components** - Button, Card, Input, Select
- **Lucide Icons** - Ticket, RefreshCw, ExternalLink, etc.
- **Tailwind CSS** - Styling and responsive design

### Color Scheme:
- **Primary:** `#013443` (Dark teal) - Headers, active buttons
- **Accent:** `#C9963B` (Gold) - Icons, highlights
- **Status Colors:**
  - Blue: Open tickets
  - Yellow: Pending
  - Green: Resolved
  - Red: Errors
  - Gray: Closed

---

## 📱 Responsive Design

- **Desktop:** Full table with all columns visible
- **Tablet:** Responsive grid for stats, single column for filters
- **Mobile:** Scrollable table, stacked layout for filters

---

## 🔄 Data Flow

```
User visits "Support Tickets" tab
         ↓
App.jsx loads SupportTickets component
         ↓
useEffect triggers loadTickets()
         ↓
API calls GET /api/calls/support-tickets
         ↓
Backend queries calls table for freshdesk_ticket data
         ↓
Returns paginated results with agent & customer info
         ↓
Component renders table with all ticket details
         ↓
User can filter, paginate, or click to Freshdesk
```

---

## 💾 Database Query

The backend queries the `calls` table:

```sql
SELECT
  c.id, c.call_id, c.customer_id, c.agent_id, c.agent_name,
  c.created_at, c.call_start_time, c.call_end_time, c.duration,
  c.status, c.freshdesk_ticket, c.transcript,
  cu.name, cu.phone_number, cu.email
FROM calls c
LEFT JOIN customers cu ON c.customer_id = cu.id
WHERE c.freshdesk_ticket IS NOT NULL
ORDER BY c.created_at DESC
LIMIT 20 OFFSET 0
```

Only returns calls that have:
- ✅ Non-null `freshdesk_ticket` field (ticket was successfully created)
- ✅ Joined customer information (for display)
- ✅ All call metadata

---

## 🎯 Use Cases

### 1. **Ticket Management**
Customer support team can:
- View all tickets created from AI calls
- See which agent handled which call
- Track customer details for follow-up
- Click directly to Freshdesk for full details

### 2. **Agent Performance**
Managers can:
- Filter tickets by agent to see their performance
- Check how many support escalations each agent handles
- Review call duration vs. ticket creation

### 3. **Customer Analysis**
Support team can:
- Identify repeat customers with issues
- See common problems by analyzing transcripts
- Track resolution times by call duration

### 4. **Ticket Tracking**
Users can:
- Monitor ticket status (Open → Resolved)
- Filter for urgent/pending items
- Track volume over time

---

## 🚀 Example Usage

### View All Tickets
```
Click "Support Tickets" tab → Page loads with all tickets
```

### Filter by Agent
```
1. Click "Filter by Agent" dropdown
2. Select "Esha (a74871...)"
3. Table refreshes showing only Esha's tickets
```

### View Ticket Details
```
1. Find ticket in table
2. Click "View in Freshdesk" link
3. Opens Freshdesk in new tab with full ticket details
```

### Check Failed Tickets
```
1. Notice error icon in "Actions" column
2. Hover to see error message (e.g., "Invalid API key")
3. Fix the issue and re-sync
```

---

## ⚙️ Configuration

No configuration needed! The page:
- ✅ Uses existing Freshdesk API credentials from agent config
- ✅ Respects user permissions (calls.view)
- ✅ Automatically updates when new tickets are created
- ✅ Handles pagination server-side for efficiency

---

## 🐛 Error Handling

### No Tickets
- Shows friendly empty state message
- Explains that customers need to provide email

### Failed Ticket Creation
- If `freshdesk_ticket.error` is set, shows red error badge
- Displays error message for debugging
- Ticket still tracked in database for audit

### API Errors
- Shows loading state while fetching
- Displays error message if API fails
- Refresh button to retry

---

## 📈 Performance

- **Page Size Limit:** Configurable (10, 20, 50, 100)
- **Database Indexing:** Queries use `WHERE freshdesk_ticket IS NOT NULL` for efficiency
- **Pagination:** Server-side to reduce data transfer
- **Caching:** None (real-time data always fresh)

---

## 🔐 Security

- ✅ Requires user authentication
- ✅ Checks permission: `hasPermission('calls', 'view')`
- ✅ API masks sensitive data in responses
- ✅ Freshdesk links open in new tab (no password exposure)
- ✅ Transcripts visible but no customer PII in URLs

---

## 🔄 Refresh & Sync

**Automatic:**
- Tickets appear automatically once call completes
- No manual sync needed

**Manual Refresh:**
- Click "Refresh" button to reload latest tickets
- Useful if expecting new tickets

**Re-sync Call:**
- From "Calls" page, click sync button on individual call
- Updates freshdesk_ticket data if it was missed

---

## 📊 Sample Scenarios

### Scenario 1: Successful Ticket Creation
```
Call completes → AI extracted email → Freshdesk ticket created ✅
Status in Support Tickets page: "Open" with Freshdesk link
```

### Scenario 2: Email Not Collected
```
Call completes → No email extracted → No ticket created ❌
Status: Call doesn't appear in Support Tickets (expected behavior)
```

### Scenario 3: API Error
```
Call completes → Email extracted → Freshdesk API fails ❌
Status: "Error" badge shown, error message displayed
```

### Scenario 4: Agent Disabled Freshdesk
```
Call completes → Email extracted → Agent doesn't have Freshdesk enabled ❌
Status: Call doesn't appear (configuration incomplete)
```

---

## 🛠️ Maintenance

### Add a New Column?
Edit `client/src/pages/SupportTickets.jsx` and add:
```jsx
<th>New Column</th>
...
<td>{ /* render data */ }</td>
```

### Change Status Colors?
Edit color mapping in `getStatusColor()` function

### Modify API Query?
Edit `routes/calls.js` - `/support-tickets` endpoint

### Update Permissions?
Change `hasPermission('calls', 'view')` in `Layout.jsx`

---

## ✅ Verification Checklist

- [ ] Page appears in navigation menu
- [ ] Can view page without errors
- [ ] Pagination works (next/previous)
- [ ] Filters work (agent, status)
- [ ] Statistics calculate correctly
- [ ] Clicking Freshdesk link opens ticket
- [ ] Error states show properly
- [ ] Empty state displays when no tickets
- [ ] Mobile responsive layout works
- [ ] Refresh button reloads data

