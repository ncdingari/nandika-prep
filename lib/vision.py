import gc
import io
import json
import sys
from typing import Any

from PIL import Image, ExifTags


def _log(msg: str) -> None:
    print(f"[vision.py] {msg}", file=sys.stderr)


def preprocess_image(raw_bytes: bytes, max_width: int = 2000) -> bytes:
    img = Image.open(io.BytesIO(raw_bytes))

    # Auto-rotate based on EXIF orientation
    try:
        exif = img._getexif()  # type: ignore
        if exif:
            orientation_key = next(
                (k for k, v in ExifTags.TAGS.items() if v == "Orientation"), None
            )
            if orientation_key and orientation_key in exif:
                orientation = exif[orientation_key]
                rotations = {3: 180, 6: 270, 8: 90}
                if orientation in rotations:
                    img = img.rotate(rotations[orientation], expand=True)
    except Exception:
        pass

    img = img.convert("RGB")
    if img.width > max_width:
        ratio = max_width / img.width
        new_h = int(img.height * ratio)
        img = img.resize((max_width, new_h), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    result = buf.getvalue()
    del img
    gc.collect()
    return result


def rasterize_pdf(pdf_bytes: bytes, dpi: int = 200) -> list[bytes]:
    from pdf2image import convert_from_bytes

    pages = convert_from_bytes(pdf_bytes, dpi=dpi)
    result = []
    for page in pages:
        buf = io.BytesIO()
        page = page.convert("RGB")
        page.save(buf, format="JPEG", quality=85)
        result.append(buf.getvalue())
        del page
    gc.collect()
    return result


# --- Vision system prompts ---

MIXED_WORKSHEET_SYSTEM = (
    "You are reading a worksheet completed by Nandika. The worksheet contains a mix of question "
    "types. The expected answer kind for each question is provided in the question id list. For "
    "multiple choice, identify the letter she marked. For numeric, transcribe what she wrote. For "
    "fractions, transcribe in N/D form. For division with remainder, transcribe as \"Q R R\". For "
    "text responses, transcribe verbatim preserving her spelling.\n\n"
    "Output strictly valid JSON: {"
    '"answers": [ {"questionId": string, "raw_answer": string|null, "answer_kind": string, '
    '"confidence": float} ] }.'
)

# Legacy prompts retained for V1 compatibility.
COGAT_EXTRACTION_SYSTEM = (
    "You are reading a worksheet completed by a 6 year old named Nandika who works at advanced "
    "grade levels. The worksheet contains exactly 18 numbered questions, each with four lettered "
    "choices A, B, C, D. For each question, identify which single letter she circled, checked, "
    "crossed, colored, or otherwise marked as her answer. If a question is unanswered or unclear, "
    "return null for that question and a low confidence value. Output strictly valid JSON with "
    "this exact shape and nothing else: "
    '{ "answers": [ { "questionId": "<id>", "chosenLetter": "A"|"B"|"C"|"D"|null, '
    '"confidence": number between 0 and 1 } ] }. Do not include any commentary outside the JSON.'
)

KUMON_MATH_EXTRACTION_SYSTEM = (
    "You are reading a Kumon Level D math worksheet completed by Nandika. The worksheet contains "
    "long multiplication problems (2-digit by 2-digit, 3-digit by 2-digit), long division problems "
    "(with 1-digit and 2-digit divisors, possibly with remainders shown as 'R'), and fraction "
    "problems. For each numbered problem, transcribe the final answer she wrote. For long division "
    "with remainders, transcribe as 'quotient R remainder', for example '23 R 4'. For fractions, "
    "transcribe in the form 'numerator/denominator', for example '3/4'. If a problem is unanswered "
    "or unreadable, return null with low confidence. Output strictly valid JSON: "
    '{ "answers": [ { "questionId": string, "answer": string|null, "confidence": number } ] }. '
    "Output nothing else."
)

KUMON_READING_WRITING_SYSTEM = (
    "You are transcribing handwritten responses from Nandika on a Kumon English Level DI "
    "worksheet. Responses may include short summaries of paragraph topics, restatements of main "
    "ideas, or short descriptive answers. Output strictly valid JSON: "
    '{ "transcription": string }. Preserve her spelling exactly as written, even if misspelled. '
    "Do not correct anything. Do not add punctuation she did not write. Output nothing else."
)

CONFIDENCE_THRESHOLD = 0.7


def extract_answers(
    image_bytes: bytes | None = None,
    pdf_bytes: bytes | None = None,
    question_meta: list[dict[str, str]] | None = None,
    db=None,
    user_id: int | None = None,
) -> list[dict[str, Any]]:
    from lib.ai import call_ai

    image, pdf_pages = _prepare_inputs(image_bytes, pdf_bytes)
    ids_note = ""
    if question_meta:
        parts = [f'{q["questionId"]} ({q["answer_kind"]})' for q in question_meta]
        ids_note = " The question IDs and answer kinds are: " + ", ".join(parts) + "."

    result_text, _ = call_ai(
        system=MIXED_WORKSHEET_SYSTEM,
        user=f"Extract all answers from this worksheet.{ids_note}",
        image=image,
        pdf_pages=pdf_pages,
        db=db,
        user_id=user_id,
    )
    return _parse_answer_list(result_text, "raw_answer", answer_kind_key="answer_kind")


def extract_cogat_answers(
    image_bytes: bytes | None = None,
    pdf_bytes: bytes | None = None,
    question_ids: list[str] | None = None,
    db=None,
    user_id: int | None = None,
) -> list[dict[str, Any]]:
    from lib.ai import call_ai, VisionUnavailable

    image, pdf_pages = _prepare_inputs(image_bytes, pdf_bytes)
    ids_note = ""
    if question_ids:
        ids_note = f" The question IDs in order are: {', '.join(question_ids)}."

    result_text, _ = call_ai(
        system=COGAT_EXTRACTION_SYSTEM,
        user=f"Extract all answers from this worksheet.{ids_note}",
        image=image,
        pdf_pages=pdf_pages,
        db=db,
        user_id=user_id,
    )
    return _parse_answer_list(result_text, "chosenLetter")


def extract_kumon_math_answers(
    image_bytes: bytes | None = None,
    pdf_bytes: bytes | None = None,
    db=None,
    user_id: int | None = None,
) -> list[dict[str, Any]]:
    from lib.ai import call_ai

    image, pdf_pages = _prepare_inputs(image_bytes, pdf_bytes)
    result_text, _ = call_ai(
        system=KUMON_MATH_EXTRACTION_SYSTEM,
        user="Extract all answers from this Kumon math worksheet.",
        image=image,
        pdf_pages=pdf_pages,
        db=db,
        user_id=user_id,
    )
    return _parse_answer_list(result_text, "answer")


def extract_kumon_writing(
    image_bytes: bytes | None = None,
    pdf_bytes: bytes | None = None,
    db=None,
    user_id: int | None = None,
) -> str:
    from lib.ai import call_ai

    image, pdf_pages = _prepare_inputs(image_bytes, pdf_bytes)
    result_text, _ = call_ai(
        system=KUMON_READING_WRITING_SYSTEM,
        user="Transcribe the handwritten writing response from this worksheet.",
        image=image,
        pdf_pages=pdf_pages,
        db=db,
        user_id=user_id,
    )
    if result_text:
        try:
            parsed = json.loads(result_text)
            return parsed.get("transcription", "")
        except json.JSONDecodeError:
            return result_text.strip()
    return ""


def _prepare_inputs(
    image_bytes: bytes | None,
    pdf_bytes: bytes | None,
) -> tuple[bytes | None, list[bytes] | None]:
    if image_bytes:
        return preprocess_image(image_bytes), None
    if pdf_bytes:
        raw_pages = rasterize_pdf(pdf_bytes)
        pages = [preprocess_image(p) for p in raw_pages]
        # Process at most 4 pages at once to stay under 1 GB RAM
        return None, pages[:4]
    return None, None


def _parse_answer_list(
    result_text: str | None,
    answer_key: str,
    answer_kind_key: str | None = None,
) -> list[dict[str, Any]]:
    if not result_text:
        return []
    try:
        parsed = json.loads(result_text)
        answers = parsed.get("answers", [])
        for item in answers:
            item["flagged"] = item.get("confidence", 1.0) < CONFIDENCE_THRESHOLD
            if answer_kind_key and answer_kind_key not in item:
                item[answer_kind_key] = None
        return answers
    except json.JSONDecodeError:
        _log("Failed to parse vision JSON response")
        return []
