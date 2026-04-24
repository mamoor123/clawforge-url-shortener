import { Router, Request, Response } from 'express';
import Database from 'better-sqlite3';

export const analyticsRouter = Router();

// GET /api/analytics/:code — Get click stats for a short URL
analyticsRouter.get('/:code', (req: Request, res: Response) => {
  const db: Database.Database = req.app.locals.db;
  const { code } = req.params;

  // Find the URL
  const url = db.prepare(
    'SELECT id, original_url, short_code, created_at, clicks FROM urls WHERE short_code = ?'
  ).get(code) as any;

  if (!url) {
    return res.status(404).json({ error: 'Short URL not found' });
  }

  // Get click details
  const clicks = db.prepare(
    'SELECT clicked_at, referrer, user_agent FROM clicks WHERE url_id = ? ORDER BY clicked_at DESC LIMIT 100'
  ).all(url.id);

  // Get clicks by day (last 30 days)
  const dailyClicks = db.prepare(`
    SELECT DATE(clicked_at) as date, COUNT(*) as count
    FROM clicks
    WHERE url_id = ? AND clicked_at >= datetime('now', '-30 days')
    GROUP BY DATE(clicked_at)
    ORDER BY date
  `).all(url.id);

  // Get top referrers
  const topReferrers = db.prepare(`
    SELECT referrer, COUNT(*) as count
    FROM clicks
    WHERE url_id = ? AND referrer IS NOT NULL
    GROUP BY referrer
    ORDER BY count DESC
    LIMIT 10
  `).all(url.id);

  res.json({
    url: {
      originalUrl: url.original_url,
      shortCode: url.short_code,
      shortUrl: `${req.protocol}://${req.get('host')}/${url.short_code}`,
      createdAt: url.created_at,
      totalClicks: url.clicks,
    },
    dailyClicks,
    topReferrers,
    recentClicks: clicks,
  });
});
