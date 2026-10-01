"""Doan code DAN VAO notebook huan luyen tren Kaggle de xuat top-5 cua tap kiem tra VSL400.

Ket qua: du_doan_test.jsonl — moi dong la MOT video kiem tra:
  {"nhan": "Phở", "top": [["Phở", 0.5512], ["Bún", 0.3021], ["Xôi", 0.05], ...]}
Chep tep nay vao nghien-cuu/ghep-cau/du-lieu/du_doan_test.jsonl roi chay lai tao_du_lieu.py:
nhieu trong du lieu huan luyen se la nhieu THAT cua mo hinh thay vi gia lap.

Chon MOT trong hai cach, tuy notebook dang co gi:

Cach 1 — da co ma tran xac suat (N, 400) va nhan dung (N,) cua tap kiem tra:
    xuat_tu_xac_suat(xac_suat, nhan_dung, ten_nhan)

Cach 2 — chi co toa do keypoint (N, 60, 75, 2) cua tap kiem tra + tep vsl400.onnx:
    xuat_tu_onnx("vsl400.onnx", X_test, y_test, ten_nhan)

ten_nhan: list 400 nhan DUNG THU TU dau ra mo hinh (= src/lib/du-lieu/nhan.json).
Neu dau ra la logit (chua softmax), ham tu doi sang xac suat.
"""
import json

import numpy as np


def _softmax(x):
    x = x - x.max(axis=1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=1, keepdims=True)


def xuat_tu_xac_suat(xac_suat, nhan_dung, ten_nhan, tep="du_doan_test.jsonl", k=5):
    p = np.asarray(xac_suat, dtype=np.float64)
    if (p < 0).any() or not np.allclose(p.sum(axis=1), 1, atol=1e-3):
        p = _softmax(p)
    y = np.asarray(nhan_dung)
    assert p.shape[1] == len(ten_nhan) == 400, p.shape
    dung1 = dung5 = 0
    with open(tep, "w", encoding="utf-8") as f:
        for hang, yi in zip(p, y):
            top = np.argsort(-hang)[:k]
            dung1 += int(top[0] == yi)
            dung5 += int(yi in top)
            f.write(json.dumps({"nhan": ten_nhan[int(yi)],
                                "top": [[ten_nhan[int(j)], round(float(hang[j]), 4)] for j in top]},
                               ensure_ascii=False) + "\n")
    n = len(y)
    print(f"Da ghi {n} dong vao {tep} — top-1 {dung1 / n:.2%}, top-5 {dung5 / n:.2%}")
    print("Hai so tren phai khop so lieu cua notebook (89,51 % / 97,81 %); lech nhieu = sai thu tu nhan.")


def xuat_tu_onnx(tep_onnx, X, y, ten_nhan, tep="du_doan_test.jsonl", lo=64):
    import onnxruntime as ort

    s = ort.InferenceSession(tep_onnx)
    ten_vao = s.get_inputs()[0].name
    X = np.asarray(X, dtype=np.float32)
    ra = [s.run(None, {ten_vao: X[i : i + lo]})[0] for i in range(0, len(X), lo)]
    xuat_tu_xac_suat(np.concatenate(ra), y, ten_nhan, tep)
