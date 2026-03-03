import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Import routes
import medicationRoutes from './routes/medications';
import researchRoutes from './routes/research';

const app: Express = express();

// ----------------- CORS -----------------
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked for origin: ${origin}`));
  }
}));

// ----------------- Middleware -----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ----------------- Health Check -----------------
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Women\'s Medication Research API is running' });
});

// ----------------- API Routes -----------------
app.use('/api/medications', medicationRoutes);
app.use('/api/research', researchRoutes);

// ----------------- Frontend SPA -----------------
// Resolve frontend path relative to project root
const frontendDistPath = path.resolve(process.cwd(), 'frontend/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');
const hasFrontendBuild = fs.existsSync(frontendIndexPath);

if (hasFrontendBuild) {
  // Serve static frontend files
  app.use(express.static(frontendDistPath));

  // SPA fallback for all non-API, non-health routes
  app.get('*', (req: Request, res: Response) => {
    if (!req.path.startsWith('/api') && req.path !== '/health') {
      res.sendFile(frontendIndexPath);
    }
  });
} else {
  // Optional JSON root if frontend missing
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'Women\'s Medication Research API',
      version: '1.0.0',
      description: 'REST API for women\'s medication research data from ClinicalTrials.gov and OpenFDA FAERS',
      endpoints: {
        health: '/health',
        medications: '/api/medications',
        research: '/api/research'
      }
    });
  });
}

// ----------------- Error Handling -----------------
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// 404 fallback
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

export default app;