import { Bot } from 'grammy';
import type { MyContext } from '../../../types.js';
import type { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import logger from '../../../lib/logger.js';
import {
  showNutritionPlanMenu,
  showTodayPlan,
  showWeekPlan,
  showDeleteConfirmation,
  askForPdfUpload,
} from '../../../menus/nutrition-plan-menu.js';
import { showMainMenu } from '../../../menus/main-menu.js';

export const nutritionPlanMenuCallbacks = (bot: Bot<MyContext>, db: PrismaClient) => {
  // Open nutrition plan menu
  bot.callbackQuery('nutrition_plan_menu', async (ctx) => {
    await ctx.answerCallbackQuery();

    try {
      const user = await db.user.findUnique({
        where: { telegramId: ctx.from.id.toString() },
      });

      if (!user) {
        await ctx.reply('Utente non trovato.');
        return;
      }

      const plan = await db.nutritionPlan.findUnique({
        where: { userId: user.id },
      });

      await showNutritionPlanMenu(ctx, !!plan);
    } catch (error) {
      logger.error('Error showing nutrition plan menu:', error);
      await ctx.reply('Si e verificato un errore.');
    }
  });

  // Upload plan - ask for PDF
  bot.callbackQuery('upload_nutrition_plan', async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.waitingFor = 'nutrition_plan_pdf';
    await askForPdfUpload(ctx);
  });

  // View today's plan
  bot.callbackQuery('view_today_plan', async (ctx) => {
    await ctx.answerCallbackQuery();

    try {
      const user = await db.user.findUnique({
        where: { telegramId: ctx.from.id.toString() },
      });

      if (!user) {
        await ctx.reply('Utente non trovato.');
        return;
      }

      const plan = await db.nutritionPlan.findUnique({
        where: { userId: user.id },
        include: {
          days: {
            include: { meals: true },
          },
        },
      });

      if (!plan) {
        await ctx.reply('Nessun piano nutrizionale trovato.');
        return;
      }

      const now = DateTime.now().setZone('Europe/Rome');
      const dayOfWeek = now.weekday;
      const dayNames = ['', 'Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato', 'Domenica'];

      const today = plan.days.find((d) => d.dayOfWeek === dayOfWeek);

      if (!today) {
        await ctx.reply('Nessun piano per oggi.');
        return;
      }

      await showTodayPlan(ctx, dayNames[dayOfWeek], today.meals);
    } catch (error) {
      logger.error('Error viewing today plan:', error);
      await ctx.reply('Si e verificato un errore.');
    }
  });

  // View week plan
  bot.callbackQuery('view_week_plan', async (ctx) => {
    await ctx.answerCallbackQuery();

    try {
      const user = await db.user.findUnique({
        where: { telegramId: ctx.from.id.toString() },
      });

      if (!user) {
        await ctx.reply('Utente non trovato.');
        return;
      }

      const plan = await db.nutritionPlan.findUnique({
        where: { userId: user.id },
        include: {
          days: {
            include: { meals: true },
            orderBy: { dayOfWeek: 'asc' },
          },
        },
      });

      if (!plan) {
        await ctx.reply('Nessun piano nutrizionale trovato.');
        return;
      }

      await showWeekPlan(ctx, plan.name, plan.days);
    } catch (error) {
      logger.error('Error viewing week plan:', error);
      await ctx.reply('Si e verificato un errore.');
    }
  });

  // Delete plan - show confirmation
  bot.callbackQuery('delete_nutrition_plan', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showDeleteConfirmation(ctx);
  });

  // Confirm delete
  bot.callbackQuery('confirm_delete_plan', async (ctx) => {
    await ctx.answerCallbackQuery();

    try {
      const user = await db.user.findUnique({
        where: { telegramId: ctx.from.id.toString() },
      });

      if (!user) {
        await ctx.reply('Utente non trovato.');
        return;
      }

      await db.nutritionPlan.deleteMany({
        where: { userId: user.id },
      });

      await ctx.reply('Piano nutrizionale eliminato.');
      await showMainMenu(ctx);
    } catch (error) {
      logger.error('Error deleting plan:', error);
      await ctx.reply('Si e verificato un errore.');
    }
  });
};
