from __future__ import annotations

import asyncio
import base64
import itertools
import json
import re
from dataclasses import dataclass

import fitz  # PyMuPDF
import httpx

from app.core.config import Settings
from app.schemas.report_analysis import (
    ClinicalFindingItem,
    InteractionItem,
    MedicalReportAnalysisResponse,
    MedicineItem,
    PatientInfo,
    TestValueItem,
)
from app.services.qdrant import QdrantService


MAX_UPLOAD_SIZE = 10 * 1024 * 1024
ALLOWED_MIME_TYPES = {
    'application/pdf',
    'image/jpeg',
    'image/png',
}
SUSPICIOUS_SIGNATURES = [
    b'<script',
    b'powershell',
    b'cmd.exe',
    b'javascript:',
    b'vbs',
]


@dataclass
class ValidatedFile:
    filename: str
    content_type: str
    data: bytes


class ReportAnalysisError(Exception):
    pass


class MedicalReportAnalysisService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.qdrant = QdrantService(settings)

    @staticmethod
    def validate_file(filename: str, content_type: str | None, data: bytes) -> ValidatedFile:
        if not filename:
            raise ReportAnalysisError('File name is required.')

        if not data:
            raise ReportAnalysisError('Uploaded file is empty.')

        if len(data) > MAX_UPLOAD_SIZE:
            raise ReportAnalysisError('File is too large. Max size is 10MB.')

        mime = (content_type or '').lower().strip()
        if mime not in ALLOWED_MIME_TYPES:
            raise ReportAnalysisError('Unsupported file type. Upload PDF, JPG, or PNG.')

        lowered = data[:250000].lower()
        if any(signature in lowered for signature in SUSPICIOUS_SIGNATURES):
            raise ReportAnalysisError('File blocked by safety scanner. Please upload a clean document.')

        return ValidatedFile(filename=filename, content_type=mime, data=data)

    @staticmethod
    def file_to_base64_images(file: ValidatedFile) -> list[str]:
        if file.content_type in {'image/jpeg', 'image/png'}:
            return [base64.b64encode(file.data).decode('utf-8')]

        images_b64: list[str] = []
        try:
            pdf = fitz.open(stream=file.data, filetype='pdf')
        except Exception as exc:
            raise ReportAnalysisError('Invalid PDF file.') from exc

        try:
            for page_index in range(len(pdf)):
                page = pdf.load_page(page_index)
                pix = page.get_pixmap(dpi=170)
                png_bytes = pix.tobytes('png')
                images_b64.append(base64.b64encode(png_bytes).decode('utf-8'))

                # Guard against very large docs for latency and cost.
                if page_index >= 11:
                    break
        finally:
            pdf.close()

        if not images_b64:
            raise ReportAnalysisError('Could not render document pages.')

        return images_b64

    @staticmethod
    def _response_error_detail(response: httpx.Response) -> str:
        try:
            data = response.json()
        except Exception:
            data = None

        if isinstance(data, dict):
            error = data.get('error')
            if isinstance(error, dict):
                message = error.get('message')
                if message:
                    return str(message)

            message = data.get('message')
            if message:
                return str(message)

        return response.text.strip()

    @staticmethod
    def _is_retryable_status(status_code: int) -> bool:
        return status_code == 429 or 500 <= status_code < 600

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

    def _has_openrouter_config(self) -> bool:
        return bool(self.settings.openrouter_api_key and (self.settings.openrouter_model or self.settings.llm_model))

    @staticmethod
    def _build_openrouter_content(parts: list[dict], prompt: str) -> list[dict]:
        content: list[dict] = [{'type': 'text', 'text': prompt}]

        for part in parts:
            inline_data = part.get('inline_data') if isinstance(part, dict) else None
            if not isinstance(inline_data, dict):
                continue

            mime_type = str(inline_data.get('mime_type') or 'image/png')
            image_data = str(inline_data.get('data') or '')
            if not image_data:
                continue

            content.append(
                {
                    'type': 'image_url',
                    'image_url': {
                        'url': f'data:{mime_type};base64,{image_data}',
                    },
                }
            )

        return content

    async def _call_openrouter_json(self, parts: list[dict], prompt: str) -> dict:
        api_key = self.settings.openrouter_api_key
        model = self.settings.openrouter_model or 'google/gemma-4-26b-a4b-it:free'

        if not api_key or not model:
            raise ReportAnalysisError('OpenRouter API key not configured.')

        endpoint = f"{self.settings.openrouter_base_url.rstrip('/')}/chat/completions"
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }
        if self.settings.openrouter_site_url:
            headers['HTTP-Referer'] = self.settings.openrouter_site_url
        if self.settings.openrouter_app_name:
            headers['X-Title'] = self.settings.openrouter_app_name

        payload = {
            'model': model,
            'messages': [
                {
                    'role': 'user',
                    'content': self._build_openrouter_content(parts, prompt),
                }
            ],
            'temperature': 0.2,
        }

        last_response: httpx.Response | None = None
        async with httpx.AsyncClient(timeout=90.0) as client:
            for attempt in range(3):
                response = await client.post(endpoint, json=payload, headers=headers)
                last_response = response

                if response.status_code < 400:
                    break

                if not self._is_retryable_status(response.status_code) or attempt == 2:
                    detail = self._response_error_detail(response)
                    if detail:
                        raise ReportAnalysisError(f'OpenRouter request failed ({response.status_code}): {detail}')
                    raise ReportAnalysisError(f'OpenRouter request failed ({response.status_code}).')

                await asyncio.sleep(2 ** attempt)

        if last_response is None or last_response.status_code >= 400:
            raise ReportAnalysisError('OpenRouter request failed.')

        data = last_response.json()
        choices = data.get('choices') if isinstance(data, dict) else []
        if not choices:
            raise ReportAnalysisError('OpenRouter returned no choices.')

        message = choices[0].get('message') if isinstance(choices[0], dict) else None
        content = message.get('content') if isinstance(message, dict) else None
        if not content:
            raise ReportAnalysisError('OpenRouter response parsing failed.')

        if isinstance(content, list):
            content = ''.join(str(part.get('text') or '') for part in content if isinstance(part, dict))

        parsed = self._extract_json(str(content))
        if not parsed:
            raise ReportAnalysisError('OpenRouter returned invalid JSON.')

        return parsed

    async def _call_structured_llm(self, parts: list[dict], prompt: str) -> dict:
        if not self.settings.llm_enabled:
            raise ReportAnalysisError('LLM processing is disabled.')

        if not self._has_openrouter_config():
            raise ReportAnalysisError('OpenRouter API key/model not configured.')

        return await self._call_openrouter_json(parts, prompt)

    async def _extract_structured(
        self,
        images_b64: list[str],
        document_type: str,
        language: str,
    ) -> MedicalReportAnalysisResponse:
        translation_hint = ''
        if language not in {'English', 'Auto'}:
            translation_hint = f' Also include translated_summary in {language}; keep it concise and patient-friendly.'

        prompt = (
            'You are a clinical document extraction engine. '
            'Extract patient profile, tests, findings and summary from uploaded medical document images. '
            'Return STRICT JSON with this shape only: '
            '{"patient_info":{"name":"","age":"","gender":""},'
            '"health_summary":"",'
            '"clinical_findings":[{"title":"","explanation":""}],'
            '"medicines":[{"name":"","dose":"","frequency":"","purpose":"","what_it_is":"","what_it_does":""}],'
            '"tests":[{"parameter":"","value":"","unit":"","range":"","status":"NORMAL","explanation":""}],'
            '"abnormal_flags":[],"summary":"","translated_summary":""}. '
            'Rules: '
            '1) status is NORMAL or ABNORMAL. '
            '2) Keep all fields extracted from the report text; do not invent values. '
            f'3) document_type is {document_type}. '
            '4) if not found, return empty arrays and concise summary. '
            '5) health_summary should be a patient-friendly paragraph explaining key results. '
            '6) clinical_findings should explain abnormalities or important interpretations in bullet-friendly language. '
            '7) For each medicine include what_it_is (medicine class/type in simple words) and what_it_does (why prescribed and expected effect). '
            '8) For reports explain each test in tests[].explanation in plain language with awareness-focused guidance.'
            f'{translation_hint}'
        )

        parts = [{'inline_data': {'mime_type': 'image/png', 'data': image}} for image in images_b64]
        parsed = await self._call_structured_llm(parts, prompt)

        patient_info = PatientInfo.model_validate(parsed.get('patient_info') or {})
        health_summary = str(parsed.get('health_summary') or '').strip()
        clinical_findings = [
            ClinicalFindingItem.model_validate(item) for item in (parsed.get('clinical_findings') or [])
        ]
        medicines = [MedicineItem.model_validate(item) for item in (parsed.get('medicines') or [])]
        tests = [TestValueItem.model_validate(item) for item in (parsed.get('tests') or [])]
        summary = str(parsed.get('summary') or '').strip()
        translated_summary = str(parsed.get('translated_summary') or '').strip()

        if not health_summary:
            health_summary = summary

        if not translated_summary or language in {'English', 'Auto'}:
            translated_summary = summary

        return MedicalReportAnalysisResponse(
            patient_info=patient_info,
            health_summary=health_summary,
            clinical_findings=clinical_findings,
            medicines=medicines,
            tests=tests,
            interactions=[],
            summary=summary,
            translated_summary=translated_summary,
        )

    async def _augment_interactions(self, result: MedicalReportAnalysisResponse) -> None:
        names = [med.name.strip() for med in result.medicines if med.name.strip()]
        unique_names = list(dict.fromkeys(names))[:8]

        if len(unique_names) < 2:
            return

        interactions: list[InteractionItem] = []

        for drug1, drug2 in itertools.combinations(unique_names, 2):
            query = f'{drug1} and {drug2}'
            try:
                matches = await self.qdrant.search_drugs(query, top_k=1)
            except RuntimeError:
                continue

            if not matches:
                continue

            top = matches[0]
            severity = 'LOW'
            if top.interaction_severity == 'Red':
                severity = 'HIGH'
            elif top.interaction_severity == 'Yellow':
                severity = 'MEDIUM'

            interactions.append(
                InteractionItem(
                    drug1=drug1,
                    drug2=drug2,
                    severity=severity,
                )
            )

        result.interactions = interactions[:10]

    async def analyze(self, file: ValidatedFile, document_type: str, language: str) -> MedicalReportAnalysisResponse:
        images_b64 = self.file_to_base64_images(file)
        result = await self._extract_structured(images_b64, document_type=document_type, language=language)
        await self._augment_interactions(result)
        return result
