import { ApiError } from '../lib/errors.js';

export function notFoundHandler(request, response) {
  response.status(404).json({ error: 'Not found' });
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  if (error instanceof ApiError) {
    return response.status(error.statusCode).json({ error: error.message });
  }

  if (typeof error?.status === 'number' && error.status >= 400 && error.status < 500) {
    return response.status(error.status).json({ error: error.message || 'Bad request' });
  }

  if (error?.type === 'entity.parse.failed') {
    return response.status(400).json({ error: 'Invalid JSON body' });
  }

  if (error?.code === 'P1001' || error?.code === 'P1017' || error?.code === 'P2021') {
    return response.status(503).json({ error: 'Database unavailable' });
  }

  console.error(error);
  return response.status(500).json({ error: 'Internal server error' });
}