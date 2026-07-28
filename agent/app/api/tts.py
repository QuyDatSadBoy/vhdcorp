"""POST /api/tts — Text-to-Speech cho voice reply (§9.3), ẩn key khỏi FE.

- CHÍNH: PTIT holobox — POST {"text": ...} → WAV (nội bộ, không tốn tiền).
- DỰ PHÒNG: MiniMax t2a_v2 → JSON có data.audio là chuỗi HEX → MP3 (tốn phí),
  chỉ gọi khi PTIT lỗi/không với tới.
Tối ưu latency: client HTTP dùng lại (bỏ TLS handshake mỗi lần) + LRU cache theo
hash(text) — cùng một câu chỉ tổng hợp đúng 1 lần (cache cả định dạng audio).
"""

import hashlib
import logging
from collections import OrderedDict

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter()

_MINIMAX_URL = "https://api.minimax.io/v1/t2a_v2"
_MAX_CHARS = 600

# Connection pool dùng chung — handshake TLS chỉ trả giá 1 lần
_client: httpx.AsyncClient | None = None

# LRU cache audio in-memory: key = sha256(text) → (media_type, bytes), tối đa 64 câu
_audio_cache: OrderedDict[str, tuple[str, bytes]] = OrderedDict()
_CACHE_MAX = 64


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=15)
    return _client


def _cache_get(key: str) -> tuple[str, bytes] | None:
    hit = _audio_cache.get(key)
    if hit is not None:
        _audio_cache.move_to_end(key)
    return hit


def _cache_put(key: str, media_type: str, audio: bytes) -> None:
    _audio_cache[key] = (media_type, audio)
    _audio_cache.move_to_end(key)
    while len(_audio_cache) > _CACHE_MAX:
        _audio_cache.popitem(last=False)


async def _synthesize_ptit(text: str) -> tuple[str, bytes] | None:
    """TTS chính: PTIT holobox → (media_type, bytes WAV). None nếu lỗi (để fallback)."""
    url = get_settings().ptit_tts_url
    if not url:
        return None
    try:
        resp = await _get_client().post(url, json={"text": text}, timeout=12.0)
    except httpx.HTTPError as exc:
        logger.warning("PTIT TTS không với tới được: %s", exc)
        return None
    if resp.status_code >= 300 or not resp.content:
        logger.warning("PTIT TTS lỗi HTTP %s: %s", resp.status_code, resp.text[:200])
        return None
    media_type = (resp.headers.get("content-type") or "audio/wav").split(";")[0].strip() or "audio/wav"
    return media_type, resp.content


async def _synthesize_minimax(text: str) -> tuple[str, bytes] | None:
    """TTS dự phòng: MiniMax → (media_type, bytes MP3). None nếu chưa cấu hình/lỗi."""
    settings = get_settings()
    if not settings.minimax_api_key:
        return None

    url = _MINIMAX_URL
    if settings.minimax_group_id:
        url = f"{_MINIMAX_URL}?GroupId={settings.minimax_group_id}"

    payload = {
        "model": "speech-02-turbo",
        "text": text,
        "stream": False,
        "language_boost": "Vietnamese",
        "voice_setting": {"voice_id": "female-tianmei", "speed": 1.0, "vol": 1.0, "pitch": 0},
        "audio_setting": {"sample_rate": 32000, "bitrate": 128000, "format": "mp3", "channel": 1},
    }
    headers = {
        "Authorization": f"Bearer {settings.minimax_api_key}",
        "Content-Type": "application/json",
    }
    try:
        resp = await _get_client().post(url, json=payload, headers=headers)
    except httpx.HTTPError as exc:
        logger.error("MiniMax TTS không với tới được: %s", exc)
        return None
    if resp.status_code >= 300:
        logger.error("MiniMax TTS lỗi HTTP %s: %s", resp.status_code, resp.text[:300])
        return None

    data = resp.json()
    audio_hex = (data.get("data") or {}).get("audio")
    if not audio_hex:
        logger.error("MiniMax TTS không có audio: %s", data.get("base_resp") or {})
        return None
    try:
        return "audio/mpeg", bytes.fromhex(audio_hex)  # data.audio là chuỗi hex
    except ValueError as exc:
        logger.error("Không decode được hex audio MiniMax: %s", exc)
        return None


class TTSRequest(BaseModel):
    text: str = Field(min_length=1)


@router.post("/api/tts")
async def tts(body: TTSRequest):
    text = body.text.strip()[:_MAX_CHARS]  # giới hạn ≤ 600 ký tự
    if not text:
        raise HTTPException(status_code=422, detail="Nội dung rỗng.")

    cache_key = hashlib.sha256(text.encode("utf-8")).hexdigest()
    cached = _cache_get(cache_key)
    if cached is not None:
        media_type, audio = cached
        return Response(content=audio, media_type=media_type, headers={"X-TTS-Cache": "hit"})

    # PTIT (chính) → MiniMax (dự phòng)
    source = "ptit"
    result = await _synthesize_ptit(text)
    if result is None:
        source = "minimax"
        result = await _synthesize_minimax(text)
    if result is None:
        raise HTTPException(status_code=502, detail="Không tạo được audio (PTIT và MiniMax đều lỗi).")

    media_type, audio = result
    _cache_put(cache_key, media_type, audio)
    return Response(
        content=audio,
        media_type=media_type,
        headers={"X-TTS-Cache": "miss", "X-TTS-Source": source},
    )
