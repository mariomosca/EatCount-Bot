import { Hono } from 'hono';
import type { Bot } from 'grammy';
import type { PrismaClient } from '@prisma/client';
import { InlineKeyboard } from 'grammy';
import type { MyContext } from '../../types.js';
import { createComplianceService } from '../../lib/complianceService.js';
import logger from '../../lib/logger.js';

const MARIO_TELEGRAM_ID = '179533089';

export const createDebugRoutes = (db: PrismaClient, bot: Bot<MyContext>) => {
  const app = new Hono();

  // POST /api/debug/trigger-reminder - run the 20:00 cron logic on-demand
  app.post('/trigger-reminder', async (c) => {
    try {
      const service = createComplianceService(db);
      const fullyLogged = await service.isTodayFullyLogged();

      if (fullyLogged) {
        logger.info('[Debug]: trigger-reminder skipped (today fully logged)');
        return c.json({ sent: false, reason: 'today fully logged' });
      }

      const keyboard = new InlineKeyboard()
        .text('Piano OK ✓', 'compliance_full')
        .row()
        .text('Per pasto ⚙️', 'compliance_per_meal')
        .row()
        .text('Off day ✕', 'compliance_off');

      await bot.api.sendMessage(
        MARIO_TELEGRAM_ID,
        '[TEST] Reminder: non tutti i pasti di oggi sono stati registrati.\n\nCome e\' andata con il piano alimentare?',
        { reply_markup: keyboard }
      );

      logger.info('[Debug]: trigger-reminder sent');
      return c.json({ sent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[Debug]: trigger-reminder failed', { error });
      return c.json({ error: message }, 500);
    }
  });

  return app;
};
