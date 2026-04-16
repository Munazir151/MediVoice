'use client';

import { useEffect, useRef, useState } from 'react';
import Vapi from '@vapi-ai/web';
import { AlertCircle, BadgeCheck, Loader2, Mic, Square } from 'lucide-react';

import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { analyzeDrugInteractionWithBackend, type DrugInteractionMatch } from '@/lib/drug-checker-backend';

const DRUG_CHECKER_ASSISTANT_ID =
  process.env.NEXT_PUBLIC_VAPI_DRUG_CHECKER_ASSISTANT_ID ?? '9515f753-0584-42ac-b4f2-0773752240f2';

const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? '';

const UNKNOWN_DRUG_LABELS = new Set(['unknown', 'unknown drug', 'n/a', 'na', '-']);

// Safety guardrail types and logic
type SafetyProfile = {
  age: string;
  isPregnant: boolean;
  hasKidneyDisease: boolean;
  hasLiverDisease: boolean;
};

type SafetyGuardrail = {
  warnings: string[];
  recommendation: string;
  isEmergency: boolean;
  emergencyReasons: string[];
};

// High-risk drugs during pregnancy
const PREGNANCY_HIGH_RISK_DRUGS = new Set([
  'warfarin', 'isotretinoin', 'methotrexate', 'ace inhibitors', 'statins',
  'tetracyclines', 'thalidomide', 'finasteride', 'misoprostol', 'lithium'
]);

// Nephrotoxic drugs (kidney harmful)
const NEPHROTOXIC_DRUGS = new Set([
  'amphotericin b', 'aminoglycosides', 'nsaids', 'acei', 'ards', 'contrast agents',
  'cisplatin', 'gentamicin', 'tobramycin', 'ifosfamide'
]);

// Hepatotoxic drugs (liver harmful)
const HEPATOTOXIC_DRUGS = new Set([
  'acetaminophen', 'statins', 'antibiotics', 'antifungals', 'antituberculosis',
  'nsaids', 'azathioprine', 'methotrexate', 'amoxicillin', 'flucloxacillin'
]);

