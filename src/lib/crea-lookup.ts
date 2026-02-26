import creaFoodsData from '../data/crea-foods.json' with { type: 'json' };
import type { FoodDetails, Serving } from './fatsecret-client.js';
import type { ProcessingResult } from '../handlers/callbacks/meal-menu/helpers/ai-description-processing.js';
import type { ValidFoodsData } from '../handlers/callbacks/meal-menu/helpers/nutrition-fatsecret-data.js';

interface CreaFood {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  sugar: number;
  saturatedFat: number;
  sodium: number;
}

const creaFoods: CreaFood[] = creaFoodsData;

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

interface FoodMatch {
  food: CreaFood;
  score: number;
}

export function searchCreaDb(query: string): CreaFood | null {
  if (!query) return null;

  const normalizedQuery = normalizeString(query);
  const queryWords = normalizedQuery.split(/\s+/).filter((w) => w.length > 2);

  if (queryWords.length === 0) return null;

  const matches: FoodMatch[] = [];

  for (const food of creaFoods) {
    const normalizedName = normalizeString(food.name);
    const nameWords = normalizedName.split(/\s+/);

    let score = 0;

    const allQueryWordsFound = queryWords.every((qw) =>
      nameWords.some((nw) => nw.includes(qw) || qw.includes(nw))
    );

    if (allQueryWordsFound) {
      score += 10;
    }

    const anyQueryWordFound = queryWords.some((qw) =>
      nameWords.some((nw) => nw.includes(qw) || qw.includes(nw))
    );

    if (anyQueryWordFound && !allQueryWordsFound) {
      score += 5;
    }

    if (queryWords.length > 0 && nameWords.length > 0) {
      const firstQueryWord = queryWords[0];
      const firstNameWord = nameWords[0];

      if (firstNameWord === firstQueryWord || firstNameWord.startsWith(firstQueryWord)) {
        score += 3;
      }
    }

    const missingWords = queryWords.filter(
      (qw) => !nameWords.some((nw) => nw.includes(qw) || qw.includes(nw))
    );
    score -= missingWords.length * 2;

    if (score >= 8) {
      matches.push({ food, score });
    }
  }

  if (matches.length === 0) return null;

  matches.sort((a, b) => b.score - a.score);
  return matches[0].food;
}

export function creaToValidFood(
  creaFood: CreaFood,
  processedFood: ProcessingResult
): ValidFoodsData {
  const serving: Serving = {
    serving_id: 0,
    serving_description: '100 g',
    serving_url: '',
    metric_serving_amount: 100,
    metric_serving_unit: 'g',
    number_of_units: 100,
    measurement_description: 'g',
    calories: creaFood.calories,
    carbohydrate: creaFood.carbs,
    protein: creaFood.protein,
    fat: creaFood.fat,
    saturated_fat: creaFood.saturatedFat,
    polyunsaturated_fat: 0,
    monounsaturated_fat: 0,
    cholesterol: 0,
    sodium: creaFood.sodium,
    potassium: 0,
    fiber: creaFood.fiber,
    sugar: creaFood.sugar,
    vitamin_a: 0,
    vitamin_c: 0,
    calcium: 0,
    iron: 0,
  };

  const foodDetails: FoodDetails = {
    food_id: `crea-${creaFood.name.toLowerCase().replace(/\s+/g, '-')}`,
    food_name: creaFood.name,
    food_type: 'CREA',
    food_description: `CREA Italian Food DB - ${creaFood.name}`,
    servings: { serving: [serving] },
  };

  return { foodDetails, processedFood };
}
