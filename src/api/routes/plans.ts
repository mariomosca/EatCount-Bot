import { Hono } from 'hono';
import type { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

// Default user (Mario's Telegram ID)
const DEFAULT_TELEGRAM_ID = '179533089';

export const createPlansRoutes = (db: PrismaClient) => {
  const app = new Hono();

  // GET /plans - Get nutrition plan (only one per user)
  app.get('/', async (c) => {
    try {
      const user = await db.user.findUnique({
        where: { telegramId: DEFAULT_TELEGRAM_ID },
      });

      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }

      const plan = await db.nutritionPlan.findUnique({
        where: { userId: user.id },
        include: {
          days: {
            include: { meals: true },
            orderBy: { dayOfWeek: 'asc' },
          },
        },
      });

      return c.json({ plan });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  });

  // GET /plans/today - Get today's plan
  app.get('/today', async (c) => {
    try {
      const user = await db.user.findUnique({
        where: { telegramId: DEFAULT_TELEGRAM_ID },
      });

      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }

      const plan = await db.nutritionPlan.findUnique({
        where: { userId: user.id },
        include: {
          days: {
            include: { meals: true },
          },
        },
      });

      if (!plan) {
        return c.json({ error: 'No nutrition plan found' }, 404);
      }

      // Get current day of week (1=Monday, 7=Sunday)
      const now = DateTime.now().setZone('Europe/Rome');
      const dayOfWeek = now.weekday;

      const today = plan.days.find((d) => d.dayOfWeek === dayOfWeek);

      if (!today) {
        return c.json({ error: 'No plan for today' }, 404);
      }

      const dayNames = ['', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

      return c.json({
        planName: plan.name,
        dayName: dayNames[dayOfWeek],
        dayOfWeek,
        meals: today.meals,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  });

  // GET /plans/day/:dayOfWeek - Get plan for specific day
  app.get('/day/:dayOfWeek', async (c) => {
    try {
      const dayOfWeek = parseInt(c.req.param('dayOfWeek'), 10);

      if (isNaN(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
        return c.json({ error: 'Invalid dayOfWeek (must be 1-7)' }, 400);
      }

      const user = await db.user.findUnique({
        where: { telegramId: DEFAULT_TELEGRAM_ID },
      });

      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }

      const plan = await db.nutritionPlan.findUnique({
        where: { userId: user.id },
        include: {
          days: {
            where: { dayOfWeek },
            include: { meals: true },
          },
        },
      });

      if (!plan || plan.days.length === 0) {
        return c.json({ error: 'No plan for this day' }, 404);
      }

      const dayNames = ['', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

      return c.json({
        planName: plan.name,
        dayName: dayNames[dayOfWeek],
        dayOfWeek,
        meals: plan.days[0].meals,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  });

  // GET /plans/meal/:mealType - Get today's planned meal by type
  app.get('/meal/:mealType', async (c) => {
    try {
      const mealType = c.req.param('mealType').toUpperCase();

      if (!['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'].includes(mealType)) {
        return c.json({ error: 'Invalid mealType' }, 400);
      }

      const user = await db.user.findUnique({
        where: { telegramId: DEFAULT_TELEGRAM_ID },
      });

      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }

      const now = DateTime.now().setZone('Europe/Rome');
      const dayOfWeek = now.weekday;

      const plan = await db.nutritionPlan.findUnique({
        where: { userId: user.id },
        include: {
          days: {
            where: { dayOfWeek },
            include: {
              meals: {
                where: { mealType: mealType as 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' },
              },
            },
          },
        },
      });

      if (!plan || plan.days.length === 0 || plan.days[0].meals.length === 0) {
        return c.json({ meal: null });
      }

      return c.json({ meal: plan.days[0].meals[0] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  });

  // POST /plans - Create nutrition plan from parsed data
  app.post('/', async (c) => {
    try {
      const body = await c.req.json();
      const { name, days } = body;

      if (!name || !days || !Array.isArray(days)) {
        return c.json({ error: 'Missing name or days array' }, 400);
      }

      const user = await db.user.findUnique({
        where: { telegramId: DEFAULT_TELEGRAM_ID },
      });

      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }

      // Delete existing plan (only one allowed)
      await db.nutritionPlan.deleteMany({
        where: { userId: user.id },
      });

      // Create new plan with nested days and meals
      const plan = await db.nutritionPlan.create({
        data: {
          userId: user.id,
          name,
          days: {
            create: days.map((day: { dayOfWeek: number; meals: any[] }) => ({
              dayOfWeek: day.dayOfWeek,
              meals: {
                create: day.meals.map((meal: any) => ({
                  mealType: meal.mealType,
                  targetKcal: meal.targetKcal,
                  description: meal.description,
                  details: meal.details || null,
                })),
              },
            })),
          },
        },
        include: {
          days: {
            include: { meals: true },
            orderBy: { dayOfWeek: 'asc' },
          },
        },
      });

      return c.json({ success: true, plan });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  });

  // DELETE /plans - Delete nutrition plan
  app.delete('/', async (c) => {
    try {
      const user = await db.user.findUnique({
        where: { telegramId: DEFAULT_TELEGRAM_ID },
      });

      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }

      const deleted = await db.nutritionPlan.deleteMany({
        where: { userId: user.id },
      });

      if (deleted.count === 0) {
        return c.json({ error: 'No plan to delete' }, 404);
      }

      return c.json({ success: true, message: 'Plan deleted' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  });

  return app;
};
