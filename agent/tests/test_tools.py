from app.tools.products import get_product_detail, load_catalog, normalize_vi, search_products


def setup_module():
    load_catalog(force=True)


def test_normalize_vi():
    assert normalize_vi("Ống nhựa PVC Đ21") == "ong nhua pvc d21"


async def test_search_products_accented():
    result = await search_products.ainvoke({"query": "ống nhựa"})
    assert "Ống nhựa PVC D21" in result
    assert "25.000" in result


async def test_search_products_no_accent():
    result = await search_products.ainvoke({"query": "ong nhua"})
    assert "Ống nhựa PVC D21" in result
    assert "25.000" in result


async def test_search_products_not_found():
    result = await search_products.ainvoke({"query": "máy bay chiến đấu"})
    assert "Không tìm thấy" in result


async def test_get_product_detail_by_slug():
    result = await get_product_detail.ainvoke({"slug_or_name": "ong-nhua-pvc-d21"})
    assert "Ống nhựa PVC D21" in result
    assert "25.000" in result
    assert "500" in result  # tồn kho


async def test_get_product_detail_by_name():
    result = await get_product_detail.ainvoke({"slug_or_name": "Nón lá làng Chuông"})
    assert "75.000" in result
