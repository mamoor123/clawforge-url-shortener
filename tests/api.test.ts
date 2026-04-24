import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import path from 'path';
import Database from 'better-sqlite3';
import { shortenRouter } from '../src/routes/shorten';
import { redirectRouter } from '../src/routes/redirect';
import { analyticsRouter } from '../src/routes/analytics';

// Create test app with in-memory database
function createTestApp() {
  const app = express();
  const db = new Database(':memory:');

  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_url TEXT NOT NULL,
      short_code TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      clicks INTEGER DEFAULT 0
    );
    CREATE TABLE clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url_id INTEGER NOT NULL REFERENCES urls(id),
      clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      referrer TEXT,
      user_agent TEXT,
      ip_address TEXT
    );
    CREATE INDEX idx_urls_short_code ON urls(short_code);
    CREATE INDEX idx_clicks_url_id ON clicks(url_id);
  `);

  app.use(cors());
  app.use(express.json());
  app.locals.db = db;

  app.use('/api', shortenRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/', redirectRouter);

  return { app, db };
}

describe('POST /api/shorten', () => {
  let app: express.Application;
  let db: Database.Database;

  beforeAll(() => {
    const test = createTestApp();
    app = test.app;
    db = test.db;
  });

  afterAll(() => {
    db.close();
  });

  it('creates a short URL', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com/long/path' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('shortCode');
    expect(res.body).toHaveProperty('shortUrl');
    expect(res.body.originalUrl).toBe('https://example.com/long/path');
    expect(res.body.clicks).toBe(0);
  });

  it('rejects missing URL', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Missing');
  });

  it('rejects invalid URL format', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'not-a-valid-url' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid');
  });

  it('accepts custom short codes', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com', customCode: 'mylink' });

    expect(res.status).toBe(201);
    expect(res.body.shortCode).toBe('mylink');
  });

  it('rejects duplicate custom codes', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com', customCode: 'mylink' });

    expect(res.status).toBe(409);
  });
});

describe('GET /:code — Redirect', () => {
  let app: express.Application;
  let db: Database.Database;

  beforeAll(() => {
    const test = createTestApp();
    app = test.app;
    db = test.db;

    // Seed a URL
    db.prepare('INSERT INTO urls (original_url, short_code) VALUES (?, ?)').run(
      'https://example.com',
      'test123'
    );
  });

  afterAll(() => {
    db.close();
  });

  it('redirects to original URL', async () => {
    const res = await request(app).get('/test123');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://example.com');
  });

  it('returns 404 for unknown code', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
  });

  it('increments click counter', async () => {
    await request(app).get('/test123');
    await request(app).get('/test123');

    const url = db.prepare('SELECT clicks FROM urls WHERE short_code = ?').get('test123') as any;
    expect(url.clicks).toBeGreaterThanOrEqual(2);
  });
});

describe('GET /api/analytics/:code', () => {
  let app: express.Application;
  let db: Database.Database;

  beforeAll(() => {
    const test = createTestApp();
    app = test.app;
    db = test.db;

    // Seed data
    db.prepare('INSERT INTO urls (original_url, short_code, clicks) VALUES (?, ?, ?)').run(
      'https://example.com',
      'analytics1',
      5
    );
    const url = db.prepare('SELECT id FROM urls WHERE short_code = ?').get('analytics1') as any;
    for (let i = 0; i < 5; i++) {
      db.prepare('INSERT INTO clicks (url_id, referrer, user_agent) VALUES (?, ?, ?)').run(
        url.id,
        i < 3 ? 'https://twitter.com' : 'https://google.com',
        'Mozilla/5.0 Test'
      );
    }
  });

  afterAll(() => {
    db.close();
  });

  it('returns analytics for a short URL', async () => {
    const res = await request(app).get('/api/analytics/analytics1');

    expect(res.status).toBe(200);
    expect(res.body.url.totalClicks).toBe(5);
    expect(res.body.recentClicks).toHaveLength(5);
    expect(res.body.topReferrers.length).toBeGreaterThan(0);
  });

  it('returns 404 for unknown code', async () => {
    const res = await request(app).get('/api/analytics/nonexistent');
    expect(res.status).toBe(404);
  });
});
