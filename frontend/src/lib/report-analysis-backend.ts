const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_TRIAGE_API_BASE_URL?.replace(/\/$/, '') ?? '';

function getBaseUrl() {
  return DEFAULT_BASE_URL;
}

export type DocumentType = 'prescription' | 'report';
export type OutputLanguage = 'English' | 'Hindi' | 'Kannada' | 'Marathi' | 'Bengali' | 'Tamil' | 'Auto';

export type PatientInfoOutput = {
  name: string;
  age: string;
  gender: string;
};

export type ClinicalFindingOutput = {
  title: string;
  explanation: string;
};

export type MedicineOutput = {
  name: string;
  dose: string;
  frequency: string;
  purpose: string;
  what_it_is: string;
  what_it_does: string;
};

export type TestOutput = {
  parameter: string;
  value: string;
  unit: string;
  range: string;
  explanation: string;
  status: 'NORMAL' | 'ABNORMAL';
};

export type InteractionOutput = {
  drug1: string;
  drug2: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
};

export type MedicalAnalysisOutput = {
  patient_info: PatientInfoOutput;
  health_summary: string;
  clinical_findings: ClinicalFindingOutput[];
  medicines: MedicineOutput[];
  tests: TestOutput[];
  interactions: InteractionOutput[];
  summary: string;
  translated_summary: string;
};

async function buildApiError(response: Response, fallback: string): Promise<Error> {
  try {
    const data = await response.json();
    const detail = typeof data?.detail === 'string' ? data.detail : typeof data?.message === 'string' ? data.message : '';
    if (detail) {
      if (
        response.status === 503 &&
        /gemini request failed \(429\)|openrouter request failed \(429\)|rate limit|quota|provider returned error/i.test(detail)
      ) {
        return new Error('Medical report analysis is temporarily rate limited. Please try again in a minute.');
      }

      return new Error(`${fallback} (${response.status}): ${detail}`);
    }
  } catch {
    // Ignore parse errors.
  }

  return new Error(`${fallback} (${response.status})`);
}

export async function analyzeMedicalReport(input: {
  file: File;
  documentType: DocumentType;
  language: OutputLanguage;
}): Promise<MedicalAnalysisOutput> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_TRIAGE_API_BASE_URL is not configured.');
  }

  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('documentType', input.documentType);
  formData.append('language', input.language);

  const response = await fetch(`${baseUrl}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw await buildApiError(response, 'Medical report analysis failed');
  }

  const data = await response.json();

  return {
    patient_info: {
      name: String(data?.patient_info?.name ?? ''),
      age: String(data?.patient_info?.age ?? ''),
      gender: String(data?.patient_info?.gender ?? ''),
    },
    health_summary: String(data?.health_summary ?? ''),
    clinical_findings: Array.isArray(data?.clinical_findings)
      ? data.clinical_findings.map((item: any) => ({
          title: String(item?.title ?? ''),
          explanation: String(item?.explanation ?? ''),
        }))
      : [],
    medicines: Array.isArray(data?.medicines)
      ? data.medicines.map((item: any) => ({
          name: String(item?.name ?? ''),
          dose: String(item?.dose ?? ''),
          frequency: String(item?.frequency ?? ''),
          purpose: String(item?.purpose ?? ''),
          what_it_is: String(item?.what_it_is ?? ''),
          what_it_does: String(item?.what_it_does ?? ''),
        }))
      : [],
    tests: Array.isArray(data?.tests)
      ? data.tests.map((item: any) => ({
          parameter: String(item?.parameter ?? ''),
          value: String(item?.value ?? ''),
          unit: String(item?.unit ?? ''),
          range: String(item?.range ?? ''),
          explanation: String(item?.explanation ?? ''),
          status: (item?.status ?? 'NORMAL') as 'NORMAL' | 'ABNORMAL',
        }))
      : [],
    interactions: Array.isArray(data?.interactions)
      ? data.interactions.map((item: any) => ({
          drug1: String(item?.drug1 ?? ''),
          drug2: String(item?.drug2 ?? ''),
          severity: (item?.severity ?? 'LOW') as 'LOW' | 'MEDIUM' | 'HIGH',
        }))
      : [],
    summary: String(data?.summary ?? ''),
    translated_summary: String(data?.translated_summary ?? ''),
  };
}
