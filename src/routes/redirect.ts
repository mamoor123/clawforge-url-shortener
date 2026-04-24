import { Router, Request, Response } from 'express';
import Database from 'better-sqlite3';

export const redirectRouter = Router();

// GET /:code — Redirect to original URL and track click
redirectRouter.get('/:code', (req: Request, res: Response) => {
  const db: Database.Database = req.app.locals.db;
  const { code } = req.params;

  // Skip API routes and static files
  if (code === 'api' || code === 'favicon.ico') {
    return res.status(404).send('Not found');
  }

  // Find the URL
  const url = db.prepare('SELECT id, original_url, clicks FROM urls WHERE short_code = ?').get(code) as any;

  if (!url) {
    return res.status(404).send(`
      <html>
        <body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;background:#1a1a2e;color:#e0e0e0">
          <div style="text-align:center">
            <h1 style="font-size:4rem;margin:0">404</h1>
            <p>Short URL not found</p>
            <a href="/" style="color:#7c3aed">← Back to shortener</a>
          </div>
        </body>
      </html>
    `);
  }

  // Track the click (wrapped in transaction for data consistency)
  const referrer = req.get('referer') || null;
  const userAgent = req.get('user-agent') || null;
  const ip = req.ip || req.socket.remoteAddress || null;

  const trackClick = db.transaction(() => {
    db.prepare(
      'INSERT INTO clicks (url_id, referrer, user_agent, ip_address) VALUES (?, ?, ?, ?)'
    ).run(url.id, referrer, userAgent, ip);
    db.prepare('UPDATE urls SET clicks = clicks + 1 WHERE id = ?').run(url.id);
  });
  trackClick();

  // Redirect
  res.redirect(302, url.original_url);
});
