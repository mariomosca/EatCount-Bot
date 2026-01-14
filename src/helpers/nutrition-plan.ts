import type { PrismaClient } from '@prisma/client';
import type { ParsedNutritionPlan } from '../lib/ai-services.js';
import logger from '../lib/logger.js';

/**
 * Save or replace nutrition plan in database
 * Deletes existing plan and creates new one (one plan per user)
 */
export const saveParsedPlan = async (
  db: PrismaClient,
  userId: string,
  parsed: ParsedNutritionPlan
): Promise<void> => {
  // Delete existing plan (only one allowed per user)
  await db.nutritionPlan.deleteMany({
    where: { userId },
  });

  // Create new plan with nested data
  await db.nutritionPlan.create({
    data: {
      userId,
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
  });

  logger.info(`[NutritionPlan]: Saved plan "${parsed.name}" for user ${userId}`);
};

/**
 * Update single meal in nutrition plan
 */
export const updatePlanMeal = async (
  db: PrismaClient,
  mealId: string,
  updates: {
    targetKcal?: number;
    description?: string;
    details?: string | null;
  }
): Promise<void> => {
  await db.nutritionPlanMeal.update({
    where: { id: mealId },
    data: updates,
  });

  logger.info(`[NutritionPlan]: Updated meal ${mealId}`);
};

/**
 * Update all meals for a specific day
 */
export const updatePlanDay = async (
  db: PrismaClient,
  userId: string,
  dayOfWeek: number,
  meals: Array<{
    mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
    targetKcal: number;
    description: string;
    details: string | null;
  }>
): Promise<void> => {
  // Find the plan and day
  const plan = await db.nutritionPlan.findUnique({
    where: { userId },
    include: {
      days: {
        where: { dayOfWeek },
        include: { meals: true },
      },
    },
  });

  if (!plan || plan.days.length === 0) {
    throw new Error(`No plan found for user ${userId} or day ${dayOfWeek} not found`);
  }

  const day = plan.days[0];

  // Delete existing meals for this day
  await db.nutritionPlanMeal.deleteMany({
    where: { dayId: day.id },
  });

  // Create new meals
  await db.nutritionPlanMeal.createMany({
    data: meals.map((meal) => ({
      dayId: day.id,
      ...meal,
    })),
  });

  logger.info(`[NutritionPlan]: Updated day ${dayOfWeek} for user ${userId}`);
};

/**
 * Delete nutrition plan for user
 */
export const deletePlan = async (
  db: PrismaClient,
  userId: string
): Promise<void> => {
  await db.nutritionPlan.deleteMany({
    where: { userId },
  });

  logger.info(`[NutritionPlan]: Deleted plan for user ${userId}`);
};
