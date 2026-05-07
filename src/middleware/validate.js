import { ApiError } from '../lib/errors.js';

export function validateBody(schema) {
  return (request, response, next) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      return next(new ApiError(400, 'Invalid request body'));
    }

    request.body = result.data;
    return next();
  };
}

export function validateParams(schema) {
  return (request, response, next) => {
    const result = schema.safeParse(request.params);

    if (!result.success) {
      return next(new ApiError(404, 'Not found'));
    }

    request.params = result.data;
    return next();
  };
}