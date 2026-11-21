/* ============================================================
   app.js — StudyTrack
   Aplikasi analisis kebiasaan belajar mahasiswa (K-Means).
   Warisan struktur Target Ashira: satu state lokal, tab bawah,
   render ulang per tab. Data disimpan di localStorage.
   ============================================================ */
(function () {
  "use strict";

  const KEY = "studytrack_v1";
  const TARGET_BAWAAN = 120; // menit/hari
  const VERSI = "1.1";

  /* ---------------- State ---------------- */
  function kosong() {
    return {
      sesi: [],
      dataset: [],
      pengaturan: { tema: "gelap", nama: "", targetHarian: TARGET_BAWAAN, k: 3, sudahKenal: false },
    };
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
      Anim.toast("Penyimpanan penuh — data tidak tersimpan", "merah");
    }
  }

  let S = muat();
  if (!S.dataset.length && window.SURVEI) S.dataset = window.SURVEI.map((b) => Object.assign({}, b));

  let tab = "dasbor";
  let H = null;
  let versiData = 0;
  let editSesi = null;
  let rentang = 7;
  let cari = "";
  let filterProdi = "semua";
  let urut = { kolom: null, arah: 1 };
  let jenisBaru = "mandiri";
  let idxKartu = 0;

  /* ---------------- Alat bantu ---------------- */
  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const angka = (v) => Number(v) || 0;
  const rata = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
  const jumlah = (a) => a.reduce((s, v) => s + v, 0);
  const n1 = (v) => (Math.round(Number(v) * 10) / 10).toFixed(1).replace(".", ",");
  const n2 = (v) => (Math.round(Number(v) * 100) / 100).toFixed(2).replace(".", ",");

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
  function tanggalPanjang() {
    const d = new Date();
    return HARI[d.getDay()] + ", " + d.getDate() + " " + NAMA_BULAN[d.getMonth()] + " " + d.getFullYear();
  }
  const naik = (v, desim) => '<span data-naik="' + v + '" data-desim="' + (desim || 0) + '">0</span>';

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

  function runtunHari() {
    const set = new Set(S.sesi.map((s) => s.tanggal));
    let n = 0;
    const d = new Date();
    if (!set.has(iso(d))) d.setDate(d.getDate() - 1);
    while (set.has(iso(d))) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
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
    "Kebiasaan Tinggi":
      "Ritme belajarmu sudah sehat. Jaga durasi tidur ≥ 7 jam dan sisipkan jeda 10 menit tiap 50 menit belajar supaya tidak kelelahan.",
    "Kebiasaan Sedang":
      "Tambahkan satu sesi 45 menit lagi per minggu, lalu tekan penggunaan HP saat belajar di bawah 1 jam sehari. Kenaikan kecil ini paling berpengaruh.",
    "Perlu Ditingkatkan":
      "Mulai dari target ringan: 25 menit fokus tanpa HP, 4 hari dalam sepekan. Naikkan durasi tidur bertahap ke 7 jam — kurang tidur membuat sesi berikutnya tidak efektif.",
  };

  /* ---------------- Komponen ---------------- */
  function kartu(judul, namaIkon, isi, kanan) {
    idxKartu++;
    return (
      '<section class="kartu" style="--i:' + idxKartu + '"><h2>' + Ikon.bungkus(namaIkon) + judul +
      (kanan ? '<span class="kanan">' + kanan + "</span>" : "") +
      "</h2>" + isi + "</section>"
    );
  }

  function stat(namaIkon, label, nilai, satuan) {
    idxKartu++;
    return (
      '<div class="stat" style="--i:' + idxKartu + '"><div class="lbl">' + Ikon.bungkus(namaIkon) + label + "</div>" +
      '<div class="angka">' + nilai + " <small>" + satuan + "</small></div></div>"
    );
  }

  function pil(jenis) {
    const j = jenis || "mandiri";
    return '<span class="pil ' + j + '">' + j + "</span>";
  }

  function kosongkan(namaIkon, teks, tombol, gambar) {
    return (
      '<div class="kosong">' +
      (gambar ? '<img src="' + gambar + '" alt="" loading="lazy">' : '<span class="ikon ikon-kosong">' + Ikon.svg(namaIkon) + "</span>") +
      teks + (tombol || "") +
      "</div>"
    );
  }

  /* ---------------- Wawasan ---------------- */
  function wawasan(f, p) {
    if (!f) return { ikon: "tunas", teks: "Belum ada sesi pekan ini. Catat satu sesi dulu — 25 menit pun sudah cukup untuk mulai." };
    const streak = runtunHari();
    if (streak >= 3) return { ikon: "api", teks: "Kamu mencatat " + streak + " hari berturut-turut. Runtutan seperti ini yang paling berpengaruh pada hasil, bukan sesi maraton sesekali." };
    if (f.tidur < 6.5) return { ikon: "tidur", teks: "Tidurmu rata-rata " + n1(f.tidur) + " jam. Di bawah 7 jam, sesi belajar berikutnya cenderung kurang menyerap — coba majukan jam tidur 30 menit." };
    if (f.hp > 2) return { ikon: "ponsel", teks: "HP memakan " + n1(f.hp) + " jam per hari saat belajar. Satu sesi 25 menit tanpa HP biasanya lebih baik daripada 60 menit sambil memegang ponsel." };
    if (p && p.profil.nama === "Kebiasaan Tinggi") return { ikon: "kilau", teks: "Kebiasaanmu masuk kelompok teratas. Pertahankan, dan jaga agar tidak menambah durasi dengan mengorbankan tidur." };
    if (p && p.profil.nama === "Perlu Ditingkatkan") return { ikon: "target", teks: "Fokus ke satu hal dulu: tambah satu hari belajar. Frekuensi lebih mudah dinaikkan daripada durasi." };
    return { ikon: "naik", teks: "Pekan ini " + jam(f.totalMenit) + " dalam " + f.sesi + " sesi. Tambah satu sesi 45 menit lagi untuk naik ke kelompok berikutnya." };
  }

  /* ---------------- Tab: Dasbor ---------------- */
  function vDasbor() {
    idxKartu = 0;
    const f = fiturPengguna(7);
    const hariIni = iso(new Date());
    const menitHariIni = jumlah(S.sesi.filter((s) => s.tanggal === hariIni).map((s) => angka(s.menit)));
    const target = Math.max(15, angka(S.pengaturan.targetHarian) || TARGET_BAWAAN);
    const persen = Math.min(100, (menitHariIni / target) * 100);
    const h = hasil();
    const p = f ? KMeans.tempatkan(h, f) : null;
    const w = wawasan(f, p);

    let html = "";

    html +=
      '<section class="kartu hero" style="--i:0"><div class="hero-isi">' +
      '<div class="hero-teks">' +
      "<h2>" + sapaan() + (S.pengaturan.nama ? ", " + esc(S.pengaturan.nama) : "") + "</h2>" +
      '<div class="hero-angka">' + naik(f ? (f.totalMenit / 60).toFixed(1) : 0, f ? 1 : 0) + " <small>jam pekan ini</small></div>" +
      "<p>" + (f ? f.sesi + " sesi · " + f.frekuensi + "/7 hari aktif" : "Belum ada sesi tercatat pekan ini") + "</p>" +
      '<p style="margin-top:6px;font-size:11.5px;opacity:.86">Target hari ini ' + jam(target) + " · " + jam(menitHariIni) + " tercatat</p>" +
      "</div>" +
      '<div class="hero-ring">' + Grafik.ring(persen, "#ffffff", { teks: "#ffffff" }) + "<small>" + Math.round(persen) + "% hari ini</small></div>" +
      "</div></section>";

    if (!f) {
      html += kartu(
        "Mulai dari sini",
        "tunas",
        kosongkan(
          "buku",
          "Belum ada data. Catat sesi belajarmu, atau isi contoh 14 hari untuk melihat cara kerja analisisnya.",
          '<div class="baris-tombol" style="justify-content:center">' +
            '<button class="tombol mini" data-act="tab" data-tab="jurnal">Catat sesi</button>' +
            '<button class="tombol mini lembut" data-act="contoh">Isi contoh data</button></div>',
          "assets/img/hero.svg"
        )
      );
      html += kartu("Kenapa perlu dicatat?", "lampu", '<p class="kecil" style="margin:0">Kebiasaan belajar sulit dinilai dari ingatan. Dengan enam variabel yang tercatat — durasi, frekuensi, tidur, tugas, HP, dan belajar mandiri — aplikasi bisa mengelompokkan polamu dan menunjukkan bagian mana yang perlu diperbaiki.</p>');
      return html;
    }

    const fokus = rata(sesiRentang(7).map((s) => angka(s.fokus)).filter((v) => v > 0));
    html +=
      '<div class="petak">' +
      stat("timer", "Jam belajar", naik((f.totalMenit / 60).toFixed(1), 1), "jam / 7 hari") +
      stat("buku", "Sesi", naik(f.sesi, 0), "sesi") +
      stat("kalender", "Hari aktif", naik(f.frekuensi, 0), "dari 7 hari") +
      stat("target", "Rata fokus", fokus ? naik(fokus.toFixed(1), 1) : "–", "dari 5") +
      "</div>";

    html += kartu(
      "Catatan Nora",
      w.ikon,
      '<p style="margin:0;font-size:13px;line-height:1.6">' + esc(w.teks) + "</p>" +
        (runtunHari() > 1 ? '<p class="kecil" style="margin:8px 0 0">Runtutan mencatat: <b>' + runtunHari() + " hari</b></p>" : "")
    );

    html += kartu(
      "Posisi kamu",
      "chip",
      '<div class="cluster-kartu" style="border-left-color:' + p.profil.warna + '">' +
        "<h3>" + esc(p.profil.nama) + '<span class="jumlah">jarak ' + n2(p.jarak) + "</span></h3>" +
        '<p style="margin-top:8px">' + esc(SARAN[p.profil.nama] || "") + "</p>" +
        "</div>" + perbandingan(f, p.profil),
      "K-Means k=" + h.k
    );

    const hari = hariLalu(7);
    const menitPerHari = hari.map((d) => jumlah(S.sesi.filter((s) => s.tanggal === d).map((s) => angka(s.menit))));
    html += kartu(
      "Tujuh hari terakhir",
      "batang",
      Grafik.batang(hari.map((d, i) => ({ label: hariPendek(d), value: menitPerHari[i], warna: i === 6 ? "var(--pink)" : "var(--ungu2)" })), { judul: "menit belajar per hari", tinggi: 140 }) +
        '<p class="kecil" style="margin:8px 0 0">Satuan menit. Batang merah muda = hari ini.</p>',
      jam(jumlah(menitPerHari)) + " total"
    );

    const perMatkul = {};
    sesiRentang(7).forEach((s) => {
      const k = (s.matkul || "Lainnya").trim() || "Lainnya";
      perMatkul[k] = (perMatkul[k] || 0) + angka(s.menit);
    });
    const urutMatkul = Object.keys(perMatkul)
      .map((k) => ({ label: k, value: perMatkul[k], teks: jam(perMatkul[k]) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    if (urutMatkul.length) html += kartu("Mata kuliah terbanyak", "buku", Grafik.hbatang(urutMatkul, { judul: "menit per mata kuliah" }));

    return html;
  }

  function perbandingan(f, profil) {
    const baris = KMeans.FITUR.map((ft) => {
      const kamu = angka(f[ft.kunci]);
      const acuan = angka(profil.rata[ft.kunci]);
      const selisih = kamu - acuan;
      const warna = selisih >= 0 ? "var(--mint)" : "var(--merah)";
      return (
        '<div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--garis)">' +
        '<span style="flex:1;color:var(--muted);font-weight:600">' + ft.nama + "</span>" +
        '<span style="font-weight:800">' + n1(kamu) + "</span>" +
        '<span style="color:var(--muted);font-size:11px">vs ' + n1(acuan) + "</span>" +
        '<span style="color:' + warna + ';font-weight:800;min-width:42px;text-align:right">' + (selisih >= 0 ? "+" : "") + n1(selisih) + "</span>" +
        "</div>"
      );
    }).join("");
    return '<div style="margin-top:4px">' + baris + "</div>" +
      '<p class="kecil" style="margin:8px 0 0">Dibandingkan rata-rata kelompokmu. Tanda plus berarti kamu di atas rata-rata kelompok.</p>';
  }

  /* ---------------- Tab: Jurnal ---------------- */
  function vJurnal() {
    idxKartu = 0;
    const daftar = sesiRentang(rentang === 0 ? 3650 : rentang);
    const sedang = editSesi ? S.sesi.find((s) => s.id === editSesi) : null;
    const jenisAktif = sedang ? sedang.jenis : jenisBaru;

    let html = "";
    html += kartu(
      sedang ? "Sunting sesi" : "Catat sesi belajar",
      sedang ? "pensil" : "pena",
      '<form id="formSesi" autocomplete="off">' +
        '<div class="baris"><div class="kolom"><label for="fTanggal">Tanggal</label>' +
        '<input type="date" id="fTanggal" name="tanggal" required value="' + esc(sedang ? sedang.tanggal : iso(new Date())) + '"></div>' +
        '<div class="kolom"><label for="fMatkul">Mata kuliah</label>' +
        '<input type="text" id="fMatkul" name="matkul" placeholder="mis. Statistika" value="' + esc(sedang ? sedang.matkul : "") + '"></div></div>' +
        '<label>Jenis</label>' +
        '<div class="segmen" role="group" aria-label="Jenis sesi">' +
          ["mandiri", "kelompok", "kelas"].map((j) =>
            '<button type="button" class="' + (jenisAktif === j ? "aktif" : "") + '" data-act="jenis" data-v="' + j + '">' + j + "</button>").join("") +
        "</div>" +
        '<label for="fMenit">Durasi (menit)</label>' +
        '<input type="number" id="fMenit" name="menit" min="5" max="720" step="5" required value="' + (sedang ? sedang.menit : 60) + '">' +
        '<div class="durasi-cepat">' + [30, 45, 60, 90].map((m) => '<button type="button" data-act="durasi" data-v="' + m + '">' + m + " mnt</button>").join("") + "</div>" +
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
      html += kartu("Riwayat", "kalender", kosongkan("bulan", "Belum ada sesi pada rentang ini.", "", "assets/img/kosong.svg"));
      return html;
    }

    const perHari = {};
    daftar.forEach((s) => {
      (perHari[s.tanggal] = perHari[s.tanggal] || []).push(s);
    });

    html += kartu(
      "Riwayat sesi",
      "kalender",
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
                '<div class="item-meta"><span>' + Ikon.bungkus("timer") + jam(s.menit) + "</span>" +
                "<span>" + Ikon.bungkus("target") + "fokus " + angka(s.fokus) + "/5</span>" +
                (angka(s.hpMenit) ? "<span>" + Ikon.bungkus("ponsel") + jam(s.hpMenit) + "</span>" : "") +
                (angka(s.tugas) ? "<span>" + Ikon.bungkus("cek") + angka(s.tugas) + " tugas</span>" : "") +
                (angka(s.tidur) ? "<span>" + Ikon.bungkus("tidur") + n1(s.tidur) + " jam</span>" : "") + "</div>" +
                (s.catatan ? '<div class="item-cat">' + esc(s.catatan) + "</div>" : "") +
              "</div>" +
              '<button class="hapus" data-act="ulang-sesi" data-id="' + s.id + '" title="Ulangi sesi ini">' + Ikon.svg("ulang") + "</button>" +
              '<button class="hapus" data-act="edit-sesi" data-id="' + s.id + '" title="Sunting">' + Ikon.svg("pensil") + "</button>" +
              '<button class="hapus" data-act="hapus-sesi" data-id="' + s.id + '" title="Hapus">' + Ikon.svg("sampah") + "</button>" +
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
    idxKartu = 0;
    const h = hasil();
    const f = fiturPengguna(7);
    const p = f ? KMeans.tempatkan(h, f) : null;

    let html = "";

    html += kartu(
      "Metode",
      "gir",
      '<p class="kecil" style="margin:0 0 10px">K-Means pada ' + S.dataset.length +
        " responden, 6 fitur, distandarkan z-score, inisialisasi k-means++, bibit tetap 42 sehingga hasil dapat diulang.</p>" +
      '<div class="chip-baris">' + [2, 3, 4, 5].map((k) =>
        '<button class="chip ' + (h.k === k ? "aktif" : "") + '" data-act="k" data-v="' + k + '">k = ' + k + "</button>").join("") + "</div>" +
      '<details style="margin-top:12px"><summary>Cara membaca hasil</summary>' +
        '<p class="kecil" style="margin:0">Warna menandai cluster. Angka <b>silhouette</b> mengukur seberapa rapi cluster terpisah (−1 sampai 1; di atas 0,25 dianggap cukup). ' +
        "<b>SSE</b> mengukur kerapatan cluster — makin kecil makin rapat. Grafik <b>elbow</b> membantu memilih jumlah cluster.</p></details>",
      "silhouette " + n2(h.silhouette)
    );

    html +=
      '<div class="petak">' +
      stat("klaster", "Cluster", naik(h.k, 0), "kelompok") +
      stat("penggaris", "Silhouette", n2(h.silhouette), "kualitas") +
      stat("ulang", "Iterasi", naik(h.model.iterasi, 0), "sampai stabil") +
      stat("turun", "SSE", naik(Math.round(h.model.sse), 0), "semakin kecil") +
      "</div>";

    const titik = S.dataset.map((b, i) => {
      const pr = h.profil.find((x) => x.cluster === h.model.label[i]);
      return { x: angka(b.durasi), y: angka(b.frekuensi), warna: pr ? pr.warna : "#999", nama: b.id + " — " + (pr ? pr.nama : "") };
    });
    if (f) titik.push({ x: f.durasi, y: f.frekuensi, warna: "#ff2d95", besar: true, nama: "Kamu" });
    html += kartu(
      "Sebaran responden",
      "target",
      Grafik.sebar(titik, { xLabel: "durasi belajar (jam/hari)", yLabel: "frekuensi (hari/minggu)", tinggi: 250 }) +
        '<p class="kecil" style="margin:8px 0 0">Tiap titik satu responden, warna mengikuti cluster. Titik merah muda besar = posisimu pekan ini.</p>'
    );

    const maksFitur = KMeans.FITUR.map((ft) => Math.max(...h.profil.map((pr) => angka(pr.rata[ft.kunci]))) || 1);
    html += kartu(
      "Profil tiap cluster",
      "dna",
      h.profil.slice().sort((a, b) => b.skor - a.skor).map((pr) =>
        '<div class="cluster-kartu" style="border-left-color:' + pr.warna + '">' +
          "<h3>" + esc(pr.nama) + '<span class="jumlah">' + pr.jumlah + " org · " + Math.round(pr.persen) + "%</span></h3>" +
          '<div class="fitur-baris">' +
          KMeans.FITUR.map((ft, j) => {
            const v = angka(pr.rata[ft.kunci]);
            const lebar = Math.max(4, Math.min(100, (v / maksFitur[j]) * 100));
            return (
              '<div class="fb"><span class="n">' + ft.pendek + '</span>' +
              '<span class="jalur"><i style="--i:' + j + ";width:" + lebar.toFixed(1) + "%;background:" + pr.warna + '"></i></span>' +
              "<b>" + n1(v) + "</b></div>"
            );
          }).join("") +
          "</div>" +
          "<p>" + esc(SARAN[pr.nama] || "") + "</p>" +
        "</div>").join("")
    );

    const maksRadar = KMeans.FITUR.map((ft) => Math.max(...h.profil.map((pr) => angka(pr.rata[ft.kunci]))) * 1.15 || 1);
    html += kartu(
      "Perbandingan profil",
      "jaring",
      Grafik.radar(
        h.profil.map((pr) => ({ nama: pr.nama, warna: pr.warna, nilai: KMeans.FITUR.map((ft) => angka(pr.rata[ft.kunci])) })),
        KMeans.FITUR.map((ft) => ft.pendek),
        { maks: maksRadar }
      ) +
        '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:6px">' +
        h.profil.map((pr) => '<span class="kecil" style="display:flex;align-items:center;gap:6px"><i style="width:10px;height:10px;border-radius:50%;background:' + pr.warna + ';display:inline-block"></i>' + esc(pr.nama) + "</span>").join("") +
        "</div>"
    );

    html += kartu(
      "Penentuan jumlah cluster",
      "naik",
      Grafik.elbow(h.elbow) +
        '<p class="kecil" style="margin:8px 0 0">SSE turun tajam sampai k=3, lalu melandai. Karena itu k=3 dipakai sebagai nilai bawaan.</p>'
    );

    if (p) {
      html += kartu(
        "Posisi kamu",
        "pin",
        '<div class="cluster-kartu" style="border-left-color:' + p.profil.warna + '">' +
          "<h3>" + esc(p.profil.nama) + '<span class="jumlah">jarak ' + n2(p.jarak) + "</span></h3>" +
          "<p>Berdasarkan " + f.sesi + " sesi dalam 7 hari terakhir (" + jam(f.totalMenit) + ").</p>" +
          "</div>" + perbandingan(f, p.profil)
      );
    } else {
      html += kartu("Posisi kamu", "pin", kosongkan("mata", "Belum ada sesi dalam 7 hari terakhir, jadi posisimu belum bisa ditempatkan."));
    }

    return html;
  }

  /* ---------------- Tab: Dataset ---------------- */
  function vDataset() {
    idxKartu = 0;
    const prodi = Array.from(new Set(S.dataset.map((b) => b.prodi))).sort();
    let daftar = S.dataset.filter((b) => {
      const cocokCari = !cari || (b.id + " " + b.prodi + " " + b.angkatan).toLowerCase().includes(cari.toLowerCase());
      const cocokProdi = filterProdi === "semua" || b.prodi === filterProdi;
      return cocokCari && cocokProdi;
    });
    if (urut.kolom) {
      daftar = daftar.slice().sort((a, b) => {
        const x = a[urut.kolom], y = b[urut.kolom];
        if (typeof x === "number" && typeof y === "number") return (x - y) * urut.arah;
        return String(x).localeCompare(String(y)) * urut.arah;
      });
    }

    let html = "";

    html += kartu(
      "Dataset survei",
      "arsip",
      '<p class="kecil" style="margin:0 0 10px">' + S.dataset.length + " responden · 6 variabel. Data bawaan bersifat sintetis (arketipe + derau); ganti dengan hasil survei asli lewat impor CSV.</p>" +
        '<div class="baris"><div class="kolom"><input type="text" id="cari" placeholder="Cari ID / prodi…" value="' + esc(cari) + '" data-cari aria-label="Cari responden"></div>' +
        '<div class="kolom"><select data-prodi aria-label="Filter prodi">' +
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
      "penggaris",
      '<div class="tabel-bungkus"><table><thead><tr><th>Fitur</th><th>Rata-rata</th><th>Simpangan</th><th>Min</th><th>Maks</th></tr></thead><tbody>' +
        KMeans.FITUR.map((ft) => {
          const kol = S.dataset.map((b) => angka(b[ft.kunci]));
          const r = rata(kol);
          const sd = Math.sqrt(rata(kol.map((v) => (v - r) ** 2)));
          return "<tr><td>" + ft.nama + "</td><td class='num'>" + n2(r) + "</td><td class='num'>" + n2(sd) +
            "</td><td class='num'>" + n1(Math.min(...kol)) + "</td><td class='num'>" + n1(Math.max(...kol)) + "</td></tr>";
        }).join("") +
        "</tbody></table></div>"
    );

    const kol = (kunci, teks) => '<th data-act="urut" data-kolom="' + kunci + '">' + teks + '<span class="arah">' + panah(kunci) + "</span></th>";
    const kepala = kol("id", "ID") + kol("prodi", "Prodi") + kol("angkatan", "Angk.") +
      KMeans.FITUR.map((ft) => kol(ft.kunci, ft.pendek)).join("") +
      "<th></th>";

    html += kartu(
      "Daftar responden",
      "papan",
      daftar.length
        ? '<div class="tabel-bungkus" style="max-height:440px;overflow-y:auto"><table><thead><tr>' + kepala + "</tr></thead><tbody>" +
          daftar.map((b) =>
            "<tr><td>" + esc(b.id) + "</td><td>" + esc(b.prodi) + "</td><td>" + esc(b.angkatan) + "</td>" +
            KMeans.FITUR.map((ft) => "<td class='num'>" + n1(b[ft.kunci]) + "</td>").join("") +
            '<td><button class="hapus" data-act="hapus-data" data-id="' + esc(b.id) + '" title="Hapus">' + Ikon.svg("sampah") + "</button></td></tr>"
          ).join("") +
          "</tbody></table></div>"
        : kosongkan("cari", "Tidak ada responden yang cocok dengan filter.", "", "assets/img/kosong.svg"),
      "klik judul kolom"
    );

    return html;
  }

  function panah(kolom) {
    if (urut.kolom !== kolom) return "↕";
    return urut.arah === 1 ? "↑" : "↓";
  }

  /* ---------------- Tab: Laporan ---------------- */
  function vLaporan() {
    idxKartu = 0;
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
      "dokumen",
      '<div class="baris" style="align-items:center;gap:18px">' +
        '<div style="flex:1;min-width:140px">' +
        '<div class="angka-besar">' + (f ? jam(f.totalMenit) : "0m") + ' <small>total</small></div>' +
        '<p class="kecil" style="margin:6px 0 0">' +
        (f ? f.sesi + " sesi · " + f.frekuensi + "/7 hari aktif · rata-rata " + jam(f.totalMenit / Math.max(1, f.frekuensi)) + " per hari aktif" : "Belum ada sesi tercatat.") +
        "</p></div>" +
        (f ? '<div style="text-align:center">' + Grafik.ring(Math.min(100, (f.frekuensi / 7) * 100), "var(--ungu2)") + '<div class="kecil">konsistensi</div></div>' : "") +
        "</div>" +
        (hari.length
          ? '<hr class="sep"><div class="tabel-bungkus"><table><thead><tr><th>Tanggal</th><th>Sesi</th><th>Durasi</th><th>Tugas</th></tr></thead><tbody>' +
            hari.map((d) => "<tr><td>" + hariPendek(d) + ", " + tgl(d) + "</td><td class='num'>" + perHari[d].sesi + "</td><td class='num'>" + jam(perHari[d].menit) + "</td><td class='num'>" + perHari[d].tugas + "</td></tr>").join("") +
            "</tbody></table></div>"
          : "")
    );

    html += kartu(
      "Proyeksi pekan depan",
      "kristal",
      Grafik.garis(pekan.map((p) => ({ label: p.label, value: Math.round(p.value) })), { judul: "menit belajar per pekan", warna: "var(--pink)", tinggi: 150 }) +
        '<p class="kecil" style="margin:10px 0 0">Regresi linear atas 4 pekan terakhir: <b>' + Math.round(proyeksi) + " menit</b> (" + jam(proyeksi) + ") untuk pekan depan. Kecocokan garis R² = " + n2(reg.r2) + ".</p>"
    );

    html += kartu(
      "Hasil analisis",
      "chip",
      '<div class="tabel-bungkus"><table><thead><tr><th>Cluster</th><th>Anggota</th><th>Porsi</th><th>Skor</th></tr></thead><tbody>' +
        h.profil.slice().sort((a, b) => b.skor - a.skor).map((p) =>
          "<tr><td>" + esc(p.nama) + "</td><td class='num'>" + p.jumlah + "</td><td class='num'>" + Math.round(p.persen) + "%</td><td class='num'>" + n2(p.skor) + "</td></tr>").join("") +
        "</tbody></table></div>" +
        '<p class="kecil" style="margin:10px 0 0">Silhouette ' + n2(h.silhouette) + " · " + h.model.iterasi + " iterasi · SSE " + Math.round(h.model.sse) + " · k = " + h.k + "</p>"
    );

    html += kartu(
      "Berkas",
      "unduh",
      '<div class="baris-tombol no-print">' +
        '<button class="tombol mini" data-act="cetak">Cetak / simpan PDF</button>' +
        '<button class="tombol mini" data-act="ekspor-csv-sesi">Ekspor sesi (CSV)</button>' +
        '<button class="tombol mini" data-act="ekspor-csv-dataset">Ekspor dataset (CSV)</button>' +
        '<button class="tombol mini lembut" data-act="ekspor-json">Cadangan (JSON)</button>' +
        "</div>" +
        '<div class="catatan" style="margin-top:12px">Laporan dihasilkan dari data lokal di peramban. Untuk lampiran tugas besar, gunakan tombol cetak lalu pilih "Simpan sebagai PDF".</div>'
    );

    return html;
  }

  /* ---------------- Lembar: pengaturan ---------------- */
  function bukaAtur() {
    const p = S.pengaturan;
    Anim.lembar(
      '<form id="formAtur" autocomplete="off">' +
        '<label for="aNama">Nama panggilan</label>' +
        '<input id="aNama" name="nama" type="text" placeholder="mis. Ashira" value="' + esc(p.nama) + '">' +
        '<div class="baris"><div class="kolom"><label for="aTarget">Target harian (menit)</label>' +
        '<input id="aTarget" name="target" type="number" min="15" max="600" step="15" value="' + angka(p.targetHarian) + '"></div>' +
        '<div class="kolom"><label for="aK">Cluster bawaan (k)</label>' +
        '<select id="aK" name="k">' + [2, 3, 4, 5].map((k) => '<option value="' + k + '"' + (p.k === k ? " selected" : "") + ">k = " + k + "</option>").join("") + "</select></div></div>" +
        '<label for="aTema">Tema</label>' +
        '<select id="aTema" name="tema"><option value="terang"' + (p.tema !== "gelap" ? " selected" : "") + ">Terang</option><option value=\"gelap\"" + (p.tema === "gelap" ? " selected" : "") + ">Gelap</option></select>" +
        '<button class="tombol utama" type="submit">Simpan pengaturan</button>' +
      "</form>" +
      '<hr class="sep">' +
      '<div class="baris-tombol" style="margin-top:0">' +
        '<button class="tombol mini lembut" data-act="tentang">Tentang aplikasi</button>' +
        '<button class="tombol mini bahaya" data-act="hapus-sesi-semua">Hapus semua sesi</button>' +
      "</div>",
      { judul: "Pengaturan", fokus: "#aNama" }
    );
  }

  /* ---------------- Lembar: tentang ---------------- */
  function bukaTentang() {
    const h = hasil();
    Anim.lembar(
      '<img src="assets/img/metode.svg" alt="Alur metode: data, standardisasi, K-Means, tiga cluster" style="width:100%;border-radius:14px;background:var(--panel-pekat);padding:8px">' +
        '<p class="kecil" style="margin:12px 0 0">StudyTrack versi ' + VERSI + " — aplikasi analisis kebiasaan belajar mahasiswa. " +
        "Enam variabel (durasi, frekuensi, tidur, tugas, HP, belajar mandiri) distandarkan lalu dikelompokkan dengan K-Means.</p>" +
        '<div class="tabel-bungkus" style="margin-top:12px"><table><tbody>' +
        "<tr><td>Dataset</td><td class='num'>" + S.dataset.length + " responden</td></tr>" +
        "<tr><td>Cluster</td><td class='num'>k = " + h.k + "</td></tr>" +
        "<tr><td>Silhouette</td><td class='num'>" + n2(h.silhouette) + "</td></tr>" +
        "<tr><td>SSE</td><td class='num'>" + Math.round(h.model.sse) + "</td></tr>" +
        "<tr><td>Penyimpanan</td><td class='num'>lokal (localStorage)</td></tr>" +
        "</tbody></table></div>" +
        '<p class="kecil" style="margin:12px 0 0">Tugas Besar Rekayasa Perangkat Lunak (SSD30) — Program Studi Data Sains, UIN K.H. Abdurrahman Wahid Pekalongan.</p>',
      { judul: "Tentang StudyTrack" }
    );
  }

  /* ---------------- Lembar: kenalan ---------------- */
  const LANGKAH_KENAL = [
    {
      ikon: "buku",
      judul: "Catat sesi belajarmu",
      teks: "Setiap selesai belajar, catat durasi, fokus, dan berapa lama kamu memegang HP. Cukup 20 detik — tapi dari situ polamu terbaca.",
    },
    {
      ikon: "chip",
      judul: "Mesin K-Means membaca polanya",
      teks: "Enam variabel distandarkan, lalu dikelompokkan menjadi tiga: Kebiasaan Tinggi, Sedang, dan Perlu Ditingkatkan. Kamu bisa melihat posisimu di antara 90 responden.",
    },
    {
      ikon: "target",
      judul: "Dapatkan saran yang terukur",
      teks: "Bukan sekadar angka. Aplikasi menunjukkan variabel mana yang paling menahanmu, dan seberapa jauh dari rata-rata kelompokmu.",
    },
  ];
  let langkahKenal = 0;

  function bukaKenalan() {
    langkahKenal = 0;
    Anim.lembar('<div id="kenalIsi"></div>', {
      judul: "Kenalan dulu, ya",
      kaki:
        '<button class="tombol lembut" data-act="kenal-lewati">Lewati</button>' +
        '<button class="tombol utama" data-act="kenal-lanjut" id="btnKenal" style="margin:0">Lanjut</button>',
    });
    gambarKenal();
  }

  function gambarKenal() {
    const isi = document.getElementById("kenalIsi");
    if (!isi) return;
    const l = LANGKAH_KENAL[langkahKenal];
    isi.innerHTML =
      '<div class="isi-masuk" style="text-align:center;padding:6px 0 4px">' +
      '<div class="ikon-besar">' + Ikon.svg(l.ikon) + "</div>" +
      '<h4 style="margin:0 0 8px;font-size:16px">' + l.judul + "</h4>" +
      '<p class="kecil" style="margin:0;font-size:12.5px">' + l.teks + "</p>" +
      "</div>" +
      '<div class="titik-langkah">' + LANGKAH_KENAL.map((_, i) => '<i class="' + (i === langkahKenal ? "on" : "") + '"></i>').join("") + "</div>";
    const btn = document.getElementById("btnKenal");
    if (btn) btn.textContent = langkahKenal === LANGKAH_KENAL.length - 1 ? "Mulai" : "Lanjut";
  }

  /* ---------------- Render ---------------- */
  const TAB = [
    { id: "dasbor", nama: "Dasbor", ikon: "rumah", fn: vDasbor },
    { id: "jurnal", nama: "Jurnal", ikon: "pena", fn: vJurnal },
    { id: "analisis", nama: "Analisis", ikon: "chip", fn: vAnalisis },
    { id: "dataset", nama: "Dataset", ikon: "arsip", fn: vDataset },
    { id: "laporan", nama: "Laporan", ikon: "dokumen", fn: vLaporan },
  ];

  function render() {
    const aktif = TAB.find((t) => t.id === tab) || TAB[0];
    const isi = document.getElementById("isi");
    isi.innerHTML = aktif.fn();
    isi.classList.remove("isi-masuk");
    void isi.offsetWidth;
    isi.classList.add("isi-masuk");
    document.getElementById("tabbar").innerHTML = TAB.map(
      (t) => '<button class="tab ' + (t.id === tab ? "aktif" : "") + '" data-act="tab" data-tab="' + t.id + '" aria-current="' + (t.id === tab) + '">' +
        '<span class="tab-ikon">' + Ikon.svg(t.ikon) + '</span><span class="tab-nama">' + t.nama + "</span></button>"
    ).join("");
    document.getElementById("tanggal").textContent = tanggalPanjang();
    terapkanTema();
    Anim.naikkan(isi);
  }

  function terapkanTema() {
    const gelap = S.pengaturan.tema === "gelap";
    document.documentElement.dataset.tema = gelap ? "gelap" : "terang";
    document.getElementById("btnTema").innerHTML = Ikon.svg(gelap ? "matahari" : "bulan");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", gelap ? "#04060f" : "#e9edf5");
  }

  /* ---------------- Data contoh ---------------- */
  function contohData(diam) {
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
    if (!diam) {
      Anim.toast("Contoh 14 hari ditambahkan", "mint", "buku");
      render();
    }
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
      const b = { id: o.id || "R" + String(i).padStart(2, "0"), prodi: o.prodi || "Tidak diketahui", angkatan: angka(o.angkatan) || 0 };
      KMeans.FITUR.forEach((f) => { b[f.kunci] = angka(o[f.kunci]); });
      hasilImpor.push(b);
    }
    if (hasilImpor.length < 10) throw new Error("Minimal 10 baris agar clustering berarti");
    S.dataset = hasilImpor;
    versiData++;
    simpan();
    Anim.toast(hasilImpor.length + " responden diimpor", "mint", "arsip");
    render();
  }

  /* ---------------- Aksi ---------------- */
  function pindahTab(id) {
    tab = id;
    editSesi = null;
    if (history.replaceState) history.replaceState(null, "", "#" + id);
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.addEventListener("click", function (e) {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;

    if (act === "tab") {
      pindahTab(el.dataset.tab);
    } else if (act === "tema") {
      S.pengaturan.tema = S.pengaturan.tema === "gelap" ? "terang" : "gelap";
      simpan();
      terapkanTema();
    } else if (act === "atur") {
      bukaAtur();
    } else if (act === "tentang") {
      bukaTentang();
    } else if (act === "jenis") {
      jenisBaru = el.dataset.v;
      document.querySelectorAll('[data-act="jenis"]').forEach((b) => b.classList.toggle("aktif", b.dataset.v === jenisBaru));
    } else if (act === "durasi") {
      const inp = document.getElementById("fMenit");
      if (inp) {
        inp.value = el.dataset.v;
        inp.focus();
      }
    } else if (act === "hapus-sesi") {
      S.sesi = S.sesi.filter((s) => s.id !== el.dataset.id);
      simpan();
      render();
      Anim.toast("Sesi dihapus", "merah", "sampah");
    } else if (act === "edit-sesi") {
      editSesi = el.dataset.id;
      const s = S.sesi.find((x) => x.id === editSesi);
      if (s) jenisBaru = s.jenis || "mandiri";
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (act === "ulang-sesi") {
      const s = S.sesi.find((x) => x.id === el.dataset.id);
      if (!s) return;
      S.sesi.unshift(Object.assign({}, s, { id: uid(), tanggal: iso(new Date()), dibuat: Date.now() }));
      simpan();
      render();
      Anim.toast("Sesi diulang untuk hari ini", "mint", "ulang");
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
      Anim.toast("CSV sesi diunduh", "mint", "unduh");
    } else if (act === "ekspor-csv-dataset") {
      unduh("dataset-survei.csv", csvDataset(), "text/csv;charset=utf-8");
      Anim.toast("CSV dataset diunduh", "mint", "unduh");
    } else if (act === "ekspor-json") {
      unduh("studytrack-cadangan.json", JSON.stringify(S, null, 2), "application/json");
      Anim.toast("Cadangan JSON diunduh", "mint", "simpan");
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
      Anim.toast("Dataset dikembalikan ke data bawaan", "ungu", "balik");
    } else if (act === "hapus-sesi-semua") {
      if (!confirm("Hapus seluruh riwayat sesi? Tindakan ini tidak bisa dibatalkan.")) return;
      S.sesi = [];
      simpan();
      Anim.tutupLembar();
      render();
      Anim.toast("Riwayat sesi dihapus", "merah", "sampah");
    } else if (act === "kenal-lanjut") {
      if (langkahKenal < LANGKAH_KENAL.length - 1) {
        langkahKenal++;
        gambarKenal();
      } else {
        S.pengaturan.sudahKenal = true;
        simpan();
        Anim.tutupLembar();
        Anim.nora("Selamat datang! Mulai dari tab Jurnal, ya.");
      }
    } else if (act === "kenal-lewati") {
      S.pengaturan.sudahKenal = true;
      simpan();
      Anim.tutupLembar();
    } else if (act === "nora") {
      const tips = [
        "Klik tab Analisis buat lihat hasil K-Means.",
        "Catat sesi tiap hari — makin lengkap, cluster makin akurat.",
        "Tidur ikut dihitung. Kurang tidur menurunkan skor kebiasaanmu.",
        "HP saat belajar dihitung sebagai fitur negatif.",
        "Data tersimpan di peramban ini, tanpa server.",
        "Tombol pengaturan di kanan atas mengubah target harian dan namamu.",
      ];
      Anim.nora(tips[Math.floor(Math.random() * tips.length)]);
    } else if (act === "urut") {
      const k = el.dataset.kolom;
      urut = { kolom: k, arah: urut.kolom === k ? -urut.arah : 1 };
      render();
    }
  });

  /* riak pada semua tombol */
  document.addEventListener("pointerdown", function (e) {
    const t = e.target.closest(".tombol, .chip, .tab");
    if (t) Anim.riak(t, e);
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
          Anim.toast("Gagal impor: " + err.message, "merah", "peringatan");
        }
      };
      baca.readAsText(berkas);
      e.target.value = "";
    }
  });

  document.addEventListener("submit", function (e) {
    if (e.target.id === "formAtur") {
      e.preventDefault();
      const fd = new FormData(e.target);
      S.pengaturan.nama = String(fd.get("nama") || "").trim().slice(0, 24);
      S.pengaturan.targetHarian = Math.max(15, Math.min(600, angka(fd.get("target")) || TARGET_BAWAAN));
      S.pengaturan.k = Math.max(2, Math.min(5, angka(fd.get("k")) || 3));
      S.pengaturan.tema = fd.get("tema") === "gelap" ? "gelap" : "terang";
      simpan();
      Anim.tutupLembar();
      render();
      Anim.toast("Pengaturan disimpan", "mint", "cek");
      return;
    }

    if (e.target.id !== "formSesi") return;
    e.preventDefault();
    const fd = new FormData(e.target);
    const segmenAktif = document.querySelector('[data-act="jenis"].aktif');
    const data = {
      tanggal: String(fd.get("tanggal") || iso(new Date())),
      matkul: String(fd.get("matkul") || "").trim(),
      jenis: segmenAktif ? segmenAktif.dataset.v : jenisBaru,
      menit: Math.max(5, angka(fd.get("menit"))),
      fokus: Math.min(5, Math.max(1, angka(fd.get("fokus")) || 3)),
      hpMenit: Math.max(0, angka(fd.get("hpMenit"))),
      tugas: Math.max(0, angka(fd.get("tugas"))),
      tidur: Math.max(0, angka(fd.get("tidur"))),
      catatan: String(fd.get("catatan") || "").trim(),
    };

    const target = Math.max(15, angka(S.pengaturan.targetHarian) || TARGET_BAWAAN);
    const sebelum = jumlah(S.sesi.filter((s) => s.tanggal === data.tanggal).map((s) => angka(s.menit)));

    if (editSesi) {
      const i = S.sesi.findIndex((s) => s.id === editSesi);
      if (i >= 0) S.sesi[i] = Object.assign({}, S.sesi[i], data);
      editSesi = null;
      Anim.toast("Sesi diperbarui", "mint", "cek");
    } else {
      S.sesi.unshift(Object.assign({ id: uid(), dibuat: Date.now() }, data));
      Anim.toast("Sesi tersimpan · " + jam(data.menit), "mint", "cek");
    }
    simpan();
    render();

    if (sebelum < target && sebelum + data.menit >= target) {
      const kotak = e.target.getBoundingClientRect();
      Anim.konfeti(kotak.left + kotak.width / 2, kotak.top + kotak.height / 2, 30);
      setTimeout(() => Anim.toast("Target harian tercapai", "ungu", "piala"), 320);
    }
  });

  /* ---------------- Mulai ---------------- */
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

  const q = new URLSearchParams(location.search);
  const temaUrl = q.get("tema");
  if (temaUrl === "gelap" || temaUrl === "terang") S.pengaturan.tema = temaUrl;
  if (q.get("demo") === "1" && !S.sesi.length) contohData(true);
  if (q.get("kenal") === "0") S.pengaturan.sudahKenal = true;

  Anim.siapkanMuat();
  Anim.pantauGulir();
  if (window.Kota) window.Kota.pasang();
  render();

  if (!S.pengaturan.sudahKenal) {
    setTimeout(bukaKenalan, 520);
  } else if (!S.sesi.length) {
    setTimeout(() => Anim.nora("Halo, aku Nora. Aku bantu baca pola belajarmu."), 900);
  }

  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
})();
