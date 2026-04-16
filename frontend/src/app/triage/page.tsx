"use client";

import { useCallback, useMemo, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { TriageInterface, type TriageSessionResult, type TriageStep } from '../../components/triage/TriageInterface';
import { CalendarDays, Clock3, History, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, limit, query, where } from 'firebase/firestore';

type TriagePanelState = {
  step: TriageStep;
  isRecording: boolean;
  selectedLanguage: string;
  liveTranscript: string;
  result: TriageSessionResult | null;
};

const INITIAL_TRIAGE_STATE: TriagePanelState = {
  step: 'lang',
  isRecording: false,
  selectedLanguage: 'English',
  liveTranscript: '',
  result: null,
};

function extractSymptoms(text: string, fallback?: string[]): string[] {
  const cleaned = text
    .replace(/[.;]/g, ',')
    .split(/,|\band\b|\bwith\b|\balso\b/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.split(/\s+/).slice(0, 6).join(' '));

  if (cleaned.length >= 1) {
    return cleaned.slice(0, 3);
  }

  const keywordMap = [
    ['chest pain', 'Chest pain'],
    ['breath', 'Shortness of breath'],
    ['fever', 'Fever'],
    ['headache', 'Headache'],
    ['throat', 'Sore throat'],
    ['cough', 'Cough'],
    ['dizzy', 'Dizziness'],
    ['vomit', 'Vomiting'],
    ['stomach', 'Abdominal pain'],
  ] as const;

  const lowered = text.toLowerCase();
  const found = keywordMap
    .filter(([needle]) => lowered.includes(needle))
    .map(([, label]) => label);

  if (found.length) {
    return found.slice(0, 3);
  }

  if (fallback && fallback.length > 0) {
    return fallback.slice(0, 3);
  }

  return text.trim() ? ['Symptoms captured from transcript'] : ['Waiting for symptom details'];
}

function getZoneFromText(text: string): string {
  const lowered = text.toLowerCase();
  if (lowered.includes('chest') || lowered.includes('breath') || lowered.includes('rib')) return 'Chest - Focal';
  if (lowered.includes('head') || lowered.includes('migraine') || lowered.includes('dizzy')) return 'Head - Focal';
  if (lowered.includes('throat') || lowered.includes('cough')) return 'Throat - Diffuse';
  if (lowered.includes('stomach') || lowered.includes('abdomen')) return 'Abdomen - Focal';
  if (lowered.includes('leg') || lowered.includes('knee') || lowered.includes('foot')) return 'Lower Limb';
  return 'General - Diffuse';
}

function getSeverityScore(level?: string) {
  if (level === 'Red') return 9;
  if (level === 'Yellow') return 6;
  if (level === 'Green') return 3;
  return 0;
}

function getEsiDetails(level?: string) {
  if (level === 'Red') {
    return {
      esiLevel: 2,
      status: 'Immediate clinical eval required',
      bars: 2,
    };
  }

  if (level === 'Yellow') {
    return {
      esiLevel: 3,
      status: 'Urgent evaluation recommended',
      bars: 3,
    };
  }

  if (level === 'Green') {
    return {
      esiLevel: 4,
      status: 'Stable, monitor and follow care plan',
      bars: 1,
    };
  }

  return {
    esiLevel: '--',
    status: 'Awaiting assessment',
    bars: 0,
  };
}

export default function TriagePage() {
  const [triageState, setTriageState] = useState<TriagePanelState>(INITIAL_TRIAGE_STATE);
  const [isRestarting, setIsRestarting] = useState(false);
  const { user } = useUser();
  const db = useFirestore();

  const appointmentsQuery = useMemo(() => {
    if (!db || !user?.uid) {
      return null;
    }
    return query(collection(db, 'appointments'), where('userId', '==', user.uid), limit(20));
  }, [db, user?.uid]);

  const sessionsQuery = useMemo(() => {
    if (!db || !user?.uid) {
      return null;
    }
    return query(collection(db, 'triageSessions'), where('userId', '==', user.uid), limit(20));
  }, [db, user?.uid]);

  const handoffsQuery = useMemo(() => {
    if (!db || !user?.uid) {
      return null;
    }
    return query(collection(db, 'doctorHandoffs'), where('userId', '==', user.uid), limit(20));
  }, [db, user?.uid]);

  const { data: appointments, loading: appointmentsLoading } = useCollection<any>(appointmentsQuery as any);
  const { data: sessionHistory, loading: sessionsLoading } = useCollection<any>(sessionsQuery as any);
  const { data: handoffHistory, loading: handoffLoading } = useCollection<any>(handoffsQuery as any);

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const aSec = Number(a?.createdAt?.seconds ?? 0);
      const bSec = Number(b?.createdAt?.seconds ?? 0);
      return bSec - aSec;
    });
  }, [appointments]);

  const sortedSessions = useMemo(() => {
    return [...sessionHistory].sort((a, b) => {
      const aSec = Number(a?.createdAt?.seconds ?? 0);
      const bSec = Number(b?.createdAt?.seconds ?? 0);
      return bSec - aSec;
    });
  }, [sessionHistory]);

  const sortedHandoffs = useMemo(() => {
    return [...handoffHistory].sort((a, b) => {
      const aSec = Number(a?.createdAt?.seconds ?? 0);
      const bSec = Number(b?.createdAt?.seconds ?? 0);
      return bSec - aSec;
    });
  }, [handoffHistory]);
  const handleTriageStateChange = useCallback((state: TriagePanelState) => {
    setTriageState((prev) => {
      if (
        prev.step === state.step &&
        prev.isRecording === state.isRecording &&
        prev.selectedLanguage === state.selectedLanguage &&
        prev.liveTranscript === state.liveTranscript &&
        prev.result === state.result
      ) {
        return prev;
      }
      return state;
    });

    if (state.isRecording || state.step === 'processing') {
      setIsRestarting(false);
    }
  }, []);
  const showClinicalPanel = triageState.step === 'result' && Boolean(triageState.result);
  const showResultBackground = isRestarting || (triageState.step === 'record' && Boolean(triageState.result));
  const isSpeakStage = triageState.step !== 'result' && !showResultBackground;

  const panelView = useMemo(() => {
    const hasResult = Boolean(triageState.result);
    const translatedText = triageState.result?.capture.translatedTextEnglish ?? '';
    const liveTranscriptText = typeof triageState.liveTranscript === 'string' ? triageState.liveTranscript : '';
    const problemFallback = triageState.result?.problem ? [triageState.result.problem] : undefined;
    const severityLevel = triageState.result?.assessment.severityScore;
    const score = getSeverityScore(severityLevel);
    const esi = getEsiDetails(severityLevel);

    let statusLabel = 'Ready for intake';
    if (triageState.step === 'record') statusLabel = triageState.isRecording ? 'Listening for symptoms...' : 'Recorder armed';
    if (triageState.step === 'processing') statusLabel = 'Detecting symptoms and assessing severity...';
    if (triageState.step === 'result') statusLabel = 'Clinical summary generated';

    return {
      hasResult,
      statusLabel,
      score,
      severityLevel: severityLevel ?? 'Pending',
      esiLevel: esi.esiLevel,
      esiStatus: esi.status,
      esiBars: esi.bars,
      activeZone: hasResult ? getZoneFromText(translatedText) : 'Awaiting input',
      symptoms: hasResult ? extractSymptoms(translatedText, problemFallback) : ['Waiting for symptom details'],
      transcriptText: hasResult
        ? translatedText
        : liveTranscriptText.trim() || 'Tap Start Voice to begin.',
    };
  }, [triageState]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[150px]"></div>
      
      <Navbar />
      
      <main className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-7xl flex-col items-center px-6 pb-20 pt-32 md:px-8 relative z-10">
        <div className={`mb-10 w-full text-center space-y-3 ${isSpeakStage ? '-mt-2' : ''}`}>
          {isSpeakStage ? (
            <>
              <h1 className="font-headline text-4xl font-bold tracking-tight md:text-5xl">
                Tap to <span className="italic text-primary">Speak</span>
              </h1>
            </>
          ) : (
            <>
              <h1 className="font-headline text-4xl font-bold tracking-tight md:text-5xl">Voice Diagnostic Lab</h1>
              <p className="mx-auto max-w-2xl text-muted-foreground">Describe your symptoms in your preferred language. Our clinical AI will assess severity and provide immediate guidance.</p>
            </>
          )}
        </div>

        <div
          className={`w-full ${
            showClinicalPanel || showResultBackground
              ? 'grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-stretch'
              : 'grid grid-cols-1 gap-6 xl:grid-cols-[220px_minmax(0,1fr)_300px] xl:items-start'
          }`}
        >
          {!showClinicalPanel && !showResultBackground && (
            <aside className="hidden xl:flex flex-col gap-4">
              <div className="rounded-2xl border border-primary/15 bg-card/90 p-4 shadow-lg shadow-primary/5">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/70">Session Info</p>
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Current Language</p>
                    <p className="mt-1 text-lg font-headline font-semibold text-primary">{triageState.selectedLanguage}</p>
                  </div>
                  <div className="h-px bg-border/70" />
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Session ID</p>
                    <p className="mt-1 text-xs font-mono text-foreground/80">MV-8829-QX</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-primary/15 bg-card/90 p-4 shadow-lg shadow-primary/5">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/70">Live Insights</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Latency</span>
                  <span className="font-mono text-primary">124ms</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-primary/15">
                  <div className="h-full w-[82%] bg-primary" />
                </div>
              </div>
            </aside>
          )}

          <div className={`w-full max-w-3xl ${showClinicalPanel ? 'xl:max-w-none' : 'mx-auto xl:max-w-none'} relative z-20`}>
            <TriageInterface 
              onStateChange={handleTriageStateChange}
              onRestart={() => setIsRestarting(true)}
            />
          </div>

          {(showClinicalPanel || showResultBackground) && (
          <aside className={`h-full w-full space-y-4 xl:sticky xl:top-28 xl:flex xl:flex-col ${showResultBackground ? 'pointer-events-none' : ''}`}>
            <div className="overflow-hidden rounded-2xl border border-primary/20 bg-card/95 shadow-xl shadow-primary/10 xl:flex-1">
              <div className="border-b border-border/60 px-5 pb-3 pt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/70">Clinical State</p>
              </div>

              <div className="space-y-3 p-5 h-full">
                <div className="relative flex min-h-[150px] items-center justify-center rounded-xl border border-primary/15 bg-gradient-to-b from-background/60 to-card p-4">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.12),transparent_65%)]" />
                  <div className="relative flex flex-col items-center gap-2 opacity-70">
                    <div className="w-6 h-6 rounded-full bg-slate-500/40" />
                    <div className="w-9 h-16 rounded-xl bg-slate-500/30" />
                    <div className="w-3 h-12 rounded-full bg-slate-500/25 absolute -left-4 top-9" />
                    <div className="w-3 h-12 rounded-full bg-slate-500/25 absolute -right-4 top-9" />
                    <div className="w-3 h-12 rounded-full bg-slate-500/25" />
                    <div className="w-3 h-12 rounded-full bg-slate-500/25 absolute right-[46%] top-[88px] translate-x-7" />
                    <span
                      className={`absolute top-[54px] right-[40%] h-3 w-3 rounded-full shadow-[0_0_14px_rgba(251,113,133,0.9)] ${
                        triageState.step === 'processing' ? 'animate-ping bg-amber-300' : panelView.hasResult ? 'animate-pulse bg-rose-400' : 'bg-slate-500/40'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/70">Active Zone</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-rose-400">{panelView.activeZone}</p>
                </div>

                <div className="rounded-lg border border-primary/15 bg-background/50 px-3 py-2">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary/65">Status</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{panelView.statusLabel}</p>
                </div>

                <div className="rounded-lg border border-primary/15 bg-background/50 px-3 py-2">
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-primary/65">Possible Symptoms</p>
                  <div className="flex flex-wrap gap-1.5">
                    {panelView.symptoms.map((symptom) => (
                      <span key={symptom} className="rounded-md border border-primary/20 bg-primary/15 px-2 py-1 text-[10px] text-primary/90">
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-0">
                  <div className="mb-2 flex items-end justify-between">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/70">Pain Severity</p>
                    <p className="text-2xl font-bold leading-none text-foreground">{String(panelView.score).padStart(2, '0')}<span className="text-xs text-primary/60">/10</span></p>
                  </div>
                  <div className="h-1.5 rounded-full bg-primary/20 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#2dd4bf] via-[#57f1db] to-[#7cf2d4] transition-all duration-700"
                      style={{ width: `${panelView.score * 10}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between font-mono text-[8px] uppercase tracking-[0.18em] text-primary/40">
                    <span>Mild</span>
                    <span>Intense</span>
                    <span>Extremely</span>
                  </div>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-primary/70">Priority: {panelView.severityLevel}</p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card/95 px-5 py-5 shadow-xl shadow-primary/10 xl:min-h-[170px]">
              <div className="absolute -right-4 -top-6 text-primary/8 text-7xl font-bold">!</div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/70">ESI Triage Score</p>
              <p className="mt-1 text-4xl font-bold leading-none text-foreground">Level {panelView.esiLevel}</p>
              <p className="mt-4 max-w-[220px] font-mono text-[11px] uppercase tracking-[0.16em] text-rose-400">{panelView.esiStatus}</p>
              <div className="mt-5 flex items-center gap-2">
                {[0, 1, 2, 3, 4].map((idx) => (
                  <span
                    key={idx}
                    className={`h-2 w-10 rounded-full ${idx < panelView.esiBars ? 'bg-rose-400' : 'bg-primary/15'}`}
                  />
                ))}
              </div>
            </div>

          </aside>
          )}

          {!showClinicalPanel && !showResultBackground && (
            <aside className="hidden xl:flex flex-col gap-4">
              <div className="rounded-2xl border border-primary/15 bg-card/90 p-4 shadow-lg shadow-primary/5">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/70">Current session</p>

                <div className="mt-3 space-y-3 text-sm text-slate-300">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/70">Transcript</p>
                    <p className="mt-1 text-muted-foreground">{panelView.transcriptText}</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/70">Status</p>
                    <p className="mt-1 text-muted-foreground">{panelView.statusLabel}</p>
                  </div>

                  <div className="rounded-lg border border-primary/15 bg-background/50 p-3">
                    <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-primary/70">Detected Key Symptoms</p>
                    <div className="flex flex-wrap gap-1.5">
                      {panelView.symptoms.map((symptom) => (
                        <span key={symptom} className="rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] text-primary/90">
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-card/90 p-4 shadow-lg shadow-primary/5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(45,212,191,0.25),transparent_50%)]" />
                <div className="relative">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary/70">Next Step</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{panelView.hasResult ? 'Review result and book follow-up' : 'Continue speaking with the assistant'}</p>
                </div>
              </div>
            </aside>
          )}
        </div>

        {!isSpeakStage && (
          <section className="mt-10 w-full space-y-6">
            <div className="rounded-3xl border border-primary/25 bg-card/85 p-6 md:p-8 shadow-xl shadow-primary/10">
              <div className="mb-6 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary/80" />
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary/80">My Appointments</p>
              </div>

              {!user && (
                <p className="text-sm text-muted-foreground">Please login to view your saved appointments.</p>
              )}

              {user && appointmentsLoading && (
                <p className="text-sm text-muted-foreground">Loading appointments...</p>
              )}

              {user && !appointmentsLoading && sortedAppointments.length === 0 && (
                <p className="text-sm text-muted-foreground">No appointments found yet. Book one from the Lab Diagnostic result card.</p>
              )}

              {user && sortedAppointments.length > 0 && (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {sortedAppointments.slice(0, 6).map((appointment: any) => (
                    <article key={appointment.id} className="rounded-2xl border border-white/10 bg-background/40 p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-primary" />
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary/80">{appointment.doctorType ?? 'General Practitioner'}</p>
                      </div>
                      <h3 className="text-lg font-headline font-bold">{appointment.problem ?? 'Clinical consultation'}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Status: {appointment.status ?? 'booked'}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-md border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{appointment.bookingDate ?? 'Date pending'}</span>
                        <span className="rounded-md border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{appointment.bookingTime ?? 'Time pending'}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-primary/20 bg-card/80 p-6 md:p-8 shadow-xl shadow-primary/10">
              <div className="mb-6 flex items-center gap-2">
                <History className="h-4 w-4 text-primary/80" />
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary/80">Patient Memory</p>
              </div>

              {!user && (
                <p className="text-sm text-muted-foreground">Please login to see your saved triage history.</p>
              )}

              {user && handoffLoading && <p className="text-sm text-muted-foreground">Loading patient memory...</p>}

              {user && !handoffLoading && sortedHandoffs.length === 0 && (
                <p className="text-sm text-muted-foreground">No patient memory found yet. Complete one voice triage to save it.</p>
              )}

              {user && sortedHandoffs.length > 0 && (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {sortedHandoffs.slice(0, 6).map((handoff: any) => (
                    <article key={handoff.id} className="rounded-3xl border border-primary/20 bg-background/40 p-5 shadow-[0_0_0_1px_rgba(45,212,191,0.08)]">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="rounded-full bg-primary/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-primary">{handoff.severityScore ?? 'Pending'}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{handoff.problem ?? 'Unspecified problem'}</span>
                      </div>
                      <h3 className="text-xl font-headline font-bold leading-tight">{handoff.userName ?? 'Patient Memory'}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{handoff.summary ?? 'No summary available'}</p>
                      {handoff.appointmentMetadata && (
                        <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-3 text-xs text-muted-foreground">
                          <p className="font-semibold text-foreground">Appointment metadata</p>
                          <p>Doctor: {handoff.appointmentMetadata.doctorName ?? 'Not set'}</p>
                          <p>Clinic: {handoff.appointmentMetadata.clinicName ?? 'Not set'}</p>
                          <p>Date/Time: {handoff.appointmentMetadata.bookingDate ?? 'Not set'} {handoff.appointmentMetadata.bookingTime ?? ''}</p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
