"""Chay mot he thong "ghep cau" tren tap kiem tra roi cham diem.

  # Muc 0 / 0+ (khong LLM) — chay duoc ngay, khong can GPU
  python chay_llm.py --he noi-tho
  python chay_llm.py --he quy-tac

  # Muc 1 — LLM chi viet prompt
  GEMINI_API_KEY=... python chay_llm.py --he gemini:gemini-3.1-flash-lite --dieu-kien quy-tac+few
  python chay_llm.py --he hf:Qwen/Qwen2.5-7B-Instruct --bon-bit --dieu-kien few --truy-xuat
  python chay_llm.py --he openai:http://localhost:8000/v1:Qwen/Qwen2.5-7B-Instruct   # vLLM / Ollama

  # Muc 2 — mo hinh da fine-tune (notebook kaggle_2_finetune.ipynb)
  python chay_llm.py --he hf:Qwen/Qwen2.5-7B-Instruct --adapter duong/dan/lora --dieu-kien zero
  python chay_llm.py --he t5:duong/dan/vit5-ghep-cau

--dau-vao sach : moi vi tri chi co gloss dung (p=1.00) -> do rieng kha nang sap xep / dien dat
--dau-vao nhieu: top-3 co nhieu nhan dang (mac dinh) -> do ca kha nang sua loi nhan dang
Ket qua: du-lieu/ket-qua/<ten>.jsonl + dong tong ket trong du-lieu/ket-qua/tong-ket.md
"""
from __future__ import annotations

import argparse
import json
import os
import random
import re
import time
from pathlib import Path

import danh_gia
from nhieu import dinh_dang, lam_nhieu, nguon_mac_dinh, top1
from prompt import DIEU_KIEN, chon_vi_du, doc_tra_loi, tin_nhan
from quy_tac import gloss_sang_cau, noi_tho

THU_MUC = Path(__file__).parent / "du-lieu"
TAP = THU_MUC / "tap_kiem_tra.jsonl"


# ---------------------------------------------------------------------------
# Dau vao co dinh cho tap kiem tra (moi he thong thay CUNG mot nhieu)
# ---------------------------------------------------------------------------
def dau_vao_kiem_tra(che_do: str, tep_du_doan: str | None) -> list[dict]:
    tap = [json.loads(d) for d in open(TAP, encoding="utf-8")]
    if che_do == "sach":
        for x in tap:
            x["vi_tri"] = [[[t, 1.0]] for t in x["gloss"]]
            x["dau_vao"] = dinh_dang(x["vi_tri"])
        return tap
    nguon = nguon_mac_dinh(tep_du_doan, hat_giong=123)
    ten = "nhieu-that" if type(nguon).__name__ == "DuDoanThat" else "nhieu-gia-lap"
    tep = THU_MUC / f"tap_kiem_tra_{ten}.jsonl"
    if tep.exists():
        cu = {x["id"]: x for x in map(json.loads, open(tep, encoding="utf-8"))}
        if all(x["id"] in cu and cu[x["id"]]["gloss"] == x["gloss"] for x in tap):
            return [cu[x["id"]] for x in tap]
    r = random.Random(123)
    for x in tap:
        x["vi_tri"] = [[list(u) for u in uv] for uv in lam_nhieu(x["gloss"], nguon, k=3, r=r)]
        x["dau_vao"] = dinh_dang(x["vi_tri"])
    with open(tep, "w", encoding="utf-8") as f:
        for x in tap:
            f.write(json.dumps(x, ensure_ascii=False) + "\n")
    print(f"Da tao dau vao co dinh: {tep}")
    return tap


# ---------------------------------------------------------------------------
# Cac "he" sinh cau
# ---------------------------------------------------------------------------
# Thu tu thu khi model yeu cau khong ton tai (giong worker/meo-worker.js). Google doi / ngung model
# thuong xuyen: xem ai.google.dev/gemini-api/docs/models.
DS_GEMINI = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-flash-lite-latest",
             "gemini-3.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-2.5-flash"]
