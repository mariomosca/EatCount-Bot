import { Bot, InlineKeyboard } from 'grammy';
import type { MyContext } from '../../../types.js';
import type { PrismaClient, MealSlot, ComplianceStatus } from '@prisma/client';
import {
  createComplianceService,
  MEAL_SLOTS,
  MEAL_SLOT_LABELS,
} from '../../../lib/complianceService.js';

type MealStatusMap = Partial<Record<MealSlot, ComplianceStatus>>;

const SHORT_LABELS: Record<MealSlot, string> = {
  BREAKFAST: 'Colaz.',
  MORNING_SNACK: 'Sp.AM',
  LUNCH: 'Pranzo',
  AFTERNOON_SNACK: 'Sp.PM',
  DINNER: 'Cena',
};

function statusIcon(status?: ComplianceStatus): string {
  if (status === 'FULL') return '✅';
  if (status === 'PARTIAL') return '⚠️';
  if (status === 'OFF') return '✕';
  return '⏸';
}

function buildMealBreakdownMessage(meals: MealStatusMap, dateLabel: string): string {
  const lines = MEAL_SLOTS.map(
    (slot) => `${statusIcon(meals[slot])} ${MEAL_SLOT_LABELS[slot]}`
  );
  return `Compliance per pasto (${dateLabel}):\n\n${lines.join('\n')}\n\nTocca i bottoni per aggiornare ogni pasto. Tocca "Fine" quando hai finito.`;
}

function buildMealKeyboard(meals: MealStatusMap): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const slot of MEAL_SLOTS) {
    const current = meals[slot];
    const fullLabel = `${SHORT_LABELS[slot]} ${current === 'FULL' ? '✅' : '✓'}`;
    const partialLabel = current === 'PARTIAL' ? '⚠️ sel' : '⚠️';
    const offLabel = current === 'OFF' ? '✕ sel' : '✕';
    kb.text(fullLabel, `meal:${slot}:FULL`)
      .text(partialLabel, `meal:${slot}:PARTIAL`)
      .text(offLabel, `meal:${slot}:OFF`)
      .row();
  }
  kb.text('Fine', 'meal:DONE');
  return kb;
}

function todayLabel(): string {
  return new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export const complianceCommand = (bot: Bot<MyContext>, db: PrismaClient) => {
  const service = createComplianceService(db);

  // /compliance - show main inline keyboard
  bot.command('compliance', async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text('Piano OK ✓', 'compliance_full')
      .row()
      .text('Per pasto ⚙️', 'compliance_per_meal')
      .row()
      .text('Off day ✕', 'compliance_off');

    await ctx.reply(
      `Come e' andata oggi (${todayLabel()})?\n\nScegli lo status per il piano alimentare:`,
      { reply_markup: keyboard }
    );
  });

  // Callback: FULL shortcut - mark all 5 meals FULL
  bot.callbackQuery('compliance_full', async (ctx) => {
    await ctx.answerCallbackQuery();
    try {
      await service.setAllMeals('FULL');
      const { streak } = await service.getStreak();
      const streakMsg = streak > 1 ? ` Streak: ${streak} giorni FULL consecutivi!` : '';
      await ctx.editMessageText(
        `Piano rispettato al 100% su tutti i pasti - registrato.\n\nContinua cosi'.${streakMsg}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore sconosciuto';
      await ctx.editMessageText(`Errore durante il salvataggio: ${message}`);
    }
  });

  // Callback: OFF shortcut - mark all 5 meals OFF
  bot.callbackQuery('compliance_off', async (ctx) => {
    await ctx.answerCallbackQuery();
    try {
      await service.setAllMeals('OFF');
      await ctx.editMessageText(
        `Giornata off-plan registrata (tutti i pasti).\n\nCapita - si riparte domani.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore sconosciuto';
      await ctx.editMessageText(`Errore durante il salvataggio: ${message}`);
    }
  });

  // Callback: PER MEAL - open meal-by-meal breakdown flow
  bot.callbackQuery('compliance_per_meal', async (ctx) => {
    await ctx.answerCallbackQuery();

    // Load existing meals if any
    const today = await service.getTodayCompliance();
    const meals: MealStatusMap = {};
    if (today && today.meals) {
      for (const m of today.meals) {
        meals[m.slot] = m.status;
      }
    }
    ctx.session.mealCompliance = meals;

    await ctx.editMessageText(buildMealBreakdownMessage(meals, todayLabel()), {
      reply_markup: buildMealKeyboard(meals),
    });
  });

  // Callback: meal:SLOT:STATUS - update single meal
  bot.callbackQuery(/^meal:(BREAKFAST|MORNING_SNACK|LUNCH|AFTERNOON_SNACK|DINNER):(FULL|PARTIAL|OFF)$/, async (ctx) => {
    const match = ctx.match as RegExpMatchArray;
    const slot = match[1] as MealSlot;
    const status = match[2] as ComplianceStatus;

    await ctx.answerCallbackQuery();

    try {
      await service.upsertMealCompliance(undefined, slot, status);

      // Update session state and message
      const meals: MealStatusMap = ctx.session.mealCompliance ?? {};
      meals[slot] = status;
      ctx.session.mealCompliance = meals;

      await ctx.editMessageText(buildMealBreakdownMessage(meals, todayLabel()), {
        reply_markup: buildMealKeyboard(meals),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore sconosciuto';
      await ctx.reply(`Errore durante il salvataggio: ${message}`);
    }
  });

  // Callback: meal:DONE - finalize
  bot.callbackQuery('meal:DONE', async (ctx) => {
    await ctx.answerCallbackQuery();
    const meals: MealStatusMap = ctx.session.mealCompliance ?? {};
    const logged = MEAL_SLOTS.filter((s) => meals[s] !== undefined);
    const fullCount = MEAL_SLOTS.filter((s) => meals[s] === 'FULL').length;
    const partialCount = MEAL_SLOTS.filter((s) => meals[s] === 'PARTIAL').length;
    const offCount = MEAL_SLOTS.filter((s) => meals[s] === 'OFF').length;

    const summary =
      `Compliance registrata (${todayLabel()}):\n` +
      `✅ ${fullCount}/5 pieni · ⚠️ ${partialCount}/5 parziali · ✕ ${offCount}/5 off` +
      (logged.length < 5 ? `\n\n(${5 - logged.length} pasti non classificati)` : '');

    await ctx.editMessageText(summary);
    ctx.session.mealCompliance = undefined;
  });
};
