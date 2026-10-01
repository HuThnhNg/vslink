"""Quy tac chuyen doi giua cau tieng Viet va day gloss NNKH (400 nhan VSL400).

Hai chieu:
  cau_sang_gloss("Em muốn đi công viên.")  -> ["Em", "Công viên", "Đi", "Muốn"]
  gloss_sang_cau(["Em", "Công viên", "Đi", "Muốn"]) -> "Em muốn đi công viên."

Quy tac trat tu (xu huong cua NNKH, theo Hoa Nguyen 2026 ve NNKH TP.HCM; Woodward 2011 luu y
NNKH Viet Nam con cho phep trat tu khac):
  1. Tieng Viet  : [thoi gian] Chu ngu [tinh thai] Dong tu [Tan ngu / Noi chon]
     NNKH (gloss): [thoi gian] Chu ngu [Tan ngu / Noi chon] Dong tu [tinh thai]
  2. Phu dinh / tinh thai (muon, can, nen, khong nen...) dung SAU dong tu trong NNKH.
  3. Hu tu (la, o, cua, rat, da, dang, se, troi...) khong co ky hieu rieng -> bo khi sang gloss,
     them lai khi sang cau.
Cach chuyen nay la QUY TAC GAN DUNG de tao du lieu, khong thay duoc nguoi biet NNKH duyet.
"""
from __future__ import annotations

import re
import unicodedata

from tu_loai import DANH_TU, LOAI, NHAN, chu

# ---------------------------------------------------------------------------
# Tach tu: khop dai nhat tren am tiet
# ---------------------------------------------------------------------------
HU_TU = {
    "là", "ở", "của", "rất", "lắm", "quá", "đã", "đang", "sẽ", "trời", "và", "với", "vào",
    "thì", "mà", "nhé", "ạ", "cũng", "hay", "này", "đó", "kia", "một", "những", "các", "cái",
    "con", "quả", "trái", "xe", "màu", "người", "chiếc", "bị", "được", "đến", "tới", "lúc",
    "hôm", "nay", "nhiều", "ít", "hơn", "nhất", "chơi", "để", "đi_làm",
}

_BIET_DANH: dict[str, str] = {}


def _them(be_mat: str, nhan: str) -> None:
    _BIET_DANH.setdefault(be_mat.lower(), nhan)


for _n in NHAN:
    _them(chu(_n), _n)
for _n in NHAN:
    s = chu(_n).lower()
    if s.startswith("quả ") and LOAI[_n] == "mon_an":
        _them(s[4:], _n)
        _them("trái " + s[4:], _n)
    if s.startswith("con ") and LOAI[_n] == "dong_vat":
        _them(s[4:], _n)
    if s.startswith("cái "):
        _them(s[4:], _n)
    if s.startswith("màu "):
        _them(s[4:], _n)
for _a, _n in {
    "tết": "Tết Âm lịch", "làm": "Làm việc", "ngon": "Ngon miệng", "ti vi": "Tivi",
    "xe ô tô": "Ô tô", "máy lạnh": "Máy điều hòa", "rửa bát": "Rửa chén", "trường": "Trường học",
    "đại học": "Trường Đại học", "cao đẳng": "Trường Cao đẳng", "có gió": "Gió",
    "sạch": "Sạch sẽ", "mát": "Mát mẻ", "thể thao": "Thể dục (thể thao)", "hay": "Hay (khen)",
    "tắm": "Tắm rửa", "nghỉ": "Nghỉ ngơi", "dậy": "Thức dậy", "chụp ảnh": "Chụp hình",
    "giúp": "Giúp đỡ", "yêu": "Yêu thương", "bơi": "Bơi lội", "lười": "Lười biếng",
    "thấp": "Thấp (đồ vật)", "cơm": "Gạo",
}.items():
    _them(_a, _n)
# "cam" dung mot minh la qua cam; mau phai noi "mau cam"
_BIET_DANH["cam"] = "Quả cam"

# Nhan co hai nghia theo chu ngu (nguoi / vat)
_HAI_NGHIA = {
    "cao": ("Cao (người)", "Cao (đồ vật)"),
    "đẹp": ("Đẹp (người)", "Đẹp (vật)"),
    "xấu": ("Xấu (người)", "Xấu (vật)"),
}
_DAI_NHAT = max(len(k.split()) for k in _BIET_DANH)


def _chuan(s: str) -> str:
    s = unicodedata.normalize("NFC", s).lower()
    return re.sub(r"[.,!?;:\"“”()…]", " ", s)


def tach_tu(cau: str) -> list[str]:
    """Cau tieng Viet -> danh sach nhan (bo hu tu, giu thu tu)."""
    am = _chuan(cau).split()
    ra: list[str] = []
    i = 0
    while i < len(am):
        khop = None
        for n in range(min(_DAI_NHAT, len(am) - i), 0, -1):
            cum = " ".join(am[i : i + n])
            if cum in _HAI_NGHIA:
                nguoi = any(LOAI[t] in ("nguoi", "nghe") for t in ra[-2:])
                khop = (_HAI_NGHIA[cum][0 if nguoi else 1], n)
                break
            if cum in _BIET_DANH:
                nhan = _BIET_DANH[cum]
                # "cho" sau mot dong tu la gioi tu ("kham benh cho ong") -> bo
                if nhan == "Cho" and any(LOAI[t] == "dong_tu" for t in ra):
                    khop = (None, n)
                # "hay" giua cau thuong la lien tu "hoac"
                elif cum == "hay" and ra and LOAI[ra[-1]] in DANH_TU:
                    khop = (None, n)
                else:
                    khop = (nhan, n)
                break
        if khop is None:
            i += 1  # hu tu / tu ngoai 400 nhan
            continue
        if khop[0] is not None:
            ra.append(khop[0])
        i += khop[1]
    return ra


