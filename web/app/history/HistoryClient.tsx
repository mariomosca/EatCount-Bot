'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { compliance, type ComplianceStatus, type MealSlot } from '@/lib/api';
import { HeatmapGrid, HeatmapEmptyState } from '@/components/compliance/HeatmapGrid';
import {
  MealComplianceGrid,
  MealComplianceSummary,
} from '@/components/compliance/MealComplianceGrid';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-800 ${className}`} />;
}

type RangeOption = '30' | '60' | '90';

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function HistoryClient() {
  const [range, setRange] = useState<RangeOption>('30');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = addDays(endDate, -(parseInt(range) - 1));
  startDate.setHours(0, 0, 0, 0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['compliance', 'range', range],
    queryFn: () =>
      compliance.getRange(formatDate(startDate), formatDate(endDate)).then((r) => r.data),
  });

  const records = data?.records ?? [];

  const logMealMutation = useMutation({
    mutationFn: (vars: { slot: MealSlot; status: ComplianceStatus; date: string }) =>
      compliance.logMeal(vars).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
    },
  });

  const selectedRecord = selectedDate
    ? records.find((r) => r.date.split('T')[0] === selectedDate)
    : null;

  const selectedDateLabel = selectedDate
    ? new Date(selectedDate).toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Storico Compliance</h1>
          <p className="text-slate-400 text-sm mt-1">
            Aderenza al piano alimentare nel tempo. Clicca un giorno per modificarlo.
          </p>
        </div>

        {/* Filtro range */}
        <div
          className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1"
          role="group"
          aria-label="Seleziona periodo"
        >
          {(['30', '60', '90'] as RangeOption[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                range === r
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              aria-pressed={range === r}
            >
              {r}gg
            </button>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square" />
              ))}
            </div>
            <div className="grid grid-cols-4 gap-3 mt-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-400 text-sm">
            Errore nel caricamento dati. Verifica la connessione al backend.
          </div>
        ) : records.length === 0 ? (
          <HeatmapEmptyState />
        ) : (
          <HeatmapGrid
            records={records}
            startDate={startDate}
            endDate={endDate}
            onSelectDate={(d) => setSelectedDate((cur) => (cur === d ? null : d))}
            selectedDate={selectedDate}
          />
        )}
      </div>

      {/* Editor giorno selezionato */}
      {selectedDate && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white capitalize">{selectedDateLabel}</h2>
              <p className="text-xs text-slate-400 mt-1">
                Modifica lo stato per ciascun pasto.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Chiudi editor"
            >
              Chiudi
            </button>
          </div>

          <MealComplianceGrid
            meals={selectedRecord?.meals}
            isLoading={logMealMutation.isPending}
            onLogMeal={(slot, status) =>
              logMealMutation.mutate({ slot, status, date: selectedDate })
            }
          />

          {logMealMutation.isError && (
            <p className="text-xs text-red-400">
              Errore nel salvataggio. Riprova.
            </p>
          )}
        </div>
      )}

      {/* Dettaglio per pasto - ultimi giorni con breakdown */}
      {!isLoading && !error && (() => {
        const withMeals = records
          .filter((r) => r.meals && r.meals.length > 0)
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 7);
        if (withMeals.length === 0) return null;
        return (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="font-semibold text-white">Dettaglio pasti (ultimi giorni)</h2>
              <p className="text-xs text-slate-400 mt-1">
                Breakdown per colazione, spuntini, pranzo e cena
              </p>
            </div>
            <div className="space-y-4">
              {withMeals.map((r) => {
                const dayLabel = new Date(r.date).toLocaleDateString('it-IT', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                });
                return (
                  <div
                    key={r.id}
                    className="border border-slate-800 rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white capitalize">{dayLabel}</p>
                      <span className="text-xs font-mono text-slate-500">
                        {r.status}
                      </span>
                    </div>
                    <MealComplianceSummary meals={r.meals} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
