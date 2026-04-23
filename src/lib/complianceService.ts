import type { PrismaClient, ComplianceStatus, MealSlot } from '@prisma/client';
import { DateTime } from 'luxon';

const DEFAULT_TELEGRAM_ID = '179533089';

export const MEAL_SLOTS: MealSlot[] = [
  'BREAKFAST',
  'MORNING_SNACK',
  'LUNCH',
  'AFTERNOON_SNACK',
  'DINNER',
];

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  BREAKFAST: 'Colazione',
  MORNING_SNACK: 'Spuntino mattina',
  LUNCH: 'Pranzo',
  AFTERNOON_SNACK: 'Spuntino pomeriggio',
  DINNER: 'Cena',
};

export interface MealComplianceInput {
  slot: MealSlot;
  status: ComplianceStatus;
  note?: string;
}

export interface UpsertComplianceInput {
  status?: ComplianceStatus;
  deviations?: string;
  note?: string;
  date?: string; // YYYY-MM-DD, defaults to today
  meals?: MealComplianceInput[];
}

export function toDateOnly(dateStr?: string): Date {
  const iso = dateStr ?? DateTime.now().setZone('Europe/Rome').toISODate()!;
  return new Date(`${iso}T00:00:00.000Z`);
}

export function todayRomeString(): string {
  return DateTime.now().setZone('Europe/Rome').toISODate()!;
}

// Derive overall status from meal breakdown
export function deriveOverallStatus(
  meals: { status: ComplianceStatus }[]
): ComplianceStatus {
  if (meals.length === 0) return 'OFF';
  const statuses = meals.map((m) => m.status);
  if (statuses.every((s) => s === 'FULL')) return 'FULL';
  if (statuses.every((s) => s === 'OFF')) return 'OFF';
  return 'PARTIAL';
}

export const createComplianceService = (db: PrismaClient) => {
  async function getUser() {
    const user = await db.user.findUnique({
      where: { telegramId: DEFAULT_TELEGRAM_ID },
    });
    if (!user) throw new Error('User not found');
    return user;
  }

  // Upsert compliance for a given day (supports both aggregate-only and per-meal)
  async function upsertCompliance(input: UpsertComplianceInput) {
    const user = await getUser();
    const dateValue = toDateOnly(input.date);

    // If meals provided, derive overall status from them (unless status explicitly set)
    const overallStatus =
      input.status ?? (input.meals ? deriveOverallStatus(input.meals) : undefined);

    if (!overallStatus) {
      throw new Error('Either status or meals must be provided');
    }

    const compliance = await db.dailyCompliance.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: dateValue,
        },
      },
      update: {
        status: overallStatus,
        deviations: input.deviations ?? null,
        note: input.note ?? null,
      },
      create: {
        userId: user.id,
        date: dateValue,
        status: overallStatus,
        deviations: input.deviations ?? null,
        note: input.note ?? null,
      },
    });

    // Upsert meal breakdowns if provided
    if (input.meals && input.meals.length > 0) {
      for (const meal of input.meals) {
        await db.mealCompliance.upsert({
          where: {
            dailyComplianceId_slot: {
              dailyComplianceId: compliance.id,
              slot: meal.slot,
            },
          },
          update: {
            status: meal.status,
            note: meal.note ?? null,
          },
          create: {
            dailyComplianceId: compliance.id,
            slot: meal.slot,
            status: meal.status,
            note: meal.note ?? null,
          },
        });
      }
    }

    return getComplianceWithMeals(compliance.id);
  }

  // Upsert a single meal compliance (for interactive bot flow)
  async function upsertMealCompliance(
    dateStr: string | undefined,
    slot: MealSlot,
    status: ComplianceStatus,
    note?: string
  ) {
    const user = await getUser();
    const dateValue = toDateOnly(dateStr);

    // Ensure daily compliance record exists (PARTIAL as placeholder until recomputed)
    const daily = await db.dailyCompliance.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: dateValue,
        },
      },
      update: {},
      create: {
        userId: user.id,
        date: dateValue,
        status: 'PARTIAL',
      },
    });

    await db.mealCompliance.upsert({
      where: {
        dailyComplianceId_slot: {
          dailyComplianceId: daily.id,
          slot,
        },
      },
      update: { status, note: note ?? null },
      create: {
        dailyComplianceId: daily.id,
        slot,
        status,
        note: note ?? null,
      },
    });

    // Recompute overall status from all meal entries
    const meals = await db.mealCompliance.findMany({
      where: { dailyComplianceId: daily.id },
    });
    const overall = deriveOverallStatus(meals);

    await db.dailyCompliance.update({
      where: { id: daily.id },
      data: { status: overall },
    });

    return getComplianceWithMeals(daily.id);
  }

  async function getComplianceWithMeals(id: string) {
    return db.dailyCompliance.findUnique({
      where: { id },
      include: { meals: true },
    });
  }

  // List compliance for a date range (with meals)
  async function listCompliance(startDate: string, endDate: string) {
    const user = await getUser();

    const records = await db.dailyCompliance.findMany({
      where: {
        userId: user.id,
        date: {
          gte: toDateOnly(startDate),
          lte: toDateOnly(endDate),
        },
      },
      include: { meals: true },
      orderBy: { date: 'asc' },
    });

    return records;
  }

  // Get today's compliance (null if not logged yet)
  async function getTodayCompliance() {
    const user = await getUser();
    const todayDate = toDateOnly();

    const record = await db.dailyCompliance.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: todayDate,
        },
      },
      include: { meals: true },
    });

    return record;
  }

  // True only when all 5 meal slots are logged for today
  async function isTodayFullyLogged() {
    const record = await getTodayCompliance();
    if (!record) return false;
    return record.meals.length >= MEAL_SLOTS.length;
  }

  // Shortcut: mark all 5 meals as given status for today
  async function setAllMeals(status: ComplianceStatus, dateStr?: string) {
    const meals: MealComplianceInput[] = MEAL_SLOTS.map((slot) => ({
      slot,
      status,
    }));
    return upsertCompliance({ status, meals, date: dateStr });
  }

  // Get streak of consecutive FULL days (counting backwards from today)
  async function getStreak() {
    const user = await getUser();

    const ninetyDaysAgo = toDateOnly(
      DateTime.now().setZone('Europe/Rome').minus({ days: 90 }).toISODate()!
    );

    const records = await db.dailyCompliance.findMany({
      where: {
        userId: user.id,
        date: { gte: ninetyDaysAgo },
      },
      orderBy: { date: 'desc' },
    });

    if (records.length === 0) {
      return { streak: 0, lastFullDate: null };
    }

    let streak = 0;

    const statusByDate = new Map<string, ComplianceStatus>();
    for (const r of records) {
      const key = DateTime.fromJSDate(r.date, { zone: 'UTC' }).toISODate()!;
      statusByDate.set(key, r.status);
    }

    let currentDateStr = DateTime.now().setZone('Europe/Rome').toISODate()!;

    while (true) {
      const status = statusByDate.get(currentDateStr);

      if (status === 'FULL') {
        streak++;
        currentDateStr = DateTime.fromISO(currentDateStr)
          .minus({ days: 1 })
          .toISODate()!;
      } else {
        break;
      }
    }

    const lastFullDate =
      streak > 0 ? DateTime.now().setZone('Europe/Rome').toISODate() : null;

    return { streak, lastFullDate };
  }

  return {
    upsertCompliance,
    upsertMealCompliance,
    setAllMeals,
    listCompliance,
    getTodayCompliance,
    isTodayFullyLogged,
    getStreak,
  };
};
