# MongoDB Setup Guide

Your server is running but needs MongoDB. Here are your options:

## Option 1: MongoDB Atlas (Recommended - Cloud)

### Step 1: Create Free Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Try Free"
3. Sign up with your email
4. Complete verification

### Step 2: Create Database
1. Click "Create" (or "Build a Cluster")
2. Select the FREE tier (M0)
3. Choose your region (nearest to you)
4. Click "Create Cluster"
5. Wait 1-2 minutes for cluster to be ready

### Step 3: Create Database User
1. Go to "Database Access" (left menu)
2. Click "Add New Database User"
3. Enter username: `bolna`
4. Enter password: (save this!)
5. Click "Add User"

### Step 4: Get Connection String
1. Go to "Databases" (left menu)
2. Click "Connect" on your cluster
3. Select "Drivers"
4. Copy the connection string
5. It looks like: `mongodb+srv://bolna:PASSWORD@cluster.mongodb.net/bolna-calls?retryWrites=true&w=majority`

### Step 5: Update .env
Replace `MONGODB_URI` in your `.env` file:
```env
MONGODB_URI=mongodb+srv://bolna:YOUR_PASSWORD@cluster.mongodb.net/bolna-calls?retryWrites=true&w=majority
```

### Step 6: Whitelist Your IP (if needed)
1. Go to "Network Access" (left menu)
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for development)
4. Click "Confirm"

## Option 2: Local MongoDB

### macOS (Homebrew)
```bash
# Install
brew tap mongodb/brew
brew install mongodb-community

# Start
brew services start mongodb-community

# Connection string
MONGODB_URI=mongodb://localhost:27017/bolna-calls
```

### Windows
1. Download from https://www.mongodb.com/try/download/community
2. Run installer
3. Follow setup wizard
4. MongoDB runs as service
5. Connection string: `mongodb://localhost:27017/bolna-calls`

### Linux (Ubuntu)
```bash
# Install
sudo apt-get install -y mongodb

# Start
sudo systemctl start mongodb

# Connection string
MONGODB_URI=mongodb://localhost:27017/bolna-calls
```

## Option 3: Docker (if you have Docker)

```bash
# Start MongoDB in Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Connection string
MONGODB_URI=mongodb://localhost:27017/bolna-calls
```

## Verify Connection

After setting up MongoDB:

1. Update `.env` with your connection string
2. Restart the server:
   ```bash
   npm run dev
   ```
3. You should see:
   ```
   ✅ MongoDB connected successfully
   ```

## Testing the Connection

```bash
# If using MongoDB Atlas, test with:
curl http://localhost:5000/api/health

# Should return:
{
  "status": "healthy",
  "mongoConnection": "connected"
}
```

## Troubleshooting

### "Connection refused"
- If local: Make sure MongoDB is running (`brew services start mongodb-community`)
- If Atlas: Check IP is whitelisted in Network Access

### "Authentication failed"
- Check username and password in connection string
- Verify database user was created in Database Access

### "Cannot connect to MongoDB"
- Check connection string in `.env`
- Verify network connectivity
- Check firewall settings

## Next Steps

1. Set up MongoDB using one of the options above
2. Update `.env` with connection string
3. Restart server: `npm run dev`
4. Go to http://localhost:5000
5. Start adding customers and making calls!

---

**Recommended**: Use MongoDB Atlas for easiest setup (free tier available)
