import { Hono } from 'hono';
import type { PrismaClient } from '@prisma/client';

// Default user (Mario's Telegram ID)
const DEFAULT_TELEGRAM_ID = '179533089';

export const createTargetRoutes = (db: PrismaClient) => {
  const app = new Hono();

  // GET /target - Get current calorie target
  app.get('/', async (c) => {
    try {
      const user = await db.user.findUnique({
        where: { telegramId: DEFAULT_TELEGRAM_ID },
        include: { targets: true },
      });

      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }

      const target = user.targets?.calorieTarget || null;

      return c.json({ target });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  });

  // PUT /target - Set calorie target
  app.put('/', async (c) => {
    try {
      const body = await c.req.json();
      const { calories } = body;

      if (calories === undefined || typeof calories !== 'number') {
        return c.json({ error: 'Missing or invalid calories value' }, 400);
      }

      const user = await db.user.findUnique({
        where: { telegramId: DEFAULT_TELEGRAM_ID },
      });

      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }

      await db.target.upsert({
        where: { userId: user.id },
        update: { calorieTarget: calories },
        create: { userId: user.id, calorieTarget: calories },
      });

      return c.json({ success: true, target: calories });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  });

  return app;
};
