export function getBaseUrl(request) {
  const configuredBaseUrl = process.env.BASE_URL?.trim().replace(/\/$/, '');

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const forwardedHost = request.get('x-forwarded-host');
  const host = forwardedHost || request.get('host');

  if (host && /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host)) {
    return `http://${host}`;
  }

  const protocol = request.get('x-forwarded-proto') || request.protocol;

  return `${protocol}://${host}`;
}

export function getCurrentTimeForExpiry(request) {
  if (process.env.TEST_MODE === '1') {
    const headerValue = request.get('x-test-now-ms');
    const parsedValue = Number(headerValue);

    if (Number.isFinite(parsedValue)) {
      return new Date(parsedValue);
    }
  }

  return new Date();
}