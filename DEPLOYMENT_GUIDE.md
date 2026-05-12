# 🚀 Geo-Attendance System - Complete Deployment Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Firebase Functions Setup](#firebase-functions-setup)
3. [Vercel Web Deployment](#vercel-web-deployment)
4. [EAS Mobile Build](#eas-mobile-build)
5. [Environment Configuration](#environment-configuration)
6. [Firestore Security Rules](#firestore-security-rules)
7. [CI/CD with GitHub Actions](#cicd-with-github-actions)
8. [Troubleshooting](#troubleshooting)
9. [Cost Estimate](#cost-estimate)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Geo-Attendance System                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐   │
│  │   Web Dashboard  │  │  Mobile App      │  │  Admin Web   │   │
│  │   (React 18)     │  │  (Expo/RN)       │  │              │   │
│  │   Vercel         │  │  EAS Build       │  │  Vercel      │   │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘   │
│           │                     │                    │           │
│           └──────────┬──────────┴────────────────────┘           │
│                      ▼                                           │
│            ┌──────────────────────┐                              │
│            │  Firebase REST API   │                              │
│            │  Cloud Functions     │                              │
│            └──────────┬───────────┘                              │
│                       │                                          │
│        ┌──────────────┼──────────────┐                           │
│        ▼              ▼              ▼                           │
│    ┌────────────┐ ┌────────────┐ ┌─────────┐                    │
│    │ Firestore  │ │   Auth     │ │   FCM   │                    │
│    │  Database  │ │  Service   │ │ Messaging                    │
│    └────────────┘ └────────────┘ └─────────┘                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Firebase Functions Setup

### 1. Create Functions Directory

```bash
mkdir -p functions/src/{auth,attendance,feedback,notifications}
cd functions
npm init -y
npm install firebase-functions firebase-admin cors express dotenv
npm install --save-dev typescript @types/node @types/express
npx tsc --init
```

### 2. Deploy Functions

```bash
# Login to Firebase
firebase login

# Deploy all functions
firebase deploy --only functions

# Deploy with environment variables
firebase deploy --only functions --project geo-attendance-6e1a4
```

### 3. Expected Functions

- `api` - Express app wrapper
- `attendance:mark` - Mark attendance with GPS validation
- `feedback:submit` - Anonymous feedback submission
- `dashboard:stats` - Aggregated statistics
- `notifications:send` - FCM push notifications

---

## Vercel Web Deployment

```bash
# 1. Deploy from project root
vercel --prod

# 2. Set environment variables in Vercel Dashboard
VITE_API_URL=https://your-firebase-functions-url/api
VITE_FIREBASE_API_KEY=AIzaSyCKhmp5S-YHMdwplWLux_BmNtHwLuuizyo
VITE_FIREBASE_AUTH_DOMAIN=geo-attendance-6e1a4.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=geo-attendance-6e1a4
```

---

## EAS Mobile Build

### 1. Build APK (Testing)
```bash
cd geo-attendance-mobile
eas build -p android --profile preview
```

### 2. Build AAB (Play Store)
```bash
eas build -p android --profile production
```

### 3. Build iOS (TestFlight)
```bash
eas build -p ios --profile production
```

---

## Environment Configuration

### `.env.local` (Development)
```env
VITE_API_URL=https://geoattendencefeedbacks-production.up.railway.app/api
FIREBASE_PROJECT_ID=geo-attendance-6e1a4
```

### `.env.production` (Vercel)
```env
VITE_API_URL=https://us-central1-geo-attendance-6e1a4.cloudfunctions.net/api
```

### `geo-attendance-mobile/.env` (Expo)
```env
EXPO_PUBLIC_FIREBASE_PROJECT_ID=geo-attendance-6e1a4
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyCKhmp5S-YHMdwplWLux_BmNtHwLuuizyo
EXPO_PUBLIC_API_URL=https://us-central1-geo-attendance-6e1a4.cloudfunctions.net/api
```

---

## Firestore Security Rules

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Attendance Records - Role-based access
    match /attendance/{sessionId}/checkins/{doc=**} {
      allow read: if request.auth != null && (
        request.auth.token.role == 'admin' ||
        request.auth.token.role == 'faculty' ||
        resource.data.studentId == request.auth.uid
      );
      allow create: if request.auth != null && request.auth.token.role == 'student';
    }
    
    // Feedback - Anonymous submissions
    match /feedback/{lectureId}/responses/{doc=**} {
      allow read: if request.auth != null && request.auth.token.role in ['admin', 'faculty'];
      allow create: if request.auth != null;
    }
    
    // Sessions - Faculty/Admin only
    match /sessions/{doc=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.role in ['admin', 'faculty'];
    }
    
    // User Profiles
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId || request.auth.token.role == 'admin';
    }
  }
}
```

---

## CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase & Vercel

on:
  push:
    branches: [main]
    paths:
      - 'functions/**'
      - 'src/**'

jobs:
  deploy-functions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g firebase-tools
      - run: npm ci
      - run: firebase deploy --only functions --token ${{ secrets.FIREBASE_TOKEN }}

  vercel-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          production: true
```

---

## Troubleshooting

### CORS Error in Web App
```
Error: Access to XMLHttpRequest at 'http://localhost:5000/api/auth/login' 
from origin 'https://geo-attendence-feedbacks.vercel.app' 
has been blocked by CORS policy
```

**Solution**: Update `VITE_API_URL` environment variable in Vercel Dashboard

### Firebase Emulator Issues
```bash
# Kill existing process
lsof -i :5000
kill -9 <PID>

# Restart emulator
firebase emulators:start
```

### EAS Build Timeout
```bash
# Skip fingerprint computation
EAS_SKIP_AUTO_FINGERPRINT=1 eas build -p android --profile preview
```

---

## Cost Estimate

| Service | Free Tier | Pricing | Notes |
|---------|-----------|---------|-------|
| **Firebase** | Spark Plan | $0/month | Unlimited read/writes, 5GB storage |
| **Vercel** | Hobby Plan | $0/month | Unlimited deployments, 100GB bandwidth |
| **EAS Build** | Free | $0 | 30 min/month free, $50 for 600 min/month |
| **Total** | **$0/month** | - | Scales to **~$150/month** at 100k users |

---

## Next Steps

1. ✅ Deploy Firebase Functions
2. ✅ Set environment variables in Vercel
3. ✅ Build EAS mobile app
4. ✅ Test end-to-end auth flow
5. ✅ Monitor Firebase quotas
6. ✅ Setup GitHub Actions

Good luck! 🚀
