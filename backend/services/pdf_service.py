"""
PDF Service — Trích xuất Text + Hình ảnh từ file PDF
Sử dụng: PyMuPDF (fitz)
"""
import fitz  # PyMuPDF
import os
import re
from typing import List, Dict, Any

CHUNK_SIZE    = 800   # tokens xấp xỉ (ký tự ~= tokens * 4)
CHUNK_OVERLAP = 150
IMAGE_DIR     = "uploads/images"


async def process_pdf(file_path: str, metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Đọc file PDF, trích xuất text và hình ảnh, chia nhỏ thành chunks.
    Mỗi chunk gắn kèm metadata và tọa độ ảnh liên quan.
    """
    os.makedirs(IMAGE_DIR, exist_ok=True)
    doc = fitz.open(file_path)
    all_chunks = []

    for page_num, page in enumerate(doc):
        # ── Trích xuất text ──────────────────────────────────────────────
        text = page.get_text("text").strip()
        if not text:
            continue

        # ── Trích xuất hình ảnh ──────────────────────────────────────────
        image_refs = []
        image_list = page.get_images(full=True)
        for img_idx, img_info in enumerate(image_list):
            xref = img_info[0]
            base_image = doc.extract_image(xref)
            ext = base_image["ext"]
            img_filename = f"{os.path.basename(file_path)}_p{page_num}_i{img_idx}.{ext}"
            img_path = os.path.join(IMAGE_DIR, img_filename)
            with open(img_path, "wb") as f:
                f.write(base_image["image"])
            image_refs.append(img_path)

        # ── Chunking ─────────────────────────────────────────────────────
        chunks = _split_into_chunks(text, CHUNK_SIZE, CHUNK_OVERLAP)
        for chunk_idx, chunk_text in enumerate(chunks):
            all_chunks.append({
                "text":      chunk_text,
                "page":      page_num + 1,
                "chunkIdx":  chunk_idx,
                "images":    image_refs,   # hình ảnh cùng trang
                "metadata":  metadata,
            })

    doc.close()
    return all_chunks


def _split_into_chunks(text: str, size: int, overlap: int) -> List[str]:
    """
    Chia văn bản thành các đoạn nhỏ có độ trùng lặp.
    Ưu tiên cắt tại ranh giới câu (dấu chấm, xuống dòng).
    """
    # Chuẩn hóa khoảng trắng
    text = re.sub(r'\n{3,}', '\n\n', text).strip()

    chars_per_chunk = size * 4  # xấp xỉ 4 ký tự/token
    overlap_chars   = overlap * 4

    if len(text) <= chars_per_chunk:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = start + chars_per_chunk

        # Cắt tại vị trí cuối câu gần nhất
        if end < len(text):
            cut = text.rfind('\n', start, end)
            if cut == -1:
                cut = text.rfind('. ', start, end)
            if cut != -1:
                end = cut + 1

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        # BUG-07 FIX: đảm bảo start luôn tăng để tránh infinite loop
        # khi overlap_chars >= chars_per_chunk
        next_start = end - overlap_chars
        start = max(next_start, start + 1)
        if start >= len(text):
            break

    return chunks
