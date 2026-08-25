"""web_fetch: đọc trang theo link — và CHẶN mọi đường dẫn vào mạng nội bộ."""

import pytest

from app.tools import web_fetch as wf


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1:8080/api",          # loopback
        "http://localhost:3001/",             # loopback theo tên
        "http://169.254.169.254/latest/meta-data/",  # metadata máy chủ đám mây
        "http://10.0.0.5/admin",              # mạng riêng
        "http://192.168.1.1/",                # mạng riêng
        "http://[::1]:8001/",                 # loopback IPv6
    ],
)
async def test_chan_dia_chi_noi_bo(url):
    """Dán link nội bộ vào khung chat không được biến trợ lý thành công cụ dò mạng."""
    out = await wf.web_fetch.ainvoke({"url": url})
    assert "Không đọc được" in out or "nội bộ" in out


@pytest.mark.parametrize("url", ["file:///etc/passwd", "ftp://ai.do/x", "gopher://a/b", "javascript:alert(1)"])
async def test_chi_nhan_http(url):
    out = await wf.web_fetch.ainvoke({"url": url})
    assert "http/https" in out


async def test_url_rong():
    assert "Chưa có địa chỉ" in await wf.web_fetch.ainvoke({"url": "  "})


async def test_ten_mien_khong_ton_tai():
    out = await wf.web_fetch.ainvoke({"url": "http://khong-ton-tai-that-su-12345.invalid/"})
    assert "không phân giải được" in out


def test_boc_chu_tu_html():
    html = "<html><head><style>a{}</style></head><body><script>x=1</script><h1>Tiêu đề</h1><p>Nội dung.</p></body></html>"
    text = wf._to_text(html)
    assert "Tiêu đề" in text and "Nội dung." in text
    assert "x=1" not in text and "a{}" not in text


def test_kiem_dia_chi_cong_cong():
    ok, _ = wf._check_url("https://example.com/")
    assert ok is True
