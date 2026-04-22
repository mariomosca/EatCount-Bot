import { Bot } from 'grammy';
import type { MyContext } from '../../types.js';
import { session } from 'grammy';
import type { MealSlot, ComplianceStatus } from '@prisma/client';

export interface SessionData {
  waitingFor?: string;
  mealType?: string;
  editMealId?: string;
  editItemId?: string;
  editPage?: number;
  pendingMealDescription?: string; // Saved description when user sends food text before selecting meal type
  mealCompliance?: Partial<Record<MealSlot, ComplianceStatus>>;
}

export const sessionMiddleware = (bot: Bot<MyContext>) => {
  bot.use(
    session({
      initial(): SessionData {
        return {};
      },
    })
  );
};
