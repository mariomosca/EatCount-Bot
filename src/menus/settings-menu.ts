import { InlineKeyboard } from 'grammy';
import type { MyContext } from '../types.js';

export const showSettingsMenu = async (ctx: MyContext) => {
  const keyboard = new InlineKeyboard()
    .text('🎯 Obiettivo calorie', 'set_calorie_target')
    .row()
    .text('↩️ Menu principale', 'back_to_main_menu');

  await ctx.reply('Impostazioni:', { reply_markup: keyboard });
};
