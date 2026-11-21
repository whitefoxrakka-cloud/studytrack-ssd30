/* ============================================================
   grafik.js — pembuat grafik SVG tanpa pustaka luar
   Setiap grafik membawa kelas animasi (lihat app.css):
     .bt batang tumbuh · .bh batang horizontal · .gj garis digambar
     .tk titik muncul    · .rd radar mengembang
   ============================================================ */
(function (global) {
  "use strict";

  const W = 320;
  const fmt = (v) => String(Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10).replace(".", ",");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  /* bulatkan batas atas sumbu ke angka enak dibaca */
  function maksRapi(v) {
    if (!isFinite(v) || v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    const f = n <= 1.2 ? 1.2 : n <= 1.5 ? 1.5 : n <= 2 ? 2 : n <= 3 ? 3 : n <= 4 ? 4 : n <= 5 ? 5 : n <= 8 ? 8 : 10;
    return f * p;
  }

  /* Cincin progres */
  function ring(persen, warna, opsi) {
    opsi = opsi || {};
    const r = 40, c = 2 * Math.PI * r;
    const p = Math.min(100, Math.max(0, Number(persen) || 0));
    const ke = c * (1 - p / 100);
    return (
      '<svg viewBox="0 0 100 100" class="ring" role="img" aria-label="' + fmt(p) + ' persen">' +
      '<circle class="ring-bg" cx="50" cy="50" r="' + r + '"></circle>' +
      '<circle class="ring-fg" cx="50" cy="50" r="' + r + '" transform="rotate(-90 50 50)" ' +
      'style="stroke-dasharray:' + c.toFixed(1) + ";--dari:" + c.toFixed(1) + ";--ke:" + ke.toFixed(1) + ";stroke:" + warna + '"></circle>' +
      '<text class="ring-angka" x="50" y="57" text-anchor="middle" style="fill:' + (opsi.teks || "var(--text)") + '">' +
      '<tspan data-naik="' + (Math.round(p * 10) / 10) + '" data-desim="0">0</tspan>%</text>' +
      "</svg>"
    );
  }

  /* Batang vertikal */
  function batang(data, opsi) {
    opsi = opsi || {};
    const H = opsi.tinggi || 150;
    const kiri = 26, kanan = 6, atas = 12, bawah = 24;
    const lw = W - kiri - kanan, lh = H - atas - bawah;
    const maks = maksRapi(Math.max(1, ...data.map((d) => d.value)));
    const n = Math.max(1, data.length);
    const lebar = (lw / n) * 0.6;
    const warna = opsi.warna || "var(--ungu2)";
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" class="grafik" role="img" aria-label="' + esc(opsi.judul || "grafik batang") + '">';
    for (let i = 0; i <= 2; i++) {
      const y = atas + (lh * i) / 2;
      s += '<line class="grid" x1="' + kiri + '" y1="' + y + '" x2="' + (W - kanan) + '" y2="' + y + '"/>';
      s += '<text class="label-sumbu" x="' + (kiri - 5) + '" y="' + (y + 3) + '" text-anchor="end">' + fmt(maks * (1 - i / 2)) + "</text>";
    }
    data.forEach((d, i) => {
      const x = kiri + (lw / n) * i + (lw / n - lebar) / 2;
      const h = Math.max(2, (d.value / maks) * lh);
      const y = atas + lh - h;
      s += '<rect class="bt" style="--i:' + i + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + lebar.toFixed(1) + '" height="' + h.toFixed(1) +
        '" rx="4" fill="' + (d.warna || warna) + '" opacity="' + (d.redup ? ".45" : ".95") + '"><title>' + esc(d.label + ": " + fmt(d.value)) + "</title></rect>";
      s += '<text class="label-sumbu" x="' + (x + lebar / 2).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(d.label) + "</text>";
    });
    s += "</svg>";
    return s;
  }

  /* Garis + area */
  function garis(data, opsi) {
    opsi = opsi || {};
    const H = opsi.tinggi || 150;
    const kiri = 28, kanan = 8, atas = 12, bawah = 24;
    const lw = W - kiri - kanan, lh = H - atas - bawah;
    const maks = maksRapi(Math.max(1, ...data.map((d) => d.value)));
    const n = Math.max(1, data.length - 1);
    const warna = opsi.warna || "var(--ungu2)";
    const titik = data.map((d, i) => ({ x: kiri + (lw * i) / n, y: atas + lh - (d.value / maks) * lh, d }));

    let panjang = 0;
    for (let i = 1; i < titik.length; i++) {
      panjang += Math.hypot(titik[i].x - titik[i - 1].x, titik[i].y - titik[i - 1].y);
    }
    panjang = Math.ceil(panjang) + 4;

    let s = '<svg viewBox="0 0 ' + W + " " + H + '" class="grafik" role="img" aria-label="' + esc(opsi.judul || "grafik garis") + '">';
    for (let i = 0; i <= 2; i++) {
      const y = atas + (lh * i) / 2;
      s += '<line class="grid" x1="' + kiri + '" y1="' + y + '" x2="' + (W - kanan) + '" y2="' + y + '"/>';
      s += '<text class="label-sumbu" x="' + (kiri - 5) + '" y="' + (y + 3) + '" text-anchor="end">' + fmt(maks * (1 - i / 2)) + "</text>";
    }
    const jalur = titik.map((p, i) => (i ? "L" : "M") + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ");
    s += '<path class="ga" d="' + jalur + " L" + titik[titik.length - 1].x.toFixed(1) + " " + (atas + lh) + " L" + titik[0].x.toFixed(1) + " " + (atas + lh) +
      ' Z" fill="' + warna + '"/>';
    s += '<path class="gj" style="--panjang:' + panjang + ';stroke-dasharray:' + panjang + '" d="' + jalur + '" fill="none" stroke="' + warna +
      '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
    titik.forEach((p, i) => {
      s += '<circle class="tk" style="--i:' + (i + 2) + '" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3.4" fill="var(--panel-pekat)" stroke="' + warna + '" stroke-width="2.4"><title>' +
        esc(p.d.label + ": " + fmt(p.d.value)) + "</title></circle>";
      s += '<text class="label-sumbu" x="' + p.x.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(p.d.label) + "</text>";
    });
    s += "</svg>";
    return s;
  }

  /* Sebar */
  function sebar(titik, opsi) {
    opsi = opsi || {};
    const H = opsi.tinggi || 240;
    const kiri = 44, kanan = 10, atas = 12, bawah = 34;
    const lw = W - kiri - kanan, lh = H - atas - bawah;
    const xs = titik.map((t) => t.x), ys = titik.map((t) => t.y);
    let xMin = Math.min(...xs), xMax = Math.max(...xs), yMin = Math.min(...ys), yMax = Math.max(...ys);
    const px = (xMax - xMin) * 0.08 || 1, py = (yMax - yMin) * 0.1 || 1;
    xMin = Math.max(0, xMin - px); xMax = xMax + px;
    yMin = Math.max(0, yMin - py); yMax = yMax + py;
    const sx = (v) => kiri + ((v - xMin) / (xMax - xMin)) * lw;
    const sy = (v) => atas + lh - ((v - yMin) / (yMax - yMin)) * lh;

    let s = '<svg viewBox="0 0 ' + W + " " + H + '" class="grafik" role="img" aria-label="' + esc(opsi.judul || "diagram sebar") + '">';
    for (let i = 0; i <= 4; i++) {
      const y = atas + (lh * i) / 4, x = kiri + (lw * i) / 4;
      s += '<line class="grid" x1="' + kiri + '" y1="' + y + '" x2="' + (W - kanan) + '" y2="' + y + '"/>';
      s += '<text class="label-sumbu" x="' + (kiri - 5) + '" y="' + (y + 3) + '" text-anchor="end">' + fmt(yMax - ((yMax - yMin) * i) / 4) + "</text>";
      s += '<text class="label-sumbu" x="' + x + '" y="' + (H - 18) + '" text-anchor="middle">' + fmt(xMin + ((xMax - xMin) * i) / 4) + "</text>";
    }
    s += '<line class="sumbu" x1="' + kiri + '" y1="' + (atas + lh) + '" x2="' + (W - kanan) + '" y2="' + (atas + lh) + '"/>';
    s += '<line class="sumbu" x1="' + kiri + '" y1="' + atas + '" x2="' + kiri + '" y2="' + (atas + lh) + '"/>';
    s += '<text class="label-sumbu" x="' + (kiri + lw / 2) + '" y="' + (H - 4) + '" text-anchor="middle" style="fill:var(--text)">' + esc(opsi.xLabel || "") + "</text>";
    s += '<text class="label-sumbu" x="11" y="' + (atas + lh / 2) + '" text-anchor="middle" transform="rotate(-90 11 ' + (atas + lh / 2) + ')" style="fill:var(--text)">' + esc(opsi.yLabel || "") + "</text>";
    titik.forEach((t, i) => {
      s += '<circle class="tk" style="--i:' + i + '" cx="' + sx(t.x).toFixed(1) + '" cy="' + sy(t.y).toFixed(1) + '" r="' + (t.besar ? 7 : 4.2) + '" fill="' + t.warna +
        '" opacity="' + (t.besar ? "1" : ".82") + '" stroke="' + (t.besar ? "#fff" : "none") + '" stroke-width="2"><title>' + esc(t.nama || "") + "</title></circle>";
    });
    s += "</svg>";
    return s;
  }

  /* Radar */
  function radar(seri, label, opsi) {
    opsi = opsi || {};
    const H = 300, cx = 160, cy = 148, r = 96;
    const n = label.length;
    const maks = opsi.maks || label.map(() => 1);
    const sudut = (i) => -Math.PI / 2 + (2 * Math.PI * i) / n;
    const pos = (i, rasio) => [cx + Math.cos(sudut(i)) * r * rasio, cy + Math.sin(sudut(i)) * r * rasio];

    let s = '<svg viewBox="0 0 320 ' + H + '" class="grafik" role="img" aria-label="diagram radar profil cluster">';
    [0.25, 0.5, 0.75, 1].forEach((rasio) => {
      const titikGrid = label.map((_, i) => pos(i, rasio).map((v) => v.toFixed(1)).join(",")).join(" ");
      s += '<polygon points="' + titikGrid + '" fill="none" class="grid"/>';
    });
    label.forEach((l, i) => {
      const p = pos(i, 1);
      s += '<line class="grid" x1="' + cx + '" y1="' + cy + '" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '"/>';
      const lp = pos(i, 1.24);
      s += '<text class="label-sumbu" x="' + lp[0].toFixed(1) + '" y="' + (lp[1] + 3).toFixed(1) + '" text-anchor="middle">' + esc(l) + "</text>";
    });
    seri.forEach((sr, k) => {
      const titikSeri = sr.nilai.map((v, i) => {
        const rasio = Math.min(1, Math.max(0, v / (maks[i] || 1)));
        return pos(i, rasio).map((x) => x.toFixed(1)).join(",");
      });
      s += '<polygon class="rd" style="animation-delay:' + (k * 120) + 'ms" points="' + titikSeri.join(" ") + '" fill="' + sr.warna +
        '" fill-opacity=".16" stroke="' + sr.warna + '" stroke-width="2.2" stroke-linejoin="round"/>';
      sr.nilai.forEach((v, i) => {
        const rasio = Math.min(1, Math.max(0, v / (maks[i] || 1)));
        const p = pos(i, rasio);
        s += '<circle class="tk" style="--i:' + (k * 6 + i) + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2.8" fill="' + sr.warna + '"/>';
      });
    });
    s += "</svg>";
    return s;
  }

  /* Batang horizontal */
  function hbatang(data, opsi) {
    opsi = opsi || {};
    const tinggiBaris = 26, H = data.length * tinggiBaris + 10;
    const kiri = 92, kanan = 42;
    const lw = W - kiri - kanan;
    const maks = Math.max(1, ...data.map((d) => d.value));
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" class="grafik" role="img" aria-label="' + esc(opsi.judul || "grafik batang") + '">';
    data.forEach((d, i) => {
      const y = 6 + i * tinggiBaris;
      const w = Math.max(2, (d.value / maks) * lw);
      const labelPendek = d.label.length > 16 ? d.label.slice(0, 15) + "…" : d.label;
      s += '<text class="label-sumbu" x="' + (kiri - 8) + '" y="' + (y + 12) + '" text-anchor="end" style="fill:var(--text)">' + esc(labelPendek) + "</text>";
      s += '<rect x="' + kiri + '" y="' + y + '" width="' + lw + '" height="14" rx="7" fill="var(--garis)"/>';
      s += '<rect class="bh" style="--i:' + i + '" x="' + kiri + '" y="' + y + '" width="' + w.toFixed(1) + '" height="14" rx="7" fill="' + (d.warna || "var(--ungu2)") + '"/>';
      s += '<text class="nilai" x="' + (kiri + lw + 6) + '" y="' + (y + 11) + '">' + esc(d.teks != null ? d.teks : fmt(d.value)) + "</text>";
    });
    s += "</svg>";
    return s;
  }

  /* Elbow */
  function elbow(data) {
    return garis(
      data.map((d) => ({ label: "k" + d.k, value: Math.round(d.sse) })),
      { warna: "var(--biru)", judul: "elbow method", tinggi: 160 }
    );
  }

  global.Grafik = { ring, batang, garis, sebar, radar, hbatang, elbow, maksRapi };
})(typeof window !== "undefined" ? window : globalThis);
