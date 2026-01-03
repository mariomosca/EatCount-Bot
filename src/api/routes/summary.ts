import { Hono } from 'hono';
import type { PrismaClient } from '@prisma/client';

// Default user (Mario's Telegram ID)
const DEFAULT_TELEGRAM_ID = '179533089';

export const createSummaryRoutes = (db: PrismaClient) => {
  const app = new Hono();

  // GET /summary/daily - Get daily nutritional summary
  app.get('/daily', async (c) => {
    try {
      const { date } = c.req.query();
      const targetDate = date || new Date().toISOString().split('T')[0];

      const user = await db.user.findUnique({
        where: { telegramId: DEFAULT_TELEGRAM_ID },
        include: { targets: true },
      });

      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }

      const meals = await db.meal.findMany({
        where: {
          userId: user.id,
          timestamp: {
            gte: new Date(targetDate + 'T00:00:00'),
            lte: new Date(targetDate + 'T23:59:59'),
          },
        },
      });

      const totals = meals.reduce(
        (acc, meal) => ({
          calories: acc.calories + meal.totalCalories,
          protein: acc.protein + meal.totalProtein,
          fat: acc.fat + meal.totalFat,
          carbs: acc.carbs + meal.totalCarbs,
        }),
        { calories: 0, protein: 0, fat: 0, carbs: 0 }
      );

      const target = user.targets?.calorieTarget || 2000;
      const remaining = target - totals.calories;
      const percentage = Math.round((totals.calories / target) * 100);

      return c.json({
        date: targetDate,
        mealsCount: meals.length,
        totals,
        target,
        remaining,
        percentage,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  });

  // GET /summary/weekly - Get weekly nutritional summary
  app.get('/weekly', async (c) => {
    try {
      const { weekOffset = '0' } = c.req.query();
      const offset = parseInt(weekOffset, 10);

      const user = await db.user.findUnique({
        where: { telegramId: DEFAULT_TELEGRAM_ID },
        include: { targets: true },
      });

      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }

      // Calculate week start/end
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() + mondayOffset + offset * 7);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const meals = await db.meal.findMany({
        where: {
          userId: user.id,
          timestamp: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        orderBy: { timestamp: 'asc' },
      });

      // Group by day
      const dailyTotals: Record<
        string,
        { calories: number; protein: number; fat: number; carbs: number }
      > = {};

      meals.forEach((meal) => {
        const day = meal.timestamp.toISOString().split('T')[0];
        if (!dailyTotals[day]) {
          dailyTotals[day] = { calories: 0, protein: 0, fat: 0, carbs: 0 };
        }
        dailyTotals[day].calories += meal.totalCalories;
        dailyTotals[day].protein += meal.totalProtein;
        dailyTotals[day].fat += meal.totalFat;
        dailyTotals[day].carbs += meal.totalCarbs;
      });

      const days = Object.keys(dailyTotals).sort();
      const target = user.targets?.calorieTarget || 2000;

      // Calculate averages
      let avgCalories = 0;
      if (days.length > 0) {
        avgCalories = Math.round(
          days.reduce((sum, d) => sum + dailyTotals[d].calories, 0) / days.length
        );
      }

      return c.json({
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        target,
        dailyTotals,
        daysLogged: days.length,
        averageCalories: avgCalories,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  });

  return app;
};
