import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/apiRoutes';
import { initNotificationCron } from './utils/notificationCron';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const envOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) ?? [];
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8081',
  'http://localhost:8082',
  ...envOrigins,
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.send('GeoAttendance API Gateway is running.');
});

// Error handling
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

const HOST = '0.0.0.0';

app.listen(Number(PORT), HOST, () => {
  console.log(`[SERVER] Node backend running on http://${HOST}:${PORT}`);
  console.log(`[SERVER] Accessible on your network at http://192.168.1.185:${PORT}`);
  console.log(`[SERVER] Environment: ${process.env.NODE_ENV}`);
  initNotificationCron();
});
