import { InlineKeyboard } from 'grammy';
import type { MyContext } from '../types.js';
import type { Meal, MealType } from '@prisma/client';
import { translateMealType } from '../helpers/meal-type-translator.js';
import { DateTime } from 'luxon';

const formatMealDate = (date: Date): string => {
  return DateTime.fromJSDate(date)
    .setZone('Europe/Rome')
    .setLocale('it')
    .toFormat('dd.MM.yyyy HH:mm');
};

export const showEditMealsMenu = async (ctx: MyContext) => {
  const keyboard = new InlineKeyboard()
    .text('🕒 Pasti di oggi', 'edit_today_meals')
    .row()
    .text('📜 Pasti recenti', 'edit_recent_meals')
    .row()
    .text('↩️ Menu principale', 'back_to_main_menu');

  await ctx.reply('Seleziona quali pasti vuoi modificare:', {
    reply_markup: keyboard,
  });
};

export const showMealsList = async (
  ctx: MyContext,
  meals: Meal[],
  page: number = 0,
  isLastPage: boolean = false
) => {
  if (meals.length === 0) {
    const keyboard = new InlineKeyboard().text(
      '↩️ Menu modifica',
      'back_to_edit_menu'
    );

    await ctx.reply('Nessun pasto trovato', { reply_markup: keyboard });
    return;
  }

  const ITEMS_PER_PAGE = 10;
  const startIdx = page * ITEMS_PER_PAGE;
  const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, meals.length);
  const currentMeals = meals.slice(startIdx, endIdx);

  const keyboard = new InlineKeyboard();

  for (const meal of currentMeals) {
    const mealDate = formatMealDate(meal.timestamp);
    const mealType = translateMealType(meal.type as MealType);
    const mealDescription = meal.description || 'Senza descrizione';
    keyboard
      .text(
        `${mealType}: ${mealDate} ${mealDescription}`,
        `edit_meal_${meal.id}`
      )
      .row();
  }

  if (page > 0 || !isLastPage) {
    if (page > 0) {
      keyboard.text('⬅️ Precedente', `prev_page_${page - 1}`);
    }

    if (!isLastPage) {
      keyboard.text('Successiva ➡️', `next_page_${page + 1}`);
    }

    keyboard.row();
  }

  keyboard.text('↩️ Menu modifica', 'back_to_edit_menu');

  await ctx.reply(
    `Seleziona un pasto da modificare (pagina ${page + 1}):`,
    { reply_markup: keyboard }
  );
};

export const showEditMealMenu = async (ctx: MyContext, meal: Meal) => {
  const mealDate = formatMealDate(meal.timestamp);
  const mealType = translateMealType(meal.type as MealType);

  const keyboard = new InlineKeyboard()
    .text('✏️ Modifica descrizione', `edit_description_${meal.id}`)
    .row()
    .text('🔄 Cambia tipo', `change_type_${meal.id}`)
    .row()
    .text('🗑️ Elimina pasto', `delete_meal_${meal.id}`)
    .row()
    .text('↩️ Torna alla lista', 'back_to_meals_list');

  await ctx.reply(
    `Modifica pasto:\n${mealType}, ${mealDate}\n"${meal.description}"`,
    { reply_markup: keyboard }
  );
};

export const showChangeMealTypeMenu = async (
  ctx: MyContext,
  mealId: string
) => {
  const keyboard = new InlineKeyboard()
    .text('🍳 Colazione', `set_type_BREAKFAST_${mealId}`)
    .row()
    .text('🍝 Pranzo', `set_type_LUNCH_${mealId}`)
    .row()
    .text('🍽️ Cena', `set_type_DINNER_${mealId}`)
    .row()
    .text('🍌 Spuntino', `set_type_SNACK_${mealId}`)
    .row()
    .text('↩️ Indietro', `back_to_edit_meal_${mealId}`);

  await ctx.reply('Seleziona il nuovo tipo di pasto:', { reply_markup: keyboard });
};

export const confirmMealDeletion = async (ctx: MyContext, mealId: string) => {
  const keyboard = new InlineKeyboard()
    .text('✅ Sì, elimina', `confirm_delete_meal_${mealId}`)
    .row()
    .text('❌ No, annulla', `back_to_edit_meal_${mealId}`);

  await ctx.reply(
    `Sei sicuro di voler eliminare questo pasto? L'azione non può essere annullata.`,
    { reply_markup: keyboard }
  );
};
