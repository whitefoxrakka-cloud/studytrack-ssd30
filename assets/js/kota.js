/* ============================================================
   kota.js — latar kota futuristik beranimasi
   Tiga lapis gedung (jauh / tengah / dekat) yang bergeser tanpa putus,
   jendela berkedip, kendaraan terbang, papan hologram, bintang, hujan.
   Dibangkitkan dengan bibit tetap supaya bentuknya sama tiap muat.
   ============================================================ */
(function (global) {
  "use strict";

  function rng(bibit) {
    let a = bibit >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const TILE = 1200;   // lebar satu ubin
  const TINGGI = 420;  // tinggi kanvas

  /* ---------- satu lapis gedung ---------- */
  function lapis(opsi) {
    const acak = rng(opsi.bibit);
    const gedung = [];
    let x = -20;
    while (x < TILE) {
      const lebar = 34 + Math.floor(acak() * 78);
      const tinggi = opsi.minTinggi + Math.floor(acak() * (opsi.maksTinggi - opsi.minTinggi));
      const atap = acak();
      gedung.push({ x, lebar, tinggi, atap, tanda: acak() < opsi.peluangTanda });
      x += lebar + 4 + Math.floor(acak() * 14);
    }

    let isi = "";
    gedung.forEach((g, i) => {
      const y = TINGGI - g.tinggi;
      isi += '<rect x="' + g.x + '" y="' + y + '" width="' + g.lebar + '" height="' + g.tinggi + '" fill="' + opsi.warna + '"/>';
      /* atap bertingkat */
      if (g.atap > 0.55) {
        const wt = Math.max(8, g.lebar * 0.34);
        isi += '<rect x="' + (g.x + g.lebar * 0.22) + '" y="' + (y - 10) + '" width="' + wt + '" height="10" fill="' + opsi.warna + '"/>';
      }
      /* antena */
      if (g.atap > 0.78) {
        const ax = g.x + g.lebar / 2;
        isi += '<rect x="' + ax + '" y="' + (y - 34) + '" width="2" height="34" fill="' + opsi.warna + '"/>';
        isi += '<circle class="lampu-antena" cx="' + (ax + 1) + '" cy="' + (y - 36) + '" r="2.2" fill="' + opsi.neon[0] + '"/>';
      }
      /* jendela */
      if (opsi.jendela) {
        const kolom = Math.max(1, Math.floor((g.lebar - 8) / 9));
        const baris = Math.max(1, Math.floor((g.tinggi - 14) / 11));
        for (let c = 0; c < kolom; c++) {
          for (let r = 0; r < baris; r++) {
            if (acak() > opsi.peluangNyala) continue;
            const kelas = "j" + (1 + Math.floor(acak() * 3));
            const warna = acak() < 0.14 ? opsi.neon[Math.floor(acak() * opsi.neon.length)] : opsi.jendela;
            isi += '<rect class="jendela ' + kelas + '" x="' + (g.x + 4 + c * 9) + '" y="' + (y + 8 + r * 11) + '" width="3.4" height="4.6" fill="' + warna + '" opacity="' + (0.35 + acak() * 0.55).toFixed(2) + '"/>';
          }
        }
      }
      /* papan reklame */
      if (g.tanda) {
        const sx = g.x + 4, sy = y + 12 + Math.floor(acak() * Math.max(1, g.tinggi - 60));
        const sw = Math.min(g.lebar - 8, 26 + Math.floor(acak() * 22));
        const warna = opsi.neon[Math.floor(acak() * opsi.neon.length)];
        isi += '<rect class="tanda" x="' + sx + '" y="' + sy + '" width="' + sw + '" height="6" rx="1" fill="' + warna + '" opacity=".75"/>';
        isi += '<rect x="' + sx + '" y="' + sy + '" width="' + sw + '" height="6" rx="1" fill="none" stroke="' + warna + '" stroke-width=".6" opacity=".9"/>';
      }
    });

    return (
      '<svg class="kota-svg" viewBox="0 0 ' + TILE * 2 + " " + TINGGI + '" preserveAspectRatio="xMinYMax slice" aria-hidden="true">' +
      '<g>' + isi + "</g>" +
      '<g transform="translate(' + TILE + ',0)">' + isi + "</g>" +
      "</svg>"
    );
  }

  /* ---------- bintang ---------- */
  /* Kanvas tetap 1000×620 dengan slice, supaya bintang bulat (tidak
     gepeng) walau lapisnya melebar mengikuti layar. */
  function bintang() {
    const acak = rng(77);
    let isi = "";
    for (let i = 0; i < 96; i++) {
      const x = acak() * 1000;
      const y = acak() * 620;
      const r = 0.7 + acak() * 1.7;
      const kelas = "b" + (1 + Math.floor(acak() * 3));
      isi += '<circle class="bintang ' + kelas + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(2) + '"/>';
    }
    return (
      '<svg class="bintang-baris" viewBox="0 0 1000 620" preserveAspectRatio="xMidYMin slice" aria-hidden="true">' +
      isi + "</svg>"
    );
  }

  /* ---------- hujan ---------- */
  function hujan() {
    const acak = rng(303);
    let isi = "";
    for (let i = 0; i < 26; i++) {
      const x = acak() * 100;
      isi += '<i style="left:' + x.toFixed(2) + "%;animation-duration:" + (1.1 + acak() * 1.6).toFixed(2) +
        "s;animation-delay:-" + (acak() * 3).toFixed(2) + "s;opacity:" + (0.12 + acak() * 0.22).toFixed(2) + '"></i>';
    }
    return '<div class="hujan" aria-hidden="true">' + isi + "</div>";
  }

  /* ---------- kendaraan terbang ---------- */
  function kendaraan() {
    const acak = rng(505);
    let isi = "";
    for (let i = 0; i < 5; i++) {
      const atas = 12 + acak() * 44;
      const dur = 18 + acak() * 24;
      const tunda = -acak() * 34;
      const warna = acak() < 0.55 ? "#22d3ee" : "#ff2d95";
      const lebar = 14 + Math.floor(acak() * 12);
      isi += '<i style="top:' + atas.toFixed(1) + "%;width:" + lebar + "px;background:" + warna +
        ";box-shadow:0 0 4px " + warna + ",0 0 11px " + warna +
        ";animation-duration:" + dur.toFixed(1) + "s;animation-delay:" + tunda.toFixed(1) + "s;opacity:" +
        (0.5 + acak() * 0.4).toFixed(2) + '"></i>';
    }
    return '<div class="kendaraan" aria-hidden="true">' + isi + "</div>";
  }

  function pasang() {
    const wadah = document.getElementById("kota");
    if (!wadah) return;

    wadah.innerHTML =
      '<div class="kota-langit"></div>' +
      bintang() +
      '<div class="kota-bulan" aria-hidden="true"></div>' +
      '<div class="kota-lapis" data-lapis="jauh">' +
        lapis({ bibit: 11, minTinggi: 90, maksTinggi: 210, warna: "#0b1226", jendela: null, peluangNyala: 0, peluangTanda: 0.04, neon: ["#1b3a5c"] }) +
      "</div>" +
      '<div class="kota-lapis" data-lapis="tengah">' +
        lapis({ bibit: 23, minTinggi: 130, maksTinggi: 290, warna: "#0a1020", jendela: "#3a6a94", peluangNyala: 0.19, peluangTanda: 0.16, neon: ["#22d3ee", "#7c5cff", "#ff2d95"] }) +
      "</div>" +
      '<div class="kota-lapis" data-lapis="dekat">' +
        lapis({ bibit: 41, minTinggi: 170, maksTinggi: 360, warna: "#070c1a", jendela: "#4b83ad", peluangNyala: 0.26, peluangTanda: 0.24, neon: ["#22d3ee", "#ff2d95", "#ffb020", "#2ee6a8"] }) +
      "</div>" +
      kendaraan() +
      hujan() +
      '<div class="kota-kabut"></div>';

    /* parallax halus saat menggulir */
    let minta = false;
    const geser = () => {
      minta = false;
      const y = global.scrollY || 0;
      const daftar = wadah.querySelectorAll(".kota-lapis");
      const faktor = [0.02, 0.05, 0.09];
      daftar.forEach((el, i) => {
        el.style.setProperty("--par", (y * faktor[i]).toFixed(1) + "px");
      });
    };
    global.addEventListener("scroll", () => {
      if (minta) return;
      minta = true;
      requestAnimationFrame(geser);
    }, { passive: true });
  }

  global.Kota = { pasang };
})(typeof window !== "undefined" ? window : globalThis);
