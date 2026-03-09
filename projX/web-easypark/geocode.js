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

async function geocode() {
  for (const lot of lots) {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(lot.name)}`);
    const data = await res.json();
    if (data.length > 0) {
      console.log(`${lot.id}: ${data[0].lat}, ${data[0].lon}`);
    } else {
      console.log(`${lot.id}: not found`);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}
geocode();
