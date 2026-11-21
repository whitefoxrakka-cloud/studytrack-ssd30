/* ============================================================
   kmeans.js — mesin Data Sains StudyTrack
   ------------------------------------------------------------
   Isi:
     1. Definisi fitur & agregasi sesi belajar -> vektor fitur
     2. Standardisasi z-score
     3. K-Means (inisialisasi k-means++, iterasi maksimum, toleransi)
     4. Silhouette score (evaluasi kualitas cluster)
     5. Elbow method (menentukan k)
     6. Regresi linear kuadrat terkecil (proyeksi minggu depan)
   Semua fungsi murni: tidak menyentuh DOM, bisa diuji dengan Node.
   ============================================================ */
(function (global) {
  "use strict";

  /* ---------- 1. Fitur ---------- */
  const FITUR = [
    { kunci: "durasi", nama: "Durasi belajar", pendek: "Belajar", satuan: "jam/hari", arah: 1 },
    { kunci: "frekuensi", nama: "Frekuensi belajar", pendek: "Frekuensi", satuan: "hari/minggu", arah: 1 },
    { kunci: "tidur", nama: "Durasi tidur", pendek: "Tidur", satuan: "jam/hari", arah: 1 },
    { kunci: "tugas", nama: "Tugas selesai", pendek: "Tugas", satuan: "tugas/minggu", arah: 1 },
    { kunci: "hp", nama: "HP saat belajar", pendek: "HP", satuan: "jam/hari", arah: -1 },
    { kunci: "mandiri", nama: "Belajar mandiri", pendek: "Mandiri", satuan: "sesi/minggu", arah: 1 },
  ];

  /* Bobot untuk memberi peringkat cluster (bukan bagian dari K-Means,
     hanya untuk menamai hasil: tinggi / sedang / perlu ditingkatkan). */
  const BOBOT_SKOR = { durasi: 0.28, frekuensi: 0.2, tidur: 0.14, tugas: 0.18, hp: -0.16, mandiri: 0.16 };

  /* ---------- Utilitas ---------- */
  function rngBibit(bibit) {
    let a = bibit >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const jarak2 = (a, b) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) {
      const d = a[i] - b[i];
      s += d * d;
    }
    return s;
  };

  function vektor(baris) {
    return FITUR.map((f) => Number(baris[f.kunci]) || 0);
  }

  /* ---------- 2. Standardisasi ---------- */
  function statistik(matriks) {
    const n = matriks.length;
    const d = matriks[0].length;
    const rata = new Array(d).fill(0);
    const simp = new Array(d).fill(0);
    for (const b of matriks) for (let j = 0; j < d; j++) rata[j] += b[j];
    for (let j = 0; j < d; j++) rata[j] /= n;
    for (const b of matriks) for (let j = 0; j < d; j++) simp[j] += (b[j] - rata[j]) ** 2;
    for (let j = 0; j < d; j++) simp[j] = Math.sqrt(simp[j] / n) || 1;
    return { rata, simp };
  }

  function standardisasi(matriks) {
    const { rata, simp } = statistik(matriks);
    const Z = matriks.map((b) => b.map((v, j) => (v - rata[j]) / simp[j]));
    return { Z, rata, simp };
  }

  /* ---------- 3. K-Means ---------- */
  function kmeans(Z, k, opsi) {
    opsi = opsi || {};
    const maksIterasi = opsi.maksIterasi || 300;
    const toleransi = opsi.toleransi || 1e-6;
    const acak = rngBibit(opsi.bibit == null ? 42 : opsi.bibit);
    const n = Z.length;
    const d = Z[0].length;
    k = Math.max(1, Math.min(k, n));

    /* --- inisialisasi k-means++ --- */
    const pusat = [Z[Math.floor(acak() * n)].slice()];
    while (pusat.length < k) {
      const j2 = new Array(n);
      let total = 0;
      for (let i = 0; i < n; i++) {
        let min = Infinity;
        for (const p of pusat) min = Math.min(min, jarak2(Z[i], p));
        j2[i] = min;
        total += min;
      }
      let ambil = 0;
      if (total > 0) {
        let r = acak() * total;
        for (let i = 0; i < n; i++) {
          r -= j2[i];
          if (r <= 0) { ambil = i; break; }
        }
      }
      pusat.push(Z[ambil].slice());
    }

    const label = new Array(n).fill(-1);
    const riwayatSSE = [];
    let iterasi = 0;
    let geser = Infinity;

    while (iterasi < maksIterasi && geser > toleransi) {
      /* --- penetapan titik ke pusat terdekat --- */
      for (let i = 0; i < n; i++) {
        let terbaik = 0, jarakMin = Infinity;
        for (let c = 0; c < k; c++) {
          const j = jarak2(Z[i], pusat[c]);
          if (j < jarakMin) { jarakMin = j; terbaik = c; }
        }
        label[i] = terbaik;
      }

      /* --- perbarui pusat --- */
      const jumlah = new Array(k).fill(0);
      const total = Array.from({ length: k }, () => new Array(d).fill(0));
      for (let i = 0; i < n; i++) {
        jumlah[label[i]]++;
        for (let j = 0; j < d; j++) total[label[i]][j] += Z[i][j];
      }

      geser = 0;
      for (let c = 0; c < k; c++) {
        if (jumlah[c] === 0) {
          /* cluster kosong: ambil titik terjauh sebagai pusat baru */
          let jauh = 0, jarakTerjauh = -1;
          for (let i = 0; i < n; i++) {
            const j = jarak2(Z[i], pusat[label[i]]);
            if (j > jarakTerjauh) { jarakTerjauh = j; jauh = i; }
          }
          pusat[c] = Z[jauh].slice();
          continue;
        }
        for (let j = 0; j < d; j++) {
          const baru = total[c][j] / jumlah[c];
          geser = Math.max(geser, Math.abs(baru - pusat[c][j]));
          pusat[c][j] = baru;
        }
      }

      let sse = 0;
      for (let i = 0; i < n; i++) sse += jarak2(Z[i], pusat[label[i]]);
      riwayatSSE.push(sse);
      iterasi++;
    }

    /* --- hitung ulang SSE akhir --- */
    let sse = 0;
    for (let i = 0; i < n; i++) sse += jarak2(Z[i], pusat[label[i]]);

    return { pusat, label, sse, iterasi, riwayatSSE, k };
  }

  /* ---------- 4. Silhouette ---------- */
  function silhouette(Z, label, k) {
    const n = Z.length;
    if (n < 3 || k < 2) return 0;
    const skor = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      const jumlah = new Array(k).fill(0);
      const total = Array.from({ length: k }, () => new Array(Z[0].length).fill(0));
      for (let j = 0; j < n; j++) {
        jumlah[label[j]]++;
        for (let d = 0; d < Z[0].length; d++) total[label[j]][d] += Z[j][d];
      }
      let a = 0, hitungA = 0;
      const b = new Array(k).fill(0);
      const hitungB = new Array(k).fill(0);
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const jarak = Math.sqrt(jarak2(Z[i], Z[j]));
        if (label[j] === label[i]) { a += jarak; hitungA++; }
        else { b[label[j]] += jarak; hitungB[label[j]]++; }
      }
      a = hitungA ? a / hitungA : 0;
      let bMin = Infinity;
      for (let c = 0; c < k; c++) if (c !== label[i] && hitungB[c] > 0) bMin = Math.min(bMin, b[c] / hitungB[c]);
      if (!isFinite(bMin)) bMin = 0;
      const m = Math.max(a, bMin);
      skor[i] = m > 0 ? (bMin - a) / m : 0;
    }
    return skor.reduce((s, v) => s + v, 0) / n;
  }

  /* ---------- 5. Elbow ---------- */
  function elbow(Z, maksK, opsi) {
    const hasil = [];
    for (let k = 2; k <= maksK; k++) {
      const m = kmeans(Z, k, opsi);
      hasil.push({ k, sse: m.sse, iterasi: m.iterasi });
    }
    return hasil;
  }

  /* ---------- 6. Regresi linear ---------- */
  function regresi(x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 2) return { a: 0, b: y[0] || 0, r2: 0 };
    let sx = 0, sy = 0;
    for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i]; }
    const mx = sx / n, my = sy / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      sxy += (x[i] - mx) * (y[i] - my);
      sxx += (x[i] - mx) ** 2;
      syy += (y[i] - my) ** 2;
    }
    const a = sxx ? sxy / sxx : 0;
    const b = my - a * mx;
    const r2 = sxx && syy ? (sxy * sxy) / (sxx * syy) : 0;
    return { a, b, r2 };
  }

  /* ---------- Orkestrasi: jalankan seluruh pipeline ---------- */
  function analisis(baris, opsi) {
    opsi = opsi || {};
    const k = opsi.k || 3;
    const matriks = baris.map(vektor);
    const { Z, rata, simp } = standardisasi(matriks);
    const model = kmeans(Z, k, { bibit: opsi.bibit });

    /* profil tiap cluster dalam satuan asli */
    const profil = [];
    for (let c = 0; c < k; c++) {
      const anggota = [];
      for (let i = 0; i < baris.length; i++) if (model.label[i] === c) anggota.push(baris[i]);
      const isi = {};
      FITUR.forEach((f) => {
        isi[f.kunci] = anggota.length
          ? anggota.reduce((s, b) => s + (Number(b[f.kunci]) || 0), 0) / anggota.length
          : 0;
      });
      /* skor komposit dari pusat ternormalisasi */
      let skor = 0;
      FITUR.forEach((f, j) => { skor += BOBOT_SKOR[f.kunci] * model.pusat[c][j]; });
      profil.push({ cluster: c, jumlah: anggota.length, rata: isi, skor, anggota });
    }

    /* peringkat: skor tertinggi = kebiasaan paling sehat */
    const urut = profil.slice().sort((a, b) => b.skor - a.skor);
    const peringkat = {};
    urut.forEach((p, i) => { peringkat[p.cluster] = i; });

    const NAMA = ["Kebiasaan Tinggi", "Kebiasaan Sedang", "Perlu Ditingkatkan", "Kelompok 4", "Kelompok 5", "Kelompok 6"];
    const WARNA = ["#7c5cf5", "#f0a83c", "#e8577d", "#3fb6a8", "#5b8def", "#9a6ad6"];

    profil.forEach((p) => {
      p.nama = NAMA[peringkat[p.cluster]] || "Kelompok " + (p.cluster + 1);
      p.warna = WARNA[peringkat[p.cluster]] || "#8b8b9a";
      p.persen = baris.length ? (p.jumlah / baris.length) * 100 : 0;
    });

    return {
      k,
      model,
      profil,
      peringkat,
      rata,
      simp,
      Z,
      silhouette: silhouette(Z, model.label, k),
      elbow: opsi.elbow === false ? [] : elbow(Z, Math.min(6, Math.max(3, k + 2)), { bibit: opsi.bibit }),
    };
  }

  /* Prediksi cluster untuk satu vektor fitur baru (mis. data pengguna) */
  function tempatkan(hasil, fitur) {
    const z = FITUR.map((f, j) => ((Number(fitur[f.kunci]) || 0) - hasil.rata[j]) / hasil.simp[j]);
    let terbaik = 0, jarakMin = Infinity;
    for (let c = 0; c < hasil.model.pusat.length; c++) {
      const j = jarak2(z, hasil.model.pusat[c]);
      if (j < jarakMin) { jarakMin = j; terbaik = c; }
    }
    const p = hasil.profil.find((x) => x.cluster === terbaik);
    return { cluster: terbaik, jarak: Math.sqrt(jarakMin), profil: p, z };
  }

  /* ---------- Ekspor ---------- */
  const API = {
    FITUR, BOBOT_SKOR, vektor, statistik, standardisasi, kmeans,
    silhouette, elbow, regresi, analisis, tempatkan, rngBibit,
  };
  global.KMeans = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
