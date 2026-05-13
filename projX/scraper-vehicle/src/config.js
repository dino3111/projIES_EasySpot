const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} env var is required`);
  return value;
};

const optional = (name, fallback) => process.env[name] ?? fallback;

export const config = {
  port: Number(optional('PORT', '4100')),
  apiKey: required('SCRAPER_API_KEY'),
  autodocBaseUrl: optional('AUTODOC_BASE_URL', 'https://www.auto-doc.pt'),
  imageBaseUrl: optional('AUTODOC_VEHICLE_IMAGE_BASE', 'https://scdn.autodoc.de/vehicles/800x287'),
  cookieRefreshMinutes: Number(optional('AUTODOC_COOKIE_REFRESH_MINUTES', '20')),
  navigationTimeoutMs: Number(optional('AUTODOC_NAVIGATION_TIMEOUT_MS', '60000')),
  cfChallengeTimeoutMs: Number(optional('AUTODOC_CF_TIMEOUT_MS', '30000')),
};
