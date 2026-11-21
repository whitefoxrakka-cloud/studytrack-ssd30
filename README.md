# StudyTrack

**Aplikasi analisis kebiasaan belajar mahasiswa dengan K-Means clustering.**

Tugas Besar Rekayasa Perangkat Lunak (SSD30) — Program Studi Data Sains, Fakultas Sains dan Teknologi,
UIN K.H. Abdurrahman Wahid Pekalongan.

> Versi ini adalah **versi web (front-end)**: seluruh fitur berjalan di peramban, data disimpan di
> `localStorage`, dan mesin K-Means ditulis sendiri dalam JavaScript sehingga dapat didemokan tanpa
> server. Rencana versi final (Flask + SQLite + scikit-learn) ada di bagian [Peta jalan](#peta-jalan).

**Demo langsung:** <https://whitefoxrakka-cloud.github.io/studytrack-ssd30/?demo=1>
(tautan `?demo=1` otomatis mengisi 14 hari data contoh).

---

## 1. Masalah dan solusi

Mahasiswa sulit menilai kebiasaan belajarnya sendiri secara objektif. Yang biasanya diingat hanya
"rajin" atau "malas", padahal kebiasaan belajar terdiri atas beberapa variabel yang saling
mempengaruhi: durasi belajar, frekuensi, durasi tidur, jumlah tugas yang selesai, penggunaan HP saat
belajar, dan inisiatif belajar mandiri.

**StudyTrack** mencatat sesi belajar harian, mengubahnya menjadi enam variabel terukur, lalu
mengelompokkan pola kebiasaan memakai **K-Means clustering**. Hasilnya berupa tiga kelompok
(Kebiasaan Tinggi / Sedang / Perlu Ditingkatkan), posisi pengguna di antara kelompok tersebut, dan
saran perbaikan yang spesifik — bukan sekadar statistik.

Pengguna sasaran: mahasiswa yang ingin memantau ritme belajarnya, dan pembimbing akademik yang ingin
melihat gambaran kebiasaan belajar sekelompok mahasiswa.

---

## 2. Fitur

| Kode | Fitur | Keterangan |
|------|-------|-----------|
| FR-01 | Catat sesi belajar | Tanggal, mata kuliah, jenis (mandiri/kelompok/kelas), durasi, fokus 1–5, menit main HP, tugas selesai, jam tidur, catatan |
| FR-02 | Kelola riwayat sesi | Filter 7/30 hari/semua, sunting, hapus, rekap per hari |
| FR-03 | Dasbor | Ring target harian, statistik pekan, grafik 7 hari, mata kuliah terbanyak, posisi cluster |
| FR-04 | Analisis K-Means | Jalankan clustering dengan k=2..5, scatter plot, profil tiap cluster, radar, elbow, silhouette |
| FR-05 | Posisi pengguna | Vektor fitur pengguna ditempatkan ke centroid terdekat, dibandingkan dengan rata-rata kelompoknya |
| FR-06 | Kelola dataset | Tabel 90 responden, pencarian, filter prodi, hapus baris, impor CSV, ekspor CSV, reset |
| FR-07 | Laporan | Rekap pekan, proyeksi regresi linear, ringkasan cluster, cetak/PDF, ekspor CSV/JSON |
| FR-08 | Tema & PWA | Mode terang/gelap, dapat dipasang sebagai aplikasi (service worker) |

**Non-fungsional utama:** antarmuka mobile-first (≤390 px tetap rapi), tanpa dependensi pihak ketiga,
hasil clustering deterministik (bibit tetap), waktu analisis < 100 ms untuk 90 data, data pengguna
tidak pernah keluar dari peramban.

---

## 3. Komponen Data Sains

**Metode:** K-Means clustering (implementasi sendiri, `assets/js/kmeans.js`).

1. **Preprocessing** — enam fitur diambil dari sesi belajar 7 hari terakhir, lalu distandarkan
   *z-score* (`z = (x − μ) / σ`) agar fitur dengan satuan berbeda (jam, hari, jumlah) sebanding.
2. **Inisialisasi** — *k-means++* dengan pembangkit acak ber-bibit (`mulberry32`, bibit 42) supaya
   hasil dapat diulang persis saat didemokan.
3. **Iterasi** — penetapan titik ke centroid terdekat dan pembaruan centroid, berhenti bila
   pergeseran < 1e-6 atau 300 iterasi. Cluster kosong diatasi dengan memindahkan centroid ke titik
   terjauh.
4. **Evaluasi** — *silhouette score* (kualitas pemisahan) dan *elbow method* (SSE terhadap k).
   Pada dataset bawaan: **k = 3, silhouette = 0,355, SSE = 162, stabil dalam 5 iterasi**.
5. **Pelabelan** — cluster diberi peringkat memakai skor komposit berbobot (HP sebagai fitur negatif),
   lalu dinamai Kebiasaan Tinggi / Sedang / Perlu Ditingkatkan.
6. **Prediksi posisi** — vektor fitur pengguna distandarkan dengan μ dan σ dataset, lalu ditempatkan
   ke centroid terdekat.
7. **Proyeksi** — regresi linear kuadrat terkecil atas total menit per pekan untuk memperkirakan pekan
   berikutnya (dilengkapi R²).

Variabel yang dipakai (mengikuti rencana kuesioner):

| Fitur | Satuan | Arah |
|-------|--------|------|
| Durasi belajar | jam/hari | makin tinggi makin baik |
| Frekuensi belajar | hari/minggu | makin tinggi makin baik |
| Durasi tidur | jam/hari | makin tinggi makin baik |
| Tugas selesai | tugas/minggu | makin tinggi makin baik |
| Penggunaan HP saat belajar | jam/hari | makin tinggi makin **buruk** |
| Belajar mandiri | sesi/minggu | makin tinggi makin baik |

Penjelasan rumus dan cara mempertanggungjawabkannya saat presentasi ada di
[`docs/METODE.md`](docs/METODE.md).

---

## 4. Dataset

- `data/survei.csv` — 90 responden, 6 variabel (`id, prodi, angkatan, durasi, frekuensi, tidur, tugas, hp, mandiri`).
- `assets/js/dataset.js` — berkas yang dibaca aplikasi (tanpa `fetch`, jadi tetap jalan dari `file://`).
- Keduanya dibangkitkan oleh `tools/buat-dataset.mjs` dari tiga arketipe kebiasaan + derau normal,
  dengan bibit tetap. **Datanya sintetis** — dipakai agar aplikasi bisa didemokan sebelum survei asli
  terkumpul.

Mengganti dengan data survei asli:

1. Kumpulkan lewat Google Forms dengan pertanyaan sesuai enam variabel di atas.
2. Ekspor CSV, samakan nama kolom, lalu **impor lewat tab Dataset** (minimal 10 baris) atau timpa
   `data/survei.csv` dan jalankan ulang `node tools/buat-dataset.mjs` setelah menyesuaikan sumbernya.
3. Jalankan ulang analisis; seluruh grafik dan profil cluster ikut berubah.

---

## 5. Struktur proyek

```
studytrack-ssd30/
├─ index.html                  kerangka halaman (topbar, main, tabbar, maskot)
├─ manifest.webmanifest        metadata PWA
├─ sw.js                       service worker (cache luring)
├─ assets/
│  ├─ css/app.css              seluruh gaya, termasuk tema gelap & gaya cetak
│  ├─ ikon.svg                 ikon aplikasi
│  └─ js/
│     ├─ dataset.js            data survei (dibangkitkan)
│     ├─ kmeans.js             mesin Data Sains (murni, bisa diuji Node)
│     ├─ grafik.js             pembuat grafik SVG (tanpa pustaka)
│     └─ app.js                state, tampilan, dan interaksi
├─ data/survei.csv             dataset dalam bentuk CSV
├─ tools/buat-dataset.mjs      pembangkit dataset (deterministik)
├─ tests/kmeans.test.mjs       uji unit mesin Data Sains
└─ docs/METODE.md              penjelasan metode & rumus
```

---

## 6. Menjalankan

**Cara cepat:** buka `index.html` langsung di peramban (semua fitur jalan dari `file://`).

**Dengan server lokal** (disarankan agar service worker aktif):

```bash
python -m http.server 8000
# buka http://localhost:8000
```

**Mode demo** (mengisi 14 hari contoh otomatis):

```
http://localhost:8000/?demo=1
http://localhost:8000/?demo=1#analisis     # langsung ke tab analisis
http://localhost:8000/?tema=gelap          # tema gelap
```

---

## 7. Pengujian

```bash
node --test tests/kmeans.test.mjs
```

Delapan uji unit, semuanya lulus:

| Uji | Yang diperiksa |
|-----|----------------|
| Dataset | 90 responden, enam fitur berupa angka tak negatif |
| Standardisasi | rata-rata ≈ 0, simpangan baku ≈ 1 untuk setiap fitur |
| K-Means k=3 | semua cluster terisi, SSE menurun tiap iterasi, label lengkap |
| Determinisme | bibit sama → label dan SSE identik |
| Silhouette | berada di rentang (−1, 1] dan > 0,25 |
| Regresi | tepat pada data garis lurus (a=2, b=1, R²=1) |
| Analisis penuh | total anggota = jumlah data, peringkat cluster benar |
| Penempatan | vektor ekstrem jatuh ke cluster yang wajar |

Hasil aktual pada dataset bawaan:

```
Kebiasaan Tinggi     30 responden (33%)  durasi 4,7 j/hari · tidur 7,4 j · HP 1,1 j
Kebiasaan Sedang     28 responden (31%)  durasi 2,6 j/hari · tidur 6,4 j · HP 2,7 j
Perlu Ditingkatkan   32 responden (36%)  durasi 1,4 j/hari · tidur 5,7 j · HP 4,1 j
silhouette 0,355 · SSE 162 · iterasi 5 · k=3
```

---

## 8. Peta jalan menuju versi final

Versi web ini sudah memuat seluruh alur bisnis dan komponen Data Sains. Untuk memenuhi ketentuan
"basis data terhubung" pada tugas besar, langkah berikutnya:

| Langkah | Rencana |
|---------|---------|
| Backend | FastAPI (Python) — `/sesi`, `/dataset`, `/analisis`, `/laporan` |
| Basis data | SQLite: `pengguna`, `sesi_belajar`, `responden_survei`, `hasil_cluster`, `laporan` |
| Model | scikit-learn `KMeans` + `StandardScaler`; hasil disimpan ke `hasil_cluster` |
| Frontend | halaman ini dipindah memanggil API (lapisan `data` dipisah agar mudah ditukar) |
| Pengujian | unit (pytest untuk model), integration (API + DB), black-box (skenario FR-01..FR-08) |
| UAT | kuesioner 10 pernyataan skala Likert kepada 15–20 mahasiswa |

Pemisahan berkas sudah disiapkan untuk itu: `kmeans.js` tidak menyentuh DOM, sehingga logikanya bisa
langsung dibandingkan dengan hasil scikit-learn sebagai uji silang.

---

## 9. Pembagian tugas (contoh, 4 anggota)

| Anggota | Tanggung jawab | Diagram |
|---------|----------------|---------|
| 1 | FR-01, FR-02 — pencatatan & pengelolaan sesi | 1 Activity + 1 Sequence |
| 2 | FR-03, FR-07 — dasbor & laporan | 1 Activity + 1 Sequence |
| 3 | FR-04, FR-05 — mesin K-Means & penempatan cluster | 1 Activity + 1 Sequence |
| 4 | FR-06 — pengelolaan dataset & impor CSV | 1 Activity + 1 Sequence |
| semua | Use Case & Class Diagram | kolaboratif |

Kontribusi ditelusuri lewat riwayat commit; setiap anggota memegang minimal satu FR.

---

## 10. Catatan

- Aplikasi ini diturunkan dari **Target Ashira** (pelacak target pribadi) — struktur tab, sistem
  penyimpanan, dan gaya visualnya dipakai ulang, lalu diarahkan ke domain akademik dan dilengkapi
  komponen Data Sains.
- Tanpa dependensi eksternal: tidak ada framework, tidak ada CDN, tidak ada data yang dikirim keluar.
- Data contoh bersifat sintetis dan tidak mewakili populasi nyata; jangan dipakai sebagai klaim
  penelitian tanpa menggantinya dengan hasil survei.
