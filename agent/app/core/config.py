"""Cấu hình service qua pydantic-settings (đọc agent/.env)."""

import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

AGENT_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(AGENT_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    google_api_key: str = ""
    # Nhiều key Gemini (phân tách bằng dấu phẩy) — fallback cho nhau: key hết quota/
    # bị thu hồi thì tự chuyển key khác. Rỗng thì dùng google_api_key.
    google_api_keys: str = ""
    # 2 model: chính + dự phòng (fallback cho nhau — model chính lỗi thì tự chuyển).
    agent_model: str = "gemini-3-flash-preview"
    fallback_model: str = "gemini-3.1-flash-lite"
    tavily_api_keys: str = ""  # danh sách key, phân tách bằng dấu phẩy
    be_api_url: str = "http://localhost:8080/api"
    port: int = 8001
    cors_origins: str = "http://localhost:3001"
    short_term_limit: int = 8
    max_input_chars: int = 2000

    # URL công khai của service (dùng cho Agent Card A2A)
    public_base_url: str = "http://localhost:8001"

    # LangSmith tracing (langchain đọc qua os.environ — xem configure_tracing)
    langsmith_tracing: bool = False
    langsmith_api_key: str = ""
    langsmith_project: str = "vhdcorp-agent"
    langsmith_endpoint: str = "https://api.smith.langchain.com"

    # TTS chính: PTIT holobox (WAV, nội bộ, không tốn tiền). Rỗng = bỏ qua, chỉ dùng MiniMax.
    ptit_tts_url: str = "https://aitools.ptit.edu.vn/holobox/synthesize"
    # MiniMax TTS — DỰ PHÒNG khi PTIT lỗi (MP3, tốn phí)
    minimax_api_key: str = ""
    minimax_group_id: str = ""

    # Bí mật bảo vệ endpoint admin (resync sản phẩm / đọc email / quản lý AI).
    # MẶC ĐỊNH RỖNG = fail-closed: chưa đặt trong .env thì mọi request admin bị từ
    # chối (KHÔNG dùng giá trị mặc định đoán được như trước → tránh lộ toàn bộ admin).
    resync_secret: str = ""
    admin_secret: str = ""

    # Gmail IMAP (đọc hộp thư admin — chỉ dùng qua endpoint admin, KHÔNG expose cho chat)
    gmail_imap_user: str = ""
    gmail_imap_password: str = ""
    gmail_imap_host: str = "imap.gmail.com"

    chat_db_path: str = str(AGENT_DIR / "data" / "chat.db")
    checkpoint_db_path: str = str(AGENT_DIR / "data" / "checkpoints.sqlite")
    products_json_path: str = str(AGENT_DIR / "data" / "products.json")
    # Đọc TRỰC TIẾP PostgreSQL của BE (real-time tuyệt đối) — rỗng thì fallback products.json
    catalog_database_url: str = ""
    knowledge_md_path: str = str(AGENT_DIR / "data" / "knowledge.md")

    @property
    def google_key_list(self) -> list[str]:
        """Danh sách key Gemini (thứ tự ưu tiên). Ưu tiên google_api_keys, fallback google_api_key."""
        keys = [k.strip() for k in self.google_api_keys.split(",") if k.strip()]
        if not keys and self.google_api_key.strip():
            keys = [self.google_api_key.strip()]
        # bỏ trùng, giữ thứ tự
        return list(dict.fromkeys(keys))

    @property
    def tavily_keys(self) -> list[str]:
        return [k.strip() for k in self.tavily_api_keys.split(",") if k.strip()]

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


def configure_tracing(settings: "Settings") -> bool:
    """Bật LangSmith tracing bằng cách set os.environ để langchain tự trace.

    pydantic-settings đọc .env vào object Settings, nhưng langchain/langsmith
    lại đọc trực tiếp từ os.environ → phải export thủ công tại đây.
    Trả về True nếu tracing được bật."""
    if not settings.langsmith_tracing or not settings.langsmith_api_key:
        return False
    os.environ["LANGSMITH_TRACING"] = "true"
    os.environ["LANGCHAIN_TRACING_V2"] = "true"  # tương thích ngược
    os.environ["LANGSMITH_API_KEY"] = settings.langsmith_api_key
    os.environ["LANGCHAIN_API_KEY"] = settings.langsmith_api_key
    os.environ["LANGSMITH_PROJECT"] = settings.langsmith_project
    os.environ["LANGCHAIN_PROJECT"] = settings.langsmith_project
    os.environ["LANGSMITH_ENDPOINT"] = settings.langsmith_endpoint
    return True


@lru_cache
def get_settings() -> Settings:
    return Settings()
