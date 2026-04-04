'use server';
/**
 * @fileOverview This file implements a Genkit flow for patient voice symptom capture.
 * It allows patients to describe symptoms in their native Indian language via voice,
 * transcribes the audio, and translates it into English.
 *
 * - patientVoiceSymptomCapture - A function to process patient voice symptoms.
 * - PatientVoiceSymptomCaptureInput - The input type for the symptom capture function.
 * - PatientVoiceSymptomCaptureOutput - The return type for the symptom capture function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PatientVoiceSymptomCaptureInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "A Base64 encoded audio clip of the patient's symptoms, as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  nativeLanguageCode: z
    .string()
    .describe(
      'The BCP-47 language code of the native Indian language spoken by the patient (e.g., "hi-IN" for Hindi, "mr-IN" for Marathi, "bn-IN" for Bengali, "ta-IN" for Tamil).'
    ),
});
export type PatientVoiceSymptomCaptureInput = z.infer<
  typeof PatientVoiceSymptomCaptureInputSchema
>;

const PatientVoiceSymptomCaptureOutputSchema = z.object({
  transcribedTextNative: z
    .string()
    .describe('The transcribed text of the patient\'s symptoms in their native language.'),
  translatedTextEnglish: z
    .string()
    .describe('The English translation of the patient\'s transcribed symptoms.'),
});
export type PatientVoiceSymptomCaptureOutput = z.infer<
  typeof PatientVoiceSymptomCaptureOutputSchema
>;

export async function patientVoiceSymptomCapture(
  input: PatientVoiceSymptomCaptureInput
): Promise<PatientVoiceSymptomCaptureOutput> {
  return patientVoiceSymptomCaptureFlow(input);
}

const patientVoiceSymptomCapturePrompt = ai.definePrompt({
  name: 'patientVoiceSymptomCapturePrompt',
  input: {schema: PatientVoiceSymptomCaptureInputSchema},
  output: {schema: PatientVoiceSymptomCaptureOutputSchema},
  prompt: `You are an AI assistant specialized in medical symptom triage. Your task is to process a patient's verbal description of their symptoms.
First, transcribe the audio into the patient's native language. Then, provide an accurate English translation of that transcription.

Native Language Code: {{{nativeLanguageCode}}}

Audio of symptoms: {{media url=audioDataUri}}

Provide the output in JSON format with the following structure:
{
  "transcribedTextNative": "[transcribed text in native language]",
  "translatedTextEnglish": "[translated text in English]"
}`,
});

const patientVoiceSymptomCaptureFlow = ai.defineFlow(
  {
    name: 'patientVoiceSymptomCaptureFlow',
    inputSchema: PatientVoiceSymptomCaptureInputSchema,
    outputSchema: PatientVoiceSymptomCaptureOutputSchema,
  },
  async input => {
    const {output} = await patientVoiceSymptomCapturePrompt(input);
    if (!output) {
      throw new Error('Failed to get output from the prompt.');
    }
    return output;
  }
);
