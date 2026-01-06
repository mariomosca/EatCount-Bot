import { InlineKeyboard } from 'grammy';
import type { MyContext } from '../types.js';
import type { NutritionPlanMeal } from '@prisma/client';

export const showNutritionPlanMenu = async (ctx: MyContext, hasPlan: boolean) => {
  const keyboard = new InlineKeyboard();

  if (hasPlan) {
    keyboard
      .text('📖 Vedi Oggi', 'view_today_plan')
      .row()
      .text('📅 Vedi Settimana', 'view_week_plan')
      .row()
      .text('🗑️ Elimina Piano', 'delete_nutrition_plan')
      .row();
  } else {
    keyboard.text('📤 Carica Piano (PDF)', 'upload_nutrition_plan').row();
  }

  keyboard.text('↩️ Menu principale', 'back_to_main_menu');

  const message = hasPlan
    ? '📋 *Piano Nutrizionale*\n\nHai un piano attivo. Cosa vuoi fare?'
    : '📋 *Piano Nutrizionale*\n\nNessun piano caricato. Carica un PDF per iniziare.';

  await ctx.reply(message, { reply_markup: keyboard, parse_mode: 'Markdown' });
};

export const showTodayPlan = async (
  ctx: MyContext,
  dayName: string,
  meals: NutritionPlanMeal[]
) => {
  const mealTypeNames: Record<string, string> = {
    BREAKFAST: '🍳 Colazione',
    LUNCH: '🍝 Pranzo',
    SNACK: '🍎 Spuntino',
    DINNER: '🍽️ Cena',
  };

  const mealOrder = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'];
  const sortedMeals = [...meals].sort(
    (a, b) => mealOrder.indexOf(a.mealType) - mealOrder.indexOf(b.mealType)
  );

  let message = `📋 *Piano di ${dayName}*\n\n`;

  for (const meal of sortedMeals) {
    message += `${mealTypeNames[meal.mealType]} *(${meal.targetKcal} kcal)*\n`;
    message += `${meal.description}\n`;
    if (meal.details) {
      message += `_${meal.details}_\n`;
    }
    message += '\n';
  }

  const totalKcal = meals.reduce((sum, m) => sum + m.targetKcal, 0);
  message += `📊 *Totale: ${totalKcal} kcal*`;

  const keyboard = new InlineKeyboard()
    .text('📅 Settimana', 'view_week_plan')
    .row()
    .text('↩️ Indietro', 'nutrition_plan_menu');

  await ctx.reply(message, { reply_markup: keyboard, parse_mode: 'Markdown' });
};

export const showWeekPlan = async (
  ctx: MyContext,
  planName: string,
  days: { dayOfWeek: number; meals: NutritionPlanMeal[] }[]
) => {
  const dayNames = ['', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  let message = `📋 *${planName}*\n\n`;

  const sortedDays = [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  for (const day of sortedDays) {
    const totalKcal = day.meals.reduce((sum, m) => sum + m.targetKcal, 0);
    message += `*${dayNames[day.dayOfWeek]}*: ${totalKcal} kcal\n`;
  }

  const keyboard = new InlineKeyboard()
    .text('📖 Oggi', 'view_today_plan')
    .row()
    .text('↩️ Indietro', 'nutrition_plan_menu');

  await ctx.reply(message, { reply_markup: keyboard, parse_mode: 'Markdown' });
};

export const showDeleteConfirmation = async (ctx: MyContext) => {
  const keyboard = new InlineKeyboard()
    .text('✅ Conferma', 'confirm_delete_plan')
    .text('❌ Annulla', 'nutrition_plan_menu');

  await ctx.reply('Sei sicuro di voler eliminare il piano nutrizionale?', {
    reply_markup: keyboard,
  });
};

export const askForPdfUpload = async (ctx: MyContext) => {
  const keyboard = new InlineKeyboard().text('❌ Annulla', 'nutrition_plan_menu');

  await ctx.reply(
    '📤 Inviami il PDF del tuo piano nutrizionale.\n\n_Il piano verra analizzato automaticamente._',
    { reply_markup: keyboard, parse_mode: 'Markdown' }
  );
};
