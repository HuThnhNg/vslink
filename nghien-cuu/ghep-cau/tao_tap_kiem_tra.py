"""Tap kiem tra NHAP (viet tay, khong sinh tu khung) — CAN NGUOI BIET NNKH DUYET.

  python tao_tap_kiem_tra.py   # ghi du-lieu/tap_kiem_tra.jsonl

Moi dong: {"id", "cau", "gloss", "dang", "duyet": false}
  - "gloss" tam lay bang quy_tac.cau_sang_gloss. Nguoi duyet SUA truc tiep cot "gloss" thanh
    dung trat tu nguoi Diec ky, roi doi "duyet": true. Chay lai script se KHONG ghi de dong da duyet.
  - "dang": nhom cau truc, de bao cao ket qua theo tung loai.
Cau chi dung tu trong 400 nhan + hu tu. Mot so dang (hai dong tu, "cho" hai tan ngu, chu ngu ghep)
co chu y KHONG co trong bo sinh cau -> do kha nang tong quat hoa.
"""
from __future__ import annotations

import json
from pathlib import Path

from quy_tac import cau_sang_gloss, tach_tu

CAU: dict[str, list[str]] = {
    "dong-tu+tan-ngu": [
        "Mẹ nấu phở.", "Bố uống cà phê.", "Em ăn bánh xèo.", "Chị đọc sách.", "Anh xem bóng đá.",
        "Ông nội uống trà.", "Bà ngoại nấu xôi.", "Con trai ăn kem.", "Cô giáo viết báo cáo.",
        "Đầu bếp nướng thịt.", "Học sinh tìm thước kẻ.", "Chị thử áo đầm.", "Em gọi mẹ.",
        "Bác sĩ giúp đỡ bà nội.", "Con gái yêu thương con mèo.",
    ],
    "thoi-gian-dau-cau": [
        "Buổi sáng bố đi làm.", "Buổi tối em làm bài tập.", "Chủ nhật mẹ đi chợ.",
        "Bây giờ anh ngủ.", "Thứ hai chị đi ngân hàng.", "Buổi trưa ông nội nghỉ ngơi.",
        "Tết Âm lịch bà nội nấu bánh chưng.", "Trung thu em ăn kẹo.", "Bình minh mẹ thức dậy.",
        "Thứ bảy bố đi siêu thị.",
    ],
    "tinh-thai": [
        "Em muốn đi công viên.", "Anh không nên uống rượu.", "Chị cần tìm chìa khóa.",
        "Bố thích đọc sách.", "Em không cần ăn kẹo.", "Ông nội nên nghỉ ngơi.",
        "Con trai muốn học võ.", "Mẹ cần đi bệnh viện.", "Em thích xem tivi.",
        "Chú không nên uống bia.",
    ],
    "noi-chon": [
        "Bố làm việc ở công ty.", "Mẹ làm việc ở bệnh viện.", "Em học ở trường học.",
        "Chị nói chuyện ở quán cà phê.", "Anh chạy ở công viên.", "Cô làm việc ở ngân hàng.",
        "Sinh viên học ở trường Đại học.", "Bà ngoại ngủ ở nhà.",
    ],
    "di+noi-chon/phuong-tien": [
        "Bố đi Nhật Bản.", "Em đi xe đạp.", "Mẹ đi xe buýt.", "Anh đi máy bay.",
        "Chị đi nhà sách.", "Ông nội đi bệnh viện.", "Cháu đi rạp chiếu phim.",
    ],
    "tinh-tu": [
        "Mẹ rất đẹp.", "Em rất mệt.", "Ông nội già.", "Chị thông minh.", "Phở rất ngon.",
        "Cà phê đắng.", "Cái áo mới.", "Xe máy cũ.", "Bệnh viện xa.", "Nhà sách yên tĩnh.",
        "Chợ rất ồn ào.", "Con chó dữ.", "Em bé ngoan.", "Đôi giày rất đắt.",
    ],
    "thoi-tiet": [
        "Buổi chiều trời mưa.", "Mùa đông trời rất lạnh.", "Mùa hè trời nóng.",
        "Buổi sáng trời nắng.", "Mùa thu trời mát mẻ.", "Buổi tối trời có gió.",
    ],
    "la+nghe": [
        "Bố là bác sĩ.", "Mẹ là y tá.", "Chị là kế toán.", "Anh là luật sư.", "Ông nội là nông dân.",
    ],
    "co+mau": [
        "Chị có xe máy màu đỏ.", "Em có ba lô màu xanh da trời.", "Anh có ô tô màu đen.",
        "Mẹ có túi xách màu nâu.", "Em có con chó.",
    ],
    "thich+danh-tu": [
        "Em thích màu hồng.", "Anh thích bóng rổ.", "Bà nội thích con gà.", "Chị thích quả xoài.",
    ],
    # ---- cau truc KHONG co trong bo sinh ----------------------------------------
    "hai-dong-tu": [
        "Bây giờ em đi học.", "Mẹ đi chợ mua bán.", "Bố đi làm việc.", "Chị đi chụp hình.",
        "Anh thức dậy tắm rửa.",
    ],
    "cho/hai-tan-ngu": [
        "Mẹ cho em kẹo.", "Bố cho con trai xe đạp.", "Bà ngoại cho cháu bánh bao.",
    ],
    "chu-ngu-ghep": [
        "Bố và mẹ đi siêu thị.", "Anh và chị xem tivi.", "Ông nội và bà nội uống trà.",
    ],
    "cam-xuc/giao-tiep": [
        "Em cảm ơn cô.", "Anh xin lỗi chị.", "Con trai khóc.", "Em bé cười.", "Mẹ đồng ý.",
        "Bố từ chối.",
    ],
}


def main() -> None:
    tep = Path(__file__).parent / "du-lieu" / "tap_kiem_tra.jsonl"
    cu = {}
    if tep.exists():
        for d in open(tep, encoding="utf-8"):
            x = json.loads(d)
            if x.get("duyet"):
                cu[x["cau"]] = x
    ra, bo = [], []
    for dang, ds in CAU.items():
        for cau in ds:
            if cau in cu:
                ra.append(cu[cau])
                continue
            g = cau_sang_gloss(cau)
            if len(g) < 1 or len(tach_tu(cau)) < 1:
                bo.append(cau)
                continue
            ra.append({"id": len(ra), "cau": cau, "gloss": g, "dang": dang, "duyet": False})
    for i, x in enumerate(ra):
        x["id"] = i
    tep.parent.mkdir(exist_ok=True)
    with open(tep, "w", encoding="utf-8") as f:
        for x in ra:
            f.write(json.dumps(x, ensure_ascii=False) + "\n")
    print(f"{len(ra)} cau -> {tep} ({len(cu)} cau da duyet giu nguyen)")
    if bo:
        print("Bo (khong doc duoc nhan):", bo)


if __name__ == "__main__":
    main()
