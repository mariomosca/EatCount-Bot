import type { MyContext } from '../../../types.js';
import type { PrismaClient } from '@prisma/client';
import logger from '../../../lib/logger.js';
import { parseNutritionPlanPDF } from '../../../lib/ai-services.js';
import { showMainMenu } from '../../../menus/main-menu.js';

export const pdfPlanHandler = async (ctx: MyContext, db: PrismaClient) => {
  if (!ctx.message || !ctx.message.document) return;

  if (!ctx.from?.id) {
    await ctx.reply('Utente non identificato.');
    return;
  }

  const userId = ctx.from.id.toString();
  ctx.session.waitingFor = undefined;

  try {
    // Validate it's a PDF
    if (ctx.message.document.mime_type !== 'application/pdf') {
      await ctx.reply('Per favore invia un file PDF.');
      await showMainMenu(ctx);
      return;
    }

    await ctx.reply('Sto analizzando il piano nutrizionale...');

    // Download file from Telegram
    const file = await ctx.api.getFile(ctx.message.document.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;
    const response = await fetch(fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    logger.info(`[NutritionPlan]: Downloaded PDF ${ctx.message.document.file_name} (${buffer.length} bytes)`);

    // Parse PDF with AI
    const parsed = await parseNutritionPlanPDF(buffer, ctx.message.document.file_name || 'plan.pdf');

    // Get user from DB
    const user = await db.user.findUnique({
      where: { telegramId: userId },
    });

    if (!user) {
      await ctx.reply('Utente non trovato nel database.');
      await showMainMenu(ctx);
      return;
    }

    // Delete existing plan (only one allowed)
    await db.nutritionPlan.deleteMany({
      where: { userId: user.id },
    });

    // Create new plan with nested data
    await db.nutritionPlan.create({
      data: {
        userId: user.id,
        name: parsed.name,
        days: {
          create: parsed.days.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            meals: {
              create: day.meals.map((meal) => ({
                mealType: meal.mealType,
                targetKcal: meal.targetKcal,
                description: meal.description,
                details: meal.details,
              })),
            },
          })),
        },
      },
    });

    // Success message with summary
    const totalMeals = parsed.days.reduce((sum, d) => sum + d.meals.length, 0);
    await ctx.reply(
      `Piano "${parsed.name}" caricato con successo!\n\n` +
        `${parsed.days.length} giorni, ${totalMeals} pasti totali.`,
      { parse_mode: 'Markdown' }
    );

    logger.info(`[NutritionPlan]: Saved plan "${parsed.name}" for user ${userId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    logger.error(`[NutritionPlan]: Error processing PDF for user ${userId}:`, error);
    await ctx.reply(`Errore nell'analisi del piano: ${errorMessage}`);
  } finally {
    await showMainMenu(ctx);
  }
};
