import { Bot } from 'grammy';
import cron from 'node-cron';
import type { MyContext } from './types.js';

import logger, { botRequestLogger, botErrorLogger } from './lib/logger.js';
import { initDb } from './lib/db.js';
import { createComplianceService } from './lib/complianceService.js';

import { registerMiddlewares } from './middlewares/index.js';
import { registerCommands } from './handlers/comands/index.js';
import { registerMassages } from './handlers/massages/index.js';
import { registerKeyboardsCallbacks } from './handlers/callbacks/index.js';

const MARIO_TELEGRAM_ID = '179533089';

export const startTelegramBot = async (token: string, db = initDb()) => {
  const bot = new Bot<MyContext>(token);

  botRequestLogger(bot);

  registerMiddlewares(bot);
  registerCommands(bot, db);
  registerMassages(bot, db);
  registerKeyboardsCallbacks(bot, db);

  try {
    await bot.api.setMyCommands([
      { command: 'start', description: 'Avvia il bot' },
      { command: 'meal', description: 'Registra un pasto' },
      { command: 'compliance', description: 'Feedback piano alimentare' },
      { command: 'version', description: 'Versione bot' },
    ]);
    logger.info('[Bot]: Commands menu registered');
  } catch (error) {
    logger.error('[Bot]: Failed to register commands menu', { error });
  }

  bot.catch((err) => {
    botErrorLogger(err);
  });

  // Daily compliance reminder at 20:00 Rome time
  cron.schedule(
    '0 20 * * *',
    async () => {
      try {
        const complianceService = createComplianceService(db);
        const fullyLogged = await complianceService.isTodayFullyLogged();

        if (!fullyLogged) {
          logger.info('[Cron]: Sending daily compliance reminder (not all meals logged)');
          const { InlineKeyboard } = await import('grammy');
          const keyboard = new InlineKeyboard()
            .text('Piano OK ✓', 'compliance_full')
            .row()
            .text('Per pasto ⚙️', 'compliance_per_meal')
            .row()
            .text('Off day ✕', 'compliance_off');

          await bot.api.sendMessage(
            MARIO_TELEGRAM_ID,
            'Reminder: non tutti i pasti di oggi sono stati registrati.\n\nCome e\' andata con il piano alimentare?',
            { reply_markup: keyboard }
          );
        } else {
          logger.info('[Cron]: All meals already logged today, skipping reminder');
        }
      } catch (error) {
        logger.error('[Cron]: Failed to send compliance reminder', { error });
      }
    },
    {
      timezone: 'Europe/Rome',
    }
  );

  logger.info('[Cron]: Daily compliance reminder scheduled at 20:00 Europe/Rome');

  try {
    bot.start({
      onStart: (botInfo) => {
        logger.info(`[Bot]: is running as ${botInfo.username}`);
      },
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: true,
    });
  } catch (error) {
    logger.error('[Bot]: Failed to start', { error });
  }

  return bot;
};
