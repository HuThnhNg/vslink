# =============================================================================
# O PHU — Xuat KHUNG XUONG MAU cho web VSLink (dung cho tu chua co video mau)
#
# Moi tu chon MOT lan ky THAT trong VSL400 (goc chinh dien) lam mau:
#   1. Chi xet cac lan ky ma CHINH mo hinh cua web (vsl400.onnx) nhan dung hang 1
#      va chac >= 50 % -> dung "cach Meo cham".
#   2. Trong so do lay lan ky TIEU BIEU NHAT (medoid): lan ky gan voi moi lan ky
#      khac cua tu do nhat, so tren vai -> co tay -> 42 diem ban tay, da dua ve
#      cung vi tri vai / do rong vai.
#   3. Kiem lai: ban se hien tren web (da can giua, lam muot nhe, lam tron int16)
#      chay qua mo hinh van phai dung hang 1 va >= 50 %.
#   KHONG lay trung binh nhieu nguoi: trung binh lam mo hinh dang ban tay, thu nho
#   bien do chuyen dong (cac lan ky lech nhip triet tieu nhau) va nguoi thuan tay
#   trai / phai triet tieu nhau.
#
# Chay DOC LAP tren Kaggle: notebook moi -> Add Input dataset keypoint VSL400 (co
# Part_*_front, index.csv, labels.json — giong notebook cuoi) -> Settings: bat
# Internet (de tai vsl400.onnx tu web VSLink; hoac Add Input mot tep vsl400.onnx)
# -> dan TOAN BO tep nay vao mot o -> Run. CPU la du, khoang 2-5 phut.
#
# Ra: /kaggle/working/khung-mau.zip (tab Output). Giai nen vao vslink/static/du-lieu/
#     -> static/du-lieu/khung-mau/chi-muc.json + 000.bin ... 399.bin
#
# Dinh dang moi tep .bin: 60 khung x 75 diem x (x, y), int16 little-endian, toa do
# x 10000 trong khung vuong; (0, 0) = khong bat duoc diem do. Web chi dung tu co
# "kiem_chung": true trong chi-muc.json.
# =============================================================================
import json
import os
import subprocess
import sys
import time
import urllib.request
import zipfile
from concurrent.futures import ProcessPoolExecutor
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

GOC_VAO = Path(os.environ.get("VSL_DAU_VAO", "/kaggle/input"))
GOC_RA = Path(os.environ.get("VSL_RA", "/kaggle/working"))
URL_ONNX = "https://huthnhng.github.io/vslink/models/vsl400.onnx"
FPS_GOC = 30           # tep keypoint khong ghi fps -> gia dinh 30 (chi dung de phat dung nhip)
T_KHUNG, SO_KP = 60, 75
TI_LE = 10000          # toa do x 10000 -> int16
P_TOI_THIEU = 0.5      # chuan "Khop tot" giong cong cu video mau
PHAT_LECH = 1.0        # phat khi mot ben bat duoc diem, ben kia khong (don vi: do rong vai^2)
VAI_HIEN_THI = 0.30    # do rong vai tren khung hien thi (khung vuong 0..1), vai o giua, y = 0.5
BO_PHAN = ("pose", "left_hand", "right_hand")
SO_SANH = np.r_[11:23, 33:75]   # vai, khuyu, co tay, 3 diem tay tren pose + 42 diem ban tay


# ----------------------------------------------------------------------------- dau vao
def tim_dau_vao(goc=GOC_VAO):
    """Thu muc chua Part_*_front, index.csv, labels.json va (neu co) tep .onnx. Khong di vao Part_*."""
    kq = dict(keypoint=None, index_csv=None, labels_json=None, onnx=None)
    for thu_muc, con, tep in os.walk(goc):
        for d in con:
            if d.lower().startswith("part_") and d.lower().endswith("_front") and kq["keypoint"] is None:
                kq["keypoint"] = Path(thu_muc)
        con[:] = [d for d in con if not d.lower().startswith("part_")]
        for f in tep:
            fl = f.lower()
            if fl == "index.csv" and kq["index_csv"] is None:
                kq["index_csv"] = Path(thu_muc) / f
            elif fl == "labels.json" and kq["labels_json"] is None:
                kq["labels_json"] = Path(thu_muc) / f
            elif fl in ("vsl400.onnx", "mo_hinh.onnx") and kq["onnx"] is None:
                kq["onnx"] = Path(thu_muc) / f
    return kq