function applySafetyGuardrails(match: DrugInteractionMatch, profile: SafetyProfile): SafetyGuardrail {
  const warnings = [...(match.warnings || [])];
  let emergencyReasons: string[] = [];
  let isEmergency = false;
  let adjustedRecommendation = match.recommendation || '';

  // Parse age safely
  const age = parseInt(profile.age, 10) || 0;
  const isDrugNameMatch = (name: string, checkSet: Set<string>) => {
    const lower = name.toLowerCase();
    return Array.from(checkSet).some(drug => lower.includes(drug) || drug.includes(lower));
  };

  // Check pregnancy risks
  if (profile.isPregnant) {
    const drugA = match.drugA.toLowerCase();
    const drugB = match.drugB.toLowerCase();
    if (isDrugNameMatch(drugA, PREGNANCY_HIGH_RISK_DRUGS) || isDrugNameMatch(drugB, PREGNANCY_HIGH_RISK_DRUGS)) {
      warnings.push('⚠️ One or both drugs are high-risk during pregnancy. Consult OB/GYN before use.');
      adjustedRecommendation = 'CONSULT OB/GYN IMMEDIATELY before taking these drugs during pregnancy.';
      if (match.interactionSeverity === 'Red') {
        isEmergency = true;
        emergencyReasons.push('Pregnancy + high-risk drug + Red severity');
      }
    }
  }

  // Check pediatric risks (age <= 12)
  if (age > 0 && age <= 12) {
    warnings.push(`⚠️ Pediatric profile (age ${age}): Dosage must be age-adjusted. Consult pediatrician.`);
    if (match.interactionSeverity === 'Red') {
      adjustedRecommendation = 'PEDIATRIC DOSING REQUIRED. Consult pediatrician before administration.';
    }
  }

  // Check geriatric risks (age >= 65)
  if (age >= 65) {
    warnings.push(`⚠️ Senior profile (age ${age}): Increased sensitivity to drug interactions. Use lowest effective dose.`);
    if (match.interactionSeverity === 'Red') {
      adjustedRecommendation = 'HIGH RISK in seniors. Consult geriatrician or pharmacist before use.';
    }
  }

  // Check kidney disease risks
  if (profile.hasKidneyDisease) {
    const drugA = match.drugA.toLowerCase();
    const drugB = match.drugB.toLowerCase();
    if (isDrugNameMatch(drugA, NEPHROTOXIC_DRUGS) || isDrugNameMatch(drugB, NEPHROTOXIC_DRUGS)) {
      warnings.push('⚠️ Kidney disease detected: One or both drugs may be nephrotoxic. Requires dose adjustment.');
      adjustedRecommendation = 'KIDNEY DISEASE RISK. Consult nephrologist for safe dosing.';
      if (match.interactionSeverity === 'Red') {
        isEmergency = true;
        emergencyReasons.push('Kidney disease + nephrotoxic drug + Red severity');
      }
    }
  }

  // Check liver disease risks
  if (profile.hasLiverDisease) {
    const drugA = match.drugA.toLowerCase();
    const drugB = match.drugB.toLowerCase();
    if (isDrugNameMatch(drugA, HEPATOTOXIC_DRUGS) || isDrugNameMatch(drugB, HEPATOTOXIC_DRUGS)) {
      warnings.push('⚠️ Liver disease detected: One or both drugs may be hepatotoxic. Requires dose adjustment.');
      adjustedRecommendation = 'LIVER DISEASE RISK. Consult hepatologist for safe dosing.';
      if (match.interactionSeverity === 'Red') {
        isEmergency = true;
        emergencyReasons.push('Liver disease + hepatotoxic drug + Red severity');
      }
    }
  }

  // Critical emergency escalation: Red severity + multiple risk factors or multiple warnings
  if (match.interactionSeverity === 'Red' && (warnings.length > 3 || emergencyReasons.length > 0)) {
    if (!isEmergency) {
      isEmergency = true;
      emergencyReasons.push('Red severity interaction with safety profile concerns');
    }
  }

  return {
    warnings,
    recommendation: adjustedRecommendation,
    isEmergency,
    emergencyReasons,
  };
}

function getSeverityStyles(severity: DrugInteractionMatch['interactionSeverity']) {
  switch (severity) {
    case 'Red':
      return {
        container: 'border-red-500/25 bg-red-500/10 text-red-200',
        badge: 'border-red-400/30 bg-red-500/20 text-red-200',
      };
    case 'Green':
      return {
        container: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100',
        badge: 'border-emerald-400/30 bg-emerald-500/20 text-emerald-100',
      };
    default:
      return {
        container: 'border-amber-500/25 bg-amber-500/10 text-amber-100',
        badge: 'border-amber-400/30 bg-amber-500/20 text-amber-100',
      };
  }
}

function getRiskScore(severity: DrugInteractionMatch['interactionSeverity'], similarity: number) {
  const base = severity === 'Red' ? 92 : severity === 'Yellow' ? 62 : 28;
  const confidenceBonus = Math.min(8, Math.max(0, Math.round(similarity * 10)));
  return Math.min(100, base + confidenceBonus);
}

function normalizeDrugName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

function isUnknownDrugName(name: string) {
  const normalized = normalizeDrugName(name).toLowerCase();
  return !normalized || UNKNOWN_DRUG_LABELS.has(normalized);
}

function extractDrugPair(query: string): [string, string] {
  const cleaned = query
    .replace(/\b(take|taking|using|use|tablet|capsule|dose|mg|ml|please|check|interaction|between)\b/gi, ' ')
    .replace(/[?.!]/g, ' ')
    .trim();

  const parts = cleaned
    .split(/\b(?:and|with|plus|vs|versus)\b|,|\+|&/gi)
    .map((part) => normalizeDrugName(part))
    .filter(Boolean);

  if (parts.length >= 2) {
    return [parts[0], parts[1]];
  }

  if (parts.length === 1) {
    return [parts[0], ''];
  }

  return ['Drug not captured', ''];
}

