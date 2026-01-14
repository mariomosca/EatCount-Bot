import { Hono } from 'hono';
import type { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import { parseNutritionPlanPDF } from '../../lib/ai-services.js';
import { updatePlanMeal, updatePlanDay } from '../../helpers/nutrition-plan.js';

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

  // PATCH /plans/meal/:mealId - Update single meal
  app.patch('/meal/:mealId', async (c) => {
    try {
      const mealId = c.req.param('mealId');
      const body = await c.req.json();
      const { targetKcal, description, details } = body;

      // Validate at least one field is provided
      if (targetKcal === undefined && !description && details === undefined) {
        return c.json({ error: 'Provide at least one field to update: targetKcal, description, details' }, 400);
      }

      // Check meal exists
      const meal = await db.nutritionPlanMeal.findUnique({
        where: { id: mealId },
      });

      if (!meal) {
        return c.json({ error: 'Meal not found' }, 404);
      }

      await updatePlanMeal(db, mealId, {
        ...(targetKcal !== undefined && { targetKcal }),
        ...(description && { description }),
        ...(details !== undefined && { details }),
      });

      const updated = await db.nutritionPlanMeal.findUnique({
        where: { id: mealId },
      });

      return c.json({ success: true, meal: updated });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  });

  // PATCH /plans/day/:dayOfWeek - Update entire day
  app.patch('/day/:dayOfWeek', async (c) => {
    try {
      const dayOfWeek = parseInt(c.req.param('dayOfWeek'), 10);

      if (isNaN(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
        return c.json({ error: 'Invalid dayOfWeek (must be 1-7)' }, 400);
      }

      const body = await c.req.json();
      const { meals } = body;

      if (!meals || !Array.isArray(meals)) {
        return c.json({ error: 'Missing meals array' }, 400);
      }

      const user = await db.user.findUnique({
        where: { telegramId: DEFAULT_TELEGRAM_ID },
      });

      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }

      await updatePlanDay(db, user.id, dayOfWeek, meals);

      // Fetch updated day
      const plan = await db.nutritionPlan.findUnique({
        where: { userId: user.id },
        include: {
          days: {
            where: { dayOfWeek },
            include: { meals: true },
          },
        },
      });

      return c.json({ success: true, day: plan?.days[0] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  });

  // POST /plans/upload - Upload and parse PDF
  app.post('/upload', async (c) => {
    try {
      const formData = await c.req.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof File)) {
        return c.json({ error: 'No file provided or invalid file' }, 400);
      }

      // Validate MIME type
      if (file.type !== 'application/pdf') {
        return c.json({ error: 'File must be a PDF' }, 400);
      }

      const user = await db.user.findUnique({
        where: { telegramId: DEFAULT_TELEGRAM_ID },
      });

      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }

      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Parse PDF
      const parsed = await parseNutritionPlanPDF(buffer, file.name);

      // Delete existing and save new plan
      await db.nutritionPlan.deleteMany({
        where: { userId: user.id },
      });

      const plan = await db.nutritionPlan.create({
        data: {
          userId: user.id,
          name: parsed.name,
          days: {
            create: parsed.days.map((day) => ({
              dayOfWeek: day.dayOfWeek,
              meals: {
                create: day.meals.map((meal) => ({
                  mealType: meal.mealType,
                  targetKcal: meal.targetKcal,
                  description: meal.description,
                  details: meal.details,
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

  return app;
};
