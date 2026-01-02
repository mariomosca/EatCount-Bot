import type { MealType } from '@prisma/client';
import type { PrismaClient } from '@prisma/client/extension';

import { config } from '../../../../../envconfig.js';
import { mocFoods, mocUsage } from '../data/moc.js';

import { getUserFromDb } from '../../../../helpers/get-user-from-db.js';
import { processAiDescription } from '../helpers/ai-description-processing.js';
import { fatSecretDbProcessor } from '../helpers/fatsecret-db-processor.js';
import { formatAnswer } from '../helpers/format-answer.js';
import { nutritionFatsecret } from '../helpers/nutrition-fatsecret-data.js';
import { aiNutritionEstimation } from '../helpers/ai-nutrition-estimation.js';
import { writeToDb } from '../helpers/write-meal-to-db.js';
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

  // Try FatSecret first
  let { validFoods, failedFoods } = await nutritionFatsecret(processedFoods);

  logger.info(`FatSecret results - valid: ${validFoods.length}, failed: ${failedFoods.length}`);

  // If FatSecret failed for some foods, use AI estimation as fallback
  if (failedFoods.length > 0) {
    logger.info(`Using AI fallback for ${failedFoods.length} foods`);
    const { estimatedFoods, stillFailedFoods } =
      await aiNutritionEstimation(failedFoods);

    // Add successfully estimated foods to validFoods
    validFoods = [...validFoods, ...estimatedFoods];
    failedFoods = stillFailedFoods;

    logger.info(
      `After AI fallback - valid: ${validFoods.length}, still failed: ${failedFoods.length}`
    );
  }

  const preparedForDb = fatSecretDbProcessor(validFoods, mealType);

  const nutritionMessage = formatAnswer(preparedForDb, failedFoods);

  await writeToDb({
    db,
    meal: preparedForDb,
    user,
    failedFoods,
    aiApiUsage: usage,
  });

  return nutritionMessage;
};
