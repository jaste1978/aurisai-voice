#!/bin/bash

# Set project
PROJECT_ID="aiagents-490508"
REGION="asia-south1"
SERVICE="augmont-voice-agents"

echo "🔄 Checking Cloud Run service status..."
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE"
echo "Region: $REGION"

echo ""
echo "To restart the service via Google Cloud Console:"
echo "1. Go to: https://console.cloud.google.com/run/detail/$REGION/$SERVICE?project=$PROJECT_ID"
echo "2. Click the '...' menu (top right)"
echo "3. Select 'Delete' to remove current deployment"
echo "4. Or push new code to GitHub to trigger auto-redeploy:"
echo ""
echo "   git push origin main"
echo ""

