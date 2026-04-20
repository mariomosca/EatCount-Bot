'use client';

import { cn } from '@/lib/utils';
import type { ComplianceRecord, ComplianceStatus } from '@/lib/api';

interface HeatmapGridProps {
  records: ComplianceRecord[];
  startDate: Date;
  endDate: Date;
}

const STATUS_COLORS: Record<ComplianceStatus | 'NONE', string> = {
  FULL: 'bg-compliance-full hover:bg-compliance-full/80',
  PARTIAL: 'bg-compliance-partial hover:bg-compliance-partial/80',
  OFF: 'bg-compliance-off hover:bg-compliance-off/80',
  NONE: 'bg-slate-800 hover:bg-slate-700',
};

const STATUS_LABELS: Record<ComplianceStatus | 'NONE', string> = {
  FULL: 'Piano rispettato',
  PARTIAL: 'Con deviazioni',
  OFF: 'Off day',
  NONE: 'Non loggato',
};

const DAY_LABELS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function HeatmapGrid({ records, startDate, endDate }: HeatmapGridProps) {
  // Build mappa date -> record
  const recordMap = new Map<string, ComplianceRecord>();
  for (const record of records) {
    const dateKey = record.date.split('T')[0];
    recordMap.set(dateKey, record);
  }

  // Build lista di date nel range
  const days: Date[] = [];
  let current = new Date(startDate);
  while (current <= endDate) {
    days.push(new Date(current));
    current = addDays(current, 1);
  }

  // Padding iniziale: quanti giorni vuoti prima del primo giorno?
  // dayOfWeek: 0=Dom, 1=Lun, ..., 6=Sab -> vogliamo Lun=0 ... Dom=6
  const firstDayOfWeek = ((startDate.getDay() + 6) % 7); // 0=Mon
  const paddingDays = firstDayOfWeek;

  // Totali per statistiche
  const totals = { FULL: 0, PARTIAL: 0, OFF: 0, NONE: 0 };
  for (const day of days) {
    const key = formatDate(day);
    const record = recordMap.get(key);
    if (record) {
      totals[record.status]++;
    } else {
      // Solo nel passato
      if (day <= new Date()) totals.NONE++;
    }
  }
  const totalLogged = totals.FULL + totals.PARTIAL + totals.OFF;
  const fullPct = totalLogged > 0 ? Math.round((totals.FULL / totalLogged) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Griglia */}
      <div>
        {/* Header giorni settimana */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="text-center text-xs text-slate-500 font-mono py-1">
              {label}
            </div>
          ))}
        </div>

        {/* Celle */}
        <div className="grid grid-cols-7 gap-1">
          {/* Padding iniziale */}
          {Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}

          {/* Giorni */}
          {days.map((day) => {
            const key = formatDate(day);
            const record = recordMap.get(key);
            const status: ComplianceStatus | 'NONE' = record ? record.status : 'NONE';
            const isFuture = day > new Date();
            const dateLabel = day.toLocaleDateString('it-IT', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div key={key} className="group relative">
                <div
                  className={cn(
                    'aspect-square rounded-sm transition-colors cursor-default',
                    isFuture
                      ? 'bg-slate-900 opacity-40'
                      : STATUS_COLORS[status]
                  )}
                  aria-label={`${dateLabel}: ${STATUS_LABELS[status]}`}
                  role="img"
                />
                {/* Tooltip */}
                {!isFuture && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 hidden group-hover:block pointer-events-none">
                    <div className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white whitespace-nowrap shadow-xl">
                      <p className="font-medium">{dateLabel}</p>
                      <p className="text-slate-400">{STATUS_LABELS[status]}</p>
                      {record?.deviations && (
                        <p className="text-slate-300 mt-1 max-w-[200px] truncate">{record.deviations}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-compliance-full" />
          <span>Piano OK</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-compliance-partial" />
          <span>Deviazioni</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-compliance-off" />
          <span>Off day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-slate-800" />
          <span>Non loggato</span>
        </div>
      </div>

      {/* Statistiche aggregate */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Piano OK', value: totals.FULL, color: 'text-compliance-full' },
          { label: 'Deviazioni', value: totals.PARTIAL, color: 'text-compliance-partial' },
          { label: 'Off day', value: totals.OFF, color: 'text-compliance-off' },
          { label: 'Aderenza %', value: `${fullPct}%`, color: 'text-white' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
            <p className={cn('text-2xl font-bold font-mono', color)}>{value}</p>
            <p className="text-xs text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Empty state
export function HeatmapEmptyState() {
  return (
    <div className="text-center py-12 text-slate-500">
      <div className="w-16 h-16 bg-slate-800 rounded-xl mx-auto mb-4 flex items-center justify-center">
        <span className="text-2xl">📅</span>
      </div>
      <p className="text-sm">Nessun dato nel periodo selezionato.</p>
      <p className="text-xs mt-1">Inizia a loggare la compliance dalla dashboard.</p>
    </div>
  );
}
