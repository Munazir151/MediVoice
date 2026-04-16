import type { PatientVoiceSymptomCaptureOutput } from '@/ai/flows/patient-voice-symptom-capture-flow';
import type { ClinicalTriageSeverityAssessmentOutput } from '@/ai/flows/clinical-triage-severity-assessment-flow';

export type TriageBackendAnalysis = {
  problem: string;
  capture: PatientVoiceSymptomCaptureOutput;
  assessment: ClinicalTriageSeverityAssessmentOutput;
  summary: string;
  redFlags: string[];
  recommendedAction: string;
  languageCode: string;
  overallConfidence?: number;
  validationNotes?: string[];
  evidenceSummary?: string[];
  medicineSuggestions: Array<{
    name: string;
    rxcui?: string | null;
    source: string;
    category: string;
    reason: string;
    usageNote: string;
    warnings: string[];
  }>;
  doctorHandoffDocument: string;
  qdrantMatches: Array<{
    id: string;
    problemLabel: string;
    severityScore: 'Green' | 'Yellow' | 'Red';
    score: number;
    icd10Code?: string;
    specialty?: string;
    summary?: string;
  }>;
};

export type SchemeCoverageMatch = {
  id: string;
  schemeName: string;
  coverageAmount: string;
  eligibility: string;
  score: number;
  summary?: string;
};

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_TRIAGE_API_BASE_URL?.replace(/\/$/, '') ?? '';

function getBaseUrl() {
  return DEFAULT_BASE_URL;
}

async function buildApiError(response: Response, fallback: string): Promise<Error> {
  try {
    const data = await response.json();
    const detail =
      typeof data?.detail === 'string'
        ? data.detail
        : typeof data?.message === 'string'
          ? data.message
          : '';

    if (detail) {
      return new Error(`${fallback} (${response.status}): ${detail}`);
    }
  } catch {
    // Ignore JSON parsing errors and return generic fallback below.
  }

  return new Error(`${fallback} (${response.status})`);
}

async function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Unable to read audio blob.'));
    reader.readAsDataURL(blob);
  });
}

