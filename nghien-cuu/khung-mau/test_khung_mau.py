"""Kiem thu o xuat khung xuong mau tren mot bo du lieu GIA cung cau truc VSL400.

    cd nghien-cuu/khung-mau && python -m pytest -q
"""
import json
import shutil
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

import xuat_khung_mau_kaggle as X

GOC_REPO = Path(__file__).resolve().parents[2]
NHAN = json.loads((GOC_REPO / "src/lib/du-lieu/nhan.json").read_text(encoding="utf-8"))
# vi tri co tay phai (theo vai: goc = giua hai vai, don vi = do rong vai) cua 3 tu gia
TAM_TU = {0: (-0.2, 0.6), 1: (-0.6, -1.2), 2: (-1.4, 1.6)}


def nguoi(T, co_tay_phai, lech=(0.0, 0.0), co=1.0, guong=False, mat_tay_phai=False, rng=None):
    """Mot lan ky gia: vai ngang, tay phai di theo quy dao co_tay_phai(t) (toa do theo vai)."""
    rng = rng or np.random.default_rng(0)
    vai = 0.25 * co
    cx, cy = 0.5 + lech[0], 0.45 + lech[1]
    pose = np.zeros((T, 33, 4), np.float32)
    trai = np.zeros((T, 21, 3), np.float32)
    phai = np.full((T, 21, 3), np.nan, np.float32) if mat_tay_phai else np.zeros((T, 21, 3), np.float32)
    for t in range(T):
        u = t / max(T - 1, 1)
        dx, dy = co_tay_phai(u)
        if guong:
            dx = -dx
        pose[t, 0, :2] = (cx, cy - 0.9 * vai)                  # mui
        pose[t, 7, :2] = (cx + 0.3 * vai, cy - 0.85 * vai)     # tai
        pose[t, 8, :2] = (cx - 0.3 * vai, cy - 0.85 * vai)
        pose[t, 11, :2] = (cx + vai / 2, cy)                   # vai trai (ben PHAI anh)
        pose[t, 12, :2] = (cx - vai / 2, cy)
        pose[t, 15, :2] = (cx + 0.7 * vai, cy + 1.8 * vai)     # tay trai buong
        pose[t, 13, :2] = (cx + 0.65 * vai, cy + 0.9 * vai)
        ct = np.array([cx + dx * vai, cy + dy * vai])
        pose[t, 16, :2] = ct
        pose[t, 14, :2] = (np.array([cx - vai / 2, cy]) + ct) / 2
        for k in (18, 20, 22):
            pose[t, k, :2] = ct + (0.01, -0.02)
        pose[t, :, 3] = 1.0
        trai[t, :, :2] = pose[t, 15, :2] + np.linspace(0, 0.03, 21)[:, None]
        if not mat_tay_phai:
            phai[t, :, :2] = ct + np.linspace(0, 0.04, 21)[:, None] * (1, -1)
    nhieu = lambda a: a + rng.normal(0, 0.002, a.shape).astype(np.float32)
    pose[..., :2] = nhieu(pose[..., :2])
    trai[..., :2] = nhieu(trai[..., :2])
    if not mat_tay_phai:
        phai[..., :2] = nhieu(phai[..., :2])
    return pose, trai, phai


def quy_dao(c):
    x0, y0 = TAM_TU[c]
    return lambda u: (x0 + 0.3 * np.sin(2 * np.pi * u), y0 + 0.2 * np.cos(2 * np.pi * u))


@pytest.fixture()
def du_lieu(tmp_path):
    goc = tmp_path / "vao" / "vsl400"
    (goc / "keypoints" / "Part_1_front").mkdir(parents=True)
    dong = []
    rng = np.random.default_rng(1)
    vid = 0
    for c in TAM_TU:
        for k in range(7):
            vid += 1
            kieu = dict(lech=tuple(rng.uniform(-0.05, 0.05, 2)), co=rng.uniform(0.85, 1.15))
            if k == 5:
                kieu["guong"] = True            # nguoi thuan tay trai: khong duoc chon
            if k == 6:
                kieu["mat_tay_phai"] = True     # mat tay: khong duoc chon
            T = int(rng.integers(45, 90))
            pose, trai, phai = nguoi(T, quy_dao(c), rng=rng, **kieu)
            np.savez(goc / "keypoints" / "Part_1_front" / f"{vid:06d}.npz", pose=pose, left_hand=trai, right_hand=phai)
            dong.append(dict(row=vid, part=1, video_id=vid, signer_id=k + 1, label=c, gloss=NHAN[c]))
    pd.DataFrame(dong).to_csv(goc / "index.csv", index=False)
    (goc / "labels.json").write_text(json.dumps(NHAN, ensure_ascii=False), encoding="utf-8")
    return tmp_path


