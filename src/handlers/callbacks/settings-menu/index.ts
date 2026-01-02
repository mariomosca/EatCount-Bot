import { Bot } from 'grammy';
import type { MyContext } from '../../../types.js';
import type { PrismaClient } from '@prisma/client/extension';
import { showMainMenu } from '../../../menus/main-menu.js';
import { getUserFromDb } from '../../../helpers/get-user-from-db.js';
import logger from '../../../lib/logger.js';

export const settingsMenuCallbacks = (
  bot: Bot<MyContext>,
  db: PrismaClient
) => {
  bot.callbackQuery('set_calorie_target', async (ctx) => {
    await ctx.answerCallbackQuery();
    await askForCaloriesTarget(ctx, db);
  });
};

const askForCaloriesTarget = async (ctx: MyContext, db: PrismaClient) => {
  if (!ctx.from || !ctx.from.id) {
    throw new Error('User ID not found in context');
  }

  const userId = ctx.from.id.toString();

  try {
    const user = await getUserFromDb(userId, db);

    const existingTarget = await db.target.findFirst({
      where: { userId: user.id },
    });

    let message;

    if (existingTarget) {
      message = `Il tuo obiettivo attuale: ${existingTarget.calorieTarget} kcal al giorno.\nPer modificare l'obiettivo, inserisci un nuovo valore.\nPer rimuovere l'obiettivo, inserisci 0.`;
    } else {
      message =
        'Per impostare un obiettivo calorico giornaliero, inserisci il numero di calorie desiderato (es: 2000).\nPer annullare, inserisci 0.';
    }

    ctx.session.waitingFor = 'calorie_target';

    await ctx.reply(message);
  } catch (error) {
    logger.error(`Error fetching user settings for user ${userId}:`, error);
    await ctx.reply(
      'Si è verificato un errore nel recupero delle impostazioni. Riprova.'
    );
    await showMainMenu(ctx);
  }
};