export async function analyzeVoiceWithBackend(input: {
  audioBlob: Blob;
  languageCode: string;
  sessionId?: string;
  patientAge?: number | null;
  patientIsPregnant?: boolean;
  patientChronicConditions?: string[];
  patientAllergies?: string[];
}): Promise<TriageBackendAnalysis> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_TRIAGE_API_BASE_URL is not configured.');
  }

  const payload = {
    audioDataUri: await blobToDataUri(input.audioBlob),
    nativeLanguageCode: input.languageCode,
    sessionId: input.sessionId,
    patientAge: input.patientAge ?? null,
    patientIsPregnant: input.patientIsPregnant ?? false,
    patientChronicConditions: input.patientChronicConditions ?? [],
    patientAllergies: input.patientAllergies ?? [],
  };

  const response = await fetch(`${baseUrl}/triage/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await buildApiError(response, 'Triage analysis failed');
  }

  const data = await response.json();

  return {
    problem: data.problem,
    capture: {
      transcribedTextNative: data.capture.transcribed_text_native,
      translatedTextEnglish: data.capture.translated_text_english,
    },
    assessment: {
      severityScore: data.assessment.severity_score,
      guidance: data.assessment.guidance,
    },
    summary: data.summary,
    redFlags: data.red_flags ?? [],
    recommendedAction: data.recommended_action,
    languageCode: data.language_code,
    overallConfidence: typeof data.overall_confidence === 'number' ? data.overall_confidence : undefined,
    validationNotes: Array.isArray(data.validation_notes)
      ? data.validation_notes.map((item: any) => String(item))
      : [],
    evidenceSummary: Array.isArray(data.evidence_summary)
      ? data.evidence_summary.map((item: any) => String(item))
      : [],
    medicineSuggestions: Array.isArray(data.medicine_suggestions)
      ? data.medicine_suggestions.map((item: any) => ({
          name: String(item.name ?? 'Unknown medicine'),
          rxcui: item.rxcui ? String(item.rxcui) : null,
          source: String(item.source ?? 'RxNorm'),
          category: String(item.category ?? 'General'),
          reason: String(item.reason ?? ''),
          usageNote: String(item.usage_note ?? ''),
          warnings: Array.isArray(item.warnings) ? item.warnings.map((warning: any) => String(warning)) : [],
        }))
      : [],
    doctorHandoffDocument: String(data.doctor_handoff_document ?? ''),
    qdrantMatches: Array.isArray(data.qdrant_matches)
      ? data.qdrant_matches.map((match: any) => ({
          id: String(match.id),
          problemLabel: String(match.problem_label ?? 'Unknown problem'),
          severityScore: (match.severity_score ?? 'Yellow') as 'Green' | 'Yellow' | 'Red',
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
      : [],
  };
}

export async function analyzeTranscriptWithBackend(input: {
  transcript: string;
  languageCode: string;
  sessionId?: string;
  patientAge?: number | null;
  patientIsPregnant?: boolean;
  patientChronicConditions?: string[];
  patientAllergies?: string[];
}): Promise<TriageBackendAnalysis> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_TRIAGE_API_BASE_URL is not configured.');
  }

  const response = await fetch(`${baseUrl}/triage/analyze-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transcript: input.transcript,
      nativeLanguageCode: input.languageCode,
      sessionId: input.sessionId,
      patientAge: input.patientAge ?? null,
      patientIsPregnant: input.patientIsPregnant ?? false,
      patientChronicConditions: input.patientChronicConditions ?? [],
      patientAllergies: input.patientAllergies ?? [],
    }),
  });

  if (!response.ok) {
    throw await buildApiError(response, 'Triage text analysis failed');
  }

  const data = await response.json();

  return {
    problem: data.problem,
    capture: {
      transcribedTextNative: data.capture.transcribed_text_native,
      translatedTextEnglish: data.capture.translated_text_english,
    },
    assessment: {
      severityScore: data.assessment.severity_score,
      guidance: data.assessment.guidance,
    },
    summary: data.summary,
    redFlags: data.red_flags ?? [],
    recommendedAction: data.recommended_action,
    languageCode: data.language_code,
    overallConfidence: typeof data.overall_confidence === 'number' ? data.overall_confidence : undefined,
    validationNotes: Array.isArray(data.validation_notes)
      ? data.validation_notes.map((item: any) => String(item))
      : [],
    evidenceSummary: Array.isArray(data.evidence_summary)
      ? data.evidence_summary.map((item: any) => String(item))
      : [],
    medicineSuggestions: Array.isArray(data.medicine_suggestions)
      ? data.medicine_suggestions.map((item: any) => ({
          name: String(item.name ?? 'Unknown medicine'),
          rxcui: item.rxcui ? String(item.rxcui) : null,
          source: String(item.source ?? 'RxNorm'),
          category: String(item.category ?? 'General'),
          reason: String(item.reason ?? ''),
          usageNote: String(item.usage_note ?? ''),
          warnings: Array.isArray(item.warnings) ? item.warnings.map((warning: any) => String(warning)) : [],
        }))
      : [],
    doctorHandoffDocument: String(data.doctor_handoff_document ?? ''),
    qdrantMatches: Array.isArray(data.qdrant_matches)
      ? data.qdrant_matches.map((match: any) => ({
          id: String(match.id),
          problemLabel: String(match.problem_label ?? 'Unknown problem'),
          severityScore: (match.severity_score ?? 'Yellow') as 'Green' | 'Yellow' | 'Red',
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
      : [],
  };
}

export async function searchQdrantKnowledge(input: {
  transcript: string;
  languageCode: string;
  topK?: number;
}): Promise<unknown> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_TRIAGE_API_BASE_URL is not configured.');
  }

  const response = await fetch(`${baseUrl}/knowledge/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transcript: input.transcript,
      languageCode: input.languageCode,
      topK: input.topK ?? 5,
    }),
  });

  if (!response.ok) {
    throw await buildApiError(response, 'Knowledge search failed');
  }

  return response.json();
}

export async function searchSchemeCoverage(input: {
  transcript: string;
  languageCode: string;
  topK?: number;
}): Promise<SchemeCoverageMatch[]> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_TRIAGE_API_BASE_URL is not configured.');
  }

  const response = await fetch(`${baseUrl}/knowledge/schemes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transcript: input.transcript,
      languageCode: input.languageCode,
      topK: input.topK ?? 5,
    }),
  });

  if (!response.ok) {
    throw await buildApiError(response, 'Scheme coverage search failed');
  }

  const data = (await response.json()) as { matches?: any[] };
  if (!Array.isArray(data.matches)) {
    return [];
  }

  return data.matches.map((match) => ({
    id: String(match.id ?? `scheme-${Math.random().toString(36).slice(2)}`),
    schemeName: String(match.scheme_name ?? match.schemeName ?? match.scheme ?? 'Unknown Scheme'),
    coverageAmount: String(match.coverage_amount ?? match.coverageAmount ?? match.coverage ?? 'Not specified'),
    eligibility: String(match.eligibility ?? 'Check eligibility criteria'),
    score: Number(match.score ?? 0),
    summary: typeof match.summary === 'string' ? match.summary : undefined,
  }));
}
