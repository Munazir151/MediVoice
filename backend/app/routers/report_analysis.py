from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.core.config import Settings, get_settings
from app.schemas.report_analysis import DocumentType, LanguageType, MedicalReportAnalysisResponse
from app.services.report_analysis import MedicalReportAnalysisService, ReportAnalysisError


router = APIRouter(tags=['report-analysis'])


@router.post('/analyze', response_model=MedicalReportAnalysisResponse)
async def analyze_medical_report(
    file: UploadFile = File(...),
    document_type: DocumentType = Form(..., alias='documentType'),
    language: LanguageType = Form(default='English'),
    settings: Settings = Depends(get_settings),
) -> MedicalReportAnalysisResponse:
    content = await file.read()
    service = MedicalReportAnalysisService(settings)

    try:
        validated = service.validate_file(
            filename=file.filename or '',
            content_type=file.content_type,
            data=content,
        )
        return await service.analyze(validated, document_type=document_type, language=language)
    except ReportAnalysisError as exc:
        detail = str(exc)
        status_code = status.HTTP_400_BAD_REQUEST

        lowered = detail.lower()
        if '(429)' in detail or 'rate limit' in lowered or 'quota' in lowered:
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE

        raise HTTPException(status_code=status_code, detail=detail) from exc
