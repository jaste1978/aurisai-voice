# 🚀 BUILD & RUN INSTRUCTIONS

## Current Status
```
✅ Source Code:        Created (1,350+ lines)
✅ Dependencies:       Installed (npm packages ready)
✅ Project Structure:  Complete (models, routes, services, UI)
✅ Server Code:        Ready to start

⏳ Pending:           MongoDB setup + Bolna credentials
```

## 3 Quick Steps to Get Running

### Step 1: Setup MongoDB (5 minutes)

**MongoDB Atlas (Cloud) - RECOMMENDED**
1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Try Free" 
3. Sign up with your email
4. Create a FREE cluster (M0)
5. Create database user (username: `bolna`, password: save it!)
6. Get connection string from "Connect" → "Drivers"
7. Copy the string (looks like: `mongodb+srv://bolna:PASSWORD@cluster.mongodb.net/bolna-calls`)

**OR use Docker**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
# Then use: mongodb://localhost:27017/bolna-calls
```

### Step 2: Get Your Credentials

**Bolna API Key**
1. Go to https://platform.bolna.ai
2. Sign up/Login
3. Go to "Developers" section
4. Click "Generate API Key"
5. Copy the key

**Bolna Agent ID**
1. Go to https://platform.bolna.ai/agents
2. Click "Create Agent"
3. Fill in:
   - Name: "My First Agent"
   - Language: English
   - System Prompt: "You are a helpful assistant"
4. Create agent and copy the ID

### Step 3: Update .env and Start

```bash
# Edit your .env file with the values from Steps 1-2
nano .env

# File should look like:
MONGODB_URI=mongodb+srv://bolna:PASSWORD@cluster.mongodb.net/bolna-calls
BOLNA_API_KEY=abc123xyz789...
BOLNA_API_BASE_URL=https://api.bolna.ai
PORT=5000
NODE_ENV=development
WEBHOOK_URL=http://localhost:5000/webhooks/bolna

# Save and exit (Ctrl+X, then Y, then Enter)

# Start the server
npm run dev

# You should see:
# ✅ MongoDB connected successfully
# 🚀 Server running on port 5000
# 📊 Dashboard available at http://localhost:5000
```

## 🎉 You're Running!

Once you see "MongoDB connected", open your browser:
```
http://localhost:5000
```

You'll see the dashboard with 4 tabs:
- **Dashboard**: View statistics
- **Customers**: Add customers
- **Calls**: View all calls
- **Trigger Call**: Make calls

## 📞 Make Your First Call

1. Go to "Customers" tab
2. Add a customer:
   - Name: "Test Customer"
   - Phone: "+1234567890" (or your number)
   - Language: English
3. Go to "Trigger Call" tab
4. Select the customer
5. Paste your Bolna Agent ID
6. Click "Trigger Call"
7. Go to "Calls" tab to see the result

## 🧪 Test Without Bolna Key

If you don't have Bolna key yet, test the API:
```bash
# In another terminal:
node test-api.js

# This tests all endpoints and verifies the app works
```

## ✅ Success Indicators

Server running correctly when you see:
```
✅ MongoDB connected successfully
🚀 Server running on port 5000
📊 Dashboard available at http://localhost:5000
📡 Bolna API Key configured: ✅
```

## 🆘 Troubleshooting

### "MongoDB connection error"
- Check MONGODB_URI in .env is correct
- For Atlas: verify IP whitelist in Network Access
- For local: make sure MongoDB is running

### "Cannot access http://localhost:5000"
- Make sure `npm run dev` is still running
- Check port 5000 isn't used by another app
- Try: `lsof -i :5000` to see what's using it

### "Bolna API Key error"
- Get a fresh key from https://platform.bolna.ai/developers
- Make sure no extra spaces in .env
- Restart server after updating .env

## 📚 Full Documentation

- START_HERE.md - Complete setup guide
- README.md - Full documentation
- DEPLOYMENT.md - Production setup
- EXAMPLES.md - Code examples

## 🎯 Next Steps After It's Running

1. Add multiple test customers
2. Create different agents for different purposes
3. Explore the dashboard analytics
4. Try the API endpoints with curl
5. Review call transcripts
6. When ready: deploy to production (see DEPLOYMENT.md)

---

**Time to get running: ~10 minutes (MongoDB + API Key)**

**You got this! 🚀**
