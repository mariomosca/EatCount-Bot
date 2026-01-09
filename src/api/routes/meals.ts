import { Hono } from 'hono';
import type { PrismaClient, MealType } from '@prisma/client';

// Default user (Mario's Telegram ID)
const DEFAULT_TELEGRAM_ID = '179533089';

export const createMealsRoutes = (db: PrismaClient) => {
  const app = new Hono();

  // GET /meals - Get meals with optional filters
  app.get('/', async (c) => {
    try {
      const { date, startDate, endDate, mealType } = c.req.query();

      const user = await db.user.findUnique({
        where: { telegramId: DEFAULT_TELEGRAM_ID },
      });

      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }

      let dateFilter: { gte?: Date; lte?: Date } | undefined;

      if (startDate && endDate) {
        dateFilter = {
          gte: new Date(startDate + 'T00:00:00'),
          lte: new Date(endDate + 'T23:59:59'),
        };
      } else if (date) {
        dateFilter = {
          gte: new Date(date + 'T00:00:00'),
          lte: new Date(date + 'T23:59:59'),
        };
      } else {
        // Default to today
        const today = new Date().toISOString().split('T')[0];
        dateFilter = {
          gte: new Date(today + 'T00:00:00'),
          lte: new Date(today + 'T23:59:59'),
        };
      }

      const meals = await db.meal.findMany({
        where: {
          userId: user.id,
          timestamp: dateFilter,
          ...(mealType && { type: mealType as MealType }),
        },
        include: { items: true },
        orderBy: { timestamp: 'asc' },
      });

      return c.json({ meals });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  });

  // POST /meals - Add a new meal
  app.post('/', async (c) => {
    try {
      const body = await c.req.json();
      const { description, mealType, calories, protein, fat, carbs } = body;

      if (!description || !mealType || calories === undefined) {
        return c.json(
          { error: 'Missing required fields: description, mealType, calories' },
          400
        );
      }

      const user = await db.user.findUnique({
        where: { telegramId: DEFAULT_TELEGRAM_ID },
      });

      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }

      const meal = await db.meal.create({
        data: {
          userId: user.id,
          type: mealType as MealType,
          timestamp: new Date(),
          description,
          totalCalories: calories,
          totalProtein: protein || 0,
          totalFat: fat || 0,
          totalCarbs: carbs || 0,
        },
      });

      return c.json({ meal }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  });

  // PUT /meals/:id - Update a meal
  app.put('/:id', async (c) => {
    try {
      const mealId = c.req.param('id');
      const body = await c.req.json();
      const { description, mealType, calories, protein, fat, carbs, timestamp } = body;

      const updateData: Record<string, any> = {};
      if (description !== undefined) updateData.description = description;
      if (mealType !== undefined) updateData.type = mealType as MealType;
      if (calories !== undefined) updateData.totalCalories = calories;
      if (protein !== undefined) updateData.totalProtein = protein;
      if (fat !== undefined) updateData.totalFat = fat;
      if (carbs !== undefined) updateData.totalCarbs = carbs;
      if (timestamp !== undefined) updateData.timestamp = new Date(timestamp);

      if (Object.keys(updateData).length === 0) {
        return c.json({ error: 'No fields to update' }, 400);
      }

      const meal = await db.meal.update({
        where: { id: mealId },
        data: updateData,
        include: { items: true },
      });

      return c.json({ meal });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  });

  // DELETE /meals/:id - Delete a meal
  app.delete('/:id', async (c) => {
    try {
      const mealId = c.req.param('id');

      await db.meal.delete({
        where: { id: mealId },
      });

      return c.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  });

  return app;
};
