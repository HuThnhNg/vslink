"""Tao src/lib/du-lieu/tu-vung.json: 400 tu, dung THU TU dau ra cua mo hinh (nhan.json),
kem chu de va link video mau (Tu dien NNKH — qipedc.moet.gov.vn).

Chay: python scripts/du-lieu/tao_tu_vung.py duong/dan/videos.json
(videos.json = static/spoter/videos.json cua repo web cu website-vsl)."""
import json
import sys
from pathlib import Path

GOC = Path(__file__).resolve().parents[2]
DU_LIEU = GOC / "src/lib/du-lieu"
NHAN = json.load(open(DU_LIEU / "nhan.json", encoding="utf-8"))
VIDEO = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "videos.json", encoding="utf-8"))

CHU_DE = {
    "gia-dinh": ("Gia đình", "Anh|Bà ngoại|Bà nội|Bác|Bố|Cháu|Chú|Chị|Chồng|Con gái|Con trai|Cô|Cậu|Dì|Em|Họ hàng|Mẹ|Vợ|Ông ngoại|Ông nội"),
    "nghe-nghiep": ("Nghề nghiệp", "Bác sĩ|Bảo vệ|Ca sĩ|Chủ tịch|Diễn viên|Giám đốc|Hiệu trưởng|Kế toán|Luật sư|Lễ tân|Nghề nghiệp|Nhân viên phục vụ|Nhân viên văn phòng|Nông dân|Thư ký|Y tá|Đầu bếp|Học sinh|Sinh viên"),
    "an-uong": ("Ăn uống", "Bia|Bánh bao|Bánh chưng|Bánh tét|Bánh xèo|Bún|Cà phê|Gạo|Kem|Kẹo|Mì gói|Nước|Phở|Rượu|Sữa|Thịt|Trà|Trứng|Xôi|Cay|Chua|Mặn|Ngọt|Nhạt|Đắng|Đậm|Ngon miệng|Ăn|Uống|Nấu|Nướng|Nếm|Thèm|Tham ăn"),
    "trai-cay": ("Trái cây", "Quả bơ|Quả cam|Quả chuối|Quả dâu|Quả dứa|Quả dừa|Quả mận|Quả xoài|Quả đu đủ|Quả đào"),
    "dong-vat": ("Động vật", "Con bò|Con chó|Con dê|Con gà|Con heo|Con mèo|Con rùa|Con thỏ|Con trâu|Con vịt"),
    "mau-sac": ("Màu sắc", "Màu cam|Màu hồng|Màu nâu|Màu trắng|Màu tím|Màu vàng|Màu xanh da trời|Màu xanh lá cây|Màu đen|Màu đỏ"),
    "thoi-gian": ("Thời gian", "Buổi chiều|Buổi sáng|Buổi trưa|Buổi tối|Bây giờ|Bình minh|Hoàng hôn|Chủ nhật|Giây|Giờ|Phút|Ngày|Năm|Tháng|Tháng một|Tháng hai|Tháng ba|Tháng tư|Tháng năm|Tháng sáu|Tháng bảy|Tháng tám|Tháng chín|Tháng mười|Tháng mười một|Tháng mười hai|Thứ hai|Thứ ba|Thứ tư|Thứ năm|Thứ sáu|Thứ bảy|Thời gian|Sớm|Trễ"),
    "thoi-tiet": ("Thời tiết", "Gió|Mưa|Nắng|Lạnh|Nóng|Mát mẻ|Ấm|Thời tiết|Mùa hè|Mùa khô|Mùa mưa|Mùa thu|Mùa xuân|Mùa đông|Khô|Ướt"),
    "le-hoi": ("Lễ hội", "Giáng sinh|Ngày Nhà giáo Việt Nam|Ngày Quốc tế Lao động|Ngày Quốc tế Phụ nữ|Ngày Quốc tế Thiếu nhi|Tết Âm lịch|Trung thu"),
    "noi-chon": ("Nơi chốn", "Hàn Quốc|Mỹ|Nhật Bản|Thái Lan|Trung Quốc|Việt Nam|Bệnh viện|Chợ|Công ty|Công viên|Ngân hàng|Nhà|Nhà hàng|Nhà sách|Nhà trọ|Quán cà phê|Rạp chiếu phim|Siêu thị|Thành phố|Tỉnh|Trường Cao đẳng|Trường học|Trường Đại học"),
    "hoc-tap": ("Học tập", "Ba lô|Bàn phím|Bút bi|Bút chì|Bảng|Cục tẩy|Dụng cụ học tập|Giấy nháp|Kính lúp|Laptop|Máy chiếu|Máy tính cầm tay|Quả địa cầu|Sách|Thước kẻ|Viên phấn|Vở|Học|Làm bài tập|Viết|Đọc|Báo cáo"),
    "do-vat": ("Đồ vật", "Chìa khóa|Điện thoại|Đồng hồ đeo tay|Tivi|Máy giặt|Máy điều hòa|Tủ lạnh|Nồi cơm điện|Quạt (đứng)|Cái bàn|Cái chảo|Cái cửa|Cái ghế|Cái kéo|Cái nồi|Cái đèn|Cửa sổ|Giường|Gối (đầu)|Mền|Tường|Đồ dùng"),
    "trang-phuc": ("Trang phục", "Cái quần|Cái áo|Dép|Giày|Mũ|Mũ bảo hiểm|Quần thun|Quần tây|Quần đùi|Áo sơ mi|Áo thun|Áo đầm|Khăn quàng cổ|Dây chuyền|Vòng tay|Kẹp tóc|Đồ buộc tóc|Túi xách"),
    "phuong-tien": ("Phương tiện", "Máy bay|Thuyền|Taxi|Tàu hỏa|Trực thăng|Xe buýt|Xe máy|Xe tải|Xe đạp|Ô tô"),
    "the-thao": ("Thể thao", "Bóng bàn|Bóng chuyền|Bóng rổ|Bóng đá|Bơi lội|Cầu lông|Chơi cờ|Điền kinh|Đá cầu|Nhảy cao|Nhảy dây|Võ|Thể dục (thể thao)|Chạy|Múa|Cắm trại"),
    "hoat-dong": ("Hoạt động", "Chụp hình|Cho|Cười|Giúp đỡ|Giặt đồ|Giới thiệu|Gọi|Gội đầu|Hát|Hứa|Khám bệnh|Khóc|Làm việc|Mua bán|Nghe|Nghỉ ngơi|Ngủ|Ngửi|Nói|Nói chuyện|Phơi đồ|Quan sát|Rửa chén|Rửa mặt|Rửa tay|Thay đổi|Thức dậy|Thử|Tiếp tục|Tìm|Tắm rửa|Xem|Xin|Đi|Dừng lại|Cung cấp|Bắt chước|Mách|Chết"),
    "cam-xuc": ("Cảm xúc & tính cách", "Bận|Chăm chỉ|Chậm chạp|Cảm thấy|Dũng cảm|Dỗi|Ghét|Hiền|Hy vọng|Hài hước|Hư|Khoe khoang|Không nghe lời|Lười biếng|Muốn|Mệt|Ngoan|Ngu ngốc|Sáng tạo|Tham lam|Thích|Thông minh|Thú vị|Tốt bụng|Vâng lời|Yêu thương|Giỏi|Hay (khen)|Dở|Dữ|Khỏe|Yếu|Ốm|Đau|Chú ý"),
    "tinh-chat": ("Tính chất", "Cao (người)|Cao (đồ vật)|Chật|Cũ|Cứng|Dài|Dơ|Dễ|Già|Giàu|Gần|Hôi|Hẹp|Khó|Lùn|Mạnh|Mập|Mềm|Mới|Nghèo|Nhanh|Nhẹ|Nặng|Ngắn|Rẻ|Rộng|Sạch sẽ|Thơm|Thấp (đồ vật)|Trẻ|Xa|Xấu (người)|Xấu (vật)|Yên tĩnh|Đắt|Đẹp (người)|Đẹp (vật)|Ồn ào"),
    "giao-tiep": ("Giao tiếp", "Có|Không cho|Không cần|Không nên|Không quen|Quen|Nên|Cần|Bắt buộc|Sai|Đúng|Xin lỗi|Cảm ơn|Nhầm lẫn|Đồng ý|Từ chối"),
}

ma = {}
for k, (_, ds) in CHU_DE.items():
    for t in ds.split("|"):
        assert t in NHAN, f"'{t}' khong co trong nhan.json"
        assert t not in ma, f"'{t}' nam o 2 chu de: {ma[t]} va {k}"
        ma[t] = k
thieu = [t for t in NHAN if t not in ma]
assert not thieu, f"chua xep chu de: {thieu}"

ra = dict(
    nguon_video="Từ điển Ngôn ngữ ký hiệu — Dự án QIPEDC, Bộ GD&ĐT (qipedc.moet.gov.vn)",
    chu_de=[dict(ma=k, ten=v[0]) for k, v in CHU_DE.items()],
    tu=[dict(i=i, tu=t, chu_de=ma[t], video=VIDEO[t]) for i, t in enumerate(NHAN)],
)
(DU_LIEU / "tu-vung.json").write_text(json.dumps(ra, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
from collections import Counter
c = Counter(ma.values())
print({CHU_DE[k][0]: c[k] for k in CHU_DE}, "tong", sum(c.values()))
