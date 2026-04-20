import { Bot, InlineKeyboard } from 'grammy';
import type { MyContext } from '../../../types.js';
import type { PrismaClient } from '@prisma/client';
import { createComplianceService } from '../../../lib/complianceService.js';

export const complianceCommand = (bot: Bot<MyContext>, db: PrismaClient) => {
  const service = createComplianceService(db);

  // /compliance - show inline keyboard
  bot.command('compliance', async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text('Piano OK ✓', 'compliance_full')
      .text('Deviazioni ⚠️', 'compliance_partial')
      .text('Off day ✕', 'compliance_off');

    const today = new Date().toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    await ctx.reply(
      `Come e' andata oggi (${today})?\n\nScegli lo status per il piano alimentare:`,
      { reply_markup: keyboard }
    );
  });

  // Callback: FULL
  bot.callbackQuery('compliance_full', async (ctx) => {
    await ctx.answerCallbackQuery();
    try {
      const compliance = await service.upsertCompliance({ status: 'FULL' });
      const { streak } = await service.getStreak();
      const streakMsg = streak > 1 ? ` Streak: ${streak} giorni FULL consecutivi!` : '';
      await ctx.editMessageText(
        `Piano rispettato al 100% - registrato.\n\nContinua cosi'.${streakMsg}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore sconosciuto';
      await ctx.editMessageText(`Errore durante il salvataggio: ${message}`);
    }
  });

  // Callback: OFF
  bot.callbackQuery('compliance_off', async (ctx) => {
    await ctx.answerCallbackQuery();
    try {
      await service.upsertCompliance({ status: 'OFF' });
      await ctx.editMessageText(
        `Giornata off-plan registrata.\n\nCapita - si riparte domani.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore sconosciuto';
      await ctx.editMessageText(`Errore durante il salvataggio: ${message}`);
    }
  });

  // Callback: PARTIAL -> chiedi deviazioni
  bot.callbackQuery('compliance_partial', async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.waitingFor = 'compliance_deviations';
    await ctx.editMessageText(
      `Deviazioni minori registrate.\n\nDescrivimi cosa e' andato diversamente dal piano (es. "cena: brace + 2 gelati"):`
    );
  });
};
