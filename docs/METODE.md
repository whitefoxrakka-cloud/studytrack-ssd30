# Metode Data Sains — StudyTrack

Dokumen ini menjelaskan perhitungan yang benar-benar dijalankan aplikasi, agar bisa dipertanggungjawabkan
saat presentasi dan dipakai sebagai bahan Bab IV laporan.

Berkas terkait: `assets/js/kmeans.js` (semua rumus di bawah ada di sana, fungsi per fungsi).

---

## 1. Dari sesi belajar ke vektor fitur

Setiap sesi mencatat: tanggal, mata kuliah, jenis, durasi (menit), fokus (1–5), menit main HP,
jumlah tugas selesai, dan jam tidur malam sebelumnya.

Untuk jendela **7 hari terakhir**, keenam fitur dihitung:

| Fitur | Rumus |
|-------|-------|
| `durasi` | Σ menit belajar ÷ 7 ÷ 60 → jam/hari |
| `frekuensi` | banyaknya tanggal unik yang punya sesi → hari/minggu |
| `tidur` | rata-rata jam tidur per tanggal (bila kosong dipakai 7) |
| `tugas` | Σ tugas selesai → tugas/minggu |
| `hp` | Σ menit main HP ÷ 7 ÷ 60 → jam/hari |
| `mandiri` | banyaknya sesi berjenis *mandiri* |

Alasan memakai jendela 7 hari: kebiasaan belajar bersifat mingguan (siklus kuliah), dan jendela
panjang membuat data lama menutupi perubahan terbaru.

---

## 2. Standardisasi z-score

Fitur punya satuan berbeda — 4,7 jam/hari vs 6 hari/minggu vs 9 tugas/minggu. Tanpa penyeragaman,
fitur bernilai besar akan mendominasi jarak.

```
z_ij = (x_ij − μ_j) / σ_j
```

dengan `μ_j` rata-rata dan `σ_j` simpangan baku fitur ke-j pada dataset (populasi, bukan sampel).
Setelah transformasi, setiap fitur punya rata-rata 0 dan simpangan baku 1. Uji unit memverifikasi
ini sampai galat 1e-9.

**Konsekuensi yang perlu disebut saat presentasi:** karena memakai μ dan σ dataset, data pengguna
diposisikan *relatif terhadap populasi responden*, bukan dibandingkan dengan dirinya sendiri.

---

## 3. K-Means

### 3.1 Inisialisasi k-means++

1. Ambil satu titik acak sebagai centroid pertama.
2. Untuk setiap titik, hitung `D(x)²` = jarak kuadrat ke centroid terdekat.
3. Pilih titik berikutnya dengan peluang sebanding `D(x)²`.
4. Ulangi sampai k centroid terkumpul.

Dibanding centroid acak murni, k-means++ menurunkan peluang berhenti di optimum lokal yang buruk.
Pembangkit acak yang dipakai ber-bibit tetap (mulberry32, bibit 42), jadi **setiap kali dijalankan
hasilnya sama** — penting saat demo di depan kelas.

### 3.2 Iterasi

```
ulangi:
  untuk setiap titik i:  label[i] = argmin_c ||x_i − c_c||²
  untuk setiap cluster c: c_c = rata-rata x_i dengan label[i] = c
  berhenti bila pergeseran centroid terbesar < 1e-6 atau iterasi = 300
```

Bila sebuah cluster kosong, centroid-nya dipindahkan ke titik yang paling jauh dari centroid-nya
sendiri (bukan dibiarkan kosong), supaya k tetap terjaga.

### 3.3 Fungsi objektif

```
SSE = Σ_i ||x_i − c_label(i)||²
```

SSE selalu menurun atau tetap pada setiap iterasi — ini yang diuji (`SSE harus menurun`).

---

## 4. Memilih k

**Elbow method:** jalankan K-Means untuk k = 2..5, plot SSE. Titik di mana penurunan SSE mulai
melandai adalah k yang wajar. Pada dataset bawaan: 230 (k=2) → 162 (k=3) → 146 (k=4) → 137 (k=5).
Penurunan terbesar terjadi dari k=2 ke k=3, sesudahnya melandai — karena itu **k=3** dipakai sebagai
nilai bawaan (dan sesuai tiga kategori yang diharapkan: tinggi / sedang / perlu ditingkatkan).

**Silhouette score** (untuk menilai kualitas, bukan memilih k):

```
a(i) = rata-rata jarak i ke anggota cluster sendiri
b(i) = rata-rata jarak i ke cluster terdekat lain
s(i) = (b(i) − a(i)) / max(a(i), b(i))
```

Nilai akhir = rata-rata `s(i)`, rentang −1..1. Interpretasi kasar: > 0,5 struktur kuat; 0,25–0,5
struktur cukup; < 0,25 lemah. Dataset bawaan menghasilkan **0,355** — cukup, wajar untuk data
kebiasaan belajar yang memang bertumpang tindih.

---

## 5. Memberi nama cluster

K-Means hanya memberi nomor. Penamaan dilakukan dengan skor komposit dari centroid ternormalisasi:

```
skor = 0,28·durasi + 0,20·frekuensi + 0,14·tidur + 0,18·tugas − 0,16·hp + 0,16·mandiri
```

Bobot dipilih berdasarkan asumsi dampak terhadap hasil belajar; **HP diberi tanda negatif** karena
makin lama main HP saat belajar, makin buruk kebiasaannya. Cluster diurutkan menurut skor:
peringkat 1 → *Kebiasaan Tinggi*, 2 → *Kebiasaan Sedang*, 3 → *Perlu Ditingkatkan*.

Skor ini bukan bagian dari K-Means — ia hanya lapisan interpretasi. Kalau dosen bertanya "apakah
pembobotan itu subjektif?", jawabannya: ya, dan itu sebabnya bobot dikumpulkan di satu konstanta
(`BOBOT_SKOR`) sehingga bisa diubah dan diuji ulang.

---

## 6. Menempatkan pengguna

```
z_pengguna = (x_pengguna − μ_dataset) / σ_dataset
cluster    = argmin_c ||z_pengguna − centroid_c||
```

Jarak yang ditampilkan (mis. "jarak 3,19") adalah jarak Euclidean di ruang 6 dimensi yang sudah
distandarkan — bukan persentase kemiripan. Angka ini berguna untuk membandingkan antarwaktu:
jarak mengecil berarti kebiasaan pengguna makin mendekati pusat kelompoknya.

---

## 7. Proyeksi pekan depan

Regresi linear kuadrat terkecil atas total menit per pekan (4 pekan terakhir):

```
a = Σ(x−x̄)(y−ȳ) / Σ(x−x̄)²        b = ȳ − a·x̄
R² = (Σ(x−x̄)(y−ȳ))² / (Σ(x−x̄)² · Σ(y−ȳ)²)
```

Pekan ke-5 dipakai sebagai prediksi. R² ditampilkan agar pembaca tahu seberapa layak garis itu
dipercaya: R² rendah berarti pola mingguan belum stabil, dan proyeksi tidak boleh dianggap ramalan.

---

## 8. Batasan yang harus disebut di laporan

1. Dataset bawaan **sintetis**; klaim tentang populasi mahasiswa baru sah setelah survei asli.
2. K-Means mengasumsikan cluster berbentuk bola dan ukuran serupa; pola kebiasaan yang memanjang
   bisa terpotong tidak wajar.
3. Nilai k ditentukan lewat elbow, bukan diuji statistik formal.
4. Bobot penamaan cluster bersifat asumtif (lihat bagian 5).
5. Data pengguna disimpan lokal di peramban; belum ada autentikasi maupun sinkronisasi.
