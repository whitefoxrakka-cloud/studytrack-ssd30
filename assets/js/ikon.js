/* ============================================================
   ikon.js — set ikon garis StudyTrack
   Semua ikon digambar pada kanvas 24×24, hanya garis (stroke),
   tanpa isi, supaya warnanya mengikuti currentColor dan cocok
   dengan panel HUD neon. Tidak ada berkas gambar, tidak ada CDN.
   ============================================================ */
(function (global) {
  "use strict";

  /* Setiap entri hanya berisi anak SVG; pembungkus <svg> dibuat oleh svg(). */
  const BENTUK = {
    rumah: '<path d="M3.6 11.2 12 4l8.4 7.2"/><path d="M6.1 9.6V20h11.8V9.6"/><path d="M10 20v-4.6h4V20"/>',
    pena: '<path d="M4.2 19.8l1.3-4.4L16.5 4.4a2.1 2.1 0 0 1 3 0l.1.1a2.1 2.1 0 0 1 0 3L8.6 18.5z"/><path d="M14.6 6.3l3.1 3.1"/>',
    pensil: '<path d="M15.3 4.3l4.4 4.4"/><path d="M4 20l4.9-1.2L19.7 8.2a3.1 3.1 0 0 0-4.4-4.4L4.6 15.1z"/>',
    chip: '<rect x="7.2" y="7.2" width="9.6" height="9.6" rx="2"/><path d="M10.2 3.6v3.6M13.8 3.6v3.6M10.2 16.8v3.6M13.8 16.8v3.6M3.6 10.2h3.6M3.6 13.8h3.6M16.8 10.2h3.6M16.8 13.8h3.6"/><circle cx="12" cy="12" r="1.9"/>',
    arsip: '<path d="M3.6 7.6a2 2 0 0 1 2-2h3.1l1.8 2.3h6.9a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2z"/><path d="M3.6 10.4h16.8"/>',
    dokumen: '<path d="M6.2 3.6h6.9l4.7 4.7v12.1H6.2z"/><path d="M13.1 3.6v4.7h4.7"/><path d="M9 13.2h6M9 16.6h4.2"/>',
    gir: '<circle cx="12" cy="12" r="3.1"/><path d="M12 2.9v2.7M12 18.4v2.7M2.9 12h2.7M18.4 12h2.7M5.6 5.6l1.9 1.9M16.5 16.5l1.9 1.9M18.4 5.6l-1.9 1.9M7.5 16.5l-1.9 1.9"/>',
    bulan: '<path d="M20 14.6A8.6 8.6 0 0 1 9.4 4a8.6 8.6 0 1 0 10.6 10.6z"/>',
    matahari: '<circle cx="12" cy="12" r="4"/><path d="M12 2.6v2.3M12 19.1v2.3M2.6 12h2.3M19.1 12h2.3M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6"/>',
    api: '<path d="M12 3.2c2.7 3.2 6 5.3 6 9.4A6 6 0 0 1 6 12.6c0-2.3 1.2-4 2.6-5.4.2 1.5 1 2.3 1.9 2.5C10 7.7 11 5.2 12 3.2z"/>',
    tidur: '<path d="M20 14.6A8.6 8.6 0 0 1 9.4 4a8.6 8.6 0 1 0 10.6 10.6z"/><path d="M13.2 8.4h3.4l-3.4 3.4h3.4"/>',
    ponsel: '<rect x="7.2" y="2.6" width="9.6" height="18.8" rx="2.2"/><path d="M10.6 5.6h2.8"/><circle cx="12" cy="18.2" r=".85"/>',
    kilau: '<path d="M11 3l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8z"/><path d="M18 15.4l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    target: '<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r=".9"/>',
    naik: '<path d="M3.6 17.4l5.1-5.1 3.4 3.4 6.1-6.6"/><path d="M14.4 8.4h4.8v4.8"/>',
    turun: '<path d="M3.6 6.6l5.1 5.1 3.4-3.4 6.1 6.6"/><path d="M14.4 15.6h4.8v-4.8"/>',
    buku: '<path d="M12 6.6C10.5 5.2 8.4 4.5 5.8 4.5c-1 0-1.8.1-2.4.3v13.4c.6-.2 1.4-.3 2.4-.3 2.6 0 4.7.7 6.2 2z"/><path d="M12 6.6c1.5-1.4 3.6-2.1 6.2-2.1 1 0 1.8.1 2.4.3v13.4c-.6-.2-1.4-.3-2.4-.3-2.6 0-4.7.7-6.2 2z"/><path d="M12 6.6v13.9"/>',
    lampu: '<path d="M9.2 17.6h5.6"/><path d="M10.2 20.4h3.6"/><path d="M12 3.4a5.6 5.6 0 0 0-3.3 10.1c.5.4.7 1 .7 1.6v.5h5.2v-.5c0-.6.2-1.2.7-1.6A5.6 5.6 0 0 0 12 3.4z"/>',
    kalender: '<rect x="3.6" y="5.2" width="16.8" height="15.2" rx="2"/><path d="M3.6 10h16.8"/><path d="M8.2 3.2v4M15.8 3.2v4"/>',
    batang: '<path d="M4.4 20V12.6M9.5 20V7.8M14.6 20v-8.6M19.7 20V5"/>',
    timer: '<circle cx="12" cy="13.4" r="7.6"/><path d="M12 9.4v4.4l3 1.8"/><path d="M9.4 2.8h5.2"/>',
    cek: '<path d="M4.6 12.4l5 5 9.8-10.8"/>',
    papan: '<rect x="8.2" y="3.4" width="11.8" height="15.2" rx="2"/><path d="M16 18.6v1a1.2 1.2 0 0 1-1.2 1.2H5.8a2 2 0 0 1-2-2V7.6a2 2 0 0 1 2-2h1"/>',
    sampah: '<path d="M4.4 6.6h15.2"/><path d="M9.6 6.6V4.2h4.8v2.4"/><path d="M6.4 6.6l1 13.2h9.2l1-13.2"/><path d="M10.4 10.6v6M13.6 10.6v6"/>',
    klaster: '<circle cx="7.4" cy="7.4" r="2.7"/><circle cx="16.6" cy="8.4" r="2.7"/><circle cx="11.2" cy="16.8" r="2.7"/><path d="M9.8 8.4l4.4.2M8.6 9.8l1.8 4.4M15.6 10.8l-3 4"/>',
    penggaris: '<path d="M3.4 15.6 15.6 3.4l4.9 4.9L8.3 20.5z"/><path d="M7.4 11.6l1.8 1.8M10.2 8.8l1.8 1.8M13 6l1.8 1.8"/>',
    ulang: '<path d="M4.6 12a7.4 7.4 0 0 1 12.6-5.2"/><path d="M17.4 3.4v3.6h-3.6"/><path d="M19.4 12a7.4 7.4 0 0 1-12.6 5.2"/><path d="M6.6 20.6v-3.6h3.6"/>',
    dna: '<path d="M7.2 3c0 6 9.6 6 9.6 12 0 2.2-.7 4.2-2 6"/><path d="M16.8 3c0 6-9.6 6-9.6 12 0 2.2.7 4.2 2 6"/><path d="M8.8 8.2h6.4M8.8 16h6.4"/>',
    jaring: '<path d="M12 3.2l7.6 4.4v8.8L12 20.8l-7.6-4.4V7.6z"/><path d="M12 3.2v17.6M4.4 7.6l15.2 8.8M19.6 7.6 4.4 16.4"/>',
    pin: '<path d="M12 20.8s6.4-6 6.4-10.4A6.4 6.4 0 0 0 5.6 10.4C5.6 14.8 12 20.8 12 20.8z"/><circle cx="12" cy="10.2" r="2.4"/>',
    cari: '<circle cx="10.8" cy="10.8" r="6.4"/><path d="M15.4 15.4l4.6 4.6"/>',
    kristal: '<circle cx="12" cy="9.8" r="6.2"/><path d="M8.6 15.2 7.2 21h9.6l-1.4-5.8"/>',
    unduh: '<path d="M12 3.4v11"/><path d="M7.7 10.4 12 14.7l4.3-4.3"/><path d="M4.6 19.6h14.8"/>',
    simpan: '<path d="M4.6 5.6a1 1 0 0 1 1-1h9.9l3.9 3.9v9.9a1 1 0 0 1-1 1H5.6a1 1 0 0 1-1-1z"/><path d="M8.2 4.6v5h5.6v-5"/><rect x="7.6" y="13.2" width="8.8" height="6.4" rx=".7"/>',
    balik: '<path d="M4.2 10.6h9.6a5.4 5.4 0 0 1 0 10.8H8.4"/><path d="M7.6 6.2 4.2 10.6l3.4 4.4"/>',
    peringatan: '<path d="M12 3.8l8.8 15.4H3.2z"/><path d="M12 9v4.6M12 16.6v.1"/>',
    piala: '<path d="M8.2 3.6h7.6v5a3.8 3.8 0 0 1-7.6 0z"/><path d="M8.2 5.4H5.6v1.4a3 3 0 0 0 2.6 3M15.8 5.4h2.6v1.4a3 3 0 0 1-2.6 3"/><path d="M12 12.4v4.2M8.6 20.4h6.8"/><path d="M10 16.6h4l.7 3.8H9.3z"/>',
    mata: '<path d="M2.9 12S6.7 6.2 12 6.2 21.1 12 21.1 12 17.3 17.8 12 17.8 2.9 12 2.9 12z"/><circle cx="12" cy="12" r="2.9"/>',
    silang: '<path d="M6 6l12 12M18 6 6 18"/>',
    tunas: '<path d="M12 20.6v-8.2"/><path d="M12 12.4C12 9 9.6 6.6 6.2 6.6c0 3.6 2.4 5.8 5.8 5.8z"/><path d="M12 13.4c0-3 2.1-5.2 5.2-5.2 0 3.2-2.1 5.2-5.2 5.2z"/>',
    panah: '<path d="M12 19.4V5"/><path d="M6.6 10.4 12 5l5.4 5.4"/>',
    jam: '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l3.4 2"/>',
  };

  /* ---------- pembuat SVG ---------- */
  function svg(nama, kelas) {
    const isi = BENTUK[nama] || BENTUK.klaster;
    return (
      '<svg viewBox="0 0 24 24"' + (kelas ? ' class="' + kelas + '"' : "") +
      ' aria-hidden="true" focusable="false">' + isi + "</svg>"
    );
  }

  /* ikon yang sudah dibungkus span.ikon (dipakai di dalam teks/kartu) */
  function bungkus(nama, kelas) {
    return '<span class="ikon' + (kelas ? " " + kelas : "") + '">' + svg(nama) + "</span>";
  }

  function punya(nama) {
    return Object.prototype.hasOwnProperty.call(BENTUK, nama);
  }

  global.Ikon = { svg: svg, bungkus: bungkus, punya: punya, BENTUK: BENTUK };
})(typeof window !== "undefined" ? window : globalThis);
