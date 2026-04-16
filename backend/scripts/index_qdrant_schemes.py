from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any
from uuid import uuid4

from qdrant_client.models import Distance, PointStruct, VectorParams

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import get_settings
from app.services.qdrant import QdrantService


def default_scheme_records() -> list[dict[str, Any]]:
    return [
        {
            'scheme_name': 'Ayushman Bharat (PM-JAY)',
            'coverage_amount': 'Up to INR 5,00,000 per family per year',
            'eligibility': 'Economically vulnerable families listed in SECC database',
            'summary': 'Cashless secondary and tertiary hospitalization coverage across empaneled hospitals.',
            'keywords': ['pm-jay', 'ayushman', 'cashless', 'hospitalization', 'family cover'],
        },
        {
            'scheme_name': 'CGHS',
            'coverage_amount': 'As per CGHS package rates and approved procedures',
            'eligibility': 'Central Government employees, pensioners, and notified beneficiary categories',
            'summary': 'Comprehensive healthcare support through CGHS wellness centers and empaneled hospitals.',
            'keywords': ['cghs', 'central government', 'pensioner', 'wellness center', 'empaneled'],
        },
        {
            'scheme_name': 'ESIC',
            'coverage_amount': 'Medical care for insured persons and eligible dependents',
            'eligibility': 'Employees covered under ESI contribution criteria',
            'summary': 'Employer-employee contributory social security scheme including medical benefits.',
            'keywords': ['esic', 'esi', 'insured employee', 'dependents', 'social security'],
        },
        {
            'scheme_name': 'State Health Insurance Scheme',
            'coverage_amount': 'Varies by state policy and treatment package',
            'eligibility': 'State-specific beneficiary criteria',
            'summary': 'State government backed treatment assistance for eligible residents.',
            'keywords': ['state scheme', 'state health', 'resident eligibility', 'beneficiary'],
        },
    ]


def load_scheme_records(source_file: str | None) -> list[dict[str, Any]]:
    if not source_file:
        return default_scheme_records()

    source_path = Path(source_file)
    if not source_path.exists():
        raise FileNotFoundError(f'Source file not found: {source_path}')

    data = json.loads(source_path.read_text(encoding='utf-8'))
    if not isinstance(data, list):
        raise ValueError('Source file must be a JSON array of scheme objects')

    return data


def build_scheme_text(record: dict[str, Any]) -> str:
    fragments = [
        str(record.get('scheme_name') or ''),
        str(record.get('coverage_amount') or ''),
        str(record.get('eligibility') or ''),
        str(record.get('summary') or ''),
        ' '.join(str(value) for value in record.get('keywords', [])),
    ]
    text = ' '.join(fragment for fragment in fragments if fragment).strip()
    if not text:
        raise ValueError('Each scheme record must include enough text fields to index')
    return text


def ensure_collection(qdrant_service: QdrantService, recreate: bool) -> None:
    settings = qdrant_service.settings
    collection_name = settings.qdrant_scheme_collection_name
    vector_size = max(8, settings.qdrant_vector_size)

    if recreate:
        qdrant_service.client.recreate_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )
        return

    try:
        qdrant_service.client.get_collection(collection_name)
    except Exception:
        qdrant_service.client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )


def index_schemes(source_file: str | None, recreate: bool) -> int:
    settings = get_settings()
    qdrant_service = QdrantService(settings)
    ensure_collection(qdrant_service, recreate=recreate)

    records = load_scheme_records(source_file)
    points: list[PointStruct] = []

    for record in records:
        text = build_scheme_text(record)
        vector = qdrant_service._embed_text(text)

        payload = {
            'scheme_name': str(record.get('scheme_name') or 'Unknown Scheme'),
            'coverage_amount': str(record.get('coverage_amount') or 'Not specified'),
            'eligibility': str(record.get('eligibility') or 'Check eligibility criteria'),
            'summary': str(record.get('summary') or ''),
            'keywords': list(record.get('keywords') or []),
            'source_text': text,
        }

        points.append(
            PointStruct(
                id=str(record.get('id') or uuid4()),
                vector=vector,
                payload=payload,
            )
        )

    qdrant_service.client.upsert(
        collection_name=settings.qdrant_scheme_collection_name,
        points=points,
        wait=True,
    )

    return len(points)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Index scheme coverage records into Qdrant')
    parser.add_argument('--source', type=str, default=None, help='Optional JSON file containing scheme records')
    parser.add_argument('--recreate', action='store_true', help='Recreate collection before indexing')
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    indexed = index_schemes(source_file=args.source, recreate=args.recreate)
    print(f'Indexed {indexed} scheme records into Qdrant collection.')


if __name__ == '__main__':
    main()
