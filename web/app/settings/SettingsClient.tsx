'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { signOut } from 'next-auth/react';
import { type Session } from 'next-auth';
import { Target, LogOut, User } from 'lucide-react';
import { target } from '@/lib/api';
import { Button } from '@/components/ui/button';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-800 ${className}`} />;
}

interface SettingsClientProps {
  session: Session | null;
}

export default function SettingsClient({ session }: SettingsClientProps) {
  const queryClient = useQueryClient();
  const [kcalInput, setKcalInput] = useState('');

  // Fetch target corrente
  const { data: targetData, isLoading: loadingTarget } = useQuery({
    queryKey: ['target'],
    queryFn: () => target.get().then((r) => r.data),
    retry: false,
  });

  // Sync input con dato fetched
  useEffect(() => {
    if (targetData?.targetKcal) {
      setKcalInput(String(targetData.targetKcal));
    }
  }, [targetData]);

  // Mutation update target
  const updateTargetMutation = useMutation({
    mutationFn: (kcal: number) => target.set(kcal).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.setQueryData(['target'], data);
      toast.success(`Target aggiornato: ${data.targetKcal} kcal/giorno`);
    },
    onError: () => {
      toast.error('Errore nel salvataggio del target. Riprova.');
    },
  });

  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const kcal = parseInt(kcalInput, 10);
    if (isNaN(kcal) || kcal < 500 || kcal > 10000) {
      toast.error('Inserisci un valore valido tra 500 e 10000 kcal');
      return;
    }
    updateTargetMutation.mutate(kcal);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Impostazioni</h1>
        <p className="text-slate-400 text-sm mt-1">Configura il tuo profilo e preferenze</p>
      </div>

      {/* Profilo utente */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-white">Profilo</h2>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between py-3 border-b border-slate-800">
            <span className="text-sm text-slate-400">Nome</span>
            <span className="text-sm text-white font-medium">{session?.user?.name ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-slate-400">Email</span>
            <span className="text-sm text-white font-mono">{session?.user?.email ?? '—'}</span>
          </div>
        </div>
      </section>

      {/* Target kcal */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-white">Target calorico giornaliero</h2>
        </div>

        {loadingTarget ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <form onSubmit={handleSaveTarget} className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="number"
                value={kcalInput}
                onChange={(e) => setKcalInput(e.target.value)}
                min="500"
                max="10000"
                step="50"
                placeholder="2000"
                aria-label="Target calorie giornaliere"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white font-mono placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 pr-16"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                kcal
              </span>
            </div>
            <Button
              type="submit"
              disabled={updateTargetMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6"
            >
              {updateTargetMutation.isPending ? 'Salvo...' : 'Salva'}
            </Button>
          </form>
        )}

        <p className="text-xs text-slate-500">
          Usato come riferimento per il piano alimentare. Target HYROX cut: 1800-2000 kcal.
        </p>
      </section>

      {/* Logout */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="font-semibold text-white mb-4">Sessione</h2>
        <Button
          variant="destructive"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full sm:w-auto flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
        <p className="text-xs text-slate-500 mt-3">
          La sessione scade automaticamente dopo 30 giorni.
        </p>
      </section>
    </div>
  );
}
