import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import Database from 'better-sqlite3';

export const shortenRouter = Router();

// POST /api/shorten — Create a short URL
shortenRouter.post('/shorten', (req: Request, res: Response) => {
  const db: Database.Database = req.app.locals.db;

  // Validate request body
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Request body required (Content-Type: application/json)' });
  }

  const { url, customCode } = req.body;

  // Validate URL
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing required field: url' });
  }

  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  // Validate customCode type and format
  if (customCode !== undefined) {
    if (typeof customCode !== 'string') {
      return res.status(400).json({ error: 'customCode must be a string' });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(customCode)) {
      return res.status(400).json({ error: 'customCode must contain only letters, numbers, hyphens, and underscores' });
    }
  }

  // Generate or use custom short code
  const shortCode = customCode || nanoid(7);

  // Check if custom code already exists
  if (customCode) {
    const existing = db.prepare('SELECT id FROM urls WHERE short_code = ?').get(customCode);
    if (existing) {
      return res.status(409).json({ error: 'Custom code already in use' });
    }
  }

  // Insert into database
  try {
    const stmt = db.prepare('INSERT INTO urls (original_url, short_code) VALUES (?, ?)');
    const result = stmt.run(url, shortCode);

    res.status(201).json({
      id: result.lastInsertRowid,
      originalUrl: url,
      shortCode,
      shortUrl: `${req.protocol}://${req.get('host')}/${shortCode}`,
      clicks: 0,
    });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Short code collision, try again' });
    }
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/urls — List all URLs
shortenRouter.get('/urls', (req: Request, res: Response) => {
  const db: Database.Database = req.app.locals.db;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Number(req.query.offset) || 0;

  const urls = db.prepare(
    'SELECT id, original_url, short_code, created_at, clicks FROM urls ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM urls').get();

  res.json({
    urls,
    total: (total as any)?.count || 0,
    limit,
    offset,
  });
});
