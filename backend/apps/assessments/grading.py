

def grade(quiz, responses: dict) -> tuple[int, list[dict]]:
    questions = quiz.questions.prefetch_related('answers').all()
    total_points = 0
    earned = 0
    review = []

    for q in questions:
        total_points += q.points
        correct_ids = {a.id for a in q.answers.all() if a.is_correct}
        raw = responses.get(str(q.id), responses.get(q.id, [])) or []
        try:
            selected = {int(x) for x in raw}
        except (TypeError, ValueError):
            selected = set()
        is_correct = bool(correct_ids) and selected == correct_ids
        if is_correct:
            earned += q.points
        review.append(
            {
                'question_id': q.id,
                'correct': is_correct,
                'correct_answer_ids': sorted(correct_ids),
                'selected_answer_ids': sorted(selected),
            }
        )

    score = round(earned / total_points * 100) if total_points else 0
    return score, review
