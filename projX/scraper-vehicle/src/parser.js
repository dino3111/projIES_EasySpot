import * as cheerio from 'cheerio';

const FUEL_TYPE_MAP = {
  'otto': 'Gasolina',
  'gasolina': 'Gasolina',
  'diesel': 'Diesel',
  'gasóleo': 'Diesel',
  'gasoleo': 'Diesel',
  'eléctrico': 'Elétrico',
  'electrico': 'Elétrico',
  'elétrico': 'Elétrico',
  'híbrido': 'Híbrido',
  'hibrido': 'Híbrido',
  'gpl': 'GPL',
  'gnc': 'GNC',
};

const normaliseFuel = (raw) => {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  return FUEL_TYPE_MAP[key] || raw.trim();
};

const parseYearRange = (raw) => {
  if (!raw) return { yearFrom: null, yearTo: null };
  const matches = Array.from(raw.matchAll(/(\d{4})/g)).map(m => Number(m[1]));
  if (matches.length === 0) return { yearFrom: null, yearTo: null };
  return {
    yearFrom: matches[0],
    yearTo: matches[matches.length - 1] === matches[0] ? null : matches[matches.length - 1],
  };
};

const findValueByLabel = ($, labelMatcher) => {
  const dt = $('.popup-selector-sidebar-more-info__block-row-item').filter((_, el) => labelMatcher.test($(el).text())).first();
  if (dt.length === 0) return null;
  const dd = dt.next('.popup-selector-sidebar-more-info__block-row-item');
  return dd.text().trim() || null;
};

const extractTopText = ($, label) => {
  const span = $('.popup-selector-sidebar-more-info__text span').filter((_, el) => $(el).text().trim() === label).first();
  if (span.length === 0) return null;
  return span.parent().find('p').first().text().trim() || null;
};

export const parseVehicleInfo = (html, ids) => {
  const $ = cheerio.load(html);

  const image = $('.popup-selector-sidebar-more-info img').first().attr('src');
  const vin = extractTopText($, 'VIN');
  const engineType = findValueByLabel($, /^Tipo:?$/);
  const yearRange = findValueByLabel($, /Ano de fabrico/i);
  const bodyType = findValueByLabel($, /Tipos de carroçaria/i);
  const driveType = findValueByLabel($, /Tipo de propuls/i);
  const powerKwRaw = findValueByLabel($, /Potência \[kW\]/i);
  const powerCvRaw = findValueByLabel($, /Potência \[cv\]/i);
  const displacementRaw = findValueByLabel($, /Cilindrada/i);
  const cylindersRaw = findValueByLabel($, /^Cilindros:?$/);
  const fuelRaw = findValueByLabel($, /Tipo de motor/i);
  const engineCode = findValueByLabel($, /Código do motor/i);

  const { yearFrom, yearTo } = parseYearRange(yearRange);

  return {
    sourceCarId: ids.carId,
    sourceMakerId: ids.makerId,
    sourceModelId: ids.modelId,
    canonicalUrl: ids.url || null,
    vin: vin || null,
    engineType: engineType || null,
    yearFrom,
    yearTo,
    bodyType: bodyType || null,
    driveType: driveType || null,
    powerKw: powerKwRaw ? Number(powerKwRaw.replace(',', '.')) : null,
    powerCv: powerCvRaw ? Number(powerCvRaw.replace(',', '.')) : null,
    displacementCc: displacementRaw ? Number(displacementRaw.replace(/\D/g, '')) : null,
    cylinders: cylindersRaw ? Number(cylindersRaw) : null,
    fuelType: normaliseFuel(fuelRaw),
    engineCode: engineCode || null,
    imageRelativeUrl: image || null,
  };
};

export const parseCanonicalUrl = (url) => {
  if (!url) return { make: null, model: null, version: null };
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'pecas-automoveis') return { make: null, model: null, version: null };
    const make = parts[1] ? parts[1].replace(/-/g, ' ').toUpperCase() : null;
    const model = parts[2] ? toTitleCase(parts[2].replace(/-/g, ' ')) : null;
    const version = parts[3] ? toTitleCase(parts[3].replace(/-/g, ' ')) : null;
    return { make, model, version };
  } catch {
    return { make: null, model: null, version: null };
  }
};

const toTitleCase = (text) => text.replace(/\b\w/g, c => c.toUpperCase());
