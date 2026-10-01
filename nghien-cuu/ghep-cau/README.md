# Ghép câu: dãy gloss → câu tiếng Việt bằng LLM

Mô hình VSL400 nhận dạng **từng từ một**. Nếu người dùng ký chậm từng từ (hạ tay giữa các từ), máy cắt
đoạn của web đã tách được từng từ và cho **top-5 kèm xác suất** cho mỗi từ. Thư mục này nghiên cứu bước
còn thiếu: biến dãy đó thành **một câu tiếng Việt**.

```
Người ký:  MẸ ─ PHỞ ─ NẤU              (trật tự NNKH: Chủ – Tân – Động)
              │     │     │   cat-doan.ts + vsl400.onnx (đã có)
              ▼     ▼     ▼
Top-3:     Mẹ .82  Phở .55  Nướng .41   ← mô hình phân vân
           Mèo .05 Bún .30  Nấu   .38
              └─────┴─────┴──► LLM: (a) chọn từ hợp ngữ cảnh  (b) SOV → SVO  (c) thêm hư từ
                                    ▼
                              "Mẹ nấu phở."
```

## Dựa trên bài nào

| Ý tưởng | Bài | Dùng ở đây |
| --- | --- | --- |
| Kiến trúc "nhận dạng từ đơn + LLM ghép câu" | **Spotter+GPT** — Sincan & Bowden, SLTAT @ ACM IVA 2025 ([arXiv 2403.10434](https://arxiv.org/abs/2403.10434)) | Toàn bộ pipeline |
| Đưa LLM **nhiều phương án** (N-best) để sửa lỗi nhận dạng | **HyPoradise** — Chen và cs., NeurIPS 2023 ([arXiv 2309.15701](https://arxiv.org/abs/2309.15701)) | Gửi top-3 kèm % |
| So sánh prompt zero-shot / quy tắc / 1-shot với Llama-3 8B | **SignAlignLM** — İnan và cs., ACL Findings 2025 ([PDF](https://aclanthology.org/2025.findings-acl.190.pdf)) | 4 điều kiện prompt |
| Ví dụ mẫu được truy xuất + quy tắc, ít dữ liệu | **AulSign** — Bulla và cs., ECAI 2025 ([arXiv 2508.18183](https://arxiv.org/abs/2508.18183)) | `--truy-xuat` |
| Sinh dữ liệu gloss–câu từ câu thường bằng quy tắc | Moryossef, Yin, Neubig, Goldberg, AT4SSL 2021 ([arXiv 2105.07476](https://arxiv.org/abs/2105.07476)) | `sinh_cau.py`, `quy_tac.py` |
| Fine-tune nhẹ bằng LoRA cho gloss→text | **Gloss2Text** — Fayyazsanavi và cs., EMNLP Findings 2024 ([arXiv 2407.01394](https://arxiv.org/abs/2407.01394)) | Mức 2 (QLoRA) |
| Trật tự NNKH TP.HCM: SOV, phủ định/tình thái sau động từ, từ hỏi cuối câu | Hoa Nguyen, IntechOpen 2026; lưu ý của J. Woodward (2011) về nhiều trật tự được phép | Quy tắc trong prompt |
| Hạn chế của gloss, cách đánh giá | Müller và cs., ACL 2023 ([ACL Anthology](https://aclanthology.org/2023.acl-short.60)) | Phần "Giới hạn" |

Theo khảo sát của nhóm, chưa thấy bài nào đánh giá LLM cho gloss **NNKH Việt Nam → tiếng Việt**.

## Ba mức so sánh

| Mức | Hệ | Train? |
| --- | --- | --- |
| 0 | `noi-tho`: nối top-1 theo thứ tự ký | không |
| 0+ | `quy-tac`: đảo trật tự NNKH → tiếng Việt bằng quy tắc (`quy_tac.gloss_sang_cau`) | không |
| 1 | Gemini / Qwen-2.5-7B / Llama-3.1-8B × 4 prompt: `zero`, `quy-tac`, `few`, `quy-tac+few` (+ `--truy-xuat`) | không |
| 2 | ViT5-base (train toàn bộ), Qwen-2.5-1.5B/3B/7B (QLoRA) trên dữ liệu tự sinh | có |

## Dữ liệu (không có bộ gloss–câu NNKH công khai khớp 400 từ → tự tạo)

1. **Câu tiếng Việt** (`sinh_cau.py`): sinh từ khung ngữ nghĩa có ràng buộc (ăn → món ăn, khám bệnh → bác sĩ…), chỉ dùng 400 nhãn. Mặc định 8.000 câu.
2. **Gloss NNKH** (`quy_tac.py`): bỏ hư từ, đưa tân ngữ / nơi chốn lên trước động từ, đặt tình thái / phủ định sau động từ.
3. **Nhiễu nhận dạng** (`nhieu.py`): mỗi gloss được thay bằng top-3 *như mô hình thật trả về*.
   - **Nên dùng:** dự đoán thật trên 9.751 video kiểm tra VSL400. Dán `xuat_top5_kaggle.py` vào notebook huấn luyện, xuất `du_doan_test.jsonl`, chép vào `du-lieu/`.
   - **Tạm thời:** giả lập theo số liệu của mô hình (top-1 89,51 %, top-5 97,81 %; từ nhầm ưu tiên cùng chủ đề).
4. **Tập kiểm tra** (`du-lieu/tap_kiem_tra.jsonl`, 101 câu **viết tay**, 14 dạng câu). Có 4 dạng *không có trong bộ sinh* (hai động từ, "cho" hai tân ngữ, chủ ngữ ghép, giao tiếp) để đo khả năng tổng quát hoá. **Cột `gloss` hiện sinh bằng quy tắc, cần người biết NNKH duyệt**: sửa `gloss` thành đúng trật tự người Điếc ký rồi đặt `"duyet": true`. Chạy lại `tao_tap_kiem_tra.py` sẽ giữ nguyên các dòng đã duyệt.

## Chạy

```bash
cd nghien-cuu/ghep-cau
pip install sacrebleu pytest requests
python -m pytest -q                       # 19 kiểm thử
python tao_du_lieu.py                     # du-lieu/sinh/{train,val}.jsonl
python chay_llm.py --he noi-tho           # Mức 0
python chay_llm.py --he quy-tac           # Mức 0+
GEMINI_API_KEY=... python chay_llm.py --he gemini:gemini-3.1-flash-lite --dieu-kien quy-tac+few
```

LLM mở (Qwen, Llama) và fine-tune chạy trên **Kaggle** (GPU T4 miễn phí):
- `kaggle_1_prompt.ipynb`: Mức 0, 0+ và Mức 1 cho Gemini, Qwen-2.5-7B, Llama-3.1-8B (nén 4-bit).
- `kaggle_2_finetune.ipynb`: Mức 2, gồm ViT5-base và Qwen-2.5 + QLoRA (Unsloth).

Mở Kaggle → *New Notebook* → *File → Import Notebook* → dán link GitHub của tệp `.ipynb`. Bật *Internet* và *GPU T4*. Thêm secret `GEMINI_API_KEY` / `HF_TOKEN` nếu dùng.

Mọi kết quả cộng dồn vào `du-lieu/ket-qua/tong-ket.md`. Mỗi `*.jsonl` lưu cả câu trả lời thô để phân tích lỗi.

## Chỉ số

- **chrF++** (chính, ổn định với câu ngắn) và **BLEU** (để so với các bài khác), dùng sacrebleu.
- **Khớp**: tỉ lệ câu trùng hoàn toàn.
- **F1 từ**: F1 giữa các nhãn đọc lại từ câu dự đoán và gloss đúng. Chỉ số này cho biết hệ có **chọn đúng từ và không bịa từ** hay không, không phụ thuộc cách diễn đạt.
- Hai chế độ đầu vào: `--dau-vao sach` (chỉ gloss đúng, đo khả năng sắp xếp) và `--dau-vao nhieu` (top-3 có nhiễu, đo thêm khả năng sửa lỗi nhận dạng).

## Kết quả hiện có (mốc không dùng LLM, nhiễu giả lập)

| Hệ | Đầu vào | chrF++ | BLEU | Khớp % | F1 từ |
| --- | --- | --- | --- | --- | --- |
| Mức 0 nối thô | sạch | 65,76 | 37,69 | 18,8 | 100,0 |
| Mức 0 nối thô | nhiễu | 56,86 | 28,23 | 12,9 | 88,6 |
| Mức 0+ quy tắc | sạch | 93,03 | 90,85 | 84,2 | 100,0 |
| Mức 0+ quy tắc | nhiễu | 78,31 | 70,77 | 55,4 | 88,6 |

Cách đọc:
- Nhiễu nhận dạng làm mất khoảng 15 điểm chrF++ và 11 điểm F1 từ. **Đó là phần LLM cần lấy lại.**
- **Cẩn thận:** mốc quy tắc rất cao trên đầu vào sạch vì gloss của tập kiểm tra *cũng được sinh bằng chính quy tắc đó*. Mốc này chỉ công bằng sau khi người biết NNKH duyệt lại gloss. Ngay cả bây giờ, quy tắc đã hỏng ở các dạng ngoài khuôn: chủ ngữ ghép đạt chrF++ 44,7, hai động từ đạt 52,3.

## Giới hạn

- Chưa phải nhận dạng liên tục: người ký phải hạ tay giữa các từ. Mô hình chỉ học từ đơn.
- Bộ 400 từ không có "Tôi", "Bạn", từ hỏi, và "Không" đứng riêng, nên câu ghép được còn đơn giản.
- Gloss làm mất nét mặt, không gian, biến đổi động từ (Müller và cs., 2023). Câu hỏi và phủ định trong NNKH thường nằm ở nét mặt.
- Quy tắc SOV là xu hướng của NNKH TP.HCM. Người ký VSL400 có thể đến từ nhiều miền.
- Dữ liệu huấn luyện là câu tự sinh. Kết quả cuối nên báo trên tập do người duyệt, kèm vài chục câu ký thật trước camera.

## Trên web

Trang **Dịch** có công tắc **Ghép câu** (`src/lib/cau/ghep-cau.ts`). Worker của Mèo có thêm nhánh `{"loai": "cau"}` dùng prompt điều kiện `quy-tac+few`. Web chỉ gửi từ và xác suất, không gửi hình. Không có Worker thì web nối từ theo thứ tự ký.

**Sau khi gộp nhánh:** dán lại toàn bộ `worker/meo-worker.js` vào Cloudflare Worker (*Edit code* → *Deploy*). Không cần đổi biến môi trường.
