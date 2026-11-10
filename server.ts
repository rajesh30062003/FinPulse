import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import apiRouter from './backend/routes/api.js';
import { initDatabase } from './backend/db.js';
import { SchedulerService } from './backend/services/scheduler.js';

dotenv.config();

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Initialize DB and cron jobs
  await initDatabase();
  SchedulerService.startScheduledJobs();

  // Health check endpoints
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'FinPulse Fullstack API', timestamp: new Date().toISOString() });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'FinPulse Fullstack API', timestamp: new Date().toISOString() });
  });

  // Mount API routes
  app.use('/api', apiRouter);

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`FinPulse Financial Application listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
