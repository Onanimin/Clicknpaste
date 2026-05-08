import { Router } from 'express';
import { getBaseUrl, getCurrentTimeForExpiry } from '../lib/config.js';
import { createPasteSchema, pasteParamsSchema } from '../validation/pasteSchemas.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { ApiError } from '../lib/errors.js';

export function createPastesApiRouter({ createPaste, consumePaste }) {
  const router = Router();

  router.post('/api/pastes', validateBody(createPasteSchema), async (request, response, next) => {
    try {
      const paste = await createPaste({
        content: request.body.content,
        ttlSeconds: request.body.ttl_seconds,
        maxViews: request.body.max_views,
        password: request.body.password,
        currentTime: getCurrentTimeForExpiry(request)
      });

      response.set('Cache-Control', 'no-store');
      const payload = {
        id: paste.id,
        url: `${getBaseUrl(request)}/p/${paste.id}`,
        private: Boolean(request.body && typeof request.body.password === 'string' && request.body.password.length > 0)
      };

      // If the creator supplied a password for a private paste,
      // include it in the immediate response so they can copy/store it.
      if (payload.private) {
        payload.password = request.body.password;
      }

      return response.status(201).json(payload);
    } catch (error) {
      return next(error);
    }
  });

  router.get('/api/pastes/:id', validateParams(pasteParamsSchema), async (request, response, next) => {
    try {
      const headerPassword = request.get('x-paste-password');
      const queryPassword = typeof request.query.password === 'string' ? request.query.password : undefined;
      const password = headerPassword || queryPassword;
      const result = await consumePaste(request.params.id, getCurrentTimeForExpiry(request), password);
      const paste = result?.paste || null;

      if (result?.error === 'PASSWORD_REQUIRED') {
        throw new ApiError(401, 'Password required');
      }

      if (result?.error === 'INVALID_PASSWORD') {
        throw new ApiError(401, 'Invalid password');
      }

      if (!paste) {
        throw new ApiError(404, 'Not found');
      }

      response.set('Cache-Control', 'no-store');
      return response.status(200).json({
        content: paste.content,
        remaining_views: paste.maxViews === null ? null : Math.max(0, paste.maxViews - paste.viewCount),
        expires_at: paste.expiresAt ? paste.expiresAt.toISOString() : null
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
