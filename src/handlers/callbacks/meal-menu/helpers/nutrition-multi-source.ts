import { searchCreaDb, creaToValidFood } from '../../../../lib/crea-lookup.js';
import { searchOpenFoodFacts } from '../../../../lib/openfoodfacts-client.js';
import { nutritionFatsecret } from './nutrition-fatsecret-data.js';
import { aiNutritionEstimation } from './ai-nutrition-estimation.js';
import type { ProcessingResult } from './ai-description-processing.js';
import type { ValidFoodsData, ApiFaildFood } from './nutrition-fatsecret-data.js';
import logger from '../../../../lib/logger.js';

interface LookupSources {
  crea: number;
  off: number;
  fatSecret: number;
  ai: number;
}

interface MultiSourceResult {
  validFoods: ValidFoodsData[];
  failedFoods: ApiFaildFood[];
  sources: LookupSources;
}

export async function multiSourceNutritionLookup(
  processedFoods: ProcessingResult[]
): Promise<MultiSourceResult> {
  const allValidFoods: ValidFoodsData[] = [];
  const sources: LookupSources = { crea: 0, off: 0, fatSecret: 0, ai: 0 };
  let remaining: ProcessingResult[] = [...processedFoods];

  logger.info(`[MultiSource] Starting lookup for ${processedFoods.length} foods`);

  // Tier 1: CREA local DB
  const creaFound: ValidFoodsData[] = [];
  const creaNotFound: ProcessingResult[] = [];

  for (const food of remaining) {
    const match = searchCreaDb(food.name) || searchCreaDb(food.query);
    if (match) {
      creaFound.push(creaToValidFood(match, food));
    } else {
      creaNotFound.push(food);
    }
  }

  allValidFoods.push(...creaFound);
  sources.crea = creaFound.length;
  remaining = creaNotFound;

  logger.info(
    `[MultiSource] Tier 1 (CREA): ${creaFound.length} found, ${creaNotFound.length} remaining`
  );

  // Tier 2: OpenFoodFacts
  if (remaining.length > 0) {
    const offFound: ValidFoodsData[] = [];
    const offNotFound: ProcessingResult[] = [];

    for (const food of remaining) {
      const result = await searchOpenFoodFacts(food.query, food);
      if (result) {
        offFound.push(result);
      } else {
        offNotFound.push(food);
      }
    }

    allValidFoods.push(...offFound);
    sources.off = offFound.length;
    remaining = offNotFound;

    logger.info(
      `[MultiSource] Tier 2 (OFF): ${offFound.length} found, ${offNotFound.length} remaining`
    );
  }

  // Tier 3: FatSecret (existing)
  if (remaining.length > 0) {
    const { validFoods: fsValid, failedFoods: fsFailed } =
      await nutritionFatsecret(remaining);

    allValidFoods.push(...fsValid);
    sources.fatSecret = fsValid.length;
    remaining = fsFailed.map((f) => f.food);

    logger.info(
      `[MultiSource] Tier 3 (FatSecret): ${fsValid.length} found, ${fsFailed.length} remaining`
    );
  }

  // Tier 4: AI estimation (last resort)
  let finalFailed: ApiFaildFood[] = [];

  if (remaining.length > 0) {
    const wrappedForAi: ApiFaildFood[] = remaining.map((food) => ({
      food,
      error: 'Not found in CREA, OpenFoodFacts, or FatSecret',
    }));

    const { estimatedFoods, stillFailedFoods } =
      await aiNutritionEstimation(wrappedForAi);

    allValidFoods.push(...estimatedFoods);
    sources.ai = estimatedFoods.length;
    finalFailed = stillFailedFoods;

    logger.info(
      `[MultiSource] Tier 4 (AI): ${estimatedFoods.length} estimated, ${stillFailedFoods.length} still failed`
    );
  }

  logger.info(
    `[MultiSource] Complete: ${allValidFoods.length} valid, ${finalFailed.length} failed | Sources: CREA=${sources.crea}, OFF=${sources.off}, FS=${sources.fatSecret}, AI=${sources.ai}`
  );

  return {
    validFoods: allValidFoods,
    failedFoods: finalFailed,
    sources,
  };
}
