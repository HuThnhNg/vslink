"""Prompt cho buoc "ghep cau" — dung chung cho Gemini, Qwen, Llama va cho Worker tren web.

Bon dieu kien thi nghiem (giong bang so sanh cua SignAlignLM, ACL Findings 2025):
  zero        : chi mo ta nhiem vu + dinh dang
  quy-tac     : + quy tac ngu phap NNKH -> tieng Viet
  few         : + vi du mau (few-shot)
  quy-tac+few : ca hai
Vi du mau chon co dinh (da dang khung) hoac TRUY XUAT theo do trung gloss (y tuong AulSign, 2025).
"""
from __future__ import annotations

import json
import random
import re

NHIEM_VU = """Bạn là bộ dịch từ chuỗi ký hiệu (gloss) Ngôn ngữ Ký hiệu Việt Nam (NNKH) sang MỘT câu tiếng Việt tự nhiên.

ĐẦU VÀO: các vị trí đánh số theo ĐÚNG THỨ TỰ người ký. Mỗi vị trí có tối đa 3 ứng viên do mô hình nhận dạng đưa ra, dạng "từ xác_suất", xếp từ chắc nhất đến kém chắc nhất. Ứng viên đầu thường đúng nhưng có thể sai.

CÁCH LÀM:
- Ở mỗi vị trí chọn MỘT ứng viên sao cho cả câu hợp nghĩa nhất. Chỉ bỏ ứng viên đầu khi nó làm câu vô nghĩa và ứng viên khác có xác suất không quá thấp. Có thể bỏ hẳn một vị trí nếu mọi ứng viên đều không hợp (máy cắt nhầm một đoạn).
- Được thêm hư từ tối thiểu để câu tự nhiên (là, ở, rất, trời, cho, và…). Bỏ phần chú thích trong ngoặc: "Cao (người)" -> "cao".
- KHÔNG thêm người, vật, hành động hay ý nào không có trong ứng viên.

ĐẦU RA: CHỈ một JSON trên một dòng, không markdown:
{"chon": ["từ đã chọn ở từng vị trí, theo thứ tự ký"], "cau": "câu tiếng Việt"}"""

QUY_TAC = """
QUY TẮC NGỮ PHÁP (NNKH thường khác tiếng Việt — đây là xu hướng, không phải luật tuyệt đối; luôn ưu tiên nghĩa hợp lý):
1. NNKH thường theo trật tự Chủ ngữ + Tân ngữ + Động từ (SOV); tiếng Việt là Chủ ngữ + Động từ + Tân ngữ (SVO). Ví dụ: Mẹ | Phở | Nấu -> "Mẹ nấu phở."
2. Nơi chốn và phương tiện cũng thường đứng TRƯỚC động từ trong NNKH. Ví dụ: Bố | Công ty | Làm việc -> "Bố làm việc ở công ty."
3. Từ tình thái và phủ định (muốn, cần, thích, nên, không nên, không cần) thường đứng SAU động từ trong NNKH; tiếng Việt đặt TRƯỚC. Ví dụ: Anh | Rượu | Uống | Không nên -> "Anh không nên uống rượu."
4. Từ chỉ thời gian (Bây giờ, Buổi tối, Thứ hai, Mùa đông…) thường đứng đầu; giữ ở đầu câu tiếng Việt.
5. Tính từ làm vị ngữ, câu thời tiết và câu "là" giữ nguyên trật tự: Mùa đông | Lạnh -> "Mùa đông trời lạnh."; Bố | Bác sĩ -> "Bố là bác sĩ."
6. Từ hỏi thường đứng cuối câu trong NNKH (bộ từ hiện tại chưa có từ hỏi)."""

DIEU_KIEN = ("zero", "quy-tac", "few", "quy-tac+few")


def he_thong(dieu_kien: str) -> str:
    return NHIEM_VU + (QUY_TAC if "quy-tac" in dieu_kien else "")


def tra_loi_mau(vd: dict) -> str:
    return json.dumps({"chon": vd["gloss"], "cau": vd["cau"]}, ensure_ascii=False)


def chon_vi_du(kho: list[dict], so: int, truy_van: dict | None = None, hat_giong: int = 0) -> list[dict]:
    """Chon vi du mau.
    - truy_van=None: co dinh, trai deu cac khung (cung mot bo cho moi cau hoi).
    - truy_van co "vi_tri": truy xuat theo do trung tap ung vien (Jaccard) — kieu AulSign."""
    if not kho or so <= 0:
        return []
    if truy_van is None:
        r = random.Random(hat_giong)
        theo_khung: dict[str, list[dict]] = {}
        for x in kho:
            theo_khung.setdefault(x.get("khung", ""), []).append(x)
        ra: list[dict] = []
        while len(ra) < so:
            for ds in theo_khung.values():
                if len(ra) < so:
                    ra.append(r.choice(ds))
        return ra
    tu_q = {t for uv in truy_van["vi_tri"] for t, _ in uv}

    def diem(x: dict) -> float:
        tu_x = set(x["gloss"])
        return len(tu_q & tu_x) / (len(tu_q | tu_x) or 1)

    return sorted(kho, key=diem, reverse=True)[:so][::-1]  # vi du giong nhat dung gan cau hoi nhat


def tin_nhan(dieu_kien: str, dau_vao: str, vi_du: list[dict]) -> list[dict]:
    """Dang chat chung: [{role, content}] — system, cac cap vi du, cau hoi."""
    ms = [{"role": "system", "content": he_thong(dieu_kien)}]
    if "few" in dieu_kien:
        for vd in vi_du:
            ms.append({"role": "user", "content": vd["dau_vao"]})
            ms.append({"role": "assistant", "content": tra_loi_mau(vd)})
    ms.append({"role": "user", "content": dau_vao})
    return ms


def doc_tra_loi(s: str) -> dict:
    """Lay JSON tu cau tra loi (mo hinh nho hay kem chu thua / ```json)."""
    s = s.strip()
    m = re.search(r"\{.*\}", s, re.S)
    if m:
        try:
            d = json.loads(m.group(0))
            if isinstance(d, dict) and isinstance(d.get("cau"), str):
                chon = d.get("chon") if isinstance(d.get("chon"), list) else []
                return {"cau": d["cau"].strip(), "chon": [str(x) for x in chon], "loi": None}
        except json.JSONDecodeError:
            pass
    dong = next((x for x in s.splitlines() if x.strip()), "")
    return {"cau": dong.strip().strip('"'), "chon": [], "loi": "khong-doc-duoc-json"}
