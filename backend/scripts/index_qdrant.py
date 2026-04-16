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


def default_cases() -> list[dict[str, Any]]:
    return [
        {
            "problem_label": "Upper Respiratory Tract Infection",
            "severity_score": "Green",
            "red_flags": ["High persistent fever", "Breathing difficulty"],
            "specialty": "General Practitioner",
            "summary": "Mild sore throat, nasal congestion, and dry cough for 2 days.",
            "text": "I have sore throat, runny nose, mild cough, and low fever since yesterday.",
        },
        {
            "problem_label": "Acute Bronchitis",
            "severity_score": "Yellow",
            "red_flags": ["Breathlessness", "Worsening cough"],
            "specialty": "Pulmonologist",
            "summary": "Persistent productive cough and chest discomfort.",
            "text": "My cough has worsened with phlegm and mild chest tightness for four days.",
        },
        {
            "problem_label": "Gastroenteritis",
            "severity_score": "Yellow",
            "red_flags": ["Dehydration", "Blood in stool"],
            "specialty": "Gastroenterologist",
            "summary": "Vomiting, loose stools, abdominal cramps.",
            "text": "I have abdominal cramps, vomiting, and diarrhea since morning.",
        },
        {
            "problem_label": "Migraine Episode",
            "severity_score": "Green",
            "red_flags": ["Sudden worst headache", "Neurological deficits"],
            "specialty": "Neurologist",
            "summary": "Recurring unilateral headache with photophobia.",
            "text": "I have one-sided headache with sensitivity to light and mild nausea.",
        },
        {
            "problem_label": "Acute Coronary Syndrome (Suspected)",
            "severity_score": "Red",
            "red_flags": ["Chest pain", "Shortness of breath", "Sweating"],
            "specialty": "Cardiologist",
            "summary": "Severe chest pressure radiating to left arm with breathlessness.",
            "text": "Severe chest pain, sweating, and pain spreading to my left arm started suddenly.",
        },
        {
            "problem_label": "Asthma Exacerbation",
            "severity_score": "Yellow",
            "red_flags": ["Wheezing", "Breathlessness at rest"],
            "specialty": "Pulmonologist",
            "summary": "Wheezing and shortness of breath with known asthma history.",
            "text": "I am wheezing and finding it hard to breathe, especially while speaking.",
        },
        {
            "problem_label": "Urinary Tract Infection",
            "severity_score": "Yellow",
            "red_flags": ["High fever", "Flank pain"],
            "specialty": "General Practitioner",
            "summary": "Burning urination and increased frequency.",
            "text": "I feel burning while passing urine and need to urinate very frequently.",
        },
        {
            "problem_label": "Allergic Rhinitis",
            "severity_score": "Green",
            "red_flags": ["Breathing distress", "Facial swelling"],
            "specialty": "ENT Specialist",
            "summary": "Sneezing, itchy eyes, clear nasal discharge.",
            "text": "I have sneezing, itchy nose, and watery eyes after dust exposure.",
        },
        {
            "problem_label": "Acute Appendicitis (Suspected)",
            "severity_score": "Red",
            "red_flags": ["Right lower abdominal pain", "Fever", "Vomiting"],
            "specialty": "General Surgeon",
            "summary": "Progressive right lower quadrant pain with fever.",
            "text": "Pain started near my navel and moved to the lower right abdomen with vomiting.",
        },
        {
            "problem_label": "Otitis Media",
            "severity_score": "Green",
            "red_flags": ["Severe ear pain", "Hearing loss", "High fever"],
            "specialty": "ENT Specialist",
            "summary": "Ear pain with blocked sensation and mild fever.",
            "text": "I have pain in my ear with slight fever and reduced hearing since yesterday.",
        },
        {
            "problem_label": "Musculoskeletal Knee Pain",
            "severity_score": "Green",
            "red_flags": ["Unable to bear weight", "Joint swelling", "Fever after injury"],
            "specialty": "Orthopedic Surgeon",
            "summary": "Pain around the knee joint that worsens with movement or climbing stairs.",
            "text": "I have knee joint pain while walking and climbing stairs, with no major injury.",
        },
        {
            "problem_label": "Osteoarthritis Flare",
            "severity_score": "Green",
            "red_flags": ["Severe swelling", "Locked joint", "Sudden deformity"],
            "specialty": "Orthopedic Surgeon",
            "summary": "Chronic joint pain and stiffness, especially in knees and hands.",
            "text": "My knee hurts more in the morning with stiffness and it feels like arthritis pain.",
        },
        {
            "problem_label": "Sprain / Soft Tissue Injury",
            "severity_score": "Green",
            "red_flags": ["Inability to walk", "Severe swelling", "Visible deformity"],
            "specialty": "General Practitioner",
            "summary": "Pain after twisting or overuse with mild swelling and reduced movement.",
            "text": "I twisted my knee and now it is painful with mild swelling when I walk.",
        },
        {
            "problem_label": "Back Pain / Muscle Strain",
            "severity_score": "Green",
            "red_flags": ["Leg weakness", "Loss of bladder control", "Fever"],
            "specialty": "General Practitioner",
            "summary": "Mechanical back pain that worsens on bending or lifting.",
            "text": "I have lower back pain after lifting something heavy and it hurts more when I bend.",
        },
        {
            "problem_label": "Acid Reflux / Gastritis",
            "severity_score": "Green",
            "red_flags": ["Vomiting blood", "Black stool", "Severe abdominal pain"],
            "specialty": "Gastroenterologist",
            "summary": "Burning stomach discomfort or acidity, often after meals.",
            "text": "I have burning in my stomach and acidity after meals with some nausea.",
        },
        {
            "problem_label": "Hypertension Concern",
            "severity_score": "Yellow",
            "red_flags": ["Chest pain", "Vision changes", "Severe headache"],
            "specialty": "Cardiologist",
            "summary": "High blood pressure concern needing monitoring and medical review.",
            "text": "My blood pressure is high and I feel occasional headache and dizziness.",
        },
        {
            "problem_label": "Diabetes / Blood Sugar Concern",
            "severity_score": "Yellow",
            "red_flags": ["Confusion", "Excessive thirst", "Very low sugar"],
            "specialty": "Endocrinologist",
            "summary": "Blood sugar symptoms like frequent urination, thirst, or fatigue.",
            "text": "I feel very thirsty, urinate often, and feel tired most days.",
        },
        {
            "problem_label": "Migraine with Nausea",
            "severity_score": "Green",
            "red_flags": ["Sudden worst headache", "Neurological deficits"],
            "specialty": "Neurologist",
            "summary": "Recurring headache with nausea and light sensitivity.",
            "text": "I have a throbbing headache with nausea and sensitivity to light.",
        },
        {
            "problem_label": "Urinary Pain / Dysuria",
            "severity_score": "Yellow",
            "red_flags": ["High fever", "Flank pain", "Blood in urine"],
            "specialty": "General Practitioner",
            "summary": "Pain or burning while urinating, often with frequency or urgency.",
            "text": "I feel burning pain while urinating and need to go to the toilet often.",
        },
    ]


