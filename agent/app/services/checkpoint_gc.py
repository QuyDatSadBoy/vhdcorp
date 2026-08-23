"""Dọn checkpoint của hội thoại đã cũ hoặc đã bị xoá.

LangGraph lưu toàn bộ trạng thái từng bước vào checkpoints.sqlite. Khách bỏ ngang
giữa chừng thì bản ghi vẫn nằm lại mãi — đo trên máy chủ: 101 hội thoại đã chiếm 27MB,
và file chỉ có tăng. Để lâu thì ổ đầy và mọi truy vấn chậm dần.

Xoá theo hai dấu hiệu, cả hai đều an toàn:
- thread không còn trong danh sách hội thoại (khách đã xoá, hoặc là thread A2A tạm),
- hội thoại quá cũ (mặc định 30 ngày) — người ta không quay lại nữa, mà lịch sử tin
  nhắn vẫn nằm nguyên trong chat.db nên mở lại vẫn đọc được, chỉ là trợ lý bắt đầu
  ngữ cảnh mới.
"""

from __future__ import annotations

import logging
import sqlite3
from pathlib import Path

logger = logging.getLogger(__name__)

KEEP_DAYS = 30


def collect_garbage(checkpoint_path: str, chat_db_path: str, keep_days: int = KEEP_DAYS) -> int:
    """Xoá checkpoint không còn cần. Trả về số thread đã dọn (0 nếu không có gì/lỗi)."""
    cp_file, chat_file = Path(checkpoint_path), Path(chat_db_path)
    if not cp_file.exists() or not chat_file.exists():
        return 0

    try:
        with sqlite3.connect(chat_file) as chat:
            alive = {
                row[0]
                for row in chat.execute(
                    "SELECT id FROM conversations WHERE updated_at >= datetime('now', ?)",
                    (f"-{int(keep_days)} days",),
                )
            }
    except sqlite3.Error:
        logger.exception("Không đọc được danh sách hội thoại — bỏ qua lượt dọn")
        return 0

    try:
        with sqlite3.connect(cp_file) as cp:
            # Gộp nhật ký ghi (WAL) vào tệp chính. SQLite ở chế độ WAL chỉ ghi thêm và
            # KHÔNG tự gộp khi còn kết nối mở — service chạy suốt nên tệp -wal phình mãi
            # (đo trên máy chủ: 13MB, ở máy phát triển 26MB, đều chỉ tăng). Làm việc này
            # trước cả khi có gì cần xoá, vì nó tự thân đã giải phóng chỗ.
            cp.execute("PRAGMA wal_checkpoint(TRUNCATE)")
            threads = {row[0] for row in cp.execute("SELECT DISTINCT thread_id FROM checkpoints")}
            stale = threads - alive
            if not stale:
                return 0
            # Xoá theo lô để câu lệnh không dài quá giới hạn biến của SQLite
            for i in range(0, len(stale), 500):
                batch = list(stale)[i : i + 500]
                marks = ",".join("?" * len(batch))
                cp.execute(f"DELETE FROM writes WHERE thread_id IN ({marks})", batch)
                cp.execute(f"DELETE FROM checkpoints WHERE thread_id IN ({marks})", batch)
            cp.commit()
            cp.execute("VACUUM")  # trả lại chỗ trống cho ổ đĩa, không chỉ đánh dấu trống
        logger.info("Đã dọn checkpoint của %d hội thoại cũ/đã xoá", len(stale))
        return len(stale)
    except sqlite3.Error:
        logger.exception("Dọn checkpoint lỗi — bỏ qua, lần sau thử lại")
        return 0
