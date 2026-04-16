from __future__ import annotations

from datetime import datetime, timezone
import json
import re
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
import httpx

from app.core.config import Settings, get_settings
from app.schemas.triage import (
    KnowledgeMatch,
    KnowledgeSearchRequest,
    KnowledgeSearchResponse,
    MedicationSuggestion,
    SchemeCoverageMatch,
    SchemeCoverageSearchResponse,
    TriageAssessment,
    TriageAnalyzeRequest,
    TriageAnalyzeTextRequest,
    TriageAnalyzeResponse,
    TriageFhirExportRequest,
    TriageFhirExportResponse,
    TriageReportRequest,
    TriageReportResponse,
    VoiceSessionCreateRequest,
    VoiceSessionCreateResponse,
    VoiceTranscribeRequest,
    VoiceTranscribeResponse,
)
from app.services.qdrant import QdrantService
from app.services.vapi import VapiService
from app.services.llm_triage import LlmTriageService
from app.services.drug_database import DrugDatabaseService
from app.services.result_validator import ResultValidator

router = APIRouter(prefix='/triage', tags=['triage'])
voice_router = APIRouter(prefix='/voice', tags=['voice'])
knowledge_router = APIRouter(prefix='/knowledge', tags=['knowledge'])

QDRANT_RELEVANCE_SCORE_MIN = 0.52
QDRANT_RELEVANCE_SCORE_STRONG = 0.70
SCHEME_RELEVANCE_SCORE_MIN = 0.33
STOPWORD_TOKENS = {
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'have', 'been', 'were', 'your', 'you', 'are', 'not',
    'but', 'all', 'any', 'can', 'into', 'over', 'under', 'mild', 'moderate', 'severe',
}
SCHEME_INTENT_TERMS = {
    'scheme', 'insurance', 'coverage', 'covered', 'cashless', 'eligibility', 'eligible', 'cost', 'price',
    'pm-jay', 'pmjay', 'ayushman', 'cghs', 'esic', 'government', 'benefit', 'claim',
}


def _wants_booking(text: str) -> bool:
    lowered = text.lower()
    booking_terms = [
        'book',
        'booking',
        'appointment',
        'schedule',
        'doctor',
        'consultation',
        'hospital',
        'clinic',
    ]
    return any(term in lowered for term in booking_terms)


def _tokenize(text: str) -> set[str]:
    tokens = {
        token
        for token in re.findall(r'[a-z0-9]{3,}', text.lower())
        if token not in STOPWORD_TOKENS
    }
    return tokens


def _is_relevant_match(match: object, transcript: str) -> bool:
    score = float(getattr(match, 'score', 0.0) or 0.0)
    if score >= QDRANT_RELEVANCE_SCORE_STRONG:
        return True

    if score < QDRANT_RELEVANCE_SCORE_MIN:
        return False

    transcript_tokens = _tokenize(transcript)
    if not transcript_tokens:
        return False

    label = str(getattr(match, 'problem_label', '') or '')
    summary = str(getattr(match, 'summary', '') or '')
    specialty = str(getattr(match, 'specialty', '') or '')
    red_flags = ' '.join(getattr(match, 'red_flags', []) or [])
    evidence_tokens = _tokenize(f'{label} {summary} {specialty} {red_flags}')

    overlap = transcript_tokens.intersection(evidence_tokens)
    return len(overlap) >= 1


def _filter_relevant_matches(matches: list[object], transcript: str, top_k: int = 5) -> list[object]:
    filtered = [match for match in matches if _is_relevant_match(match, transcript)]
    filtered.sort(key=lambda item: float(getattr(item, 'score', 0.0) or 0.0), reverse=True)
    return filtered[:top_k]


def _should_surface_schemes(transcript: str) -> bool:
    lowered = transcript.lower()
    return any(term in lowered for term in SCHEME_INTENT_TERMS)


def _filter_scheme_matches(matches: list[object], transcript: str, top_k: int = 5) -> list[object]:
    if not _should_surface_schemes(transcript):
        return []

    filtered = [
        match for match in matches
        if float(getattr(match, 'score', 0.0) or 0.0) >= SCHEME_RELEVANCE_SCORE_MIN
    ]
    filtered.sort(key=lambda item: float(getattr(item, 'score', 0.0) or 0.0), reverse=True)
    return filtered[:top_k]


