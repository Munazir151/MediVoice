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
    // Ignore JSON parsing errors.
  }

  return new Error(`${fallback} (${response.status})`);
}

export type DrugInteractionMatch = {
  id: string;
  drugA: string;
  drugB: string;
  interactionSeverity: 'Green' | 'Yellow' | 'Red';
  safeDosage: string;
  score: number;
  recommendation?: string | null;
  summary?: string | null;
  warnings: string[];
  drugADescription?: string | null;
  drugBDescription?: string | null;
  interactionWhy?: string | null;
};

export async function analyzeDrugInteractionWithBackend(input: {
  transcript: string;
  languageCode: string;
  topK?: number;
}): Promise<DrugInteractionMatch[]> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_TRIAGE_API_BASE_URL is not configured.');
  }

  const response = await fetch(`${baseUrl}/drug-checker/analyze-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transcript: input.transcript,
      nativeLanguageCode: input.languageCode,
      topK: input.topK ?? 3,
    }),
  });

  if (!response.ok) {
    throw await buildApiError(response, 'Drug interaction analysis failed');
  }

  const data = await response.json();
  return Array.isArray(data.matches)
    ? data.matches.map((item: any) => ({
        id: String(item.id),
        drugA: String(item.drug_a ?? 'Unknown drug'),
        drugB: String(item.drug_b ?? 'Unknown drug'),
        interactionSeverity: (item.interaction_severity ?? 'Yellow') as 'Green' | 'Yellow' | 'Red',
        safeDosage: String(item.safe_dosage ?? 'Follow label or pharmacist guidance'),
        score: Number(item.score ?? 0),
        recommendation: typeof item.recommendation === 'string' ? item.recommendation : null,
        summary: typeof item.summary === 'string' ? item.summary : null,
        warnings: Array.isArray(item.warnings) ? item.warnings.map((warning: any) => String(warning)) : [],
        drugADescription: typeof item.drug_a_description === 'string' ? item.drug_a_description : null,
        drugBDescription: typeof item.drug_b_description === 'string' ? item.drug_b_description : null,
        interactionWhy: typeof item.interaction_why === 'string' ? item.interaction_why : null,
      }))
    : [];
}