def lay_60_khung(noi):
    """(T, 75, >=2) -> (60, 75, 2) toa do tho, DUNG cach web va notebook lay mau:
    np.linspace(0, T - 1, 60).astype(int); NaN -> 0 (= khong bat duoc)."""
    kp = np.nan_to_num(np.asarray(noi, np.float32)[:, :, :2], nan=0.0, posinf=0.0, neginf=0.0)
    T = kp.shape[0]
    if T == 0:
        return None
    return kp[np.linspace(0, T - 1, T_KHUNG).astype(int)].astype(np.float32)


def doc_chinh_dien(args):
    """(thu muc keypoint, part, video_id) -> (mang (60, 75, 2) hoac None, so khung goc)."""
    goc, part, video_id = args
    dd = Path(goc) / f"Part_{int(part)}_front" / f"{int(video_id):06d}.npz"
    try:
        with np.load(dd) as z:
            if not set(BO_PHAN).issubset(z.files):
                return None, 0
            phan = [np.asarray(z[k], np.float32)[:, :, :2] for k in BO_PHAN]
        t = min(p.shape[0] for p in phan)
        return lay_60_khung(np.concatenate([p[:t] for p in phan], axis=1)), t
    except Exception:
        return None, 0


# ----------------------------------------------------------------------------- mo hinh
def nap_mo_hinh(duong_dan_co_san=None):
    """Tra ve ham cham(X (N,60,75,2)) -> xac suat (N,400), hoac None neu khong co mo hinh."""
    try:
        import onnxruntime as ort
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "onnxruntime"], check=False)
        try:
            import onnxruntime as ort
        except ImportError:
            print("  [!] Khong cai duoc onnxruntime -> khong kiem chung duoc bang mo hinh.")
            return None
    tep = Path(duong_dan_co_san) if duong_dan_co_san else None
    if tep is None or not tep.exists():
        tep = GOC_RA / "vsl400.onnx"
        if not tep.exists():
            try:
                print(f"  Tai mo hinh tu {URL_ONNX} ...")
                urllib.request.urlretrieve(URL_ONNX, tep)
            except Exception as e:
                print(f"  [!] Khong tai duoc mo hinh ({e}). Bat Internet hoac Add Input tep vsl400.onnx.")
                return None
    s = ort.InferenceSession(str(tep), providers=["CPUExecutionProvider"])
    ten = s.get_inputs()[0].name
    print(f"  Mo hinh: {tep}")

    def cham(X, lo=256):
        ra = []
        for i in range(0, len(X), lo):
            p = s.run(None, {ten: np.ascontiguousarray(X[i:i + lo], np.float32)})[0].astype(np.float64)
            if (p < 0).any() or not np.allclose(p.sum(1), 1, atol=1e-3):   # logit -> xac suat
                p = np.exp(p - p.max(1, keepdims=True))
                p /= p.sum(1, keepdims=True)
            ra.append(p)
        return np.concatenate(ra) if ra else np.zeros((0, 400))

    return cham


# ----------------------------------------------------------------------------- so sanh
def co_mat(kp):
    return ~((kp[..., 0] == 0) & (kp[..., 1] == 0))


def tam_va_vai(kp):
    """Trung diem hai vai (trung vi qua cac khung) va do rong vai; None neu it khung thay vai."""
    co = co_mat(kp)
    ok = co[:, 11] & co[:, 12]
    if ok.sum() < 5:
        return None
    rong = float(np.median(np.linalg.norm(kp[ok, 11] - kp[ok, 12], axis=-1)))
    if rong < 1e-3:
        return None
    return np.median((kp[ok, 11] + kp[ok, 12]) / 2, axis=0), rong, ok


def chuan_so_sanh(kp):
    """(60,75,2) tho -> ((60,54,2) theo vai, (60,54) co mat) de so cac lan ky; None neu thieu vai."""
    t = tam_va_vai(kp)
    if t is None:
        return None
    _, rong, ok = t
    tam = (kp[:, 11] + kp[:, 12]) / 2
    tam[~ok] = np.median(tam[ok], axis=0)
    x = (kp[:, SO_SANH] - tam[:, None]) / rong
    m = co_mat(kp)[:, SO_SANH]
    return np.where(m[..., None], x, 0.0).astype(np.float32), m


