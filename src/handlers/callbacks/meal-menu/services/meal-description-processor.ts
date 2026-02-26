import type { MealType } from '@prisma/client';
import type { PrismaClient } from '@prisma/client/extension';

import { config } from '../../../../../envconfig.js';
import { mocFoods, mocUsage } from '../data/moc.js';

import { getUserFromDb } from '../../../../helpers/get-user-from-db.js';
import { processAiDescription } from '../helpers/ai-description-processing.js';
import { fatSecretDbProcessor } from '../helpers/fatsecret-db-processor.js';
import { formatAnswer } from '../helpers/format-answer.js';
import { multiSourceNutritionLookup } from '../helpers/nutrition-multi-source.js';
import { writeToDb } from '../helpers/write-meal-to-db.js';
import { compareWithPlan } from '../helpers/compare-with-plan.js';
import logger from '../../../../lib/logger.js';

const manualDisableMoc = true;
const isMoc = config.server.nodeEnv === 'development' && !manualDisableMoc;

interface MealDescriptionProcessorParams {
  db: PrismaClient;
  mealDescription: string;
  mealType: MealType;
  userId: string;
}

export const mealDescriptionProcessor = async ({
  db,
  mealDescription,
  mealType,
  userId,
}: MealDescriptionProcessorParams): Promise<string> => {
  const user = await getUserFromDb(userId, db);

  const { processedFoods, usage } = isMoc
    ? { processedFoods: mocFoods, usage: mocUsage }
    : await processAiDescription({
        query: mealDescription,
      });

  logger.info(`Processed foods: ${JSON.stringify(processedFoods, null, 2)}`);

  // Multi-source nutrition lookup (CREA -> OpenFoodFacts -> FatSecret -> AI)
  const { validFoods, failedFoods, sources } =
    await multiSourceNutritionLookup(processedFoods);

  logger.info(
    `Nutrition sources: CREA=${sources.crea}, OFF=${sources.off}, FatSecret=${sources.fatSecret}, AI=${sources.ai}`
  );

  const preparedForDb = fatSecretDbProcessor(validFoods, mealType);

  const nutritionMessage = formatAnswer(preparedForDb, failedFoods);

  await writeToDb({
    db,
    meal: preparedForDb,
    user,
    failedFoods,
    aiApiUsage: usage,
  });

  // Calculate total calories for plan comparison
  const totalCalories = preparedForDb.reduce(
    (sum, item) => sum + item.meal.totalCalories,
    0
  );

  // Compare with nutrition plan (if exists)
  const comparison = await compareWithPlan({
    db,
    userId,
    mealType,
    loggedCalories: Math.round(totalCalories),
  });

  // Append comparison message if user has a plan
  if (comparison.hasPlan && comparison.message) {
    return nutritionMessage + comparison.message;
  }

  return nutritionMessage;
};
