import { InlineKeyboard } from 'grammy';
import type { MyContext } from '../types.js';
import type { MealType } from '@prisma/client';

const mealTypeEmoji: Record<MealType, string> = {
  BREAKFAST: '🍳',
  LUNCH: '🍝',
  DINNER: '🍽️',
  SNACK: '🍌',
};

const mealTypeLabel: Record<MealType, string> = {
  BREAKFAST: 'Colazione',
  LUNCH: 'Pranzo',
  DINNER: 'Cena',
  SNACK: 'Spuntino',
};

export const showMealTypesMenu = async (ctx: MyContext) => {
  const keyboard = new InlineKeyboard()
    .text('🍳 Colazione', 'BREAKFAST')
    .row()
    .text('🍝 Pranzo', 'LUNCH')
    .row()
    .text('🍽️ Cena', 'DINNER')
    .row()
    .text('🍌 Spuntino', 'SNACK')
    .row()
    .text('↩️ Menu principale', 'back_to_main_menu');

  await ctx.reply('Seleziona il tipo di pasto:', { reply_markup: keyboard });
};

/**
 * Shows a confirmation menu for AI-detected meal type.
 * User can confirm or change the suggested type.
 */
export const showMealTypeConfirmation = async (
  ctx: MyContext,
  suggestedType: MealType,
  confidence: 'high' | 'medium' | 'low'
) => {
  const emoji = mealTypeEmoji[suggestedType];
  const label = mealTypeLabel[suggestedType];

  // Build keyboard with confirm button and alternatives
  const keyboard = new InlineKeyboard()
    .text(`✅ Conferma ${emoji} ${label}`, `confirm_meal_${suggestedType}`)
    .row();

  // Add other meal types as alternatives
  const otherTypes = (['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as MealType[]).filter(
    (t) => t !== suggestedType
  );

  otherTypes.forEach((type) => {
    keyboard.text(`${mealTypeEmoji[type]} ${mealTypeLabel[type]}`, `confirm_meal_${type}`);
  });

  keyboard.row().text('❌ Annulla', 'back_to_main_menu');

  const confidenceText =
    confidence === 'high'
      ? ''
      : confidence === 'medium'
      ? ' (probabile)'
      : ' (suggerito in base all\'ora)';

  await ctx.reply(
    `${emoji} Ho capito: *${label}*${confidenceText}\n\nConfermi o vuoi cambiare?`,
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    }
  );
};
