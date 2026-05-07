import { Router } from 'express';
import { getCurrentTimeForExpiry } from '../lib/config.js';
import { pasteParamsSchema } from '../validation/pasteSchemas.js';
import { validateParams } from '../middleware/validate.js';
import { renderPastePage, renderPrivatePastePromptPage } from '../lib/html.js';
import { ApiError } from '../lib/errors.js';

export function createPastesPageRouter({ consumePaste, deletePaste }) {
  const router = Router();

  router.delete('/api/pastes/:id', validateParams(pasteParamsSchema), async (request, response, next) => {
    try {
      const headerPassword = request.get('x-paste-password');
      const queryPassword = typeof request.query.password === 'string' ? request.query.password : undefined;
      const password = headerPassword || queryPassword;
      const result = await deletePaste(request.params.id, getCurrentTimeForExpiry(request), password);

      if (result?.error === 'NOT_FOUND') {
        throw new ApiError(404, 'Not found');
      }

      if (result?.error === 'PASSWORD_REQUIRED') {
        throw new ApiError(401, 'Password required');
      }

      if (result?.error === 'INVALID_PASSWORD') {
        throw new ApiError(401, 'Invalid password');
      }

      response.set('Cache-Control', 'no-store');
      return response.status(200).json({ ok: true });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/p/:id/raw', validateParams(pasteParamsSchema), async (request, response, next) => {
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
      response.set('Content-Type', 'text/plain; charset=utf-8');
      return response.status(200).send(paste.content);
    } catch (error) {
      return next(error);
    }
  });

  router.get('/p/:id', validateParams(pasteParamsSchema), async (request, response, next) => {
    try {
      const password = typeof request.query.password === 'string' ? request.query.password : undefined;
      const result = await consumePaste(request.params.id, getCurrentTimeForExpiry(request), password);
      const paste = result?.paste || null;

      if (result?.error === 'PASSWORD_REQUIRED') {
        return response.status(401).type('html').send(renderPrivatePastePromptPage({ id: request.params.id }));
      }

      if (result?.error === 'INVALID_PASSWORD') {
        return response.status(401).type('html').send(renderPrivatePastePromptPage({ id: request.params.id, invalid: true }));
      }

      if (!paste) {
        const errorHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Not found</title>
  <style>
    body { font-family: Inter, system-ui; padding: 40px 20px; background: #0b0b0b; color: #fff; text-align: center; }
    h1 { font-size: 2rem; margin-bottom: 10px; color: #ffb14d; }
    p { color: #b6ad9f; max-width: 60ch; margin: 0 auto 20px; }
    a { color: #ffb14d; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Paste not found</h1>
  <p>The paste you're looking for has expired, reached its view limit, or never existed.</p>
  <a href="/">Create a new paste</a>
</body>
</html>`;
        return response.status(404).type('html').send(errorHtml);
      }

      return response
        .status(200)
        .type('html')
        .send(
          renderPastePage({
            id: paste.id,
            content: paste.content,
            expiresAt: paste.expiresAt,
            remainingViews: paste.maxViews === null ? null : paste.maxViews - paste.viewCount
          })
        );
    } catch (error) {
      return next(error);
    }
  });

  return router;
}