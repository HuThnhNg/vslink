"""Phan tich ket qua ghep cau: kiem dinh thong ke + loi sua tu + theo dang cau.

  python phan_tich_loi.py du-lieu/ket-qua/*_nhieu.jsonl --moc quy-tac_nhieu

1. Kiem dinh bootstrap ghep cap (Koehn 2004): lay mau lai 101 cau 1000 lan, dem ti le lan he A
   KHONG hon he moc ve chrF++ -> p. p < 0.05: khac biet co y nghia.
2. Sua loi nhan dang: voi tung vi tri co top-1 sai, LLM co chon lai dung tu khong?
3. Tu bia: nhan doc duoc tu cau du doan ma khong nam trong ung vien nao.
4. chrF++ theo dang cau.
"""
from __future__ import annotations

import argparse
import json
import random
import re
from collections import defaultdict
from pathlib import Path

import sacrebleu

from quy_tac import tach_tu

THU_MUC = Path(__file__).parent / "du-lieu"


def _n(t: str) -> str:
    return re.sub(r"\s*\(.*?\)", "", t).strip().lower()


def doc(tep: str | Path) -> dict[int, dict]:
    return {x["id"]: x for x in map(json.loads, open(tep, encoding="utf-8")) if x}


def chrf(ds: list[str], tc: list[str]) -> float:
    return sacrebleu.corpus_chrf(ds, [tc], word_order=2).score


def bootstrap(a: list[str], b: list[str], tc: list[str], lan: int = 1000, hat: int = 0) -> tuple[float, float]:
    """Tra ve (chenh lech chrF++ a - b, p mot phia: ti le mau a <= b)."""
    r = random.Random(hat)
    n = len(tc)
    thua = 0
    for _ in range(lan):
        idx = [r.randrange(n) for _ in range(n)]
        if chrf([a[i] for i in idx], [tc[i] for i in idx]) <= chrf([b[i] for i in idx], [tc[i] for i in idx]):
            thua += 1
    return chrf(a, tc) - chrf(b, tc), thua / lan


def sua_loi(kq: dict[int, dict], dau_vao: dict[int, dict]) -> dict[str, int]:
    dem: dict[str, int] = defaultdict(int)
    for i, x in dau_vao.items():
        chon = {_n(t) for t in kq[i].get("chon", [])}
        if not chon:  # he khong tra "chon" (vd ViT5): doc nhan tu cau
            chon = {_n(t) for t in tach_tu(kq[i]["cau_du_doan"])}
        for g, uv in zip(x["gloss"], x["vi_tri"]):
            ung = [t for t, _ in uv]
            dung, dau = _n(g), _n(ung[0])
            if dau == dung:
                dem["top1_dung"] += 1
                dem["top1_dung_giu"] += dung in chon
            else:
                trong = dung in {_n(t) for t in ung}
                k = "sai_co_trong_top3" if trong else "sai_ngoai_top3"
                dem[k] += 1
                if dung in chon:
                    dem[k + "_sua_dung"] += 1
                elif dau in chon:
                    dem[k + "_giu_sai"] += 1
                else:
                    dem[k + "_khac"] += 1
    return dem


def tu_bia(kq: dict[int, dict], dau_vao: dict[int, dict]) -> list[tuple[int, str, str]]:
    ra = []
    for i, x in dau_vao.items():
        ung = {_n(t) for uv in x["vi_tri"] for t, _ in uv}
        for t in tach_tu(kq[i]["cau_du_doan"]):
            if _n(t) not in ung:
                ra.append((i, t, kq[i]["cau_du_doan"]))
    return ra


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("tep", nargs="+")
    ap.add_argument("--moc", default="quy-tac_nhieu", help="ten he lam moc so sanh")
    ap.add_argument("--dau-vao", default=str(THU_MUC / "tap_kiem_tra_nhieu-gia-lap.jsonl"))
    ap.add_argument("--lan", type=int, default=1000)
    a = ap.parse_args()

    tap = doc(THU_MUC / "tap_kiem_tra.jsonl")
    dv = doc(a.dau_vao)
    ids = sorted(tap)
    tc = [tap[i]["cau"] for i in ids]
    he = {}
    for t in a.tep:
        kq = doc(t)
        if len(kq) < len(tap):  # tep rong / chay do dang -> bo qua
            print(f"(bo qua {Path(t).name}: chi co {len(kq)}/{len(tap)} cau)")
            continue
        he[Path(t).stem] = kq
    du_doan = {k: [v[i]["cau_du_doan"] for i in ids] for k, v in he.items()}
    moc = next((k for k in he if a.moc in k), None)

    print(f"## 1. chrF++ va kiem dinh bootstrap so voi moc `{moc}` ({a.lan} lan)\n")
    print("| He | chrF++ | Chenh lech | p | Y nghia (p<0,05) |\n|---|---|---|---|---|")
    for k in he:
        if k == moc:
            print(f"| {k} | {chrf(du_doan[k], tc):.2f} | moc | | |")
            continue
        d, p = bootstrap(du_doan[k], du_doan[moc], tc, a.lan) if moc else (0, 1)
        print(f"| {k} | {chrf(du_doan[k], tc):.2f} | {d:+.2f} | {p:.3f} | {'co' if p < 0.05 else 'khong'} |")

    print("\n## 2. Sua loi nhan dang (dem theo vi tri)\n")
    print("| He | top-1 dung, giu dung | Sai, dung co trong top-3: sua dung / giu sai / khac | Sai, ngoai top-3 |\n|---|---|---|---|")
    for k, v in he.items():
        d = sua_loi(v, dv)
        print(f"| {k} | {d['top1_dung_giu']}/{d['top1_dung']} | "
              f"{d['sai_co_trong_top3_sua_dung']} / {d['sai_co_trong_top3_giu_sai']} / {d['sai_co_trong_top3_khac']} "
              f"(tren {d['sai_co_trong_top3']}) | {d['sai_ngoai_top3']} |")

    print("\n## 3. Tu bia (nhan trong cau du doan khong co trong ung vien)\n")
    for k, v in he.items():
        b = tu_bia(v, dv)
        vd = "; ".join(f"#{i} “{t}” trong “{c}”" for i, t, c in b[:4])
        print(f"- {k}: {len(b)}" + (f" — vd: {vd}" if b else ""))

    print("\n## 4. chrF++ theo dang cau\n")
    dang = sorted({tap[i]["dang"] for i in ids}, key=lambda d: [tap[i]["dang"] for i in ids].index(d))
    ten = list(he)
    print("| Dang (n) | " + " | ".join(ten) + " |\n|---|" + "---|" * len(ten))
    for d in dang:
        idx = [j for j, i in enumerate(ids) if tap[i]["dang"] == d]
        cot = [f"{chrf([du_doan[k][j] for j in idx], [tc[j] for j in idx]):.1f}" for k in ten]
        print(f"| {d} ({len(idx)}) | " + " | ".join(cot) + " |")


if __name__ == "__main__":
    main()
