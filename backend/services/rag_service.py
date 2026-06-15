"""
RAG Service — Orchestrate toàn bộ pipeline sinh đề thi
Luồng: Retrieve Context → LLM Sinh câu hỏi → Self-RAG Critique → Trả kết quả
"""
import json
import uuid
import os
import google.generativeai as genai
from typing import List, Dict, Any
from services.embedding_service import retrieve_chunks

api_key = os.getenv("GEMINI_API_KEY", "dummy_key")
if api_key != "dummy_key":
    genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-1.5-flash")

MAX_CRITIQUE_RETRIES = 2   # Số lần sinh lại nếu bị ảo tưởng


async def generate_exam_questions(config: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Pipeline chính: RAG Retrieve → LLM Generate → Self-RAG Critique.
    Trả về danh sách câu hỏi đã kiểm định.
    """
    doc_ids     = config["documentIds"]
    mcq_count   = config["mcqCount"]
    essay_count = config["essayCount"]
    difficulty  = config.get("difficulty", ["Thông hiểu", "Vận dụng"])
    subject     = config.get("subject", "")

    # ── Bước 1: Truy xuất Context từ Vector DB ─────────────────────────
    query = f"Câu hỏi {subject} mức độ {', '.join(difficulty)}"
    chunks = await retrieve_chunks(
        query=query,
        doc_ids=doc_ids,
        n_results=min(10, mcq_count + essay_count + 2),
        difficulty_filter=difficulty if difficulty else None,
    )

    if not chunks:
        raise ValueError("Không tìm thấy nội dung phù hợp trong tài liệu đã chọn.")

    context = "\n\n---\n\n".join([c["text"] for c in chunks])

    # ── Bước 2: Sinh câu hỏi Trắc nghiệm ─────────────────────────────
    all_questions = []

    if mcq_count > 0:
        mcq_questions = await _generate_mcq(context, mcq_count, difficulty, subject)
        all_questions.extend(mcq_questions)

    # ── Bước 3: Sinh câu hỏi Tự luận ──────────────────────────────────
    if essay_count > 0:
        essay_questions = await _generate_essay(context, essay_count, difficulty, subject)
        all_questions.extend(essay_questions)

    # ── Bước 4: Gắn chunk nguồn gốc vào mỗi câu ──────────────────────
    for q in all_questions:
        q["sourceChunk"] = chunks[0]["text"][:200] + "..."  # chunk đại diện

    return all_questions


async def _generate_mcq(
    context: str,
    count: int,
    difficulty: List[str],
    subject: str,
) -> List[Dict[str, Any]]:
    """Sinh câu hỏi trắc nghiệm với Self-RAG Critique loop."""

    prompt = f"""Bạn là giáo viên {subject} chuyên nghiệp. Hãy sinh ĐÚNG {count} câu hỏi TRẮC NGHIỆM từ tài liệu sau.

**QUY TẮC BẮT BUỘC:**
1. Mọi câu hỏi PHẢI dựa hoàn toàn vào nội dung trong [TÀI LIỆU]. KHÔNG được bịa thêm kiến thức ngoài.
2. Phương án nhiễu (B, C, D) phải hợp lý, không quá lộ liễu.
3. Mức độ tư duy: {', '.join(difficulty)}.
4. Trả về ĐÚNG định dạng JSON sau, không thêm gì khác.

**[TÀI LIỆU]:**
{context}

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
    "explanation": "Giải thích tại sao A đúng, dựa trên tài liệu.",
    "points": 0.25
  }}
]

Sinh {count} câu hỏi:"""

    questions = await _call_llm_with_critique(prompt, context, count)
    return [{"id": f"mcq-{uuid.uuid4().hex[:8]}", **q} for q in questions]


async def _generate_essay(
    context: str,
    count: int,
    difficulty: List[str],
    subject: str,
) -> List[Dict[str, Any]]:
    """Sinh câu hỏi tự luận với Self-RAG Critique loop."""

    essay_points = round(7.0 / count, 2) if count > 0 else 2.0

    prompt = f"""Bạn là giáo viên {subject} chuyên nghiệp. Hãy sinh ĐÚNG {count} câu hỏi TỰ LUẬN từ tài liệu sau.

