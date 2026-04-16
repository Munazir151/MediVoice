from __future__ import annotations

import argparse
import json
import re
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


def default_interactions() -> list[dict[str, Any]]:
    return [
        {
            "drug_a": "ibuprofen",
            "drug_b": "warfarin",
            "interaction_severity": "Red",
            "safe_dosage": "Avoid co-use unless specifically directed by a clinician.",
            "recommendation": "Increased bleeding risk. Consider non-NSAID alternatives and urgent clinician review.",
            "summary": "NSAIDs can increase bleeding risk with anticoagulants.",
            "warnings": ["Bleeding risk", "Watch for black stools", "Seek urgent care for unusual bruising"],
        },
        {
            "drug_a": "paracetamol",
            "drug_b": "ibuprofen",
            "interaction_severity": "Green",
            "safe_dosage": "Paracetamol 500-1000 mg q4-6h (max 4000 mg/day) and ibuprofen 200-400 mg q6-8h (max 1200 mg/day OTC).",
            "recommendation": "Can be alternated short-term in healthy adults if no contraindications.",
            "summary": "Common pain/fever combination when label limits are followed.",
            "warnings": ["Do not exceed daily maximum doses", "Take ibuprofen with food if stomach-sensitive"],
        },
        {
            "drug_a": "metformin",
            "drug_b": "insulin",
            "interaction_severity": "Yellow",
            "safe_dosage": "Use only as prescribed; monitor glucose closely.",
            "recommendation": "Combination is common but may increase hypoglycemia risk.",
            "summary": "Requires dose adjustment and glucose monitoring.",
            "warnings": ["Monitor blood sugar", "Watch for hypoglycemia symptoms"],
        },
        {
            "drug_a": "aspirin",
            "drug_b": "clopidogrel",
            "interaction_severity": "Yellow",
            "safe_dosage": "Use clinician-prescribed doses only.",
            "recommendation": "Dual antiplatelet therapy is indicated in some conditions but raises bleed risk.",
            "summary": "Antiplatelet effect is additive.",
            "warnings": ["Bleeding risk", "Do not self-medicate with extra NSAIDs"],
        },
        {
            "drug_a": "amoxicillin",
            "drug_b": "paracetamol",
            "interaction_severity": "Green",
            "safe_dosage": "Use standard label/prescribed doses.",
            "recommendation": "No major direct interaction in most cases.",
            "summary": "Frequently co-used for infection with fever/pain support.",
            "warnings": ["Observe allergy symptoms", "Complete antibiotic course if prescribed"],
        },
    ]


def load_interactions(source_file: str | None) -> list[dict[str, Any]]:
    if not source_file:
        return default_interactions()

    source_path = Path(source_file)
    if not source_path.exists():
        raise FileNotFoundError(f"Source file not found: {source_path}")

    data = json.loads(source_path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("Source file must be a JSON array of drug interaction objects")

    return data


def normalize_drug_name(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def normalize_severity(value: Any) -> str:
    text = normalize_drug_name(value).lower()
    if any(term in text for term in ["red", "critical", "severe", "major", "contraindicated"]):
        return "Red"
    if any(term in text for term in ["green", "low", "minor", "safe"]):
        return "Green"
    return "Yellow"


def get_string(record: dict[str, Any], keys: list[str], default: str = "") -> str:
    for key in keys:
        if key in record and record[key] is not None:
            return str(record[key])
    return default


def get_list(record: dict[str, Any], keys: list[str]) -> list[str]:
    for key in keys:
        if key not in record or record[key] is None:
            continue
        value = record[key]
        if isinstance(value, list):
            return [str(item) for item in value if str(item).strip()]
        if isinstance(value, str) and value.strip():
            return [value]
    return []


def build_interaction_payload(record: dict[str, Any]) -> dict[str, Any]:
    drug_a = normalize_drug_name(get_string(record, ["drug_a", "drug_1", "drug_one", "first_drug", "medication_a"]))
    drug_b = normalize_drug_name(get_string(record, ["drug_b", "drug_2", "drug_two", "second_drug", "medication_b"]))

    if not drug_a or not drug_b:
        raise ValueError("Each interaction requires both drug_a and drug_b (or supported aliases)")

    safe_dosage = get_string(
        record,
        ["safe_dosage", "recommended_dose", "dosage", "dose"],
        default="Follow label or pharmacist guidance",
    )
    recommendation = get_string(record, ["recommendation", "advice", "guidance"], default="")
    summary = get_string(record, ["summary", "description", "notes"], default="")
    warnings = get_list(record, ["warnings", "cautions", "red_flags"])

    source_text = " ".join(
        chunk
        for chunk in [
            f"{drug_a} with {drug_b}",
            normalize_severity(record.get("interaction_severity") or record.get("severity") or record.get("severity_score")),
            safe_dosage,
            recommendation,
            summary,
            " ".join(warnings),
        ]
        if chunk
    ).strip()

    return {
        "drug_a": drug_a,
        "drug_b": drug_b,
        "interaction_severity": normalize_severity(record.get("interaction_severity") or record.get("severity") or record.get("severity_score")),
        "safe_dosage": safe_dosage,
        "recommendation": recommendation or None,
        "summary": summary or None,
        "warnings": warnings,
        "source_text": source_text,
    }


def ensure_collection(qdrant_service: QdrantService, recreate: bool) -> None:
    collection_name = qdrant_service.settings.qdrant_drug_collection_name
    vector_size = max(8, qdrant_service.settings.qdrant_vector_size)

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


def index_interactions(source_file: str | None, recreate: bool) -> int:
    settings = get_settings()
    qdrant_service = QdrantService(settings)
    ensure_collection(qdrant_service, recreate=recreate)

    interactions = load_interactions(source_file)
    points: list[PointStruct] = []

    for record in interactions:
        payload = build_interaction_payload(record)
        vector = qdrant_service._embed_text(payload["source_text"])

        points.append(
            PointStruct(
                id=str(record.get("id") or uuid4()),
                vector=vector,
                payload=payload,
            )
        )

    qdrant_service.client.upsert(
        collection_name=settings.qdrant_drug_collection_name,
        points=points,
        wait=True,
    )

    return len(points)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Index drug interactions into Qdrant")
    parser.add_argument(
        "--source",
        type=str,
        default=None,
        help="Optional JSON file containing drug interactions",
    )
    parser.add_argument(
        "--recreate",
        action="store_true",
        help="Recreate collection before indexing",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    indexed = index_interactions(source_file=args.source, recreate=args.recreate)
    print(f"Indexed {indexed} drug interactions into Qdrant collection.")


if __name__ == "__main__":
    main()
