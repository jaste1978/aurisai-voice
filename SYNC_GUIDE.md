# 📊 Data Sync Guide: Local → GCP Cloud SQL

## Current Status
- **Local Database**: 28 calls, 5 customers, 3 agent configs
- **GCP Cloud SQL**: Empty (needs sync)

## Option 1: Using Cloud SQL Proxy (Recommended)

### Step 1: Install Cloud SQL Proxy
```bash
# On macOS:
brew install cloud-sql-proxy

# Or download from: https://cloud.google.com/sql/docs/mysql/sql-proxy
```

### Step 2: Start Cloud SQL Proxy
```bash
cloud-sql-proxy aiagents-490508:asia-south1:augmont-db
```

This creates a local connection to your GCP database on `localhost:5432`

### Step 3: Run Import Script
```bash
GCP_DB_HOST=localhost \
GCP_DB_PASSWORD=<your_db_password> \
node import-to-gcp.js
```

---

## Option 2: Using PostgreSQL Dump (SQL file)

### Step 1: Export as SQL
```bash
# Export from local database
pg_dump -h 127.0.0.1 -U postgres -d bolna_calls > local-backup.sql
```

### Step 2: Import to Cloud SQL
```bash
# Using Cloud SQL proxy
cloud-sql-proxy aiagents-490508:asia-south1:augmont-db &

# Import the SQL file
psql -h localhost -U appuser -d bolna_calls < local-backup.sql
```

---

## Option 3: Using Cloud SQL Import (GCP Console)

### Step 1: Create SQL Dump
```bash
pg_dump -h 127.0.0.1 -U postgres -d bolna_calls --data-only > data.sql
```

### Step 2: Upload to Cloud Storage
```bash
gsutil cp data.sql gs://your-bucket/
```

### Step 3: Import in GCP Console
- Go to: https://console.cloud.google.com/sql/instances/augmont-db?project=aiagents-490508
- Click "Import"
- Select the SQL file from Cloud Storage
- Click Import

---

## Option 4: Quick Export/Import (Easiest)

### Step 1: Export as JSON
```bash
node sync-to-gcp.js  # Creates gcp-sync-data.json
```

### Step 2: Set GCP Connection
```bash
# Start Cloud SQL proxy
cloud-sql-proxy aiagents-490508:asia-south1:augmont-db
```

### Step 3: Run Import
```bash
GCP_DB_HOST=localhost node import-to-gcp.js
```

---

## Database Credentials

| Parameter | Value |
|-----------|-------|
| **Host** | `localhost` (via proxy) or `/cloudsql/aiagents-490508:asia-south1:augmont-db` |
| **Port** | `5432` |
| **Database** | `bolna_calls` |
| **User** | `appuser` |
| **Password** | `<Check your gcp-setup.sh output>` |

---

## Verify Sync Success

After importing, check the data:

```bash
# Connect via proxy
psql -h localhost -U appuser -d bolna_calls

# Run these queries:
SELECT COUNT(*) FROM calls;        -- Should be 28
SELECT COUNT(*) FROM customers;    -- Should be 5
SELECT COUNT(*) FROM agent_configs; -- Should be 3
```

Then refresh your Cloud Run app:
```
https://augmont-voice-agents-905391127280.asia-south1.run.app/
```

---

## Need Help?

If you get password errors:
1. Check `gcp-setup.sh` for the auto-generated DB_PASSWORD
2. Or reset password: 
   ```
   gcloud sql users set-password appuser --instance=augmont-db --password=<new-password>
   ```