def cham_gia(Xs):
    """Mo hinh gia: doan tu theo vi tri trung binh co tay phai (theo vai). Xac suat 0,9."""
    P = np.full((len(Xs), 400), 0.1 / 399)
    for i, kp in enumerate(Xs):
        s = X.chuan_so_sanh(kp)
        if s is None:
            P[i] = 1 / 400
            continue
        x, m = s
        ct = 16 - 11                                  # co tay phai trong SO_SANH (bat dau tu 11)
        ok = m[:, ct]
        if not ok.any():
            P[i] = 1 / 400
            continue
        tb = x[ok, ct].mean(0)
        c = min(TAM_TU, key=lambda k: np.hypot(*(tb - TAM_TU[k])))
        P[i, c] = 0.9
    return P


def test_lay_60_khung_giong_web():
    noi = np.arange(37 * 75 * 2, dtype=np.float32).reshape(37, 75, 2)
    ra = X.lay_60_khung(noi)
    assert ra.shape == (60, 75, 2)
    assert np.array_equal(ra, noi[np.linspace(0, 36, 60).astype(int)])


def test_ma_hoa_giai_ma():
    kp = np.random.default_rng(0).uniform(-0.2, 1.2, (60, 75, 2)).astype(np.float32)
    kp[3, 40] = 0                                         # diem mat
    b = X.ma_hoa(kp)
    assert len(b) == 60 * 75 * 2 * 2
    lai = X.giai_ma(b)
    assert np.abs(lai - kp).max() <= 0.5 / X.TI_LE + 1e-7
    assert (lai[3, 40] == 0).all()


def test_chon_lan_ky_tieu_bieu_va_xuat(du_lieu):
    vao, ra = du_lieu / "vao", du_lieu / "ra"
    dd = X.tim_dau_vao(vao)
    chi_muc = X.chay(dd=dd, cham=cham_gia, ra=ra, so_luong=1)
    assert set(chi_muc["tu"]) == {"0", "1", "2"}
    for c in ("0", "1", "2"):
        m = chi_muc["tu"][c]
        assert m["kiem_chung"] and m["hang"] == 1 and m["p_hien_thi"] >= 0.5
        b = (ra / "khung-mau" / f"{int(c):03d}.bin").read_bytes()
        kp = X.giai_ma(b)
        co = X.co_mat(kp)
        # khong chon lan ky mat tay phai; vai da duoc can giua, rong 0,30
        assert co[:, 54:75].all()
        vai = np.median(np.linalg.norm(kp[:, 11] - kp[:, 12], axis=-1))
        assert abs(vai - X.VAI_HIEN_THI) < 0.01
        assert abs(np.median((kp[:, 11, 0] + kp[:, 12, 0]) / 2) - 0.5) < 0.01
        # co tay phai o ben TRAI anh (khong lay ban guong)
        assert np.median(kp[:, 16, 0]) < 0.5
    assert (ra / "khung-mau.zip").exists()
    doc = json.loads((ra / "khung-mau" / "chi-muc.json").read_text(encoding="utf-8"))
    assert doc["so_khung"] == 60 and doc["so_diem"] == 75 and doc["ti_le"] == 10000


def test_khong_co_mo_hinh_thi_khong_kiem_chung(du_lieu):
    dd = X.tim_dau_vao(du_lieu / "vao")
    chi_muc = X.chay(dd=dd, cham=lambda Xs: None, ra=du_lieu / "ra2", so_luong=1)
    assert not any(m["kiem_chung"] for m in chi_muc["tu"].values())


@pytest.mark.skipif(not (GOC_REPO / "static/models/vsl400.onnx").exists(), reason="chua co vsl400.onnx")
def test_chay_voi_mo_hinh_that(du_lieu):
    pytest.importorskip("onnxruntime")
    shutil.copy(GOC_REPO / "static/models/vsl400.onnx", du_lieu / "vao" / "vsl400.onnx")
    dd = X.tim_dau_vao(du_lieu / "vao")
    assert dd["onnx"] is not None
    chi_muc = X.chay(dd=dd, ra=du_lieu / "ra3", so_luong=1)
    # du lieu gia: mo hinh that khong nhan ra -> khong tu nao duoc kiem chung, nhung van chay het
    assert set(chi_muc["tu"]) == {"0", "1", "2"}
    assert all("p" in m and "p_hien_thi" in m for m in chi_muc["tu"].values())
