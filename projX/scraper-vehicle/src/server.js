import express from 'express';
import { config } from './config.js';
import { lookupPlate, PlateNotFoundError, UpstreamError } from './lookup.js';
import { shutdown } from './browserPool.js';

const app = express();
app.use(express.json({ limit: '64kb' }));

const requireApiKey = (req, res, next) => {
  if (req.headers['x-api-key'] !== config.apiKey) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
};

app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

app.get('/lookup', requireApiKey, async (req, res) => {
  const plate = typeof req.query.plate === 'string' ? req.query.plate : null;
  if (!plate) return res.status(400).json({ error: 'plate query param required' });
  try {
    const result = await lookupPlate(plate);
    res.json(result);
  } catch (error) {
    if (error instanceof PlateNotFoundError) {
      return res.status(404).json({ error: 'plate_not_found', message: error.message });
    }
    if (error instanceof UpstreamError) {
      return res.status(503).json({ error: 'upstream_unavailable', message: error.message });
    }
    console.error('lookup failed', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

const server = app.listen(config.port, () => {
  console.log(`scraper-vehicle listening on :${config.port}`);
});

const stop = async () => {
  console.log('shutting down...');
  server.close();
  await shutdown();
  process.exit(0);
};

process.on('SIGTERM', stop);
process.on('SIGINT', stop);
