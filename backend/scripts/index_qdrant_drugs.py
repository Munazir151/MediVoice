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
        # CARDIOVASCULAR DISEASE MEDICATIONS
        {"drug_a": "aspirin", "drug_b": "clopidogrel", "interaction_severity": "Yellow", "safe_dosage": "Aspirin 75-100mg daily, Clopidogrel 75mg daily - use as prescribed", "recommendation": "Dual antiplatelet therapy for acute coronary syndrome; increases bleeding risk.", "summary": "Commonly used combination post-MI or stent placement", "warnings": ["Bleeding risk", "Monitor for signs of bleeding", "Do not use NSAIDs"]},
        {"drug_a": "lisinopril", "drug_b": "metoprolol", "interaction_severity": "Green", "safe_dosage": "Lisinopril 10-40mg daily, Metoprolol 50-200mg daily in divided doses", "recommendation": "Safe combination for heart failure and hypertension management", "summary": "ACE inhibitor with beta-blocker for cardiovascular protection", "warnings": ["Monitor blood pressure", "Do not abruptly stop beta-blocker", "Watch for dizziness"]},
        {"drug_a": "atorvastatin", "drug_b": "ezetimibe", "interaction_severity": "Green", "safe_dosage": "Atorvastatin 10-80mg daily, Ezetimibe 10mg daily", "recommendation": "Effective combination for cholesterol reduction", "summary": "Statin with cholesterol absorption inhibitor", "warnings": ["Monitor liver enzymes", "Watch for muscle pain", "Avoid grapefruit juice"]},
        {"drug_a": "furosemide", "drug_b": "potassium", "interaction_severity": "Yellow", "safe_dosage": "Furosemide 20-80mg daily, K+ as directed by lab values", "recommendation": "Monitor potassium levels closely; diuretic causes K+ loss", "summary": "Loop diuretic often paired with potassium supplementation", "warnings": ["Regular K+ monitoring required", "Watch for leg cramps", "Report severe weakness"]},
        {"drug_a": "warfarin", "drug_b": "aspirin", "interaction_severity": "Red", "safe_dosage": "Avoid co-use unless clinician-directed for specific indications", "recommendation": "Significantly increases bleeding risk; use alternatives", "summary": "Anticoagulant with antiplatelet agent - high bleeding risk", "warnings": ["Severe bleeding risk", "Seek emergency care for unusual bleeding", "Cannot use together in most cases"]},
        {"drug_a": "digoxin", "drug_b": "verapamil", "interaction_severity": "Red", "safe_dosage": "Avoid combination; use alternatives", "recommendation": "Can cause severe bradycardia and heart block", "summary": "Cardiac glycoside with calcium channel blocker", "warnings": ["Risk of severe bradycardia", "Monitor heart rate closely", "Immediate medical attention if syncope occurs"]},
        {"drug_a": "nitroglycerine", "drug_b": "sildenafil", "interaction_severity": "Red", "safe_dosage": "Do not use together", "recommendation": "Life-threatening hypotension risk", "summary": "Nitrate with phosphodiesterase inhibitor", "warnings": ["Severe hypotension risk", "Can cause MI", "Declare all medications to doctor"]},
        {"drug_a": "enalapril", "drug_b": "spironolactone", "interaction_severity": "Yellow", "safe_dosage": "Use as prescribed with regular monitoring", "recommendation": "Monitor potassium; both medications can increase K+ levels", "summary": "ACE inhibitor with potassium-sparing diuretic", "warnings": ["K+ monitoring required", "Watch for hyperkalemia", "Regular lab work needed"]},

        # RESPIRATORY DISEASE MEDICATIONS
        {"drug_a": "albuterol", "drug_b": "ipratropium", "interaction_severity": "Green", "safe_dosage": "Albuterol 2 puffs q4-6h, Ipratropium 2 puffs q6h", "recommendation": "Safe and effective combination for COPD", "summary": "Beta-2 agonist with anticholinergic bronchodilator", "warnings": ["Use inhalers correctly", "Watch for tremor", "Report worsening shortness of breath"]},
        {"drug_a": "fluticasone", "drug_b": "salmeterol", "interaction_severity": "Green", "safe_dosage": "1-2 inhalations twice daily", "recommendation": "Standard maintenance therapy for asthma", "summary": "Inhaled corticosteroid with long-acting beta-agonist", "warnings": ["Rinse mouth after use", "Do not use for acute attacks", "Use rescue inhaler if needed"]},
        {"drug_a": "theophylline", "drug_b": "erythromycin", "interaction_severity": "Red", "safe_dosage": "Avoid combination", "recommendation": "Macrolide reduces theophylline clearance, toxicity risk", "summary": "Methylxanthine with macrolide antibiotic", "warnings": ["Theophylline toxicity risk", "Nausea and arrhythmias possible", "Use alternative antibiotic"]},
        {"drug_a": "prednisone", "drug_b": "omeprazole", "interaction_severity": "Green", "safe_dosage": "Prednisone as prescribed, Omeprazole 20-40mg daily", "recommendation": "Safe combination; PPI protects against steroid GI effects", "summary": "Corticosteroid with proton pump inhibitor", "warnings": ["Take prednisone with food", "Long-term steroid risks", "Monitor bone density"]},
        {"drug_a": "codeine", "drug_b": "promethazine", "interaction_severity": "Yellow", "safe_dosage": "Codeine 15-30mg, Promethazine 12.5-25mg q4-6h as needed", "recommendation": "Use cautiously; increased sedation and respiratory depression risk", "summary": "Opioid cough suppressant with antihistamine", "warnings": ["Do not drive", "Risk of respiratory depression", "Not for children <4 years"]},

        # GASTROINTESTINAL DISEASE MEDICATIONS
        {"drug_a": "omeprazole", "drug_b": "amoxicillin", "interaction_severity": "Green", "safe_dosage": "Omeprazole 20mg twice daily, Amoxicillin 1g three times daily x10 days", "recommendation": "Standard H. pylori eradication regimen", "summary": "PPI with antibiotic for ulcer treatment", "warnings": ["Complete full course", "Report allergy symptoms", "Monitor for C. difficile"]},
        {"drug_a": "metoclopramide", "drug_b": "alcohol", "interaction_severity": "Yellow", "safe_dosage": "Metoclopramide 10mg before meals; avoid alcohol", "recommendation": "CNS depression risk; avoid alcohol", "summary": "Prokinetic agent interaction with alcohol", "warnings": ["Avoid alcohol while taking", "Risk of tardive dyskinesia with long-term use"]},
        {"drug_a": "mesalamine", "drug_b": "sulfasalazine", "interaction_severity": "Red", "safe_dosage": "Do not use together", "recommendation": "Use one agent; both are salicylates", "summary": "5-ASA compounds should not be combined", "warnings": ["Choose one medication only", "Discuss alternatives with doctor"]},
        {"drug_a": "loperamide", "drug_b": "atropine", "interaction_severity": "Yellow", "safe_dosage": "Loperamide 2mg after each loose stool", "recommendation": "Anticholinergic effects additive; monitor closely", "summary": "Antimotility agent with anticholinergic", "warnings": ["May mask toxic megacolon", "Not for infectious diarrhea", "Monitor abdominal distention"]},
        {"drug_a": "pantoprazole", "drug_b": "ketoconazole", "interaction_severity": "Red", "safe_dosage": "Do not use together without medical supervision", "recommendation": "PPI reduces ketoconazole absorption significantly", "summary": "PPI with antifungal - absorption issue", "warnings": ["Ketoconazole effectiveness reduced", "Use alternative antifungal if possible"]},

        # ENDOCRINE DISEASE MEDICATIONS
        {"drug_a": "metformin", "drug_b": "insulin", "interaction_severity": "Yellow", "safe_dosage": "Use as prescribed; monitor glucose frequently", "recommendation": "Common combination but increases hypoglycemia risk", "summary": "Oral hypoglycemic with insulin", "warnings": ["Monitor blood glucose closely", "Watch for hypoglycemia symptoms", "Carry glucose tablets"]},
        {"drug_a": "levothyroxine", "drug_b": "calcium", "interaction_severity": "Yellow", "safe_dosage": "Levothyroxine in AM on empty stomach, calcium 4+ hours later", "recommendation": "Separate by 4+ hours; calcium impairs absorption", "summary": "Thyroid hormone with mineral supplement", "warnings": ["Take levothyroxine separately", "Monitor TSH levels", "Consistent dosing important"]},
        {"drug_a": "glipizide", "drug_b": "fluconazole", "interaction_severity": "Yellow", "safe_dosage": "Monitor glucose; may need glipizide dose adjustment", "recommendation": "Fluconazole increases glipizide levels", "summary": "Sulfonylurea with azole antifungal", "warnings": ["Hypoglycemia risk increased", "Monitor blood glucose", "Doctor may adjust glipizide dose"]},
        {"drug_a": "pioglitazone", "drug_b": "gemfibrozil", "interaction_severity": "Yellow", "safe_dosage": "Monitor for fluid retention and hypoglycemia", "recommendation": "Increased hypoglycemia risk; monitor closely", "summary": "Thiazolidinedione with fibrate", "warnings": ["Watch for swelling", "Monitor blood glucose", "Report weight gain"]},

        # INFECTIOUS DISEASE MEDICATIONS
        {"drug_a": "rifampicin", "drug_b": "isoniazid", "interaction_severity": "Yellow", "safe_dosage": "Rifampicin 600mg daily, Isoniazid 5mg/kg daily", "recommendation": "Standard TB therapy; monitor LFTs closely", "summary": "Two first-line TB drugs", "warnings": ["Liver toxicity risk", "Monthly LFT monitoring", "Report jaundice/dark urine"]},
        {"drug_a": "amoxicillin", "drug_b": "paracetamol", "interaction_severity": "Green", "safe_dosage": "Amoxicillin 500mg three times daily, Paracetamol 500-1000mg q4-6h", "recommendation": "Safe combination; no major interaction", "summary": "Antibiotic with fever/pain management", "warnings": ["Complete antibiotic course", "Report allergy symptoms"]},
        {"drug_a": "ciprofloxacin", "drug_b": "tizanidine", "interaction_severity": "Red", "safe_dosage": "Avoid combination", "recommendation": "Fluoroquinolone increases tizanidine levels significantly", "summary": "Antibiotic with muscle relaxant", "warnings": ["Severe hypotension risk", "Use alternative antibiotic"]},
        {"drug_a": "metronidazole", "drug_b": "alcohol", "interaction_severity": "Red", "safe_dosage": "Do not consume alcohol during or 48 hours after metronidazole", "recommendation": "Disulfiram-like reaction possible", "summary": "Antibiotic with alcohol", "warnings": ["Avoid all alcohol", "Severe flushing and nausea possible", "Read labels of other products"]},

        # NEUROLOGICAL DISEASE MEDICATIONS
        {"drug_a": "phenytoin", "drug_b": "warfarin", "interaction_severity": "Red", "safe_dosage": "Use only as directed; requires close INR monitoring", "recommendation": "Phenytoin increases warfarin metabolism; INR monitoring critical", "summary": "Antiepileptic with anticoagulant", "warnings": ["INR monitoring weekly initially", "May need warfarin dose adjustment"]},
        {"drug_a": "levodopa", "drug_b": "metoclopramide", "interaction_severity": "Red", "safe_dosage": "Use alternatives to metoclopramide", "recommendation": "Metoclopramide blocks dopamine; reduces levodopa efficacy", "summary": "Parkinson's medication with prokinetic", "warnings": ["Use domperidone instead if needed", "Reduced parkinsonian control possible"]},
        {"drug_a": "valproate", "drug_b": "lamotrigine", "interaction_severity": "Yellow", "safe_dosage": "Valproate significantly increases lamotrigine levels", "recommendation": "Lamotrigine dose must be reduced (usually to 25% of normal)", "summary": "Two antiepileptic medications", "warnings": ["Lamotrigine dose adjustment required", "Rash risk increased", "Report any rash immediately"]},
        {"drug_a": "topiramate", "drug_b": "pioglitazone", "interaction_severity": "Yellow", "safe_dosage": "Monitor for hyperglycemia", "recommendation": "Topiramate may reduce pioglitazone effectiveness", "summary": "Antiepileptic with diabetes medication", "warnings": ["Monitor blood glucose", "May need pioglitazone dose increase"]},

        # PSYCHIATRIC DISEASE MEDICATIONS
        {"drug_a": "fluoxetine", "drug_b": "tramadol", "interaction_severity": "Red", "safe_dosage": "Avoid combination or use extreme caution with monitoring", "recommendation": "Serotonin syndrome risk; potentially fatal", "summary": "SSRI with opioid analgesic", "warnings": ["Risk of serotonin syndrome", "Watch for agitation, fever, muscle rigidity", "Seek emergency care if symptoms develop"]},
        {"drug_a": "lithium", "drug_b": "diuretics", "interaction_severity": "Red", "safe_dosage": "Avoid loop/thiazide diuretics; use K+-sparing if needed", "recommendation": "Diuretics increase lithium levels; toxicity risk", "summary": "Mood stabilizer with diuretic", "warnings": ["Regular lithium level monitoring", "Maintain consistent salt intake", "Dehydration increases toxicity risk"]},
        {"drug_a": "sertraline", "drug_b": "warfarin", "interaction_severity": "Yellow", "safe_dosage": "Monitor INR closely", "recommendation": "May increase warfarin effect slightly", "summary": "SSRI with anticoagulant", "warnings": ["INR monitoring recommended", "Watch for signs of bleeding"]},
        {"drug_a": "haloperidol", "drug_b": "fluoxetine", "interaction_severity": "Yellow", "safe_dosage": "Monitor closely; may need dose adjustment", "recommendation": "Fluoxetine increases haloperidol levels", "summary": "Antipsychotic with SSRI", "warnings": ["Extrapyramidal side effects may increase", "Monitor for tardive dyskinesia"]},

        # MUSCULOSKELETAL DISEASE MEDICATIONS
        {"drug_a": "ibuprofen", "drug_b": "warfarin", "interaction_severity": "Red", "safe_dosage": "Avoid co-use unless specifically directed", "recommendation": "NSAID increases bleeding risk with anticoagulant", "summary": "NSAID with anticoagulant", "warnings": ["Severe bleeding risk", "Use paracetamol instead", "Report any unusual bruising"]},
        {"drug_a": "naproxen", "drug_b": "lisinopril", "interaction_severity": "Yellow", "safe_dosage": "Monitor renal function and blood pressure", "recommendation": "NSAID may reduce antihypertensive effect", "summary": "NSAID with ACE inhibitor", "warnings": ["Monitor kidney function", "May need lower lisinopril effect"]},
        {"drug_a": "methotrexate", "drug_b": "sulfasalazine", "interaction_severity": "Yellow", "safe_dosage": "Use as prescribed with regular monitoring", "recommendation": "Both are disease-modifying agents; monitor closely", "summary": "Two DMARDs for rheumatoid arthritis", "warnings": ["Regular CBC and LFT monitoring", "Folic acid supplementation recommended"]},
        {"drug_a": "allopurinol", "drug_b": "mercaptopurine", "interaction_severity": "Red", "safe_dosage": "Reduce mercaptopurine dose by 75% if allopurinol needed", "recommendation": "Allopurinol inhibits mercaptopurine metabolism", "summary": "Uric acid reducer with chemotherapy agent", "warnings": ["Mercaptopurine dose adjustment critical", "Severe toxicity possible"]},

        # ALLERGIC/DERMATOLOGICAL DISEASE MEDICATIONS
        {"drug_a": "cetirizine", "drug_b": "alcohol", "interaction_severity": "Yellow", "safe_dosage": "Limit alcohol; increased sedation risk", "recommendation": "CNS depression additive with alcohol", "summary": "Antihistamine with alcohol", "warnings": ["Do not drive after combining", "Increased drowsiness likely"]},
        {"drug_a": "isotretinoin", "drug_b": "tetracycline", "interaction_severity": "Red", "safe_dosage": "Avoid combination", "recommendation": "Increased intracranial pressure risk; potentially fatal", "summary": "Retinoid with tetracycline", "warnings": ["Cannot use together", "Can cause pseudo-tumor cerebri", "Use alternatives for acne"]},
        {"drug_a": "hydrocortisone cream", "drug_b": "salicylic acid", "interaction_severity": "Yellow", "safe_dosage": "Alternate application; do not mix", "recommendation": "Can reduce steroid efficacy; may increase salicylate absorption", "summary": "Topical steroid with keratolytic", "warnings": ["Apply separately", "Do not occlude after salicylic acid"]},
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
