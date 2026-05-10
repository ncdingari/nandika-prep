import base64
import json
import sys

from shared import ANTHROPIC_API_KEY, DEEPSEEK_API_KEY, CLAUDE_MODEL, DEEPSEEK_MODEL


class VisionUnavailable(Exception):
    pass


def _log(msg: str, exc: Exception | None = None) -> None:
    parts = [f"[ai.py] {msg}"]
    if exc:
        parts.append(str(exc))
    print(" | ".join(parts), file=sys.stderr)


def _get_deepseek_client():
    from openai import OpenAI
    return OpenAI(api_key=DEEPSEEK_API_KEY, base_url="https://api.deepseek.com")


def _get_claude_client():
    from anthropic import Anthropic
    return Anthropic(api_key=ANTHROPIC_API_KEY)


def call_ai(
    system: str,
    user: str,
    json_mode: bool = False,
    image: bytes | None = None,
    pdf_pages: list[bytes] | None = None,
    max_tokens: int = 4096,
    db=None,
    user_id: int | None = None,
) -> tuple[str | None, str]:
    """
    Returns (response_text, provider_used).
    Vision path: Claude only.
    Text path: DeepSeek primary, Claude fallback, then (None, 'offline').
    """
    if image or pdf_pages:
        try:
            text = _call_claude_vision(system, user, image, pdf_pages, max_tokens=max_tokens)
            _bump_stats(db, user_id, "claude", success=True, vision=True)
            return text, "claude"
        except Exception as e:
            _bump_stats(db, user_id, "claude", success=False, vision=True)
            raise VisionUnavailable(f"Claude vision failed: {e}") from e

    try:
        text = _call_deepseek(system, user, json_mode, max_tokens=max_tokens)
        _bump_stats(db, user_id, "deepseek", success=True)
        return text, "deepseek"
    except Exception as e:
        _bump_stats(db, user_id, "deepseek", success=False)
        _log("deepseek failed", e)

    try:
        text = _call_claude_text(system, user, json_mode, max_tokens=max_tokens)
        _bump_stats(db, user_id, "claude", success=True)
        return text, "claude"
    except Exception as e:
        _bump_stats(db, user_id, "claude", success=False)
        _log("claude failed", e)

    return None, "offline"


def call_ai_json(
    system: str,
    user: str,
    max_tokens: int = 4096,
    db=None,
    user_id: int | None = None,
) -> tuple[dict | None, str]:
    """Convenience wrapper that parses the JSON response."""
    text, provider = call_ai(system, user, json_mode=True, max_tokens=max_tokens, db=db, user_id=user_id)
    if text is None:
        return None, provider
    try:
        return json.loads(text), provider
    except json.JSONDecodeError:
        _log("JSON parse failed", None)
        return None, "offline"


def _call_deepseek(system: str, user: str, json_mode: bool, max_tokens: int) -> str:
    client = _get_deepseek_client()
    kwargs: dict = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "timeout": 30,
        "max_tokens": max_tokens,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    resp = client.chat.completions.create(**kwargs)
    return resp.choices[0].message.content or ""


def _call_claude_text(system: str, user: str, json_mode: bool, max_tokens: int) -> str:
    client = _get_claude_client()
    sys_msg = system
    if json_mode:
        sys_msg += "\n\nOutput strictly valid JSON. Output nothing outside the JSON."
    resp = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=max_tokens,
        system=sys_msg,
        messages=[{"role": "user", "content": user}],
        timeout=30,
    )
    return resp.content[0].text


def _call_claude_vision(
    system: str,
    user: str,
    image: bytes | None,
    pdf_pages: list[bytes] | None,
    max_tokens: int,
) -> str:
    client = _get_claude_client()
    content_blocks: list[dict] = []
    images = pdf_pages if pdf_pages else ([image] if image else [])
    for img_bytes in images:
        b64 = base64.standard_b64encode(img_bytes).decode("utf-8")
        content_blocks.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/jpeg", "data": b64},
        })
    content_blocks.append({"type": "text", "text": user})
    resp = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": content_blocks}],
        timeout=60,
    )
    return resp.content[0].text


def _bump_stats(db, user_id: int | None, provider: str, success: bool, vision: bool = False) -> None:
    if db is None or user_id is None:
        return
    try:
        from lib.db import ProviderStat
        row = db.query(ProviderStat).filter_by(user_id=user_id, provider=provider).first()
        if not row:
            row = ProviderStat(user_id=user_id, provider=provider)
            db.add(row)
        if success:
            row.success_count = (row.success_count or 0) + 1
        else:
            row.fail_count = (row.fail_count or 0) + 1
        if vision:
            row.vision_call_count = (row.vision_call_count or 0) + 1
        db.commit()
    except Exception as e:
        _log("_bump_stats failed", e)
