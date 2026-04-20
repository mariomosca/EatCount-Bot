'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, CloudUpload, CalendarDays, FileText } from 'lucide-react';
import { plans, type PlanDay, type Meal } from '@/lib/api';
import { MealCard } from '@/components/plan/MealCard';
import { cn } from '@/lib/utils';

const DAY_NAMES = ['', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const TODAY_DOW = (() => {
  const d = new Date().getDay();
  return d === 0 ? 7 : d; // 1=Lun ... 7=Dom
})();

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-800 ${className}`} />;
}

// Upload PDF section
function PdfUploadSection() {
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => plans.uploadPDF(file).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setFileName(null);
      toast.success('Piano caricato con successo!', {
        description: `Piano "${data.plan?.name}" attivato.`,
      });
    },
    onError: () => {
      toast.error('Errore nel caricamento del PDF. Verifica che sia un piano alimentare valido.');
    },
  });

  const handleFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Carica solo file PDF');
      return;
    }
    setFileName(file.name);
    uploadMutation.mutate(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-slate-400" />
        <h2 className="font-semibold text-white">Carica Piano Alimentare</h2>
      </div>
      <p className="text-xs text-slate-500">
        Carica il PDF del tuo piano nutrizionista. Il parsing AI lo convertira automaticamente.
      </p>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Trascina qui il PDF o clicca per selezionare"
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-blue-500 bg-blue-500/5'
            : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleInputChange}
          aria-hidden="true"
        />

        {uploadMutation.isPending ? (
          <div className="space-y-2">
            <div className="w-10 h-10 mx-auto rounded-xl bg-blue-500/10 flex items-center justify-center">
              <CloudUpload className="w-5 h-5 text-blue-400 animate-pulse" />
            </div>
            <p className="text-sm text-slate-300">Parsing AI in corso...</p>
            {fileName && <p className="text-xs text-slate-500">{fileName}</p>}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-10 h-10 mx-auto rounded-xl bg-slate-800 flex items-center justify-center">
              <Upload className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm text-slate-300">
              Trascina il PDF qui o{' '}
              <span className="text-blue-400 underline">clicca per selezionare</span>
            </p>
            <p className="text-xs text-slate-500">Solo PDF, max 10MB</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Piano settimanale
function WeeklyPlan({ plan }: { plan: { name: string; days: PlanDay[] } }) {
  const queryClient = useQueryClient();
  const [activeDay, setActiveDay] = useState(TODAY_DOW);

  const updateMealMutation = useMutation({
    mutationFn: ({ mealId, data }: { mealId: string; data: Partial<Pick<Meal, 'targetKcal' | 'description' | 'details'>> }) =>
      plans.updateMeal(mealId, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Pasto aggiornato');
    },
    onError: () => {
      toast.error('Errore nel salvataggio. Riprova.');
    },
  });

  const handleMealUpdate = async (mealId: string, data: { targetKcal?: number; description?: string }) => {
    await updateMealMutation.mutateAsync({ mealId, data });
  };

  const activeDayData = plan.days.find((d) => d.dayOfWeek === activeDay);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Piano name */}
      <div className="px-5 pt-5 pb-0">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-white">{plan.name}</h2>
        </div>
      </div>

      {/* Tabs giorni */}
      <div className="flex gap-1 overflow-x-auto px-5 py-3 scrollbar-hide">
        {[1, 2, 3, 4, 5, 6, 7].map((dow) => {
          const isToday = dow === TODAY_DOW;

          return (
            <button
              key={dow}
              onClick={() => setActiveDay(dow)}
              aria-pressed={activeDay === dow}
              className={cn(
                'flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                activeDay === dow
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <span>{DAY_NAMES[dow].substring(0, 3)}</span>
              {isToday && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />}
            </button>
          );
        })}
      </div>

      {/* Pasti del giorno */}
      <div className="px-5 pb-5 space-y-2">
        {activeDayData && activeDayData.meals.length > 0 ? (
          activeDayData.meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              onUpdate={handleMealUpdate}
            />
          ))
        ) : (
          <div className="text-center py-8 text-slate-500 text-sm">
            Nessun pasto pianificato per {DAY_NAMES[activeDay]}.
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlanClient() {
  const { data, isLoading } = useQuery({
    queryKey: ['plans', 'all'],
    queryFn: () => plans.getAll().then((r) => r.data),
    retry: false,
  });

  const plan = data?.plan;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Piano Alimentare</h1>
        <p className="text-slate-400 text-sm mt-1">Gestisci il tuo piano settimanale</p>
      </div>

      {/* PDF Upload */}
      <PdfUploadSection />

      {/* Piano settimanale */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !plan ? (
        <div className="bg-slate-900 border border-slate-800 border-dashed rounded-2xl p-10 text-center text-slate-500">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Nessun piano attivo.</p>
          <p className="text-xs mt-1">Carica un PDF sopra per iniziare.</p>
        </div>
      ) : (
        <WeeklyPlan plan={plan} />
      )}
    </div>
  );
}
