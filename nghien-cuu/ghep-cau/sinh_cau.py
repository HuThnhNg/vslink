"""Sinh cap (cau tieng Viet, gloss NNKH) tu khung ngu nghia — buoc A + B cua pipeline.

Moi cau duoc dung tu mot khung (ai - lam gi - voi cai gi / o dau / luc nao) co rang buoc ngu
nghia (an -> mon an, uong -> do uong, kham benh -> bac si...), roi:
  - cau tieng Viet: trat tu tieng Viet + hu tu cho tu nhien ("rat", "o", "troi", "la"...)
  - gloss: chuyen bang quy_tac.cau_sang_gloss (CUNG mot quy tac voi tap kiem tra)
Cau nao quy tac doc lai khong ra dung so nhan cua khung thi bo (kiem tra cheo).

Chay thu: python sinh_cau.py 10
"""
from __future__ import annotations

import random

from quy_tac import cau_sang_gloss, tach_tu
from tu_loai import NHOM, chu

N = NHOM
MON = [t for t in N["mon_an"] if t != "Gạo"]
CHU_NGU = N["nguoi"] + ["Bác sĩ", "Y tá", "Học sinh", "Sinh viên", "Giám đốc", "Nông dân",
                        "Đầu bếp", "Ca sĩ", "Kế toán", "Thư ký", "Luật sư"]
NGUOI_NHAN = N["nguoi"] + N["nghe"]
GIO_TRONG_NGAY = ["Buổi sáng", "Buổi trưa", "Buổi chiều", "Buổi tối", "Bây giờ", "Bình minh",
                  "Hoàng hôn"]
NGAY = [t for t in N["thoi_gian"] if t.startswith(("Thứ", "Chủ nhật"))]
DIP = [t for t in N["thoi_gian"] if t.startswith(("Tháng", "Mùa", "Ngày", "Tết", "Trung", "Giáng"))]
TIM_DUOC = ["Chìa khóa", "Điện thoại", "Ba lô", "Túi xách", "Bút bi", "Bút chì", "Sách", "Vở",
            "Cục tẩy", "Thước kẻ", "Laptop", "Máy tính cầm tay", "Đồng hồ đeo tay", "Kính lúp",
            "Giày", "Dép", "Mũ", "Mũ bảo hiểm", "Kẹp tóc", "Vòng tay", "Khăn quàng cổ"]
CO_DUOC = TIM_DUOC + N["phuong_tien"][:1] + ["Xe máy", "Xe đạp", "Ô tô", "Tivi", "Tủ lạnh",
                                             "Máy giặt", "Con chó", "Con mèo", "Con gà"]

