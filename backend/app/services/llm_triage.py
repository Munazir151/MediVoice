from __future__ import annotations

from dataclasses import dataclass
import json
import re

import httpx

from app.core.config import Settings
from app.services.qdrant import QdrantMatch


@dataclass
class LlmTriageResult:
    problem: str
    severity_score: str
    guidance: str
    summary: str
    red_flags: list[str]
    recommended_action: str


class LlmTriageService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.api_key = settings.openrouter_api_key
        self.model = settings.openrouter_model or 'google/gemma-4-26b-a4b-it:free'

    @property
    def enabled(self) -> bool:
        return bool(self.settings.llm_enabled and self.api_key and self.model)

    @staticmethod
    def _extract_json(text: str) -> dict | None:
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
    def _normalize_severity(value: str) -> str:
        normalized = value.strip().capitalize()
        if normalized not in {'Green', 'Yellow', 'Red'}:
            return 'Yellow'
        return normalized

    async def analyze(
        self,
        transcript: str,
        language_code: str,
        qdrant_matches: list[QdrantMatch],
    ) -> LlmTriageResult | None:
        if not self.enabled:
            return None

        qdrant_context = []
        for index, match in enumerate(qdrant_matches[:5], start=1):
            qdrant_context.append(
                f"{index}. problem={match.problem_label}; severity={match.severity_score}; "
                f"specialty={match.specialty or 'General Practitioner'}; "
                f"red_flags={', '.join(match.red_flags) if match.red_flags else 'none'}; "
                f"summary={match.summary or 'n/a'}"
            )

        context_text = '\n'.join(qdrant_context) if qdrant_context else 'No Qdrant matches available.'

        prompt = (
            'You are a clinical triage assistant. Use the patient transcript and Qdrant medical context to produce '
            'a safe, concise triage JSON response. Prioritize transcript evidence. Use Qdrant context to improve accuracy.\n\n'
            f'Patient language code: {language_code}\n'
            f'Patient transcript: {transcript}\n\n'
            f'Qdrant context:\n{context_text}\n\n'
            'Return only JSON with this exact schema:\n'
            '{\n'
            '  "problem": "string",\n'
            '  "severity_score": "Green|Yellow|Red",\n'
            '  "guidance": "string",\n'
            '  "summary": "string",\n'
            '  "red_flags": ["string"],\n'
            '  "recommended_action": "string"\n'
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
            'temperature': 0.2,
        }

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(endpoint, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError:
            return None

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

        problem = str(obj.get('problem') or 'General symptom concern').strip()
        severity_score = self._normalize_severity(str(obj.get('severity_score') or 'Yellow'))
        guidance = str(obj.get('guidance') or 'Visit a General Practitioner within 24 hours.').strip()
        summary = str(obj.get('summary') or transcript).strip()
        red_flags_raw = obj.get('red_flags') or []
        red_flags = [str(item).strip() for item in red_flags_raw if str(item).strip()]
        recommended_action = str(
            obj.get('recommended_action')
            or 'Book the earliest available appointment with a General Practitioner or relevant specialist today.'
        ).strip()

        return LlmTriageResult(
            problem=problem,
            severity_score=severity_score,
            guidance=guidance,
            summary=summary,
            red_flags=red_flags,
            recommended_action=recommended_action,
        )
