import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { config } from './config.js';

chromium.use(stealthPlugin());

let cachedBrowser = null;
let cachedContext = null;
let cachedExpiresAt = 0;
let warmingPromise = null;

const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const launchBrowser = async () => chromium.launch({
  headless: true,
  args: [
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ],
});

const isCookiePopupGone = (page) => page.evaluate(() => !document.querySelector('[data-target-popup="data-popup-cookies"]'));

const dismissOverlays = async (page) => {
  await page.evaluate(() => {
    document.querySelectorAll('.overlay, [data-target-popup="data-popup-cookies"], [class*="cookies-popup"], #loader').forEach(el => el.remove());
    document.body.style.overflow = 'auto';
  });
};

const waitForCfClearance = async (page) => {
  const deadline = Date.now() + config.cfChallengeTimeoutMs;
  while (Date.now() < deadline) {
    const title = await page.title().catch(() => '');
    if (!/moment/i.test(title) && !title.includes('Just a moment')) return;
    await page.waitForTimeout(1000);
  }
  throw new Error('Cloudflare challenge did not clear in time');
};

const warmUpContext = async () => {
  if (cachedContext && Date.now() < cachedExpiresAt) return cachedContext;
  if (warmingPromise) return warmingPromise;

  warmingPromise = (async () => {
    if (!cachedBrowser || !cachedBrowser.isConnected()) {
      cachedBrowser = await launchBrowser();
    }
    if (cachedContext) {
      try { await cachedContext.close(); } catch { /* ignore */ }
    }
    const context = await cachedBrowser.newContext({
      userAgent,
      locale: 'pt-PT',
      viewport: { width: 1366, height: 800 },
    });
    const page = await context.newPage();
    await page.goto(config.autodocBaseUrl + '/', {
      waitUntil: 'domcontentloaded',
      timeout: config.navigationTimeoutMs,
    });
    await waitForCfClearance(page);
    await dismissOverlays(page);

    cachedContext = context;
    cachedExpiresAt = Date.now() + config.cookieRefreshMinutes * 60 * 1000;
    return context;
  })();

  try {
    const context = await warmingPromise;
    return context;
  } finally {
    warmingPromise = null;
  }
};

export const withWarmPage = async (operation) => {
  const context = await warmUpContext();
  const page = await context.newPage();
  try {
    await page.goto(config.autodocBaseUrl + '/', {
      waitUntil: 'domcontentloaded',
      timeout: config.navigationTimeoutMs,
    });
    await dismissOverlays(page);
    return await operation(page);
  } finally {
    await page.close().catch(() => { /* ignore */ });
  }
};

export const invalidateContext = () => {
  cachedExpiresAt = 0;
};

export const shutdown = async () => {
  try { await cachedContext?.close(); } catch { /* ignore */ }
  try { await cachedBrowser?.close(); } catch { /* ignore */ }
  cachedContext = null;
  cachedBrowser = null;
};
