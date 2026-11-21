/* ============================================================
   app.js — StudyTrack
   Aplikasi analisis kebiasaan belajar mahasiswa (K-Means).
   Warisan struktur dari Target Ashira: satu state lokal, tab bawah,
   render ulang per tab. Data disimpan di localStorage.
   ============================================================ */
(function () {
  "use strict";

  const KEY = "studytrack_v1";
  const APP = { nama: "StudyTrack", sub: "Analisis Kebiasaan Belajar" };
  const TARGET_HARIAN_BAWAAN = 120; // menit

  /* ---------------- State ---------------- */
  function kosong() {
    return { sesi: [], dataset: [], pengaturan: { tema: "terang", nama: "", targetHarian: TARGET_HARIAN_BAWAAN, k: 3 } };
  }
  function muat() {
    try {
      const teks = localStorage.getItem(KEY);
      if (teks) {
        const o = JSON.parse(teks);
        const b = kosong();
        return {
          sesi: Array.isArray(o.sesi) ? o.sesi : [],
          dataset: Array.isArray(o.dataset) ? o.dataset : [],
          pengaturan: Object.assign(b.pengaturan, o.pengaturan || {}),
        };
      }
    } catch (e) {}
    return kosong();
  }
  function simpan() {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) {
      toast("Penyimpanan penuh — data tidak tersimpan", "merah");
    }
  }

  let S = muat();
  if (!S.dataset.length && window.SURVEI) S.dataset = window.SURVEI.map((b) => Object.assign({}, b));
  let tab = "dasbor";
  let H = null;          // cache hasil analisis
  let versiData = 0;     // penanda dataset berubah
  let editSesi = null;   // id sesi yang sedang disunting
  let rentang = 7;       // filter jurnal
  let cari = "";
  let filterProdi = "semua";

  /* ---------------- Alat bantu ---------------- */
  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const angka = (v) => Number(v) || 0;
  const rata = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
  const jumlah = (a) => a.reduce((s, v) => s + v, 0);

  function tgl(s) {
    if (!s) return "";
    const d = new Date(s + "T00:00:00");
    if (isNaN(d)) return s;
    return d.getDate() + " " + BULAN[d.getMonth()] + " " + d.getFullYear();
  }
  function hariPendek(s) {
    const d = new Date(s + "T00:00:00");
    return isNaN(d) ? "" : HARI[d.getDay()].slice(0, 3);
  }
  function jam(menit) {
    menit = Math.round(angka(menit));
    if (menit < 60) return menit + "m";
    const j = Math.floor(menit / 60), m = menit % 60;
    return m ? j + "j " + m + "m" : j + "j";
  }
  function sapaan() {
    const j = new Date().getHours();
    if (j < 11) return "Selamat pagi";
    if (j < 15) return "Selamat siang";
    if (j < 19) return "Selamat sore";
    return "Selamat malam";
  }
  function hariLalu(n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push(iso(d));
    }
    return out;
  }
  const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  function tanggalPanjang() {
    const d = new Date();
    return HARI[d.getDay()] + ", " + d.getDate() + " " + NAMA_BULAN[d.getMonth()] + " " + d.getFullYear();
  }

  /* ---------------- Hitung ---------------- */
  function sesiRentang(hari) {
    const batas = new Date();
    batas.setHours(0, 0, 0, 0);
    batas.setDate(batas.getDate() - (hari - 1));
    return S.sesi
      .filter((s) => new Date(s.tanggal + "T00:00:00") >= batas)
      .sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || "") || (b.dibuat || 0) - (a.dibuat || 0));
  }

  function fiturPengguna(hari) {
    hari = hari || 7;
    const daftar = sesiRentang(hari);
    if (!daftar.length) return null;
    const hariUnik = new Set(daftar.map((s) => s.tanggal));
    const tidurPerHari = {};
    daftar.forEach((s) => {
      if (angka(s.tidur) > 0) tidurPerHari[s.tanggal] = angka(s.tidur);
    });
    const nilaiTidur = Object.keys(tidurPerHari).map((k) => tidurPerHari[k]);
    return {
      durasi: +(jumlah(daftar.map((s) => angka(s.menit))) / hari / 60).toFixed(2),
      frekuensi: hariUnik.size,
      tidur: +(nilaiTidur.length ? rata(nilaiTidur) : 7).toFixed(1),
      tugas: jumlah(daftar.map((s) => angka(s.tugas))),
      hp: +(jumlah(daftar.map((s) => angka(s.hpMenit))) / hari / 60).toFixed(2),
      mandiri: daftar.filter((s) => s.jenis === "mandiri").length,
      totalMenit: jumlah(daftar.map((s) => angka(s.menit))),
      sesi: daftar.length,
      tidurDefault: !nilaiTidur.length,
    };
  }

  function hasil() {
    const k = Math.min(6, Math.max(2, S.pengaturan.k || 3));
    if (!H || H._versi !== versiData || H._k !== k) {
      H = KMeans.analisis(S.dataset, { k: k, bibit: 42 });
      H._versi = versiData;
      H._k = k;
    }
    return H;
  }

  const SARAN = {
    "Kebiasaan Tinggi": "Ritme belajarmu sudah sehat. Jaga durasi tidur ≥ 7 jam dan sisipkan jeda 10 menit tiap 50 menit belajar supaya tidak kelelahan.",
    "Kebiasaan Sedang": "Tambahkan satu sesi 45 menit lagi per minggu, lalu tekan penggunaan HP saat belajar di bawah 1 jam sehari. Kenaikan kecil ini yang paling berpengaruh.",
    "Perlu Ditingkatkan": "Mulai dari target ringan: 25 menit fokus tanpa HP, 4 hari dalam sepekan. Naikkan durasi tidur bertahap ke 7 jam — kurang tidur membuat sesi belajar berikutnya tidak efektif.",
  };

  /* ---------------- Komponen ---------------- */
  function pil(jenis) {
    const j = jenis || "mandiri";
    return '<span class="pil ' + j + '">' + j + "</span>";
  }

  function kartu(judul, ikon, isi, kanan) {
    return (
      '<section class="kartu"><h2><span class="ikon">' + ikon + "</span>" + judul +
      (kanan ? '<span class="kanan">' + kanan + "</span>" : "") +
      "</h2>" + isi + "</section>"
    );
  }

  function kosongkan(emo, teks, tombol) {
    return '<div class="kosong"><span class="emo">' + emo + "</span>" + teks + (tombol || "") + "</div>";
  }

  /* ---------------- Tab: Dasbor ---------------- */
  function vDasbor() {
    const f = fiturPengguna(7);
    const hariIni = iso(new Date());
    const menitHariIni = jumlah(S.sesi.filter((s) => s.tanggal === hariIni).map((s) => angka(s.menit)));
    const target = Math.max(15, angka(S.pengaturan.targetHarian) || TARGET_HARIAN_BAWAAN);
    const persen = Math.min(100, (menitHariIni / target) * 100);

    let html = "";

    html +=
      '<section class="kartu hero"><div class="hero-isi"><div style="min-width:0">' +
      "<h2>" + sapaan() + (S.pengaturan.nama ? ", " + esc(S.pengaturan.nama) : "") + "</h2>" +
      '<p>' + (f ? "Pekan ini kamu belajar " + jam(f.totalMenit) + " dalam " + f.sesi + " sesi." : "Belum ada sesi belajar yang tercatat pekan ini.") + "</p>" +
      '<p style="margin-top:8px;font-size:11.5px;opacity:.85">Target hari ini ' + jam(target) + "</p>" +
      '</div><div class="hero-ring">' + Grafik.ring(persen, "#ffffff") + "<small>" + jam(menitHariIni) + " hari ini</small></div></div></section>";

    if (!f) {
      html += kartu(
        "Mulai dari sini",
        "🌱",
        kosongkan("📖", "Belum ada data. Catat sesi belajarmu, atau isi contoh data dulu untuk melihat cara kerja analisisnya.",
          '<div class="baris-tombol" style="justify-content:center"><button class="tombol mini" data-act="tab" data-tab="jurnal">Catat sesi</button><button class="tombol mini lembut" data-act="contoh">Isi contoh data</button></div>')
      );
    } else {
      const fokus = rata(sesiRentang(7).map((s) => angka(s.fokus)).filter((v) => v > 0));
      html +=
        '<div class="petak" style="margin-bottom:14px">' +
        stat("⏱️", "Jam belajar", (f.totalMenit / 60).toFixed(1), "jam / 7 hari") +
        stat("📚", "Sesi", f.sesi, "sesi") +
        stat("📅", "Hari aktif", f.frekuensi, "dari 7 hari") +
        stat("🎯", "Rata fokus", fokus ? fokus.toFixed(1) : "–", "dari 5") +
        "</div>";

      /* posisi cluster */
      const h = hasil();
      const p = KMeans.tempatkan(h, f);
      html += kartu(
        "Posisi kamu",
        "🧠",
        '<div class="cluster-kartu" style="border-left-color:' + p.profil.warna + '">' +
          "<h3>" + esc(p.profil.nama) + '<span class="jumlah">jarak ' + p.jarak.toFixed(2) + "</span></h3>" +
          '<p style="margin-top:8px">' + esc(SARAN[p.profil.nama] || "") + "</p>" +
        "</div>" +
        perbandingan(f, p.profil),
        "K-Means k=" + h.k
      );

      /* 7 hari */
      const hari = hariLalu(7);
      const menitPerHari = hari.map((d) => jumlah(S.sesi.filter((s) => s.tanggal === d).map((s) => angka(s.menit))));
      html += kartu(
        "Tujuh hari terakhir",
        "📊",
        Grafik.batang(hari.map((d, i) => ({ label: hariPendek(d), value: menitPerHari[i], warna: i === 6 ? "var(--pink)" : "var(--ungu)" })), { judul: "menit belajar per hari", tinggi: 140 }) +
        '<p class="kecil" style="margin:8px 0 0">Satuan menit. Batang merah muda = hari ini.</p>',
        jam(jumlah(menitPerHari)) + " total"
      );

      /* mata kuliah */
      const perMatkul = {};
      sesiRentang(7).forEach((s) => {
        const k = (s.matkul || "Lainnya").trim() || "Lainnya";
        perMatkul[k] = (perMatkul[k] || 0) + angka(s.menit);
      });
      const urut = Object.keys(perMatkul).map((k) => ({ label: k, value: perMatkul[k], teks: jam(perMatkul[k]) })).sort((a, b) => b.value - a.value).slice(0, 5);
      if (urut.length) html += kartu("Mata kuliah terbanyak", "📖", Grafik.hbatang(urut, { judul: "menit per mata kuliah" }));
    }

    return html;
  }

  function stat(ikon, label, nilai, satuan) {
    return '<div class="stat"><div class="lbl">' + ikon + " " + label + '</div><div class="angka">' + nilai + " <small>" + satuan + "</small></div></div>";
  }

  function perbandingan(f, profil) {
    const baris = KMeans.FITUR.map((ft) => {
      const kamu = angka(f[ft.kunci]);
      const acuan = angka(profil.rata[ft.kunci]);
      const selisih = kamu - acuan;
      const warna = selisih >= 0 ? "var(--mint)" : "var(--merah)";
      return (
        '<div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:5px 0;border-bottom:1px solid var(--garis)">' +
        '<span style="flex:1;color:var(--muted);font-weight:600">' + ft.nama + "</span>" +
        '<span style="font-weight:800">' + kamu + "</span>" +
        '<span style="color:var(--muted);font-size:11px">vs ' + acuan.toFixed(1) + "</span>" +
        '<span style="color:' + warna + ';font-weight:800;min-width:38px;text-align:right">' + (selisih >= 0 ? "+" : "") + selisih.toFixed(1) + "</span>" +
        "</div>"
      );
    }).join("");
    return '<div style="margin-top:4px">' + baris + "</div>" +
      '<p class="kecil" style="margin:8px 0 0">Dibandingkan rata-rata kelompokmu. Angka bertanda plus berarti kamu di atas rata-rata kelompok.</p>';
  }

  /* ---------------- Tab: Jurnal ---------------- */
  function vJurnal() {
    const daftar = sesiRentang(rentang === 0 ? 3650 : rentang);
    const sedang = editSesi ? S.sesi.find((s) => s.id === editSesi) : null;

    let html = "";
    html += kartu(
      sedang ? "Sunting sesi" : "Catat sesi belajar",
      sedang ? "✏️" : "✍️",
      '<form id="formSesi" autocomplete="off">' +
        '<div class="baris"><div class="kolom"><label for="fTanggal">Tanggal</label>' +
        '<input type="date" id="fTanggal" name="tanggal" required value="' + esc(sedang ? sedang.tanggal : iso(new Date())) + '"></div>' +
        '<div class="kolom"><label for="fMatkul">Mata kuliah</label>' +
        '<input type="text" id="fMatkul" name="matkul" placeholder="mis. Statistika" value="' + esc(sedang ? sedang.matkul : "") + '"></div></div>' +
        '<div class="baris"><div class="kolom"><label for="fJenis">Jenis</label>' +
        '<select id="fJenis" name="jenis">' +
          ["mandiri", "kelompok", "kelas"].map((j) => '<option value="' + j + '"' + ((sedang ? sedang.jenis : "mandiri") === j ? " selected" : "") + ">" + j + "</option>").join("") +
        "</select></div>" +
        '<div class="kolom"><label for="fMenit">Durasi (menit)</label>' +
        '<input type="number" id="fMenit" name="menit" min="5" max="720" step="5" required value="' + (sedang ? sedang.menit : 60) + '"></div></div>' +
        '<label for="fFokus">Fokus: <b id="labelFokus">' + (sedang ? sedang.fokus : 4) + "</b> / 5</label>" +
        '<input type="range" id="fFokus" name="fokus" min="1" max="5" step="1" value="' + (sedang ? sedang.fokus : 4) + '">' +
        '<div class="baris"><div class="kolom"><label for="fHp">Main HP (menit)</label>' +
        '<input type="number" id="fHp" name="hpMenit" min="0" max="600" step="5" value="' + (sedang ? sedang.hpMenit : 20) + '"></div>' +
        '<div class="kolom"><label for="fTugas">Tugas selesai</label>' +
        '<input type="number" id="fTugas" name="tugas" min="0" max="30" step="1" value="' + (sedang ? sedang.tugas : 1) + '"></div></div>' +
        '<label for="fTidur">Tidur malam sebelumnya (jam)</label>' +
        '<input type="number" id="fTidur" name="tidur" min="0" max="14" step="0.5" value="' + (sedang ? sedang.tidur : 7) + '">' +
        '<label for="fCatatan">Catatan (opsional)</label>' +
        '<textarea id="fCatatan" name="catatan" placeholder="Apa yang dipelajari, hambatan, dsb.">' + esc(sedang ? sedang.catatan : "") + "</textarea>" +
        '<button class="tombol utama" type="submit">' + (sedang ? "Simpan perubahan" : "Simpan sesi") + "</button>" +
        (sedang ? '<button class="tombol mini lembut" type="button" data-act="batal-edit" style="width:100%;margin-top:8px">Batal</button>' : "") +
      "</form>"
    );

    html +=
      '<div class="chip-baris" style="margin-bottom:12px">' +
      [[7, "7 hari"], [30, "30 hari"], [0, "Semua"]].map(([v, t]) =>
        '<button class="chip ' + (rentang === v ? "aktif" : "") + '" data-act="rentang" data-v="' + v + '">' + t + "</button>").join("") +
      "</div>";

    if (!daftar.length) {
      html += kartu("Riwayat", "🗓️", kosongkan("🌙", "Belum ada sesi pada rentang ini."));
      return html;
    }

    const perHari = {};
    daftar.forEach((s) => {
      (perHari[s.tanggal] = perHari[s.tanggal] || []).push(s);
    });

    html += kartu(
      "Riwayat sesi",
      "🗓️",
      Object.keys(perHari)
        .sort((a, b) => b.localeCompare(a))
        .map((tanggal) => {
          const isi = perHari[tanggal];
          const total = jumlah(isi.map((s) => angka(s.menit)));
          return (
            '<div style="margin-bottom:14px">' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:7px">' +
            '<b style="font-size:12.5px">' + hariPendek(tanggal) + ", " + tgl(tanggal) + "</b>" +
            '<span class="kecil">' + isi.length + " sesi · " + jam(total) + "</span></div>" +
            '<div class="daftar">' +
            isi.map((s) =>
              '<div class="item"><div class="item-isi">' +
                '<div class="item-judul">' + esc(s.matkul || "Sesi belajar") + " " + pil(s.jenis) + "</div>" +
                '<div class="item-meta"><span>⏱️ ' + jam(s.menit) + "</span><span>🎯 fokus " + angka(s.fokus) + "/5</span>" +
                (angka(s.hpMenit) ? "<span>📱 " + jam(s.hpMenit) + "</span>" : "") +
                (angka(s.tugas) ? "<span>✅ " + angka(s.tugas) + " tugas</span>" : "") +
                (angka(s.tidur) ? "<span>😴 " + angka(s.tidur) + " jam</span>" : "") + "</div>" +
                (s.catatan ? '<div class="item-cat">' + esc(s.catatan) + "</div>" : "") +
              "</div>" +
              '<button class="hapus" data-act="edit-sesi" data-id="' + s.id + '" title="Sunting">✏️</button>' +
              '<button class="hapus" data-act="hapus-sesi" data-id="' + s.id + '" title="Hapus">🗑️</button>' +
              "</div>"
            ).join("") +
            "</div></div>"
          );
        })
        .join("")
    );
    return html;
  }

  /* ---------------- Tab: Analisis ---------------- */
  function vAnalisis() {
    const h = hasil();
    const f = fiturPengguna(7);
    const p = f ? KMeans.tempatkan(h, f) : null;

    let html = "";

    html += kartu(
      "Metode",
      "⚙️",
      '<p class="kecil" style="margin:0 0 10px">K-Means pada ' + S.dataset.length + " responden, 6 fitur, distandarkan z-score, inisialisasi k-means++, bibit tetap 42 (hasil dapat diulang).</p>" +
      '<div class="chip-baris">' + [2, 3, 4, 5].map((k) =>
        '<button class="chip ' + (h.k === k ? "aktif" : "") + '" data-act="k" data-v="' + k + '">k = ' + k + "</button>").join("") + "</div>",
      "silhouette " + h.silhouette.toFixed(3)
    );

    html +=
      '<div class="petak" style="margin-bottom:14px">' +
      stat("🧩", "Cluster", h.k, "kelompok") +
      stat("📐", "Silhouette", h.silhouette.toFixed(3), "kualitas") +
      stat("🔁", "Iterasi", h.model.iterasi, "sampai stabil") +
      stat("📉", "SSE", Math.round(h.model.sse), "semakin kecil") +
      "</div>";

    /* sebar */
    const titik = S.dataset.map((b, i) => {
      const pr = h.profil.find((x) => x.cluster === h.model.label[i]);
      return { x: angka(b.durasi), y: angka(b.frekuensi), warna: pr ? pr.warna : "#999", nama: b.id + " — " + (pr ? pr.nama : "") };
    });
    if (f) titik.push({ x: f.durasi, y: f.frekuensi, warna: "#111", besar: true, nama: "Kamu" });
    html += kartu(
      "Sebaran responden",
      "🎯",
      Grafik.sebar(titik, { xLabel: "durasi belajar (jam/hari)", yLabel: "frekuensi (hari/minggu)", tinggi: 250 }) +
      '<p class="kecil" style="margin:8px 0 0">Tiap titik satu responden, warna mengikuti cluster. Titik hitam besar = posisimu pekan ini.</p>'
    );

    /* kartu cluster */
    html += kartu(
      "Profil tiap cluster",
      "🧬",
      h.profil.slice().sort((a, b) => b.skor - a.skor).map((pr) =>
        '<div class="cluster-kartu" style="border-left-color:' + pr.warna + '">' +
          "<h3>" + esc(pr.nama) + '<span class="jumlah">' + pr.jumlah + " org · " + pr.persen.toFixed(0) + "%</span></h3>" +
          '<div class="fitur">' + KMeans.FITUR.map((ft) => "<span>" + ft.pendek + ": " + angka(pr.rata[ft.kunci]).toFixed(1) + "</span>").join("") + "</div>" +
          "<p>" + esc(SARAN[pr.nama] || "") + "</p>" +
        "</div>").join("")
    );

    /* radar */
    const maks = KMeans.FITUR.map((ft) => Math.max(...h.profil.map((pr) => angka(pr.rata[ft.kunci]))) * 1.15 || 1);
    html += kartu(
      "Perbandingan profil",
      "🕸️",
      Grafik.radar(
        h.profil.map((pr) => ({ nama: pr.nama, warna: pr.warna, nilai: KMeans.FITUR.map((ft) => angka(pr.rata[ft.kunci])) })),
        KMeans.FITUR.map((ft) => ft.pendek),
        { maks: maks }
      ) +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:6px">' +
      h.profil.map((pr) => '<span class="kecil" style="display:flex;align-items:center;gap:6px"><i style="width:10px;height:10px;border-radius:50%;background:' + pr.warna + ';display:inline-block"></i>' + esc(pr.nama) + "</span>").join("") +
      "</div>"
    );

    /* elbow */
    html += kartu(
      "Penentuan jumlah cluster",
      "📈",
      Grafik.elbow(h.elbow) +
      '<p class="kecil" style="margin:8px 0 0">Grafik elbow: SSE turun tajam sampai k=3, lalu melandai. Karena itu k=3 dipakai sebagai nilai bawaan.</p>'
    );

    /* posisi pengguna */
    if (p) {
      html += kartu(
        "Posisi kamu",
        "📍",
        '<div class="cluster-kartu" style="border-left-color:' + p.profil.warna + '">' +
          "<h3>" + esc(p.profil.nama) + '<span class="jumlah">jarak ' + p.jarak.toFixed(2) + "</span></h3>" +
          "<p>Berdasarkan " + f.sesi + " sesi dalam 7 hari terakhir (" + jam(f.totalMenit) + ").</p>" +
        "</div>" + perbandingan(f, p.profil)
      );
    } else {
      html += kartu("Posisi kamu", "📍", kosongkan("🫥", "Belum ada sesi dalam 7 hari terakhir, jadi posisimu belum bisa ditempatkan."));
    }

    return html;
  }

  /* ---------------- Tab: Dataset ---------------- */
  function vDataset() {
    const prodi = Array.from(new Set(S.dataset.map((b) => b.prodi))).sort();
    const daftar = S.dataset.filter((b) => {
      const cocokCari = !cari || (b.id + " " + b.prodi + " " + b.angkatan).toLowerCase().includes(cari.toLowerCase());
      const cocokProdi = filterProdi === "semua" || b.prodi === filterProdi;
      return cocokCari && cocokProdi;
    });

    let html = "";

    html += kartu(
      "Dataset survei",
      "🗂️",
      '<p class="kecil" style="margin:0 0 10px">' + S.dataset.length + " responden · 6 variabel. Data bawaan bersifat sintetis (arketipe + derau); ganti dengan hasil survei asli lewat impor CSV.</p>" +
      '<div class="baris"><div class="kolom"><input type="text" id="cari" placeholder="Cari ID / prodi…" value="' + esc(cari) + '" data-cari></div>' +
      '<div class="kolom"><select data-prodi>' +
      '<option value="semua"' + (filterProdi === "semua" ? " selected" : "") + ">Semua prodi</option>" +
      prodi.map((p) => '<option value="' + esc(p) + '"' + (filterProdi === p ? " selected" : "") + ">" + esc(p) + "</option>").join("") +
      "</select></div></div>" +
      '<div class="baris-tombol">' +
      '<button class="tombol mini" data-act="ekspor-csv-dataset">Ekspor CSV</button>' +
      '<label class="tombol mini lembut" style="cursor:pointer;margin:0">Impor CSV<input type="file" accept=".csv,text/csv" data-impor hidden></label>' +
      '<button class="tombol mini lembut" data-act="reset-dataset">Kembalikan data bawaan</button>' +
      "</div>",
      daftar.length + " tampil"
    );

    html += kartu(
      "Statistik deskriptif",
      "📐",
      '<div class="tabel-bungkus"><table><thead><tr><th>Fitur</th><th>Rata-rata</th><th>Simpangan</th><th>Min</th><th>Maks</th></tr></thead><tbody>' +
      KMeans.FITUR.map((ft, j) => {
        const kol = S.dataset.map((b) => angka(b[ft.kunci]));
        const r = rata(kol);
        const sd = Math.sqrt(rata(kol.map((v) => (v - r) ** 2)));
        return "<tr><td>" + ft.nama + "</td><td class='num'>" + r.toFixed(2) + "</td><td class='num'>" + sd.toFixed(2) +
          "</td><td class='num'>" + Math.min(...kol).toFixed(1) + "</td><td class='num'>" + Math.max(...kol).toFixed(1) + "</td></tr>";
      }).join("") +
      "</tbody></table></div>"
    );

    html += kartu(
      "Daftar responden",
      "📋",
      daftar.length
        ? '<div class="tabel-bungkus" style="max-height:420px;overflow-y:auto"><table><thead><tr><th>ID</th><th>Prodi</th><th>Angk.</th>' +
          KMeans.FITUR.map((ft) => "<th>" + ft.pendek + "</th>").join("") +
          "<th></th></tr></thead><tbody>" +
          daftar.map((b) =>
            "<tr><td>" + esc(b.id) + "</td><td>" + esc(b.prodi) + "</td><td>" + esc(b.angkatan) + "</td>" +
            KMeans.FITUR.map((ft) => "<td class='num'>" + angka(b[ft.kunci]) + "</td>").join("") +
            '<td><button class="hapus" data-act="hapus-data" data-id="' + esc(b.id) + '" title="Hapus">🗑️</button></td></tr>'
          ).join("") +
          "</tbody></table></div>"
        : kosongkan("🔍", "Tidak ada responden yang cocok dengan filter.")
    );

    return html;
  }

  /* ---------------- Tab: Laporan ---------------- */
  function vLaporan() {
    const f = fiturPengguna(7);
    const h = hasil();
    const daftar = sesiRentang(7);
    const perHari = {};
    daftar.forEach((s) => {
      perHari[s.tanggal] = perHari[s.tanggal] || { sesi: 0, menit: 0, tugas: 0 };
      perHari[s.tanggal].sesi++;
      perHari[s.tanggal].menit += angka(s.menit);
      perHari[s.tanggal].tugas += angka(s.tugas);
    });
    const hari = hariLalu(7).filter((d) => perHari[d]);

    /* proyeksi 4 pekan */
    const pekan = [];
    for (let i = 3; i >= 0; i--) {
      const akhir = new Date();
      akhir.setDate(akhir.getDate() - i * 7);
      const mulai = new Date(akhir);
      mulai.setDate(mulai.getDate() - 6);
      const total = S.sesi
        .filter((s) => {
          const d = new Date(s.tanggal + "T00:00:00");
          return d >= mulai && d <= akhir;
        })
        .reduce((a, s) => a + angka(s.menit), 0);
      pekan.push({ label: "P" + (4 - i), value: total });
    }
    const reg = KMeans.regresi([1, 2, 3, 4], pekan.map((p) => p.value));
    const proyeksi = Math.max(0, reg.a * 5 + reg.b);

    let html = "";

    html += kartu(
      "Rekap pekan ini",
      "📄",
      '<div class="baris" style="align-items:center;gap:18px"><div style="flex:1;min-width:140px">' +
      '<div class="angka-besar">' + (f ? jam(f.totalMenit) : "0m") + ' <small>total</small></div>' +
      '<p class="kecil" style="margin:6px 0 0">' + (f ? f.sesi + " sesi · " + f.frekuensi + "/7 hari aktif · rata-rata " + jam(f.totalMenit / Math.max(1, f.frekuensi)) + " per hari aktif" : "Belum ada sesi tercatat.") + "</p></div>" +
      (f ? '<div style="text-align:center">' + Grafik.ring(Math.min(100, (f.frekuensi / 7) * 100), "var(--ungu)").replace('style="fill:#fff"', 'style="fill:var(--text)"') + '<div class="kecil">konsistensi</div></div>' : "") +
      "</div>" +
      (hari.length
        ? '<hr class="sep"><div class="tabel-bungkus"><table><thead><tr><th>Tanggal</th><th>Sesi</th><th>Durasi</th><th>Tugas</th></tr></thead><tbody>' +
          hari.map((d) => "<tr><td>" + hariPendek(d) + ", " + tgl(d) + "</td><td class='num'>" + perHari[d].sesi + "</td><td class='num'>" + jam(perHari[d].menit) + "</td><td class='num'>" + perHari[d].tugas + "</td></tr>").join("") +
          "</tbody></table></div>"
        : "")
    );

    html += kartu(
      "Proyeksi pekan depan",
      "🔮",
      Grafik.garis(pekan.map((p) => ({ label: p.label, value: Math.round(p.value) })), { judul: "menit belajar per pekan", warna: "var(--pink)", tinggi: 150 }) +
      '<p class="kecil" style="margin:10px 0 0">Regresi linear atas 4 pekan terakhir: <b>' + Math.round(proyeksi) + " menit</b> (" + jam(proyeksi) + ") untuk pekan depan. Kecocokan garis R² = " + reg.r2.toFixed(2) + ".</p>"
    );

    html += kartu(
      "Hasil analisis",
      "🧠",
      '<div class="tabel-bungkus"><table><thead><tr><th>Cluster</th><th>Anggota</th><th>Porsi</th><th>Skor</th></tr></thead><tbody>' +
      h.profil.slice().sort((a, b) => b.skor - a.skor).map((p) =>
        "<tr><td>" + esc(p.nama) + "</td><td class='num'>" + p.jumlah + "</td><td class='num'>" + p.persen.toFixed(0) + "%</td><td class='num'>" + p.skor.toFixed(2) + "</td></tr>").join("") +
      "</tbody></table></div>" +
      '<p class="kecil" style="margin:10px 0 0">Silhouette ' + h.silhouette.toFixed(3) + " · " + h.model.iterasi + " iterasi · SSE " + Math.round(h.model.sse) + " · k = " + h.k + "</p>"
    );

    html += kartu(
      "Berkas",
      "⬇️",
      '<div class="baris-tombol no-print">' +
      '<button class="tombol mini" data-act="cetak">Cetak / simpan PDF</button>' +
      '<button class="tombol mini" data-act="ekspor-csv-sesi">Ekspor sesi (CSV)</button>' +
      '<button class="tombol mini" data-act="ekspor-csv-dataset">Ekspor dataset (CSV)</button>' +
      '<button class="tombol mini lembut" data-act="ekspor-json">Cadangan (JSON)</button>' +
      "</div>" +
      '<div class="catatan" style="margin-top:12px">Laporan ini dihasilkan dari data lokal di peramban. Untuk lampiran tugas besar, gunakan tombol cetak lalu pilih "Simpan sebagai PDF".</div>'
    );

    return html;
  }

  /* ---------------- Render ---------------- */
  const TAB = [
    { id: "dasbor", nama: "Dasbor", ikon: "🏠", fn: vDasbor },
    { id: "jurnal", nama: "Jurnal", ikon: "✍️", fn: vJurnal },
    { id: "analisis", nama: "Analisis", ikon: "🧠", fn: vAnalisis },
    { id: "dataset", nama: "Dataset", ikon: "🗂️", fn: vDataset },
    { id: "laporan", nama: "Laporan", ikon: "📄", fn: vLaporan },
  ];

  function render() {
    const aktif = TAB.find((t) => t.id === tab) || TAB[0];
    document.getElementById("isi").innerHTML = aktif.fn();
    document.getElementById("tabbar").innerHTML = TAB.map(
      (t) => '<button class="tab ' + (t.id === tab ? "aktif" : "") + '" data-act="tab" data-tab="' + t.id + '">' +
        '<span class="tab-ikon">' + t.ikon + '</span><span class="tab-nama">' + t.nama + "</span></button>"
    ).join("");
    document.getElementById("tanggal").textContent = tanggalPanjang();
    terapkanTema();
  }

  function terapkanTema() {
    document.documentElement.dataset.tema = S.pengaturan.tema === "gelap" ? "gelap" : "terang";
    document.getElementById("btnTema").textContent = S.pengaturan.tema === "gelap" ? "☀️" : "🌙";
  }

  /* ---------------- Toast ---------------- */
  function toast(teks, warna) {
    const w = document.getElementById("toastWadah");
    const el = document.createElement("div");
    el.className = "toast " + (warna || "ungu");
    el.textContent = teks;
    w.appendChild(el);
    setTimeout(() => {
      el.classList.add("keluar");
      setTimeout(() => el.remove(), 320);
    }, 2400);
  }

  /* ---------------- Data contoh ---------------- */
  function contohData() {
    const sekarang = new Date();
    const tambah = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(sekarang);
      d.setDate(d.getDate() - i);
      const hari = d.getDay();
      const sibuk = hari === 0 || hari === 6;
      const n = sibuk ? 1 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 2);
      for (let j = 0; j < n; j++) {
        const menit = [30, 45, 60, 75, 90][Math.floor(Math.random() * 5)];
        tambah.push({
          id: uid(),
          tanggal: iso(d),
          matkul: ["Statistika", "Basis Data", "Pemrograman Web", "Kalkulus", "Rekayasa Perangkat Lunak"][Math.floor(Math.random() * 5)],
          jenis: Math.random() < 0.65 ? "mandiri" : Math.random() < 0.6 ? "kelompok" : "kelas",
          menit,
          fokus: 2 + Math.floor(Math.random() * 4),
          hpMenit: Math.floor(Math.random() * 40),
          tugas: Math.random() < 0.45 ? 1 : 0,
          tidur: [6, 6.5, 7, 7.5, 8][Math.floor(Math.random() * 5)],
          catatan: "",
          dibuat: Date.now() - i * 86400000 + j,
        });
      }
    }
    S.sesi = tambah.concat(S.sesi);
    simpan();
    toast("Contoh data 14 hari ditambahkan", "mint");
    render();
  }

  /* ---------------- Ekspor ---------------- */
  function unduh(nama, isi, tipe) {
    const blob = new Blob([isi], { type: tipe || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nama;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function csvSesi() {
    const kepala = ["tanggal", "matkul", "jenis", "menit", "fokus", "hp_menit", "tugas", "tidur", "catatan"];
    return [kepala.join(",")]
      .concat(S.sesi.map((s) => kepala.map((k) => '"' + String(s[k] == null ? "" : s[k]).replace(/"/g, '""') + '"').join(",")))
      .join("\n");
  }
  function csvDataset(daftar) {
    const kepala = ["id", "prodi", "angkatan"].concat(KMeans.FITUR.map((f) => f.kunci));
    return [kepala.join(",")]
      .concat((daftar || S.dataset).map((b) => kepala.map((k) => b[k]).join(",")))
      .join("\n");
  }

  function imporCsv(teks) {
    const baris = teks.replace(/\r/g, "").split("\n").filter((b) => b.trim());
    if (baris.length < 2) throw new Error("CSV kosong");
    const kepala = baris[0].split(",").map((h) => h.trim().toLowerCase());
    const wajib = ["durasi", "frekuensi", "tidur", "tugas", "hp", "mandiri"];
    for (const w of wajib) if (!kepala.includes(w)) throw new Error("Kolom " + w + " tidak ditemukan");
    const hasilImpor = [];
    for (let i = 1; i < baris.length; i++) {
      const sel = baris[i].split(",");
      const o = {};
      kepala.forEach((h, j) => { o[h] = (sel[j] || "").trim(); });
      const b = {
        id: o.id || "R" + String(i).padStart(2, "0"),
        prodi: o.prodi || "Tidak diketahui",
        angkatan: angka(o.angkatan) || 0,
      };
      KMeans.FITUR.forEach((f) => { b[f.kunci] = angka(o[f.kunci]); });
      hasilImpor.push(b);
    }
    if (hasilImpor.length < 10) throw new Error("Minimal 10 baris agar clustering berarti");
    S.dataset = hasilImpor;
    versiData++;
    simpan();
    toast(hasilImpor.length + " responden diimpor", "mint");
    render();
  }

  /* ---------------- Aksi ---------------- */
  document.addEventListener("click", function (e) {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;

    if (act === "tab") {
      tab = el.dataset.tab;
      editSesi = null;
      if (history.replaceState) history.replaceState(null, "", "#" + tab);
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (act === "tema") {
      S.pengaturan.tema = S.pengaturan.tema === "gelap" ? "terang" : "gelap";
      simpan();
      terapkanTema();
    } else if (act === "hapus-sesi") {
      S.sesi = S.sesi.filter((s) => s.id !== el.dataset.id);
      simpan();
      render();
      toast("Sesi dihapus", "merah");
    } else if (act === "edit-sesi") {
      editSesi = el.dataset.id;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (act === "batal-edit") {
      editSesi = null;
      render();
    } else if (act === "rentang") {
      rentang = Number(el.dataset.v);
      render();
    } else if (act === "k") {
      S.pengaturan.k = Number(el.dataset.v);
      simpan();
      render();
    } else if (act === "contoh") {
      contohData();
    } else if (act === "cetak") {
      window.print();
    } else if (act === "ekspor-csv-sesi") {
      unduh("sesi-belajar.csv", csvSesi(), "text/csv;charset=utf-8");
      toast("CSV sesi diunduh", "mint");
    } else if (act === "ekspor-csv-dataset") {
      unduh("dataset-survei.csv", csvDataset(), "text/csv;charset=utf-8");
      toast("CSV dataset diunduh", "mint");
    } else if (act === "ekspor-json") {
      unduh("studytrack-cadangan.json", JSON.stringify(S, null, 2), "application/json");
      toast("Cadangan JSON diunduh", "mint");
    } else if (act === "hapus-data") {
      S.dataset = S.dataset.filter((b) => b.id !== el.dataset.id);
      versiData++;
      simpan();
      render();
    } else if (act === "reset-dataset") {
      if (!window.SURVEI) return;
      S.dataset = window.SURVEI.map((b) => Object.assign({}, b));
      versiData++;
      simpan();
      render();
      toast("Dataset dikembalikan ke data bawaan", "ungu");
    } else if (act === "nora") {
      const g = document.getElementById("noraGelembung");
      const tips = [
        "Klik tab Analisis buat lihat hasil K-Means.",
        "Catat sesi tiap hari — makin lengkap, cluster makin akurat.",
        "Tidur ikut dihitung. Kurang tidur menurunkan skor kebiasaanmu.",
        "HP saat belajar dihitung sebagai fitur negatif.",
        "Data tersimpan di peramban ini, aman tanpa server.",
      ];
      g.textContent = tips[Math.floor(Math.random() * tips.length)];
      g.classList.add("tampil");
      clearTimeout(window._noraTimer);
      window._noraTimer = setTimeout(() => g.classList.remove("tampil"), 4200);
    }
  });

  document.addEventListener("input", function (e) {
    if (e.target.id === "fFokus") {
      const l = document.getElementById("labelFokus");
      if (l) l.textContent = e.target.value;
    }
    if (e.target.hasAttribute && e.target.hasAttribute("data-cari")) {
      cari = e.target.value;
      render();
      const lagi = document.getElementById("cari");
      if (lagi) {
        lagi.focus();
        lagi.setSelectionRange(lagi.value.length, lagi.value.length);
      }
    }
  });

  document.addEventListener("change", function (e) {
    if (e.target.hasAttribute && e.target.hasAttribute("data-prodi")) {
      filterProdi = e.target.value;
      render();
    }
    if (e.target.hasAttribute && e.target.hasAttribute("data-impor")) {
      const berkas = e.target.files && e.target.files[0];
      if (!berkas) return;
      const baca = new FileReader();
      baca.onload = function () {
        try {
          imporCsv(String(baca.result));
        } catch (err) {
          toast("Gagal impor: " + err.message, "merah");
        }
      };
      baca.readAsText(berkas);
      e.target.value = "";
    }
  });

  document.addEventListener("submit", function (e) {
    if (e.target.id !== "formSesi") return;
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      tanggal: String(fd.get("tanggal") || iso(new Date())),
      matkul: String(fd.get("matkul") || "").trim(),
      jenis: String(fd.get("jenis") || "mandiri"),
      menit: Math.max(5, angka(fd.get("menit"))),
      fokus: Math.min(5, Math.max(1, angka(fd.get("fokus")) || 3)),
      hpMenit: Math.max(0, angka(fd.get("hpMenit"))),
      tugas: Math.max(0, angka(fd.get("tugas"))),
      tidur: Math.max(0, angka(fd.get("tidur"))),
      catatan: String(fd.get("catatan") || "").trim(),
    };
    if (editSesi) {
      const i = S.sesi.findIndex((s) => s.id === editSesi);
      if (i >= 0) S.sesi[i] = Object.assign({}, S.sesi[i], data);
      editSesi = null;
      toast("Sesi diperbarui", "mint");
    } else {
      S.sesi.unshift(Object.assign({ id: uid(), dibuat: Date.now() }, data));
      toast("Sesi tersimpan · " + jam(data.menit), "mint");
    }
    simpan();
    render();
  });

  /* ---------------- Mulai ---------------- */
  /* tautan langsung: index.html#analisis */
  const hashAwal = (location.hash || "").replace("#", "");
  if (TAB.some((t) => t.id === hashAwal)) tab = hashAwal;
  window.addEventListener("hashchange", function () {
    const h = (location.hash || "").replace("#", "");
    if (TAB.some((t) => t.id === h) && h !== tab) {
      tab = h;
      editSesi = null;
      render();
    }
  });

  /* tema lewat tautan: index.html?tema=gelap */
  const temaUrl = new URLSearchParams(location.search).get("tema");
  if (temaUrl === "gelap" || temaUrl === "terang") S.pengaturan.tema = temaUrl;

  /* mode demo: index.html?demo=1 mengisi 14 hari contoh */
  if (new URLSearchParams(location.search).get("demo") === "1" && !S.sesi.length) contohData();

  render();
  if (!S.sesi.length) {
    setTimeout(() => {
      const g = document.getElementById("noraGelembung");
      if (!g) return;
      g.textContent = "Halo, aku Nora. Aku bantu baca pola belajarmu.";
      g.classList.add("tampil");
      setTimeout(() => g.classList.remove("tampil"), 5000);
    }, 1200);
  }

  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
})();
