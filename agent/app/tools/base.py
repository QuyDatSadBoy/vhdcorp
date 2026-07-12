"""Helper cho tools: bắt lỗi và trả string gọn cho model, không crash graph."""

import functools
import inspect
import logging

logger = logging.getLogger(__name__)


def catch_tool_errors(func):
    """Decorator: mọi exception trong tool → trả string lỗi ngắn cho model."""

    if inspect.iscoroutinefunction(func):

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as exc:  # noqa: BLE001 — tool không được crash graph
                logger.exception("Tool %s lỗi", func.__name__)
                return f"Lỗi khi chạy công cụ {func.__name__}: {exc}"

        return async_wrapper

    @functools.wraps(func)
    def sync_wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Tool %s lỗi", func.__name__)
            return f"Lỗi khi chạy công cụ {func.__name__}: {exc}"

    return sync_wrapper
