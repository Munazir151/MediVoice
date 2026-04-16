from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field
from pydantic import ConfigDict

SeverityScore = Literal['Green', 'Yellow', 'Red']


class VoiceSessionCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user_id: str | None = None
    native_language_code: str = Field(default='en-US', examples=['hi-IN'], alias='nativeLanguageCode')


class VoiceSessionCreateResponse(BaseModel):
    session_id: str
    status: str = 'created'
    native_language_code: str
    created_at: datetime


class VoiceTranscribeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    audio_data_uri: str = Field(..., description='Base64 audio data URI', alias='audioDataUri')
    native_language_code: str = Field(default='en-US', alias='nativeLanguageCode')
    session_id: str | None = Field(default=None, alias='sessionId')


class VoiceTranscribeResponse(BaseModel):
    session_id: str | None = None
    native_language_code: str
    transcribed_text_native: str
    translated_text_english: str
    detected_language_code: str | None = None


class TriageAssessment(BaseModel):
    severity_score: SeverityScore
    guidance: str


class KnowledgeMatch(BaseModel):
    id: str
    problem_label: str
    severity_score: SeverityScore
    score: float
    red_flags: list[str] = Field(default_factory=list)
    specialty: str | None = None
    summary: str | None = None


class MedicationSuggestion(BaseModel):
    name: str
    rxcui: str | None = None
    source: str = 'RxNorm'
    category: str
    reason: str
    usage_note: str
    warnings: list[str] = Field(default_factory=list)


class KnowledgeSearchRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    transcript: str
    language_code: str = Field(default='en-US', alias='languageCode')
    top_k: int = Field(default=5, ge=1, le=20, alias='topK')


class KnowledgeSearchResponse(BaseModel):
    matches: list[KnowledgeMatch]


class SchemeCoverageMatch(BaseModel):
    id: str
    scheme_name: str
    coverage_amount: str
    eligibility: str
    score: float
    summary: str | None = None


class SchemeCoverageSearchResponse(BaseModel):
    matches: list[SchemeCoverageMatch] = Field(default_factory=list)


class DrugInteractionCheckRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    transcript: str
    native_language_code: str = Field(default='en-US', alias='nativeLanguageCode')
    top_k: int = Field(default=3, ge=1, le=10, alias='topK')


class DrugInteractionMatch(BaseModel):
    id: str
    drug_a: str
    drug_b: str
    interaction_severity: SeverityScore
    safe_dosage: str
    score: float
    recommendation: str | None = None
    summary: str | None = None
    warnings: list[str] = Field(default_factory=list)
    drug_a_description: str | None = None
    drug_b_description: str | None = None
    interaction_why: str | None = None


class DrugInteractionCheckResponse(BaseModel):
    matches: list[DrugInteractionMatch] = Field(default_factory=list)


class ExtractedMedicalDataResponse(BaseModel):
    """Structured medical data extracted from voice transcript by LLM."""
    model_config = ConfigDict(populate_by_name=True)

    chief_complaint: str = Field(description='Primary reason for visit')
    symptoms: list[str] = Field(description='Normalized, accurate symptoms extracted from transcript')
    symptom_duration: str = Field(description='How long symptoms have been present')
    symptom_severity: Literal['Mild', 'Moderate', 'Severe'] = Field(description='Patient-reported severity')
    medical_history: list[str] = Field(description='Past medical conditions and surgeries')
    current_medications: list[str] = Field(description='Medications patient is currently taking')
    known_allergies: list[str] = Field(description='Known drug, food, and environmental allergies')
    associated_findings: list[str] = Field(description='Vitals, observations, measurements mentioned')
    patient_occupation: str | None = Field(default=None, description='Patient occupational status if mentioned')
    relevant_context: str = Field(description='Social/lifestyle factors and other relevant context')


class TranscriptToMedicalDataRequest(BaseModel):
    """Request to extract structured medical data from voice transcript."""
    model_config = ConfigDict(populate_by_name=True)

    transcript: str = Field(description='Voice transcript from patient')
    language_code: str = Field(default='en-US', alias='languageCode', description='Patient language code')


class TriageAnalyzeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    audio_data_uri: str = Field(alias='audioDataUri')
    native_language_code: str = Field(default='en-US', alias='nativeLanguageCode')
    session_id: str | None = Field(default=None, alias='sessionId')
    patient_age: int | None = Field(default=None, alias='patientAge')
    patient_is_pregnant: bool = Field(default=False, alias='patientIsPregnant')
    patient_chronic_conditions: list[str] = Field(default_factory=list, alias='patientChronicConditions')
    patient_allergies: list[str] = Field(default_factory=list, alias='patientAllergies')


class TriageAnalyzeTextRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    transcript: str
    native_language_code: str = Field(default='en-US', alias='nativeLanguageCode')
    session_id: str | None = Field(default=None, alias='sessionId')
    patient_age: int | None = Field(default=None, alias='patientAge')
    patient_is_pregnant: bool = Field(default=False, alias='patientIsPregnant')
    patient_chronic_conditions: list[str] = Field(default_factory=list, alias='patientChronicConditions')
    patient_allergies: list[str] = Field(default_factory=list, alias='patientAllergies')


class TriageAnalyzeResponse(BaseModel):
    session_id: str | None = None
    problem: str
    capture: VoiceTranscribeResponse
    assessment: TriageAssessment
    summary: str
    red_flags: list[str] = Field(default_factory=list)
    recommended_action: str
    language_code: str
    qdrant_matches: list[KnowledgeMatch] = Field(default_factory=list)
    medicine_suggestions: list[MedicationSuggestion] = Field(default_factory=list)
    doctor_handoff_document: str = ''
    # Accuracy & Validation
    overall_confidence: float = Field(ge=0.0, le=1.0, description='Confidence score for result accuracy (0-1)')
    validation_notes: list[str] = Field(default_factory=list, description='Validation reasoning for results')
    evidence_summary: list[str] = Field(default_factory=list, description='Evidence backing the triage result')
    # Transcript details
    vapi_transcript_native: str | None = Field(default=None, description='VAPI speech-to-text transcript in patient language')
    vapi_transcript_english: str | None = Field(default=None, description='VAPI transcript translated to English')
    user_transcript: str | None = Field(default=None, description='Original user transcript input (for text-based requests)')



class TriageReportRequest(BaseModel):
    session_id: str
    problem: str
    severity_score: SeverityScore
    summary: str
    red_flags: list[str] = Field(default_factory=list)
    recommended_action: str


class TriageReportResponse(BaseModel):
    session_id: str
    status: str = 'stored'


class TriageFhirExportRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    session_id: str = Field(alias='sessionId')
    patient_id: str | None = Field(default=None, alias='patientId')
    problem: str
    severity_score: SeverityScore = Field(alias='severityScore')
    summary: str
    red_flags: list[str] = Field(default_factory=list, alias='redFlags')
    recommended_action: str = Field(alias='recommendedAction')
    guidance: str | None = None
    language_code: str | None = Field(default=None, alias='languageCode')


class TriageFhirExportResponse(BaseModel):
    session_id: str = Field(alias='sessionId')
    status: str = 'exported'
    resource_type: str = Field(default='Bundle', alias='resourceType')
    fhir_bundle: dict = Field(alias='fhirBundle')
