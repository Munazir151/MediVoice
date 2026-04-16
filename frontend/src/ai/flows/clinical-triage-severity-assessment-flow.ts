'use server';
/**
 * @fileOverview An AI agent for clinical triage and severity assessment.
 *
 * - clinicalTriageSeverityAssessment - A function that handles the clinical triage process.
 * - ClinicalTriageSeverityAssessmentInput - The input type for the clinicalTriageSeverityAssessment function.
 * - ClinicalTriageSeverityAssessmentOutput - The return type for the clinicalTriageSeverityAssessment function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ClinicalTriageSeverityAssessmentInputSchema = z.object({
  symptomDescription: z.string().describe('The patient\u0027s verbal description of their symptoms.'),
});
export type ClinicalTriageSeverityAssessmentInput = z.infer<typeof ClinicalTriageSeverityAssessmentInputSchema>;

const ClinicalTriageSeverityAssessmentOutputSchema = z.object({
  severityScore: z.enum(['Green', 'Yellow', 'Red']).describe('The urgency level of the health situation: Green (low urgency), Yellow (medium urgency), or Red (high urgency).'),
  guidance: z.string().describe('Initial guidance and recommendations based on the severity score, including next steps like seeking home care, visiting a GP, or going to the ER.'),
});
export type ClinicalTriageSeverityAssessmentOutput = z.infer<typeof ClinicalTriageSeverityAssessmentOutputSchema>;

export async function clinicalTriageSeverityAssessment(input: ClinicalTriageSeverityAssessmentInput): Promise<ClinicalTriageSeverityAssessmentOutput> {
  return clinicalTriageSeverityAssessmentFlow(input);
}

const clinicalTriageSeverityAssessmentPrompt = ai.definePrompt({
  name: 'clinicalTriageSeverityAssessmentPrompt',
  input: { schema: ClinicalTriageSeverityAssessmentInputSchema },
  output: { schema: ClinicalTriageSeverityAssessmentOutputSchema },
  prompt: `You are MediVoice AI, a highly accurate clinical triage and severity assessment tool for patients in India. Your goal is to analyze the provided symptom description and provide an immediate clinical triage result.

Based on the patient's symptom description, determine a severity score (Green, Yellow, or Red) and provide initial guidance on the urgency of their health situation and recommended next steps.

Severity Scores:
- Green: Low urgency, suggesting home care or non-urgent consultation.
- Yellow: Medium urgency, suggesting a visit to a General Practitioner (GP) or further observation.
- Red: High urgency, suggesting immediate attention or a visit to the Emergency Room (ER).

Patient's Symptom Description: {{{symptomDescription}}}`,
});

const clinicalTriageSeverityAssessmentFlow = ai.defineFlow(
  {
    name: 'clinicalTriageSeverityAssessmentFlow',
    inputSchema: ClinicalTriageSeverityAssessmentInputSchema,
    outputSchema: ClinicalTriageSeverityAssessmentOutputSchema,
  },
  async (input) => {
    const { output } = await clinicalTriageSeverityAssessmentPrompt(input);
    return output!;
  }
);