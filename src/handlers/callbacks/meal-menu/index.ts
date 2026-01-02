import { Bot } from 'grammy';
import type { MyContext } from '../../../types.js';
import type { MealType, PrismaClient } from '@prisma/client';
import { mealDescriptionProcessor } from './services/meal-description-processor.js';
import { showMainMenu } from '../../../menus/main-menu.js';
import logger from '../../../lib/logger.js';

export const mealMenuCallbacks = (bot: Bot<MyContext>, db: PrismaClient) => {
  // Original meal type selection (from menu)
  bot.callbackQuery('BREAKFAST', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleMealTypeSelection(ctx, db, 'BREAKFAST');
  });

  bot.callbackQuery('LUNCH', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleMealTypeSelection(ctx, db, 'LUNCH');
  });

  bot.callbackQuery('DINNER', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleMealTypeSelection(ctx, db, 'DINNER');
  });

  bot.callbackQuery('SNACK', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleMealTypeSelection(ctx, db, 'SNACK');
  });

  // Confirmation callbacks (from AI-detected meal type)
  bot.callbackQuery('confirm_meal_BREAKFAST', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleMealTypeSelection(ctx, db, 'BREAKFAST');
  });

  bot.callbackQuery('confirm_meal_LUNCH', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleMealTypeSelection(ctx, db, 'LUNCH');
  });

  bot.callbackQuery('confirm_meal_DINNER', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleMealTypeSelection(ctx, db, 'DINNER');
  });

  bot.callbackQuery('confirm_meal_SNACK', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleMealTypeSelection(ctx, db, 'SNACK');
  });

  // user's meal description was registered in meal-description.ts
};

const handleMealTypeSelection = async (
  ctx: MyContext,
  db: PrismaClient,
  mealType: MealType
) => {
  // Check if there's a pending description from initial message
  const pendingDescription = ctx.session.pendingMealDescription;

  if (pendingDescription && ctx.from) {
    // Process the meal directly with the pending description
    ctx.session.pendingMealDescription = undefined;

    const userId = ctx.from.id.toString();

    try {
      await ctx.reply('Sto analizzando il tuo pasto, attendi...');

      const nutritionMessage = await mealDescriptionProcessor({
        db,
        mealDescription: pendingDescription,
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
  } else {
    // No pending description, ask for it
    await askForMealDescription(ctx, mealType);
  }
};

const askForMealDescription = async (ctx: MyContext, mealType: MealType) => {
  let mealTypeText;
  switch (mealType) {
    case 'BREAKFAST':
      mealTypeText = 'Colazione';
      break;
    case 'LUNCH':
      mealTypeText = 'Pranzo';
      break;
    case 'DINNER':
      mealTypeText = 'Cena';
      break;
    case 'SNACK':
      mealTypeText = 'Spuntino';
      break;
  }

  ctx.session.waitingFor = 'meal_description';
  ctx.session.mealType = mealType;

  await ctx.reply(
    `Per favore, descrivi in dettaglio cosa hai mangiato a ${mealTypeText.toLowerCase()}:`
  );
};