# dong tu -> (tan ngu duoc phep, chu ngu duoc phep)
CO_TAN_NGU: dict[str, tuple[list[str], list[str]]] = {
    "Ăn": (MON, CHU_NGU),
    "Uống": (N["do_uong"], CHU_NGU),
    "Nấu": (["Phở", "Bún", "Thịt", "Trứng", "Xôi", "Bánh chưng", "Bánh tét", "Mì gói"],
            CHU_NGU),
    "Nướng": (["Thịt"], CHU_NGU),
    "Nếm": (["Phở", "Bún", "Thịt", "Xôi", "Bánh xèo", "Bánh bao"], CHU_NGU),
    "Thèm": (MON + N["do_uong"], N["nguoi"]),
    "Đọc": (["Sách", "Báo cáo"], CHU_NGU),
    "Viết": (["Báo cáo"], ["Giám đốc", "Thư ký", "Kế toán", "Sinh viên", "Luật sư"] + N["nguoi"]),
    "Xem": (["Tivi", "Bóng đá", "Bóng rổ", "Bóng chuyền", "Bóng bàn", "Cầu lông", "Điền kinh",
             "Võ"], CHU_NGU),
    "Học": (["Võ", "Bơi lội", "Múa", "Chơi cờ"], N["nguoi"] + ["Học sinh", "Sinh viên"]),
    "Tìm": (TIM_DUOC, CHU_NGU),
    "Thử": (N["trang_phuc"], N["nguoi"]),
    "Gọi": (NGUOI_NHAN, CHU_NGU),
    "Giúp đỡ": (NGUOI_NHAN, CHU_NGU),
    "Yêu thương": (N["nguoi"] + N["dong_vat"], N["nguoi"]),
    "Bắt chước": (N["nguoi"], ["Em", "Cháu", "Con gái", "Con trai"]),
    "Cảm ơn": (NGUOI_NHAN, CHU_NGU),
    "Xin lỗi": (NGUOI_NHAN, CHU_NGU),
    "Ghét": (MON + N["dong_vat"], N["nguoi"]),
    "Có": (CO_DUOC, CHU_NGU),
    "Đi": (N["noi_chon"] + N["quoc_gia"] + ["Xe buýt", "Xe máy", "Xe đạp", "Taxi", "Tàu hỏa",
                                            "Máy bay", "Thuyền", "Ô tô"], CHU_NGU),
}
# dong tu khong tan ngu -> noi chon co the di kem
NOI_DONG_TU: dict[str, list[str]] = {
    "Làm việc": ["Công ty", "Ngân hàng", "Bệnh viện", "Nhà hàng", "Trường học", "Siêu thị",
                 "Nhà sách", "Quán cà phê", "Thành phố"],
    "Học": ["Trường học", "Trường Đại học", "Trường Cao đẳng", "Nhà"],
    "Làm bài tập": ["Nhà", "Trường học", "Quán cà phê", "Nhà sách"],
    "Ngủ": ["Nhà", "Nhà trọ", "Bệnh viện"],
    "Nghỉ ngơi": ["Nhà", "Công viên", "Nhà trọ"],
    "Chạy": ["Công viên", "Trường học"],
    "Chụp hình": ["Công viên", "Thành phố", "Nhà hàng", "Trường học"],
    "Hát": ["Nhà hàng", "Trường học", "Nhà", "Công viên"],
    "Nói chuyện": ["Quán cà phê", "Nhà", "Công ty", "Công viên"],
    "Thức dậy": [],
    "Tắm rửa": [],
    "Rửa mặt": [],
    "Rửa tay": [],
    "Gội đầu": [],
    "Giặt đồ": [],
    "Phơi đồ": [],
    "Rửa chén": [],
    "Cười": [],
    "Khóc": [],
    "Mua bán": ["Chợ", "Siêu thị"],
}
TINH_THAI = ["Muốn", "Cần", "Thích", "Nên", "Không nên", "Không cần"]
THOI_TIET = {"Mưa": "trời mưa", "Nắng": "trời nắng", "Gió": "trời có gió", "Lạnh": "trời lạnh",
             "Nóng": "trời nóng", "Mát mẻ": "trời mát mẻ", "Ấm": "trời ấm"}


def _hoa(s: str) -> str:
    s = " ".join(s.split())
    return s[:1].upper() + s[1:] + "."


def _tg(r: random.Random, nhom: list[str], p: float = 0.35) -> str:
    return chu(r.choice(nhom)) + " " if r.random() < p else ""


def khung_hanh_dong(r: random.Random) -> str:
    v = r.choice(list(CO_TAN_NGU))
    tan, chu_ds = CO_TAN_NGU[v]
    s, o = r.choice(chu_ds), r.choice(tan)
    tt = ""
    if v not in ("Có", "Cảm ơn", "Xin lỗi", "Ghét", "Yêu thương") and r.random() < 0.4:
        tt = chu(r.choice(TINH_THAI)) + " "
    return _hoa(f"{_tg(r, GIO_TRONG_NGAY + NGAY) if v != 'Có' else ''}{chu(s)} {tt}{chu(v)} {chu(o)}")


def khung_noi_dong_tu(r: random.Random) -> str:
    v = r.choice(list(NOI_DONG_TU))
    s = r.choice(N["nguoi"] + ["Học sinh", "Sinh viên", "Bác sĩ", "Nhân viên văn phòng"])
    tt = chu(r.choice(TINH_THAI)) + " " if r.random() < 0.3 else ""
    noi = NOI_DONG_TU[v]
    o_dau = f" ở {chu(r.choice(noi))}" if noi and r.random() < 0.6 else ""
    return _hoa(f"{_tg(r, GIO_TRONG_NGAY + NGAY, 0.45)}{chu(s)} {tt}{chu(v)}{o_dau}")


