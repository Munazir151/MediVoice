from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from math import sqrt
import asyncio
import re
from urllib.parse import urlparse

import httpx
from qdrant_client import QdrantClient

try:
    from fastembed import TextEmbedding
except Exception:  # pragma: no cover - optional dependency fallback
    TextEmbedding = None

from app.core.config import Settings


@dataclass
class QdrantMatch:
    id: str
    problem_label: str
    severity_score: str
    score: float
    red_flags: list[str]
    specialty: str | None = None
    summary: str | None = None


@dataclass
class SchemeMatch:
    id: str
    scheme_name: str
    coverage_amount: str
    eligibility: str
    score: float
    summary: str | None = None


@dataclass
class DrugInteractionMatch:
    id: str
    drug_a: str
    drug_b: str
    interaction_severity: str
    safe_dosage: str
    score: float
    recommendation: str | None = None
    summary: str | None = None
    warnings: list[str] | None = None
    drug_a_description: str | None = None
    drug_b_description: str | None = None
    interaction_why: str | None = None


class QdrantService:
    UNKNOWN_DRUG_LABELS = {'unknown', 'unknown drug', 'n/a', 'na', '-'}

    def __init__(self, settings: Settings):
        self.settings = settings
        parsed = urlparse(settings.qdrant_url)
        hostname = (parsed.hostname or '').lower()
        is_local_http = parsed.scheme == 'http' and hostname in {'localhost', '127.0.0.1', '::1'}

        # Local Qdrant over HTTP does not need API key; passing one emits insecure-connection warnings.
        effective_api_key = None if is_local_http else (settings.qdrant_api_key or None)

        self.client = QdrantClient(
            url=settings.qdrant_url,
            api_key=effective_api_key,
            check_compatibility=False,
        )
        self._embedder = self._build_embedder()

    def _build_embedder(self):
        if not self.settings.qdrant_semantic_enabled:
            return None

        if self.settings.qdrant_embedding_provider.lower() != 'fastembed':
            return None

        if TextEmbedding is None:
            return None

        try:
            return TextEmbedding(model_name=self.settings.qdrant_embedding_model)
        except Exception:
            return None

    def _normalize_vector_size(self, vector: list[float]) -> list[float]:
        expected_dimension = max(8, self.settings.qdrant_vector_size)

        if len(vector) == expected_dimension:
            return vector

        if len(vector) > expected_dimension:
            return vector[:expected_dimension]

        return vector + [0.0] * (expected_dimension - len(vector))

    def _semantic_embed_text(self, text: str) -> list[float] | None:
        if self._embedder is None:
            return None

        try:
            embeddings = list(self._embedder.embed([text]))
            if not embeddings:
                return None

            semantic_vector = [float(value) for value in embeddings[0]]
            return self._normalize_vector_size(semantic_vector)
        except Exception:
            return None

    def _hash_embed_text(self, text: str) -> list[float]:
        dimension = max(8, self.settings.qdrant_vector_size)
        vector = [0.0] * dimension
        tokens = re.findall(r'[a-z0-9]+', text.lower())

        for token in tokens:
            digest = sha256(token.encode('utf-8')).hexdigest()
            index = int(digest[:8], 16) % dimension
            vector[index] += 1.0

        norm = sqrt(sum(value * value for value in vector))
        if norm == 0:
            return vector
        return [value / norm for value in vector]

    def _embed_text(self, text: str) -> list[float]:
        semantic_vector = self._semantic_embed_text(text)
        if semantic_vector is not None:
            return semantic_vector
        return self._hash_embed_text(text)

    @staticmethod
    def _tokenize_query(text: str) -> list[str]:
        tokens = re.findall(r'[a-z0-9]+', text.lower())
        filler = {
            'the', 'and', 'for', 'with', 'from', 'that', 'this', 'have', 'been', 'were', 'your', 'you', 'are',
            'not', 'but', 'all', 'any', 'can', 'into', 'over', 'under', 'having', 'joint', 'pain', 'fever',
        }
        return [token for token in tokens if token not in filler and len(token) >= 3]

    def _build_query_variants(self, transcript: str) -> list[str]:
        text = transcript.lower()
        variants = [transcript.strip()]

        body_parts = [
            'knee', 'joint', 'chest', 'breath', 'abdomen', 'stomach', 'throat', 'head', 'back', 'leg', 'arm',
            'foot', 'eye', 'ear', 'neck', 'shoulder', 'skin',
        ]
        symptoms = [
            'pain', 'fever', 'cough', 'vomiting', 'vomit', 'diarrhea', 'nausea', 'dizziness', 'headache', 'sore throat',
            'shortness of breath', 'breathing difficulty', 'chest pain', 'abdominal pain',
        ]

        for body_part in body_parts:
            if body_part in text:
                for symptom in symptoms:
                    if symptom in text or symptom in {'pain', 'fever', 'cough', 'headache', 'dizziness'}:
                        variants.append(f'{body_part} {symptom}')

        if 'pain' in text:
            variants.extend(['pain', 'joint pain', 'musculoskeletal pain'])
        if 'fever' in text:
            variants.append('fever')
        if 'cough' in text or 'throat' in text:
            variants.extend(['cough', 'sore throat'])
        if 'vomit' in text or 'nausea' in text or 'diarrhea' in text or 'stomach' in text or 'abdomen' in text:
            variants.extend(['stomach upset', 'abdominal pain', 'gastroenteritis'])
        if 'chest' in text or 'breath' in text:
            variants.extend(['chest pain', 'shortness of breath'])
        if 'head' in text or 'dizzy' in text:
            variants.extend(['headache', 'dizziness'])

        cleaned = ' '.join(self._tokenize_query(transcript))
        if cleaned and cleaned not in variants:
            variants.append(cleaned)

        unique: list[str] = []
        seen = set()
        for variant in variants:
            normalized = re.sub(r'\s+', ' ', variant).strip()
            if not normalized:
                continue
            key = normalized.lower()
            if key in seen:
                continue
            seen.add(key)
            unique.append(normalized)

        return unique[:6]

    def _merge_search_results(self, result_groups: list[list], *, key_fn):
        merged = {}
        for group in result_groups:
            for result in group:
                key = key_fn(result)
                current = merged.get(key)
                if current is None or float(getattr(result, 'score', 0.0) or 0.0) > float(getattr(current, 'score', 0.0) or 0.0):
                    merged[key] = result

        return sorted(merged.values(), key=lambda item: float(getattr(item, 'score', 0.0) or 0.0), reverse=True)

    @staticmethod
    def _lexical_overlap_score(query: str, payload: dict) -> float:
        query_tokens = set(re.findall(r'[a-z0-9]{3,}', query.lower()))
        if not query_tokens:
            return 0.0

        payload_text = ' '.join(
            str(payload.get(field) or '')
            for field in ('problem_label', 'problem', 'summary', 'specialty', 'scheme_name', 'scheme', 'eligibility')
        ).lower()
        payload_tokens = set(re.findall(r'[a-z0-9]{3,}', payload_text))
        if not payload_tokens:
            return 0.0

        overlap = len(query_tokens & payload_tokens)
        return overlap / max(1, len(query_tokens))

    def _rerank_matches(self, query: str, results: list, top_k: int):
        scored = []
        for result in results:
            payload = result.payload or {}
            qdrant_score = float(result.score or 0.0)
            lexical_score = self._lexical_overlap_score(query, payload)
            composite_score = (qdrant_score * 0.8) + (lexical_score * 0.2)
            scored.append((composite_score, qdrant_score, result))

        scored.sort(key=lambda item: (item[0], item[1]), reverse=True)
        return [item[2] for item in scored[:top_k]]

    def _query(self, *, query_vector: list[float], collection_name: str, top_k: int):
        if hasattr(self.client, 'search'):
            return self.client.search(
                collection_name=collection_name,
                query_vector=query_vector,
                limit=top_k,
                with_payload=True,
            )

        query_result = self.client.query_points(
            collection_name=collection_name,
            query=query_vector,
            limit=top_k,
            with_payload=True,
        )
        return getattr(query_result, 'points', query_result)

    @staticmethod
    def _normalize_drug_severity(value: str | None) -> str:
        text = (value or '').strip().lower()
        if any(term in text for term in ['red', 'critical', 'severe', 'major', 'contraindicated']):
            return 'Red'
        if any(term in text for term in ['green', 'low', 'minor', 'safe']):
            return 'Green'
        return 'Yellow'

    @staticmethod
    def _normalize_drug_name(value: str | None) -> str:
        return re.sub(r'\s+', ' ', (value or '').strip())

    @classmethod
    def _is_unknown_drug_name(cls, value: str | None) -> bool:
        normalized = cls._normalize_drug_name(value).lower()
        return not normalized or normalized in cls.UNKNOWN_DRUG_LABELS

    @classmethod
    def _extract_transcript_drug_pair(cls, transcript: str) -> tuple[str, str]:
        cleaned = re.sub(
            r'\b(take|taking|using|use|tablet|capsule|dose|mg|ml|please|check|interaction|between)\b',
            ' ',
            transcript,
            flags=re.IGNORECASE,
        )
        cleaned = re.sub(r'[?.!]', ' ', cleaned)
        parts = [
            cls._normalize_drug_name(part)
            for part in re.split(r'\b(?:and|with|plus|vs|versus)\b|,|\+|&', cleaned, flags=re.IGNORECASE)
            if cls._normalize_drug_name(part)
        ]

        if len(parts) >= 2:
            return parts[0], parts[1]
        if len(parts) == 1:
            return parts[0], 'Second drug not captured'
        return 'Drug A not captured', 'Drug B not captured'

    async def _fetch_drug_description(self, drug_name: str) -> str | None:
        if not self.settings.drug_reference_api_enabled:
            return None

        normalized = self._normalize_drug_name(drug_name)
        if self._is_unknown_drug_name(normalized):
            return None

        endpoint = 'https://api.fda.gov/drug/label.json'
        query = f'openfda.generic_name:"{normalized}"'

        try:
            async with httpx.AsyncClient(timeout=self.settings.drug_reference_timeout_seconds) as client:
                response = await client.get(endpoint, params={'search': query, 'limit': 1})
                if response.status_code != 200:
                    return None

                data = response.json()
                results = data.get('results') if isinstance(data, dict) else None
                if not isinstance(results, list) or not results:
                    return None

                top = results[0] if isinstance(results[0], dict) else {}
                indication = top.get('indications_and_usage')
                description = top.get('description')

                if isinstance(indication, list) and indication:
                    return str(indication[0])[:280]
                if isinstance(indication, str):
                    return indication[:280]
                if isinstance(description, list) and description:
                    return str(description[0])[:280]
                if isinstance(description, str):
                    return description[:280]
        except Exception:
            return None

        return None

    async def _enrich_drug_matches(self, transcript: str, matches: list[DrugInteractionMatch]) -> list[DrugInteractionMatch]:
        if not matches:
            return matches

        fallback_a, fallback_b = self._extract_transcript_drug_pair(transcript)
        resolved_names: set[str] = set()

        for match in matches:
            if self._is_unknown_drug_name(match.drug_a):
                match.drug_a = fallback_a
            if self._is_unknown_drug_name(match.drug_b):
                match.drug_b = fallback_b

            if not self._is_unknown_drug_name(match.drug_a):
                resolved_names.add(self._normalize_drug_name(match.drug_a))
            if not self._is_unknown_drug_name(match.drug_b):
                resolved_names.add(self._normalize_drug_name(match.drug_b))

        description_tasks = {
            name: asyncio.create_task(self._fetch_drug_description(name)) for name in resolved_names
        }

        descriptions: dict[str, str | None] = {}
        if description_tasks:
            for name, task in description_tasks.items():
                descriptions[name] = await task

        for match in matches:
            match.drug_a_description = descriptions.get(self._normalize_drug_name(match.drug_a))
            match.drug_b_description = descriptions.get(self._normalize_drug_name(match.drug_b))

            warnings_text = ', '.join((match.warnings or [])[:2]) if match.warnings else 'standard precautions'
            match.interaction_why = (
                f'{match.drug_a} with {match.drug_b} is marked {match.interaction_severity} '
                f'based on retrieval similarity {match.score:.3f} and known cautions: {warnings_text}.'
            )

        return matches

    async def search(self, transcript: str, language_code: str, top_k: int = 5) -> list[QdrantMatch]:
        query_variants = self._build_query_variants(transcript)

        def run_search() -> list[QdrantMatch]:
            result_groups = []
            for query in query_variants:
                query_vector = self._embed_text(query)
                result_groups.append(
                    list(
                        self._query(
                            query_vector=query_vector,
                            collection_name=self.settings.qdrant_collection_name,
                            top_k=max(top_k, 5),
                        )
                    )
                )

            merged_results = self._merge_search_results(result_groups, key_fn=lambda result: str(result.id))
            merged_results = self._rerank_matches(transcript, merged_results, top_k=max(top_k, 5))
            matches: list[QdrantMatch] = []
            for result in merged_results[:top_k]:
                payload = result.payload or {}
                matches.append(
                    QdrantMatch(
                        id=str(result.id),
                        problem_label=str(payload.get('problem_label') or payload.get('problem') or 'Unknown problem'),
                        severity_score=str(payload.get('severity_score') or 'Yellow'),
                        score=float(result.score or 0.0),
                        red_flags=list(payload.get('red_flags') or []),
                        specialty=payload.get('specialty'),
                        summary=payload.get('summary'),
                    )
                )

            if not matches:
                raise RuntimeError('Qdrant returned no matches for transcript.')
            return matches

        try:
            return await asyncio.to_thread(run_search)
        except Exception as exc:
            raise RuntimeError(f'Qdrant search failed: {exc}') from exc

    async def search_schemes(self, transcript: str, top_k: int = 5) -> list[SchemeMatch]:
        query_variants = self._build_query_variants(transcript)

        def run_search() -> list[SchemeMatch]:
            result_groups = []
            for query in query_variants:
                query_vector = self._embed_text(query)
                result_groups.append(
                    list(
                        self._query(
                            query_vector=query_vector,
                            collection_name=self.settings.qdrant_scheme_collection_name,
                            top_k=max(top_k, 5),
                        )
                    )
                )

            merged_results = self._merge_search_results(result_groups, key_fn=lambda result: str(result.id))
            merged_results = self._rerank_matches(transcript, merged_results, top_k=max(top_k, 5))
            matches: list[SchemeMatch] = []
            for result in merged_results[:top_k]:
                payload = result.payload or {}
                matches.append(
                    SchemeMatch(
                        id=str(result.id),
                        scheme_name=str(payload.get('scheme_name') or payload.get('scheme') or payload.get('name') or 'Unknown Scheme'),
                        coverage_amount=str(payload.get('coverage_amount') or payload.get('coverage') or 'Not specified'),
                        eligibility=str(payload.get('eligibility') or payload.get('eligible_for') or 'Check eligibility criteria'),
                        score=float(result.score or 0.0),
                        summary=(str(payload.get('summary')) if payload.get('summary') is not None else None),
                    )
                )

            if not matches:
                raise RuntimeError('Qdrant scheme collection returned no matches for transcript.')
            return matches

        try:
            return await asyncio.to_thread(run_search)
        except Exception as exc:
            raise RuntimeError(f'Qdrant scheme search failed: {exc}') from exc

    async def search_drugs(self, transcript: str, top_k: int = 3) -> list[DrugInteractionMatch]:
        query_vector = self._embed_text(transcript)

        def run_search() -> list[DrugInteractionMatch]:
            results = self._query(
                query_vector=query_vector,
                collection_name=self.settings.qdrant_drug_collection_name,
                top_k=top_k,
            )

            matches: list[DrugInteractionMatch] = []
            for result in results:
                payload = result.payload or {}
                warnings = payload.get('warnings') or payload.get('cautions') or []
                if isinstance(warnings, str):
                    warnings = [warnings]
                elif not isinstance(warnings, list):
                    warnings = []

                matches.append(
                    DrugInteractionMatch(  # type: ignore[arg-type]
                        id=str(result.id),
                        drug_a=str(payload.get('drug_a') or payload.get('drug_1') or payload.get('drug_one') or payload.get('name') or 'Unknown drug'),
                        drug_b=str(payload.get('drug_b') or payload.get('drug_2') or payload.get('drug_two') or payload.get('second_drug') or 'Unknown drug'),
                        interaction_severity=self._normalize_drug_severity(
                            str(payload.get('interaction_severity') or payload.get('severity') or payload.get('severity_score') or 'Yellow')
                        ),
                        safe_dosage=str(
                            payload.get('safe_dosage')
                            or payload.get('recommended_dose')
                            or payload.get('dosage')
                            or payload.get('dose')
                            or 'Follow label or pharmacist guidance'
                        ),
                        score=float(result.score or 0.0),
                        recommendation=(str(payload.get('recommendation')) if payload.get('recommendation') is not None else None),
                        summary=(str(payload.get('summary')) if payload.get('summary') is not None else None),
                        warnings=[str(item) for item in warnings],
                    )
                )

            if not matches:
                raise RuntimeError('Qdrant drug collection returned no matches for transcript.')
            return matches

        try:
            matches = await asyncio.to_thread(run_search)
            return await self._enrich_drug_matches(transcript, matches)
        except Exception as exc:
            raise RuntimeError(f'Qdrant drug search failed: {exc}') from exc
