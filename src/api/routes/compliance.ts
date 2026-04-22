import { Hono } from 'hono';
import type { PrismaClient } from '@prisma/client';
import {
  createComplianceService,
  MEAL_SLOTS,
} from '../../lib/complianceService.js';

const VALID_STATUSES = ['FULL', 'PARTIAL', 'OFF'] as const;
const VALID_SLOTS = MEAL_SLOTS;

export const createComplianceRoutes = (db: PrismaClient) => {
  const app = new Hono();
  const service = createComplianceService(db);

  // POST /api/compliance - upsert compliance for a day
  // Accepts either { status, ... } for aggregate or { meals: [{ slot, status }] } for breakdown
  app.post('/', async (c) => {
    try {
      const body = await c.req.json();
      const { status, deviations, note, date, meals } = body;

      if (status && !VALID_STATUSES.includes(status)) {
        return c.json(
          { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
          400
        );
      }

      if (meals) {
        if (!Array.isArray(meals)) {
          return c.json({ error: 'meals must be an array' }, 400);
        }
        for (const m of meals) {
          if (!m.slot || !VALID_SLOTS.includes(m.slot)) {
            return c.json(
              { error: `meal.slot must be one of: ${VALID_SLOTS.join(', ')}` },
              400
            );
          }
          if (!m.status || !VALID_STATUSES.includes(m.status)) {
            return c.json(
              { error: `meal.status must be one of: ${VALID_STATUSES.join(', ')}` },
              400
            );
          }
        }
      }

      if (!status && !meals) {
        return c.json({ error: 'Either status or meals must be provided' }, 400);
      }

      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return c.json({ error: 'date must be in YYYY-MM-DD format' }, 400);
      }

      const compliance = await service.upsertCompliance({
        status,
        deviations,
        note,
        date,
        meals,
      });

      return c.json({ success: true, compliance }, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  });

  // POST /api/compliance/meal - upsert single meal compliance
  app.post('/meal', async (c) => {
    try {
      const body = await c.req.json();
      const { slot, status, note, date } = body;

      if (!slot || !VALID_SLOTS.includes(slot)) {
        return c.json(
          { error: `slot must be one of: ${VALID_SLOTS.join(', ')}` },
          400
        );
      }
      if (!status || !VALID_STATUSES.includes(status)) {
        return c.json(
          { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
          400
        );
      }
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return c.json({ error: 'date must be in YYYY-MM-DD format' }, 400);
      }

      const compliance = await service.upsertMealCompliance(date, slot, status, note);
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

  // GET /api/compliance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD - list range (with meals)
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