def ma_tran_khoang_cach(X, M):
    """X (n,T,K,2), M (n,T,K) -> D (n,n): sai so binh phuong trung binh tren diem hai ben
    cung co + PHAT_LECH x ti le diem chi mot ben co."""
    n = len(X)
    D = np.zeros((n, n), np.float64)
    for i in range(n):
        ca_hai = M & M[i]
        d2 = ((X - X[i]) ** 2).sum(-1)
        khop = (d2 * ca_hai).sum((1, 2)) / np.maximum(ca_hai.sum((1, 2)), 1)
        lech = (M ^ M[i]).mean((1, 2))
        D[i] = khop + PHAT_LECH * lech
    return D


def chon_dai_dien(X, M, ung_vien):
    """Chi so (trong X) cua lan ky tieu bieu nhat trong ung_vien: trung vi khoang cach toi
    MOI lan ky cua tu nho nhat."""
    D = ma_tran_khoang_cach(X[:, ::2], M[:, ::2])   # cach 1 khung lay 1 cho nhanh
    n = len(X)
    tot, chon = np.inf, None
    for i in ung_vien:
        khac = D[i, np.arange(n) != i]
        diem = float(np.median(khac)) if len(khac) else 0.0
        if diem < tot:
            tot, chon = diem, int(i)
    return chon


# ----------------------------------------------------------------------------- hien thi
def chuan_hien_thi(kp):
    """Dua ve khung vuong chung: vai o giua (y = 0,5), rong VAI_HIEN_THI; lam muot 3 khung
    lien ke khi ca ba deu bat duoc diem. Giu (0, 0) cho diem khong bat duoc."""
    t = tam_va_vai(kp)
    co = co_mat(kp)
    if t is None:
        return np.where(co[..., None], kp, 0.0).astype(np.float32)
    (cx, cy), rong, _ = t
    k = VAI_HIEN_THI / rong
    ra = np.stack([0.5 + (kp[..., 0] - cx) * k, 0.5 + (kp[..., 1] - cy) * k], -1)
    ra = np.where(co[..., None], ra, 0.0)
    muot = ra.copy()
    ba = co[:-2] & co[1:-1] & co[2:]
    muot[1:-1] = np.where(ba[..., None], (ra[:-2] + ra[1:-1] + ra[2:]) / 3, ra[1:-1])
    return muot.astype(np.float32)


def ma_hoa(kp):
    """(60,75,2) -> bytes int16 little-endian (x TI_LE). Diem co mat khong bao gio thanh (0, 0)."""
    co = co_mat(kp)
    q = np.clip(np.round(kp * TI_LE), -32767, 32767).astype(np.int16)
    trung_khong = co & (q[..., 0] == 0) & (q[..., 1] == 0)
    q[trung_khong] = 1
    q[~co] = 0
    return q.astype("<i2").tobytes()


def giai_ma(b):
    q = np.frombuffer(b, dtype="<i2").reshape(T_KHUNG, SO_KP, 2).astype(np.float32)
    return q / TI_LE


