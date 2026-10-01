"""Them nhieu nhan dang vao day gloss — buoc C cua pipeline (y tuong N-best cua HyPoradise).

Moi gloss dung duoc thay bang top-k ung vien kem xac suat, GIONG nhu mo hinh nhan dang that
tra ve tren trang Dich. Hai nguon:

1. DuDoanThat — tu tep du_doan_test.jsonl xuat tu notebook Kaggle (xem xuat_top5_kaggle.py):
   moi dong {"nhan": "Phở", "top": [["Phở", 0.55], ["Bún", 0.30], ...]} la MOT video kiem tra
   VSL400. Moi lan can nhieu cho gloss "Phở", lay ngau nhien mot lan du doan that cua tu do
   -> mo hinh LLM hoc dung kieu nham that (Nấu <-> Nướng...).

2. GiaLap — khi chua co tep tren: gia lap theo so lieu da do cua mo hinh (README):
   top-1 89,51 %, top-5 97,81 %. Tu nham uu tien cung chu de (mo hinh hay nham tu giong nhau).
   Day chi la tam thoi; ket qua bao cao nen dung nguon 1.
"""
from __future__ import annotations

import json
import random
from collections import defaultdict
from pathlib import Path

from tu_loai import CHU_DE, LOAI, NHAN

TOP1, TOP5 = 0.8951, 0.9781

UngVien = list[tuple[str, float]]  # [(nhan, xac suat)] giam dan


class GiaLap:
    def __init__(self, hat_giong: int = 0, top1: float = TOP1, top5: float = TOP5):
        self.r = random.Random(hat_giong)
        self.top1, self.top5 = top1, top5
        self.theo_chu_de: dict[str, list[str]] = defaultdict(list)
        for t in NHAN:
            self.theo_chu_de[CHU_DE.get(t, "khac")].append(t)

    def _tu_nham(self, dung: str, so: int) -> list[str]:
        cung = [t for t in self.theo_chu_de[CHU_DE.get(dung, "khac")] if t != dung]
        ra: list[str] = []
        while len(ra) < so:
            nguon = cung if cung and self.r.random() < 0.7 else NHAN
            t = self.r.choice(nguon)
            if t != dung and t not in ra:
                ra.append(t)
        return ra

    def du_doan(self, dung: str, k: int = 5) -> UngVien:
        u = self.r.random()
        if u < self.top1:
            hang = 0
        elif u < self.top5:
            hang = self.r.choices([1, 2, 3, 4], [0.55, 0.22, 0.13, 0.10])[0]
        else:
            hang = None  # tu dung khong co trong top-5
        ds = self._tu_nham(dung, 5)
        if hang is not None:
            ds.insert(hang, dung)
        ds = ds[:5]
        # xac suat: Dirichlet, top-1 dao dong rong (luc chac luc phan van) nhu ky that
        g = [self.r.gammavariate(a, 1) for a in (2.2, 0.9, 0.5, 0.3, 0.2, 1.2)]
        tong = sum(g)
        p = sorted((x / tong for x in g[:5]), reverse=True)
        return [(t, round(x, 3)) for t, x in zip(ds, p)][:k]


class DuDoanThat:
    def __init__(self, tep: str | Path, hat_giong: int = 0):
        self.r = random.Random(hat_giong)
        self.kho: dict[str, list[UngVien]] = defaultdict(list)
        for dong in open(tep, encoding="utf-8"):
            if dong.strip():
                d = json.loads(dong)
                self.kho[d["nhan"]].append([(t, float(p)) for t, p in d["top"]])
        thieu = [t for t in NHAN if t not in self.kho]
        self.du_phong = GiaLap(hat_giong) if thieu else None
        if thieu:
            print(f"[nhieu] {len(thieu)} nhan khong co du doan that -> dung gia lap cho cac nhan do")

    def du_doan(self, dung: str, k: int = 5) -> UngVien:
        if dung not in self.kho:
            return self.du_phong.du_doan(dung, k)  # type: ignore[union-attr]
        return [(t, round(p, 3)) for t, p in self.r.choice(self.kho[dung])[:k]]


def lam_nhieu(gloss: list[str], nguon, k: int = 3, p_chen: float = 0.0,
              r: random.Random | None = None) -> list[UngVien]:
    """Day gloss dung -> day vi tri, moi vi tri la top-k ung vien.
    p_chen: xac suat chen mot doan "ky thua" (may cat doan nham), xac suat thap."""
    r = r or random.Random(0)
    ra = [nguon.du_doan(t, k) for t in gloss]
    if p_chen and r.random() < p_chen:
        thua = r.choice(NHAN)
        uv = nguon.du_doan(thua, k)
        uv = [(t, round(p * 0.5, 3)) for t, p in uv]  # doan thua thuong it chac
        ra.insert(r.randrange(len(ra) + 1), uv)
    return ra


def dinh_dang(vi_tri: list[UngVien]) -> str:
    """Dinh dang dau vao CHUNG cho prompt va fine-tune (moi vi tri mot dong):
    1. Mẹ 0.82 | Con mèo 0.05 | Mập 0.03"""
    return "\n".join(
        f"{i}. " + " | ".join(f"{t} {p:.2f}" for t, p in uv) for i, uv in enumerate(vi_tri, 1)
    )


def top1(vi_tri: list[UngVien]) -> list[str]:
    return [uv[0][0] for uv in vi_tri]


def nguon_mac_dinh(tep: str | Path | None, hat_giong: int = 0):
    if tep and Path(tep).exists():
        return DuDoanThat(tep, hat_giong)
    return GiaLap(hat_giong)


assert all(t in LOAI for t in NHAN)
