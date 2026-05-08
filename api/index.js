import app from '../src/app.js';

export default function handler(request, response) {
  return app(request, response);
}
