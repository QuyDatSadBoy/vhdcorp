"""POST /api/tts — proxy MiniMax Text-to-Speech (§9.3), ẩn key khỏi FE.

MiniMax t2a_v2 trả JSON có data.audio là chuỗi HEX → decode thành bytes MP3.
Tối ưu latency: client HTTP dùng lại (bỏ TLS handshake mỗi lần) + LRU cache MP3
theo hash(text) — cùng một câu chỉ gọi MiniMax đúng 1 lần.
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

# Connection pool dùng chung — handshake TLS tới api.minimax.io chỉ trả giá 1 lần
_client: httpx.AsyncClient | None = None

# LRU cache MP3 in-memory: key = sha256(text), tối đa 64 câu (~2-4MB)
_audio_cache: OrderedDict[str, bytes] = OrderedDict()
_CACHE_MAX = 64


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=15)
    return _client


def _cache_get(key: str) -> bytes | None:
    audio = _audio_cache.get(key)
    if audio is not None:
        _audio_cache.move_to_end(key)
    return audio


def _cache_put(key: str, audio: bytes) -> None:
    _audio_cache[key] = audio
    _audio_cache.move_to_end(key)
    while len(_audio_cache) > _CACHE_MAX:
        _audio_cache.popitem(last=False)


class TTSRequest(BaseModel):
    text: str = Field(min_length=1)


@router.post("/api/tts")
async def tts(body: TTSRequest):
    settings = get_settings()
    if not settings.minimax_api_key:
        raise HTTPException(status_code=503, detail="Chưa cấu hình MINIMAX_API_KEY.")

    text = body.text.strip()[:_MAX_CHARS]  # giới hạn ≤ 600 ký tự
    if not text:
        raise HTTPException(status_code=422, detail="Nội dung rỗng.")

    cache_key = hashlib.sha256(text.encode("utf-8")).hexdigest()
    cached = _cache_get(cache_key)
    if cached is not None:
        return Response(
            content=cached, media_type="audio/mpeg", headers={"X-TTS-Cache": "hit"}
        )

    url = _MINIMAX_URL
    if settings.minimax_group_id:
        url = f"{_MINIMAX_URL}?GroupId={settings.minimax_group_id}"

    payload = {
        "model": "speech-02-turbo",
        "text": text,
        "stream": False,
        "language_boost": "Vietnamese",
        "voice_setting": {
            "voice_id": "female-tianmei",
            "speed": 1.0,
            "vol": 1.0,
            "pitch": 0,
        },
        "audio_setting": {
            "sample_rate": 32000,
            "bitrate": 128000,
            "format": "mp3",
            "channel": 1,
        },
    }
    headers = {
        "Authorization": f"Bearer {settings.minimax_api_key}",
        "Content-Type": "application/json",
    }

    resp = await _get_client().post(url, json=payload, headers=headers)

    if resp.status_code >= 300:
        logger.error("MiniMax TTS lỗi HTTP %s: %s", resp.status_code, resp.text[:300])
        raise HTTPException(status_code=502, detail="Không tạo được audio (MiniMax lỗi).")

    data = resp.json()
    audio_hex = (data.get("data") or {}).get("audio")
    if not audio_hex:
        base_resp = data.get("base_resp") or {}
        logger.error("MiniMax TTS không có audio: %s", base_resp)
        raise HTTPException(
            status_code=502,
            detail=f"MiniMax không trả audio: {base_resp.get('status_msg', 'unknown')}",
        )

    try:
        mp3_bytes = bytes.fromhex(audio_hex)  # data.audio là chuỗi hex
    except ValueError as exc:
        logger.error("Không decode được hex audio: %s", exc)
        raise HTTPException(status_code=502, detail="Audio trả về không hợp lệ.") from exc

    _cache_put(cache_key, mp3_bytes)
    return Response(
        content=mp3_bytes, media_type="audio/mpeg", headers={"X-TTS-Cache": "miss"}
    )
