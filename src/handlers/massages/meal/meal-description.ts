import { Bot } from 'grammy';
import type { MyContext } from '../../../types.js';
import type { MealType, PrismaClient } from '@prisma/client';

import logger from '../../../lib/logger.js';
import { showMainMenu } from '../../../menus/main-menu.js';
import { mealDescriptionProcessor } from '../../callbacks/meal-menu/services/meal-description-processor.js';

export const mealDescription = async (ctx: MyContext, db: PrismaClient) => {
  if (!ctx.message || !ctx.message.text) {
    return;
  }

  if (!ctx.session.mealType) {
    await ctx.reply(
      'Per favore, prima seleziona il tipo di pasto dal menu.'
    );
  }

  if (!ctx.from) {
    await ctx.reply('Non riesco a identificare l\'utente.');
    return;
  }

  const mealDescription = ctx.message.text;
  const mealType = ctx.session.mealType as MealType;

  const userId = ctx.from.id.toString();

  ctx.session.waitingFor = undefined;
  ctx.session.mealType = undefined;

  try {
    await ctx.reply('Sto analizzando il tuo pasto, attendi...');

    const nutritionMessage = await mealDescriptionProcessor({
      db,
      mealDescription,
      mealType,
      userId,
    });

    await ctx.reply(nutritionMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      `Error processing meal description for user ${userId}: ${errorMessage}`,
      error
    );
    await ctx.reply(
      'Si è verificato un errore nell\'elaborazione del pasto. Riprova più tardi.'
    );
  } finally {
    await showMainMenu(ctx);
  }
};
