'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { AlertTriangle, Clock3, Stethoscope } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, limit, query, where } from 'firebase/firestore';
import { format } from 'date-fns';

function getPriorityOrder(severity?: string): number {
  if (severity === 'Red') return 3;
  if (severity === 'Yellow') return 2;
  if (severity === 'Green') return 1;
  return 0;
}

function severityClass(severity?: string): string {
  if (severity === 'Red') return 'bg-destructive/20 text-destructive border-destructive/40';
  if (severity === 'Yellow') return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/40';
  if (severity === 'Green') return 'bg-accent/20 text-accent border-accent/40';
  return 'bg-muted text-muted-foreground border-border';
}

export default function DoctorDashboardPage() {
  const { user } = useUser();
  const db = useFirestore();

  const activeCasesQuery = useMemo(() => {
    if (!db || !user?.uid) {
      return null;
    }

    return query(
      collection(db, 'triageSessions'),
      where('status', '==', 'active'),
      limit(100),
    );
  }, [db, user?.uid]);

  const { data: triageCases, loading, error } = useCollection<any>(activeCasesQuery as any);

  const sortedCases = useMemo(() => {
    return [...(triageCases ?? [])].sort((a, b) => {
      const priorityDiff = getPriorityOrder(b?.severityScore) - getPriorityOrder(a?.severityScore);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      const aSec = Number(a?.createdAt?.seconds ?? 0);
      const bSec = Number(b?.createdAt?.seconds ?? 0);
      return bSec - aSec;
    });
  }, [triageCases]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-6 pb-16 pt-32 md:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Clinician Worklist</h1>
            <p className="mt-1 text-sm text-muted-foreground">Prioritized triage cases routed from voice diagnostic sessions.</p>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase tracking-widest border-primary/30 text-primary">
            Live Queue
          </Badge>
        </div>

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-card/70 p-6 text-sm text-muted-foreground">Loading routed cases...</div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
            <p className="text-sm text-destructive">Unable to load clinician queue.</p>
            <p className="mt-1 text-xs text-muted-foreground">{error.message}</p>
          </div>
        )}

        {!loading && !error && sortedCases.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-card/60 p-10 text-center">
            <p className="text-muted-foreground">No active triage cases in the queue right now.</p>
          </div>
        )}

        <div className="space-y-4">
          {sortedCases.map((triageCase: any) => (
            <article key={triageCase.id} className="rounded-2xl border border-white/10 bg-card/75 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={severityClass(triageCase.severityScore)}>
                      <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                      {triageCase.severityScore ?? 'Unknown'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
                      {triageCase.nativeLanguage ?? 'Unknown'}
                    </Badge>
                  </div>

                  <p className="text-base font-semibold">{triageCase.problem ?? 'General symptom concern'}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{triageCase.summary ?? triageCase.translatedTextEnglish ?? 'No summary available.'}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground/80">
                    <span className="inline-flex items-center gap-1"><Stethoscope className="h-3.5 w-3.5" /> {triageCase.recommendedAction ?? 'Review required'}</span>
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {triageCase.createdAt?.toDate ? format(triageCase.createdAt.toDate(), 'MMM dd, yyyy • hh:mm a') : 'Recently'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button asChild variant="secondary">
                    <Link href={`/triage?sessionId=${triageCase.id}`}>Open Lab Report</Link>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
