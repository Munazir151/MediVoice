"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Database,
  BadgeIndianRupee,
  MapPin,
  Languages,
  Loader2,
  Mic,
  Square,
} from 'lucide-react';
import Vapi from '@vapi-ai/web';
import { useToast } from '@/hooks/use-toast';
import { analyzeTranscriptWithBackend, searchQdrantKnowledge, searchSchemeCoverage, type SchemeCoverageMatch } from '@/lib/triage-backend';
import { extractAppointmentDetails } from '@/lib/appointment-extraction';
import {
  getDoctorByName,
  getDoctorsBySpecialty,
  getSlotsForSpecialty,
  getSuggestedDoctor,
} from '@/lib/doctor-directory';
import { CLINIC_DIRECTORY, SCHEME_OPTIONS, type ClinicDirectoryItem } from '@/lib/clinic-directory';
import type { PatientVoiceSymptomCaptureOutput } from '@/ai/flows/patient-voice-symptom-capture-flow';
import type { ClinicalTriageSeverityAssessmentOutput } from '@/ai/flows/clinical-triage-severity-assessment-flow';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const LANGUAGES = [
  { name: 'English', code: 'en-US', key: 'en' },
  { name: 'Hindi', code: 'hi-IN', key: 'hi' },
  { name: 'Kannada', code: 'kn-IN', key: 'kn' },
  { name: 'Marathi', code: 'mr-IN', key: 'mr' },
  { name: 'Bengali', code: 'bn-IN', key: 'bn' },
  { name: 'Tamil', code: 'ta-IN', key: 'ta' },
] as const;

type LanguageOption = (typeof LANGUAGES)[number];

const VOICE_MAP: Record<string, string> = {
  en: process.env.NEXT_PUBLIC_VAPI_VOICE_ID_EN ?? '',
  hi: process.env.NEXT_PUBLIC_VAPI_VOICE_ID_HI ?? '',
  mr: process.env.NEXT_PUBLIC_VAPI_VOICE_ID_MR ?? '',
  bn: process.env.NEXT_PUBLIC_VAPI_VOICE_ID_BN ?? '',
  ta: process.env.NEXT_PUBLIC_VAPI_VOICE_ID_TA ?? '',
  kn: process.env.NEXT_PUBLIC_VAPI_VOICE_ID_KN ?? '',
};

const WAVEFORM_HEIGHTS = [45, 72, 38, 91, 55, 84, 29, 66, 41];

const NearbyClinicMap = dynamic(() => import('@/components/triage/NearbyClinicMap'), {
  ssr: false,
});

export type TriageStep = 'lang' | 'record' | 'processing' | 'result';

export type TriageSessionResult = {
  problem?: string;
  capture: PatientVoiceSymptomCaptureOutput;
  assessment: ClinicalTriageSeverityAssessmentOutput;
  summary?: string;
  redFlags?: string[];
  recommendedAction?: string;
  overallConfidence?: number;
  validationNotes?: string[];
  evidenceSummary?: string[];
  medicineSuggestions?: Array<{
    name: string;
    rxcui?: string | null;
    source: string;
    category: string;
    reason: string;
    usageNote: string;
    warnings: string[];
  }>;
  doctorHandoffDocument?: string;
  qdrantMatches?: Array<{
    id: string;
    problemLabel: string;
    severityScore: 'Green' | 'Yellow' | 'Red';
    score: number;
    icd10Code?: string;
    specialty?: string;
    summary?: string;
  }>;
};

type TriageInterfaceProps = {
  onStateChange?: (state: {
    step: TriageStep;
    isRecording: boolean;
    selectedLanguage: string;
    liveTranscript: string;
    result: TriageSessionResult | null;
  }) => void;
  onRestart?: () => void;
  preloadedSessionId?: string | null;
  preloadedLanguage?: string;
  preloadedResult?: TriageSessionResult | null;
};

