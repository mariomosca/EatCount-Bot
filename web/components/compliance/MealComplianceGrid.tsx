'use client';

import { CheckCircle2, AlertCircle, XCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MEAL_SLOTS,
  MEAL_SLOT_LABELS,
  type ComplianceStatus,
  type MealSlot,
  type MealComplianceRecord,
} from '@/lib/api';

interface MealComplianceGridProps {
  meals?: MealComplianceRecord[];
  isLoading: boolean;
  onLogMeal: (slot: MealSlot, status: ComplianceStatus) => void;
}

const STATUS_CONFIG: Record<
  ComplianceStatus,
  { icon: typeof CheckCircle2; color: string; hoverColor: string; label: string }
> = {
  FULL: {
    icon: CheckCircle2,
    color: 'bg-compliance-full border-compliance-full text-white',
    hoverColor: 'hover:border-compliance-full hover:text-compliance-full',
    label: 'OK',
  },
  PARTIAL: {
    icon: AlertCircle,
    color: 'bg-compliance-partial border-compliance-partial text-white',
    hoverColor: 'hover:border-compliance-partial hover:text-compliance-partial',
    label: 'Parz.',
  },
  OFF: {
    icon: XCircle,
    color: 'bg-compliance-off border-compliance-off text-white',
    hoverColor: 'hover:border-compliance-off hover:text-compliance-off',
    label: 'Off',
  },
};

export function MealComplianceGrid({
  meals = [],
  isLoading,
  onLogMeal,
}: MealComplianceGridProps) {
  const statusBySlot = new Map<MealSlot, ComplianceStatus>();
  for (const m of meals) statusBySlot.set(m.slot, m.status);

  const loggedCount = statusBySlot.size;
  const fullCount = Array.from(statusBySlot.values()).filter((s) => s === 'FULL').length;
  const partialCount = Array.from(statusBySlot.values()).filter((s) => s === 'PARTIAL').length;
  const offCount = Array.from(statusBySlot.values()).filter((s) => s === 'OFF').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Stato per pasto ({loggedCount}/5 loggati)</p>
        {loggedCount > 0 && (
          <p className="text-xs font-mono text-slate-500">
            <span className="text-compliance-full">✓{fullCount}</span>
            {' · '}
            <span className="text-compliance-partial">⚠{partialCount}</span>
            {' · '}
            <span className="text-compliance-off">✕{offCount}</span>
          </p>
        )}
      </div>

      <div className="space-y-2">
        {MEAL_SLOTS.map((slot) => {
          const current = statusBySlot.get(slot);
          return (
            <div
              key={slot}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center"
            >
              <div className="flex items-center gap-2 min-w-0">
                {current ? (
                  (() => {
                    const Icon = STATUS_CONFIG[current].icon;
                    const iconColor =
                      current === 'FULL'
                        ? 'text-compliance-full'
                        : current === 'PARTIAL'
                          ? 'text-compliance-partial'
                          : 'text-compliance-off';
                    return <Icon className={cn('w-4 h-4 shrink-0', iconColor)} />;
                  })()
                ) : (
                  <Circle className="w-4 h-4 shrink-0 text-slate-600" />
                )}
                <span className="text-sm text-slate-300 truncate">
                  {MEAL_SLOT_LABELS[slot]}
                </span>
              </div>

              {(['FULL', 'PARTIAL', 'OFF'] as ComplianceStatus[]).map((status) => {
                const isSelected = current === status;
                const config = STATUS_CONFIG[status];
                const Icon = config.icon;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onLogMeal(slot, status)}
                    disabled={isLoading}
                    aria-label={`${MEAL_SLOT_LABELS[slot]} ${config.label}`}
                    className={cn(
                      'flex items-center justify-center w-11 h-11 rounded-lg border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed',
                      isSelected
                        ? config.color
                        : cn(
                            'border-slate-700 bg-slate-900 text-slate-400',
                            config.hoverColor
                          )
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Compact read-only view for history
interface MealComplianceSummaryProps {
  meals?: MealComplianceRecord[];
  className?: string;
}

export function MealComplianceSummary({ meals, className }: MealComplianceSummaryProps) {
  if (!meals || meals.length === 0) return null;

  const statusBySlot = new Map<MealSlot, ComplianceStatus>();
  for (const m of meals) statusBySlot.set(m.slot, m.status);

  return (
    <div className={cn('space-y-1.5', className)}>
      {MEAL_SLOTS.map((slot) => {
        const status = statusBySlot.get(slot);
        if (!status) return null;
        const config = STATUS_CONFIG[status];
        const Icon = config.icon;
        const iconColor =
          status === 'FULL'
            ? 'text-compliance-full'
            : status === 'PARTIAL'
              ? 'text-compliance-partial'
              : 'text-compliance-off';
        return (
          <div key={slot} className="flex items-center gap-2 text-sm">
            <Icon className={cn('w-4 h-4 shrink-0', iconColor)} />
            <span className="text-slate-300">{MEAL_SLOT_LABELS[slot]}</span>
          </div>
        );
      })}
    </div>
  );
}
