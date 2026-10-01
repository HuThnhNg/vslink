"""Tu loai cua 400 nhan VSL400 — dung chung cho quy tac, bo sinh cau va danh gia.

Moi nhan thuoc dung MOT nhom chinh (NHOM). Nhan khong dung de ghep cau (vd "Nghe nghiep",
"Do dung") van co nhom "khac" de bo nhieu (gia lap nhan dang) chon lam tu nham.

Ten nhan giu NGUYEN nhu src/lib/du-lieu/nhan.json (ca phan trong ngoac).
"""
from __future__ import annotations

import json
import re
from pathlib import Path

GOC = Path(__file__).resolve().parents[2]
NHAN: list[str] = json.load(open(GOC / "src/lib/du-lieu/nhan.json", encoding="utf-8"))
_TU_VUNG = json.load(open(GOC / "src/lib/du-lieu/tu-vung.json", encoding="utf-8"))
CHU_DE: dict[str, str] = {t["tu"]: t["chu_de"] for t in _TU_VUNG["tu"]}


def _ds(s: str) -> list[str]:
    return [x.strip() for x in s.split("|") if x.strip()]


NHOM: dict[str, list[str]] = {
    # ---- danh tu --------------------------------------------------------------
    "nguoi": _ds(
        "Anh|Bà ngoại|Bà nội|Bác|Bố|Cháu|Chú|Chị|Chồng|Con gái|Con trai|Cô|Cậu|Dì|Em|Mẹ|Vợ|"
        "Ông ngoại|Ông nội|Họ hàng"
    ),
    "nghe": _ds(
        "Bác sĩ|Bảo vệ|Ca sĩ|Chủ tịch|Diễn viên|Giám đốc|Hiệu trưởng|Kế toán|Luật sư|Lễ tân|"
        "Nhân viên phục vụ|Nhân viên văn phòng|Nông dân|Thư ký|Y tá|Đầu bếp|Học sinh|Sinh viên"
    ),
    "dong_vat": _ds("Con bò|Con chó|Con dê|Con gà|Con heo|Con mèo|Con rùa|Con thỏ|Con trâu|Con vịt"),
    "mon_an": _ds(
        "Bánh bao|Bánh chưng|Bánh tét|Bánh xèo|Bún|Kem|Kẹo|Mì gói|Phở|Thịt|Trứng|Xôi|Gạo|"
        "Quả bơ|Quả cam|Quả chuối|Quả dâu|Quả dứa|Quả dừa|Quả mận|Quả xoài|Quả đu đủ|Quả đào"
    ),
    "do_uong": _ds("Bia|Cà phê|Nước|Rượu|Sữa|Trà"),
    "do_vat": _ds(
        "Ba lô|Bàn phím|Bút bi|Bút chì|Bảng|Cục tẩy|Giấy nháp|Kính lúp|Laptop|Máy chiếu|"
        "Máy tính cầm tay|Quả địa cầu|Sách|Thước kẻ|Viên phấn|Vở|Chìa khóa|Điện thoại|"
        "Đồng hồ đeo tay|Tivi|Máy giặt|Máy điều hòa|Tủ lạnh|Nồi cơm điện|Quạt (đứng)|Cái bàn|"
        "Cái chảo|Cái cửa|Cái ghế|Cái kéo|Cái nồi|Cái đèn|Cửa sổ|Giường|Gối (đầu)|Mền|Tường|"
        "Túi xách|Báo cáo"
    ),
    "trang_phuc": _ds(
        "Cái quần|Cái áo|Dép|Giày|Mũ|Mũ bảo hiểm|Quần thun|Quần tây|Quần đùi|Áo sơ mi|Áo thun|"
        "Áo đầm|Khăn quàng cổ|Dây chuyền|Vòng tay|Kẹp tóc|Đồ buộc tóc"
    ),
    "phuong_tien": _ds("Máy bay|Thuyền|Taxi|Tàu hỏa|Trực thăng|Xe buýt|Xe máy|Xe tải|Xe đạp|Ô tô"),
    "noi_chon": _ds(
        "Bệnh viện|Chợ|Công ty|Công viên|Ngân hàng|Nhà|Nhà hàng|Nhà sách|Nhà trọ|Quán cà phê|"
        "Rạp chiếu phim|Siêu thị|Thành phố|Tỉnh|Trường Cao đẳng|Trường học|Trường Đại học"
    ),
    "quoc_gia": _ds("Hàn Quốc|Mỹ|Nhật Bản|Thái Lan|Trung Quốc|Việt Nam"),
    "the_thao": _ds(
        "Bóng bàn|Bóng chuyền|Bóng rổ|Bóng đá|Cầu lông|Chơi cờ|Điền kinh|Đá cầu|Nhảy cao|"
        "Nhảy dây|Võ|Thể dục (thể thao)|Bơi lội|Múa|Cắm trại"
    ),
    "mau": _ds(
        "Màu cam|Màu hồng|Màu nâu|Màu trắng|Màu tím|Màu vàng|Màu xanh da trời|Màu xanh lá cây|"
        "Màu đen|Màu đỏ"
    ),
    # ---- thoi gian / thoi tiet ------------------------------------------------
    "thoi_gian": _ds(
        "Buổi chiều|Buổi sáng|Buổi trưa|Buổi tối|Bây giờ|Bình minh|Hoàng hôn|Chủ nhật|"
        "Tháng một|Tháng hai|Tháng ba|Tháng tư|Tháng năm|Tháng sáu|Tháng bảy|Tháng tám|"
        "Tháng chín|Tháng mười|Tháng mười một|Tháng mười hai|Thứ hai|Thứ ba|Thứ tư|Thứ năm|"
        "Thứ sáu|Thứ bảy|Mùa hè|Mùa khô|Mùa mưa|Mùa thu|Mùa xuân|Mùa đông|Giáng sinh|"
        "Ngày Nhà giáo Việt Nam|Ngày Quốc tế Lao động|Ngày Quốc tế Phụ nữ|Ngày Quốc tế Thiếu nhi|"
        "Tết Âm lịch|Trung thu"
    ),
    "thoi_tiet": _ds("Gió|Mưa|Nắng|Lạnh|Nóng|Mát mẻ|Ấm"),
    # ---- dong tu --------------------------------------------------------------
    "dong_tu": _ds(
        "Ăn|Uống|Nấu|Nướng|Nếm|Thèm|Đi|Đọc|Viết|Xem|Học|Làm bài tập|Làm việc|Ngủ|Thức dậy|"
        "Nghỉ ngơi|Khóc|Cười|Hát|Chạy|Tắm rửa|Rửa mặt|Rửa tay|Gội đầu|Giặt đồ|Phơi đồ|Rửa chén|"
        "Nói chuyện|Nói|Chụp hình|Gọi|Giúp đỡ|Yêu thương|Ghét|Tìm|Thử|Khám bệnh|Bắt chước|Có|"
        "Cảm ơn|Xin lỗi|Cho|Mua bán|Nghe|Ngửi|Quan sát|Giới thiệu|Hứa|Mách|Xin|Cung cấp|"
        "Thay đổi|Tiếp tục|Dừng lại|Chết|Cảm thấy|Đồng ý|Từ chối|Không cho|Không quen|Quen|"
        "Không nghe lời|Vâng lời|Chú ý|Dỗi|Khoe khoang"
    ),
    # dong tu tinh thai: NNKH thuong dat SAU dong tu chinh, tieng Viet dat TRUOC
    "tinh_thai": _ds("Muốn|Cần|Thích|Nên|Không nên|Không cần|Bắt buộc|Hy vọng"),
    # ---- tinh tu --------------------------------------------------------------
    "tt_nguoi": _ds(
        "Chăm chỉ|Chậm chạp|Dũng cảm|Hiền|Hài hước|Hư|Lười biếng|Mệt|Ngoan|Ngu ngốc|Sáng tạo|"
        "Tham lam|Tham ăn|Thông minh|Tốt bụng|Giỏi|Khỏe|Yếu|Ốm|Đau|Bận|Cao (người)|Lùn|Mập|"
        "Già|Trẻ|Giàu|Nghèo|Đẹp (người)|Xấu (người)|Dữ|Mạnh"
    ),
    "tt_vat": _ds(
        "Chật|Cũ|Cứng|Dài|Dơ|Mềm|Mới|Nhẹ|Nặng|Ngắn|Rẻ|Rộng|Sạch sẽ|Thấp (đồ vật)|"
        "Cao (đồ vật)|Xấu (vật)|Đẹp (vật)|Đắt|Hẹp|Nhanh"
    ),
    "tt_vi": _ds("Cay|Chua|Mặn|Ngọt|Nhạt|Đắng|Đậm|Ngon miệng|Thơm|Hôi"),
    "tt_noi": _ds("Xa|Gần|Yên tĩnh|Ồn ào"),
    "tt_khac": _ds("Dễ|Khó|Thú vị|Hay (khen)|Dở|Đúng|Sai|Nhầm lẫn|Sớm|Trễ|Khô|Ướt"),
    # ---- con lai: khong ghep cau, chi dung lam tu nham -------------------------
    "khac": _ds(
        "Nghề nghiệp|Đồ dùng|Dụng cụ học tập|Thời gian|Thời tiết|Giây|Giờ|Phút|Ngày|Năm|Tháng|"
        "Mùa thu|Bắt buộc"
    ),
}
# "Mua thu", "Bat buoc" da o nhom khac — bo trung o "khac"
NHOM["khac"] = [t for t in NHOM["khac"] if t not in {"Mùa thu", "Bắt buộc"}]

