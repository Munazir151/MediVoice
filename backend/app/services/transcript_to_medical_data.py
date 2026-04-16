from __future__ import annotations

from dataclasses import dataclass
import logging
import json
import re
import asyncio

import httpx

from app.core.config import Settings


logger = logging.getLogger(__name__)


@dataclass
class ExtractedMedicalData:
    """Structured medical data extracted from voice transcript."""
    chief_complaint: str
    symptoms: list[str]  # Normalized, accurate symptoms
    symptom_duration: str
    symptom_severity: str  # Patient-reported severity
    medical_history: list[str]
    current_medications: list[str]
    known_allergies: list[str]
    associated_findings: list[str]  # Vitals, observations, etc.
    patient_occupation: str | None
    relevant_context: str


class TranscriptToMedicalDataService:
    """Converts VAPI transcripts to accurate, structured medical data using LLM."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.api_key = settings.openrouter_api_key
        self.model = settings.openrouter_model or 'google/gemma-4-26b-a4b-it:free'

    @property
    def enabled(self) -> bool:
        return bool(self.settings.llm_enabled and self.api_key and self.model)

    @staticmethod
    def _extract_json(text: str) -> dict | None:
        """Extract JSON from LLM response, handling markdown code blocks."""
        body = text.strip()
        if body.startswith('```'):
            body = re.sub(r'^```(?:json)?\s*', '', body)
            body = re.sub(r'\s*```$', '', body)

        try:
            payload = json.loads(body)
            if isinstance(payload, dict):
                return payload
        except json.JSONDecodeError:
            return None
        return None

    @staticmethod
    def _normalize_list(items: list | str | None) -> list[str]:
        """Normalize list field from JSON response."""
        if not items:
            return []
        if isinstance(items, str):
            return [item.strip() for item in items.split(',') if item.strip()]
        if isinstance(items, list):
            return [str(item).strip() for item in items if str(item).strip()]
        return []

    async def extract(
        self,
        transcript: str,
        language_code: str,
    ) -> ExtractedMedicalData | None:
        """
        Extract structured medical data from patient transcript.

        Args:
            transcript: Raw voice transcript from VAPI
            language_code: Patient's language code (e.g., 'en-US', 'hi-IN')

        Returns:
            Structured medical data or None if extraction fails
        """
        if not self.enabled:
            return None

        if not transcript or not transcript.strip():
            return None

        prompt = (
            'You are a medical data extraction specialist. Extract ACCURATE medical information from the patient '
            'voice transcript below. Normalize and validate all data. Return ONLY the JSON response with NO additional text.\n\n'
            f'Patient Language: {language_code}\n'
            f'Patient Transcript:\n{transcript}\n\n'
            'IMPORTANT EXTRACTION RULES:\n'
            '1. Chief Complaint: Extract the PRIMARY reason for visit (1-2 sentences)\n'
            '2. Symptoms: List SPECIFIC, ACCURATE symptoms (not transcript phrases). Normalize medical terminology.\n'
            '3. Duration: Extract how long symptoms have been present\n'
            '4. Severity: Patient\'s reported severity (Mild/Moderate/Severe)\n'
            '5. Medical History: List past medical conditions, surgeries, hospitalizations\n'
            '6. Current Medications: Extract all medications patient reports taking\n'
            '7. Allergies: Extract drug allergies, food allergies, environmental allergies\n'
            '8. Associated Findings: Vitals, observations, measurements mentioned (fever, cough type, etc.)\n'
            '9. Occupation: Extract patient\'s job/occupation if mentioned\n'
            '10. Context: Any relevant social/lifestyle factors\n\n'
            'Return ONLY this JSON:\n'
            '{\n'
            '  "chief_complaint": "string",\n'
            '  "symptoms": ["symptom1", "symptom2"],\n'
            '  "symptom_duration": "string (e.g., 3 days, 2 weeks)",\n'
            '  "symptom_severity": "Mild|Moderate|Severe",\n'
            '  "medical_history": ["condition1", "condition2"],\n'
            '  "current_medications": ["drug1", "drug2"],\n'
            '  "known_allergies": ["allergy1", "allergy2"],\n'
            '  "associated_findings": ["finding1", "finding2"],\n'
            '  "patient_occupation": "occupation or null",\n'
            '  "relevant_context": "string"\n'
            '}\n'
        )

        endpoint = f"{self.settings.openrouter_base_url.rstrip('/')}/chat/completions"

        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
        }
        if self.settings.openrouter_site_url:
            headers['HTTP-Referer'] = self.settings.openrouter_site_url
        if self.settings.openrouter_app_name:
            headers['X-Title'] = self.settings.openrouter_app_name

        payload = {
            'model': self.model,
            'messages': [
                {
                    'role': 'user',
                    'content': prompt,
                }
            ],
            'temperature': 0.3,  # Lower temp for more consistent extraction
        }

        retries = 5
        backoff_factor = 2
        data: dict | None = None

        for attempt in range(retries):
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    response = await client.post(endpoint, json=payload, headers=headers)
                    response.raise_for_status()
                    data = response.json()
                    break
            except httpx.HTTPStatusError as exc:
                status_code = exc.response.status_code if exc.response is not None else None
                if status_code == 429 and attempt < retries - 1:
                    wait_time = backoff_factor ** attempt
                    logger.warning('Rate limit hit during medical extraction. Retrying in %s seconds.', wait_time)
                    await asyncio.sleep(wait_time)
                    continue

                logger.warning('Medical extraction failed with HTTP status %s: %s', status_code, exc)
                return None
            except httpx.HTTPError as exc:
                logger.warning('Medical extraction failed due to HTTP error: %s', exc)
                return None

        if data is None:
            return None

        # Extract text from LLM response
        text = ''
        choices = data.get('choices') if isinstance(data, dict) else []
        if choices and isinstance(choices[0], dict):
            message = choices[0].get('message')
            content = message.get('content') if isinstance(message, dict) else ''
            if isinstance(content, list):
                text = ''.join(str(part.get('text') or '') for part in content if isinstance(part, dict))
            else:
                text = str(content or '')

        if not text:
            return None

        obj = self._extract_json(text)
        if not obj:
            return None

        # Validate and normalize extracted data
        chief_complaint = str(obj.get('chief_complaint') or '').strip()
        if not chief_complaint:
            chief_complaint = 'General health concern'

        symptoms = self._normalize_list(obj.get('symptoms'))
        if not symptoms:
            symptoms = ['General symptom']

        symptom_duration = str(obj.get('symptom_duration') or 'Unknown duration').strip()

        severity = str(obj.get('symptom_severity') or 'Moderate').strip()
        if severity not in {'Mild', 'Moderate', 'Severe'}:
            severity = 'Moderate'

        medical_history = self._normalize_list(obj.get('medical_history'))
        current_medications = self._normalize_list(obj.get('current_medications'))
        known_allergies = self._normalize_list(obj.get('known_allergies'))
        associated_findings = self._normalize_list(obj.get('associated_findings'))

        occupation = obj.get('patient_occupation')
        if occupation and isinstance(occupation, str):
            occupation = occupation.strip() or None
        else:
            occupation = None

        context = str(obj.get('relevant_context') or '').strip()

        return ExtractedMedicalData(
            chief_complaint=chief_complaint,
            symptoms=symptoms,
            symptom_duration=symptom_duration,
            symptom_severity=severity,
            medical_history=medical_history,
            current_medications=current_medications,
            known_allergies=known_allergies,
            associated_findings=associated_findings,
            patient_occupation=occupation,
            relevant_context=context,
        )
