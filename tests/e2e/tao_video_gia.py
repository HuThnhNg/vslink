"""Tao video mau GIA LAP cho kiem thu trinh duyet (may cham khong vao duoc QIPEDC).
Mot "nguoi que" ve vong tron bang tay phai, kem dong chu ghi ro la video gia lap.
Chay: python tests/e2e/tao_video_gia.py  (can Pillow + ffmpeg co libvpx-vp9)."""
import math
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H, FPS, GIAY = 480, 360, 15, 2.4
RA = Path(__file__).parent / "tai-nguyen" / "video-gia.webm"


def phong(co):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"]:
        if Path(p).exists():
            return ImageFont.truetype(p, co)
    return ImageFont.load_default()


def khung(t):
    im = Image.new("RGB", (W, H), (233, 242, 251))
    d = ImageDraw.Draw(im)
    d.rectangle([0, H - 60, W, H], fill=(212, 230, 247))
    cx, vai_y = W // 2, 150
    xanh, da = (54, 128, 194), (255, 214, 170)
    d.rounded_rectangle([cx - 70, vai_y - 10, cx + 70, H], radius=40, fill=xanh)  # than
    d.ellipse([cx - 38, 62, cx + 38, 138], fill=da)  # dau
    d.ellipse([cx - 16, 92, cx - 8, 102], fill=(40, 40, 40))
    d.ellipse([cx + 8, 92, cx + 16, 102], fill=(40, 40, 40))
    d.arc([cx - 14, 104, cx + 14, 124], 20, 160, fill=(40, 40, 40), width=3)
    # tay trai (ben phai anh) ha xuong
    d.line([cx + 62, vai_y, cx + 80, 240, cx + 76, 300], fill=xanh, width=18, joint="curve")
    d.ellipse([cx + 64, 290, cx + 90, 316], fill=da)
    # tay phai (ben trai anh) ve vong tron truoc nguc
    g = 2 * math.pi * t / GIAY * 1.5
    hx, hy = cx - 40 + 45 * math.sin(g), 175 - 35 * math.cos(g)
    kx, ky = (cx - 62 + hx) / 2 - 25, (vai_y + hy) / 2 + 30
    d.line([cx - 62, vai_y, kx, ky, hx, hy], fill=xanh, width=18, joint="curve")
    d.ellipse([hx - 16, hy - 16, hx + 16, hy + 16], fill=da)
    d.text((W // 2, H - 30), "VIDEO MẪU GIẢ LẬP (chỉ dùng khi kiểm thử)", font=phong(17), fill=(36, 95, 152), anchor="mm")
    return im


with tempfile.TemporaryDirectory() as tam:
    n = int(GIAY * FPS)
    for i in range(n):
        khung(i / FPS).save(f"{tam}/{i:04d}.png")
    RA.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", f"{tam}/%04d.png",
                    "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "40", "-pix_fmt", "yuv420p", str(RA)], check=True)
print(RA, RA.stat().st_size, "byte")
