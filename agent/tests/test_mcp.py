"""MCP (§9.6): FastMCP publish 3 tool catalog."""

from app.mcp_server import build_mcp, get_product, search_products


async def test_mcp_lists_three_tools():
    mcp = build_mcp()
    tools = await mcp.list_tools()
    names = {t.name for t in tools}
    assert names == {"search_products", "get_product", "create_contact"}


def test_mcp_search_products_returns_dicts():
    from app.tools.products import load_catalog

    load_catalog(force=True)
    results = search_products("ống nhựa")
    assert results and isinstance(results[0], dict)
    assert "slug" in results[0] and "price" in results[0]


def test_mcp_get_product_by_slug():
    from app.tools.products import load_catalog

    load_catalog(force=True)
    p = get_product("ong-nhua-pvc-d21")
    assert p["name"] == "Ống nhựa PVC D21"
    assert p["price"] == 25000
