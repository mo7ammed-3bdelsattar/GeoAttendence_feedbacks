"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// Initialize Firebase Admin
admin.initializeApp();
// Create Express app
const app = (0, express_1.default)();
// CORS Configuration
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8081',
    'https://geo-attendence-feedbacks.vercel.app',
    'https://geo-attendance.vercel.app',
    'https://geo-attendence-feedbacks-msk0dp79a.vercel.app',
    'https://geo2-626eb.web.app',
    'https://geo2-626eb.firebaseapp.com',
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error(`CORS error: ${origin} not allowed`));
        }
    },
    credentials: true,
}));
app.use(express_1.default.json());
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Authentication Middleware
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const verifyAuth = async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token' });
    }
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Health Check
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date(), version: '1.0.0' });
});
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Auth Routes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post('/auth/login', async (req, res) => {
    try {
        const { token } = req.body;
        const decodedToken = await admin.auth().verifyIdToken(token);
        // Get or create user in Firestore
        const userRef = admin.firestore().collection('users').doc(decodedToken.uid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            await userRef.set({
                email: decodedToken.email,
                name: decodedToken.name || 'User',
                role: 'student', // Default role
                createdAt: new Date(),
                lastLogin: new Date(),
            });
        }
        else {
            await userRef.update({ lastLogin: new Date() });
        }
        const userData = userSnap.data() || (await userRef.get()).data();
        res.json({
            id: decodedToken.uid,
            email: decodedToken.email,
            name: userData?.name,
            role: userData?.role,
            token: token,
        });
    }
    catch (error) {
        res.status(401).json({ error: 'Authentication failed', message: error.message });
    }
});
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Attendance Routes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post('/attendance/mark', verifyAuth, async (req, res) => {
    try {
        const { sessionId, latitude, longitude } = req.body;
        const userId = req.user.uid;
        if (!sessionId || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Validate geofence (mock implementation)
        const isWithinGeofence = Math.abs(latitude) > 0 && Math.abs(longitude) > 0;
        if (!isWithinGeofence) {
            return res.status(403).json({ error: 'Location outside geofence' });
        }
        const checkIn = {
            userId,
            sessionId,
            latitude,
            longitude,
            timestamp: new Date(),
            verified: true,
        };
        const docRef = await admin.firestore()
            .collection('attendance')
            .add(checkIn);
        res.json({
            id: docRef.id,
            message: 'Attendance marked successfully',
            ...checkIn,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to mark attendance', message: error.message });
    }
});
app.get('/attendance/records', verifyAuth, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { sessionId } = req.query;
        let query = admin.firestore().collection('attendance').where('userId', '==', userId);
        if (sessionId) {
            query = query.where('sessionId', '==', sessionId);
        }
        const snapshot = await query.orderBy('timestamp', 'desc').limit(100).get();
        const records = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.json(records);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch records', message: error.message });
    }
});
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Feedback Routes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post('/feedback/submit', verifyAuth, async (req, res) => {
    try {
        const { lectureId, rating, comment } = req.body;
        if (!lectureId || !rating) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const feedback = {
            lectureId,
            rating,
            comment: comment || '',
            timestamp: new Date(),
            // Don't store userId for anonymity
        };
        const docRef = await admin.firestore()
            .collection('feedback')
            .add(feedback);
        res.json({
            id: docRef.id,
            message: 'Feedback submitted successfully',
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to submit feedback', message: error.message });
    }
});
app.get('/feedback/lecture/:lectureId', verifyAuth, async (req, res) => {
    try {
        const { lectureId } = req.params;
        const snapshot = await admin.firestore()
            .collection('feedback')
            .where('lectureId', '==', lectureId)
            .get();
        const feedbacks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        const avgRating = feedbacks.length > 0
            ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
            : 0;
        res.json({
            lectureId,
            totalResponses: feedbacks.length,
            averageRating: Math.round(avgRating * 10) / 10,
            feedbacks,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch feedback', message: error.message });
    }
});
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Notifications Routes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post('/notifications/send', verifyAuth, async (req, res) => {
    try {
        const { topic, title, body } = req.body;
        if (!topic || !title || !body) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const message = {
            notification: { title, body },
            topic,
        };
        const response = await admin.messaging().send(message);
        res.json({
            messageId: response,
            message: 'Notification sent successfully',
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to send notification', message: error.message });
    }
});
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dashboard Routes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/dashboard/stats', verifyAuth, async (req, res) => {
    try {
        const userRole = req.user.custom_claims?.role;
        if (!['admin', 'faculty'].includes(userRole)) {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
        const [attendanceSnap, feedbackSnap] = await Promise.all([
            admin.firestore().collection('attendance').get(),
            admin.firestore().collection('feedback').get(),
        ]);
        res.json({
            totalAttendance: attendanceSnap.size,
            totalFeedback: feedbackSnap.size,
            timestamp: new Date(),
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats', message: error.message });
    }
});
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Error Handling
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use((err, req, res, next) => {
    console.error('[ERROR]', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Export Functions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.api = functions
    .region('us-central1')
    .https
    .onRequest(app);
//# sourceMappingURL=index.js.map