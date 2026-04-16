"""
Result Validation Service - Ensures triage results are accurate and trustworthy.
"""

from dataclasses import dataclass
from app.services.qdrant import QdrantMatch


@dataclass
class ResultValidation:
    is_valid: bool
    confidence_score: float  # 0.0 - 1.0
    reasons: list[str]
    matched_evidence: list[str]


class ResultValidator:
    """Validates triage results against evidence and returns confidence scores."""
    
    @staticmethod
    def validate_qdrant_matches(
        transcript: str,
        matches: list[QdrantMatch],
    ) -> ResultValidation:
        """
        Validate that Qdrant matches are relevant to transcript.
        
        Returns confidence score based on:
        - Number of high-quality matches
        - Match relevance scores
        - Evidence alignment with transcript
        """
        if not matches:
            return ResultValidation(
                is_valid=False,
                confidence_score=0.0,
                reasons=["No Qdrant matches found for transcript"],
                matched_evidence=[],
            )
        
        high_score_count = sum(1 for m in matches if m.score > 0.7)
        avg_score = sum(m.score for m in matches) / len(matches) if matches else 0.0
        
        # Validate top match is truly relevant
        top_match = matches[0]
        confidence = min(1.0, top_match.score * 1.2)  # Scale score to 0-1 confidence
        
        is_valid = top_match.score > 0.5 and high_score_count >= 1
        
        reasons = []
        matched_evidence = []
        
        if top_match.score > 0.7:
            reasons.append(f"Strong match: {top_match.problem_label} (score: {top_match.score:.2f})")
            matched_evidence.append(top_match.problem_label)
        elif top_match.score > 0.5:
            reasons.append(f"Moderate match: {top_match.problem_label} (score: {top_match.score:.2f})")
            matched_evidence.append(top_match.problem_label)
        else:
            reasons.append(f"Weak match: {top_match.problem_label} (score: {top_match.score:.2f})")
            is_valid = False
        
        if high_score_count > 1:
            reasons.append(f"{high_score_count} high-confidence matches found")
        
        reasons.append(f"Average certainty: {avg_score:.2%}")
        
        return ResultValidation(
            is_valid=is_valid,
            confidence_score=confidence,
            reasons=reasons,
            matched_evidence=matched_evidence,
        )
    
    @staticmethod
    def validate_severity_score(
        severity: str,
        matches: list[QdrantMatch],
        transcript: str,
    ) -> ResultValidation:
        """Validate severity score is appropriate for the evidence."""
        
        if severity not in {'Green', 'Yellow', 'Red'}:
            return ResultValidation(
                is_valid=False,
                confidence_score=0.0,
                reasons=["Invalid severity score"],
                matched_evidence=[],
            )
        
        # Check if severity matches evidence
        red_flags_mentioned = any(
            flag.lower() in transcript.lower()
            for m in matches
            for flag in m.red_flags
        )
        
        reasons = []
        matched_evidence = []
        
        if severity == 'Red':
            if red_flags_mentioned or any(m.severity_score == 'Red' for m in matches):
                confidence = 0.95
                reasons.append("Red severity justified by red flags or critical matches")
            else:
                confidence = 0.6
                reasons.append("Red severity assigned but weak evidence - requires human review")
        
        elif severity == 'Yellow':
            if any(m.severity_score == 'Yellow' for m in matches):
                confidence = 0.88
                reasons.append("Yellow severity backed by moderate-risk matches")
            else:
                confidence = 0.75
                reasons.append("Yellow severity reasonable given available evidence")
        
        else:  # Green
            if all(m.severity_score == 'Green' for m in matches):
                confidence = 0.9
                reasons.append("Green severity confirmed across all matches")
            else:
                confidence = 0.7
                reasons.append("Green severity with some yellow/red flags - monitor closely")
        
        matched_evidence = [f"{m.problem_label} ({m.severity_score})" for m in matches[:3]]
        
        return ResultValidation(
            is_valid=confidence > 0.6,
            confidence_score=confidence,
            reasons=reasons,
            matched_evidence=matched_evidence,
        )
    
    @staticmethod
    def validate_red_flags(
        red_flags: list[str],
        transcript: str,
        matches: list[QdrantMatch],
    ) -> ResultValidation:
        """Validate that red flags are actually present in transcript or matches."""
        
        if not red_flags:
            return ResultValidation(
                is_valid=True,
                confidence_score=0.9,
                reasons=["No red flags detected - low-risk case"],
                matched_evidence=[],
            )
        
        reasons = []
        matched_evidence = []
        
        for flag in red_flags:
            in_transcript = flag.lower() in transcript.lower()
            in_matches = any(flag in m.red_flags for m in matches)
            
            if in_transcript or in_matches:
                source = "transcript" if in_transcript else "Qdrant match"
                matched_evidence.append(f"{flag} (found in {source})")
                reasons.append(f"Red flag '{flag}' verified in {source}")
            else:
                reasons.append(f"Red flag '{flag}' not directly verified - use with caution")
        
        confidence = len(matched_evidence) / len(red_flags) if red_flags else 0.0
        
        return ResultValidation(
            is_valid=len(matched_evidence) >= len(red_flags) * 0.5,
            confidence_score=confidence,
            reasons=reasons,
            matched_evidence=matched_evidence,
        )
    
    @staticmethod
    def overall_confidence(
        validations: dict[str, ResultValidation],
    ) -> float:
        """Calculate overall confidence from all validation checks."""
        if not validations:
            return 0.0
        
        scores = [v.confidence_score for v in validations.values()]
        weights = {
            'qdrant': 0.35,
            'severity': 0.35,
            'red_flags': 0.30,
        }
        
        weighted_score = sum(
            validations[key].confidence_score * weights.get(key, 0.0)
            for key in validations
            if key in weights
        )
        
        return min(1.0, max(0.0, weighted_score))
