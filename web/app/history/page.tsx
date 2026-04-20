import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Header } from '@/components/shared/Header';
import HistoryClient from './HistoryClient';

export default async function HistoryPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="min-h-screen bg-slate-950">
      <Header session={session} />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <HistoryClient />
      </main>
    </div>
  );
}
