import { Bot } from 'grammy';
import type { MyContext } from '../../../types.js';
import type { PrismaClient } from '@prisma/client/extension';

import logger from '../../../lib/logger.js';
import { getUserFromDb } from '../../../helpers/get-user-from-db.js';
import { showMainMenu } from '../../../menus/main-menu.js';
import { showSettingsMenu } from '../../../menus/settings-menu.js';

export const calorieTargetHandler = async (
  ctx: MyContext,
  db: PrismaClient
) => {
  if (!ctx.message || !ctx.message.text || !ctx.from || !ctx.from.id) {
    return;
  }

  const inputText = ctx.message.text.trim();
  const userId = ctx.from.id.toString();

  ctx.session.waitingFor = undefined;

  const calorieTarget = parseInt(inputText);

  if (isNaN(calorieTarget)) {
    await ctx.reply(
      'Per favore inserisci un numero valido per l\'obiettivo calorico, oppure 0 per rimuoverlo.'
    );
    await showSettingsMenu(ctx);
    return;
  }

  if (calorieTarget < 0) {
    await ctx.reply(
      'Per favore inserisci un numero positivo per l\'obiettivo calorico, oppure 0 per rimuoverlo.'
    );
    await showSettingsMenu(ctx);
    return;
  }

  if (calorieTarget > 10000) {
    await ctx.reply(
      'Il valore è troppo alto. Per favore inserisci un valore realistico (max 10000 kcal).'
    );
    await showSettingsMenu(ctx);
    return;
  }

  if (calorieTarget === 0) {
    try {
      const user = await getUserFromDb(userId, db);

      const existingTarget = await db.target.findUnique({
        where: { userId: user.id },
      });

      if (existingTarget) {
        await db.target.delete({
          where: { userId: user.id },
        });

        await ctx.reply('✅ Obiettivo calorico rimosso con successo.');
      } else {
        await ctx.reply('Non hai un obiettivo calorico impostato.');
      }

      await showMainMenu(ctx);
      return;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Errore sconosciuto';
      logger.error(
        `Error deleting calorie target for user ${userId}: ${errorMessage}`,
        error
      );
      await ctx.reply(
        'Si è verificato un errore. Riprova più tardi.'
      );
      await showMainMenu(ctx);
      return;
    }
  }

  try {
    const user = await getUserFromDb(userId, db);

    await db.target.upsert({
      where: {
        userId: user.id,
      },
      update: {
        calorieTarget,
      },
      create: {
        userId: user.id,
        calorieTarget,
      },
    });

    await ctx.reply(
      `✅ Obiettivo calorico impostato a ${calorieTarget} kcal al giorno.`
    );
    await showMainMenu(ctx);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Errore sconosciuto';
    logger.error(
      `Error setting calorie target for user ${userId}: ${errorMessage}`,
      error
    );
    await ctx.reply(
      'Si è verificato un errore. Riprova più tardi.'
    );
    await showMainMenu(ctx);
  }
};
