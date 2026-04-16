from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any

import httpx


@dataclass
class MedicineSuggestion:
    name: str
    rxcui: str | None
    source: str
    category: str
    reason: str
    usage_note: str
    warnings: list[str]


class DrugDatabaseService:
    RXNAV_BASE_URL = 'https://rxnav.nlm.nih.gov/REST'

    def _category_candidates(self, problem: str, transcript: str) -> list[tuple[str, list[str], list[str]]]:
        text = f'{problem} {transcript}'.lower()

        categories: list[tuple[str, list[str], list[str]]] = []
        if any(term in text for term in ['sneez', 'allerg', 'rhinit', 'eosinophil', 'dust', 'pollen', 'itchy nose', 'watery eyes']):
            categories.append((
                'Allergy / Rhinitis',
                ['cetirizine', 'loratadine', 'fexofenadine', 'saline nasal spray'],
                [
                    'Avoid dust and pollen exposure.',
                    'Follow package instructions or pharmacist guidance.',
                    'Seek medical advice if symptoms are frequent or severe.',
                ],
            ))
        if any(term in text for term in ['fever', 'pain', 'headache', 'body pain']):
            categories.append((
                'Fever / Pain',
                ['acetaminophen', 'ibuprofen'],
                [
                    'Use as directed on the label.',
                    'Avoid NSAIDs like ibuprofen if you have stomach ulcer, kidney disease, or are pregnant unless a clinician approves.',
                ],
            ))
        if any(term in text for term in ['cough', 'throat']):
            categories.append((
                'Cough / Throat',
                ['dextromethorphan', 'guaifenesin', 'throat lozenges'],
                [
                    'Hydrate well and use only label-directed OTC products.',
                    'See a clinician if cough lasts more than a few days or worsens.',
                ],
            ))
        if any(term in text for term in ['diarrhea', 'vomit', 'vomiting']):
            categories.append((
                'Stomach Upset',
                ['oral rehydration solution', 'loperamide'],
                [
                    'Take oral rehydration solution in small frequent sips.',
                    'Do not use loperamide if there is blood in stool or high fever without medical advice.',
                ],
            ))

        return categories

    def _should_filter_medicine(
        self,
        medicine_name: str,
        age: int | None = None,
        is_pregnant: bool = False,
        chronic_conditions: list[str] | None = None,
        allergies: list[str] | None = None,
    ) -> bool:
        """Check if medicine should be filtered out based on patient health profile."""
        if not medicine_name:
            return False

        name_lower = medicine_name.lower()
        conditions = chronic_conditions or []
        allergies_list = allergies or []

        if is_pregnant:
            unsafe_in_pregnancy = ['ibuprofen', 'naproxen', 'aspirin', 'dextromethorphan', 'loperamide']
            if any(unsafe in name_lower for unsafe in unsafe_in_pregnancy):
                return True

        if age and age < 12:
            unsafe_for_children = ['ibuprofen', 'naproxen']
            if any(drug in name_lower for drug in unsafe_for_children):
                return True

        if age and age > 65:
            extra_caution = ['ibuprofen', 'naproxen']
            if any(drug in name_lower for drug in extra_caution):
                return True

        if 'Kidney Disease' in conditions or 'Renal' in conditions:
            avoid_kidney = ['ibuprofen', 'naproxen', 'acetaminophen (high doses)']
            if any(drug in name_lower for drug in avoid_kidney):
                return True

        if 'Stomach Upset' in conditions or any('ulcer' in c.lower() for c in conditions):
            avoid_stomach = ['ibuprofen', 'naproxen', 'aspirin']
            if any(drug in name_lower for drug in avoid_stomach):
                return True

        if 'Heart Disease' in conditions:
            caution_heart = ['ibuprofen', 'naproxen']
            if any(drug in name_lower for drug in caution_heart):
                return True

        for allergy in allergies_list:
            if allergy.lower() in name_lower:
                return True

        return False

    async def _lookup_rxnorm(self, term: str) -> dict[str, Any] | None:
        params = {
            'term': term,
            'maxEntries': 1,
            'option': 1,
        }
        try:
            async with httpx.AsyncClient(timeout=12) as client:
                response = await client.get(f'{self.RXNAV_BASE_URL}/approximateTerm.json', params=params)
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError:
            return None

        candidates = (
            data.get('approximateGroup', {})
            .get('candidate', [])
        )
        if isinstance(candidates, dict):
            candidates = [candidates]
        if not candidates:
            return None

        candidate = candidates[0]
        return {
            'name': candidate.get('name') or term,
            'rxcui': candidate.get('rxcui'),
            'source': candidate.get('source') or 'RxNorm',
        }

    async def suggest_medicines(
        self,
        problem: str,
        transcript: str,
        severity_score: str,
        age: int | None = None,
        is_pregnant: bool = False,
        chronic_conditions: list[str] | None = None,
        allergies: list[str] | None = None,
    ) -> list[MedicineSuggestion]:
        if severity_score == 'Red':
            return []

        category_candidates = self._category_candidates(problem, transcript)
        suggestions: list[MedicineSuggestion] = []

        for category, candidate_terms, warnings in category_candidates:
            for candidate_term in candidate_terms:
                if self._should_filter_medicine(candidate_term, age, is_pregnant, chronic_conditions, allergies):
                    continue

                rxnorm = await self._lookup_rxnorm(candidate_term)
                suggestion_name = rxnorm['name'] if rxnorm else candidate_term
                suggestions.append(
                    MedicineSuggestion(
                        name=suggestion_name,
                        rxcui=str(rxnorm['rxcui']) if rxnorm and rxnorm.get('rxcui') else None,
                        source=str(rxnorm['source']) if rxnorm else 'RxNorm',
                        category=category,
                        reason=f'{category} symptoms based on transcript and triage result.',
                        usage_note='Follow the package label or pharmacist guidance; this is not a prescription.',
                        warnings=warnings,
                    )
                )

        unique: list[MedicineSuggestion] = []
        seen = set()
        for item in suggestions:
            key = re.sub(r'\s+', ' ', item.name.lower()).strip()
            if key in seen:
                continue
            seen.add(key)
            unique.append(item)

        return unique[:6]

