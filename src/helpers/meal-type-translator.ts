import type { MealType } from '@prisma/client';

export function translateMealType(mealType: MealType): string {
  const translations: Record<MealType, string> = {
    BREAKFAST: 'Colazione',
    LUNCH: 'Pranzo',
    DINNER: 'Cena',
    SNACK: 'Spuntino',
  };

  return translations[mealType] || 'Altro';
}

// Alias for backward compatibility
export const translateMealTypeToUkrainian = translateMealType;
