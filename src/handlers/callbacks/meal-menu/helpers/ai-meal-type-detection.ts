import { getOpenaiClient } from '../../../../lib/openai-client.js';
import logger from '../../../../lib/logger.js';
import type { MealType } from '@prisma/client';

const openai = getOpenaiClient();

interface MealTypeDetectionResult {
  detectedType: MealType;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

const mealTypePrompt = `You are a meal type classifier. Analyze the user's message and determine what type of meal they are describing.

Meal types:
- BREAKFAST (colazione): morning meal, breakfast foods, coffee with pastries
- LUNCH (pranzo): midday meal, lunch
- DINNER (cena): evening meal, dinner
- SNACK (spuntino): snacks, small bites between meals

Look for keywords like:
- Italian: "colazione", "pranzo", "cena", "cenato", "pranzato", "spuntino", "merenda"
- English: "breakfast", "lunch", "dinner", "snack"
- Time references: "stamattina" (morning), "a mezzogiorno" (noon), "stasera" (evening)

Also consider the CURRENT TIME provided. If no clear indication from text:
- 05:00-10:30 → likely BREAKFAST
- 11:00-14:30 → likely LUNCH
- 15:00-18:00 → likely SNACK
- 18:30-22:00 → likely DINNER
- 22:00-05:00 → likely SNACK (late night)

Return JSON:
{
  "detectedType": "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
  "confidence": "high" | "medium" | "low",
  "reason": "brief explanation"
}

Confidence levels:
- high: explicit keyword found (e.g., "ho cenato", "a pranzo")
- medium: inferred from context or time
- low: pure guess based on time only`;

/**
 * Detects the meal type from user message using AI.
 * Uses both text analysis and time of day for inference.
 */
export const detectMealType = async (
  message: string,
  currentHour?: number
): Promise<MealTypeDetectionResult> => {
  const hour = currentHour ?? new Date().getHours();
  const timeContext = `Current time: ${hour}:00 (${getTimeDescription(hour)})`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: mealTypePrompt,
        },
        {
          role: 'user',
          content: `${timeContext}\n\nUser message: "${message}"`,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from AI');
    }

    const result = JSON.parse(content) as MealTypeDetectionResult;

    logger.info(
      `Meal type detection: ${result.detectedType} (${result.confidence}) - ${result.reason}`
    );

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Meal type detection failed: ${errorMessage}`, error);

    // Fallback to time-based detection
    return getTimeBasedMealType(hour);
  }
};

/**
 * Fallback: determine meal type based on time of day only.
 */
const getTimeBasedMealType = (hour: number): MealTypeDetectionResult => {
  if (hour >= 5 && hour < 11) {
    return {
      detectedType: 'BREAKFAST',
      confidence: 'low',
      reason: 'Basato sull\'ora (mattina)',
    };
  } else if (hour >= 11 && hour < 15) {
    return {
      detectedType: 'LUNCH',
      confidence: 'low',
      reason: 'Basato sull\'ora (mezzogiorno)',
    };
  } else if (hour >= 15 && hour < 19) {
    return {
      detectedType: 'SNACK',
      confidence: 'low',
      reason: 'Basato sull\'ora (pomeriggio)',
    };
  } else if (hour >= 19 && hour < 23) {
    return {
      detectedType: 'DINNER',
      confidence: 'low',
      reason: 'Basato sull\'ora (sera)',
    };
  } else {
    return {
      detectedType: 'SNACK',
      confidence: 'low',
      reason: 'Basato sull\'ora (notte)',
    };
  }
};

const getTimeDescription = (hour: number): string => {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

/**
 * Get Italian name for meal type
 */
export const getMealTypeLabel = (type: MealType): string => {
  switch (type) {
    case 'BREAKFAST':
      return 'Colazione';
    case 'LUNCH':
      return 'Pranzo';
    case 'DINNER':
      return 'Cena';
    case 'SNACK':
      return 'Spuntino';
  }
};
