from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.schemas.triage import (
    DrugInteractionCheckRequest,
    DrugInteractionCheckResponse,
    DrugInteractionMatch,
)
from app.services.qdrant import QdrantService


router = APIRouter(prefix='/drug-checker', tags=['drug-checker'])


@router.post('/analyze-text', response_model=DrugInteractionCheckResponse)
async def analyze_drug_interaction_text(
    payload: DrugInteractionCheckRequest,
    settings: Settings = Depends(get_settings),
) -> DrugInteractionCheckResponse:
    qdrant = QdrantService(settings)

    try:
        matches = await qdrant.search_drugs(payload.transcript, payload.top_k)
    except RuntimeError:
        matches = []

    return DrugInteractionCheckResponse(
        matches=[DrugInteractionMatch.model_validate(match.__dict__) for match in matches]
    )