def khung_thich(r: random.Random) -> str:
    s = r.choice(N["nguoi"])
    o = r.choice(MON + N["do_uong"] + N["dong_vat"] + N["the_thao"] + N["mau"])
    return _hoa(f"{chu(s)} {r.choice(['thích', 'rất thích'])} {chu(o)}")


def khung_tinh_tu(r: random.Random) -> str:
    rat = r.choice(["", "", "rất "])
    loai = r.random()
    if loai < 0.4:
        s, a = r.choice(CHU_NGU), r.choice(N["tt_nguoi"])
    elif loai < 0.65:
        s = r.choice(N["do_vat"][:30] + N["trang_phuc"] + N["phuong_tien"])
        a = r.choice(N["tt_vat"])
    elif loai < 0.85:
        s, a = r.choice(MON + N["do_uong"]), r.choice(N["tt_vi"])
    else:
        s, a = r.choice(N["noi_chon"]), r.choice(N["tt_noi"] + ["Đẹp (vật)", "Sạch sẽ", "Rộng"])
    return _hoa(f"{chu(s)} {rat}{chu(a)}")


def khung_thoi_tiet(r: random.Random) -> str:
    t = r.choice(GIO_TRONG_NGAY + DIP)
    w = r.choice(list(THOI_TIET))
    rat = "rất " if w in ("Lạnh", "Nóng") and r.random() < 0.4 else ""
    cum = THOI_TIET[w].replace("trời ", "trời " + rat)
    return _hoa(f"{chu(t)} {cum}")


def khung_nghe(r: random.Random) -> str:
    return _hoa(f"{chu(r.choice(N['nguoi']))} là {chu(r.choice(N['nghe']))}")


def khung_mau(r: random.Random) -> str:
    s = r.choice(N["nguoi"])
    o = r.choice(N["trang_phuc"][:12] + ["Xe máy", "Xe đạp", "Ô tô", "Túi xách", "Ba lô"])
    return _hoa(f"{chu(s)} có {chu(o)} {chu(r.choice(N['mau']))}")


def khung_kham(r: random.Random) -> str:
    return _hoa(f"{_tg(r, GIO_TRONG_NGAY + NGAY)}{r.choice(['bác sĩ', 'y tá'])} khám bệnh cho "
                f"{chu(r.choice(N['nguoi']))}")


KHUNG = [(khung_hanh_dong, 0.38), (khung_noi_dong_tu, 0.2), (khung_thich, 0.08),
         (khung_tinh_tu, 0.14), (khung_thoi_tiet, 0.07), (khung_nghe, 0.05), (khung_mau, 0.04),
         (khung_kham, 0.04)]


def sinh(so_cau: int, hat_giong: int = 0) -> list[dict]:
    """Tra ve [{cau, gloss, khung}] khong trung cau."""
    r = random.Random(hat_giong)
    ham, trong_so = zip(*KHUNG)
    da_co: set[str] = set()
    ra: list[dict] = []
    thu = 0
    while len(ra) < so_cau and thu < so_cau * 50:
        thu += 1
        f = r.choices(ham, trong_so)[0]
        cau = f(r)
        if cau in da_co:
            continue
        gloss = cau_sang_gloss(cau)
        # kiem tra cheo: tach tu phai doc lai du nhan, gloss la hoan vi cua no
        if len(gloss) < 2 or sorted(gloss) != sorted(tach_tu(cau)):
            continue
        da_co.add(cau)
        ra.append({"cau": cau, "gloss": gloss, "khung": f.__name__.removeprefix("khung_")})
    return ra


if __name__ == "__main__":
    import sys

    for x in sinh(int(sys.argv[1]) if len(sys.argv) > 1 else 15, hat_giong=1):
        print(f"[{x['khung']:>12}] {' | '.join(x['gloss']):<50} -> {x['cau']}")
