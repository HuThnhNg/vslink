"""Tao du lieu huan luyen / kiem dinh cho buoc "ghep cau" — buoc A + B + C cua pipeline.

  python tao_du_lieu.py                      # 8000 cau, nhieu gia lap
  python tao_du_lieu.py --du-doan du-lieu/du_doan_test.jsonl   # nhieu THAT tu notebook Kaggle

Ghi ra du-lieu/sinh/{train,val}.jsonl, moi dong:
  {"id", "khung", "gloss": [...nhan dung theo trat tu NNKH...],
   "vi_tri": [[[nhan, p], ...top-3], ...], "dau_vao": "1. Mẹ 0.82 | ...", "cau": "Mẹ nấu phở."}
Thu muc du-lieu/sinh/ khong dua len git (tao lai duoc y het nho hat_giong).
"""
from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

from nhieu import dinh_dang, lam_nhieu, nguon_mac_dinh
from sinh_cau import sinh

THU_MUC = Path(__file__).parent / "du-lieu"


def tao_ban_ghi(x: dict, i: int, nguon, r: random.Random, k: int, p_chen: float) -> dict:
    vi_tri = lam_nhieu(x["gloss"], nguon, k=k, p_chen=p_chen, r=r)
    return {"id": i, "khung": x.get("khung", ""), "gloss": x["gloss"],
            "vi_tri": [[list(u) for u in uv] for uv in vi_tri],
            "dau_vao": dinh_dang(vi_tri), "cau": x["cau"]}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--so-cau", type=int, default=8000)
    ap.add_argument("--ti-le-val", type=float, default=0.05)
    ap.add_argument("--du-doan", default=str(THU_MUC / "du_doan_test.jsonl"),
                    help="tep top-5 that tu notebook; khong co thi dung gia lap")
    ap.add_argument("--k", type=int, default=3, help="so ung vien moi vi tri")
    ap.add_argument("--p-chen", type=float, default=0.03, help="xac suat chen doan ky thua")
    ap.add_argument("--hat-giong", type=int, default=0)
    ap.add_argument("--ra", default=str(THU_MUC / "sinh"))
    a = ap.parse_args()

    # bo cau trung voi tap kiem tra (tranh ro ri)
    kiem_tra = THU_MUC / "tap_kiem_tra.jsonl"
    cau_kt = {json.loads(d)["cau"] for d in open(kiem_tra, encoding="utf-8")} if kiem_tra.exists() else set()
    ds = [x for x in sinh(a.so_cau + len(cau_kt), a.hat_giong) if x["cau"] not in cau_kt][: a.so_cau]

    nguon = nguon_mac_dinh(a.du_doan, a.hat_giong)
    print(f"Nguon nhieu: {type(nguon).__name__}")
    r = random.Random(a.hat_giong)
    ban_ghi = [tao_ban_ghi(x, i, nguon, r, a.k, a.p_chen) for i, x in enumerate(ds)]
    r.shuffle(ban_ghi)
    n_val = int(len(ban_ghi) * a.ti_le_val)
    ra = Path(a.ra)
    ra.mkdir(parents=True, exist_ok=True)
    for ten, phan in (("val", ban_ghi[:n_val]), ("train", ban_ghi[n_val:])):
        with open(ra / f"{ten}.jsonl", "w", encoding="utf-8") as f:
            for b in phan:
                f.write(json.dumps(b, ensure_ascii=False) + "\n")
        print(f"  {ten}: {len(phan)} cap -> {ra / f'{ten}.jsonl'}")
    sai = sum(1 for b in ban_ghi if [u[0][0] for u in b["vi_tri"]] != b["gloss"])
    print(f"  {sai / len(ban_ghi):.1%} cau co it nhat mot vi tri top-1 sai (LLM phai sua)")


if __name__ == "__main__":
    main()
