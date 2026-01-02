import type { MyContext } from '../../../types.js';
import type { PrismaClient } from '@prisma/client/extension';

import logger from '../../../lib/logger.js';
import { handleEditMeal } from '../../callbacks/edit-meals-menu/services/edit-meal-service.js';

export const editMealDescriptionHandler = async (
  ctx: MyContext,
  db: PrismaClient
) => {
  if (!ctx.message || !ctx.message.text || !ctx.from || !ctx.from.id) {
    return;
  }

  const newDescription = ctx.message.text.trim();
  const userId = ctx.from.id.toString();
  const mealId = ctx.session.editMealId;

  ctx.session.waitingFor = undefined;

  if (!mealId) {
    await ctx.reply('Errore: pasto non trovato per la modifica');
    return;
  }

  try {
    await db.meal.updateMany({
      where: {
        id: mealId,
        user: {
          telegramId: userId,
        },
      },
      data: {
        description: newDescription,
      },
    });

    await ctx.reply('✅ Descrizione del pasto aggiornata con successo');

    await handleEditMeal(ctx, db, mealId);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Errore sconosciuto';
    logger.error(
      `Error updating meal description for user ${userId}: ${errorMessage}`,
      error
    );
    await ctx.reply(
      'Si è verificato un errore nell\'aggiornamento. Riprova più tardi.'
    );
  }
};
