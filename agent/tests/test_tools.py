from app.tools.products import get_product_detail, load_catalog, normalize_vi, search_products


def setup_module():
    load_catalog(force=True)


def test_normalize_vi():
    assert normalize_vi("Ống nhựa PVC Đ21") == "ong nhua pvc d21"


def test_search_products_accented():
    result = search_products.invoke({"query": "ống nhựa"})
    assert "Ống nhựa PVC D21" in result
    assert "25.000" in result


def test_search_products_no_accent():
    result = search_products.invoke({"query": "ong nhua"})
    assert "Ống nhựa PVC D21" in result
    assert "25.000" in result


def test_search_products_not_found():
    result = search_products.invoke({"query": "máy bay chiến đấu"})
    assert "Không tìm thấy" in result


def test_get_product_detail_by_slug():
    result = get_product_detail.invoke({"slug_or_name": "ong-nhua-pvc-d21"})
    assert "Ống nhựa PVC D21" in result
    assert "25.000" in result
    assert "500" in result  # tồn kho


def test_get_product_detail_by_name():
    result = get_product_detail.invoke({"slug_or_name": "Nón lá làng Chuông"})
    assert "75.000" in result
