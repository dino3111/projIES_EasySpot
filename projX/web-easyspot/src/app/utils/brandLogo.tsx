const CDN = 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized';

const BRAND_SLUGS: Record<string, string> = {
  'audi': 'audi',
  'bmw': 'bmw',
  'citroen': 'citroen',
  'citroën': 'citroen',
  'dacia': 'dacia',
  'fiat': 'fiat',
  'ford': 'ford',
  'honda': 'honda',
  'hyundai': 'hyundai',
  'jaguar': 'jaguar',
  'jeep': 'jeep',
  'kia': 'kia',
  'lexus': 'lexus',
  'mazda': 'mazda',
  'mercedes': 'mercedes-benz',
  'mercedes-benz': 'mercedes-benz',
  'mini': 'mini',
  'mitsubishi': 'mitsubishi',
  'nissan': 'nissan',
  'opel': 'opel',
  'peugeot': 'peugeot',
  'porsche': 'porsche',
  'renault': 'renault',
  'seat': 'seat',
  'skoda': 'skoda',
  'škoda': 'skoda',
  'subaru': 'subaru',
  'suzuki': 'suzuki',
  'tesla': 'tesla',
  'toyota': 'toyota',
  'volkswagen': 'volkswagen',
  'vw': 'volkswagen',
  'volvo': 'volvo',
  'alfa romeo': 'alfa-romeo',
  'land rover': 'land-rover',
  'chevrolet': 'chevrolet',
  'lamborghini': 'lamborghini',
  'maserati': 'maserati',
  'infiniti': 'infiniti',
};

export function getBrandLogoUrl(make?: string): string | null {
  if (!make) return null;
  const slug = BRAND_SLUGS[make.toLowerCase().trim()];
  if (!slug) return null;
  return `${CDN}/${slug}.png`;
}

export function detectChargerTypes(make?: string): string[] {
  const m = make?.toLowerCase() ?? '';
  if (m.includes('tesla')) return ['Tesla Supercharger', 'CCS', 'Type 2'];
  if (m.includes('nissan') || m.includes('mitsubishi')) return ['Type 2', 'CHAdeMO'];
  return ['Type 2', 'CCS'];
}

export function isEVFuelType(fuelType?: string): boolean {
  if (!fuelType) return false;
  const f = fuelType.toLowerCase();
  return f.includes('elét') || f.includes('elect') || f.includes('híbrid') || f.includes('hybrid');
}
