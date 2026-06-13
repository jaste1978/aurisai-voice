# ⚡ Quick Start - 5 Minutes Setup

Get your Bolna Call Tracker running in just 5 minutes!

## Step 1: Prerequisites (1 min)

Make sure you have:
- ✅ Node.js installed (download from https://nodejs.org/)
- ✅ MongoDB running (local or MongoDB Atlas)
- ✅ Bolna API Key (from https://platform.bolna.ai)
- ✅ Bolna Agent ID (create one on Bolna dashboard)

## Step 2: Install & Configure (2 min)

```bash
# Navigate to project folder
cd bolna-call-tracker

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

**Edit `.env` file with your information:**

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/bolna-calls

# Bolna API
BOLNA_API_KEY=paste_your_api_key_here
BOLNA_API_BASE_URL=https://api.bolna.ai

# Server
PORT=5000
NODE_ENV=development
```

## Step 3: Start the Server (1 min)

```bash
npm run dev
```

You should see:
```
✅ MongoDB connected successfully
🚀 Server running on port 5000
📊 Dashboard available at http://localhost:5000
```

## Step 4: Open Dashboard (1 min)

Open your browser and go to:
```
http://localhost:5000
```

You should see the beautiful dashboard! 🎨

## Step 5: Make Your First Call (10 sec)

### A. Add a Customer

1. Click **Customers** tab
2. Fill in:
   - Name: `John Doe`
   - Phone: `+1234567890`
   - Language: `en`
3. Click **Add Customer** ✅

### B. Trigger a Call

1. Click **Trigger Call** tab
2. Select the customer you just added
3. Paste your **Bolna Agent ID** in the "Agent ID" field
4. Click **Trigger Call** ✅

The call will be queued and Bolna will call your customer!

## Step 6: View Call Status

1. Click **Calls** tab
2. You'll see your call with status "in_progress" or "completed"
3. Click **View** to see full details:
   - Transcript of the conversation
   - Call duration
   - Recording link
   - Any errors

## What's Happening Behind the Scenes?

```
Your App → Bolna AI → Customer Phone
   ↓         ↓            ↓
1. You trigger call → Bolna creates agent conversation → Calls customer
2. Bolna executes call with AI agent → Conversation happens → Call records details
3. Webhook sends results → Your app stores in database → Dashboard shows results
```

## Common Issues & Solutions

### "MongoDB connection error"

**Problem**: `Error: connect ECONNREFUSED`

**Solution**: Start MongoDB first

```bash
# macOS
brew services start mongodb-community

# Or if using MongoDB Atlas, check your connection string in .env
```

### "Invalid Bolna API Key"

**Problem**: `Error: Unauthorized`

**Solution**:
1. Go to https://platform.bolna.ai
2. Get your API Key from Developers section
3. Paste it in `.env` file

### "Call not triggering"

**Problem**: No call is being made

**Solution**:
- Check Agent ID is correct (it should start with something like `agent_123`)
- Check phone number format (should include country code like `+1234567890`)
- Verify Bolna account has credit available

### "Webhook not receiving updates"

**Problem**: Call status stays "in_progress"

**Solution**:
- For local development, you need to expose your server:
  ```bash
  # Install ngrok
  npm install -g ngrok

  # Run ngrok
  ngrok http 5000

  # Update WEBHOOK_URL in .env with ngrok URL
  ```

## Next Steps

### 1. Customize Agent Behavior

Create different agents on Bolna for different purposes:
- Customer support agent
- Sales qualification agent
- Survey agent

### 2. Integrate with Your System

Use the REST API to integrate with your existing application:

```javascript
// Example: Trigger call from your app
const response = await fetch('http://localhost:5000/api/calls/trigger', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: customer_id,
    agentId: 'your_agent_id',
    purpose: 'follow_up'
  })
});
```

### 3. Setup Batch Calling

```bash
# Create a script to call multiple customers
node scripts/batch-calls.js
```

### 4. Monitor Analytics

Check the **Dashboard** tab to see:
- Total calls made
- Success rate
- Average call duration
- Failed calls

## Useful Commands

```bash
# Start development server
npm run dev

# Start production server
npm start

# Check health
curl http://localhost:5000/api/health

# Get all calls
curl http://localhost:5000/api/calls

# Get all customers
curl http://localhost:5000/api/customers
```

## Deployment

Ready for production? Follow the deployment guide:

```bash
cat DEPLOYMENT.md
```

Options:
- Heroku (easiest)
- AWS EC2
- Docker
- DigitalOcean
- Railway

## API Quick Reference

### Create Customer
```bash
curl -X POST http://localhost:5000/api/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"John","phoneNumber":"+1234567890"}'
```

### Trigger Call
```bash
curl -X POST http://localhost:5000/api/calls/trigger \
  -H "Content-Type: application/json" \
  -d '{"customerId":"ID","agentId":"AGENT_ID"}'
```

### Get All Calls
```bash
curl http://localhost:5000/api/calls
```

### Get Call Details
```bash
curl http://localhost:5000/api/calls/CALL_ID
```

## Features at a Glance

| Feature | Status |
|---------|--------|
| Outbound calling | ✅ Ready |
| Customer management | ✅ Ready |
| Call tracking | ✅ Ready |
| Transcripts | ✅ Ready |
| Recordings | ✅ Ready |
| Multi-language | ✅ Ready |
| Human escalation | ✅ Ready |
| Analytics | ✅ Ready |
| REST API | ✅ Ready |
| Dashboard | ✅ Ready |

## Getting Help

- 📚 **Full Documentation**: Read `README.md`
- 🚀 **Deployment Guide**: Read `DEPLOYMENT.md`
- 🤔 **Troubleshooting**: Check section above
- 📞 **Bolna Support**: https://www.bolna.ai/docs

## Tips for Success

1. **Start Small** - Test with one customer first
2. **Check Logs** - Monitor console logs while testing
3. **Use Dashboard** - Check dashboard to see real-time updates
4. **Read Logs** - Most issues are visible in error logs
5. **Test API** - Use curl commands to test API before integrating

## Common Next Features

Users typically add:
- [ ] User authentication
- [ ] Advanced analytics
- [ ] Scheduled calling
- [ ] Call recording playback in UI
- [ ] Custom integrations
- [ ] SMS notifications
- [ ] Email reports

## Troubleshooting Checklist

Before asking for help:
- [ ] MongoDB is running
- [ ] `npm install` completed successfully
- [ ] `.env` file has correct values
- [ ] Server is running (`npm run dev`)
- [ ] Dashboard loads in browser
- [ ] API health check works: `/api/health`

---

🎉 **You're all set! Enjoy making calls with Bolna!**

Have questions? Check the full README.md for detailed documentation.
