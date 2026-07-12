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
    agent_model: str = "gemini-3-flash-preview"
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

    # MiniMax TTS
    minimax_api_key: str = ""
    minimax_group_id: str = ""

    # Bí mật bảo vệ các endpoint admin (resync sản phẩm / đọc email)
    resync_secret: str = "vhdcorp-resync"
    admin_secret: str = "vhdcorp-admin"

    # Gmail IMAP (đọc hộp thư admin — chỉ dùng qua endpoint admin, KHÔNG expose cho chat)
    gmail_imap_user: str = ""
    gmail_imap_password: str = ""
    gmail_imap_host: str = "imap.gmail.com"

    chat_db_path: str = str(AGENT_DIR / "data" / "chat.db")
    checkpoint_db_path: str = str(AGENT_DIR / "data" / "checkpoints.sqlite")
    products_json_path: str = str(AGENT_DIR / "data" / "products.json")
    knowledge_md_path: str = str(AGENT_DIR / "data" / "knowledge.md")

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
