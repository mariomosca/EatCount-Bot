import { Hono } from 'hono';
import type { PrismaClient } from '@prisma/client';
import { createComplianceService } from '../../lib/complianceService.js';

const VALID_STATUSES = ['FULL', 'PARTIAL', 'OFF'] as const;

export const createComplianceRoutes = (db: PrismaClient) => {
  const app = new Hono();
  const service = createComplianceService(db);

  // POST /api/compliance - upsert compliance for a day
  app.post('/', async (c) => {
    try {
      const body = await c.req.json();
      const { status, deviations, note, date } = body;

      if (!status || !VALID_STATUSES.includes(status)) {
        return c.json(
          { error: `status is required and must be one of: ${VALID_STATUSES.join(', ')}` },
          400
        );
      }

      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return c.json({ error: 'date must be in YYYY-MM-DD format' }, 400);
      }

      const compliance = await service.upsertCompliance({ status, deviations, note, date });

      return c.json({ success: true, compliance }, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  });

  // GET /api/compliance/today - today's compliance (null if not logged)
  app.get('/today', async (c) => {
    try {
      const compliance = await service.getTodayCompliance();
      return c.json({ compliance });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  });

  // GET /api/compliance/streak - consecutive FULL days streak
  app.get('/streak', async (c) => {
    try {
      const result = await service.getStreak();
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  });

  // GET /api/compliance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD - list range
  app.get('/', async (c) => {
    try {
      const { startDate, endDate } = c.req.query();

      if (!startDate || !endDate) {
        return c.json({ error: 'startDate and endDate are required (YYYY-MM-DD)' }, 400);
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return c.json({ error: 'startDate and endDate must be in YYYY-MM-DD format' }, 400);
      }

      const records = await service.listCompliance(startDate, endDate);
      return c.json({ records });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  });

  return app;
};
