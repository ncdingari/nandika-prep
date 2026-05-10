"""
PDF rasterizer using pdf2image (requires poppler-utils).
"""
import gc
import io
import sys
from typing import Any


def _log(msg: str) -> None:
    print(f"[pdf_rasterizer.py] {msg}", file=sys.stderr)


def rasterize_pdf_to_pages(pdf_bytes: bytes, dpi: int = 200, max_pages: int = 4) -> list[bytes]:
    """
    Convert a PDF to a list of JPEG-compressed page images.
    Returns up to max_pages pages to stay under RAM limits.
    """
    try:
        from pdf2image import convert_from_bytes
    except ImportError:
        _log("pdf2image not installed; cannot rasterize PDF")
        return []

    try:
        pages = convert_from_bytes(
            pdf_bytes,
            dpi=dpi,
            first_page=1,
            last_page=max_pages,
        )
    except Exception as e:
        _log(f"pdf2image conversion failed: {e}")
        return []

    result = []
    for page in pages:
        try:
            page = page.convert("RGB")
            buf = io.BytesIO()
            page.save(buf, format="JPEG", quality=85)
            result.append(buf.getvalue())
        except Exception as e:
            _log(f"page conversion failed: {e}")
        finally:
            del page
    gc.collect()
    return result
