import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import type { PrismaClient } from '@prisma/client';
import { createRequire } from 'module';

import { config } from '../../envconfig.js';
import logger from '../lib/logger.js';

import { createMealsRoutes } from './routes/meals.js';
import { createSummaryRoutes } from './routes/summary.js';
import { createTargetRoutes } from './routes/target.js';
import { createPlansRoutes } from './routes/plans.js';

// Get version from package.json
const require = createRequire(import.meta.url);
const pkg = require('../../package.json');
export const APP_VERSION = pkg.version;

// Simple API key middleware
const apiKeyAuth = (apiKey: string) => {
  return async (c: any, next: () => Promise<void>) => {
    if (!apiKey) {
      // No API key configured, allow all requests (dev mode)
      return next();
    }

    const providedKey = c.req.header('X-API-Key');
    if (providedKey !== apiKey) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    return next();
  };
};

export const startApiServer = (db: PrismaClient) => {
  const app = new Hono();

  // Health check (no auth required)
  app.get('/health', (c) => c.json({ status: 'ok' }));

  // Version endpoint (no auth required)
  app.get('/version', (c) =>
    c.json({
      version: APP_VERSION,
      name: 'EatCount Bot',
      timestamp: new Date().toISOString(),
    })
  );

  // API routes with auth
  const api = new Hono();
  api.use('*', apiKeyAuth(config.api.key));

  // Mount route modules
  api.route('/meals', createMealsRoutes(db));
  api.route('/summary', createSummaryRoutes(db));
  api.route('/target', createTargetRoutes(db));
  api.route('/plans', createPlansRoutes(db));

  app.route('/api', api);

  const port = config.server.apiPort;

  serve({
    fetch: app.fetch,
    port,
  });

  logger.info(`[API]: Server running on port ${port}`);

  return app;
};
