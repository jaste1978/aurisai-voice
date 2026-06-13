# Bolna Call Tracker

A complete Node.js application for managing outbound calls through Bolna AI. Track customer calls, view transcripts, recordings, and manage all call details in one place.

## Features

✅ **Outbound Call Management** - Trigger calls to customers with a single click
✅ **Call Tracking** - Monitor all call details: status, duration, transcript, recording
✅ **Customer Database** - Store customer information and manage contacts
✅ **Real-time Status** - Track call status (queued, in progress, completed, failed)
✅ **Multi-language Support** - Support for 10+ languages including Hinglish
✅ **Human Escalation** - Transfer calls to human agents
✅ **Call Analytics** - View success rates, average duration, and call statistics
✅ **Dashboard** - Beautiful web interface to manage everything
✅ **REST API** - Full API for integration with other systems

## Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: MongoDB
- **Frontend**: HTML5 + CSS3 + JavaScript (vanilla)
- **External API**: Bolna AI Platform

## Prerequisites

Before getting started, make sure you have:

1. **Node.js** (v14+) - [Download](https://nodejs.org/)
2. **MongoDB** - [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
3. **Bolna API Key** - Get from [Bolna Platform](https://platform.bolna.ai)
4. **Bolna Agent ID** - Create an agent on Bolna platform

## Installation

### 1. Clone/Download the Project

```bash
cd bolna-call-tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```
MONGODB_URI=mongodb://localhost:27017/bolna-calls
BOLNA_API_KEY=your_bolna_api_key_here
BOLNA_API_BASE_URL=https://api.bolna.ai
PORT=5000
NODE_ENV=development
WEBHOOK_URL=http://localhost:5000/webhooks/bolna
```

### 4. Start MongoDB

Make sure MongoDB is running:

```bash
# macOS with Homebrew
brew services start mongodb-community

# Windows (after installation)
mongod

# Or use MongoDB Atlas (cloud)
```

### 5. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## Usage

### Access the Dashboard

Open your browser and navigate to:
```
http://localhost:5000
```

### Add Customers

1. Go to **Customers** tab
2. Fill in customer details (name, phone, email, language)
3. Click **Add Customer**

### Trigger Calls

1. Go to **Trigger Call** tab
2. Select a customer from the dropdown
3. Enter your **Bolna Agent ID**
4. Choose call purpose and language
5. Click **Trigger Call**

The call will be queued and executed by Bolna AI.

### View Call Details

1. Go to **Calls** tab
2. Click **View** on any call
3. See full details: status, transcript, recording, duration, etc.

### Monitor Dashboard

Check the **Dashboard** tab to see:
- Total calls made
- Completed vs failed calls
- Call success rate
- Average call duration
- Recent calls list

## API Endpoints

### Customers

```
GET    /api/customers              - Get all customers
POST   /api/customers              - Create new customer
GET    /api/customers/:id          - Get customer details
PUT    /api/customers/:id          - Update customer
DELETE /api/customers/:id          - Delete customer
```

### Calls

```
GET    /api/calls                  - Get all calls
GET    /api/calls/:id              - Get call details
POST   /api/calls/trigger          - Trigger outbound call
GET    /api/calls/:id/status       - Get call status
GET    /api/calls/:id/transcript   - Get call transcript
GET    /api/calls/:id/recording    - Get call recording
POST   /api/calls/:id/transfer     - Transfer call to agent
GET    /api/calls/stats/summary    - Get call statistics
```

### Webhooks

```
POST   /webhooks/bolna             - Receive call completion updates from Bolna
POST   /webhooks/test              - Test webhook endpoint
```

## API Examples

### Create a Customer

```bash
curl -X POST http://localhost:5000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phoneNumber": "+1234567890",
    "email": "john@example.com",
    "language": "en"
  }'
```

### Trigger a Call

```bash
curl -X POST http://localhost:5000/api/calls/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUSTOMER_ID_HERE",
    "agentId": "BOLNA_AGENT_ID_HERE",
    "purpose": "outreach",
    "language": "en"
  }'
```

### Get Call Status

```bash
curl http://localhost:5000/api/calls/CALL_ID/status
```

## Supported Languages

English (en), Hindi (hi), Tamil (ta), Telugu (te), Kannada (ka), Malayalam (ml), Gujarati (gu), Marathi (mr), Bengali (bn), Punjabi (pa)

## Database Schema

### Customer Document

```json
{
  "_id": ObjectId,
  "customerId": "uuid",
  "name": "John Doe",
  "phoneNumber": "+1234567890",
  "email": "john@example.com",
  "language": "en",
  "status": "active",
  "notes": "VIP customer",
  "createdAt": Date,
  "updatedAt": Date
}
```

### Call Document

```json
{
  "_id": ObjectId,
  "callId": "uuid",
  "customerId": ObjectId,
  "bolnaExecutionId": "execution-123",
  "phoneNumber": "+1234567890",
  "status": "completed",
  "duration": 180,
  "transcript": "...",
  "recording": {
    "url": "https://...",
    "duration": 180
  },
  "errorMessage": null,
  "createdAt": Date,
  "updatedAt": Date
}
```

## Bolna Platform Integration

### Get Your API Key

1. Log in to [Bolna Platform](https://platform.bolna.ai)
2. Go to **Developers** section
3. Click **Generate API Key**
4. Copy the key and paste in `.env`

### Create an Agent

1. Go to **Agents** on Bolna dashboard
2. Create a new agent with your desired configuration
3. Copy the Agent ID
4. Use this ID when triggering calls

### Configure Webhook

Bolna will send call completion updates to your webhook URL. Make sure:

- Webhook URL in `.env` is accessible from internet
- For local development, use ngrok or similar to expose localhost
- Update webhook URL in Bolna platform settings

## Troubleshooting

### MongoDB Connection Error

```
Error: connect ECONNREFUSED
```

**Solution**: Start MongoDB service first
```bash
brew services start mongodb-community  # macOS
mongod                                 # Windows/Linux
```

### Bolna API Key Invalid

**Solution**: Check that your API key is correct in `.env`

### Calls Not Being Triggered

**Solution**:
- Verify Bolna Agent ID is correct
- Check that phone number is in valid format
- Ensure your Bolna account has sufficient credits

### Webhook Not Receiving Updates

**Solution**:
- If local testing, use ngrok: `ngrok http 5000`
- Update webhook URL in Bolna platform
- Check firewall settings allow incoming webhooks

## Development Notes

### Project Structure

```
bolna-call-tracker/
├── server.js              # Main Express server
├── models/
│   ├── Customer.js       # Customer schema
│   └── Call.js           # Call schema
├── routes/
│   ├── customers.js      # Customer routes
│   ├── calls.js          # Call routes
│   └── webhooks.js       # Webhook routes
├── services/
│   └── bolnaService.js   # Bolna API service
├── public/
│   └── index.html        # Dashboard UI
├── .env.example          # Environment template
└── README.md             # This file
```

### Adding Features

To add a new feature:

1. Create route in `routes/` folder
2. Add service method in `services/`
3. Add database model in `models/` if needed
4. Update `server.js` to register route
5. Add UI in `public/index.html`

## Scaling & Deployment

### For Production

1. **Use MongoDB Atlas** (cloud) instead of local MongoDB
2. **Use environment variables** for all sensitive data
3. **Enable HTTPS** for webhook security
4. **Add rate limiting** to prevent abuse
5. **Use process manager** like PM2:

```bash
npm install -g pm2
pm2 start server.js
pm2 save
```

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:16
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 5000
CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t bolna-call-tracker .
docker run -p 5000:5000 --env-file .env bolna-call-tracker
```

## Support & Documentation

- **Bolna Docs**: https://www.bolna.ai/docs
- **GitHub Issues**: Create an issue in your repo
- **Email Support**: support@example.com

## License

MIT - Feel free to use this project for commercial purposes

## Contributing

Pull requests are welcome! For major changes, please open an issue first.

---

Built with ❤️ for managing Bolna AI calls
