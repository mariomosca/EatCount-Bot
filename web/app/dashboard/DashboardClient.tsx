'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Flame, TrendingUp, CalendarDays } from 'lucide-react';
import {
  compliance,
  plans,
  type ComplianceStatus,
  type MealSlot,
} from '@/lib/api';
import {
  ComplianceButtons,
  ComplianceStatusBadge,
  DeviationsDialog,
} from '@/components/compliance/ComplianceButtons';
import { MealComplianceGrid } from '@/components/compliance/MealComplianceGrid';
import { MealCard } from '@/components/plan/MealCard';

// Skeleton loader
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-800 ${className}`} />;
}

export default function DashboardClient() {
  const queryClient = useQueryClient();
  const [showDeviationsDialog, setShowDeviationsDialog] = useState(false);

  // Fetch compliance oggi
  const { data: todayData, isLoading: loadingCompliance } = useQuery({
    queryKey: ['compliance', 'today'],
    queryFn: () => compliance.getToday().then((r) => r.data),
  });

  // Fetch streak
  const { data: streakData, isLoading: loadingStreak } = useQuery({
    queryKey: ['compliance', 'streak'],
    queryFn: () => compliance.getStreak().then((r) => r.data),
  });

  // Fetch piano oggi
  const { data: todayPlan, isLoading: loadingPlan, error: planError } = useQuery({
    queryKey: ['plans', 'today'],
    queryFn: () => plans.getToday().then((r) => r.data),
    retry: false,
  });

  // Mutation log compliance
  const logMutation = useMutation({
    mutationFn: (data: { status: ComplianceStatus; deviations?: string }) =>
      compliance.log(data).then((r) => r.data),
    onMutate: async (newData) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['compliance', 'today'] });
      const previous = queryClient.getQueryData(['compliance', 'today']);
      queryClient.setQueryData(['compliance', 'today'], (old: any) => ({
        ...old,
        compliance: { ...(old?.compliance ?? {}), status: newData.status, deviations: newData.deviations },
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['compliance', 'today'], context.previous);
      }
      toast.error('Errore nel salvare la compliance. Riprova.');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
      const statusLabels = { FULL: 'Piano OK', PARTIAL: 'Deviazioni salvate', OFF: 'Off day' };
      const statusPoints = { FULL: '+5pt', PARTIAL: '+3pt', OFF: '+0pt' };
      const status = data.compliance.status as ComplianceStatus;
      toast.success(`${statusLabels[status]} ${statusPoints[status]}`, {
        description: 'Compliance registrata con successo',
      });
    },
  });

  // Mutation log single meal
  const logMealMutation = useMutation({
    mutationFn: (data: { slot: MealSlot; status: ComplianceStatus }) =>
      compliance.logMeal(data).then((r) => r.data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['compliance', 'today'] });
      const previous = queryClient.getQueryData(['compliance', 'today']);
      queryClient.setQueryData(['compliance', 'today'], (old: any) => {
        const existingMeals = old?.compliance?.meals ?? [];
        const others = existingMeals.filter((m: any) => m.slot !== newData.slot);
        const updated = [
          ...others,
          { id: `temp-${newData.slot}`, slot: newData.slot, status: newData.status },
        ];
        return {
          ...old,
          compliance: { ...(old?.compliance ?? {}), meals: updated },
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['compliance', 'today'], context.previous);
      }
      toast.error('Errore nel salvare il pasto. Riprova.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
    },
  });

  const currentStatus = (todayData?.compliance?.status ?? null) as ComplianceStatus | null;
  const currentMeals = todayData?.compliance?.meals;
  const isLogging = logMutation.isPending || logMealMutation.isPending;

  const handleFull = () => {
    logMutation.mutate({ status: 'FULL' });
  };

  const handleOff = () => {
    logMutation.mutate({ status: 'OFF' });
  };

  const handlePartial = () => {
    setShowDeviationsDialog(true);
  };

  const handleDeviationsSubmit = (deviations: string) => {
    logMutation.mutate({ status: 'PARTIAL', deviations });
    setShowDeviationsDialog(false);
  };

  // Ottieni la data di oggi in italiano
  const today = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-slate-400 text-sm capitalize">{today}</p>
        <h1 className="text-2xl font-bold text-white mt-1">Dashboard</h1>
      </div>

      {/* Card Compliance Oggi */}
      <section
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4"
        aria-label="Compliance di oggi"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Come hai seguito il piano oggi?</h2>
          {loadingCompliance ? (
            <Skeleton className="h-6 w-24" />
          ) : currentStatus ? (
            <ComplianceStatusBadge status={currentStatus} />
          ) : (
            <span className="text-xs text-slate-500 border border-slate-700 rounded-full px-3 py-1">
              Non ancora loggato
            </span>
          )}
        </div>

        {loadingCompliance ? (
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : (
          <>
            <ComplianceButtons
              currentStatus={currentStatus}
              isLoading={isLogging}
              onFull={handleFull}
              onPartial={handlePartial}
              onOff={handleOff}
            />
            <div className="pt-2 border-t border-slate-800">
              <MealComplianceGrid
                meals={currentMeals}
                isLoading={isLogging}
                onLogMeal={(slot, status) => logMealMutation.mutate({ slot, status })}
              />
            </div>
          </>
        )}

        {/* Deviations description se presente */}
        {currentStatus === 'PARTIAL' && todayData?.compliance?.deviations && (
          <div className="bg-compliance-partial/10 border border-compliance-partial/20 rounded-lg px-4 py-3">
            <p className="text-xs text-compliance-partial font-medium mb-1">Deviazioni registrate</p>
            <p className="text-sm text-slate-300">{todayData.compliance.deviations}</p>
          </div>
        )}
      </section>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Streak */}
        <section
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4"
          aria-label="Streak attuale"
        >
          <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Streak FULL</p>
            {loadingStreak ? (
              <Skeleton className="h-7 w-12 mt-1" />
            ) : (
              <p className="text-2xl font-bold font-mono text-white">
                {streakData?.currentStreak ?? 0}
                <span className="text-sm font-normal text-slate-400 ml-1">giorni</span>
              </p>
            )}
          </div>
        </section>

        {/* Streak max */}
        <section
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4"
          aria-label="Streak massimo"
        >
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Record</p>
            {loadingStreak ? (
              <Skeleton className="h-7 w-12 mt-1" />
            ) : (
              <p className="text-2xl font-bold font-mono text-white">
                {streakData?.longestStreak ?? 0}
                <span className="text-sm font-normal text-slate-400 ml-1">giorni</span>
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Piano del giorno */}
      <section
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3"
        aria-label="Piano alimentare di oggi"
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-white">Piano di oggi</h2>
        </div>

        {loadingPlan ? (
          <div className="space-y-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : planError || !todayPlan ? (
          <div className="text-center py-8 text-slate-500">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nessun piano attivo.</p>
            <p className="text-xs mt-1">
              <a href="/plan" className="text-blue-400 hover:underline">
                Carica un piano alimentare
              </a>{' '}
              per iniziare.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              {todayPlan.planName} &middot; {todayPlan.dayName}
            </p>
            {todayPlan.meals.map((meal) => (
              <MealCard key={meal.id} meal={meal} readOnly />
            ))}
          </div>
        )}
      </section>

      {/* Dialog deviazioni */}
      <DeviationsDialog
        isOpen={showDeviationsDialog}
        isLoading={isLogging}
        onClose={() => setShowDeviationsDialog(false)}
        onSubmit={handleDeviationsSubmit}
      />
    </div>
  );
}