**QUY TẮC BẮT BUỘC:**
1. Mọi câu hỏi PHẢI dựa hoàn toàn vào nội dung trong [TÀI LIỆU]. KHÔNG được bịa thêm kiến thức ngoài.
2. Câu hỏi phải có hướng dẫn giải chi tiết.
3. Mức độ tư duy: {', '.join(difficulty)}.
4. Trả về ĐÚNG định dạng JSON sau.

**[TÀI LIỆU]:**
{context}

**ĐỊNH DẠNG OUTPUT (JSON array):**
[
  {{
    "type": "Tự luận",
    "content": "Nội dung câu hỏi tự luận (có thể nhiều dòng).",
    "answer": "Đáp án / kết quả cuối.",
    "explanation": "Hướng dẫn giải chi tiết từng bước.",
    "points": {essay_points}
  }}
]

Sinh {count} câu hỏi:"""

    questions = await _call_llm_with_critique(prompt, context, count)
    return [{"id": f"essay-{uuid.uuid4().hex[:8]}", **q} for q in questions]


async def _call_llm_with_critique(
    generation_prompt: str,
    original_context: str,
    expected_count: int,
) -> List[Dict[str, Any]]:
    """
    Gọi LLM để sinh câu hỏi, sau đó chạy Self-RAG Critique.
    Nếu câu hỏi bị ảo tưởng → sinh lại (tối đa MAX_CRITIQUE_RETRIES lần).
    """
    for attempt in range(MAX_CRITIQUE_RETRIES + 1):
        # ── Sinh câu hỏi ────────────────────────────────────────────────
        response = model.generate_content(
            generation_prompt,
            generation_config={"temperature": 0.4, "max_output_tokens": 4096},
        )
        raw = response.text.strip()

        # Tách JSON ra khỏi markdown code block nếu có
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        try:
            questions = json.loads(raw)
            if not isinstance(questions, list):
                questions = [questions]
        except json.JSONDecodeError:
            if attempt < MAX_CRITIQUE_RETRIES:
                continue
            return []

        # ── Self-RAG Critique ────────────────────────────────────────────
        valid_questions = []
        for q in questions:
            is_valid = await _critique_question(q, original_context)
            if is_valid:
                valid_questions.append(q)

        if len(valid_questions) >= expected_count:
            return valid_questions[:expected_count]

        # Nếu chưa đủ, thêm hướng dẫn nghiêm ngặt hơn và thử lại
        generation_prompt += f"\n\n[LẦN THỬ {attempt + 2}] Lần trước bị từ chối vì ảo tưởng. Hãy chỉ dùng thông tin CÓ TRONG tài liệu."

    return valid_questions


async def _critique_question(question: Dict[str, Any], context: str) -> bool:
    """
    Self-RAG Critique: Hỏi LLM xem câu hỏi có nằm trong tài liệu không.
    Trả về True nếu hợp lệ, False nếu ảo tưởng.
    """
    content = question.get("content", "")
    answer  = question.get("answer", "")

    critique_prompt = f"""Kiểm tra xem câu hỏi và đáp án sau có dựa trực tiếp vào [TÀI LIỆU] không.

**[TÀI LIỆU]:**
{context[:1500]}

**CÂU HỎI:** {content}
**ĐÁP ÁN:** {answer}

Trả lời CHỈ bằng một từ: "HỢP_LỆ" nếu thông tin có trong tài liệu, hoặc "ẢO_TƯỞNG" nếu không có."""

    try:
        response = model.generate_content(
            critique_prompt,
            generation_config={"temperature": 0.0, "max_output_tokens": 10},
        )
        verdict = response.text.strip().upper()
        return "HỢP_LỆ" in verdict
    except Exception:
        return True  # Mặc định chấp nhận nếu API lỗi
