#!/bin/bash

# 🚀 Complete Deployment Script for Geo-Attendance System
# Usage: bash deploy.sh [dev|staging|production]

set -e

ENVIRONMENT=${1:-production}
PROJECT_ID="geo-attendance-6e1a4"
FUNCTIONS_REGION="us-central1"

echo "================================"
echo "🚀 Deploying Geo-Attendance"
echo "Environment: $ENVIRONMENT"
echo "================================"

# Step 1: Deploy Firebase Functions
echo ""
echo "1️⃣  Deploying Firebase Functions..."
firebase deploy --only functions:api --project $PROJECT_ID

echo "✅ Functions deployed"
FUNCTIONS_URL="https://${FUNCTIONS_REGION}-${PROJECT_ID}.cloudfunctions.net/api"

# Step 2: Update Firestore Security Rules
echo ""
echo "2️⃣  Updating Firestore Security Rules..."
firebase deploy --only firestore:rules --project $PROJECT_ID

echo "✅ Security Rules updated"

# Step 3: Deploy to Vercel
echo ""
echo "3️⃣  Deploying to Vercel..."
if [ "$ENVIRONMENT" = "production" ]; then
  vercel --prod --confirm \
    --env VITE_API_URL=$FUNCTIONS_URL
else
  vercel --confirm \
    --env VITE_API_URL=$FUNCTIONS_URL
fi

echo "✅ Web app deployed"

# Step 4: Build Mobile App (Optional)
if [ "$ENVIRONMENT" = "production" ]; then
  echo ""
  echo "4️⃣  Building Mobile App for Production..."
  cd geo-attendance-mobile
  
  eas build -p android --profile production
  
  echo "✅ Mobile build triggered"
  cd ..
fi

echo ""
echo "================================"
echo "✅ Deployment Complete!"
echo "================================"
echo "Web: https://geo-attendence-feedbacks.vercel.app"
echo "API: $FUNCTIONS_URL"
echo "Firebase Project: $PROJECT_ID"
