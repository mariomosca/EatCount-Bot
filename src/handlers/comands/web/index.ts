import { Bot } from 'grammy';
import type { MyContext } from '../../../types.js';
import { config } from '../../../../envconfig.js';

export const webCommand = (bot: Bot<MyContext>) => {
  bot.command('web', async (ctx) => {
    const message = `*Pannello web DietLogger*

${config.web.panelUrl}

Da qui puoi vedere dashboard, history, target e gestire la compliance per pasto.`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
    });
  });
};
