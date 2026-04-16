from __future__ import annotations

from dataclasses import dataclass

import httpx

from app.core.config import Settings


@dataclass
class VapiTranscript:
    transcribed_text_native: str
    translated_text_english: str
    detected_language_code: str | None = None


class VapiService:
    def __init__(self, settings: Settings):
        self.settings = settings

    async def transcribe(self, audio_data_uri: str, native_language_code: str) -> VapiTranscript:
        if not self.settings.vapi_api_key:
            raise RuntimeError('VAPI_API_KEY is not configured. Real transcription is unavailable.')

        base_url = self.settings.vapi_base_url.rstrip('/')
        path = self.settings.vapi_transcribe_path
        if not path.startswith('/'):
            path = f'/{path}'

        url = f'{base_url}{path}'
        payload = {
            'audioDataUri': audio_data_uri,
            'nativeLanguageCode': native_language_code,
        }
        headers = {
            'Authorization': f'Bearer {self.settings.vapi_api_key}',
            'Content-Type': 'application/json',
        }

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError as exc:
            raise RuntimeError(f'Vapi transcription request failed: {exc}') from exc

        transcribed_text_native = (
            data.get('transcribedTextNative')
            or data.get('transcriptNative')
            or data.get('transcript')
            or data.get('text')
            or ''
        )
        translated_text_english = (
            data.get('translatedTextEnglish')
            or data.get('translation')
            or transcribed_text_native
        )
        detected_language_code = data.get('detectedLanguageCode') or data.get('languageCode') or native_language_code

        if not transcribed_text_native:
            raise RuntimeError('Vapi transcription returned empty transcript.')

        return VapiTranscript(
            transcribed_text_native=transcribed_text_native,
            translated_text_english=translated_text_english,
            detected_language_code=detected_language_code,
        )