GOC_GEMINI = "https://generativelanguage.googleapis.com/v1beta/models"


class Gemini:
    """Goi Gemini. Model yeu cau bi 404 (khong ton tai / da ngung) -> tu thu lan luot DS_GEMINI,
    nho model dung duoc cho cac cau sau. Het cach -> in danh sach model key nay dung duoc."""

    def __init__(self, mo_hinh: str):
        import requests

        self.rq = requests
        self.key = os.environ.get("GEMINI_API_KEY", "").strip()
        if not self.key:
            raise SystemExit("Chua co GEMINI_API_KEY. Chay: export GEMINI_API_KEY=\"key cua ban\" (cung cua so Terminal)")
        self.ds = [mo_hinh] + [m for m in DS_GEMINI if m != mo_hinh]
        self.dang_dung: str | None = None

    def _liet_ke(self) -> list[str]:
        try:
            r = self.rq.get(GOC_GEMINI, headers={"x-goog-api-key": self.key}, timeout=30)
            return [m["name"].removeprefix("models/") for m in r.json().get("models", [])
                    if "generateContent" in m.get("supportedGenerationMethods", [])]
        except Exception:
            return []

    def _goi(self, mo_hinh: str, body: dict):
        url = f"{GOC_GEMINI}/{mo_hinh}:generateContent"
        for lan in range(6):
            r = self.rq.post(url, json=body, headers={"x-goog-api-key": self.key}, timeout=60)
            if r.status_code in (429, 500, 503):
                time.sleep(5 * (lan + 1))
                continue
            return r
        return r

    def __call__(self, ms: list[dict]) -> str:
        he = next(m["content"] for m in ms if m["role"] == "system")
        noi_dung = [{"role": "user" if m["role"] == "user" else "model", "parts": [{"text": m["content"]}]}
                    for m in ms if m["role"] != "system"]
        body = {"systemInstruction": {"parts": [{"text": he}]}, "contents": noi_dung,
                "generationConfig": {"temperature": 0, "maxOutputTokens": 1024,
                                     "responseMimeType": "application/json"}}
        thu = [self.dang_dung] if self.dang_dung else self.ds
        loi = []
        for mo_hinh in thu:
            r = self._goi(mo_hinh, body)
            if r.status_code == 200:
                if self.dang_dung != mo_hinh:
                    print(f"  [Gemini] dang dung model: {mo_hinh}")
                    self.dang_dung = mo_hinh
                parts = r.json().get("candidates", [{}])[0].get("content", {}).get("parts", [])
                return "".join(p.get("text", "") for p in parts if not p.get("thought"))
            chi_tiet = r.text[:300]
            if "API_KEY_INVALID" in chi_tiet or "API key not valid" in chi_tiet:
                raise SystemExit("GEMINI_API_KEY khong hop le — copy lai key tu aistudio.google.com/apikey")
            if r.status_code in (400, 404) and not self.dang_dung:
                loi.append(f"{mo_hinh}: HTTP {r.status_code}")
                continue  # model khong co -> thu model sau
            raise RuntimeError(f"Gemini HTTP {r.status_code} ({mo_hinh}): {chi_tiet}")
        co = [m for m in self._liet_ke() if "gemini" in m]
        raise SystemExit("Khong model nao trong danh sach dung duoc:\n  " + "\n  ".join(loi)
                         + "\nModel key cua ban dung duoc: " + (", ".join(co) or "(khong lay duoc danh sach)")
                         + "\nChay lai voi: --he gemini:<ten model o tren>")


