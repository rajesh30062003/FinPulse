import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';
import { initDatabase, getMongoStatus } from './db.js';
import { SchedulerService } from './services/scheduler.js';
import { EmailService } from './services/emailService.js';

dotenv.config();

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

// Comprehensive CORS configuration supporting Vercel deployments and custom clients
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://fin-pulse-bay.vercel.app'
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.trim().replace(/\/+$/, ''));
}
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL.trim().replace(/\/+$/, ''));
}

app.use(cors({
  origin: (origin, callback) => {
    // Non-browser clients, same-origin, or curl
    if (!origin) return callback(null, true);
    // Any Vercel deployment preview or production domain
    if (origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    const cleanOrigin = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }
    // Default allow all origins in SaaS multi-deployment
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-refresh-token']
}));

app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoints required for Render deployment and monitoring
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'FinPulse Backend API',
    database: getMongoStatus(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'FinPulse Backend API',
    database: getMongoStatus(),
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'FinPulse Financial Management API',
    status: 'online',
    healthCheck: '/api/health',
    database: getMongoStatus(),
    endpoints: {
      auth: '/api/auth',
      accounts: '/api/accounts',
      transactions: '/api/transactions',
      budget: '/api/budget',
      creditCards: '/api/credit-cards',
      investments: '/api/investments',
      emergencyFund: '/api/emergency-fund',
      savingsGoals: '/api/savings-goals',
      analytics: '/api/analytics'
    }
  });
});

// Mount all existing financial API routes
app.use('/api', apiRouter);

// Catch-all 404 handler that returns pure JSON instead of default HTML
app.use((req, res) => {
  res.status(404).json({
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
    status: 404,
    help: 'Ensure requests include the /api prefix or verify API route spelling'
  });
});

// Global error handler guaranteeing valid JSON responses
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred',
    status: err.status || 500
  });
});

// Start server and initialize database & scheduled jobs
async function start() {
  try {
    console.log('Initializing FinPulse backend services...');
    await initDatabase();
    try {
      const smtpCheck = await EmailService.verifyConnection();
      console.log(`[Brevo SMTP] Startup check: ${smtpCheck.verified ? 'Verified on ' + smtpCheck.host + ':' + smtpCheck.port : smtpCheck.message}`);
    } catch (err: any) {
      console.log('[Brevo SMTP] Startup check deferred:', err?.message);
    }

    app.listen(port, '0.0.0.0', () => {
      console.log(`FinPulse Backend Server running on port ${port} (0.0.0.0:${port})`);
      console.log(`Health check ready at: http://localhost:${port}/api/health`);
    });
  } catch (err) {
    console.error('Fatal error starting backend server:', err);
    process.exit(1);
  }
}

start();

export default app;
