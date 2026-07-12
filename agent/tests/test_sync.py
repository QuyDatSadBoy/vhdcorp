"""Đồng bộ sản phẩm: mapping field + lọc PUBLISHED + strip HTML (thuần, không mạng)."""

from app.services.product_sync import map_product, map_published, strip_html


def test_strip_html():
    assert strip_html("<p>Ống <b>nhựa</b>&nbsp;PVC</p>") == "Ống nhựa PVC"
    assert strip_html("") == ""


def test_map_product_full_fields():
    record = {
        "id": 1,
        "slug": "ong-nhua-pvc-d21",
        "name": "Ống nhựa PVC D21",
        "price": "25000",  # BE trả price dạng chuỗi
        "stock": 500,
        "description": "<p>Mô tả sản phẩm</p>",
        "category": {"name": "Nhựa PVC", "slug": "nhua-pvc"},
        "images": ["https://img/a.jpg", "https://img/b.jpg"],
        "status": "PUBLISHED",
    }
    p = map_product(record)
    assert p["price"] == 25000 and isinstance(p["price"], int)
    assert p["stock"] == 500
    assert p["description"] == "Mô tả sản phẩm"
    assert p["category"] == {"name": "Nhựa PVC", "slug": "nhua-pvc"}
    assert p["images"] == ["https://img/a.jpg", "https://img/b.jpg"]
    assert p["image"] == "https://img/a.jpg"  # ảnh đầu làm ảnh đại diện
    assert p["status"] == "PUBLISHED"
    assert p["url"] == "/products/ong-nhua-pvc-d21"


def test_map_product_no_images_null_price():
    p = map_product(
        {"id": 3, "slug": "c", "name": "C", "price": None, "status": "PUBLISHED",
         "category": {}, "images": []}
    )
    assert p["image"] == ""
    assert p["images"] == []
    assert p["price"] is None


def test_map_published_filters_non_published():
    records = [
        {"id": 1, "slug": "a", "name": "A", "price": "1", "status": "PUBLISHED",
         "category": {}, "images": []},
        {"id": 2, "slug": "b", "name": "B", "price": "2", "status": "DRAFT",
         "category": {}, "images": []},
    ]
    out = map_published(records)
    assert len(out) == 1
    assert out[0]["slug"] == "a"