LOAI: dict[str, str] = {}
for _nhom, _ds_tu in NHOM.items():
    for _t in _ds_tu:
        assert _t in NHAN, f"'{_t}' khong co trong nhan.json"
        assert _t not in LOAI, f"'{_t}' nam trong ca {LOAI.get(_t)} va {_nhom}"
        LOAI[_t] = _nhom
_THIEU = [t for t in NHAN if t not in LOAI]
assert not _THIEU, f"chua phan loai: {_THIEU}"

DANH_TU = {"nguoi", "nghe", "dong_vat", "mon_an", "do_uong", "do_vat", "trang_phuc",
           "phuong_tien", "noi_chon", "quoc_gia", "the_thao", "mau"}
TINH_TU = {"tt_nguoi", "tt_vat", "tt_vi", "tt_noi", "tt_khac", "thoi_tiet"}


def chu(nhan: str) -> str:
    """Nhan -> chu dung trong cau tieng Viet: bo phan trong ngoac, viet thuong.
    Giu hoa danh tu rieng (ten nuoc, ngay le)."""
    s = re.sub(r"\s*\(.*?\)", "", nhan).strip()
    if LOAI.get(nhan) == "quoc_gia" or s.startswith(("Ngày", "Tết", "Trung thu", "Giáng sinh")):
        return s
    return s.lower()
