import type { MealType, PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

interface ComparisonResult {
  hasPlan: boolean;
  message?: string;
}

interface ComparePlanParams {
  db: PrismaClient;
  userId: string;
  mealType: MealType;
  loggedCalories: number;
}

export const compareWithPlan = async ({
  db,
  userId,
  mealType,
  loggedCalories,
}: ComparePlanParams): Promise<ComparisonResult> => {
  // Get user's nutrition plan
  const plan = await db.nutritionPlan.findFirst({
    where: {
      user: { telegramId: userId },
    },
    include: {
      days: {
        include: { meals: true },
      },
    },
  });

  if (!plan) {
    return { hasPlan: false };
  }

  // Get current day of week (1=Monday, 7=Sunday)
  const now = DateTime.now().setZone('Europe/Rome');
  const dayOfWeek = now.weekday;

  // Find today's plan
  const todayPlan = plan.days.find((d) => d.dayOfWeek === dayOfWeek);
  if (!todayPlan) {
    return { hasPlan: false };
  }

  // Find the meal for this meal type
  const plannedMeal = todayPlan.meals.find((m) => m.mealType === mealType);
  if (!plannedMeal) {
    return { hasPlan: false };
  }

  const plannedKcal = plannedMeal.targetKcal;
  const difference = loggedCalories - plannedKcal;
  const percentDiff = Math.abs(difference / plannedKcal) * 100;

  // Only show comparison if difference > 20%
  if (percentDiff <= 20) {
    return {
      hasPlan: true,
      message: `\n\n✅ *In linea col piano!*\n_Previsto: ${plannedKcal} kcal_`,
    };
  }

  const mealTypeNames: Record<string, string> = {
    BREAKFAST: 'colazione',
    LUNCH: 'pranzo',
    SNACK: 'spuntino',
    DINNER: 'cena',
  };

  const sign = difference > 0 ? '+' : '';
  const emoji = difference > 0 ? '⚠️' : '📉';

  let message = `\n\n${emoji} *Confronto piano*\n`;
  message += `_Oggi a ${mealTypeNames[mealType]}: ${plannedMeal.description}_\n`;
  message += `Previsto: *${plannedKcal} kcal*\n`;
  message += `Inserito: *${loggedCalories} kcal* (${sign}${difference} kcal)`;

  return { hasPlan: true, message };
};
