import { invalidateContext, withWarmPage } from './browserPool.js';
import { config } from './config.js';
import { parseCanonicalUrl, parseVehicleInfo } from './parser.js';

class PlateNotFoundError extends Error {}
class UpstreamError extends Error {}

const PLATE_REGEX = /^[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2}$/;

const submitLookup = async (page, plate) => page.evaluate(async ({ plate, baseUrl }) => {
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
  const body = `kba%5B%5D=${encodeURIComponent(plate)}&route=main&eventObject=block`;
  const response = await fetch(new URL('/ajax/selector/vehicle/search-number', baseUrl).toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': csrf,
      'Accept': 'application/json',
    },
    body,
    credentials: 'include',
  });
  return { status: response.status, body: await response.text() };
}, { plate, baseUrl: config.autodocBaseUrl });

const fetchVehicleInfo = async (page) => page.evaluate(async ({ baseUrl }) => {
  const response = await fetch(new URL('/ajax/selector/vehicle-info', baseUrl).toString(), {
    method: 'GET',
    headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'text/html, */*; q=0.01' },
    credentials: 'include',
  });
  return { status: response.status, body: await response.text() };
}, { baseUrl: config.autodocBaseUrl });

const safeJsonParse = (text) => {
  try { return JSON.parse(text); } catch { return null; }
};

export const lookupPlate = async (rawPlate) => {
  const plate = rawPlate.trim().toUpperCase();
  if (!PLATE_REGEX.test(plate)) {
    throw new PlateNotFoundError(`Invalid plate format: ${plate}`);
  }

  const result = await withWarmPage(async (page) => {
    const search = await submitLookup(page, plate);
    if (search.status === 419 || search.status === 403) {
      invalidateContext();
      throw new UpstreamError(`Cloudflare blocked request (status ${search.status})`);
    }
    if (search.status >= 500) {
      throw new UpstreamError(`Upstream returned ${search.status}`);
    }
    if (search.status === 422) {
      throw new PlateNotFoundError(`Plate ${plate} not found`);
    }
    if (search.status !== 200) {
      throw new UpstreamError(`Unexpected status ${search.status}`);
    }
    const ids = safeJsonParse(search.body);
    if (!ids || !ids.carId) {
      throw new PlateNotFoundError(`Plate ${plate} not found`);
    }

    const info = await fetchVehicleInfo(page);
    if (info.status !== 200) {
      throw new UpstreamError(`vehicle-info returned ${info.status}`);
    }

    const canonical = parseCanonicalUrl(ids.url);
    const parsed = parseVehicleInfo(info.body, ids);
    return {
      plate,
      ...canonical,
      ...parsed,
    };
  });

  return result;
};

export { PlateNotFoundError, UpstreamError };