function resolveDisplayPair(match: DrugInteractionMatch, fallbackPair: [string, string]) {
  const left = isUnknownDrugName(match.drugA) ? fallbackPair[0] : match.drugA;
  const right = isUnknownDrugName(match.drugB) ? fallbackPair[1] : match.drugB;
  return {
    drugA: left,
    drugB: right,
  };
}

function formatDrugDisplay(drugA: string, drugB: string) {
  const left = normalizeDrugName(drugA);
  const right = normalizeDrugName(drugB);
  return right ? `${left} + ${right}` : left;
}

export default function DrugCheckerPage() {
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [results, setResults] = useState<DrugInteractionMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [patientAge] = useState('');
  const [isPregnant] = useState(false);
  const [hasKidneyDisease] = useState(false);
  const [hasLiverDisease] = useState(false);
  const vapiRef = useRef<any>(null);
  const transcriptRef = useRef('');
  const analysisStartedRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (vapiRef.current) {
        void vapiRef.current.stop?.();
      }
    };
  }, []);

  const analyzeTranscript = async (value: string) => {
    const cleaned = value.trim();
    if (!cleaned) {
      setError('No drug names were captured.');
      return;
    }

    setTranscript(cleaned);
    setIsAnalyzing(true);
    setError(null);
    try {
      const matches = await analyzeDrugInteractionWithBackend({
        transcript: cleaned,
        languageCode: 'en-US',
        topK: 3,
      });

      setResults(matches);
      if (matches.length === 0) {
        setError('No drug interaction match was returned from Qdrant.');
      }
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'Drug interaction analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startListening = async () => {
    if (!VAPI_PUBLIC_KEY) {
      setError('Missing NEXT_PUBLIC_VAPI_PUBLIC_KEY.');
      return;
    }
    if (isConnecting) {
      return;
    }

    setIsConnecting(true);
    setError(null);
    setTranscript('');
    setResults([]);
    transcriptRef.current = '';
    analysisStartedRef.current = false;

    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    vapi.on('call-start', () => {
      setIsConnecting(false);
      setIsListening(true);
    });

    vapi.on('message', (message: any) => {
      if (message?.type !== 'transcript' || message?.role !== 'user') {
        return;
      }

      const text = String(message?.transcript ?? '').trim();
      if (!text) {
        return;
      }

      if (message?.transcriptType === 'final') {
        transcriptRef.current = transcriptRef.current ? `${transcriptRef.current} ${text}` : text;
        setTranscript(transcriptRef.current);
      } else {
        const live = transcriptRef.current ? `${transcriptRef.current} ${text}` : text;
        setTranscript(live);
      }
    });

    vapi.on('call-end', () => {
      setIsConnecting(false);
      setIsListening(false);
      if (analysisStartedRef.current) {
        return;
      }

      const captured = transcriptRef.current.trim();
      if (!captured) {
        setError('No transcript captured from the voice session.');
        return;
      }

      analysisStartedRef.current = true;
      void analyzeTranscript(captured);
    });

    vapi.on('error', (vapiError: any) => {
      setIsConnecting(false);
      setIsListening(false);
      const message =
        vapiError?.message ??
        vapiError?.error?.message ??
        vapiError?.data?.message ??
        'Voice session error.';
      setError(String(message));
    });

    try {
      await vapi.start(DRUG_CHECKER_ASSISTANT_ID, {
        variableValues: {
          feature: 'drug-checker',
          languageCode: 'en-US',
        },
      });
    } catch (startError) {
      setIsConnecting(false);
      setIsListening(false);
      setError(startError instanceof Error ? startError.message : 'Failed to connect voice session.');
      return;
    }

    vapi.send({
      type: 'add-message',
      message: {
        role: 'system',
        content: [
          'You are a voice-activated drug interaction checker.',
          'Ask the user to say one or two drug names clearly.',
          'Keep responses brief.',
        ].join(' '),
      },
      triggerResponseEnabled: false,
    });

    toast({
      title: 'Drug checker ready',
      description: 'Say one or two drug names to analyze.',
    });
  };

  const stopListening = async () => {
    setIsConnecting(false);
    if (!vapiRef.current) {
      setIsListening(false);
      return;
    }

    await vapiRef.current.stop();
    setIsListening(false);
  };

  const clearSession = () => {
    setTranscript('');
    setResults([]);
    setError(null);
    transcriptRef.current = '';
    analysisStartedRef.current = false;
  };

  const topResult = results[0];
  const severityStyles = topResult ? getSeverityStyles(topResult.interactionSeverity) : null;
  const riskScore = topResult ? getRiskScore(topResult.interactionSeverity, topResult.score) : 0;
  const alternativeResults = results.slice(1);
  const inferredPair = extractDrugPair(transcript);
  const topDisplayPair = topResult ? resolveDisplayPair(topResult, inferredPair) : null;
  
  // Apply safety guardrails
  const safetyGuardrails = topResult ? applySafetyGuardrails(topResult, {
    age: patientAge,
    isPregnant,
    hasKidneyDisease,
    hasLiverDisease,
  }) : null;
  
  const effectiveWarnings = safetyGuardrails?.warnings ?? topResult?.warnings ?? [];
  const effectiveRecommendation = safetyGuardrails?.recommendation || topResult?.recommendation || '';
  
  const statusLabel = isAnalyzing
    ? 'Analyzing with Qdrant...'
    : isConnecting
      ? 'Connecting to voice assistant...'
    : isListening
      ? 'Recorder armed'
      : topResult
        ? 'Clinical summary generated'
        : 'Type or tap voice to begin.';

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[150px]" />

      <Navbar />

      <main className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-7xl flex-col px-6 pb-20 pt-32 md:px-8 relative z-10">
        <div className="mb-6 w-full text-center space-y-3">
          <h1 className="font-headline text-4xl font-bold tracking-tight md:text-5xl">
            Drug Checker <span className="italic text-primary">Assistant</span>
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Type one drug for profile info or two drugs for interaction checks. Results update below instantly.
          </p>
        </div>

        <div className="w-full">
          <div className="space-y-5 lg:sticky lg:top-24 lg:z-20 lg:rounded-2xl lg:bg-background/60 lg:backdrop-blur-sm lg:p-2">

            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div
              className="group relative flex h-[300px] w-full items-center justify-center rounded-2xl border border-primary/20 bg-card/80 transition-all duration-300 hover:border-primary/40"
              onClick={isAnalyzing ? undefined : () => void (isListening || isConnecting ? stopListening() : startListening())}
              role="button"
              aria-label={isListening || isConnecting ? 'Stop voice capture' : 'Start voice capture'}
            >
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.18),transparent_65%)]" />

              <div className="relative flex flex-col items-center gap-6 px-6 text-center">
                <div className="flex h-16 items-center gap-1.5">
                  {[0.35, 0.6, 0.42, 0.85, 0.55, 0.78, 0.3, 0.62, 0.4].map((height, index) => (
                    <div
                      key={index}
                      className={`w-1.5 rounded-full ${isListening ? 'bg-primary animate-waveform' : 'bg-primary/70'}`}
                      style={{
                        height: isListening ? `${height * 100}%` : `${28 + (index % 3) * 14}%`,
                        animationDelay: `${index * 0.08}s`,
                      }}
                    />
                  ))}
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary/70">Voice Drug Check</span>
                <span className="text-xs text-muted-foreground">
                  {isConnecting
                    ? 'Connecting... tap again to stop.'
                    : isListening
                      ? 'Listening live. Say one or two drug names.'
                      : 'Tap here to start voice check.'}
                </span>
              </div>

              <div className="absolute right-3 top-3">
                {isConnecting ? (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/90 text-primary-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </span>
                ) : isListening ? (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground">
                    <Square className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/90 text-primary-foreground">
                    <Mic className="h-4 w-4" />
                  </span>
                )}
              </div>
            </div>

            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-5">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/75">Current session</p>

                <div className="mt-3 space-y-3 text-sm text-slate-300">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/70">Transcript</p>
                    <p className="mt-1 text-muted-foreground">{transcript || 'Tap Start Voice to begin.'}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/70">Status</p>
                    <div className="mt-1 flex items-center gap-2 text-foreground/90">
                      {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <BadgeCheck className="h-4 w-4 text-emerald-400" />}
                      <span>{statusLabel}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={isListening || isConnecting ? () => void stopListening() : () => void startListening()} disabled={isAnalyzing}>
                    {isListening || isConnecting ? (
                      <>
                        <Square className="h-4 w-4" /> Stop Voice
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4" /> Start Voice
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" onClick={clearSession} disabled={isListening || isAnalyzing}>
                    Reset Session
                  </Button>
                </div>
              </CardContent>
            </Card>
            </div>
          </div>

          <div className="mt-5 w-full">
            <Card className="w-full border-white/10 bg-white/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold">Interaction result</h2>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/70">Top Qdrant match</span>
                </div>

                {topResult && severityStyles ? (
                  <div className={`mt-4 rounded-2xl border p-5 ${severityStyles.container}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {formatDrugDisplay(topDisplayPair?.drugA ?? '', topDisplayPair?.drugB ?? '')}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] opacity-80">Interaction severity</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${severityStyles.badge}`}>
                        {topResult.interactionSeverity}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-300">Safe dosage</p>
                        <p className="mt-2 text-sm text-white">{topResult.safeDosage}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-300">Similarity score</p>
                        <p className="mt-2 font-mono text-sm text-white">{topResult.score.toFixed(3)}</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="mb-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-slate-300">
                        <span>Risk meter</span>
                        <span>{riskScore}%</span>
                      </div>
                      <Progress value={riskScore} className="h-2 bg-white/10" />
                    </div>

                    {effectiveRecommendation && <p className="mt-4 text-sm leading-6 text-white font-semibold">{effectiveRecommendation}</p>}
                    {topResult.summary && <p className="mt-3 text-sm leading-6 text-slate-300">{topResult.summary}</p>}
                    {effectiveWarnings.length > 0 && (
                      <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                        <div className="mb-2 flex items-center gap-2 font-semibold">
                          <AlertCircle className="h-4 w-4" />
                          Safety warnings (with guardrails)
                        </div>
                        <ul className="space-y-1">
                          {effectiveWarnings.map((warning, index) => (
                            <li key={`warning-${index}-${warning}`}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-sm text-slate-300">
                    No interaction checked yet. Start a voice session to analyze drug names.
                  </div>
                )}

                {alternativeResults.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.2em] text-primary/75">Alternative matches</p>
                    <div className="grid gap-2">
                      {alternativeResults.map((match) => {
                        const displayPair = resolveDisplayPair(match, inferredPair);
                        return (
                          <div key={match.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm text-foreground">{formatDrugDisplay(displayPair.drugA, displayPair.drugB)}</p>
                              <span className="rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em]">
                                {match.interactionSeverity}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{match.safeDosage}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Emergency Red-Flag CTA Banner */}
        {safetyGuardrails?.isEmergency && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-2xl rounded-2xl border border-red-500/40 bg-gradient-to-r from-red-600/95 to-red-700/95 backdrop-blur-sm shadow-2xl p-4 text-white">
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-bold flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  MEDICAL EMERGENCY ALERT
                </p>
                <p className="text-xs mt-1 text-red-100 font-semibold">
                  {safetyGuardrails.emergencyReasons.join(' • ')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  onClick={() => window.open('https://www.google.com/maps/search/emergency+room+near+me', '_blank')}
                  className="h-8 px-3 bg-white text-red-600 hover:bg-red-50 text-xs font-bold"
                >
                  📍 Go to ER
                </Button>
                <Button
                  onClick={() => window.location.href = 'tel:112'}
                  className="h-8 px-3 bg-yellow-400 text-red-900 hover:bg-yellow-300 text-xs font-bold"
                >
                  📞 Call Emergency
                </Button>
                <Button
                  onClick={() => window.open('https://www.google.com/maps/search/doctor+near+me', '_blank')}
                  className="h-8 px-3 bg-blue-500 text-white hover:bg-blue-600 text-xs font-bold"
                >
                  👨‍⚕️ Contact Doctor
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
