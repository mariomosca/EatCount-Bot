import { Bot } from 'grammy';
import type { MyContext } from '../../../types.js';
import { APP_VERSION } from '../../../api/index.js';

export const versionCommand = (bot: Bot<MyContext>) => {
  bot.command('version', async (ctx) => {
    const message = `*EatCount Bot*
Version: \`${APP_VERSION}\`
Build: ${new Date().toISOString().split('T')[0]}

_Powered by GPT-4o Vision_`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  });
};
