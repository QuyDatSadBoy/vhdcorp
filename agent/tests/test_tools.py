"""Tool tra cứu sản phẩm: chuẩn hoá tiếng Việt, tìm kiếm, xếp hạng, chi tiết.

Dùng catalog GIẢ cố định thay vì products.json thật — catalog thật đồng bộ từ BE nên
thay đổi liên tục, test bám vào nó sẽ đỏ mỗi lần khách thêm/sửa hàng.
"""

import json

import pytest

from app.tools import products as products_mod
from app.tools.products import find_products, get_product_detail, normalize_vi, search_products

FAKE_CATALOG = [
    {
        "slug": "ong-nhua-pvc-d21",
        "name": "Ống nhựa PVC D21",
        "price": 25000,
        "stock": 500,
        "description": "Ống nhựa PVC phi 21, chịu áp lực tốt.",
        "category": {"name": "Nhựa & Cao su", "slug": "nhua-cao-su"},
    },
    {
        "slug": "tam-cao-su-cac-loai",
        "name": "Tấm cao su các loại",
        "price": None,
        "stock": 120,
        "description": "Tấm cao su kỹ thuật chống rung, chịu dầu và mài mòn, cắt theo yêu cầu.",
        "category": {"name": "Nhựa & Cao su", "slug": "nhua-cao-su"},
    },
    {
        "slug": "gioang-cao-su-dai-treo",
        "name": "Gioăng cao su đai treo",
        "price": 15000,
        "stock": 900,
        "description": "Gioăng lót đai treo ống, giảm rung và chống xước.",
        "category": {"name": "Cao su kỹ thuật", "slug": "cao-su-ky-thuat"},
    },
    {
        "slug": "bang-cuon-ong-dong",
        "name": "Băng cuốn ống đồng",
        "price": 30000,
        "stock": 60,
        "description": "Băng cuốn bảo ôn cho ống đồng điều hoà.",
        "category": {"name": "Vật tư điện lạnh", "slug": "vat-tu-dien-lanh"},
    },
    {
        "slug": "ong-dong-cac-loai",
        "name": "Ống đồng các loại",
        "price": None,
        "stock": 40,
        "description": "Ống đồng điều hoà nhiều quy cách.",
        "category": {"name": "Vật tư điện lạnh", "slug": "vat-tu-dien-lanh"},
    },
]


@pytest.fixture(autouse=True)
def _fake_catalog(tmp_path, monkeypatch):
    path = tmp_path / "products.json"
    path.write_text(json.dumps(FAKE_CATALOG, ensure_ascii=False), encoding="utf-8")
    settings = products_mod.get_settings()
    monkeypatch.setattr(settings, "products_json_path", str(path), raising=False)
    monkeypatch.setattr(products_mod, "_catalog", None, raising=False)
    products_mod.load_catalog(force=True)
    yield
    monkeypatch.setattr(products_mod, "_catalog", None, raising=False)


def test_normalize_vi():
    assert normalize_vi("Ống nhựa PVC Đ21") == "ong nhua pvc d21"


async def test_search_products_accented():
    result = await search_products.ainvoke({"query": "ống nhựa"})
    assert "Ống nhựa PVC D21" in result
    assert "25.000" in result


async def test_search_products_no_accent():
    result = await search_products.ainvoke({"query": "ong nhua"})
    assert "Ống nhựa PVC D21" in result


async def test_search_products_not_found():
    result = await search_products.ainvoke({"query": "máy bay chiến đấu"})
    assert "Không tìm thấy" in result


@pytest.mark.parametrize("query", ["máy bay chiến đấu", "bánh mì thịt nướng", "lập trình python"])
def test_khong_gợi_ý_hàng_chẳng_liên_quan(query):
    """Chống hồi quy: trước đây chỉ cần 1 từ khớp trong MÔ TẢ là sản phẩm lọt vào kết quả
    ('chiến đấu' khớp 'chịu dầu' → giới thiệu tấm cao su cho người hỏi máy bay)."""
    assert find_products(query) == []


def test_uu_tien_ten_bat_dau_bang_tu_khoa():
    """'ống đồng' phải ra 'Ống đồng các loại' trước 'Băng cuốn ống đồng'."""
    names = [p["name"] for p in find_products("ống đồng", limit=3)]
    assert names[0] == "Ống đồng các loại"
    assert "Băng cuốn ống đồng" in names


def test_bo_tu_noi_trong_cau_khach_go():
    """Khách gõ cả câu vẫn phải ra đúng hàng (từ nối không được làm loãng điểm khớp)."""
    names = [p["name"] for p in find_products("cho tôi xem tấm cao su")]
    assert "Tấm cao su các loại" in names


async def test_get_product_detail_by_slug():
    result = await get_product_detail.ainvoke({"slug_or_name": "ong-nhua-pvc-d21"})
    assert "Ống nhựa PVC D21" in result
    assert "25.000" in result
    assert "500" in result  # tồn kho


async def test_get_product_detail_by_name():
    result = await get_product_detail.ainvoke({"slug_or_name": "Gioăng cao su đai treo"})
    assert "15.000" in result