def _extract_json_payload(text: str) -> dict | None:
    body = text.strip()
    if body.startswith('```'):
        body = re.sub(r'^```(?:json)?\s*', '', body)
        body = re.sub(r'\s*```$', '', body)

    try:
        payload = json.loads(body)
        if isinstance(payload, dict):
            return payload
    except json.JSONDecodeError:
        pass

    start = body.find('{')
    end = body.rfind('}')
    if start >= 0 and end > start:
        try:
            payload = json.loads(body[start : end + 1])
            if isinstance(payload, dict):
                return payload
        except json.JSONDecodeError:
            return None

    return None


async def _openrouter_scheme_fallback(transcript: str, settings: Settings, top_k: int = 2) -> list[SchemeCoverageMatch]:
    api_key = settings.openrouter_api_key
    model = settings.openrouter_model or 'google/gemma-4-26b-a4b-it:free'
    if not api_key:
        return []

    endpoint = f"{settings.openrouter_base_url.rstrip('/')}/chat/completions"
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    }
    if settings.openrouter_site_url:
        headers['HTTP-Referer'] = settings.openrouter_site_url
    if settings.openrouter_app_name:
        headers['X-Title'] = settings.openrouter_app_name

    prompt = (
        'You are an Indian healthcare scheme assistant. '
        'Given a patient symptom transcript, return likely financial coverage schemes that might help. '
        'Choose only from these schemes: Ayushman Bharat (PM-JAY), CGHS, ESIC. '
        'Return STRICT JSON only with schema: '
        '{"matches":[{"scheme_name":"","coverage_amount":"","eligibility":"","summary":"","score":0.0}]}. '
        'Rules: '
        '1) score must be between 0 and 1. '
        f'2) return at most {max(1, min(top_k, 5))} entries. '
        '3) if transcript has no explicit insurance/cost intent, still return practical options with conservative low score (0.20-0.45) and mention eligibility check in summary. '
        f'Transcript: {transcript}'
    )

    payload = {
        'model': model,
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': 0.1,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(endpoint, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError:
        return []

    choices = data.get('choices') if isinstance(data, dict) else []
    if not choices or not isinstance(choices[0], dict):
        return []

    message = choices[0].get('message')
    content = message.get('content') if isinstance(message, dict) else ''
    text = ''
    if isinstance(content, list):
        text = ''.join(str(part.get('text') or '') for part in content if isinstance(part, dict))
    else:
        text = str(content or '')

    parsed = _extract_json_payload(text)
    if not parsed:
        return []

    raw_matches = parsed.get('matches') if isinstance(parsed, dict) else []
    if not isinstance(raw_matches, list):
        return []

    normalized: list[SchemeCoverageMatch] = []
    for item in raw_matches[: max(1, min(top_k, 5))]:
        if not isinstance(item, dict):
            continue
        normalized.append(
            SchemeCoverageMatch(
                id=f"llm-{len(normalized) + 1}",
                scheme_name=str(item.get('scheme_name') or 'Unknown Scheme').strip(),
                coverage_amount=str(item.get('coverage_amount') or 'Check official scheme terms').strip(),
                eligibility=str(item.get('eligibility') or 'Eligibility verification required').strip(),
                summary=str(item.get('summary') or 'Potential scheme option based on current transcript context.').strip(),
                score=float(item.get('score') or 0.25),
            )
        )

    return normalized


def _build_handoff_document(
    *,
    problem: str,
    severity_score: str,
    guidance: str,
    summary: str,
    recommended_action: str,
    red_flags: list[str],
    medicine_suggestions: list[dict],
) -> str:
    lines = [
        '# Doctor Handoff Document',
        '',
        f'- Problem: {problem}',
        f'- Severity: {severity_score}',
        f'- Summary: {summary}',
        f'- Guidance: {guidance}',
        f'- Recommended action: {recommended_action}',
    ]

    if red_flags:
        lines.append(f'- Red flags: {", ".join(red_flags)}')

    lines.extend(['', '## Home / Medicine Suggestions'])
    if medicine_suggestions:
        for suggestion in medicine_suggestions:
            lines.append(
                f"- {suggestion.get('name')} ({suggestion.get('category')}): {suggestion.get('reason')} "
                f"Usage: {suggestion.get('usage_note')}"
            )
    else:
        lines.append('- No medication suggestion generated; follow clinician guidance.')

    lines.extend(['', '## Safe Follow-up Notes'])
    lines.append('- This handoff is based on transcript, Qdrant retrieval, and LLM triage.')
    lines.append('- Confirm medicines with a pharmacist or clinician before use if pregnant, elderly, or with chronic disease.')
    return '\n'.join(lines)


def _medicine_suggestion_dicts(medicine_suggestions: list[object]) -> list[dict]:
    return [getattr(item, '__dict__', item) for item in medicine_suggestions]


def _fallback_text_triage(transcript: str) -> tuple[str, str, str, list[str], str]:
    text = transcript.lower()

    red_signals = [
        ('chest pain', 'Chest pain'),
        ('shortness of breath', 'Shortness of breath'),
        ('breathing difficulty', 'Breathing difficulty'),
        ('faint', 'Fainting'),
        ('unconscious', 'Unconsciousness'),
        ('severe bleeding', 'Severe bleeding'),
        ('stroke', 'Stroke symptoms'),
        ('seizure', 'Seizure'),
        ('confusion', 'Acute confusion'),
    ]
    yellow_signals = [
        ('fever', 'Fever'),
        ('pain', 'Pain'),
        ('vomit', 'Vomiting'),
        ('diarrhea', 'Diarrhea'),
        ('cough', 'Persistent cough'),
        ('sore throat', 'Sore throat'),
        ('headache', 'Headache'),
        ('dizziness', 'Dizziness'),
    ]

    red_flags = [label for key, label in red_signals if key in text]
    yellow_flags = [label for key, label in yellow_signals if key in text]
    mild_modifiers = ['mild', 'slight', 'minor', 'little', 'not severe']
    has_mild_modifier = any(term in text for term in mild_modifiers)

    if red_flags:
        severity = 'Red'
        guidance = 'Potential emergency signs detected. Seek immediate emergency care now.'
        problem = 'Potential emergency condition'
    elif yellow_flags and has_mild_modifier and len(yellow_flags) <= 2:
        severity = 'Green'
        guidance = 'Symptoms appear mild. Monitor at home, hydrate, rest, and seek routine follow-up if symptoms persist or worsen.'
        problem = yellow_flags[0]
    elif yellow_flags:
        severity = 'Yellow'
        guidance = 'Symptoms require prompt in-person evaluation. Visit a General Practitioner within 24 hours.'
        problem = yellow_flags[0]
    else:
        severity = 'Green'
        guidance = 'No immediate red-flag pattern detected. Monitor symptoms and arrange routine follow-up if they persist.'
        problem = 'General symptom concern'

    summary = transcript.strip() or 'No transcript content available.'
    wants_booking = _wants_booking(text)
    if severity == 'Red':
        recommended_action = 'Call emergency services immediately. Do not wait for a routine appointment.'
    elif severity == 'Yellow' and wants_booking:
        recommended_action = 'Book the earliest available appointment with a General Practitioner or relevant specialist today.'
    elif severity == 'Yellow':
        recommended_action = 'Book the earliest available appointment with a General Practitioner or relevant specialist today.'
    else:
        recommended_action = 'Monitor symptoms and book a routine follow-up appointment if symptoms persist for 24-48 hours.'
    return problem, severity, guidance, red_flags, recommended_action


@voice_router.post('/session', response_model=VoiceSessionCreateResponse)
async def create_voice_session(
    payload: VoiceSessionCreateRequest,
    settings: Settings = Depends(get_settings),
) -> VoiceSessionCreateResponse:
    _ = payload.user_id
    return VoiceSessionCreateResponse(
        session_id=str(uuid4()),
        native_language_code=payload.native_language_code,
        created_at=datetime.now(timezone.utc),
    )


@voice_router.post('/transcribe', response_model=VoiceTranscribeResponse)
async def transcribe_voice(
    payload: VoiceTranscribeRequest,
    settings: Settings = Depends(get_settings),
) -> VoiceTranscribeResponse:
    vapi = VapiService(settings)
    try:
        transcript = await vapi.transcribe(payload.audio_data_uri, payload.native_language_code)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return VoiceTranscribeResponse(
        session_id=payload.session_id,
        native_language_code=payload.native_language_code,
        transcribed_text_native=transcript.transcribed_text_native,
        translated_text_english=transcript.translated_text_english,
        detected_language_code=transcript.detected_language_code,
    )


@knowledge_router.post('/search', response_model=KnowledgeSearchResponse)
async def search_knowledge(
    payload: KnowledgeSearchRequest,
    settings: Settings = Depends(get_settings),
) -> KnowledgeSearchResponse:
    qdrant = QdrantService(settings)
    try:
        matches = await qdrant.search(payload.transcript, payload.language_code, payload.top_k)
        matches = _filter_relevant_matches(matches, payload.transcript, payload.top_k)
    except RuntimeError:
        # Keep frontend retrieval UX stable even if Qdrant is temporarily unavailable.
        matches = []
    return KnowledgeSearchResponse(
        matches=[KnowledgeMatch.model_validate(match.__dict__) for match in matches]
    )


@knowledge_router.post('/schemes', response_model=SchemeCoverageSearchResponse)
async def search_scheme_coverage(
    payload: KnowledgeSearchRequest,
    settings: Settings = Depends(get_settings),
) -> SchemeCoverageSearchResponse:
    qdrant = QdrantService(settings)
    try:
        matches = await qdrant.search_schemes(payload.transcript, payload.top_k)
        matches = _filter_scheme_matches(matches, payload.transcript, payload.top_k)
        if not matches:
            matches = await _openrouter_scheme_fallback(payload.transcript, settings, payload.top_k)
    except RuntimeError:
        matches = await _openrouter_scheme_fallback(payload.transcript, settings, payload.top_k)

    normalized_matches: list[SchemeCoverageMatch] = []
    for match in matches:
        if isinstance(match, SchemeCoverageMatch):
            normalized_matches.append(match)
        else:
            normalized_matches.append(SchemeCoverageMatch.model_validate(match.__dict__))

    return SchemeCoverageSearchResponse(
        matches=normalized_matches
    )


@router.post('/analyze', response_model=TriageAnalyzeResponse)
async def analyze_triage(
    payload: TriageAnalyzeRequest,
    settings: Settings = Depends(get_settings),
) -> TriageAnalyzeResponse:
    vapi = VapiService(settings)
    qdrant = QdrantService(settings)
    llm = LlmTriageService(settings)
    drugs = DrugDatabaseService()

    try:
        transcript = await vapi.transcribe(payload.audio_data_uri, payload.native_language_code)
        raw_matches = await qdrant.search(transcript.translated_text_english, payload.native_language_code, 5)
        matches = _filter_relevant_matches(raw_matches, transcript.translated_text_english, top_k=5)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    llm_result = await llm.analyze(
        transcript=transcript.translated_text_english,
        language_code=payload.native_language_code,
        qdrant_matches=matches,
    )

    if llm_result:
        problem = llm_result.problem
        severity_score = llm_result.severity_score
        guidance = llm_result.guidance
        summary = llm_result.summary
        red_flags = llm_result.red_flags
        recommended_action = llm_result.recommended_action
    elif matches:
        best_match = matches[0]
        problem = best_match.problem_label
        severity_score = best_match.severity_score
        guidance = {
            'Green': 'Monitor symptoms at home and seek routine follow-up if they persist.',
            'Yellow': 'Visit a General Practitioner within 24 hours for further evaluation.',
            'Red': 'Seek immediate emergency care now.',
        }[severity_score]
        summary = best_match.summary or transcript.translated_text_english
        wants_booking = _wants_booking(transcript.translated_text_english)
        red_flags = best_match.red_flags
        if severity_score == 'Red':
            recommended_action = 'Call emergency services immediately. Do not wait for a routine appointment.'
        elif wants_booking or severity_score == 'Yellow':
            recommended_action = 'Book the earliest available appointment with a General Practitioner or relevant specialist today.'
        else:
            recommended_action = guidance
    else:
        problem, severity_score, guidance, red_flags, recommended_action = _fallback_text_triage(payload.transcript)
        summary = payload.transcript

    medicine_suggestions = await drugs.suggest_medicines(
        problem=problem,
        transcript=transcript.translated_text_english,
        severity_score=severity_score,
        age=payload.patient_age,
        is_pregnant=payload.patient_is_pregnant,
        chronic_conditions=payload.patient_chronic_conditions,
        allergies=payload.patient_allergies,
    )
    handoff_document = _build_handoff_document(
        problem=problem,
        severity_score=severity_score,
        guidance=guidance,
        summary=summary,
        recommended_action=recommended_action,
        red_flags=red_flags,
        medicine_suggestions=_medicine_suggestion_dicts(medicine_suggestions),
    )

    # Validate results for accuracy
    validator = ResultValidator()
    qdrant_validation = validator.validate_qdrant_matches(transcript.translated_text_english, matches)
    severity_validation = validator.validate_severity_score(severity_score, matches, transcript.translated_text_english)
    red_flags_validation = validator.validate_red_flags(red_flags, transcript.translated_text_english, matches)
    
    validations = {
        'qdrant': qdrant_validation,
        'severity': severity_validation,
        'red_flags': red_flags_validation,
    }
    
    overall_confidence = validator.overall_confidence(validations)
    
    # Collect all validation notes and evidence
    validation_notes = []
    evidence_summary = []
    
    for key, val in validations.items():
        validation_notes.extend(val.reasons)
        evidence_summary.extend(val.matched_evidence)

    return TriageAnalyzeResponse(
        session_id=payload.session_id,
        problem=problem,
        capture=VoiceTranscribeResponse(
            session_id=payload.session_id,
            native_language_code=payload.native_language_code,
            transcribed_text_native=transcript.transcribed_text_native,
            translated_text_english=transcript.translated_text_english,
            detected_language_code=transcript.detected_language_code,
        ),
        assessment=TriageAssessment(
            severity_score=severity_score,
            guidance=guidance,
        ),
        summary=summary,
        red_flags=red_flags,
        recommended_action=recommended_action,
        language_code=payload.native_language_code,
        qdrant_matches=[KnowledgeMatch.model_validate(match.__dict__) for match in matches],
        medicine_suggestions=[MedicationSuggestion.model_validate(item.__dict__) for item in medicine_suggestions],
        doctor_handoff_document=handoff_document,
        overall_confidence=overall_confidence,
        validation_notes=validation_notes,
        evidence_summary=evidence_summary,
    )


@router.post('/analyze-text', response_model=TriageAnalyzeResponse)
async def analyze_triage_text(
    payload: TriageAnalyzeTextRequest,
    settings: Settings = Depends(get_settings),
) -> TriageAnalyzeResponse:
    qdrant = QdrantService(settings)
    llm = LlmTriageService(settings)
    drugs = DrugDatabaseService()

    qdrant_error: str | None = None
    try:
        raw_matches = await qdrant.search(payload.transcript, payload.native_language_code, 5)
        matches = _filter_relevant_matches(raw_matches, payload.transcript, top_k=5)
    except RuntimeError as exc:
        qdrant_error = str(exc)
        matches = []

    wants_booking = _wants_booking(payload.transcript)
    llm_result = await llm.analyze(
        transcript=payload.transcript,
        language_code=payload.native_language_code,
        qdrant_matches=matches,
    )

    if llm_result:
        problem = llm_result.problem
        severity_score = llm_result.severity_score
        guidance = llm_result.guidance
        recommended_action = llm_result.recommended_action
        summary = llm_result.summary
        red_flags = llm_result.red_flags
    elif matches:
        best_match = matches[0]
        severity_score = best_match.severity_score
        guidance = {
            'Green': 'Monitor symptoms at home and seek routine follow-up if they persist.',
            'Yellow': 'Visit a General Practitioner within 24 hours for further evaluation.',
            'Red': 'Seek immediate emergency care now.',
        }[severity_score]
        if severity_score == 'Red':
            recommended_action = 'Call emergency services immediately. Do not wait for a routine appointment.'
        elif severity_score == 'Yellow' and wants_booking:
            recommended_action = 'Book the earliest available appointment with a General Practitioner or relevant specialist today.'
        elif severity_score == 'Yellow':
            recommended_action = 'Book the earliest available appointment with a General Practitioner or relevant specialist today.'
        else:
            recommended_action = guidance
        summary = best_match.summary or payload.transcript
        problem = best_match.problem_label
        red_flags = best_match.red_flags
    else:
        problem, severity_score, guidance, red_flags, recommended_action = _fallback_text_triage(payload.transcript)
        _ = qdrant_error
        summary = payload.transcript

    medicine_suggestions = await drugs.suggest_medicines(
        problem=problem,
        transcript=payload.transcript,
        severity_score=severity_score,
        age=payload.patient_age,
        is_pregnant=payload.patient_is_pregnant,
        chronic_conditions=payload.patient_chronic_conditions,
        allergies=payload.patient_allergies,
    )
    handoff_document = _build_handoff_document(
        problem=problem,
        severity_score=severity_score,
        guidance=guidance,
        summary=summary,
        recommended_action=recommended_action,
        red_flags=red_flags,
        medicine_suggestions=_medicine_suggestion_dicts(medicine_suggestions),
    )

    # Validate results for accuracy
    validator = ResultValidator()
    qdrant_validation = validator.validate_qdrant_matches(payload.transcript, matches)
    severity_validation = validator.validate_severity_score(severity_score, matches, payload.transcript)
    red_flags_validation = validator.validate_red_flags(red_flags, payload.transcript, matches)
    
    validations = {
        'qdrant': qdrant_validation,
        'severity': severity_validation,
        'red_flags': red_flags_validation,
    }
    
    overall_confidence = validator.overall_confidence(validations)
    
    # Collect all validation notes and evidence
    validation_notes = []
    evidence_summary = []
    
    for key, val in validations.items():
        validation_notes.extend(val.reasons)
        evidence_summary.extend(val.matched_evidence)

    return TriageAnalyzeResponse(
        session_id=payload.session_id,
        problem=problem,
        capture=VoiceTranscribeResponse(
            session_id=payload.session_id,
            native_language_code=payload.native_language_code,
            transcribed_text_native=payload.transcript,
            translated_text_english=payload.transcript,
            detected_language_code=payload.native_language_code,
        ),
        assessment=TriageAssessment(
            severity_score=severity_score,
            guidance=guidance,
        ),
        summary=summary,
        red_flags=red_flags,
        recommended_action=recommended_action,
        language_code=payload.native_language_code,
        qdrant_matches=[KnowledgeMatch.model_validate(match.__dict__) for match in matches],
        medicine_suggestions=[MedicationSuggestion.model_validate(item.__dict__) for item in medicine_suggestions],
        doctor_handoff_document=handoff_document,
        overall_confidence=overall_confidence,
        validation_notes=validation_notes,
        evidence_summary=evidence_summary,
    )


@router.post('/report', response_model=TriageReportResponse)
async def report_triage(payload: TriageReportRequest) -> TriageReportResponse:
    _ = payload
    return TriageReportResponse(session_id=payload.session_id)


@router.post('/report/fhir', response_model=TriageFhirExportResponse)
async def export_triage_fhir(payload: TriageFhirExportRequest) -> TriageFhirExportResponse:
    patient_id = payload.patient_id or 'anonymous-patient'
    observation_id = f'observation-{payload.session_id}'
    condition_id = f'condition-{payload.session_id}'
    careplan_id = f'careplan-{payload.session_id}'

    fhir_bundle = {
        'resourceType': 'Bundle',
        'type': 'collection',
        'id': f'bundle-{payload.session_id}',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'entry': [
            {
                'resource': {
                    'resourceType': 'Patient',
                    'id': patient_id,
                }
            },
            {
                'resource': {
                    'resourceType': 'Condition',
                    'id': condition_id,
                    'subject': {'reference': f'Patient/{patient_id}'},
                    'code': {'text': payload.problem},
                    'clinicalStatus': {'text': 'active'},
                    'note': [{'text': payload.summary}],
                }
            },
            {
                'resource': {
                    'resourceType': 'Observation',
                    'id': observation_id,
                    'subject': {'reference': f'Patient/{patient_id}'},
                    'status': 'final',
                    'code': {'text': 'Triage severity score'},
                    'valueString': payload.severity_score,
                    'note': [{'text': ', '.join(payload.red_flags) if payload.red_flags else 'No red flags reported'}],
                }
            },
            {
                'resource': {
                    'resourceType': 'CarePlan',
                    'id': careplan_id,
                    'subject': {'reference': f'Patient/{patient_id}'},
                    'status': 'active',
                    'intent': 'plan',
                    'title': 'Voice triage follow-up plan',
                    'description': payload.recommended_action,
                    'note': [{'text': payload.guidance}] if payload.guidance else [],
                }
            },
        ],
    }

    return TriageFhirExportResponse(
        sessionId=payload.session_id,
        resourceType='Bundle',
        fhirBundle=fhir_bundle,
    )
