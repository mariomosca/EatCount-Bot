import { Bot } from 'grammy';
import type { MyContext } from '../../types.js';
import type { PrismaClient } from '@prisma/client';

import { mealDescription } from './meal/meal-description.js';
import { calorieTargetHandler } from './settings/calorie-target.js';
import { editMealDescriptionHandler } from './meal/edit-meal-description.js';
import { voiceMealHandler } from './meal/voice-meal.js';
import { photoMealHandler } from './meal/photo-meal.js';
import { showMealTypeConfirmation } from '../../menus/meal-menu.js';
import { detectMealType } from '../callbacks/meal-menu/helpers/ai-meal-type-detection.js';
import logger from '../../lib/logger.js';

export const registerMassages = (bot: Bot<MyContext>, db: PrismaClient) => {
  const handlers: Record<string, (ctx: MyContext) => Promise<void>> = {
    calorie_target: async (ctx) => await calorieTargetHandler(ctx, db),
    meal_description: async (ctx) => await mealDescription(ctx, db),
    meal_edit_description: async (ctx) =>
      await editMealDescriptionHandler(ctx, db),
  };

  // Text messages - original handler
  bot.on('message:text', async (ctx, next) => {
    const waitingFor = ctx.session.waitingFor as string | undefined;
    const handler = waitingFor ? handlers[waitingFor] : undefined;

    if (handler) {
      await handler(ctx);
    } else {
      // If user sends text without being in a waitingFor state,
      // assume it's a meal description
      const text = ctx.message?.text?.trim();
      if (text && text.length > 3) {
        // Save the description for later use
        ctx.session.pendingMealDescription = text;

        try {
          // Use AI to detect meal type from message + time of day
          const currentHour = new Date().getHours();
          const detection = await detectMealType(text, currentHour);

          logger.info(
            `Detected meal type: ${detection.detectedType} (${detection.confidence})`
          );

          // Show confirmation with detected type
          await showMealTypeConfirmation(
            ctx,
            detection.detectedType,
            detection.confidence
          );
        } catch (error) {
          logger.error('Error detecting meal type:', error);
          // Fallback to time-based suggestion
          const hour = new Date().getHours();
          let fallbackType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
          if (hour >= 5 && hour < 11) fallbackType = 'BREAKFAST';
          else if (hour >= 11 && hour < 15) fallbackType = 'LUNCH';
          else if (hour >= 15 && hour < 19) fallbackType = 'SNACK';
          else fallbackType = 'DINNER';

          await showMealTypeConfirmation(ctx, fallbackType, 'low');
        }
      } else {
        await next();
      }
    }
  });

  // Voice messages - Whisper transcription
  bot.on('message:voice', async (ctx) => {
    await voiceMealHandler(ctx, db);
  });

  // Photo messages - GPT-4 Vision analysis
  bot.on('message:photo', async (ctx) => {
    await photoMealHandler(ctx, db);
  });
};
