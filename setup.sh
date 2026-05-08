#!/bin/bash

# 🔧 Setup Script for Geo-Attendance Development Environment

echo "================================"
echo "🔧 Setting up Geo-Attendance"
echo "================================"

# 1. Install Global Tools
echo ""
echo "1️⃣  Installing Global Tools..."
npm install -g firebase-tools vercel eas-cli

# 2. Setup Firebase Functions
echo ""
echo "2️⃣  Setting up Firebase Functions..."
cd functions
npm install
npm run build
cd ..

# 3. Setup Web App
echo ""
echo "3️⃣  Setting up Web App..."
npm install

# 4. Setup Mobile App
echo ""
echo "4️⃣  Setting up Mobile App..."
cd geo-attendance-mobile
npm install
cd ..

# 5. Firebase Login
echo ""
echo "5️⃣  Firebase Authentication..."
firebase login

# 6. Start Emulator
echo ""
echo "6️⃣  Starting Firebase Emulator..."
firebase emulators:start

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Quick Start:"
echo "  • Web Dev:      npm run dev"
echo "  • Functions:    firebase serve --only functions"
echo "  • Mobile:       cd geo-attendance-mobile && npm start"
