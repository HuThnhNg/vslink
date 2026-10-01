"""Kiem thu phan nghien cuu ghep cau:  cd nghien-cuu/ghep-cau && python -m pytest -q"""
from __future__ import annotations

import json
import random
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))

import chay_llm  # noqa: E402
from nhieu import GiaLap, dinh_dang, lam_nhieu  # noqa: E402
from prompt import chon_vi_du, doc_tra_loi, tin_nhan  # noqa: E402
from quy_tac import cau_sang_gloss, gloss_sang_cau, noi_tho, tach_tu  # noqa: E402
from sinh_cau import sinh  # noqa: E402
from tu_loai import LOAI, NHAN  # noqa: E402


@pytest.mark.parametrize("cau, gloss", [
    ("Mẹ nấu phở.", ["Mẹ", "Phở", "Nấu"]),
    ("Em muốn đi công viên.", ["Em", "Công viên", "Đi", "Muốn"]),
    ("Anh không nên uống rượu.", ["Anh", "Rượu", "Uống", "Không nên"]),
    ("Bố làm việc ở công ty.", ["Bố", "Công ty", "Làm việc"]),
    ("Buổi chiều trời mưa.", ["Buổi chiều", "Mưa"]),
    ("Bố là bác sĩ.", ["Bố", "Bác sĩ"]),
    ("Chị rất cao.", ["Chị", "Cao (người)"]),
    ("Cái bàn cao.", ["Cái bàn", "Cao (đồ vật)"]),
    ("Em thích ăn cam.", ["Em", "Quả cam", "Ăn", "Thích"]),
    ("Bác sĩ khám bệnh cho ông nội.", ["Bác sĩ", "Ông nội", "Khám bệnh"]),
])
def test_cau_sang_gloss(cau, gloss):
    assert cau_sang_gloss(cau) == gloss


def test_gloss_sang_cau_dao_nguoc():
    for c in ["Mẹ nấu phở.", "Em muốn đi công viên.", "Bố làm việc ở công ty.", "Bố là bác sĩ.",
              "Buổi chiều trời mưa.", "Em thích kem."]:
        assert gloss_sang_cau(cau_sang_gloss(c)) == c


def test_noi_tho_giu_thu_tu():
    assert noi_tho(["Mẹ", "Phở", "Nấu"]) == "Mẹ phở nấu."


def test_moi_nhan_mot_loai():
    assert len(LOAI) == 400 and set(LOAI) == set(NHAN)


def test_sinh_cau_nhat_quan():
    ds = sinh(500, hat_giong=3)
    assert len(ds) == 500 and len({x["cau"] for x in ds}) == 500
    for x in ds:
        assert all(t in LOAI for t in x["gloss"])
        assert sorted(x["gloss"]) == sorted(tach_tu(x["cau"]))


def test_gia_lap_khop_so_lieu_mo_hinh():
    g, n, t1, t5 = GiaLap(7), 20000, 0, 0
    for _ in range(n):
        ds = [t for t, _ in g.du_doan("Phở")]
        t1 += ds[0] == "Phở"
        t5 += "Phở" in ds
    assert abs(t1 / n - 0.8951) < 0.01 and abs(t5 / n - 0.9781) < 0.005


def test_lam_nhieu_va_dinh_dang():
    vt = lam_nhieu(["Mẹ", "Phở", "Nấu"], GiaLap(1), k=3, r=random.Random(1))
    assert len(vt) == 3 and all(len(uv) == 3 for uv in vt)
    assert all(uv[0][1] >= uv[1][1] >= uv[2][1] for uv in vt)
    s = dinh_dang(vt)
    assert s.startswith("1. ") and s.count("\n") == 2


def test_doc_tra_loi():
    assert doc_tra_loi('```json\n{"chon": ["Mẹ"], "cau": "Mẹ nấu phở."}\n```')["cau"] == "Mẹ nấu phở."
    x = doc_tra_loi("Mẹ nấu phở.")
    assert x["cau"] == "Mẹ nấu phở." and x["loi"]


def test_prompt_va_vi_du():
    kho = [{"gloss": ["Mẹ", "Phở", "Nấu"], "cau": "Mẹ nấu phở.", "dau_vao": "1. Mẹ 0.90", "khung": "a"},
           {"gloss": ["Bố", "Công ty", "Làm việc"], "cau": "Bố làm việc ở công ty.", "dau_vao": "1. Bố 0.9", "khung": "b"}]
    q = {"vi_tri": [[["Mẹ", 0.8]], [["Phở", 0.6]], [["Ăn", 0.5]]]}
    assert chon_vi_du(kho, 1, truy_van=q)[0]["cau"] == "Mẹ nấu phở."
    ms = tin_nhan("quy-tac+few", "1. Em 0.9", kho)
    assert ms[0]["role"] == "system" and "SOV" in ms[0]["content"] and len(ms) == 6
    assert "SOV" not in tin_nhan("few", "x", kho)[0]["content"]
    assert len(tin_nhan("zero", "x", kho)) == 2


def test_chay_llm_voi_he_gia(tmp_path, monkeypatch):
    """Ca vong: dau vao co nhieu -> 'LLM' -> doc JSON -> cham diem."""
    tap = [{"id": i, "cau": c, "gloss": cau_sang_gloss(c), "dang": "thu"}
           for i, c in enumerate(["Mẹ nấu phở.", "Em muốn đi công viên."])]
    (tmp_path / "tap.jsonl").write_text("\n".join(json.dumps(x, ensure_ascii=False) for x in tap), encoding="utf-8")
    monkeypatch.setattr(chay_llm, "TAP", tmp_path / "tap.jsonl")
    monkeypatch.setattr(chay_llm, "THU_MUC", tmp_path)

    dap_an = {x["cau"]: x for x in tap}

    def he_gia(ms):  # tra loi dung neu nhan ra cau, de kiem duong ong
        noi_dung = ms[-1]["content"]
        for c, x in dap_an.items():
            if all(t in noi_dung for t in x["gloss"]):
                return json.dumps({"chon": x["gloss"], "cau": c}, ensure_ascii=False)
        return "khong biet"

    monkeypatch.setattr(chay_llm, "tao_he", lambda spec, a: he_gia)
    monkeypatch.setattr(sys, "argv", ["chay_llm.py", "--he", "gia:x", "--dieu-kien", "quy-tac",
                                      "--dau-vao", "sach", "--ten", "thu"])
    chay_llm.main()
    kq = [json.loads(d) for d in open(tmp_path / "ket-qua" / "thu.jsonl", encoding="utf-8")]
    assert [x["cau_du_doan"] for x in kq] == ["Mẹ nấu phở.", "Em muốn đi công viên."]
    assert "| thu |" in (tmp_path / "ket-qua" / "tong-ket.md").read_text(encoding="utf-8")
