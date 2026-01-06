import { InlineKeyboard } from 'grammy';
import type { MyContext } from '../types.js';

export const showMainMenu = async (ctx: MyContext) => {
  const keyboard = new InlineKeyboard()
    .text('🍴 Aggiungi pasto', 'add_meal')
    .row()
    .text('📋 Piano Nutrizionale', 'nutrition_plan_menu')
    .row()
    .text('📊 Statistiche', 'statistics')
    .row()
    .text('🔄 Modifica', 'edit_meals')
    .row()
    .text('⚙️ Impostazioni', 'settings')
    .row()
    .text('🚀 Statistiche avanzate', 'go_to_site');

  await ctx.reply('Menu principale:', { reply_markup: keyboard });
};
