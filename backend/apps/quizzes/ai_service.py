import json
import re
from groq import Groq
from django.conf import settings


def _clean_json_response(text: str) -> str:
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return text.strip()


def generate_quiz_questions(topic: str, num_questions: int, difficulty: str) -> list[dict]:
    client = Groq(api_key=settings.GEMINI_API_KEY)

    prompt = f"""Generate {num_questions} multiple-choice quiz questions about "{topic}".
Difficulty level: {difficulty}.

Return ONLY a JSON array with no extra text. Each element must have exactly this structure:
{{
  "text": "Question text here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_option_index": 0,
  "explanation": "Brief explanation why this is correct."
}}

Rules:
- correct_option_index must be 0, 1, 2, or 3
- All 4 options must be plausible and distinct
- Questions must be factually accurate
- Return ONLY the JSON array, nothing else"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=4000,
        )
        raw_text = response.choices[0].message.content
    except Exception as e:
        raise RuntimeError(f"Groq API error: {str(e)}")

    try:
        cleaned = _clean_json_response(raw_text)
        questions = json.loads(cleaned)
    except (json.JSONDecodeError, ValueError) as e:
        raise ValueError(f"Failed to parse AI response: {str(e)}")

    validated = []
    for i, q in enumerate(questions):
        if not all(k in q for k in ('text', 'options', 'correct_option_index')):
            raise ValueError(f"Question {i} missing required fields")
        if len(q['options']) != 4:
            raise ValueError(f"Question {i} must have exactly 4 options")
        if not (0 <= q['correct_option_index'] <= 3):
            raise ValueError(f"Question {i} has invalid correct_option_index")
        validated.append({
            'text': str(q['text']),
            'options': [str(o) for o in q['options']],
            'correct_option_index': int(q['correct_option_index']),
            'explanation': str(q.get('explanation', '')),
        })

    return validated