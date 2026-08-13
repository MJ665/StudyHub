"""Unified answer-set grading engine (Phase 3).

ONE implementation of the per-question grading loop, shared by every delivery
mode — practice quiz (`/quiz/attempts`) and proctored exam
(`/exams/attempts/{id}/submit`). Delivery differences (timers, proctoring,
difficulty weighting, review visibility) are CONFIGURATION on top of this
loop, never separate code paths.

Consolidates what previously lived twice:
- quiz submit_attempt: decode → grade_question → difficulty-weighted points +
  detailed_answers records
- exam submit_exam: grade_question → raw points  (and, before this module,
  NEVER decoded JSON-array multi-select answers, so mcq_multi in exams was
  always graded wrong — fixed by sharing the decode)
"""

import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence

from services.grading import (
    GradeResult,
    grade_question,
    question_to_dict,
    resolve_answer,
)


def decode_answer(raw: Any) -> Any:
    """Multi-select answers arrive as a JSON-array string; decode so the
    grader receives a real list. Every other shape passes through untouched."""
    if isinstance(raw, str) and raw.startswith("["):
        try:
            return json.loads(raw)
        except Exception:
            return raw
    return raw


@dataclass
class GradedItem:
    question_id: int
    grade: GradeResult
    weight: float
    raw_answer: Any
    note: str = ""
    detail: Optional[dict] = None  # quiz-shaped detailed_answers record


@dataclass
class GradedSet:
    items: List[GradedItem] = field(default_factory=list)
    # Difficulty-weighted scoring (practice-quiz convention)
    points_list: List[float] = field(default_factory=list)
    weights_list: List[float] = field(default_factory=list)
    # Raw-point scoring (exam convention)
    earned_points: float = 0.0
    max_points: float = 0.0

    @property
    def detailed_answers(self) -> List[dict]:
        return [i.detail for i in self.items if i.detail is not None]

    @property
    def needs_review(self) -> bool:
        return any(i.grade.needs_review for i in self.items)


def _correct_text(q: Any) -> str:
    qtype = getattr(q, "question_type", "mcq_single") or "mcq_single"
    if qtype in ("mcq_single", "true_false"):
        return resolve_answer(q.answer, q.options)
    return q.model_answer or (q.answer or "")


async def grade_answer_set(
    questions_by_id: Dict[int, Any],
    ordered_question_ids: Sequence[int],
    answers: Sequence[Any] | Dict[str, Any],
    *,
    notes: Optional[Sequence[str]] = None,
    difficulty_weights: Optional[Dict[str, float]] = None,
    collect_details: bool = True,
) -> GradedSet:
    """Grade one submission.

    `answers` is positional (quiz: List aligned with ordered ids) or keyed by
    str(question_id) (exam: {qid: answer}). Unknown question ids are skipped,
    matching both legacy paths.
    """
    out = GradedSet()
    for idx, q_id in enumerate(ordered_question_ids):
        q = questions_by_id.get(q_id)
        if not q:
            continue

        if isinstance(answers, dict):
            raw = answers.get(str(q_id), "")
        else:
            raw = answers[idx] if idx < len(answers) else ""
        note = ""
        if notes is not None and idx < len(notes):
            note = (notes[idx] or "")[:1000]

        weight = 1.0
        if difficulty_weights is not None:
            weight = float(
                difficulty_weights.get(getattr(q, "difficulty", None) or "Medium", 1.0)
            )

        decoded = decode_answer(raw)
        grade = await grade_question(question_to_dict(q), decoded)

        detail = None
        if collect_details:
            qtype = getattr(q, "question_type", "mcq_single") or "mcq_single"
            # FIX #3: Normalize user_answer and correct_answer for mcq_single (string, not list)
            # mcq_single must use scalar strings; mcq_multiple uses lists
            user_ans = raw
            if qtype == "mcq_single" and isinstance(decoded, list) and decoded:
                # If a single-choice answer was submitted as an array, extract the first element
                user_ans = decoded[0] if decoded else raw

            correct_ans = _correct_text(q)
            if qtype == "mcq_single" and isinstance(correct_ans, list) and correct_ans:
                # If stored correct answer is a list (shouldn't happen for mcq_single), extract first
                correct_ans = correct_ans[0] if correct_ans else correct_ans

            detail = {
                "question_id": q.id,
                "question_text": q.question,
                "question_type": qtype,
                "options": q.options,
                "user_answer": user_ans,
                "correct_answer": correct_ans,
                "is_correct": grade.is_correct,
                "fraction": round(grade.fraction, 3),
                "ai_rationale": grade.rationale,
                "needs_review": grade.needs_review,
                "note": note,
                "weighted_points": round(grade.fraction * weight, 3),
            }

        out.items.append(
            GradedItem(
                question_id=q_id, grade=grade, weight=weight,
                raw_answer=raw, note=note, detail=detail,
            )
        )
        out.points_list.append(grade.fraction * weight)
        out.weights_list.append(weight)
        out.earned_points += grade.points_earned
        out.max_points += grade.max_points
    return out
