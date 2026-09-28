"""Vector kiem tra: dau vao keypoint + dau ra MONG DOI tinh bang ONNX Runtime (Python)
tren CHINH tep static/models/vsl400.onnx. Trang /kiem-tra chay lai bang ONNX Runtime
Web va so sanh -> chung minh duong suy dien tren trinh duyet khop Python."""
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort

GOC = Path(__file__).resolve().parents[2]
rng = np.random.default_rng(7)


def nguoi(T=60, thieu_trai=0.0):
    t = np.linspace(0, 1, T)
    kp = np.zeros((T, 75, 2), np.float32)
    kp[:, 0] = (0.5, 0.3)
    for i in range(1, 11):
        kp[:, i] = (0.47 + 0.006 * i, 0.28 + (0.04 if i > 8 else 0))
    kp[:, 11], kp[:, 12] = (0.6, 0.45), (0.4, 0.45)
    kp[:, 23], kp[:, 24] = (0.57, 0.75), (0.43, 0.75)
    for i in range(25, 33):
        kp[:, i] = (0.45 + 0.01 * (i - 25), 0.95)
    phai = np.stack([0.42 + 0.08 * np.sin(2 * np.pi * t), 0.5 - 0.06 * np.cos(2 * np.pi * t)], -1)
    trai = np.stack([0.62 + 0.01 * t, 0.8 - 0.02 * t], -1)
    kp[:, 13], kp[:, 14] = (kp[:, 11] + trai) / 2, (kp[:, 12] + phai) / 2
    kp[:, 15], kp[:, 16] = trai, phai
    for j, (a, b) in enumerate([(17, 18), (19, 20), (21, 22)]):
        kp[:, a] = trai + (0.01 * (j + 1), -0.02)
        kp[:, b] = phai + (0.01 * (j + 1), -0.02)
    hinh = rng.uniform(-0.03, 0.03, (21, 2))
    kp[:, 33:54] = trai[:, None] + hinh * 0.8
    kp[:, 54:75] = phai[:, None] + hinh * (1 + 0.3 * np.sin(4 * np.pi * t))[:, None, None]
    kp += rng.normal(0, 0.002, kp.shape).astype(np.float32) * (kp != 0)
    if thieu_trai:
        kp[rng.random(T) < thieu_trai, 33:54] = 0
    return np.round(kp, 6).astype(np.float32)


s = ort.InferenceSession(str(GOC / "static/models/vsl400.onnx"), providers=["CPUExecutionProvider"])
ca = []
for ten, x in [("nguoi gia lap", nguoi()[None]),
               ("thieu tay trai 50 %", nguoi(thieu_trai=0.5)[None]),
               ("toan 0 (khong co ai)", np.zeros((1, 60, 75, 2), np.float32)),
               ("batch 3", np.stack([nguoi(), nguoi(thieu_trai=0.3), nguoi()[::-1].copy()]))]:
    p = s.run(None, {"keypoints": x})[0]
    ca.append(dict(ten=ten, hinh=list(x.shape), keypoints=x.reshape(-1).tolist(),
                   probs=np.round(p, 8).reshape(-1).tolist(),
                   top1=[int(v) for v in p.argmax(1)]))
    print(f"{ten:<24} top1 {p.argmax(1)} p {p.max(1).round(4)}")
json.dump(dict(ghi_chu="Sinh boi scripts/du-lieu/tao_vector_kiem_tra.py bang onnxruntime (Python) "
                       f"{ort.__version__}", ca=ca),
          open(GOC / "static/kiem-tra/vector.json", "w"), separators=(",", ":"))
print((GOC / "static/kiem-tra/vector.json").stat().st_size / 1e6, "MB")