class OpenAIGiong:
    """May chu kieu OpenAI: vLLM, Ollama (http://localhost:11434/v1), LM Studio..."""

    def __init__(self, goc: str, mo_hinh: str):
        import requests

        self.rq, self.goc, self.mo_hinh = requests, goc.rstrip("/"), mo_hinh

    def __call__(self, ms: list[dict]) -> str:
        r = self.rq.post(f"{self.goc}/chat/completions", timeout=120,
                         headers={"Authorization": f"Bearer {os.environ.get('OPENAI_API_KEY', 'x')}"},
                         json={"model": self.mo_hinh, "messages": ms, "temperature": 0, "max_tokens": 256})
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


class HF:
    """transformers tai cho (Kaggle / Colab). --bon-bit: nen 4-bit (bitsandbytes) cho GPU 16 GB."""

    def __init__(self, mo_hinh: str, bon_bit: bool = False, adapter: str | None = None):
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        self.torch = torch
        self.tk = AutoTokenizer.from_pretrained(adapter or mo_hinh)
        kw: dict = {"device_map": "auto", "torch_dtype": torch.float16}
        if bon_bit:
            from transformers import BitsAndBytesConfig

            kw["quantization_config"] = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
                                                           bnb_4bit_compute_dtype=torch.float16)
        self.m = AutoModelForCausalLM.from_pretrained(mo_hinh, **kw)
        if adapter:
            from peft import PeftModel

            self.m = PeftModel.from_pretrained(self.m, adapter)
        self.m.eval()

    def __call__(self, ms: list[dict]) -> str:
        x = self.tk.apply_chat_template(ms, add_generation_prompt=True, return_tensors="pt").to(self.m.device)
        with self.torch.no_grad():
            y = self.m.generate(x, max_new_tokens=128, do_sample=False, pad_token_id=self.tk.eos_token_id)
        return self.tk.decode(y[0, x.shape[1]:], skip_special_tokens=True)


class T5:
    """ViT5 da fine-tune: dau vao = chuoi dau_vao, dau ra = cau (khong JSON)."""

    def __init__(self, duong_dan: str):
        import torch
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        self.torch = torch
        self.tk = AutoTokenizer.from_pretrained(duong_dan)
        self.m = AutoModelForSeq2SeqLM.from_pretrained(duong_dan).to("cuda" if torch.cuda.is_available() else "cpu").eval()

    def __call__(self, ms: list[dict]) -> str:
        x = self.tk(ms[-1]["content"], return_tensors="pt", truncation=True, max_length=256).to(self.m.device)
        with self.torch.no_grad():
            y = self.m.generate(**x, max_new_tokens=64, num_beams=4)
        return json.dumps({"cau": self.tk.decode(y[0], skip_special_tokens=True), "chon": []}, ensure_ascii=False)


def tao_he(spec: str, a) -> object:
    loai, _, con_lai = spec.partition(":")
    if loai == "gemini":
        return Gemini(con_lai or "gemini-3.1-flash-lite")
    if loai == "openai":
        # ten model co the chua ":" (vd Ollama "qwen2.5:7b") -> tach o dau ":" ngay sau duong dan /v1
        m = re.match(r"^(https?://[^\s]*?/v\d+):(.+)$", con_lai)
        if not m:
            raise SystemExit("Dang dung: openai:<goc>/v1:<model>, vd openai:http://localhost:11434/v1:qwen2.5:7b")
        return OpenAIGiong(m.group(1), m.group(2))
    if loai == "hf":
        return HF(con_lai, a.bon_bit, a.adapter)
    if loai == "t5":
        return T5(con_lai)
    raise SystemExit(f"Khong biet he '{spec}'")


