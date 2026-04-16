from __future__ import annotations

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers.drug_checker import router as drug_checker_router
from app.routers.report_analysis import router as report_analysis_router
from app.routers.triage import knowledge_router, router, voice_router

settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(voice_router)
app.include_router(knowledge_router)
app.include_router(drug_checker_router)
app.include_router(report_analysis_router)
app.include_router(router)


@app.get('/')
async def root() -> dict[str, str]:
    return {'name': settings.app_name, 'status': 'running'}


@app.get('/favicon.ico', include_in_schema=False)
async def favicon() -> Response:
    return Response(status_code=204)


@app.get('/health')
async def health() -> dict[str, str]:
    return {'status': 'ok'}
