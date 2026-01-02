import type { MyContext } from '../../../types.js';
import type { MealType, PrismaClient } from '@prisma/client';

import logger from '../../../lib/logger.js';
import { analyzeFoodImage } from '../../../lib/ai-services.js';
import { showMainMenu } from '../../../menus/main-menu.js';
import { mealDescriptionProcessor } from '../../callbacks/meal-menu/services/meal-description-processor.js';

/**
 * Handle photo messages for meal logging
 * Flow: photo → GPT-4 Vision analysis → meal processing
 */
export const photoMealHandler = async (ctx: MyContext, db: PrismaClient) => {
  if (!ctx.message || !ctx.message.photo) {
    return;
  }

  if (!ctx.session.mealType) {
    await ctx.reply(
      '📸 Ho ricevuto una foto! Per favore, prima seleziona il tipo di pasto dal menu.'
    );
    return;
  }

  if (!ctx.from) {
    await ctx.reply('Non riesco a identificare l\'utente.');
    return;
  }

  const mealType = ctx.session.mealType as MealType;
  const userId = ctx.from.id.toString();

  ctx.session.waitingFor = undefined;
  ctx.session.mealType = undefined;

  try {
    await ctx.reply('📸 Sto analizzando la foto del tuo pasto...');

    // Get the largest photo (last in array)
    const photos = ctx.message.photo;
    const largestPhoto = photos[photos.length - 1];

    // Get photo file from Telegram
    const file = await ctx.api.getFile(largestPhoto.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;

    // Analyze image with GPT-4 Vision
    const foodDescription = await analyzeFoodImage(fileUrl);

    if (!foodDescription || foodDescription.trim().length === 0) {
      await ctx.reply('❌ Non sono riuscito a riconoscere il cibo nella foto. Riprova con una foto più chiara.');
      await showMainMenu(ctx);
      return;
    }

    await ctx.reply(`🍽️ Ho riconosciuto: "${foodDescription}"\n\n🔍 Calcolo i valori nutrizionali...`);

    // Process the recognized food description
    const nutritionMessage = await mealDescriptionProcessor({
      db,
      mealDescription: foodDescription,
      mealType,
      userId,
    });

    await ctx.reply(nutritionMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error processing photo meal for user ${userId}: ${errorMessage}`, error);
    await ctx.reply(
      '❌ Si è verificato un errore nell\'analisi della foto. Riprova più tardi.'
    );
  } finally {
    await showMainMenu(ctx);
  }
};
