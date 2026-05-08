import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { renderPastePage } from '../src/lib/html.js';

describe('clicknpaste app', () => {
  it('serves the homepage with a paste form', async () => {
    const app = createApp({
      checkDatabaseConnectionFn: async () => {},
      createPasteFn: async () => ({ id: 'abc123' }),
      consumePasteFn: async () => null
    });

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('Create a text paste');
  });

  it('returns health status when the database check succeeds', async () => {
    const app = createApp({
      checkDatabaseConnectionFn: async () => {},
      createPasteFn: async () => ({ id: 'abc123' }),
      consumePasteFn: async () => null
    });

    const response = await request(app).get('/api/healthz');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('creates a paste and returns a shareable url', async () => {
    const app = createApp({
      checkDatabaseConnectionFn: async () => {},
      createPasteFn: async () => ({ id: 'paste123' }),
      consumePasteFn: async () => null
    });

    const response = await request(app)
      .post('/api/pastes')
      .set('host', 'example.com')
      .send({ content: 'hello' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: 'paste123',
      url: 'http://example.com/p/paste123',
      private: false
    });
  });

  it('returns password in create response when password provided', async () => {
    const app = createApp({
      checkDatabaseConnectionFn: async () => {},
      createPasteFn: async () => ({ id: 'paste123' }),
      consumePasteFn: async () => null
    });

    const response = await request(app)
      .post('/api/pastes')
      .set('host', 'example.com')
      .send({ content: 'hello', password: 's3cr3t' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: 'paste123',
      url: 'http://example.com/p/paste123',
      private: true,
      password: 's3cr3t'
    });
  });

  it('uses http for localhost share urls', async () => {
    const localHost = 'localhost:3000';
    const app = createApp({
      checkDatabaseConnectionFn: async () => {},
      createPasteFn: async () => ({ id: 'paste123' }),
      consumePasteFn: async () => null
    });

    const response = await request(app)
      .post('/api/pastes')
      .set('host', localHost)
      .send({ content: 'hello' });

    expect(response.status).toBe(201);
    expect(response.body.url).toBe(`http://${localHost}/p/paste123`);
  });

  it('returns json for malformed body input', async () => {
    const app = createApp({
      checkDatabaseConnectionFn: async () => {},
      createPasteFn: async () => ({ id: 'abc123' }),
      consumePasteFn: async () => null
    });

    const response = await request(app)
      .post('/api/pastes')
      .set('content-type', 'application/json')
      .send('{');

    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toHaveProperty('error');
  });

  it('requires password for private paste api access', async () => {
    const app = createApp({
      checkDatabaseConnectionFn: async () => {},
      createPasteFn: async () => ({ id: 'abc123' }),
      consumePasteFn: async () => ({ error: 'PASSWORD_REQUIRED' })
    });

    const response = await request(app).get('/api/pastes/private123');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Password required' });
  });

  it('shows password prompt page for private paste html access', async () => {
    const app = createApp({
      checkDatabaseConnectionFn: async () => {},
      createPasteFn: async () => ({ id: 'abc123' }),
      consumePasteFn: async () => ({ error: 'PASSWORD_REQUIRED' })
    });

    const response = await request(app).get('/p/private123');

    expect(response.status).toBe(401);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('password-protected');
  });

  it('escapes html in the public paste page', () => {
    const html = renderPastePage({
      id: 'abc',
      content: '<script>alert(1)</script>',
      remainingViews: null
    });

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('includes raw and delete actions on the paste page', () => {
    const html = renderPastePage({
      id: 'abc',
      content: 'hello',
      remainingViews: 3
    });

    expect(html).toContain('Open raw');
    expect(html).toContain('Delete paste');
    expect(html).toContain('/p/abc/raw');
    expect(html).toContain('/api/pastes/abc');
  });

  it('serves raw text endpoint for paste content', async () => {
    const app = createApp({
      checkDatabaseConnectionFn: async () => {},
      createPasteFn: async () => ({ id: 'paste123' }),
      consumePasteFn: async () => ({ paste: { content: 'hello world' } })
    });

    const response = await request(app).get('/p/paste123/raw');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toBe('hello world');
  });

  it('allows deletion of pastes with correct password', async () => {
    const app = createApp({
      checkDatabaseConnectionFn: async () => {},
      createPasteFn: async () => ({ id: 'paste123' }),
      consumePasteFn: async () => null,
      deletePasteFn: async () => ({ ok: true })
    });

    const response = await request(app)
      .delete('/api/pastes/paste123')
      .set('x-paste-password', 'secret');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('rejects delete without password for private paste', async () => {
    const app = createApp({
      checkDatabaseConnectionFn: async () => {},
      createPasteFn: async () => ({ id: 'paste123' }),
      consumePasteFn: async () => null,
      deletePasteFn: async () => ({ error: 'PASSWORD_REQUIRED' })
    });

    const response = await request(app).delete('/api/pastes/paste123');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Password required' });
  });
});
