"""Trợ lý điều hành ĐỀ XUẤT sửa dữ liệu — không tự lưu, và chỉ trong giới hạn cho phép."""

import pytest

from app.tools import admin_actions as aa
from app.tools.products import load_catalog


def setup_module():
    load_catalog(force=True)


async def _propose(**kwargs):
    queue: list[dict] = []
    token = aa.set_proposal_queue(queue)
    try:
        note = await aa.propose_product_update.ainvoke(kwargs)
    finally:
        aa.reset_proposal_queue(token)
    return note, queue


async def test_de_xuat_doi_gia_kem_gia_hien_tai():
    note, queue = await _propose(slug="ong-nhua-pvc-d21", changes={"price": 30000}, reason="giá vật tư tăng")
    assert len(queue) == 1
    p = queue[0]
    assert p["kind"] == "product-update"
    assert p["changes"] == {"price": 30000}
    # Phải kèm giá trị TRƯỚC để admin so sánh được ngay trên màn hình
    assert p["before"]["price"] == "25.000đ"
    assert p["reason"] == "giá vật tư tăng"
    assert "duyệt" in note.lower()


async def test_khong_tim_thay_thi_khong_de_xuat():
    note, queue = await _propose(slug="khong-co-mat-hang-nay", changes={"price": 1})
    assert queue == []
    assert "Không tìm thấy" in note


@pytest.mark.parametrize("field", ["slug", "categoryId", "images", "id", "name"])
async def test_chan_truong_ngoai_danh_sach(field):
    """Slug/danh mục/ảnh đụng tới quan hệ dữ liệu → để admin sửa trong form."""
    note, queue = await _propose(slug="ong-nhua-pvc-d21", changes={field: "x"})
    assert queue == []
    assert "Không sửa được qua trợ lý" in note


@pytest.mark.parametrize("gia", ["nhiều", None, -5])
async def test_gia_khong_hop_le(gia):
    note, queue = await _propose(slug="ong-nhua-pvc-d21", changes={"price": gia})
    assert queue == []
    assert "phải là số" in note or "không thể âm" in note


async def test_trang_thai_phai_dung_bo():
    note, queue = await _propose(slug="ong-nhua-pvc-d21", changes={"status": "XOA_HET"})
    assert queue == []
    assert "Trạng thái phải" in note
    note2, queue2 = await _propose(slug="ong-nhua-pvc-d21", changes={"status": "draft"})
    assert queue2[0]["changes"]["status"] == "DRAFT"  # chấp nhận chữ thường


async def test_khong_neu_thay_doi_nao():
    note, queue = await _propose(slug="ong-nhua-pvc-d21", changes={})
    assert queue == []
    assert "Chưa nêu thay đổi" in note


async def test_mo_ta_rong_bi_chan():
    note, queue = await _propose(slug="ong-nhua-pvc-d21", changes={"description": "   "})
    assert queue == []
    assert "đang để trống" in note
