import type { MyContext } from '../../../types.js';
import type { PrismaClient } from '@prisma/client';

import logger from '../../../lib/logger.js';
import { analyzeFoodImage } from '../../../lib/ai-services.js';
import { showMealTypeConfirmation } from '../../../menus/meal-menu.js';
import { detectMealType } from '../../callbacks/meal-menu/helpers/ai-meal-type-detection.js';

/**
 * Handle photo messages for meal logging
 * Flow: photo → GPT-4 Vision analysis → AI meal type detection → confirm → process
 * Same flow as text messages for consistency
 */
export const photoMealHandler = async (ctx: MyContext, _db: PrismaClient) => {
  if (!ctx.message || !ctx.message.photo) {
    return;
  }

  if (!ctx.from) {
    await ctx.reply('Non riesco a identificare l\'utente.');
    return;
  }

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
      return;
    }

    // Combine image analysis with caption if present
    const caption = ctx.message.caption?.trim() || '';
    const fullDescription = caption
      ? `${foodDescription} (${caption})`
      : foodDescription;

    // Show what was recognized
    await ctx.reply(`🍽️ Ho riconosciuto: "${foodDescription}"${caption ? `\n📝 Caption: "${caption}"` : ''}`);

    // Save description for later processing (same as text flow)
    ctx.session.pendingMealDescription = fullDescription;

    // Detect meal type using AI (from food description + caption + time)
    const currentHour = new Date().getHours();
    const detectionInput = caption || foodDescription;
    const detection = await detectMealType(detectionInput, currentHour);

    logger.info(
      `Photo meal type detection: ${detection.detectedType} (${detection.confidence})`
    );

    // Show confirmation menu (same as text flow)
    await showMealTypeConfirmation(
      ctx,
      detection.detectedType,
      detection.confidence
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error analyzing photo: ${errorMessage}`, error);
    await ctx.reply(
      '❌ Si è verificato un errore nell\'analisi della foto. Riprova più tardi.'
    );
  }
};
