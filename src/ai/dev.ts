import { config } from 'dotenv';
config();

import '@/ai/flows/clinical-triage-severity-assessment-flow.ts';
import '@/ai/flows/patient-voice-symptom-capture-flow.ts';