def main(argv: list[str] | None = None, he=None) -> dict:
    """argv: nhu dong lenh. he: ham ms -> chuoi da nap san (notebook dung de khong nap lai mo hinh)."""
    ap = argparse.ArgumentParser()
    ap.add_argument("--he", required=True, help="noi-tho | quy-tac | gemini:<model> | openai:<url>:<model> | hf:<model> | t5:<path>")
    ap.add_argument("--dieu-kien", default="quy-tac+few", choices=DIEU_KIEN)
    ap.add_argument("--dau-vao", default="nhieu", choices=["sach", "nhieu"])
    ap.add_argument("--du-doan", default=str(THU_MUC / "du_doan_test.jsonl"))
    ap.add_argument("--so-vi-du", type=int, default=8)
    ap.add_argument("--truy-xuat", action="store_true", help="chon vi du giong cau hoi nhat (AulSign)")
    ap.add_argument("--kho-vi-du", default=str(THU_MUC / "sinh" / "train.jsonl"))
    ap.add_argument("--bon-bit", action="store_true")
    ap.add_argument("--adapter")
    ap.add_argument("--ten", help="ten tep ket qua (mac dinh tu dong)")
    a = ap.parse_args(argv)

    tap = dau_vao_kiem_tra(a.dau_vao, a.du_doan)
    khong_llm = a.he in ("noi-tho", "quy-tac")
    ten = a.ten or (f"{a.he}_{a.dau_vao}" if khong_llm else
                    f"{a.he.replace('/', '-').replace(':', '_')}_{a.dieu_kien}{'_truy-xuat' if a.truy_xuat else ''}_{a.dau_vao}")
    ra_dir = THU_MUC / "ket-qua"
    ra_dir.mkdir(parents=True, exist_ok=True)

    kho: list[dict] = []
    if not khong_llm and "few" in a.dieu_kien:
        if not Path(a.kho_vi_du).exists():
            raise SystemExit(f"Chua co {a.kho_vi_du} — chay: python tao_du_lieu.py")
        kho = [json.loads(d) for d in open(a.kho_vi_du, encoding="utf-8")]
    vd_co_dinh = chon_vi_du(kho, a.so_vi_du)
    if he is None and not khong_llm:
        he = tao_he(a.he, a)

    with open(ra_dir / f"{ten}.jsonl", "w", encoding="utf-8") as f:
        for i, x in enumerate(tap):
            if a.he == "noi-tho":
                kq = {"cau": noi_tho(top1(x["vi_tri"])), "chon": top1(x["vi_tri"]), "loi": None, "tho": ""}
            elif a.he == "quy-tac":
                kq = {"cau": gloss_sang_cau(top1(x["vi_tri"])), "chon": top1(x["vi_tri"]), "loi": None, "tho": ""}
            else:
                vd = chon_vi_du(kho, a.so_vi_du, truy_van=x) if a.truy_xuat else vd_co_dinh
                tho = he(tin_nhan(a.dieu_kien, x["dau_vao"], vd))
                kq = {**doc_tra_loi(tho), "tho": tho}
            f.write(json.dumps({"id": x["id"], "cau_du_doan": kq["cau"], "chon": kq["chon"],
                                "loi": kq["loi"], "tho": kq["tho"]}, ensure_ascii=False) + "\n")
            if not khong_llm and (i + 1) % 20 == 0:
                print(f"  {i + 1}/{len(tap)}")

    kq = danh_gia.danh_gia_tep(ra_dir / f"{ten}.jsonl", TAP)
    t = kq["TAT CA"]
    dong = f"| {ten} | {t['chrF++']} | {t['BLEU']} | {t['Khop']} | {t['F1 tu']} | {t.get('loi_json', 0)} |"
    tong = ra_dir / "tong-ket.md"
    if not tong.exists():
        tong.write_text("| He thong | chrF++ | BLEU | Khop | F1 tu | Loi JSON |\n|---|---|---|---|---|---|\n", encoding="utf-8")
    with open(tong, "a", encoding="utf-8") as g:
        g.write(dong + "\n")
    print(danh_gia.bang({ten: kq}))
    print("\nTheo dang cau (chrF++ / F1 tu):")
    for k, v in kq.items():
        if k != "TAT CA":
            print(f"  {k:<26} n={v['n']:<3} {v['chrF++']:>6} / {v['F1 tu']}")
    return kq


if __name__ == "__main__":
    main()
