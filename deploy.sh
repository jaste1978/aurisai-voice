#!/bin/bash
# ============================================================
# DEPLOY Augmont Voice Agents to GCP Cloud Run
# Run after gcp-setup.sh has been completed
# Usage: ./deploy.sh [prod|staging]
# ============================================================
set -e

# ── CONFIGURE THESE ────────────────────────────────────────
PROJECT_ID="aiagents-490508"
REGION="asia-south1"
REPO="augmont-voice-agents"
SERVICE="augmont-voice-agents"
SQL_INSTANCE="augmont-db"
# ────────────────────────────────────────────────────────────

IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${SERVICE}"

echo "🏗️  Building Docker image..."
docker build -t "${IMAGE}:latest" .

echo ""
echo "🔐 Authenticating with Artifact Registry..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

echo ""
echo "📤 Pushing image to Artifact Registry..."
docker push "${IMAGE}:latest"

echo ""
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE \
  --image="${IMAGE}:latest" \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=3000 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --concurrency=100 \
  --timeout=60 \
  --add-cloudsql-instances="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}" \
  --update-secrets="DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,BOLNA_API_KEY=BOLNA_API_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest" \
  --set-env-vars="NODE_ENV=production,BOLNA_API_BASE_URL=https://api.bolna.ai"

echo ""
SERVICE_URL=$(gcloud run services describe $SERVICE --region=$REGION --format='value(status.url)')

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ Deployment Complete!"
echo ""
echo "  App URL : $SERVICE_URL"
echo "  API URL : $SERVICE_URL/api"
echo ""
echo "  Default login:"
echo "  Email    : admin@augmont.com"
echo "  Password : Admin@123"
echo ""
echo "⚠️  Change the admin password immediately after first login!"
echo ""
echo "Updating WEBHOOK_URL in Cloud Run..."
gcloud run services update $SERVICE \
  --region=$REGION \
  --update-env-vars="WEBHOOK_URL=${SERVICE_URL}/webhooks/bolna" --quiet

echo "✅ Done! Webhook URL set to: ${SERVICE_URL}/webhooks/bolna"
echo "════════════════════════════════════════════════════════"
