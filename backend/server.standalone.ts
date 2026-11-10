import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';
import { initDatabase, getMongoStatus } from './db.js';
import { SchedulerService } from './services/scheduler.js';

dotenv.config();

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

// Enable CORS for frontend deployment (e.g. Vercel)
app.use(cors({
  origin: process.env.CLIENT_URL ? [process.env.CLIENT_URL, 'http://localhost:3000'] : true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Start server and initialize database & scheduled jobs
async function start() {
  try {
    console.log('Initializing FinPulse backend services...');
    await initDatabase();
    SchedulerService.startScheduledJobs();

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
