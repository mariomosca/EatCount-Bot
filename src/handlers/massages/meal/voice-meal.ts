import type { MyContext } from '../../../types.js';
import type { MealType, PrismaClient } from '@prisma/client';
import { Bot } from 'grammy';

import logger from '../../../lib/logger.js';
import { transcribeAudio } from '../../../lib/ai-services.js';
import { showMainMenu } from '../../../menus/main-menu.js';
import { mealDescriptionProcessor } from '../../callbacks/meal-menu/services/meal-description-processor.js';

/**
 * Handle voice messages for meal logging
 * Flow: voice → Whisper transcription → meal processing
 */
export const voiceMealHandler = async (ctx: MyContext, db: PrismaClient) => {
  if (!ctx.message || !ctx.message.voice) {
    return;
  }

  if (!ctx.session.mealType) {
    await ctx.reply(
      '🎤 Ho ricevuto un audio! Per favore, prima seleziona il tipo di pasto dal menu.'
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
    await ctx.reply('🎤 Sto trascrivendo il tuo messaggio vocale...');

    // Get voice file from Telegram
    const file = await ctx.api.getFile(ctx.message.voice.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;

    // Download the audio file
    const response = await fetch(fileUrl);
    const audioBuffer = Buffer.from(await response.arrayBuffer());

    // Transcribe with Whisper
    const transcribedText = await transcribeAudio(audioBuffer, 'voice.ogg');

    if (!transcribedText || transcribedText.trim().length === 0) {
      await ctx.reply('❌ Non sono riuscito a capire l\'audio. Riprova parlando più chiaramente.');
      await showMainMenu(ctx);
      return;
    }

    await ctx.reply(`📝 Ho capito: "${transcribedText}"\n\n🔍 Analizzo il pasto...`);

    // Process the transcribed meal description
    const nutritionMessage = await mealDescriptionProcessor({
      db,
      mealDescription: transcribedText,
      mealType,
      userId,
    });

    await ctx.reply(nutritionMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error processing voice meal for user ${userId}: ${errorMessage}`, error);
    await ctx.reply(
      '❌ Si è verificato un errore nell\'elaborazione del messaggio vocale. Riprova più tardi.'
    );
  } finally {
    await showMainMenu(ctx);
  }
};
