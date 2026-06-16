"""
RAG Service — Orchestrate toàn bộ pipeline sinh đề thi
Luồng: Retrieve Context → LLM Sinh câu hỏi → Self-RAG Critique → Trả kết quả
SDK: google-genai (mới, thay thế google.generativeai đã deprecated)
"""
import json
import uuid
import os
import asyncio
from google import genai
from google.genai import types
from typing import List, Dict, Any
from services.embedding_service import retrieve_chunks

api_key = os.getenv("GEMINI_API_KEY", "dummy_key")
client = genai.Client(api_key=api_key)

GENERATE_MODEL = "gemini-2.5-flash-lite"  # gemini-2.0-flash có quota=0 trên project này
MAX_CRITIQUE_RETRIES = 2              # Số lần sinh lại nếu parse thất bại


async def generate_exam_questions(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Pipeline chính: RAG Retrieve → LLM Generate → Self-RAG Critique.
    Trả về dict gồm: questions (list) và usedFallback (bool).
    """
    topic_prompt = config.get("topicPrompt", "")
    mcq_count    = config.get("mcqCount", 0)
    essay_count  = config.get("essayCount", 0)
    grade        = config.get("grade", "")
    subject      = config.get("subject", "")

    # ── Bước 1: Truy xuất Context từ Numpy DB ─────────────────────────────────
    query = f"Nội dung {subject} {grade}: {topic_prompt}"

    chunks = await retrieve_chunks(
        query=query,
        grade=grade,
        subject=subject,
        n_results=15,
    )

    used_fallback = not bool(chunks)

    if not chunks:
        context = "Không có tài liệu cụ thể. Hãy sử dụng kiến thức chung chuẩn của sách giáo khoa."
        source_chunk = "Kiến thức chung SGK."
    else:
        context = "\n\n---\n\n".join([c["text"] for c in chunks])
        source_chunk = chunks[0]["text"][:200] + "..."

    # ── Bước 2: Sinh câu hỏi Trắc nghiệm ─────────────────────────────────
    all_questions = []

    if mcq_count > 0:
        mcq_questions = await _generate_mcq(context, mcq_count, subject, grade, topic_prompt)
        all_questions.extend(mcq_questions)

    # ── Bước 3: Sinh câu hỏi Tự luận ──────────────────────────────────
    if essay_count > 0:
        essay_questions = await _generate_essay(context, essay_count, subject, grade, topic_prompt)
        all_questions.extend(essay_questions)

    # ── Bước 4: Gắn chunk nguồn gốc vào mỗi câu ──────────────────────────
    for q in all_questions:
        q["sourceChunk"] = source_chunk

    # ── Bước 5: Tự gán điểm số chuẩn ──────────────────────────────────
    all_questions = _assign_points(all_questions, mcq_count, essay_count)

    return {
        "questions": all_questions,
        "usedFallback": used_fallback,
    }


def _assign_points(
    questions: List[Dict[str, Any]],
    mcq_count: int,
    essay_count: int,
) -> List[Dict[str, Any]]:
    """
    Phân bổ điểm số chuẩn cho câu hỏi.
    Trắc nghiệm chiếm 40%, Tự luận chiếm 60% (nếu có cả hai loại).
    """
    TOTAL_POINTS = 10.0

    mcqs   = [q for q in questions if q.get("type") == "Trắc nghiệm"]
    essays = [q for q in questions if q.get("type") == "Tự luận"]

    if mcqs and essays:
        mcq_pool   = round(TOTAL_POINTS * 0.4, 1)
        essay_pool = round(TOTAL_POINTS * 0.6, 1)
    elif mcqs:
        mcq_pool   = TOTAL_POINTS
        essay_pool = 0.0
    else:
        mcq_pool   = 0.0
        essay_pool = TOTAL_POINTS

    if mcqs:
        pts_each = round(mcq_pool / len(mcqs), 2)
        for q in mcqs:
            q["points"] = pts_each

    if essays:
        pts_each = round(essay_pool / len(essays), 2)
        for q in essays:
            q["points"] = pts_each

    return questions


async def _generate_mcq(
    context: str,
    count: int,
    subject: str,
    grade: str,
    topic_prompt: str,
) -> List[Dict[str, Any]]:
    prompt = f"""Bạn là giáo viên {subject} {grade} chuyên nghiệp. Hãy sinh ĐÚNG {count} câu hỏi TRẮC NGHIỆM.

**YÊU CẦU NỘI DUNG:**
- Chủ đề: {topic_prompt}
- Mỗi lần tạo đề phải có bộ câu hỏi MỚI VÀ KHÁC NHAU, đa dạng các dạng bài. Bao gồm nhận biết, thông hiểu và vận dụng.

**QUY TẮC BẮT BUỘC:**
1. Ưu tiên dựa vào kiến thức trong [TÀI LIỆU]. Nếu [TÀI LIỆU] thiếu, hãy dùng kiến thức {subject} {grade} chuẩn.
2. Sinh ra CHÍNH XÁC {count} câu hỏi, không hơn không kém.
3. Phương án nhiễu (B, C, D) phải hợp lý, tính toán có thể sai sót phổ biến của học sinh.
4. Trả về ĐÚNG định dạng JSON sau, không thêm markdown hay bất kỳ chữ nào khác.
5. Nếu câu hỏi có chứa biểu thức, phương trình, hay hệ phương trình, BẮT BUỘC dùng ký hiệu ngoặc nhọn `{{` `}}` hoặc định dạng chuẩn rõ ràng.

**[TÀI LIỆU]:**
{context[:6000]}

**ĐỊNH DẠNG OUTPUT (JSON array):**
[
  {{
    "type": "Trắc nghiệm",
    "content": "Nội dung câu hỏi?",
    "options": [
      {{"key": "A", "text": "Phương án A"}},
      {{"key": "B", "text": "Phương án B"}},
      {{"key": "C", "text": "Phương án C"}},
      {{"key": "D", "text": "Phương án D"}}
    ],
    "answer": "A",
    "explanation": "Giải thích chi tiết",
    "points": 0
  }}
]

Sinh {count} câu hỏi TRẮC NGHIỆM:"""

    questions = await _call_llm_with_critique(prompt, context, count)
    return [{"id": f"mcq-{uuid.uuid4().hex[:8]}", **q} for q in questions]


async def _generate_essay(
    context: str,
    count: int,
    subject: str,
    grade: str,
    topic_prompt: str,
) -> List[Dict[str, Any]]:
    prompt = f"""Bạn là giáo viên {subject} {grade} chuyên nghiệp. Hãy sinh ĐÚNG {count} câu hỏi TỰ LUẬN.

**YÊU CẦU NỘI DUNG:**
- Chủ đề: {topic_prompt}
- Mỗi lần tạo đề phải có bộ câu hỏi MỚI VÀ KHÁC NHAU.

**QUY TẮC BẮT BUỘC:**
1. Ưu tiên dựa vào kiến thức trong [TÀI LIỆU].
2. Sinh ra CHÍNH XÁC {count} câu hỏi, không hơn không kém.
3. Nếu là Toán và có Hệ phương trình, PHẢI dùng định dạng ngoặc nhọn hệ phương trình rõ ràng (ví dụ: `{{\n  2x + y = 5\n  x - 3y = -1\n}}`).
4. Trả về ĐÚNG định dạng JSON array sau.

**[TÀI LIỆU]:**
{context[:6000]}

**ĐỊNH DẠNG OUTPUT (JSON array):**
[
  {{
    "type": "Tự luận",
    "content": "Nội dung câu hỏi tự luận.",
    "answer": "Đáp án cuối cùng.",
    "explanation": "Hướng dẫn giải từng bước.",
    "points": 0
  }}
]

Sinh {count} câu hỏi TỰ LUẬN:"""

    questions = await _call_llm_with_critique(prompt, context, count)
    return [{"id": f"essay-{uuid.uuid4().hex[:8]}", **q} for q in questions]


async def _call_llm_with_critique(
    generation_prompt: str,
    original_context: str,
    expected_count: int,
) -> List[Dict[str, Any]]:
    questions: List[Dict[str, Any]] = []

    for attempt in range(MAX_CRITIQUE_RETRIES + 1):
        # Dùng asyncio.to_thread vì google-genai generate_content là synchronous
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=GENERATE_MODEL,
            contents=generation_prompt,
            config=types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=8192,
            ),
        )
        raw = response.text.strip()

        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        try:
            parsed = json.loads(raw)
            questions = parsed if isinstance(parsed, list) else [parsed]
        except json.JSONDecodeError:
            if attempt < MAX_CRITIQUE_RETRIES:
                continue
            return []

        if len(questions) > expected_count:
            questions = questions[:expected_count]

        if len(questions) == expected_count:
            return questions

        generation_prompt += f"\n\n[LẦN THỬ {attempt + 2}] BẠN PHẢI SINH ĐÚNG {expected_count} CÂU. BẠN VỪA SINH {len(questions)} CÂU."

    return questions
