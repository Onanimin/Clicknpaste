import { Router } from 'express';
import { ApiError } from '../lib/errors.js';

export function createHealthRouter({ checkDatabaseConnection }) {
  const router = Router();

  router.get('/api/healthz', async (request, response, next) => {
    try {
      await checkDatabaseConnection();
      return response.status(200).json({ ok: true });
    } catch (error) {
      return next(new ApiError(503, 'Database unavailable'));
    }
  });

  return router;
}