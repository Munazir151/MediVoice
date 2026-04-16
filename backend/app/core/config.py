from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ENV_PATH = Path(__file__).resolve().parents[2] / '.env'


class Settings(BaseSettings):
    app_name: str = 'MediVoice API'
    fastapi_env: str = 'development'
    cors_origins: str = 'http://localhost:3000'
    vapi_api_key: str | None = None
    vapi_base_url: str = 'https://api.vapi.ai'
    vapi_transcribe_path: str = '/transcribe'
    qdrant_url: str = 'http://localhost:6333'
    qdrant_api_key: str | None = None
    qdrant_collection_name: str = 'medivoice_symptoms'
    qdrant_scheme_collection_name: str = 'medivoice_schemes'
    qdrant_drug_collection_name: str = 'medivoice_drugs'
    qdrant_vector_size: int = 64
    qdrant_semantic_enabled: bool = True
    qdrant_embedding_provider: str = 'fastembed'
    qdrant_embedding_model: str = 'BAAI/bge-small-en-v1.5'
    llm_enabled: bool = True
    google_api_key: str | None = None
    gemini_api_key: str | None = None
    llm_model: str = 'gemini-2.5-flash'
    openrouter_api_key: str | None = None
    openrouter_model: str | None = None
    openrouter_base_url: str = 'https://openrouter.ai/api/v1'
    openrouter_site_url: str | None = None
    openrouter_app_name: str = 'MediVoice'
    drug_reference_api_enabled: bool = True
    drug_reference_timeout_seconds: float = 3.5

    model_config = SettingsConfigDict(env_file=BACKEND_ENV_PATH, env_file_encoding='utf-8', extra='ignore')

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(',') if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
