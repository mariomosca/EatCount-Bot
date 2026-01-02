import { InlineKeyboard } from 'grammy';
import type { MyContext } from '../types.js';

export const showStatisticsMenu = async (ctx: MyContext) => {
  const keyboard = new InlineKeyboard()
    .text('📅 Oggi', 'stats_tooday')
    .row()
    .text('📆 Questa settimana', 'stats_this_week')
    .row()
    .text('📆 Settimana scorsa', 'stats_last_week')
    .row()
    .text('↩️ Menu principale', 'back_to_main_menu');

  await ctx.reply('Seleziona il periodo:', { reply_markup: keyboard });
};
