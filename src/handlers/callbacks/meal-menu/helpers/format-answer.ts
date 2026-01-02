import type { ApiFaildFood } from './nutrition-fatsecret-data.js';
import type { preparedForDb } from './fatsecret-db-processor.js';

export const formatAnswer = (
  preparedForDb: preparedForDb[],
  failedFoods: ApiFaildFood[]
) => {
  const failed = failedFoods || [];

  let totalCalories = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;
  let itemsText = '';

  preparedForDb.forEach(({ meal, items }) => {
    totalCalories += meal.totalCalories;
    totalProtein += meal.totalProtein;
    totalFat += meal.totalFat;
    totalCarbs += meal.totalCarbs;

    if (items.length > 0) {
      items.forEach((item) => {
        itemsText += `- ${meal.description} (${item.amountGrams.toFixed(
          1
        )}g): ${item.calories.toFixed(1)} kcal\n`;
      });
    }
  });

  totalCalories = parseFloat(totalCalories.toFixed(1));
  totalProtein = parseFloat(totalProtein.toFixed(1));
  totalFat = parseFloat(totalFat.toFixed(1));
  totalCarbs = parseFloat(totalCarbs.toFixed(1));

  const notice =
    '_Nota: Questa è una stima approssimativa dei valori nutrizionali, che potrebbe differire dai valori effettivi._';

  let failedItemsText = '';
  if (failed.length > 0) {
    failedItemsText = `\n\n⚠️ Non è stato possibile ottenere i dati per i seguenti alimenti:
${failed
  .map((item) => `- ${item.food.name} (${item.food.weight} g)`)
  .join('\n')}`;
  }

  let macroDetails = `Calorie: ${totalCalories} kcal\nProteine: ${totalProtein} g\nGrassi: ${totalFat} g\nCarboidrati: ${totalCarbs} g`;

  let mealTypeText = '';
  let mealEmoji = '';

  if (preparedForDb.length > 0) {
    const mealType = preparedForDb[0].meal.type;
    switch (mealType) {
      case 'BREAKFAST':
        mealTypeText = 'colazione';
        mealEmoji = '🍳';
        break;
      case 'LUNCH':
        mealTypeText = 'pranzo';
        mealEmoji = '🍝';
        break;
      case 'DINNER':
        mealTypeText = 'cena';
        mealEmoji = '🍽️ ';
        break;
      case 'SNACK':
        mealTypeText = 'spuntino';
        mealEmoji = '🍌';
        break;
    }
  }

  return `${mealEmoji} Pasto: ${mealTypeText}

✅ Abbiamo riconosciuto:
${itemsText}${failedItemsText}

📊 Riepilogo:
${macroDetails}

${notice}`;
};
