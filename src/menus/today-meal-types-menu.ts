import { InlineKeyboard } from 'grammy';
import type { MyContext } from '../types.js';
import type { MealType } from '@prisma/client';
import { translateMealType } from '../helpers/meal-type-translator.js';

export const showTodayMealTypes = async (
  ctx: MyContext,
  mealTypes: MealType[]
) => {
  if (mealTypes.length === 0) {
    const keyboard = new InlineKeyboard().text(
      '↩️ Menu modifica',
      'back_to_edit_menu'
    );

    await ctx.reply('Oggi non hai ancora aggiunto pasti', {
      reply_markup: keyboard,
    });
    return;
  }

  const keyboard = new InlineKeyboard();

  mealTypes.forEach((mealType) => {
    const translatedType = translateMealType(mealType);
    keyboard
      .text(
        `${getEmojiForMealType(mealType)} ${translatedType}`,
        `edit_today_${mealType}`
      )
      .row();
  });

  keyboard.text('↩️ Menu modifica', 'back_to_edit_menu');

  await ctx.reply('Seleziona il tipo di pasto da modificare:', {
    reply_markup: keyboard,
  });
};

function getEmojiForMealType(mealType: MealType): string {
  switch (mealType) {
    case 'BREAKFAST':
      return '🍳';
    case 'LUNCH':
      return '🍝';
    case 'DINNER':
      return '🍽️';
    case 'SNACK':
      return '🍌';
    default:
      return '🍴';
  }
}
