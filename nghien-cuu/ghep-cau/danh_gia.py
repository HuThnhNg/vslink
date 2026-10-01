"""Danh gia buoc "ghep cau".

Chi so (tinh tren cau tieng Viet du doan so voi cau tham chieu):
  chrF++  — chinh (on dinh voi cau ngan, Popovic 2017; sacrebleu)
  BLEU    — de so voi cac bai khac (sacrebleu, tokenize 13a)
  Khop    — ti le cau trung khop hoan toan (bo dau cau, viet thuong)
  F1 tu   — F1 giua tap nhan doc tu cau du doan (quy_tac.tach_tu) va gloss dung:
            do LLM co CHON DUNG TU va KHONG BIA tu hay khong, khong phu thuoc cach dien dat.

  python danh_gia.py du-lieu/ket-qua/*.jsonl
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import sacrebleu

from quy_tac import tach_tu


def _chuan(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[.,!?;:]", " ", s.lower())).strip()


def f1_tu(du_doan: str, gloss: list[str]) -> float:
    a, b = Counter(tach_tu(du_doan)), Counter(gloss)
    trung = sum((a & b).values())
    if not trung:
        return 0.0
    p, r = trung / sum(a.values()), trung / sum(b.values())
    return 2 * p * r / (p + r)


def chi_so(du_doan: list[str], tham_chieu: list[str], gloss: list[list[str]]) -> dict:
    n = len(du_doan)
    return {
        "n": n,
        "chrF++": round(sacrebleu.corpus_chrf(du_doan, [tham_chieu], word_order=2).score, 2),
        "BLEU": round(sacrebleu.corpus_bleu(du_doan, [tham_chieu]).score, 2),
        "Khop": round(100 * sum(_chuan(a) == _chuan(b) for a, b in zip(du_doan, tham_chieu)) / n, 1),
        "F1 tu": round(100 * sum(f1_tu(a, g) for a, g in zip(du_doan, gloss)) / n, 1),
    }


def danh_gia_tep(tep: str | Path, tap: str | Path) -> dict:
    """tep: ket qua {id, cau_du_doan}; tap: tap kiem tra {id, cau, gloss, dang}."""
    tc = {x["id"]: x for x in map(json.loads, open(tap, encoding="utf-8"))}
    kq = [json.loads(d) for d in open(tep, encoding="utf-8") if d.strip()]
    nhom: dict[str, list] = defaultdict(list)
    for x in kq:
        t = tc[x["id"]]
        nhom["TAT CA"].append((x["cau_du_doan"], t["cau"], t["gloss"]))
        nhom[t.get("dang", "?")].append((x["cau_du_doan"], t["cau"], t["gloss"]))
    ra = {k: chi_so(*map(list, zip(*v))) for k, v in nhom.items()}
    ra["TAT CA"]["loi_json"] = sum(1 for x in kq if x.get("loi"))
    return ra


def bang(ket_qua: dict[str, dict]) -> str:
    """{ten he thong: danh_gia_tep(...)} -> bang markdown dong TAT CA."""
    cot = ["chrF++", "BLEU", "Khop", "F1 tu"]
    dong = ["| He thong | " + " | ".join(cot) + " | Loi JSON |", "|---|" + "---|" * (len(cot) + 1)]
    for ten, kq in ket_qua.items():
        t = kq["TAT CA"]
        dong.append(f"| {ten} | " + " | ".join(str(t[c]) for c in cot) + f" | {t.get('loi_json', 0)} |")
    return "\n".join(dong)


if __name__ == "__main__":
    tap = Path(__file__).parent / "du-lieu" / "tap_kiem_tra.jsonl"
    tat_ca = {Path(t).stem: danh_gia_tep(t, tap) for t in sys.argv[1:]}
    print(bang(tat_ca))
