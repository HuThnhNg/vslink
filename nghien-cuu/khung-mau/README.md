# Khung xương mẫu cho từ chưa có video

Từ nào chưa có video mẫu đã duyệt, web phát lại **một lần ký thật** trong VSL400 (góc chính diện) bằng khung xương.

## Chọn lần ký nào

Với mỗi từ:

1. Chạy mọi lần ký của từ đó qua chính `vsl400.onnx` của web. Chỉ giữ lần mô hình nhận đúng **hạng 1** và chắc **≥ 50 %** (cùng chuẩn "Khớp tốt" của công cụ video mẫu).
2. Đưa các lần ký về cùng hệ toạ độ: gốc là giữa hai vai, đơn vị là độ rộng vai. So 54 điểm (vai → khuỷu → cổ tay → 42 điểm bàn tay) qua 60 khung. Điểm chỉ một bên bắt được thì bị phạt.
3. Lấy **medoid**: lần ký có trung vị khoảng cách tới mọi lần ký khác nhỏ nhất, tức lần "tiêu biểu" nhất.
4. Căn giữa (vai ở giữa khung, rộng 0,30), làm mượt 3 khung, làm tròn int16. Cho **bản đã xử lý** chạy lại qua mô hình: vẫn phải hạng 1 và ≥ 50 % thì mới ghi `"kiem_chung": true`.

Vì sao không lấy trung bình: trung bình nhiều người làm mờ dáng bàn tay, thu nhỏ biên độ (các lần ký lệch nhịp triệt tiêu nhau), và người thuận tay trái / phải triệt tiêu nhau.

## Chạy

Kaggle → notebook mới → *Add Input* dataset keypoint VSL400 → bật *Internet* (ô tự tải `vsl400.onnx` từ web VSLink; hoặc *Add Input* một tệp `vsl400.onnx`) → dán `xuat_khung_mau_kaggle.py` vào một ô → Run. Ra `/kaggle/working/khung-mau.zip`; giải nén vào `static/du-lieu/`.

Kiểm thử trên dữ liệu giả cùng cấu trúc (có cả người thuận tay trái, lần ký mất tay, chạy với mô hình thật):

```bash
cd nghien-cuu/khung-mau
python -m pytest -q
```

## Định dạng

`khung-mau/chi-muc.json`: `so_khung` (60), `so_diem` (75), `ti_le` (10000), và với mỗi từ: `kiem_chung`, `giay` (độ dài lần ký gốc, giả định 30 hình/giây), `p`, `hang`, `p_hien_thi`, `so_mau`, `so_dung`.

`khung-mau/000.bin … 399.bin`: 60 × 75 × (x, y), int16 little-endian, toạ độ × 10000 trong khung vuông; (0, 0) là không bắt được điểm đó. Thứ tự 75 điểm giống mô hình: 33 điểm thân, 21 điểm tay trái, 21 điểm tay phải.
