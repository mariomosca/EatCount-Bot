import { getOpenaiClient } from '../../../../lib/openai-client.js';
import logger from '../../../../lib/logger.js';
import type { ProcessingResult } from './ai-description-processing.js';
import type { ApiFaildFood, ValidFoodsData } from './nutrition-fatsecret-data.js';
import type { FoodDetails } from '../../../../lib/fatsecret-client.js';

const openai = getOpenaiClient();

interface AiNutritionEstimate {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbohydrate: number;
  fiber: number;
  sugar: number;
  saturated_fat: number;
  sodium: number;
}

interface AiNutritionResponse {
  items: AiNutritionEstimate[];
}

const nutritionPrompt = `You are a nutrition expert. Estimate the nutritional values for the given foods PER 100 GRAMS.
Return a JSON object with the following structure:
{
  "items": [
    {
      "name": "food name",
      "calories": number (kcal per 100g),
      "protein": number (grams per 100g),
      "fat": number (grams per 100g),
      "carbohydrate": number (grams per 100g),
      "fiber": number (grams per 100g),
      "sugar": number (grams per 100g),
      "saturated_fat": number (grams per 100g),
      "sodium": number (mg per 100g)
    }
  ]
}

Be accurate and use standard nutritional reference values. If uncertain, provide conservative estimates based on similar foods.
IMPORTANT: Always return values PER 100 GRAMS, regardless of the actual portion size mentioned.`;

/**
 * Uses AI to estimate nutrition data for foods that FatSecret couldn't find.
 * This is a fallback mechanism when the FatSecret API is unavailable or returns no results.
 */
export const aiNutritionEstimation = async (
  failedFoods: ApiFaildFood[]
): Promise<{
  estimatedFoods: ValidFoodsData[];
  stillFailedFoods: ApiFaildFood[];
}> => {
  if (failedFoods.length === 0) {
    return { estimatedFoods: [], stillFailedFoods: [] };
  }

  try {
    const foodQueries = failedFoods.map(
      (f) => `${f.food.name} (${f.food.weight}g)`
    );

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: nutritionPrompt,
        },
        {
          role: 'user',
          content: `Estimate nutrition for these foods (per 100g): ${foodQueries.join(', ')}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from AI nutrition estimation');
    }

    const parsedResponse = JSON.parse(content) as AiNutritionResponse;

    // Map AI estimates back to ValidFoodsData format
    const estimatedFoods: ValidFoodsData[] = failedFoods.map((failedFood, index) => {
      const estimate = parsedResponse.items[index];

      if (!estimate) {
        throw new Error(`Missing estimate for food at index ${index}`);
      }

      // Create a FoodDetails-compatible structure
      const foodDetails: FoodDetails = {
        food_id: `ai-estimate-${Date.now()}-${index}`,
        food_name: failedFood.food.name,
        food_type: 'AI Estimate',
        food_description: 'AI-estimated nutrition values',
        servings: {
          serving: [
            {
              serving_id: Date.now() + index,
              serving_description: '100 g',
              serving_url: '',
              metric_serving_amount: 100,
              metric_serving_unit: 'g',
              number_of_units: 100,
              measurement_description: 'g',
              calories: estimate.calories,
              carbohydrate: estimate.carbohydrate,
              protein: estimate.protein,
              fat: estimate.fat,
              saturated_fat: estimate.saturated_fat,
              polyunsaturated_fat: 0,
              monounsaturated_fat: 0,
              cholesterol: 0,
              sodium: estimate.sodium,
              potassium: 0,
              fiber: estimate.fiber,
              sugar: estimate.sugar,
              vitamin_a: 0,
              vitamin_c: 0,
              calcium: 0,
              iron: 0,
            },
          ],
        },
      };

      return {
        foodDetails,
        processedFood: failedFood.food,
      };
    });

    logger.info(
      `AI nutrition estimation successful for ${estimatedFoods.length} foods`
    );

    return {
      estimatedFoods,
      stillFailedFoods: [],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error(`AI nutrition estimation failed: ${errorMessage}`, error);

    // Return all foods as still failed
    return {
      estimatedFoods: [],
      stillFailedFoods: failedFoods,
    };
  }
};