# ----------------------------------------------------------------------------- chay
def chay(dd=None, cham=None, ra=GOC_RA, so_luong=4):
    t0 = time.time()
    dd = dd or tim_dau_vao()
    assert dd["keypoint"] and dd["index_csv"] and dd["labels_json"], f"Thieu dau vao: {dd}"
    bang = pd.read_csv(dd["index_csv"])
    nhan = json.load(open(dd["labels_json"], encoding="utf-8"))
    assert len(nhan) == 400, f"labels.json phai co 400 nhan, dang co {len(nhan)}"
    print(f"Doc {len(bang):,} video (goc chinh dien) ...")
    viec = [(str(dd["keypoint"]), p, v) for p, v in zip(bang["part"], bang["video_id"])]
    try:   # doc song song (Linux "fork": ham dinh nghia trong notebook van dung duoc)
        import multiprocessing as mp
        with ProcessPoolExecutor(max_workers=so_luong, mp_context=mp.get_context("fork")) as ex:
            ket_qua = list(ex.map(doc_chinh_dien, viec, chunksize=64))
    except Exception as e:
        print(f"  (doc tuan tu vi: {e})")
        ket_qua = [doc_chinh_dien(v) for v in viec]
    co = np.array([k is not None for k, _ in ket_qua])
    X = np.zeros((len(bang), T_KHUNG, SO_KP, 2), np.float32)
    for i, (k, _) in enumerate(ket_qua):
        if k is not None:
            X[i] = k
    T_goc = np.array([t for _, t in ket_qua])
    y = bang["label"].to_numpy().astype(int)
    print(f"  doc duoc {co.sum():,}/{len(bang):,} video ({time.time() - t0:.0f}s)")

    if cham is None:
        cham = nap_mo_hinh(dd.get("onnx"))
    P = cham(X) if cham else None
    if P is not None:
        dung = P.argmax(1) == y
        print(f"  mo hinh tren moi video doc duoc: top-1 {dung[co].mean():.2%}")

    thu_muc = Path(ra) / "khung-mau"
    thu_muc.mkdir(parents=True, exist_ok=True)
    chi_muc = {"phien_ban": 1, "ngay": date.today().isoformat(),
               "nguon": "VSL400, goc chinh dien: mot lan ky that tieu bieu nhat moi tu",
               "so_khung": T_KHUNG, "so_diem": SO_KP, "ti_le": TI_LE, "fps_gia_dinh": FPS_GOC, "tu": {}}
    khong_dat = []
    for c in range(400):
        tat_ca = np.nonzero(co & (y == c))[0]
        chuan = [chuan_so_sanh(X[j]) for j in tat_ca]
        giu = [j for j, s in zip(tat_ca, chuan) if s is not None]
        chuan = [s for s in chuan if s is not None]
        if not giu:
            khong_dat.append(nhan[c])
            continue
        Xs = np.stack([s[0] for s in chuan])
        Ms = np.stack([s[1] for s in chuan])
        giu = np.asarray(giu)
        if P is not None:
            p_c = P[giu, c]
            hang1 = P[giu].argmax(1) == c
            uv = np.nonzero(hang1 & (p_c >= P_TOI_THIEU))[0]
            if len(uv) == 0:
                uv = np.nonzero(hang1)[0]
        else:
            uv = np.arange(len(giu))
        if len(uv) == 0:
            uv = np.arange(len(giu))
        k = chon_dai_dien(Xs, Ms, uv)
        j = int(giu[k])
        hien = chuan_hien_thi(X[j])
        b = ma_hoa(hien)
        (thu_muc / f"{c:03d}.bin").write_bytes(b)
        muc = {"so_mau": int(len(tat_ca)), "giay": round(float(T_goc[j]) / FPS_GOC, 2)}
        if P is not None:
            p_hien = cham(giai_ma(b)[None])[0]
            muc.update(
                p=round(float(P[j, c]), 3),
                hang=int((P[j] > P[j, c]).sum() + 1),
                so_dung=int((P[giu].argmax(1) == c).sum()),
                p_hien_thi=round(float(p_hien[c]), 3),
            )
            muc["kiem_chung"] = bool(muc["hang"] == 1 and muc["p"] >= P_TOI_THIEU
                                     and p_hien.argmax() == c and p_hien[c] >= P_TOI_THIEU)
        else:
            muc["kiem_chung"] = False
        if not muc["kiem_chung"]:
            khong_dat.append(nhan[c])
        chi_muc["tu"][str(c)] = muc
    (thu_muc / "chi-muc.json").write_text(json.dumps(chi_muc, ensure_ascii=False, indent=1), encoding="utf-8")

    # tu kiem: doc lai mot tep, so voi ban da ghi
    if chi_muc["tu"]:
        c0 = int(next(iter(chi_muc["tu"])))
        doc_lai = giai_ma((thu_muc / f"{c0:03d}.bin").read_bytes())
        assert doc_lai.shape == (T_KHUNG, SO_KP, 2)

    nen = Path(ra) / "khung-mau.zip"
    with zipfile.ZipFile(nen, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(thu_muc.iterdir()):
            z.write(f, f"khung-mau/{f.name}")
    dat = sum(m["kiem_chung"] for m in chi_muc["tu"].values())
    print(f"\nXong sau {time.time() - t0:.0f}s: {dat}/400 tu co khung xuong mau DA KIEM CHUNG.")
    if khong_dat:
        print(f"  {len(khong_dat)} tu chua dat (web se khong hien): {', '.join(khong_dat[:30])}"
              f"{' ...' if len(khong_dat) > 30 else ''}")
    print(f"  -> {nen} ({nen.stat().st_size / 1e6:.1f} MB). Tai ve, giai nen vao vslink/static/du-lieu/")
    return chi_muc


if __name__ == "__main__":
    chay()