def load_cases(source_file: str | None) -> list[dict[str, Any]]:
    if not source_file:
        return default_cases()

    source_path = Path(source_file)
    if not source_path.exists():
        raise FileNotFoundError(f"Source file not found: {source_path}")

    data = json.loads(source_path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("Source file must be a JSON array of case objects")

    return data


def build_case_text(case: dict[str, Any]) -> str:
    if case.get("text"):
        return str(case["text"])

    fragments = [
        str(case.get("problem_label") or ""),
        str(case.get("summary") or ""),
        " ".join(str(flag) for flag in case.get("red_flags", [])),
        str(case.get("specialty") or ""),
    ]
    text = " ".join(fragment for fragment in fragments if fragment).strip()
    if not text:
        raise ValueError("Each case must include at least one text field")
    return text


def ensure_collection(qdrant_service: QdrantService, recreate: bool) -> None:
    collection_name = qdrant_service.settings.qdrant_collection_name
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


def index_cases(source_file: str | None, recreate: bool) -> int:
    settings = get_settings()
    qdrant_service = QdrantService(settings)
    ensure_collection(qdrant_service, recreate=recreate)

    cases = load_cases(source_file)
    points: list[PointStruct] = []

    for case in cases:
        text = build_case_text(case)
        vector = qdrant_service._embed_text(text)

        payload = {
            "problem_label": str(case.get("problem_label") or "Unknown problem"),
            "severity_score": str(case.get("severity_score") or "Yellow"),
            "red_flags": list(case.get("red_flags") or []),
            "specialty": case.get("specialty"),
            "summary": case.get("summary") or text,
            "source_text": text,
        }

        points.append(
            PointStruct(
                id=str(case.get("id") or uuid4()),
                vector=vector,
                payload=payload,
            )
        )

    qdrant_service.client.upsert(
        collection_name=settings.qdrant_collection_name,
        points=points,
        wait=True,
    )

    return len(points)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Index symptom cases into Qdrant")
    parser.add_argument(
        "--source",
        type=str,
        default=None,
        help="Optional JSON file containing symptom cases",
    )
    parser.add_argument(
        "--recreate",
        action="store_true",
        help="Recreate collection before indexing",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    indexed = index_cases(source_file=args.source, recreate=args.recreate)
    print(f"Indexed {indexed} symptom cases into Qdrant collection.")


if __name__ == "__main__":
    main()
