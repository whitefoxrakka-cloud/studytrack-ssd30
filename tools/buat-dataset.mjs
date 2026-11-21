/**
 * Pembuat dataset survei StudyTrack.
 *
 * Dataset ini adalah data SINTETIS yang dibangkitkan dari tiga arketipe
 * kebiasaan belajar (tinggi / sedang / perlu ditingkatkan) + derau acak.
 * Tujuannya: aplikasi bisa didemokan tanpa menunggu hasil Google Forms.
 * Saat data survei asli sudah terkumpul, cukup ganti assets/js/dataset.js
 * (atau impor CSV lewat menu Dataset) tanpa mengubah kode lain.
 *
 * Jalankan: node tools/buat-dataset.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AKAR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------- Random deterministik (mulberry32) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const acak = mulberry32(20261121);

/* Box-Muller: derau normal */
function normal() {
  let u = 0, v = 0;
  while (u === 0) u = acak();
  while (v === 0) v = acak();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const batas = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const bulat = (x) => Math.round(x * 10) / 10;

/* ---------- Arketipe ---------- */
const ARKETIPE = [
  {
    kode: "T",
    durasi: 4.6, frekuensi: 5.8, tidur: 7.4, tugas: 9.2, hp: 1.1, mandiri: 4.9,
    sebar: { durasi: 0.8, frekuensi: 0.7, tidur: 0.55, tugas: 1.8, hp: 0.5, mandiri: 1.1 },
  },
  {
    kode: "S",
    durasi: 2.7, frekuensi: 4.1, tidur: 6.6, tugas: 5.6, hp: 2.7, mandiri: 3.0,
    sebar: { durasi: 0.7, frekuensi: 0.9, tidur: 0.7, tugas: 1.7, hp: 0.8, mandiri: 1.0 },
  },
  {
    kode: "R",
    durasi: 1.3, frekuensi: 2.2, tidur: 5.7, tugas: 2.9, hp: 4.4, mandiri: 1.2,
    sebar: { durasi: 0.5, frekuensi: 0.8, tidur: 0.85, tugas: 1.3, hp: 1.0, mandiri: 0.7 },
  },
];

const PRODI = ["Data Sains", "Informatika", "Sistem Informasi", "Matematika", "Statistika"];
const ANGKATAN = [2022, 2023, 2024, 2025];

/* 90 responden: 30 per arketipe, lalu diacak urutannya */
const kandidat = [];
for (const a of ARKETIPE) {
  for (let i = 0; i < 30; i++) {
    kandidat.push({
      kode: a.kode,
      durasi: bulat(batas(a.durasi + normal() * a.sebar.durasi, 0.2, 8)),
      frekuensi: Math.round(batas(a.frekuensi + normal() * a.sebar.frekuensi, 1, 7)),
      tidur: bulat(batas(a.tidur + normal() * a.sebar.tidur, 3.5, 9.5)),
      tugas: Math.round(batas(a.tugas + normal() * a.sebar.tugas, 0, 15)),
      hp: bulat(batas(a.hp + normal() * a.sebar.hp, 0.1, 8)),
      mandiri: Math.round(batas(a.mandiri + normal() * a.sebar.mandiri, 0, 7)),
    });
  }
}
/* Fisher-Yates */
for (let i = kandidat.length - 1; i > 0; i--) {
  const j = Math.floor(acak() * (i + 1));
  [kandidat[i], kandidat[j]] = [kandidat[j], kandidat[i]];
}

const baris = kandidat.map((r, i) => ({
  id: "R" + String(i + 1).padStart(2, "0"),
  prodi: PRODI[Math.floor(acak() * PRODI.length)],
  angkatan: ANGKATAN[Math.floor(acak() * ANGKATAN.length)],
  durasi: r.durasi,
  frekuensi: r.frekuensi,
  tidur: r.tidur,
  tugas: r.tugas,
  hp: r.hp,
  mandiri: r.mandiri,
}));

const KEPALA = ["id", "prodi", "angkatan", "durasi", "frekuensi", "tidur", "tugas", "hp", "mandiri"];
const csv = [KEPALA.join(",")]
  .concat(baris.map((b) => KEPALA.map((k) => b[k]).join(",")))
  .join("\n") + "\n";

mkdirSync(resolve(AKAR, "data"), { recursive: true });
writeFileSync(resolve(AKAR, "data/survei.csv"), csv, "utf8");

const isiJs =
  "/* Dataset survei kebiasaan belajar mahasiswa (sintetis, 90 responden).\n" +
  "   Dibangkitkan oleh tools/buat-dataset.mjs — jangan disunting manual.\n" +
  "   Ganti berkas ini dengan hasil survei asli bila sudah tersedia. */\n" +
  "window.SURVEI = " +
  JSON.stringify(baris, null, 0).replace(/\},\{/g, "},\n{") +
  ";\n";
writeFileSync(resolve(AKAR, "assets/js/dataset.js"), isiJs, "utf8");

console.log("OK:", baris.length, "responden ->", "data/survei.csv + assets/js/dataset.js");
