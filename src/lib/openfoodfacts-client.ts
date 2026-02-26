import type { FoodDetails, Serving } from './fatsecret-client.js';
import type { ProcessingResult } from '../handlers/callbacks/meal-menu/helpers/ai-description-processing.js';
import type { ValidFoodsData } from '../handlers/callbacks/meal-menu/helpers/nutrition-fatsecret-data.js';
import logger from './logger.js';

// LRU Cache with max size to prevent unbounded memory growth
const MAX_CACHE_SIZE = 500;

class LRUCache<K, V> {
  private cache = new Map<K, V>();

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key)!;
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= MAX_CACHE_SIZE) {
      // Remove least recently used (first entry)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }
}

const cache = new LRUCache<string, ValidFoodsData | null>();

// Throttle with mutex to prevent race conditions
let lastRequestTime = 0;
let throttlePromise: Promise<void> | null = null;
const MIN_REQUEST_INTERVAL_MS = 6000;

interface OFFSearchResponse {
  count: number;
  products: OFFProduct[];
}

interface OFFProduct {
  product_name?: string;
  countries_tags?: string[];
  nutriments?: {
    'energy-kcal_100g'?: number;
    'proteins_100g'?: number;
    'fat_100g'?: number;
    'carbohydrates_100g'?: number;
    'fiber_100g'?: number;
    'sugars_100g'?: number;
    'saturated-fat_100g'?: number;
    'sodium_100g'?: number;
  };
}

interface OFFProductScore {
  product: OFFProduct;
  score: number;
}

async function throttle(): Promise<void> {
  // If already throttling, wait for that to complete (mutex)
  if (throttlePromise) {
    await throttlePromise;
    // After waiting, check again - another request might have started
    return throttle();
  }

  throttlePromise = (async () => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
      const waitTime = MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
      logger.debug(`[OFF] Throttling: waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    lastRequestTime = Date.now();
  })();

  try {
    await throttlePromise;
  } finally {
    throttlePromise = null;
  }
}

function hasValidNutriments(nutriments: OFFProduct['nutriments']): boolean {
  if (!nutriments) return false;

  const calories = nutriments['energy-kcal_100g'];
  const protein = nutriments['proteins_100g'];
  const fat = nutriments['fat_100g'];
  const carbs = nutriments['carbohydrates_100g'];

  return (
    calories !== undefined &&
    calories > 0 &&
    protein !== undefined &&
    protein > 0 &&
    fat !== undefined &&
    fat > 0 &&
    carbs !== undefined &&
    carbs > 0
  );
}

function scoreProduct(product: OFFProduct, queryWords: string[]): number {
  let score = 0;

  if (!product.product_name) return -1;

  if (!hasValidNutriments(product.nutriments)) {
    return -1;
  }

  const countries = product.countries_tags || [];
  if (countries.some((c) => c.toLowerCase().includes('italy'))) {
    score += 5;
  }

  const productName = product.product_name.toLowerCase();
  const matchingWords = queryWords.filter((qw) =>
    productName.includes(qw.toLowerCase())
  );

  if (matchingWords.length > 0) {
    score += 3;
  }

  return score;
}

function offToValidFood(
  product: OFFProduct,
  processedFood: ProcessingResult
): ValidFoodsData {
  const nutriments = product.nutriments!;

  const serving: Serving = {
    serving_id: 0,
    serving_description: '100 g',
    serving_url: '',
    metric_serving_amount: 100,
    metric_serving_unit: 'g',
    number_of_units: 100,
    measurement_description: 'g',
    calories: nutriments['energy-kcal_100g'] || 0,
    carbohydrate: nutriments['carbohydrates_100g'] || 0,
    protein: nutriments['proteins_100g'] || 0,
    fat: nutriments['fat_100g'] || 0,
    saturated_fat: nutriments['saturated-fat_100g'] || 0,
    polyunsaturated_fat: 0,
    monounsaturated_fat: 0,
    cholesterol: 0,
    sodium: nutriments['sodium_100g'] || 0,
    potassium: 0,
    fiber: nutriments['fiber_100g'] || 0,
    sugar: nutriments['sugars_100g'] || 0,
    vitamin_a: 0,
    vitamin_c: 0,
    calcium: 0,
    iron: 0,
  };

  const foodDetails: FoodDetails = {
    food_id: `off-${product.product_name!.toLowerCase().replace(/\s+/g, '-')}`,
    food_name: product.product_name!,
    food_type: 'OpenFoodFacts',
    food_description: `OpenFoodFacts - ${product.product_name}`,
    servings: { serving: [serving] },
  };

  return { foodDetails, processedFood };
}

export async function searchOpenFoodFacts(
  query: string,
  processedFood: ProcessingResult
): Promise<ValidFoodsData | null> {
  const cacheKey = query.toLowerCase();

  if (cache.has(cacheKey)) {
    logger.debug(`[OFF] Cache hit for "${query}"`);
    return cache.get(cacheKey)!;
  }

  await throttle();

  try {
    const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
    url.searchParams.set('search_terms', query);
    url.searchParams.set('search_simple', '1');
    url.searchParams.set('action', 'process');
    url.searchParams.set('json', '1');
    url.searchParams.set('page_size', '5');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'DietLogger/1.0 (github.com/mariomosca)',
      },
    });

    if (!response.ok) {
      logger.warn(`[OFF] Request failed: ${response.status} ${response.statusText}`);
      cache.set(cacheKey, null);
      return null;
    }

    const data = (await response.json()) as OFFSearchResponse;

    if (!data.products || data.products.length === 0) {
      logger.debug(`[OFF] No results for "${query}"`);
      cache.set(cacheKey, null);
      return null;
    }

    const queryWords = query.split(/\s+/).filter((w) => w.length > 2);

    const scoredProducts: OFFProductScore[] = data.products
      .map((product) => ({
        product,
        score: scoreProduct(product, queryWords),
      }))
      .filter((item) => item.score >= 0);

    if (scoredProducts.length === 0) {
      logger.debug(`[OFF] No valid products for "${query}"`);
      cache.set(cacheKey, null);
      return null;
    }

    scoredProducts.sort((a, b) => b.score - a.score);
    const bestProduct = scoredProducts[0].product;

    logger.info(`[OFF] Found "${bestProduct.product_name}" for query "${query}"`);

    const result = offToValidFood(bestProduct, processedFood);
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[OFF] Error searching for "${query}": ${errorMessage}`, error);
    cache.set(cacheKey, null);
    return null;
  }
}
