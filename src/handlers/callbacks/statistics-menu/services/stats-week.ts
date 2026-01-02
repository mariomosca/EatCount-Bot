import type { PrismaClient } from '@prisma/client';
import type { MyContext } from '../../../../types.js';
import { getUserFromDb } from '../../../../helpers/get-user-from-db.js';
import {
  getRangeByKeyType,
  getAllDatesInWeek,
  formatDateToKey,
} from '../helpers/get-time-ranges.js';

type KeyType = 'stats_this_week' | 'stats_last_week';

export const statsWeekService = async (
  ctx: MyContext,
  db: PrismaClient,
  key: KeyType
) => {
  const userId = ctx.from?.id.toString();
  if (!userId) {
    await ctx.reply(
      'Non è stato possibile ottenere il tuo ID utente. Usa il comando /start per reinizializzare.'
    );
    return;
  }

  const user = await getUserFromDb(userId, db);

  const { startOfWeek, endOfWeek, weekRangeKyiv } = getRangeByKeyType(key);

  try {
    const target = await db.target.findFirst({
      where: { userId: user.id },
    });

    const meals = await db.meal.findMany({
      where: {
        userId: user.id,
        timestamp: {
          gte: startOfWeek,
          lt: endOfWeek,
        },
      },
      include: {
        items: true,
      },
    });

    if (meals.length === 0) {
      const message = target
        ? `Questa settimana non hai ancora aggiunto nessun pasto.\nIl tuo obiettivo giornaliero: ${target.calorieTarget} kcal.`
        : 'Questa settimana non hai ancora aggiunto nessun pasto.';
      await ctx.reply(message);
      return;
    }

    let totalCalories = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;

    const dailyStats: Record<
      string,
      { calories: number; protein: number; fat: number; carbs: number }
    > = {};

    meals.forEach((meal) => {
      totalCalories += meal.totalCalories;
      totalProtein += meal.totalProtein;
      totalFat += meal.totalFat;
      totalCarbs += meal.totalCarbs;

      const dateKey = formatDateToKey(meal.timestamp);
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { calories: 0, protein: 0, fat: 0, carbs: 0 };
      }
      dailyStats[dateKey].calories += meal.totalCalories;
      dailyStats[dateKey].protein += meal.totalProtein;
      dailyStats[dateKey].fat += meal.totalFat;
      dailyStats[dateKey].carbs += meal.totalCarbs;
    });

    const proteinCalories = totalProtein * 4;
    const fatCalories = totalFat * 9;
    const carbCalories = totalCarbs * 4;

    const proteinPercentage = ((proteinCalories / totalCalories) * 100).toFixed(
      1
    );
    const fatPercentage = ((fatCalories / totalCalories) * 100).toFixed(1);
    const carbPercentage = ((carbCalories / totalCalories) * 100).toFixed(1);

    const allDates = getAllDatesInWeek(startOfWeek);

    const fullDailyMessages = allDates.map((date) => {
      if (dailyStats[date]) {
        const { calories, protein, fat, carbs } = dailyStats[date];
        return `📅 ${new Date(date).toLocaleDateString('it-IT', {
          day: '2-digit',
          month: 'long',
        })}: ⚡: ${calories.toFixed(1)} | 🥩: ${protein.toFixed(
          1
        )} g | 🧈: ${fat.toFixed(1)} g | 🍞: ${carbs.toFixed(1)} g`;
      } else {
        return `📅 ${new Date(date).toLocaleDateString('it-IT', {
          day: '2-digit',
          month: 'long',
        })}: Nessun pasto`;
      }
    });

    // Calculate weekly statistics
    let targetInfo = '';
    if (target) {
      const weeklyTarget = target.calorieTarget * 7; // 7 days per week
      const remaining = weeklyTarget - totalCalories;
      const percentConsumed = Math.min(
        100,
        (totalCalories / weeklyTarget) * 100
      ).toFixed(1);

      // Create visual progress bar for weekly target
      const filledCount = Math.round(parseFloat(percentConsumed) / 10);
      const emptyCount = 10 - filledCount;
      const progressBar = '🟩'.repeat(filledCount) + '⬜'.repeat(emptyCount);

      const statusEmoji = remaining > 0 ? '💫' : remaining === 0 ? '✅' : '⚠️';
      const statusText =
        remaining > 0
          ? `Rimanenti: ${remaining.toFixed(1)} kcal`
          : remaining === 0
          ? `Obiettivo settimanale raggiunto!`
          : `Superato di: ${Math.abs(remaining).toFixed(1)} kcal`;

      targetInfo =
        `\n🎯 Obiettivo settimanale: ${weeklyTarget} kcal\n` +
        `${progressBar} ${percentConsumed}%\n` +
        `${statusEmoji} ${statusText}\n`;
    }

    const message =
      `📅 Statistiche settimanali (${weekRangeKyiv}):\n\n` +
      `⚡ Calorie: ${totalCalories.toFixed(1)} kcal\n` +
      `🥩 Proteine: ${totalProtein.toFixed(1)} g  (${proteinPercentage}%)\n` +
      `🧈 Grassi: ${totalFat.toFixed(1)} g  (${fatPercentage}%)\n` +
      `🍞 Carboidrati: ${totalCarbs.toFixed(1)} g  (${carbPercentage}%)` +
      `${targetInfo}\n\n` +
      fullDailyMessages.join('\n');

    await ctx.reply(message);
  } catch (error) {
    console.error('Error fetching weekly statistics:', error);
    await ctx.reply(
      'Si è verificato un errore nel recupero delle statistiche settimanali. Riprova più tardi.'
    );
  }
};