export function TriageInterface({
  onStateChange,
  onRestart,
  preloadedSessionId,
  preloadedLanguage,
  preloadedResult,
}: TriageInterfaceProps) {
  const [step, setStep] = useState<TriageStep>('record');
  const [selectedLang, setSelectedLang] = useState<LanguageOption>(LANGUAGES[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionState, setSessionState] = useState<'idle' | 'connecting' | 'connected' | 'analyzing'>('idle');
  const [result, setResult] = useState<TriageSessionResult | null>(null);
  const [bookingStarted, setBookingStarted] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorType, setDoctorType] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [confirmBooking, setConfirmBooking] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [patientHealth, setPatientHealth] = useState({
    age: null as number | null,
    isPregnant: false,
    chronicConditions: [] as string[],
    allergies: [] as string[],
  });
  const [extractedAppointmentDetails, setExtractedAppointmentDetails] = useState<{
    date: string;
    time: string;
    doctorType: string;
    confidence: number;
  } | null>(null);
  const [showAutoExtractedMessage, setShowAutoExtractedMessage] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<(typeof SCHEME_OPTIONS)[number]>('Any');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'locating' | 'ready' | 'denied' | 'unsupported'>('idle');
  const [liveNearbyClinics, setLiveNearbyClinics] = useState<Array<ClinicDirectoryItem & { distanceKm: number }>>([]);
  const [liveNearbyLoading, setLiveNearbyLoading] = useState(false);
  const [liveNearbyError, setLiveNearbyError] = useState<string | null>(null);
  const [schemeCoverageMatches, setSchemeCoverageMatches] = useState<SchemeCoverageMatch[]>([]);
  const [schemeCoverageLoading, setSchemeCoverageLoading] = useState(false);
  const handoffDocIdRef = useRef<string | null>(null);
  const ragFallbackAttemptedRef = useRef(false);
  const schemeCoverageAttemptedRef = useRef(false);

  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const vapiRef = useRef<any>(null);
  const transcriptRef = useRef('');
  const transcriptTurnsRef = useRef<Array<{ speaker: 'Vapi' | 'Patient'; text: string; finalized: boolean }>>([]);
  const latestUserPartialRef = useRef('');
  const stopRequestedRef = useRef(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const analysisStartedRef = useRef(false);
  const appliedPreloadedSessionRef = useRef<string | null>(null);

  const extractTranscriptText = (value: unknown) => {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (Array.isArray(value)) {
      return value
        .map((part: any) => String(part?.text ?? part ?? '').trim())
        .filter(Boolean)
        .join(' ')
        .trim();
    }

    return String(value ?? '').trim();
  };

  const syncLiveTranscript = () => {
    const nextTranscript = transcriptTurnsRef.current.map((turn) => `${turn.speaker}: ${turn.text}`).join('\n');
    setLiveTranscript(nextTranscript);
  };

  const recordTranscriptTurn = (speaker: 'Vapi' | 'Patient', text: string, isFinal: boolean) => {
    const normalizedText = text.trim();
    if (!normalizedText) {
      return;
    }

    const turns = transcriptTurnsRef.current;
    const lastTurn = turns[turns.length - 1];

    if (lastTurn && lastTurn.speaker === speaker && !lastTurn.finalized) {
      turns[turns.length - 1] = {
        speaker,
        text: normalizedText,
        finalized: isFinal,
      };
    } else {
      turns.push({
        speaker,
        text: normalizedText,
        finalized: isFinal,
      });
    }

    syncLiveTranscript();
  };

  const applyConversationSnapshot = (messages: any[]) => {
    const turns: Array<{ speaker: 'Vapi' | 'Patient'; text: string; finalized: boolean }> = [];
    const userTurns: string[] = [];

    messages.forEach((entry) => {
      const role = String(entry?.role ?? '').toLowerCase();
      const speaker = role === 'assistant' ? 'Vapi' : role === 'user' ? 'Patient' : null;
      if (!speaker) {
        return;
      }

      const text = extractTranscriptText(entry?.content);
      if (!text) {
        return;
      }

      turns.push({
        speaker,
        text,
        finalized: true,
      });

      if (speaker === 'Patient') {
        userTurns.push(text);
      }
    });

    if (turns.length === 0) {
      return;
    }

    transcriptTurnsRef.current = turns;
    transcriptRef.current = userTurns.join(' ').trim();
    latestUserPartialRef.current = '';
    syncLiveTranscript();
  };

  useEffect(() => {
    onStateChange?.({
      step,
      isRecording,
      selectedLanguage: selectedLang.name,
      liveTranscript,
      result,
    });
  }, [step, isRecording, selectedLang.name, liveTranscript, result, onStateChange]);

  useEffect(() => {
    if (!preloadedResult || !preloadedSessionId) {
      return;
    }

    if (appliedPreloadedSessionRef.current === preloadedSessionId) {
      return;
    }

    appliedPreloadedSessionRef.current = preloadedSessionId;
    setResult(preloadedResult);
    setStep('result');
    setSessionState('idle');
    setIsRecording(false);
    setLiveTranscript('');
    transcriptTurnsRef.current = [];
    transcriptRef.current = '';
    latestUserPartialRef.current = '';
    setBookingStarted(false);
    setConfirmBooking(false);
    setBookingDone(false);
    setExtractedAppointmentDetails(null);
    setShowAutoExtractedMessage(false);

    if (preloadedLanguage) {
      const fromName = LANGUAGES.find((lang) => lang.name === preloadedLanguage);
      const fromCode = LANGUAGES.find((lang) => lang.code === preloadedLanguage);
      if (fromName) {
        setSelectedLang(fromName);
      } else if (fromCode) {
        setSelectedLang(fromCode);
      }
    }
  }, [preloadedResult, preloadedSessionId, preloadedLanguage]);

  useEffect(() => {
    const loadPatientHealth = async () => {
      if (!db || !user?.uid) return;
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const docRef = doc(db, 'patientProfiles', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPatientHealth({
            age: data.age ?? null,
            isPregnant: data.pregnancy ?? false,
            chronicConditions: data.chronicDiseases ?? [],
            allergies: data.allergies ?? [],
          });
        }
      } catch (error) {
        console.error('Failed to load patient health profile:', error);
      }
    };
    loadPatientHealth();
  }, [db, user?.uid]);

  useEffect(() => {
    const originalConsoleError = console.error;

    console.error = (...args: unknown[]) => {
      const message = args
        .map((value) => String(value ?? ''))
        .join(' ')
        .toLowerCase();

      const isBenignVapiNoise =
        message.includes('meeting ended due to ejection') ||
        message.includes('meeting has ended') ||
        message.includes('send transport changed to disconnected') ||
        message.includes('recv transport changed to disconnected');

      if (isBenignVapiNoise) {
        return;
      }

      originalConsoleError(...args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  const isMeetingEjectionError = (value: unknown) => {
    const text = String(value ?? '').toLowerCase();
    return (
      text.includes('meeting ended due to ejection') ||
      text.includes('meeting has ended') ||
      text.includes('send transport changed to disconnected') ||
      text.includes('recv transport changed to disconnected')
    );
  };

  const formatVapiError = (value: unknown): string => {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (value instanceof Error) {
      return value.message.trim();
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;

      const messageFields = ['message', 'error', 'detail', 'reason', 'description'];
      for (const field of messageFields) {
        const nested = record[field];
        if (!nested) {
          continue;
        }

        const nestedMessage = formatVapiError(nested);
        if (nestedMessage) {
          return nestedMessage;
        }
      }

      try {
        const serialized = JSON.stringify(value, null, 2);
        return serialized === '{}' ? 'Unknown Vapi runtime error.' : serialized;
      } catch {
        return 'Unknown Vapi runtime error.';
      }
    }

    return value == null ? 'Unknown Vapi runtime error.' : String(value);
  };

  const doctorTypeOptions = useMemo(() => {
    const fromQdrant = (result?.qdrantMatches ?? [])
      .map((match) => match.specialty?.trim())
      .filter((value): value is string => Boolean(value));

    const unique = [...new Set(fromQdrant)];
    if (unique.length > 0) {
      return unique;
    }

    const translated = result?.capture.translatedTextEnglish.toLowerCase() ?? '';
    const fallback = ['General Practitioner'];
    if (translated.includes('throat') || translated.includes('cough')) fallback.push('ENT Specialist');
    if (translated.includes('stomach') || translated.includes('abdomen')) fallback.push('Gastroenterologist');
    if (translated.includes('head') || translated.includes('dizzy')) fallback.push('Neurologist');
    if (translated.includes('chest') || translated.includes('breath')) fallback.push('Pulmonologist');
    if (translated.includes('eye') || translated.includes('vision') || translated.includes('sight') || translated.includes('blur') || translated.includes('glare')) {
      fallback.push('Ophthalmologist', 'Eye Specialist');
    }
    return [...new Set(fallback)];
  }, [result]);

  const availableDoctors = useMemo(() => getDoctorsBySpecialty(doctorType || 'General Practitioner'), [doctorType]);
  const availableSlots = useMemo(() => getSlotsForSpecialty(doctorType || 'General Practitioner'), [doctorType]);

  useEffect(() => {
    if (doctorTypeOptions.length > 0 && !doctorType) {
      setDoctorType(doctorTypeOptions[0]);
    }
  }, [doctorTypeOptions, doctorType]);

  const buildDoctorHandoffDocument = (
    sourceResult: TriageSessionResult | null = result,
    appointment?: {
      doctorName?: string;
      clinicName?: string;
      bookingDate?: string;
      bookingTime?: string;
    },
  ) => {
    if (!sourceResult) {
      return '';
    }

    const lines = [sourceResult.doctorHandoffDocument || 'Doctor Handoff Document', ''];

    if (appointment?.doctorName || appointment?.clinicName || appointment?.bookingDate || appointment?.bookingTime) {
      lines.push('## Appointment Metadata');
      if (appointment.doctorName) lines.push(`- Doctor name: ${appointment.doctorName}`);
      if (appointment.clinicName) lines.push(`- Clinic: ${appointment.clinicName}`);
      if (appointment.bookingDate) lines.push(`- Date: ${appointment.bookingDate}`);
      if (appointment.bookingTime) lines.push(`- Time: ${appointment.bookingTime}`);
      lines.push('');
    }

    if (sourceResult.medicineSuggestions && sourceResult.medicineSuggestions.length > 0) {
      lines.push('## Medicine Suggestions');
      sourceResult.medicineSuggestions.forEach((item) => {
        lines.push(`- ${item.name}: ${item.reason} Usage: ${item.usageNote}`);
      });
      lines.push('');
    }

    return lines.join('\n').trim();
  };

  const persistHandoffDocument = async (
    sourceResult: TriageSessionResult | null = result,
    appointment?: {
      doctorName?: string;
      clinicName?: string;
      bookingDate?: string;
      bookingTime?: string;
    },
  ) => {
    if (!db || !user?.uid || !sourceResult) {
      return;
    }

    const handoffText = buildDoctorHandoffDocument(sourceResult, appointment);
    const handoffData = {
      userId: user.uid,
      userEmail: user.email ?? null,
      userName: user.displayName || 'Anonymous Patient',
      problem: sourceResult.problem ?? null,
      severityScore: sourceResult.assessment.severityScore,
      summary: sourceResult.summary ?? null,
      redFlags: sourceResult.redFlags ?? [],
      recommendedAction: sourceResult.recommendedAction ?? null,
      medicineSuggestions: sourceResult.medicineSuggestions ?? [],
      appointmentMetadata: appointment ?? null,
      handoffText,
      source: 'real-time-triage',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (handoffDocIdRef.current) {
      const { createdAt, ...updateData } = handoffData;
      await updateDoc(doc(db, 'doctorHandoffs', handoffDocIdRef.current), updateData);
      return;
    }

    const handoffRef = await addDoc(collection(db, 'doctorHandoffs'), handoffData);
    handoffDocIdRef.current = handoffRef.id;
  };

  const homeCareTips = useMemo(() => {
    if (!result) {
      return [] as string[];
    }

    const text = result.capture.translatedTextEnglish.toLowerCase();
    const tips = new Set<string>();

    if (result.assessment.severityScore !== 'Red') {
      tips.add('Stay well hydrated with warm fluids and avoid dehydration.');
      tips.add('Get adequate rest and avoid heavy physical exertion.');
    }

    if (text.includes('fever')) {
      tips.add('Monitor temperature every 6-8 hours and use lukewarm sponging if needed.');
    }
    if (text.includes('cough') || text.includes('throat')) {
      tips.add('Use warm saline gargles and avoid cold or irritating foods temporarily.');
    }
    if (text.includes('sneez') || text.includes('allerg') || text.includes('eosinophil')) {
      tips.add('Avoid dust, pollen, smoke, and other known triggers; use a mask when going out.');
    }
    if (text.includes('vomit') || text.includes('diarrhea')) {
      tips.add('Take oral rehydration solution in small frequent sips.');
    }
    if (text.includes('chest') || text.includes('breath')) {
      tips.add('Avoid exertion and seek urgent care immediately if breathing worsens.');
    }

    if (result.assessment.severityScore === 'Red') {
      tips.clear();
      tips.add('Do not delay: proceed to emergency care immediately.');
      tips.add('Avoid self-medication and keep emergency contact informed.');
    }

    return Array.from(tips).slice(0, 5);
  }, [result]);

  const ragTraceTopHits = useMemo(() => {
    const matches = result?.qdrantMatches ?? [];
    return [...matches]
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .map((match) => ({
        ...match,
        similarityLabel: Number.isFinite(match.score) ? match.score.toFixed(3) : '0.000',
        icd10Label: (match.icd10Code || '').trim() || 'Not mapped',
      }));
  }, [result?.qdrantMatches]);

  const clinicSpecialtyFilter = useMemo(() => {
    if (doctorType) {
      return doctorType;
    }
    if (doctorTypeOptions.length > 0) {
      return doctorTypeOptions[0];
    }
    return 'General Practitioner';
  }, [doctorType, doctorTypeOptions]);

  const fallbackNearbyClinics = useMemo(() => {
    if (!userLocation) {
      return [] as Array<ClinicDirectoryItem & { distanceKm: number }>;
    }

    const toRadians = (value: number) => (value * Math.PI) / 180;
    const distanceKm = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
      const earthRadiusKm = 6371;
      const deltaLat = toRadians(to.lat - from.lat);
      const deltaLng = toRadians(to.lng - from.lng);
      const lat1 = toRadians(from.lat);
      const lat2 = toRadians(to.lat);
      const haversine =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2) * Math.cos(lat1) * Math.cos(lat2);
      const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
      return earthRadiusKm * arc;
    };

    return CLINIC_DIRECTORY.filter((clinic) => clinic.specialty === clinicSpecialtyFilter)
      .filter((clinic) => selectedScheme === 'Any' || clinic.schemesAccepted.includes(selectedScheme))
      .map((clinic) => ({
        ...clinic,
        distanceKm: distanceKm(userLocation, { lat: clinic.lat, lng: clinic.lng }),
      }))
      .sort((left, right) => left.distanceKm - right.distanceKm)
      .slice(0, 3);
  }, [clinicSpecialtyFilter, selectedScheme, userLocation]);

  const nearbyClinics = useMemo(() => {
    if (liveNearbyClinics.length > 0) {
      return liveNearbyClinics;
    }
    return fallbackNearbyClinics;
  }, [fallbackNearbyClinics, liveNearbyClinics]);

  useEffect(() => {
    if (step !== 'result' || !result) {
      return;
    }

    if (geoStatus === 'ready' || geoStatus === 'denied' || geoStatus === 'unsupported') {
      return;
    }

    if (!('geolocation' in navigator)) {
      setGeoStatus('unsupported');
      return;
    }

    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGeoStatus('ready');
      },
      () => {
        setGeoStatus('denied');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  }, [geoStatus, result, step]);

  useEffect(() => {
    const fetchLiveNearbyClinics = async () => {
      if (step !== 'result' || !result || !userLocation || geoStatus !== 'ready') {
        return;
      }

      setLiveNearbyLoading(true);
      setLiveNearbyError(null);

      try {
        const params = new URLSearchParams({
          lat: String(userLocation.lat),
          lng: String(userLocation.lng),
          specialty: clinicSpecialtyFilter,
          scheme: selectedScheme,
          limit: '3',
        });

        const response = await fetch(`/api/nearby-clinics?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Unable to fetch nearby clinics from map provider.');
        }

        const data = (await response.json()) as {
          clinics?: Array<ClinicDirectoryItem & { distanceKm: number }>;
        };

        setLiveNearbyClinics(Array.isArray(data.clinics) ? data.clinics : []);
      } catch (error) {
        setLiveNearbyClinics([]);
        setLiveNearbyError(error instanceof Error ? error.message : 'Nearby clinic lookup failed.');
      } finally {
        setLiveNearbyLoading(false);
      }
    };

    void fetchLiveNearbyClinics();
  }, [clinicSpecialtyFilter, geoStatus, result, selectedScheme, step, userLocation]);

  useEffect(() => {
    const hydrateRagTrace = async () => {
      if (!result || step !== 'result') {
        return;
      }

      const existing = result.qdrantMatches ?? [];
      if (existing.length > 0 || ragFallbackAttemptedRef.current) {
        return;
      }

      const transcript = result.capture.translatedTextEnglish?.trim();
      if (!transcript) {
        ragFallbackAttemptedRef.current = true;
        return;
      }

      ragFallbackAttemptedRef.current = true;
      try {
        const raw = await searchQdrantKnowledge({
          transcript,
          languageCode: selectedLang.code,
          topK: 3,
        });

        const payload = raw as { matches?: any[] };
        const matches = Array.isArray(payload?.matches)
          ? payload.matches.map((match) => ({
              id: String(match.id ?? `fallback-${Math.random().toString(36).slice(2)}`),
              problemLabel: String(match.problem_label ?? match.problemLabel ?? 'Unknown problem'),
              severityScore: (match.severity_score ?? match.severityScore ?? 'Yellow') as 'Green' | 'Yellow' | 'Red',
              score: Number(match.score ?? 0),
              icd10Code:
                typeof match.icd10_code === 'string'
                  ? match.icd10_code
                  : typeof match.icd10 === 'string'
                    ? match.icd10
                    : typeof match.icd_code === 'string'
                      ? match.icd_code
                      : undefined,
              specialty: typeof match.specialty === 'string' ? match.specialty : undefined,
              summary: typeof match.summary === 'string' ? match.summary : undefined,
            }))
          : [];

        if (matches.length > 0) {
          setResult((previous) => {
            if (!previous) {
              return previous;
            }
            if ((previous.qdrantMatches ?? []).length > 0) {
              return previous;
            }
            return {
              ...previous,
              qdrantMatches: matches,
            };
          });
        }
      } catch {
        // Keep the "no retrieval hits" state if direct lookup also fails.
      }
    };

    void hydrateRagTrace();
  }, [result, selectedLang.code, step]);

  const autoSurfacedSchemes = useMemo(() => {
    const preferred = ['PM-JAY', 'AYUSHMAN', 'CGHS'];
    const matchedPreferred = schemeCoverageMatches.filter((match) => {
      const label = match.schemeName.toUpperCase();
      return preferred.some((needle) => label.includes(needle));
    });

    const source = matchedPreferred.length > 0 ? matchedPreferred : schemeCoverageMatches;
    return source
      .sort((left, right) => right.score - left.score)
      .slice(0, 2);
  }, [schemeCoverageMatches]);

  const fallbackSchemeMatches = useMemo(() => {
    if (!result) {
      return [] as SchemeCoverageMatch[];
    }

    const baseScore = result.assessment.severityScore === 'Red' ? 0.45 : result.assessment.severityScore === 'Yellow' ? 0.38 : 0.3;
    return [
      {
        id: 'fallback-pmjay',
        schemeName: 'Ayushman Bharat (PM-JAY)',
        coverageAmount: 'Verify specialist consultation, diagnostics, and hospitalization coverage',
        eligibility: 'Check household eligibility and hospital empanelment before booking',
        score: baseScore,
        summary: 'Common public health coverage to verify for specialist eye care.',
      },
      {
        id: 'fallback-state-health',
        schemeName: 'State Health Scheme',
        coverageAmount: 'Verify outpatient and referral coverage with the local state portal',
        eligibility: 'Confirm state-specific eligibility and document requirements',
        score: baseScore - 0.05,
        summary: 'State schemes can help with follow-up care and specialist visits.',
      },
    ];
  }, [result]);

  const displaySchemeMatches = useMemo(() => {
    return autoSurfacedSchemes.length > 0 ? autoSurfacedSchemes : fallbackSchemeMatches;
  }, [autoSurfacedSchemes, fallbackSchemeMatches]);

  const schemeSearchText = useMemo(() => {
    return [result?.problem, result?.summary, result?.capture.translatedTextEnglish]
      .filter((value): value is string => Boolean(value && value.trim()))
      .join(' ')
      .trim();
  }, [result]);

  useEffect(() => {
    const hydrateSchemeCoverage = async () => {
      if (!result || step !== 'result' || schemeCoverageAttemptedRef.current) {
        return;
      }

      const transcript = schemeSearchText;
      if (!transcript) {
        schemeCoverageAttemptedRef.current = true;
        return;
      }

      schemeCoverageAttemptedRef.current = true;
      setSchemeCoverageLoading(true);
      try {
        const matches = await searchSchemeCoverage({
          transcript,
          languageCode: selectedLang.code,
          topK: 5,
        });
        setSchemeCoverageMatches(matches);
      } catch {
        setSchemeCoverageMatches([]);
      } finally {
        setSchemeCoverageLoading(false);
      }
    };

    void hydrateSchemeCoverage();
  }, [result, schemeSearchText, selectedLang.code, step]);

  const processTranscript = async (transcript: string) => {
    setStep('processing');
    setSessionState('analyzing');

    try {
      const backendResult = await analyzeTranscriptWithBackend({
        transcript,
        languageCode: selectedLang.code,
        patientAge: patientHealth.age,
        patientIsPregnant: patientHealth.isPregnant,
        patientChronicConditions: patientHealth.chronicConditions,
        patientAllergies: patientHealth.allergies,
      });

      const triageResult: TriageSessionResult = {
        problem: backendResult.problem,
        capture: backendResult.capture,
        assessment: backendResult.assessment,
        summary: backendResult.summary,
        redFlags: backendResult.redFlags,
        recommendedAction: backendResult.recommendedAction,
        overallConfidence: backendResult.overallConfidence,
        validationNotes: backendResult.validationNotes,
        evidenceSummary: backendResult.evidenceSummary,
        medicineSuggestions: backendResult.medicineSuggestions,
        doctorHandoffDocument: backendResult.doctorHandoffDocument,
        qdrantMatches: backendResult.qdrantMatches,
      };

      setResult(triageResult);

      // Extract appointment details from transcript
      const extractedDetails = extractAppointmentDetails(
        transcript,
        [],
        backendResult.qdrantMatches
      );
      setExtractedAppointmentDetails(extractedDetails);
      setShowAutoExtractedMessage(extractedDetails.wantsBooking);

      const suggestedDoctor = getSuggestedDoctor(extractedDetails.doctorType || 'General Practitioner');
      const defaultDoctorName = suggestedDoctor.name;
      const defaultClinicName = suggestedDoctor.clinicName;

      // Auto-fill booking form with extracted details
      if (extractedDetails.date) {
        setBookingDate(extractedDetails.date);
      }
      if (extractedDetails.time) {
        setBookingTime(extractedDetails.time);
      }
      if (extractedDetails.doctorType) {
        setDoctorType(extractedDetails.doctorType);
      }
      setDoctorName(defaultDoctorName);
      setClinicName(defaultClinicName);

      // Show booking form only if booking intent is present in voice transcript.
      setBookingStarted(extractedDetails.wantsBooking);
      setConfirmBooking(false);
      setBookingDone(false);

      if (db && user?.uid) {
        const sessionData = {
          userId: user.uid,
          userEmail: user?.email ?? null,
          userName: user?.displayName || 'Anonymous Patient',
          nativeLanguage: selectedLang.name,
          problem: backendResult.problem ?? null,
          transcribedTextNative: backendResult.capture.transcribedTextNative,
          translatedTextEnglish: backendResult.capture.translatedTextEnglish,
          severityScore: backendResult.assessment.severityScore,
          guidance: backendResult.assessment.guidance,
          summary: backendResult.summary ?? null,
          redFlags: backendResult.redFlags ?? [],
          recommendedAction: backendResult.recommendedAction ?? null,
          createdAt: serverTimestamp(),
          status: 'active',
        };

        const sessionsRef = collection(db, 'triageSessions');
        addDoc(sessionsRef, sessionData).catch(() => {
          const permissionError = new FirestorePermissionError({
            path: 'triageSessions',
            operation: 'create',
            requestResourceData: sessionData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
      } else if (!userLoading) {
        toast({
          title: 'Sign in to save triage history',
          description: 'Analysis is complete, but this session was not saved because you are not signed in.',
        });
      }

      setStep('result');
      setSessionState('idle');

      if (extractedDetails.wantsBooking && db && user?.uid) {
        const autoDate = extractedDetails.date || getLocalDateString(1);
        const autoTime = extractedDetails.time || '10:00';
        const autoDoctorType = extractedDetails.doctorType || 'General Practitioner';

        try {
          await saveAppointmentRecord(triageResult, {
            bookingDate: autoDate,
            bookingTime: autoTime,
            doctorType: autoDoctorType,
            doctorName: defaultDoctorName,
            clinicName: defaultClinicName,
          });

          setBookingDate(autoDate);
          setBookingTime(autoTime);
          setDoctorType(autoDoctorType);
          setBookingDone(true);
          setBookingStarted(true);

          toast({
            title: 'Appointment booked from voice',
            description: `${autoDate} at ${autoTime} (${autoDoctorType})`,
          });
        } catch (autoBookingError) {
          toast({
            variant: 'destructive',
            title: 'Auto booking failed',
            description: autoBookingError instanceof Error ? autoBookingError.message : 'Unable to auto-book from voice.',
          });
        }
      }

      void persistHandoffDocument(triageResult);
    } catch (err) {
      setSessionState('idle');
      setStep('record');
      toast({
        variant: 'destructive',
        title: 'Real Analysis Failed',
        description: err instanceof Error ? err.message : 'Backend analysis failed.',
      });
    }
  };

  const startRecording = async () => {
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
      const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

      if (!publicKey || !assistantId) {
        throw new Error('Missing NEXT_PUBLIC_VAPI_PUBLIC_KEY or NEXT_PUBLIC_VAPI_ASSISTANT_ID');
      }

      setSessionState('connecting');
      transcriptRef.current = '';
      transcriptTurnsRef.current = [];
      latestUserPartialRef.current = '';
      stopRequestedRef.current = false;
      setLiveTranscript('');
      analysisStartedRef.current = false;

      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;

      vapi.on('call-start', () => {
        setSessionState('connected');
        setIsRecording(true);
      });

      vapi.on('message', (message: any) => {
        if (message?.type === 'transcript') {
          const role = String(message?.role ?? message?.speaker ?? message?.from ?? '').toLowerCase();
          const isAssistant = role.includes('assistant') || role.includes('bot') || role.includes('ai');
          const isUser = role.includes('user') || role.includes('caller') || role.includes('patient') || !role;
          const text = String(message?.transcript ?? '').trim();
          if (!text || (!isAssistant && !isUser)) {
            return;
          }

          const speaker = isAssistant ? 'Vapi' : 'Patient';

          if (message?.transcriptType === 'partial') {
            recordTranscriptTurn(speaker, text, false);
            if (speaker === 'Patient') {
              latestUserPartialRef.current = text;
            }
            return;
          }

          if (message?.transcriptType === 'final') {
            recordTranscriptTurn(speaker, text, true);
            if (speaker === 'Patient') {
              const current = transcriptRef.current.trim();
              if (!current.endsWith(text)) {
                transcriptRef.current = current ? `${current} ${text}` : text;
              }
              latestUserPartialRef.current = '';
            }
          }
          return;
        }

        if (message?.type === 'conversation-update') {
          const updates = Array.isArray(message?.messagesOpenAIFormatted)
            ? message.messagesOpenAIFormatted
            : Array.isArray(message?.messages)
              ? message.messages
              : [];

          if (updates.length > 0) {
            applyConversationSnapshot(updates);
          }
        }
      });

      vapi.on('call-end', () => {
        setIsRecording(false);
        setSessionState('idle');

        if (analysisStartedRef.current) {
          return;
        }

        if (!stopRequestedRef.current) {
          toast({
            title: 'Session interrupted',
            description: 'Voice session ended unexpectedly. Tap Speak to continue, then Stop when you are done.',
          });
          return;
        }

        const transcript = transcriptRef.current.trim() || latestUserPartialRef.current.trim();
        if (!transcript) {
          toast({
            variant: 'destructive',
            title: 'No Transcript Captured',
            description: 'Session ended without a final user transcript.',
          });
          return;
        }

        analysisStartedRef.current = true;
        void processTranscript(transcript);
      });

      vapi.on('error', (error: any) => {
        setIsRecording(false);
        setSessionState('idle');

        const rawMessage = formatVapiError(error);

        if (isMeetingEjectionError(rawMessage)) {
          if (stopRequestedRef.current) {
            const transcript = transcriptRef.current.trim() || latestUserPartialRef.current.trim();
            if (!analysisStartedRef.current && transcript) {
              analysisStartedRef.current = true;
              void processTranscript(transcript);
              return;
            }
          }

          toast({
            title: 'Session ended',
            description: 'The assistant ended the meeting. Tap Speak to continue, then Stop when done.',
          });
          return;
        }

        toast({
          variant: 'destructive',
          title: 'Voice session error',
          description: String(rawMessage),
        });
      });

      const selectedVoiceId = VOICE_MAP[selectedLang.key];
      const assistantOverrides: any = {
        variableValues: {
          language: selectedLang.key,
          languageCode: selectedLang.code,
        },
      };

      if (selectedVoiceId) {
        assistantOverrides.voice = { voiceId: selectedVoiceId };
      }

      await vapi.start(assistantId, assistantOverrides);

      // This controls how Vapi interacts with patients in your app.
      vapi.send({
        type: 'add-message',
        message: {
          role: 'system',
          content: [
            'You are Voice Diagnostic Lab, a clinical triage assistant.',
            'Ask focused follow-up questions after each user response.',
            'Collect symptom details: onset, duration, severity, triggers, and red flags.',
            'Keep language simple and empathetic for patients.',
            'If the user asks about nearby clinics, respond with only clinic names and available slots.',
            'Do not mention scheme names (for example ESIC, CGHS, PM-JAY) in voice responses.',
            'When user says stop, end conversation politely.',
          ].join(' '),
        },
        triggerResponseEnabled: false,
      });

      vapi.say('Please describe your symptoms, how long they have been present, and whether you have fever, pain, breathing issues, sneezing, or allergy triggers.');
      setSessionState('connected');
      setIsRecording(true);
    } catch (err) {
      setSessionState('idle');

      const startupMessage = err instanceof Error ? err.message : String(err ?? '');
      if (isMeetingEjectionError(startupMessage)) {
        if (stopRequestedRef.current) {
          const transcript = transcriptRef.current.trim() || latestUserPartialRef.current.trim();
          if (!analysisStartedRef.current && transcript) {
            analysisStartedRef.current = true;
            void processTranscript(transcript);
            return;
          }
        }

        toast({
          title: 'Session ended',
          description: 'The assistant ended the meeting. Tap Speak to continue, then Stop when done.',
        });
        return;
      }

      toast({
        variant: 'destructive',
        title: 'Voice Session Failed',
        description: startupMessage || 'Unknown Vapi startup failure.',
      });
    }
  };

  const stopSession = async () => {
    if (!isRecording) {
      return;
    }

    stopRequestedRef.current = true;
    setSessionState('analyzing');

    if (!vapiRef.current) {
      setSessionState('idle');
      return;
    }

    try {
      await vapiRef.current.stop();
    } catch (err) {
      setSessionState('idle');
      toast({
        variant: 'destructive',
        title: 'Unable to stop session',
        description: err instanceof Error ? err.message : 'Vapi stop failed.',
      });
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'Red':
        return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'Yellow':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'Green':
        return 'text-accent bg-accent/10 border-accent/20';
      default:
        return 'text-muted-foreground bg-muted border-muted';
    }
  };

  const getConfidenceMetadata = (value?: number) => {
    const score = Number.isFinite(value) ? Math.max(0, Math.min(1, value ?? 0)) : 0;

    if (score >= 0.8) {
      return {
        label: 'High confidence',
        styles: 'text-accent bg-accent/10 border-accent/20',
      };
    }

    if (score >= 0.55) {
      return {
        label: 'Moderate confidence',
        styles: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
      };
    }

    return {
      label: 'Low confidence',
      styles: 'text-destructive bg-destructive/10 border-destructive/20',
    };
  };

  const getMedicinePurchaseUrl = (medicineName: string) => {
    const query = encodeURIComponent(medicineName.trim());
    return `https://pharmeasy.in/search/all?name=${query}`;
  };

  const getLocalDateString = (offsetDays = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const downloadHandoffDocument = () => {
    if (!result) {
      return;
    }

    const text = buildDoctorHandoffDocument(
      result,
      bookingDone
        ? {
            doctorName,
            clinicName,
            bookingDate,
            bookingTime,
          }
        : undefined,
    );

    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `doctor-handoff-${Date.now()}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const bookingFormComplete = Boolean(bookingDate && bookingTime && doctorType && doctorName && clinicName);

  const saveAppointmentRecord = async (
    sourceResult: TriageSessionResult,
    details: {
      bookingDate: string;
      bookingTime: string;
      doctorType: string;
      doctorName: string;
      clinicName: string;
    },
  ) => {
    if (!db) {
      throw new Error('Firestore is not available. Please refresh and try again.');
    }

    if (!user?.uid) {
      throw new Error('Please login first so your appointment is saved to your account.');
    }

    const normalizedDoctorName = details.doctorName.trim();
    const directoryDoctor = getDoctorByName(normalizedDoctorName) ?? getSuggestedDoctor(details.doctorType || 'General Practitioner');
    const finalDoctorName = normalizedDoctorName || directoryDoctor.name;
    const normalizedClinicName = details.clinicName.trim() || directoryDoctor.clinicName;

    const bookingData = {
      userId: user.uid,
      userEmail: user.email ?? null,
      userName: user?.displayName || 'Anonymous Patient',
      status: 'booked',
      doctorName: finalDoctorName,
      bookingDate: details.bookingDate,
      bookingTime: details.bookingTime,
      doctorType: details.doctorType,
      clinicName: normalizedClinicName,
      fromSpokenSymptoms: true,
      nativeLanguage: selectedLang.name,
      severityScore: sourceResult.assessment.severityScore,
      guidance: sourceResult.assessment.guidance,
      problem: sourceResult.problem ?? null,
      summary: sourceResult.summary ?? null,
      transcriptNative: sourceResult.capture.transcribedTextNative,
      transcriptEnglish: sourceResult.capture.translatedTextEnglish,
      createdAt: serverTimestamp(),
    };

    const appointmentsRef = collection(db, 'appointments');
    await addDoc(appointmentsRef, bookingData);

    await persistHandoffDocument(sourceResult, {
      doctorName: finalDoctorName,
      clinicName: normalizedClinicName,
      bookingDate: details.bookingDate,
      bookingTime: details.bookingTime,
    });
  };

  const confirmBookingAppointment = async () => {
    if (!result || !bookingFormComplete || bookingSaving) {
      return;
    }

    setBookingSaving(true);
    try {
      await saveAppointmentRecord(result, {
        bookingDate,
        bookingTime,
        doctorType,
        doctorName,
        clinicName,
      });

      setBookingDone(true);
      setConfirmBooking(false);
      toast({
        title: 'Appointment booked',
        description: `${bookingDate} at ${bookingTime} with ${doctorName}`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Booking failed',
        description: err instanceof Error ? err.message : 'Unable to save appointment.',
      });
    } finally {
      setBookingSaving(false);
    }
  };

  const startBookingFromClinic = (clinic: ClinicDirectoryItem & { distanceKm: number }) => {
    const clinicType = clinic.specialty === 'Hospital' ? 'General Practitioner' : clinic.specialty;
    const suggestedDoctor = getSuggestedDoctor(clinicType);

    setClinicName(clinic.name);
    setDoctorType(clinicType);
    setDoctorName(suggestedDoctor.name);
    if (!bookingDate) {
      setBookingDate(getLocalDateString(1));
    }
    if (!bookingTime) {
      setBookingTime('10:00');
    }
    setBookingStarted(true);
    setConfirmBooking(false);
    setBookingDone(false);

    toast({
      title: 'Appointment booking opened',
      description: `Start booking for ${clinic.name}`,
    });
  };

  return (
    <div className="w-full space-y-8">
      {step === 'record' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          <div className="mx-auto -mt-4 max-w-[520px] rounded-2xl border border-white/10 bg-card/60 px-4 py-3 text-center">
            <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-primary/75">System Status</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {sessionState === 'connecting' && 'Connecting to voice assistant...'}
              {sessionState === 'connected' && 'Assistant connected. You can start describing symptoms now.'}
              {sessionState === 'analyzing' && 'Generating lab diagnostic report...'}
              {sessionState === 'idle' && 'Tap Speak to begin your voice diagnostic session.'}
            </p>
          </div>

          <div
            className={`group relative mx-auto flex h-[300px] w-full max-w-[320px] items-center justify-center rounded-2xl border border-primary/20 bg-card/80 transition-all duration-300 ${!isRecording && sessionState !== 'connecting' ? 'cursor-pointer hover:border-primary/40' : 'cursor-default opacity-95'}`}
            onClick={!isRecording && sessionState !== 'connecting' ? startRecording : undefined}
            role="button"
            aria-label="Speak"
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.18),transparent_65%)]" />

            <div className="relative flex flex-col items-center gap-6">
              <div className="flex h-16 items-center gap-1.5">
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full ${isRecording ? 'bg-primary animate-waveform' : 'bg-primary/70'}`}
                    style={{
                      height: isRecording ? `${WAVEFORM_HEIGHTS[i % WAVEFORM_HEIGHTS.length]}%` : `${28 + (i % 3) * 14}%`,
                      animationDelay: `${i * 0.08}s`,
                    }}
                  />
                ))}
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary/70">Voice Diagnostic Lab</span>
                <span className="text-xs text-muted-foreground">{isRecording ? 'Listening live. Describe onset, pain level, and triggers.' : 'Tap Speak to start the live clinical intake.'}</span>
              </div>
            </div>

            {isRecording && (
              <div className="absolute inset-x-0 bottom-4 flex justify-center">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void stopSession();
                  }}
                  className="rounded-full border border-destructive/30 bg-background/80 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-destructive transition-colors hover:bg-destructive/10"
                >
                  Stop
                </button>
              </div>
            )}

            <div className="absolute right-3 top-3">
              {isRecording ? (
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

          <div className="mx-auto flex max-w-[520px] flex-wrap justify-center gap-2.5 px-1 sm:px-0">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setSelectedLang(lang)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  selectedLang.code === lang.code
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'border border-primary/25 bg-background/50 text-muted-foreground hover:border-primary/45 hover:text-foreground'
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'processing' && (
        <Card className="glass-card rounded-[2.5rem] border-white/5 animate-in fade-in duration-300">
          <CardContent className="p-8 sm:p-12 lg:p-20 text-center space-y-8">
            <div className="relative">
              <Loader2 className="w-24 h-24 text-primary animate-spin mx-auto opacity-20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Languages className="w-8 h-8 text-primary animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-headline font-bold">Generating Clinical Result</h2>
              <p className="text-muted-foreground">Analyzing transcript with backend and Qdrant support...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'result' && result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className={`p-6 sm:p-8 rounded-[2.5rem] border ${getSeverityStyles(result.assessment.severityScore)}`}>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <AlertCircle className="w-10 h-10" />
                <div>
                  <h2 className="text-3xl font-headline font-bold">{result.assessment.severityScore} Diagnostic</h2>
                  <p className="text-sm font-medium opacity-80 uppercase tracking-widest">Lab Diagnostic Result</p>
                </div>
              </div>
              <div className={`rounded-full border px-4 py-2 text-xs font-mono uppercase tracking-[0.2em] ${getConfidenceMetadata(result.overallConfidence).styles}`}>
                {getConfidenceMetadata(result.overallConfidence).label}: {Math.round((Number.isFinite(result.overallConfidence) ? result.overallConfidence! : 0) * 100)}%
              </div>
            </div>
            {result.problem && <p className="mb-3 text-sm font-semibold">Likely problem: {result.problem}</p>}
            <p className="text-lg leading-relaxed">{result.assessment.guidance}</p>
            {result.summary && <p className="mt-3 text-sm opacity-80">Summary: {result.summary}</p>}
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Validation notes</p>
                {result.validationNotes && result.validationNotes.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {result.validationNotes.slice(0, 4).map((note, index) => (
                      <li key={`validation-note-${index}-${note}`}>- {note}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No validation notes were returned.</p>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Evidence summary</p>
                {result.evidenceSummary && result.evidenceSummary.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {result.evidenceSummary.slice(0, 4).map((evidence, index) => (
                      <li key={`evidence-${index}-${evidence}`}>- {evidence}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No evidence summary was returned.</p>
                )}
              </div>
            </div>
          </div>

          <div className={`grid ${result.capture.transcribedTextNative !== result.capture.translatedTextEnglish ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-6`}>
            <Card className="glass-card rounded-3xl border-white/5">
              <CardContent className="p-8 space-y-4">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Transcription ({selectedLang.name})</div>
                <p className="italic text-muted-foreground">"{result.capture.transcribedTextNative}"</p>
              </CardContent>
            </Card>
            {result.capture.transcribedTextNative !== result.capture.translatedTextEnglish && (
              <Card className="glass-card rounded-3xl border-white/5">
                <CardContent className="p-8 space-y-4">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Clinical Translation</div>
                  <p className="font-medium">"{result.capture.translatedTextEnglish}"</p>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="glass-card rounded-3xl border-white/5 overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-3">
              <h3 className="text-lg font-headline font-bold">Recommended Actions</h3>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-mono uppercase tracking-widest text-primary">Priority Recommendation</p>
                    <p className="mt-1 text-sm text-muted-foreground">{result.recommendedAction ?? 'Follow the guidance above and seek clinical review if symptoms worsen.'}</p>
                  </div>
                </div>
              </div>

              {homeCareTips.length > 0 && (
                <div className="rounded-xl border border-primary/20 bg-background/40 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    <p className="text-xs font-mono uppercase tracking-widest text-primary">Care Checklist Until Consultation</p>
                  </div>
                  <div className="space-y-1.5">
                    {homeCareTips.map((tip, index) => (
                      <div key={`care-tip-${index}-${tip}`} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary/80" />
                        <p className="text-sm text-muted-foreground">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!bookingStarted && !bookingDone && (
                <Button
                  className="w-full"
                  onClick={() => {
                    setBookingStarted(true);
                    setConfirmBooking(false);
                  }}
                >
                  Book Directly From Spoken Symptoms
                </Button>
              )}

              {bookingStarted && !bookingDone && (
                <div className="space-y-3 rounded-xl border border-primary/20 bg-background/40 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Appointment details</p>
                    {showAutoExtractedMessage && extractedAppointmentDetails && (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-5 items-center rounded-full border border-primary/30 bg-primary/10 px-2 text-[10px] font-medium text-primary">
                          {extractedAppointmentDetails.confidence > 0.7 ? '✓ Pre-filled from voice' : 'ℹ Extracted from voice'}
                        </span>
                      </div>
                    )}
                  </div>
                  {showAutoExtractedMessage && extractedAppointmentDetails && extractedAppointmentDetails.confidence > 0 && (
                    <p className="text-xs text-muted-foreground italic">These details were automatically extracted from your voice. Please verify and adjust if needed.</p>
                  )}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Button type="button" variant="outline" size="sm" onClick={() => setBookingDate(getLocalDateString(0))}>Today</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setBookingDate(getLocalDateString(1))}>Tomorrow</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setBookingTime('10:00')}>10:00 AM</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setBookingTime('18:00')}>6:00 PM</Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="space-y-1 text-sm">
                      <span className="text-muted-foreground">Date</span>
                      <input
                        type="date"
                        value={bookingDate}
                        onChange={(event) => setBookingDate(event.target.value)}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="text-muted-foreground">Time</span>
                      <input
                        type="time"
                        value={bookingTime}
                        onChange={(event) => setBookingTime(event.target.value)}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <label className="space-y-1 text-sm block">
                    <span className="text-muted-foreground">Doctor name</span>
                    <select
                      value={doctorName}
                      onChange={(event) => {
                        const selectedDoctorName = event.target.value;
                        setDoctorName(selectedDoctorName);
                        const selectedDoctor = getDoctorByName(selectedDoctorName);
                        if (selectedDoctor) {
                          setClinicName(selectedDoctor.clinicName);
                        }
                      }}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select doctor</option>
                      {availableDoctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.name}>{doctor.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 text-sm block">
                    <span className="text-muted-foreground">Doctor type</span>
                    <select
                      value={doctorType}
                      onChange={(event) => setDoctorType(event.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      {doctorTypeOptions.map((option, index) => (
                        <option key={`doctor-type-${index}-${option}`} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 text-sm block">
                    <span className="text-muted-foreground">Clinic name</span>
                    <input
                      type="text"
                      value={clinicName}
                      onChange={(event) => setClinicName(event.target.value)}
                      placeholder="Enter clinic or hospital name"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>

                  {availableSlots.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Available slots</span>
                      <div className="flex flex-wrap gap-2">
                        {availableSlots.slice(0, 6).map((slot, index) => (
                          <Button
                            key={`slot-${index}-${slot}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setBookingTime(slot)}
                            className="rounded-full"
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!confirmBooking && (
                    <Button className="w-full" disabled={!bookingFormComplete} onClick={() => setConfirmBooking(true)}>
                      Continue
                    </Button>
                  )}

                  {confirmBooking && (
                    <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="text-sm font-medium">Confirm booking?</p>
                      <p className="text-xs text-muted-foreground">{bookingDate} at {bookingTime} with {doctorType}</p>
                      <p className="text-xs text-muted-foreground">Doctor: {doctorName} • Clinic: {clinicName}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" onClick={() => setConfirmBooking(false)}>Cancel</Button>
                        <Button
                          disabled={bookingSaving}
                          onClick={() => {
                            void confirmBookingAppointment();
                          }}
                        >
                          {bookingSaving ? 'Booking...' : 'Confirm'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {bookingDone && (
                <div className="rounded-xl border border-accent/25 bg-accent/10 p-4">
                  <p className="font-semibold">Appointment booked successfully</p>
                  <p className="text-sm text-muted-foreground">{bookingDate} at {bookingTime} with {doctorType}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {result.medicineSuggestions && result.medicineSuggestions.length > 0 && (
            <Card className="glass-card rounded-3xl border-white/5 overflow-hidden">
              <CardContent className="p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg font-headline font-bold">Medicine suggestions from RxNorm</h3>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-primary">OTC guidance only</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {result.medicineSuggestions.map((medicine) => (
                    <div key={`${medicine.name}-${medicine.category}`} className="rounded-xl border border-white/10 bg-card/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{medicine.name}</p>
                          <p className="text-xs text-muted-foreground">{medicine.category}</p>
                        </div>
                        {medicine.rxcui && <span className="text-[10px] font-mono text-muted-foreground">RxCUI {medicine.rxcui}</span>}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{medicine.reason}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{medicine.usageNote}</p>
                      {medicine.warnings.length > 0 && (
                        <p className="mt-2 text-xs text-destructive">{medicine.warnings.join(' • ')}</p>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <a
                          href={getMedicinePurchaseUrl(medicine.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                        >
                          Buy now
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="glass-card rounded-3xl border-white/5 overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-headline font-bold">Qdrant RAG Trace</h3>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-primary">Top-3 vector hits</span>
              </div>

              {ragTraceTopHits.length === 0 ? (
                <div className="rounded-xl border border-border bg-background/40 p-4">
                  <p className="text-sm text-muted-foreground">No retrieval hits were returned for this triage turn.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ragTraceTopHits.map((hit, index) => (
                    <div key={`${hit.id}-${index}`} className="rounded-xl border border-white/10 bg-card/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">#{index + 1} {hit.problemLabel}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${getSeverityStyles(hit.severityScore)}`}>
                          {hit.severityScore}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                        <p>Similarity score: <span className="font-mono text-foreground">{hit.similarityLabel}</span></p>
                        <p>ICD-10 code: <span className="font-mono text-foreground">{hit.icd10Label}</span></p>
                      </div>
                      {hit.summary && <p className="mt-2 text-xs text-muted-foreground">{hit.summary}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card rounded-3xl border-white/5 overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <BadgeIndianRupee className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-headline font-bold">Scheme Auto-Surface</h3>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-primary">Unique angle</span>
              </div>

              {schemeCoverageLoading && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                  Checking Qdrant scheme collection for eligible coverage...
                </div>
              )}

              {!schemeCoverageLoading && displaySchemeMatches.length === 0 && (
                <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                  No PM-JAY/CGHS coverage matches surfaced for this triage turn.
                </div>
              )}

              {!schemeCoverageLoading && displaySchemeMatches.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                  {displaySchemeMatches.map((scheme) => (
                    <div key={scheme.id} className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{scheme.schemeName}</p>
                          <p className="mt-1 text-sm text-muted-foreground">Coverage amount: {scheme.coverageAmount}</p>
                        </div>
                        <span className="rounded-full border border-primary/25 bg-background px-2 py-0.5 text-[10px] font-mono text-primary">
                          score {Number.isFinite(scheme.score) ? scheme.score.toFixed(3) : '0.000'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">Eligibility: {scheme.eligibility}</p>
                      {scheme.summary && <p className="mt-2 text-xs text-muted-foreground">{scheme.summary}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card rounded-3xl border-white/5 overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-headline font-bold">Nearby Clinic Map</h3>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-primary">Top-3 nearest</span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm block">
                  <span className="text-muted-foreground">Specialty filter</span>
                  <input
                    type="text"
                    value={clinicSpecialtyFilter}
                    disabled
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground"
                  />
                </label>

                <label className="space-y-1 text-sm block">
                  <span className="text-muted-foreground">Scheme accepted</span>
                  <select
                    value={selectedScheme}
                    onChange={(event) => setSelectedScheme(event.target.value as (typeof SCHEME_OPTIONS)[number])}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    {SCHEME_OPTIONS.map((scheme) => (
                      <option key={scheme} value={scheme}>{scheme}</option>
                    ))}
                  </select>
                </label>
              </div>

              {geoStatus === 'locating' && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                  Detecting your location from browser...
                </div>
              )}

              {geoStatus === 'ready' && liveNearbyLoading && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                  Looking up live nearby clinics from map provider...
                </div>
              )}

              {geoStatus === 'ready' && !liveNearbyLoading && liveNearbyError && (
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-muted-foreground">
                  Live map lookup failed. Showing fallback clinic directory.
                </div>
              )}

              {(geoStatus === 'denied' || geoStatus === 'unsupported') && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-muted-foreground">
                  Location access is unavailable. Allow browser geolocation to view nearest clinics.
                </div>
              )}

              {geoStatus === 'ready' && userLocation && nearbyClinics.length > 0 && (
                <>
                  <NearbyClinicMap userLocation={userLocation} clinics={nearbyClinics} onBookAppointment={startBookingFromClinic} />
                  <p className="text-xs text-muted-foreground">
                    Source: {liveNearbyClinics.length > 0 ? 'Live OpenStreetMap nearby search' : 'Fallback clinic directory'}
                  </p>
                  <div className="space-y-2">
                    {nearbyClinics.map((clinic, index) => (
                      <div key={clinic.id} className="rounded-xl border border-white/10 bg-card/70 p-3 text-sm">
                        <p className="font-semibold">#{index + 1} {clinic.name}</p>
                        <p className="text-muted-foreground">{clinic.specialty} • {clinic.distanceKm.toFixed(2)} km</p>
                        <p className="text-muted-foreground">{clinic.address}</p>
                        {clinic.schemesAccepted.length > 0 ? (
                          <p className="text-xs text-primary">Schemes: {clinic.schemesAccepted.join(', ')}</p>
                        ) : (
                          <p className="text-xs text-amber-500">Schemes: Scheme not verified</p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => startBookingFromClinic(clinic)}
                            className="rounded-full"
                          >
                            Book appointment
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {geoStatus === 'ready' && userLocation && nearbyClinics.length === 0 && (
                <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                  No nearby clinics found for {clinicSpecialtyFilter} with the selected scheme filter.
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            variant="secondary"
            className="w-full py-8 rounded-full border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            onClick={() => {
              setResult(null);
              setSelectedLang(LANGUAGES[0]);
              setIsRecording(false);
              setStep('record');
              setSessionState('idle');
              setBookingStarted(false);
              setBookingDate('');
              setBookingTime('');
              setDoctorName('');
              setDoctorType('');
              setClinicName('');
              setConfirmBooking(false);
              setBookingDone(false);
              setExtractedAppointmentDetails(null);
              setShowAutoExtractedMessage(false);
              setSelectedScheme('Any');
              setUserLocation(null);
              setGeoStatus('idle');
              setLiveNearbyClinics([]);
              setLiveNearbyLoading(false);
              setLiveNearbyError(null);
              setSchemeCoverageMatches([]);
              setSchemeCoverageLoading(false);
              handoffDocIdRef.current = null;
              ragFallbackAttemptedRef.current = false;
              schemeCoverageAttemptedRef.current = false;
              onRestart?.();
            }}
          >
            Start Another Triage
          </Button>
        </div>
      )}
    </div>
  );
}
