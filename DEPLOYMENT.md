# Deployment Guide

Complete guide to deploy Bolna Call Tracker to production.

## Pre-deployment Checklist

- [ ] Node.js v14+ installed
- [ ] MongoDB Atlas account created
- [ ] Bolna API Key obtained
- [ ] Bolna Agent ID created
- [ ] Domain name ready (for production)
- [ ] SSL certificate (for production)

## Option 1: Deploy on Heroku

### Prerequisites

- Heroku account
- Heroku CLI installed

### Steps

1. **Create Heroku App**

```bash
heroku login
heroku create your-app-name
```

2. **Add MongoDB Atlas**

```bash
heroku addons:create mongolab:sandbox
```

Or add connection string manually:

```bash
heroku config:set MONGODB_URI=your_mongodb_atlas_uri
```

3. **Set Environment Variables**

```bash
heroku config:set BOLNA_API_KEY=your_key
heroku config:set BOLNA_API_BASE_URL=https://api.bolna.ai
heroku config:set WEBHOOK_URL=https://your-app-name.herokuapp.com/webhooks/bolna
```

4. **Deploy**

```bash
git push heroku main
```

5. **View Logs**

```bash
heroku logs --tail
```

## Option 2: Deploy on AWS EC2

### Prerequisites

- AWS account
- EC2 instance (t2.micro recommended)
- Ubuntu 20.04 LTS

### Steps

1. **SSH into EC2**

```bash
ssh -i your-key.pem ubuntu@your-instance-ip
```

2. **Install Node.js**

```bash
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. **Install MongoDB CLI**

```bash
sudo apt-get install -y mongodb-clients
```

4. **Clone Repository**

```bash
git clone your-repo-url
cd bolna-call-tracker
```

5. **Install Dependencies**

```bash
npm install --production
```

6. **Create .env File**

```bash
nano .env
```

Add your configuration.

7. **Install PM2**

```bash
sudo npm install -g pm2
pm2 start server.js --name "bolna-tracker"
pm2 startup
pm2 save
```

8. **Setup Nginx Reverse Proxy**

```bash
sudo apt-get install -y nginx

sudo nano /etc/nginx/sites-available/default
```

Add:

```nginx
server {
    listen 80 default_server;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

Restart Nginx:

```bash
sudo systemctl restart nginx
```

9. **Setup SSL with Let's Encrypt**

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Option 3: Deploy with Docker

### Dockerfile

```dockerfile
FROM node:16-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY . .

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/bolna-calls
      - BOLNA_API_KEY=${BOLNA_API_KEY}
      - BOLNA_API_BASE_URL=https://api.bolna.ai
      - PORT=5000
      - NODE_ENV=production
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:5
    volumes:
      - mongo-data:/data/db
    restart: unless-stopped

volumes:
  mongo-data:
```

### Deploy

```bash
docker-compose up -d
```

## Option 4: Deploy on Railway

1. Connect GitHub repository
2. Add MongoDB addon
3. Set environment variables in project settings
4. Deploy automatically

## Option 5: Deploy on DigitalOcean App Platform

1. Connect GitHub repository
2. Select Node environment
3. Add MongoDB service
4. Set environment variables
5. Deploy

## Post-Deployment

### 1. Verify Installation

```bash
curl https://your-domain.com/api/health
```

Should return:
```json
{
  "status": "healthy",
  "mongoConnection": "connected"
}
```

### 2. Update Bolna Webhook URL

1. Login to Bolna platform
2. Go to Settings → Webhooks
3. Update webhook URL to: `https://your-domain.com/webhooks/bolna`

### 3. Setup Monitoring

Use services like:
- **Sentry** - Error tracking
- **DataDog** - Performance monitoring
- **New Relic** - Application monitoring

### 4. Setup Backups

For MongoDB:

```bash
# Automated backup script
#!/bin/bash
mongodump --uri=$MONGODB_URI --out=/backups/$(date +%Y%m%d)
```

## Security Best Practices

1. **Enable HTTPS** - Always use SSL/TLS
2. **Firewall** - Restrict database access to application only
3. **API Keys** - Never commit secrets to git
4. **Rate Limiting** - Add rate limiting to endpoints
5. **CORS** - Configure CORS properly
6. **Input Validation** - Validate all inputs
7. **Logging** - Log all API calls for audit trail
8. **Authentication** - Add user authentication for dashboard

### Add Rate Limiting

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/', limiter);
```

## Monitoring & Logs

### View Logs

**Heroku**:
```bash
heroku logs --tail
```

**AWS EC2 with PM2**:
```bash
pm2 logs
```

**Docker**:
```bash
docker-compose logs -f app
```

### Key Metrics to Monitor

- Call success rate
- Average call duration
- API response time
- Database connection pool usage
- Memory and CPU usage
- Error rate

## Scaling

### Horizontal Scaling

For high volume, deploy multiple instances behind a load balancer:

1. **AWS Load Balancer** or **Nginx**
2. **Session Management** with Redis
3. **Database Connection Pool** optimization

### Vertical Scaling

Increase server resources if single instance is bottleneck.

## Troubleshooting

### Application Won't Start

Check logs:
- `docker-compose logs`
- `heroku logs --tail`
- PM2 logs

### Database Connection Issues

- Verify connection string
- Check firewall rules
- Ensure MongoDB is running

### Webhook Not Working

- Verify URL is publicly accessible
- Check firewall allows incoming connections
- Review Bolna API documentation

## Cost Estimation

### Monthly Costs (Approximate)

**Minimal**:
- Cloud VM: $5-10/month (DigitalOcean, AWS Lightsail)
- MongoDB Atlas Free Tier: $0
- **Total: $5-10**

**Standard**:
- Cloud VM: $20-30/month
- MongoDB Atlas M2: $10/month
- SSL Certificate: $0 (Let's Encrypt)
- **Total: $30-40**

**Production**:
- Cloud VM (2vCPU): $50-100/month
- MongoDB Atlas M5: $57/month
- Load Balancer: $20/month
- Monitoring & Backups: $20-50/month
- **Total: $150-250**

## Support

For deployment issues:
- Check application logs first
- Verify all environment variables
- Ensure external services are accessible
- Review error messages carefully

---

Questions? Check Bolna documentation at https://www.bolna.ai/docs
