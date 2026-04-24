import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDb } from './db';
import { shortenRouter } from './routes/shorten';
import { redirectRouter } from './routes/redirect';
import { analyticsRouter } from './routes/analytics';

const app = express();
const PORT = process.env.PORT || 3456;

// Initialize database
const db = initDb();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Make db available to routes
app.locals.db = db;

// Routes
app.use('/api', shortenRouter);
app.use('/api/analytics', analyticsRouter);

// Health check (before catch-all redirect router)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Redirect router (catch-all — must be last)
app.use('/', redirectRouter);

app.listen(PORT, () => {
  console.log(`🔗 ClawForge URL Shortener running on http://localhost:${PORT}`);
});

export default app;
