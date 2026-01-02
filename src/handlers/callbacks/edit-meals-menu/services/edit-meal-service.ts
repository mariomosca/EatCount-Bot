import type { MyContext } from '../../../../types.js';
import type { PrismaClient, MealType } from '@prisma/client';

import {
  getTodayRange,
  getWeekAgoDate,
} from '../../statistics-menu/helpers/get-time-ranges.js';
import {
  showMealsList,
  showEditMealMenu,
  showChangeMealTypeMenu,
  confirmMealDeletion,
  showEditMealsMenu,
} from '../../../../menus/edit-meals-menu.js';
import { showTodayMealTypes } from '../../../../menus/today-meal-types-menu.js';
import logger from '../../../../lib/logger.js';

export const showTodayMeals = async (ctx: MyContext, db: PrismaClient) => {
  const userId = ctx.from?.id.toString();
  if (!userId) {
    logger.error('[EDIT MEALS] User ID not found in context');
    throw new Error('[EDIT MEALS] User ID not found');
  }

  const { startOfDay, endOfDay } = getTodayRange();

  const todaysMeals = await db.meal.findMany({
    where: {
      user: {
        telegramId: userId,
      },
      timestamp: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
    select: {
      type: true,
    },
    distinct: ['type'],
    orderBy: {
      type: 'asc',
    },
  });

  const mealTypes = todaysMeals.map((meal) => meal.type);

  await showTodayMealTypes(ctx, mealTypes);
};

export const showWeekMeals = async (ctx: MyContext, db: PrismaClient) => {
  const userId = ctx.from?.id.toString();
  if (!userId) {
    logger.error('[EDIT MEALS] User ID not found in context');
    throw new Error('[EDIT MEALS] User ID not found');
  }

  const weekAgo = getWeekAgoDate();

  const meals = await db.meal.findMany({
    where: {
      user: {
        telegramId: userId,
      },
      timestamp: {
        gte: weekAgo,
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
  });

  const page = ctx.session.editPage || 0;
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(meals.length / ITEMS_PER_PAGE);
  const isLastPage = page >= totalPages - 1;

  await showMealsList(ctx, meals, page, isLastPage);
};

export const handleEditMeal = async (
  ctx: MyContext,
  db: PrismaClient,
  mealId: string
) => {
  const userId = ctx.from?.id.toString();
  if (!userId) {
    logger.error('[EDIT MEALS] User ID not found in context');
    throw new Error('[EDIT MEALS] User ID not found');
  }

  try {
    const meal = await db.meal.findUnique({
      where: {
        id: mealId,
        user: {
          telegramId: userId,
        },
      },
    });

    if (!meal) {
      await ctx.reply('Pasto non trovato');
      return;
    }

    ctx.session.editMealId = mealId;
    await showEditMealMenu(ctx, meal);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Errore sconosciuto';
    logger.error(`Error getting meal for editing: ${errorMessage}`, error);
    await ctx.reply(
      'Si è verificato un errore nel recupero dei dati. Per favore, riprova più tardi.'
    );
  }
};

export const handleChangeMealType = async (ctx: MyContext, mealId: string) => {
  await showChangeMealTypeMenu(ctx, mealId);
};

export const handleSetMealType = async (
  ctx: MyContext,
  db: PrismaClient,
  mealType: string,
  mealId: string
) => {
  const userId = ctx.from?.id.toString();
  if (!userId) {
    logger.error('[EDIT MEALS] User ID not found in context');
    throw new Error('[EDIT MEALS] User ID not found');
  }

  try {
    const updatedMeal = await db.meal.update({
      where: {
        id: mealId,
        user: {
          telegramId: userId,
        },
      },
      data: {
        type: mealType as MealType,
      },
    });

    await ctx.reply(`✅ Tipo di pasto modificato con successo in ${mealType}`);
    await handleEditMeal(ctx, db, mealId);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Errore sconosciuto';
    logger.error(`Error updating meal type: ${errorMessage}`, error);
    await ctx.reply(
      'Si è verificato un errore nell\'aggiornamento del tipo. Per favore, riprova più tardi.'
    );
  }
};

export const handleDeleteMeal = async (ctx: MyContext, mealId: string) => {
  const userId = ctx.from?.id.toString();
  if (!userId) {
    logger.error('[EDIT MEALS] User ID not found in context');
    throw new Error('[EDIT MEALS] User ID not found');
  }

  try {
    await confirmMealDeletion(ctx, mealId);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Errore sconosciuto';
    logger.error(`Error preparing meal deletion: ${errorMessage}`, error);
    await ctx.reply('Si è verificato un errore. Per favore, riprova più tardi.');
  }
};

export const handleConfirmDeleteMeal = async (
  ctx: MyContext,
  db: PrismaClient,
  mealId: string
) => {
  const userId = ctx.from?.id.toString();
  if (!userId) {
    logger.error('[EDIT MEALS] User ID not found in context');
    throw new Error('[EDIT MEALS] User ID not found');
  }

  try {
    await db.meal.delete({
      where: {
        id: mealId,
        user: {
          telegramId: userId,
        },
      },
    });

    await ctx.reply('✅ Pasto eliminato con successo');
    await handleBackToMealsList(ctx);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Errore sconosciuto';
    logger.error(`Error deleting meal: ${errorMessage}`, error);
    await ctx.reply(
      'Si è verificato un errore nell\'eliminazione del pasto. Per favore, riprova più tardi.'
    );
  }
};

export const handleEditMealDescription = async (
  ctx: MyContext,
  db: PrismaClient,
  mealId: string
) => {
  const userId = ctx.from?.id.toString();
  if (!userId) {
    logger.error('[EDIT MEALS] User ID not found in context');
    throw new Error('[EDIT MEALS] User ID not found');
  }

  try {
    await ctx.reply('Per favore, inserisci la nuova descrizione del pasto:');

    ctx.session.editMealId = mealId;
    ctx.session.waitingFor = 'meal_edit_description';
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Errore sconosciuto';
    logger.error(`Error preparing description editing: ${errorMessage}`, error);
    await ctx.reply('Si è verificato un errore. Per favore, riprova più tardi.');
  }
};

export const handleBackToMealsList = async (ctx: MyContext) => {
  ctx.session.editMealId = undefined;
  await showEditMealsMenu(ctx);
};
