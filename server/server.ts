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
  'http://localhost:5175',
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:8083',
  'http://localhost:8084',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:8082',
  'http://127.0.0.1:8083',
  'http://127.0.0.1:8084',
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

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

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
import os from 'os';

const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date(), ip: getLocalIP() });
});

app.listen(Number(PORT), HOST, () => {
  const localIP = getLocalIP();
  console.log(`[SERVER] Node backend running on http://${HOST}:${PORT}`);
  console.log(`[SERVER] Accessible on your network at http://${localIP}:${PORT}`);
  console.log(`[SERVER] Health Check: http://${localIP}:${PORT}/api/health`);
  console.log(`[SERVER] Environment: ${process.env.NODE_ENV}`);
  initNotificationCron();
});
