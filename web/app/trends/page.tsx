import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Header } from '@/components/shared/Header';
import { Construction } from 'lucide-react';

export default async function TrendsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="min-h-screen bg-slate-950">
      <Header session={session} />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Trends</h1>
            <p className="text-slate-400 text-sm mt-1">Analisi andamento nel tempo</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 border-dashed rounded-2xl p-16 text-center">
            <Construction className="w-12 h-12 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400 font-medium">Trends - Sprint 3 Phase 3</p>
            <p className="text-slate-600 text-sm mt-2">
              Grafici aderenza settimanale, compliance trend 90gg, peso manuale.
              <br />
              Disponibile nella prossima fase dopo accumulo dati.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
