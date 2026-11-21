"""
Pembuat gambar raster StudyTrack: ikon PWA (192/512) dan gambar OG (1200x630).

Jalankan: python tools/buat-gambar.py
Hasil: assets/img/ikon-192.png, ikon-512.png, og.png
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

AKAR = Path(__file__).resolve().parent.parent
KELUAR = AKAR / "assets" / "img"
KELUAR.mkdir(parents=True, exist_ok=True)

UNGU = (109, 74, 255)
PINK = (255, 122, 184)
PUTIH = (255, 255, 255)


def gradien(ukuran, kiri, kanan):
    """Gradien diagonal sederhana."""
    w, h = ukuran
    g = Image.new("RGB", (w, h))
    px = g.load()
    for y in range(h):
        for x in range(w):
            t = (x / w + y / h) / 2
            px[x, y] = (
                int(kiri[0] + (kanan[0] - kiri[0]) * t),
                int(kiri[1] + (kanan[1] - kiri[1]) * t),
                int(kiri[2] + (kanan[2] - kiri[2]) * t),
            )
    return g


def ikon(ukuran):
    s = ukuran
    dasar = gradien((s, s), (154, 123, 255), (255, 122, 184))
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.235), fill=255)
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    im.paste(dasar, (0, 0), mask)
    d = ImageDraw.Draw(im)

    # buku terbuka
    m = s * 0.20
    d.polygon(
        [(m, s * 0.30), (s * 0.48, s * 0.30), (s * 0.48, s * 0.74), (m, s * 0.70)],
        fill=PUTIH,
    )
    d.polygon(
        [(s - m, s * 0.30), (s * 0.52, s * 0.30), (s * 0.52, s * 0.74), (s - m, s * 0.70)],
        fill=(255, 224, 240),
    )
    d.rounded_rectangle([s * 0.485, s * 0.29, s * 0.515, s * 0.745], radius=s * 0.012, fill=(255, 255, 255, 190))
    # titik kuning
    d.ellipse([s * 0.70, s * 0.13, s * 0.83, s * 0.26], fill=(245, 165, 36))
    im.save(KELUAR / f"ikon-{s}.png")
    print("ikon", s, "ok")


def font(tebal, ukuran):
    for nama in (["seguisb.ttf", "segoeuib.ttf"] if tebal else ["segoeui.ttf"]):
        p = Path("C:/Windows/Fonts") / nama
        if p.exists():
            return ImageFont.truetype(str(p), ukuran)
    return ImageFont.load_default()


def og():
    w, h = 1200, 630
    im = gradien((w, h), (24, 20, 44), (58, 36, 110))
    d = ImageDraw.Draw(im, "RGBA")

    # cahaya lembut
    for r, a in ((520, 26), (380, 22), (240, 18)):
        d.ellipse([w * 0.62 - r, -r * 0.5, w * 0.62 + r, h * 0.9], fill=(124, 92, 245, a))

    # teks
    d.text((84, 150), "StudyTrack", font=font(True, 96), fill=PUTIH)
    d.text((88, 268), "Analisis kebiasaan belajar mahasiswa", font=font(False, 40), fill=(214, 204, 255))
    d.text((88, 318), "dengan K-Means clustering", font=font(False, 40), fill=(214, 204, 255))

    # chip
    x = 88
    for teks in ("k = 3", "silhouette 0,355", "90 responden", "6 variabel"):
        f = font(True, 24)
        tw = d.textlength(teks, font=f)
        d.rounded_rectangle([x, 400, x + tw + 44, 452], radius=26, fill=(255, 255, 255, 28))
        d.text((x + 22, 414), teks, font=f, fill=(235, 228, 255))
        x += tw + 60

    d.text((88, 528), "UIN K.H. Abdurrahman Wahid Pekalongan  ·  SSD30", font=font(False, 26), fill=(170, 158, 210))

    # ilustrasi scatter
    import random

    random.seed(7)
    pusat = [((880, 300), UNGU), ((1010, 220), (245, 165, 36)), ((980, 430), (239, 91, 125))]
    for (cx, cy), warna in pusat:
        for _ in range(16):
            dx = random.gauss(0, 46)
            dy = random.gauss(0, 42)
            d.ellipse([cx + dx - 7, cy + dy - 7, cx + dx + 7, cy + dy + 7], fill=warna + (215,))
        d.ellipse([cx - 11, cy - 11, cx + 11, cy + 11], fill=PUTIH)

    im.save(KELUAR / "og.png", optimize=True)
    print("og ok")


ikon(192)
ikon(512)
og()
