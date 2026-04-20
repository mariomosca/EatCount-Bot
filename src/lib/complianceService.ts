import type { PrismaClient, ComplianceStatus } from '@prisma/client';
import { DateTime } from 'luxon';

const DEFAULT_TELEGRAM_ID = '179533089';

export interface UpsertComplianceInput {
  status: ComplianceStatus;
  deviations?: string;
  note?: string;
  date?: string; // YYYY-MM-DD, defaults to today
}

// Helper: get a Date value for @db.Date fields using midnight UTC of the given date string.
// For @db.Date in PostgreSQL, Prisma passes the Date at midnight UTC and the DB stores it as a date.
// We construct the date as YYYY-MM-DDT00:00:00.000Z so that PostgreSQL sees the correct calendar date.
export function toDateOnly(dateStr?: string): Date {
  const iso = dateStr ?? DateTime.now().setZone('Europe/Rome').toISODate()!;
  return new Date(`${iso}T00:00:00.000Z`);
}

export function todayRomeString(): string {
  return DateTime.now().setZone('Europe/Rome').toISODate()!;
}

export const createComplianceService = (db: PrismaClient) => {
  async function getUser() {
    const user = await db.user.findUnique({
      where: { telegramId: DEFAULT_TELEGRAM_ID },
    });
    if (!user) throw new Error('User not found');
    return user;
  }

  // Upsert compliance for a given day
  async function upsertCompliance(input: UpsertComplianceInput) {
    const user = await getUser();
    const dateValue = toDateOnly(input.date);

    const compliance = await db.dailyCompliance.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: dateValue,
        },
      },
      update: {
        status: input.status,
        deviations: input.deviations ?? null,
        note: input.note ?? null,
      },
      create: {
        userId: user.id,
        date: dateValue,
        status: input.status,
        deviations: input.deviations ?? null,
        note: input.note ?? null,
      },
    });

    return compliance;
  }

  // List compliance for a date range
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
    });

    return record;
  }

  // Get streak of consecutive FULL days (counting backwards from today)
  async function getStreak() {
    const user = await getUser();

    // Fetch last 90 days ordered desc
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

    // DB stores @db.Date as midnight UTC, so isoDate() from UTC gives the correct calendar date
    const statusByDate = new Map<string, ComplianceStatus>();
    for (const r of records) {
      // r.date is e.g. 2026-04-20T00:00:00.000Z -> toISODate() = '2026-04-20'
      const key = DateTime.fromJSDate(r.date, { zone: 'UTC' }).toISODate()!;
      statusByDate.set(key, r.status);
    }

    // Walk back day by day from today (Rome)
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

    const lastFullDate = streak > 0
      ? DateTime.now().setZone('Europe/Rome').toISODate()
      : null;

    return { streak, lastFullDate };
  }

  return { upsertCompliance, listCompliance, getTodayCompliance, getStreak };
};
