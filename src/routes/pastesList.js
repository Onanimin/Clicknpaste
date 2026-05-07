import { Router } from 'express';
import { listAvailablePastes } from '../services/pasteService.js';
import { getCurrentTimeForExpiry } from '../lib/config.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get('/api/pastes', async (req, res, next) => {
  try {
    const now = getCurrentTimeForExpiry(req);
    const list = await listAvailablePastes(now);
    const mapped = list.map((p) => ({
      id: p.id,
      created_at: p.createdAt ? new Date(p.createdAt).toISOString() : null,
      remaining_views: p.maxViews === null ? null : p.maxViews - p.viewCount,
      private: Boolean(p.passwordHash)
    }));

    res.set('Cache-Control', 'no-store');
    return res.status(200).json(mapped);
  } catch (error) {
    return next(error);
  }
});

router.get('/list', (req, res) => {
  return res.status(200).sendFile(path.join(__dirname, '..', '..', 'public', 'list.html'));
});

export default router;