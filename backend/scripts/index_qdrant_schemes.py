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
        # CENTRAL/NATIONAL SCHEMES
        {
            'scheme_name': 'Ayushman Bharat (PM-JAY)',
            'coverage_amount': 'Up to INR 5,00,000 per family per year',
            'eligibility': 'Economically vulnerable families listed in SECC database',
            'summary': 'Cashless secondary and tertiary hospitalization coverage across empaneled hospitals.',
            'keywords': ['pm-jay', 'ayushman', 'cashless', 'hospitalization', 'family cover', 'poor families'],
        },
        {
            'scheme_name': 'Ayushman Bharat - Health and Wellness Centers',
            'coverage_amount': 'Free preventive and promotive healthcare at local level',
            'eligibility': 'All Indian citizens',
            'summary': 'Network of health centers providing basic healthcare and health awareness.',
            'keywords': ['ab-hwc', 'preventive care', 'health centers', 'basic services', 'screening'],
        },
        {
            'scheme_name': 'CGHS (Central Government Health Scheme)',
            'coverage_amount': 'As per CGHS package rates and approved procedures',
            'eligibility': 'Central Government employees, pensioners, and notified beneficiary categories',
            'summary': 'Comprehensive healthcare support through CGHS wellness centers and empaneled hospitals.',
            'keywords': ['cghs', 'central government', 'pensioner', 'wellness center', 'empaneled', 'employees'],
        },
        {
            'scheme_name': 'ESIC (Employees State Insurance Corporation)',
            'coverage_amount': 'Medical care for insured persons and eligible dependents',
            'eligibility': 'Employees covered under ESI contribution criteria',
            'summary': 'Employer-employee contributory social security scheme including medical benefits.',
            'keywords': ['esic', 'esi', 'insured employee', 'dependents', 'social security', 'workers'],
        },
        
        # STATE SCHEMES
        {
            'scheme_name': 'Rajiv Aarogyasri Scheme',
            'coverage_amount': 'Up to INR 2,50,000 for identified procedures',
            'eligibility': 'BPL households and vulnerable populations in Telangana and Andhra Pradesh',
            'summary': 'Tertiary care coverage for complex surgeries and procedures.',
            'keywords': ['aarogyasri', 'telangana', 'andhra pradesh', 'surgery', 'tertiary care'],
        },
        {
            'scheme_name': 'Maharashtra Health Scheme',
            'coverage_amount': 'Varies - approximately INR 2,00,000 per family',
            'eligibility': 'Below poverty line families in Maharashtra',
            'summary': 'State-sponsored cashless hospitalization scheme.',
            'keywords': ['maharashtra', 'state scheme', 'bpl', 'cashless', 'hospitalization'],
        },
        {
            'scheme_name': 'Tamil Nadu Health Scheme',
            'coverage_amount': 'Comprehensive coverage for identified services',
            'eligibility': 'Economically weaker sections in Tamil Nadu',
            'summary': 'Healthcare coverage with emphasis on preventive and curative services.',
            'keywords': ['tamil nadu', 'state scheme', 'preventive', 'curative', 'coverage'],
        },
        {
            'scheme_name': 'Himachal Pradesh Health Scheme',
            'coverage_amount': 'INR 50,000 annually per family',
            'eligibility': 'BPL and APL families in Himachal Pradesh',
            'summary': 'Comprehensive health coverage with focus on hill state healthcare needs.',
            'keywords': ['himachal pradesh', 'bpl', 'annual cover', 'hill states', 'health'],
        },
        {
            'scheme_name': 'Karnataka Health Scheme',
            'coverage_amount': 'INR 5,00,000 per family per year',
            'eligibility': 'Economically vulnerable households in Karnataka',
            'summary': 'Comprehensive cashless healthcare with inpatient and outpatient services.',
            'keywords': ['karnataka', 'state scheme', 'cashless', 'inpatient', 'outpatient'],
        },
        {
            'scheme_name': 'Gujarat Health Scheme',
            'coverage_amount': 'INR 2,00,000 per family',
            'eligibility': 'Unorganized sector workers and their families',
            'summary': 'Coverage for unorganized workers in Gujarat.',
            'keywords': ['gujarat', 'workers', 'unorganized sector', 'coverage', 'family'],
        },
        {
            'scheme_name': 'Assam Health Scheme',
            'coverage_amount': 'INR 2,00,000 per annum',
            'eligibility': 'Poor and vulnerable families in Assam',
            'summary': 'Cashless inpatient healthcare coverage.',
            'keywords': ['assam', 'poor families', 'vulnerable', 'cashless', 'inpatient'],
        },
        {
            'scheme_name': 'Uttarakhand Arogya Sanrakshan Yojana',
            'coverage_amount': 'INR 5,00,000 per family',
            'eligibility': 'BPL families in Uttarakhand',
            'summary': 'Comprehensive health coverage with focus on alpine region health needs.',
            'keywords': ['uttarakhand', 'bpl', 'sanrakshan', 'alpine', 'family coverage'],
        },
        
        # OCCUPATIONAL/SPECIFIC SCHEMES
        {
            'scheme_name': 'Armed Forces Medical Corps (AFMC)',
            'coverage_amount': 'Full hospitalization and treatment coverage',
            'eligibility': 'Active military personnel and veterans',
            'summary': 'Comprehensive medical coverage for armed forces members.',
            'keywords': ['afmc', 'military', 'defense', 'armed forces', 'veterans'],
        },
        {
            'scheme_name': 'Railway Health Scheme',
            'coverage_amount': 'Coverage for railway employees and families',
            'eligibility': 'Railway staff and pensioners',
            'summary': 'Dedicated healthcare for railway workers.',
            'keywords': ['railway', 'employees', 'pensioners', 'transport', 'staff'],
        },
        {
            'scheme_name': 'Mineral Bearing Areas Development',
            'coverage_amount': 'Health coverage as part of mineral area development',
            'eligibility': 'Communities in mineral-bearing regions',
            'summary': 'Healthcare support linked to mineral resource communities.',
            'keywords': ['mineral areas', 'community health', 'development', 'resource areas'],
        },
        {
            'scheme_name': 'Dock Workers Health Scheme',
            'coverage_amount': 'Occupational health and medical benefits',
            'eligibility': 'Dock workers and maritime workers',
            'summary': 'Specialized scheme for maritime and dock worker health.',
            'keywords': ['dock', 'maritime', 'workers', 'occupational', 'health'],
        },
        
        # DISEASE-SPECIFIC COVERAGE
        {
            'scheme_name': 'RSBY (Rashtriya Swasthya Bima Yojana)',
            'coverage_amount': 'INR 30,000 annual cashless hospitalization',
            'eligibility': 'Unorganized workers in below poverty line',
            'summary': 'Healthcare coverage through smart card system for casual workers.',
            'keywords': ['rsby', 'unorganized workers', 'smart card', 'cashless', 'bpl'],
        },
        {
            'scheme_name': 'National Maternity Benefit Scheme',
            'coverage_amount': 'INR 6,000 per pregnancy',
            'eligibility': 'Pregnant women in BPL households',
            'summary': 'Direct cash benefit scheme for maternal healthcare.',
            'keywords': ['maternity', 'pregnancy', 'women', 'cash benefit', 'bpl'],
        },
        {
            'scheme_name': 'Reproductive and Child Health Scheme',
            'coverage_amount': 'Comprehensive maternal and child health services',
            'eligibility': 'Pregnant women and children under 5 years',
            'summary': 'Integrated program for mother and child health.',
            'keywords': ['reproductive', 'child health', 'maternal', 'immunization', 'nutrition'],
        },
        {
            'scheme_name': 'National Cancer Prevention Program',
            'coverage_amount': 'Cancer screening and treatment support',
            'eligibility': 'All citizens with cancer diagnosis',
            'summary': 'Dedicated screening, diagnosis, and treatment support for cancer.',
            'keywords': ['cancer', 'screening', 'treatment', 'prevention', 'awareness'],
        },
        {
            'scheme_name': 'National Diabetes Program',
            'coverage_amount': 'Screening, treatment, and management support',
            'eligibility': 'All citizens for screening; support for confirmed cases',
            'summary': 'Integrated diabetes prevention and control program.',
            'keywords': ['diabetes', 'screening', 'management', 'prevention', 'treatment'],
        },
        {
            'scheme_name': 'National Cardiovascular Disease Program',
            'coverage_amount': 'CVD screening, diagnosis, and treatment support',
            'eligibility': 'All citizens; priority to at-risk groups',
            'summary': 'Heart disease prevention and treatment initiative.',
            'keywords': ['cardiovascular', 'heart disease', 'screening', 'prevention', 'treatment'],
        },
        {
            'scheme_name': 'National Mental Health Program',
            'coverage_amount': 'Mental health services through state hospitals',
            'eligibility': 'All citizens needing mental health support',
            'summary': 'Mental illness diagnosis and treatment program.',
            'keywords': ['mental health', 'psychiatric', 'psychological', 'treatment', 'support'],
        },
        {
            'scheme_name': 'National AIDS Control Program',
            'coverage_amount': 'Free ART and supportive treatment',
            'eligibility': 'HIV-positive individuals',
            'summary': 'Free antiretroviral therapy and counseling services.',
            'keywords': ['hiv', 'aids', 'art', 'treatment', 'counseling'],
        },
        {
            'scheme_name': 'National Tuberculosis Control Program',
            'coverage_amount': 'Free TB diagnosis and treatment',
            'eligibility': 'All TB patients',
            'summary': 'DOTS strategy for TB elimination.',
            'keywords': ['tuberculosis', 'tb', 'dots', 'treatment', 'free'],
        },
        {
            'scheme_name': 'National Leprosy Control Program',
            'coverage_amount': 'Free leprosy treatment',
            'eligibility': 'Leprosy patients',
            'summary': 'Elimination program with free multidrug therapy.',
            'keywords': ['leprosy', 'elimination', 'treatment', 'free', 'rehabilitation'],
        },
        {
            'scheme_name': 'National Vector Borne Disease Control',
            'coverage_amount': 'Malaria, dengue, filaria vector control and treatment',
            'eligibility': 'All citizens in affected regions',
            'summary': 'Prevention and treatment of vector-borne diseases.',
            'keywords': ['malaria', 'dengue', 'filaria', 'vector', 'control', 'treatment'],
        },
        
        # SPECIALIZED/SUPPLEMENTARY SCHEMES
        {
            'scheme_name': 'PMJAY Plus (Additional Coverage)',
            'coverage_amount': 'Additional INR 5,00,000 above PM-JAY limit',
            'eligibility': 'Identified conditions with severe medical costs',
            'summary': 'Supplementary coverage for high-cost treatments.',
            'keywords': ['pmjay plus', 'additional coverage', 'high-cost', 'supplementary'],
        },
        {
            'scheme_name': 'Senior Citizen Health Scheme',
            'coverage_amount': 'Specialized coverage for elderly (60+ years)',
            'eligibility': 'Citizens aged 60 years and above',
            'summary': 'Healthcare coverage with geriatric-specific services.',
            'keywords': ['senior citizen', 'elderly', 'age 60+', 'geriatric', 'coverage'],
        },
        {
            'scheme_name': 'Differently Abled Health Scheme',
            'coverage_amount': 'Comprehensive coverage for rehabilitation and care',
            'eligibility': 'Persons with disabilities (40% disability or more)',
            'summary': 'Healthcare and rehabilitation services for disabled persons.',
            'keywords': ['disability', 'differently abled', 'rehabilitation', 'coverage'],
        },
        {
            'scheme_name': 'Transgender Health Scheme',
            'coverage_amount': 'Gender affirmation surgeries and related care',
            'eligibility': 'Recognized transgender individuals',
            'summary': 'Healthcare specific to transgender health needs.',
            'keywords': ['transgender', 'lgbtq', 'gender affirmation', 'healthcare'],
        },
        {
            'scheme_name': 'Tribal Health Initiative',
            'coverage_amount': 'Healthcare specific to tribal populations',
            'eligibility': 'Scheduled tribe members',
            'summary': 'Healthcare services designed for tribal communities.',
            'keywords': ['tribal', 'scheduled tribe', 'indigenous', 'healthcare'],
        },
        {
            'scheme_name': 'Urban Poor Health Scheme',
            'coverage_amount': 'Targeted coverage for urban slum dwellers',
            'eligibility': 'Urban poor living in slums',
            'summary': 'Healthcare access for urban economically disadvantaged.',
            'keywords': ['urban poor', 'slums', 'urban health', 'poverty', 'access'],
        },
        {
            'scheme_name': 'Migrant Worker Health Scheme',
            'coverage_amount': 'Portable health coverage for migrant workers',
            'eligibility': 'Internal migrant workers',
            'summary': 'Portable healthcare coverage across states.',
            'keywords': ['migrant', 'portable', 'interstate', 'workers', 'mobility'],
        },
        {
            'scheme_name': 'Construction Worker Welfare Board',
            'coverage_amount': 'Occupational health and benefits',
            'eligibility': 'Registered construction workers',
            'summary': 'Occupational health services for construction sector.',
            'keywords': ['construction', 'occupational', 'worker welfare', 'board'],
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