# ---------------------------------------------------------------------------
# Cau -> gloss (tao du lieu)
# ---------------------------------------------------------------------------
def _cum_dong_tu(ds: list[str]) -> tuple[int, int] | None:
    """Vi tri [bat dau, ket thuc) cua cum dong tu chinh. Tinh thai khong theo sau boi dong tu
    ("Em thich kem") duoc coi la dong tu chinh."""
    for i, t in enumerate(ds):
        if LOAI[t] == "dong_tu":
            j = i
            while j + 1 < len(ds) and LOAI[ds[j + 1]] == "dong_tu":
                j += 1
            return i, j + 1
    for i, t in enumerate(ds):
        if LOAI[t] == "tinh_thai":
            return i, i + 1
    return None


def sap_xep_nnkh(ds: list[str]) -> list[str]:
    """Day nhan theo trat tu tieng Viet -> trat tu NNKH."""
    tg = [t for t in ds if LOAI[t] == "thoi_gian"]
    con = [t for t in ds if LOAI[t] != "thoi_gian"]
    vt = _cum_dong_tu(con)
    if vt is None:
        return tg + con
    a, b = vt
    k = a
    while k > 0 and LOAI[con[k - 1]] == "tinh_thai":
        k -= 1
    chu_ngu, tinh_thai, dong_tu, sau = con[:k], con[k:a], con[a:b], con[b:]
    return tg + chu_ngu + sau + dong_tu + tinh_thai


def cau_sang_gloss(cau: str) -> list[str]:
    return sap_xep_nnkh(tach_tu(cau))


# ---------------------------------------------------------------------------
# Gloss -> cau bang quy tac (moc so sanh "khong LLM")
# ---------------------------------------------------------------------------
def _viet_hoa(s: str) -> str:
    s = re.sub(r"\s+", " ", s).strip()
    return (s[:1].upper() + s[1:] + ".") if s else ""


def noi_tho(gloss: list[str]) -> str:
    """Muc 0: noi nguyen thu tu ky, khong doi gi."""
    return _viet_hoa(" ".join(chu(t) for t in gloss))


def gloss_sang_cau(gloss: list[str]) -> str:
    """Muc 0+: dao nguoc quy tac NNKH -> tieng Viet (khong dung LLM)."""
    ds = [t for t in gloss if t in LOAI]
    tg = [t for t in ds if LOAI[t] == "thoi_gian"]
    con = [t for t in ds if LOAI[t] != "thoi_gian"]
    # tim cum dong tu CUOI cung (NNKH: dong tu cuoi cau)
    vt = None
    for i in range(len(con) - 1, -1, -1):
        if LOAI[con[i]] == "dong_tu":
            j = i
            while j - 1 >= 0 and LOAI[con[j - 1]] == "dong_tu":
                j -= 1
            vt = (j, i + 1)
            break
    phan: list[str] = [chu(t) for t in tg]
    if vt is None:
        # khong co dong tu: cau tinh tu / "la" / thoi tiet / tinh thai lam dong tu
        tt_cuoi = [t for t in con if LOAI[t] == "tinh_thai"]
        if tt_cuoi and con[-1] in tt_cuoi and len(con) >= 2:
            # "Em | Kem | Thich" -> "Em thich kem"
            chu_ngu, tan_ngu = con[:1], con[1:-1]
            phan += [chu(t) for t in chu_ngu] + [chu(con[-1])] + [chu(t) for t in tan_ngu]
            return _viet_hoa(" ".join(phan))
        for i, t in enumerate(con):
            if i == 0 and LOAI[t] == "thoi_tiet" and t in ("Mưa", "Nắng"):
                phan.append("trời")
            if i == 0 and t == "Gió":
                phan.append("trời có")
            if i > 0 and LOAI[t] == "nghe" and LOAI[con[i - 1]] in ("nguoi", "nghe"):
                phan.append("là")
            phan.append(chu(t))
        return _viet_hoa(" ".join(phan))
    a, b = vt
    truoc, dong_tu, sau = con[:a], con[a:b], con[b:]
    tinh_thai = [t for t in sau if LOAI[t] == "tinh_thai"]
    sau = [t for t in sau if LOAI[t] != "tinh_thai"]
    # chu ngu = danh tu dau tien (nguoi / nghe / dong vat), con lai la tan ngu
    if truoc and LOAI[truoc[0]] in ("nguoi", "nghe", "dong_vat"):
        chu_ngu, tan_ngu = truoc[:1], truoc[1:]
    else:
        chu_ngu, tan_ngu = [], truoc
    phan += [chu(t) for t in chu_ngu] + [chu(t) for t in tinh_thai] + [chu(t) for t in dong_tu]
    for t in tan_ngu + sau:
        if LOAI[t] == "noi_chon" and dong_tu[-1] != "Đi":
            phan.append("ở")
        phan.append(chu(t))
    return _viet_hoa(" ".join(phan))


if __name__ == "__main__":
    import sys

    for c in sys.argv[1:] or ["Em muốn đi công viên.", "Bác sĩ khám bệnh cho ông nội."]:
        g = cau_sang_gloss(c)
        print(f"{c}\n  gloss : {' | '.join(g)}\n  ve lai: {gloss_sang_cau(g)}")
