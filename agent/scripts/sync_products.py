"""Sync catalog thủ công: GET {BE_API_URL}/products?pageSize=100 → data/products.json.

Dùng lại logic ở app.services.product_sync (nguồn chân lý duy nhất, mapping đầy đủ field).
Chạy: uv run python scripts/sync_products.py
"""

import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

AGENT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AGENT_DIR))

from app.services.product_sync import sync_products  # noqa: E402

OUTPUT = AGENT_DIR / "data" / "products.json"


def main() -> None:
    load_dotenv(AGENT_DIR / ".env")
    be_api_url = os.environ.get("BE_API_URL", "http://localhost:8080/api")
    count = asyncio.run(sync_products(be_api_url, str(OUTPUT)))
    print(f"Đã lưu {count} sản phẩm PUBLISHED vào {OUTPUT}")


if __name__ == "__main__":
    main()
