#!/bin/bash
# ============================================================
# ONE-TIME GCP SETUP for Augmont Voice Agents
# Run this ONCE before your first deployment
# ============================================================
set -e

# ── CONFIGURE THESE ────────────────────────────────────────
PROJECT_ID="your-gcp-project-id"       # e.g. augmont-voice-prod
REGION="asia-south1"                   # Mumbai
SQL_INSTANCE="augmont-db"
DB_NAME="bolna_calls"
DB_USER="appuser"
DB_PASSWORD="$(openssl rand -base64 24)"  # auto-generated strong password
REPO="augmont-voice-agents"
SERVICE="augmont-voice-agents"
JWT_SECRET="$(openssl rand -base64 32)"   # auto-generated
# ────────────────────────────────────────────────────────────

echo "🚀 Setting up GCP project: $PROJECT_ID"
gcloud config set project $PROJECT_ID

echo ""
echo "✅ Step 1: Enable required APIs..."
gcloud services enable \
  run.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com

echo ""
echo "✅ Step 2: Create Artifact Registry repository..."
gcloud artifacts repositories create $REPO \
  --repository-format=docker \
  --location=$REGION \
  --description="Augmont Voice Agents Docker images" \
  2>/dev/null || echo "  (already exists)"

echo ""
echo "✅ Step 3: Create Cloud SQL PostgreSQL instance..."
echo "  This takes 3-5 minutes..."
gcloud sql instances create $SQL_INSTANCE \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --storage-type=SSD \
  --storage-size=10GB \
  --backup-start-time=02:00 \
  --enable-bin-log 2>/dev/null || echo "  (already exists)"

echo ""
echo "✅ Step 4: Create database and user..."
gcloud sql databases create $DB_NAME --instance=$SQL_INSTANCE 2>/dev/null || echo "  (already exists)"
gcloud sql users create $DB_USER --instance=$SQL_INSTANCE --password="$DB_PASSWORD"

echo ""
echo "✅ Step 5: Store secrets in Secret Manager..."
# DATABASE_URL using Cloud SQL socket (for Cloud Run)
DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"

echo -n "$DB_URL"       | gcloud secrets create DATABASE_URL    --data-file=- 2>/dev/null || \
echo -n "$DB_URL"       | gcloud secrets versions add DATABASE_URL --data-file=-

echo -n "$JWT_SECRET"   | gcloud secrets create JWT_SECRET      --data-file=- 2>/dev/null || \
echo -n "$JWT_SECRET"   | gcloud secrets versions add JWT_SECRET --data-file=-

echo ""
echo "⚠️  IMPORTANT: You still need to add your Bolna API key to Secret Manager:"
echo "   echo -n 'bn-YOUR_API_KEY' | gcloud secrets create BOLNA_API_KEY --data-file=-"
echo ""

echo "✅ Step 6: Grant Cloud Run service account access to secrets & Cloud SQL..."
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" \
  --role="roles/secretmanager.secretAccessor" --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" \
  --role="roles/cloudsql.client" --quiet

echo ""
echo "✅ Step 7: Grant Cloud Build permission to deploy Cloud Run..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin" --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser" --quiet

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ GCP Setup Complete!"
echo ""
echo "  PROJECT_ID   : $PROJECT_ID"
echo "  REGION       : $REGION"
echo "  SQL INSTANCE : $SQL_INSTANCE"
echo "  DB_USER      : $DB_USER"
echo "  DB_PASSWORD  : $DB_PASSWORD  ← SAVE THIS!"
echo ""
echo "Next step: Run ./deploy.sh to build and deploy the app"
echo "════════════════════════════════════════════════════════"
