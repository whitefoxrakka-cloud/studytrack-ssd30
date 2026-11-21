/* Uji unit mesin Data Sains.
   Jalankan: node --test tests/
   (dipakai sebagai bukti Unit Testing pada laporan Bab V) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const AKAR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const KM = require("../assets/js/kmeans.js");

/* muat dataset */
const sumber = readFileSync(resolve(AKAR, "assets/js/dataset.js"), "utf8");
const semu = {};
new Function("window", sumber)(semu);
const DATA = semu.SURVEI;

test("dataset berisi 90 responden dengan 6 fitur lengkap", () => {
  assert.equal(DATA.length, 90);
  for (const b of DATA) {
    for (const f of KM.FITUR) {
      assert.equal(typeof b[f.kunci], "number", `${b.id}.${f.kunci} harus angka`);
      assert.ok(b[f.kunci] >= 0, `${b.id}.${f.kunci} tidak boleh negatif`);
    }
  }
});

test("standardisasi menghasilkan rata-rata 0 dan simpangan baku 1", () => {
  const M = DATA.map(KM.vektor);
  const { Z } = KM.standardisasi(M);
  for (let j = 0; j < M[0].length; j++) {
    const kolom = Z.map((b) => b[j]);
    const rata = kolom.reduce((s, v) => s + v, 0) / kolom.length;
    const simp = Math.sqrt(kolom.reduce((s, v) => s + (v - rata) ** 2, 0) / kolom.length);
    assert.ok(Math.abs(rata) < 1e-9, `rata fitur ${j} = ${rata}`);
    assert.ok(Math.abs(simp - 1) < 1e-9, `simpangan fitur ${j} = ${simp}`);
  }
});

test("K-Means k=3: semua cluster terisi, SSE turun, label lengkap", () => {
  const M = DATA.map(KM.vektor);
  const { Z } = KM.standardisasi(M);
  const m = KM.kmeans(Z, 3, { bibit: 42 });
  assert.equal(m.label.length, DATA.length);
  assert.equal(m.pusat.length, 3);
  for (let c = 0; c < 3; c++) {
    assert.ok(m.label.filter((l) => l === c).length > 0, `cluster ${c} kosong`);
  }
  const riw = m.riwayatSSE;
  for (let i = 1; i < riw.length; i++) assert.ok(riw[i] <= riw[i - 1] + 1e-9, "SSE harus menurun");
  assert.ok(m.iterasi > 0 && m.iterasi <= 300);
});

test("K-Means deterministik untuk bibit yang sama", () => {
  const M = DATA.map(KM.vektor);
  const { Z } = KM.standardisasi(M);
  const a = KM.kmeans(Z, 3, { bibit: 7 });
  const b = KM.kmeans(Z, 3, { bibit: 7 });
  assert.deepEqual(a.label, b.label);
  assert.ok(Math.abs(a.sse - b.sse) < 1e-12);
});

test("silhouette berada pada rentang -1 sampai 1", () => {
  const M = DATA.map(KM.vektor);
  const { Z } = KM.standardisasi(M);
  const m = KM.kmeans(Z, 3, { bibit: 42 });
  const s = KM.silhouette(Z, m.label, 3);
  assert.ok(s > -1 && s <= 1, `silhouette = ${s}`);
  assert.ok(s > 0.25, "kualitas cluster harus cukup baik (s > 0.25)");
});

test("regresi linear tepat pada data garis lurus", () => {
  const x = [1, 2, 3, 4, 5];
  const y = x.map((v) => 2 * v + 1);
  const r = KM.regresi(x, y);
  assert.ok(Math.abs(r.a - 2) < 1e-9);
  assert.ok(Math.abs(r.b - 1) < 1e-9);
  assert.ok(Math.abs(r.r2 - 1) < 1e-9);
});

test("analisis penuh: profil cluster berurutan dari skor tertinggi", () => {
  const h = KM.analisis(DATA, { k: 3 });
  assert.equal(h.profil.length, 3);
  const total = h.profil.reduce((s, p) => s + p.jumlah, 0);
  assert.equal(total, DATA.length);
  const urut = h.profil.slice().sort((a, b) => b.skor - a.skor);
  assert.equal(urut[0].nama, "Kebiasaan Tinggi");
  assert.equal(urut[2].nama, "Perlu Ditingkatkan");
  for (const p of h.profil) assert.ok(p.persen > 0 && p.persen < 100);
});

test("tempatkan menempatkan vektor ekstrem pada cluster yang wajar", () => {
  const h = KM.analisis(DATA, { k: 3 });
  const rajin = KM.tempatkan(h, { durasi: 6, frekuensi: 7, tidur: 8, tugas: 14, hp: 0.3, mandiri: 7 });
  const malas = KM.tempatkan(h, { durasi: 0.4, frekuensi: 1, tidur: 4.5, tugas: 0, hp: 6.5, mandiri: 0 });
  assert.equal(rajin.profil.nama, "Kebiasaan Tinggi");
  assert.equal(malas.profil.nama, "Perlu Ditingkatkan");
});
