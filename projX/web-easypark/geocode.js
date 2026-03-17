// Usage: node geocode.js <your-email-or-app-id>
// Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/
const email = process.argv[2];
if (!email) {
  console.error('Usage: node geocode.js <your-email-or-app-id>');
  process.exit(1);
}

const HEADERS = {
  'User-Agent': `web-easypark/1.0 (${email})`,
  'Referer': 'https://github.com/your-org/web-easypark',
};

const lots = [
  { id: 'coimbra-1', name: 'Estádio Cidade de Coimbra' },
  { id: 'coimbra-2', name: 'CoimbraShopping' },
  { id: 'aveiro-1', name: 'Fórum Aveiro' },
  { id: 'aveiro-2', name: 'Glicínias Plaza' },
  { id: 'leiria-1', name: 'Avenida Marquês de Pombal, Leiria' },
  { id: 'leiria-2', name: 'Estádio Municipal Dr. Magalhães Pessoa' },
  { id: 'figueira-1', name: 'Avenida do Mar, Figueira da Foz' },
  { id: 'figueira-2', name: 'Foz Plaza' },
  { id: 'ovar-1', name: 'Estação Ferroviária de Ovar' },
  { id: 'ovar-2', name: 'Praia do Furadouro, Ovar' },
  { id: 'arganil-1', name: 'Mercado Municipal de Arganil' },
  { id: 'arganil-2', name: 'Santuário de Montalto, Arganil' },
];

async function fetchWithBackoff(url, retries = 3, delayMs = 2000) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.status === 429) {
      const wait = delayMs * 2 ** attempt;
      console.warn(`Rate limited. Retrying in ${wait}ms…`);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  }
  throw new Error(`Failed after ${retries} retries: ${url}`);
}

async function geocode() {
  for (const lot of lots) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(lot.name)}`;
    const data = await fetchWithBackoff(url);
    if (data.length > 0) {
      console.log(`${lot.id}: ${data[0].lat}, ${data[0].lon}`);
    } else {
      console.log(`${lot.id}: not found`);
    }
    await new Promise(r => setTimeout(r, 1100));
  }
}

geocode().catch(err => { console.error(err.message); process.exit(1); });
