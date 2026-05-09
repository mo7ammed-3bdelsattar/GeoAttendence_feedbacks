# 🔧 Quick Start & Troubleshooting Guide

## Quick Start Commands

### 1. Initial Setup (One-time)

```bash
# Clone & setup
git clone <repo>
cd GeoAttendence_feedbacks

# Run setup script
bash setup.sh

# Login to Firebase
firebase login

# Start development
npm run dev                                    # Web app (http://localhost:5173)
firebase emulators:start                      # Functions & Firestore
cd geo-attendance-mobile && npm start          # Mobile (Expo)
```

### 2. Daily Development

```bash
# Terminal 1: Web App
npm run dev

# Terminal 2: Firebase Emulator
firebase emulators:start

# Terminal 3: Mobile (in geo-attendance-mobile)
npm start
```

### 3. Deploy to Production

```bash
# Deploy everything
bash deploy.sh production

# Or individual deployments:
firebase deploy --only functions              # Functions only
vercel --prod                                 # Web only
cd geo-attendance-mobile && eas build -p android --profile production
```

---

## 🚨 Common Issues & Fixes

### Issue 1: CORS Error in Web App

```
Error: Access to XMLHttpRequest at 'http://localhost:5000/api/auth/login' 
from origin 'https://geo-attendence-feedbacks.vercel.app' 
has been blocked by CORS policy
```

**Solution:**
```bash
# Update VITE_API_URL in Vercel Dashboard
Settings → Environment Variables
VITE_API_URL=https://us-central1-geo-attendance-6e1a4.cloudfunctions.net/api

# Or deploy Firebase Functions first
firebase deploy --only functions
```

---

### Issue 2: Firebase Emulator Port Already in Use

```
Error: Address already in use :::5000
```

**Solution:**
```bash
# Kill the process
lsof -i :5000
kill -9 <PID>

# Or use different ports
firebase emulators:start --import=./emulator-data --ui
```

---

### Issue 3: EAS Build Timeout

```
Build takes > 30 minutes
Timeout: 1800000ms
```

**Solution:**
```bash
# Skip fingerprint computation
EAS_SKIP_AUTO_FINGERPRINT=1 eas build -p android --profile preview

# Or use local build
cd geo-attendance-mobile
eas build -p android --profile preview --local
```

---

### Issue 4: Firebase Token Expired

```
Error: Invalid JWT token
```

**Solution:**
```bash
# Re-login to Firebase
firebase logout
firebase login

# For CI/CD, regenerate token
firebase login:ci
# Store output in GitHub Secrets → FIREBASE_TOKEN
```

---

### Issue 5: TypeScript Compilation Errors

```
error TS6133: 'X' is declared but its value is never read.
```

**Solution:**
```bash
# Run local build to verify
npm run build

# Fix errors, then commit
git add -A
git commit -m "Fix TypeScript errors"
git push
```

---

### Issue 6: Mobile App Won't Start

```
Error: Cannot find module '@react-native-async-storage/async-storage'
```

**Solution:**
```bash
cd geo-attendance-mobile

# Reinstall dependencies
rm -rf node_modules yarn.lock
npm install
# or
yarn install

# Clear cache
eas build --local --platform android --profile preview --clear-cache
```

---

### Issue 7: Vercel Build Fails

```
Error: Command "yarn run build" exited with 2
```

**Solution:**
```bash
# Test build locally
npm run build

# Check environment variables in Vercel
Settings → Environment Variables
# Ensure all VITE_* variables are set

# Rebuild
vercel --prod --force
```

---

## 📊 Firebase Quotas & Limits

| Quota | Free Tier | Warning Level |
|-------|-----------|----------------|
| **Reads/month** | 50M | 30M |
| **Writes/month** | 20M | 12M |
| **Deletes/month** | 20M | 12M |
| **Storage** | 1GB | 800MB |
| **Download bandwidth** | 1GB/day | 500MB/day |
| **Upload bandwidth** | Unlimited | - |
| **Concurrent connections** | 100 | 80 |

**Check Usage:**
```bash
firebase billing --project geo-attendance-6e1a4
```

---

## 🔐 Security Checklist

- [ ] `firestore.rules` deployed
- [ ] Firebase API key rotated monthly
- [ ] Environment variables not in git
- [ ] CORS origins whitelist updated
- [ ] FCM server key stored securely
- [ ] Admin accounts have 2FA
- [ ] Backup scheduled

**Verify Security Rules:**
```bash
firebase deploy --only firestore:rules --dry-run
```

---

## 📈 Monitoring & Logging

### Firebase Functions Logs
```bash
firebase functions:log --project geo-attendance-6e1a4
```

### Vercel Logs
```bash
vercel logs
```

### Real-time Firestore Monitoring
```bash
firebase emulators:start --import=./emulator-data --ui
# Open http://localhost:4000
```

---

## 🎯 Performance Optimization

### 1. Reduce Bundle Size
```bash
# Analyze bundle
npm install -D rollup-plugin-visualizer
npm run build && npm run analyze
```

### 2. Enable Caching
```bash
# In vercel.json
{
  "headers": [
    {
      "source": "/api/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 3. Firestore Indexing
```bash
# Create composite indexes
firebase deploy --only firestore:indexes
```

---

## 📱 Mobile App Deep Linking

```typescript
// Configure deep linking
const linking = {
  prefixes: ['https://geo-attendance.app', 'geo-attendance://'],
  config: {
    screens: {
      attendance: 'attendance/:sessionId',
      feedback: 'feedback/:lectureId',
      home: '',
    },
  },
};
```

---

## 🚨 Emergency Rollback

```bash
# Rollback functions to previous version
firebase deploy --only functions --force

# Rollback Vercel deployment
vercel rollback

# Rollback Firebase Firestore
# Manual: Export data, delete collection, import backup
firebase firestore:delete --force <collection>
```

---

## 📞 Support Resources

- **Firebase Docs**: https://firebase.google.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **EAS Docs**: https://docs.expo.dev/eas/
- **GitHub Issues**: Create issue in your repo
- **Discord**: [Firebase Community](https://discord.gg/firebase)

---

## Cost Calculation

### For 10,000 Students

| Service | Monthly Estimated Cost |
|---------|------------------------|
| Firebase (Blaze) | $5-15 |
| Vercel | $0 (included) |
| EAS | $50 (600 min) |
| **Total** | **$55-65** |

**Upgrade When:**
- Monthly reads > 50M → Switch to Blaze (~$0.06/100k)
- Bandwidth > 1GB/day → Blaze charges apply
- Need SLA → Firebase Premium Support ($24.50/mo)

---

## Final Checklist

- [ ] Firebase Functions deployed
- [ ] Firestore Security Rules updated
- [ ] Vercel environment variables set
- [ ] EAS build tested
- [ ] GitHub Actions secrets configured
- [ ] Email alerts enabled
- [ ] Backup strategy documented
- [ ] Team access configured
- [ ] Monitoring dashboard setup
- [ ] Update README with deployment URLs

**🎉 You're all set! Happy deploying!**
