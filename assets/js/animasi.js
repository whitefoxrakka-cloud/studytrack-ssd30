/* ============================================================
   animasi.js — lapisan gerak & komponen kecil StudyTrack
   Isi: layar muat, angka berjalan, riak tombol, konfeti,
        lembar bawah (modal), toast, gelembung maskot.
   Semua menghormati prefers-reduced-motion.
   ============================================================ */
(function (global) {
  "use strict";

  const kurangiGerak = () =>
    global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Layar muat ---------- */
  function siapkanMuat() {
    const el = document.getElementById("muat");
    if (!el) return;
    const lepas = () => {
      if (el.classList.contains("lepas")) return;
      el.classList.add("lepas");
      setTimeout(() => el.remove(), 700);
    };
    if (document.readyState === "complete") setTimeout(lepas, 320);
    else global.addEventListener("load", () => setTimeout(lepas, 320));
    setTimeout(lepas, 2600); // jaring pengaman
  }

  /* ---------- Angka berjalan ---------- */
  function naikkan(akar) {
    const daftar = (akar || document).querySelectorAll("[data-naik]");
    if (!daftar.length) return;
    if (kurangiGerak()) {
      daftar.forEach((el) => {
        el.textContent = Number(el.dataset.naik).toFixed(Number(el.dataset.desim || 0)).replace(".", ",");
      });
      return;
    }
    daftar.forEach((el) => {
      const target = Number(el.dataset.naik);
      const desim = Number(el.dataset.desim || 0);
      if (!isFinite(target)) return;
      const mulai = performance.now();
      const durasi = 780;
      const tulis = (v) => v.toFixed(desim).replace(".", ",");
      let beres = false;
      const langkah = (t) => {
        const p = Math.min(1, (t - mulai) / durasi);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = tulis(target * e);
        if (p < 1) requestAnimationFrame(langkah);
        else { beres = true; el.textContent = tulis(target); }
      };
      requestAnimationFrame(langkah);
      /* jaring pengaman: bila rAF dihentikan (tab latar), angka tetap benar */
      setTimeout(() => { if (!beres) el.textContent = tulis(target); }, durasi + 400);
    });
  }

  /* ---------- Riak tombol ---------- */
  function riak(el, e) {
    if (!el || !e || kurangiGerak()) return;
    const kotak = el.getBoundingClientRect();
    const d = Math.max(kotak.width, kotak.height);
    const span = document.createElement("span");
    span.className = "riak";
    span.style.width = span.style.height = d + "px";
    span.style.left = (e.clientX - kotak.left - d / 2) + "px";
    span.style.top = (e.clientY - kotak.top - d / 2) + "px";
    el.appendChild(span);
    setTimeout(() => span.remove(), 600);
  }

  /* ---------- Konfeti ---------- */
  function konfeti(x, y, n) {
    if (kurangiGerak()) return;
    const wadah = document.getElementById("tumpah");
    if (!wadah) return;
    const warna = ["#6d4aff", "#ff7ab8", "#22c39a", "#f5a524", "#4f8dfd", "#9a7bff"];
    n = n || 26;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      p.className = "partikel";
      const a = Math.random() * Math.PI * 2;
      const j = 70 + Math.random() * 130;
      p.style.left = x + "px";
      p.style.top = y + "px";
      p.style.background = warna[Math.floor(Math.random() * warna.length)];
      p.style.setProperty("--dx", Math.cos(a) * j + "px");
      p.style.setProperty("--dy", Math.sin(a) * j + 40 + "px");
      p.style.setProperty("--rot", Math.random() * 360 + "deg");
      p.style.animationDelay = Math.random() * 90 + "ms";
      wadah.appendChild(p);
      setTimeout(() => p.remove(), 1400);
    }
  }

  /* ---------- Lembar bawah ---------- */
  let tirai = null;
  let aksiTutup = null;

  function lembar(html, opsi) {
    opsi = opsi || {};
    tutupLembar(true);
    tirai = document.createElement("div");
    tirai.className = "tirai";
    tirai.innerHTML =
      '<div class="lembar" role="dialog" aria-modal="true" aria-label="' + (opsi.judul || "Panel") + '">' +
      '<div class="lembar-kepala"><h3>' + (opsi.judul || "") + "</h3>" +
      '<button class="tutup" data-lembar="tutup" aria-label="Tutup">✕</button></div>' +
      '<div class="lembar-isi">' + html + "</div>" +
      (opsi.kaki ? '<div class="lembar-kaki">' + opsi.kaki + "</div>" : "") +
      "</div>";
    document.body.appendChild(tirai);
    tirai.addEventListener("click", (e) => {
      if (e.target === tirai || e.target.closest("[data-lembar=tutup]")) tutupLembar();
    });
    aksiTutup = opsi.onTutup || null;
    document.addEventListener("keydown", escTutup);
    if (opsi.fokus) {
      const el = tirai.querySelector(opsi.fokus);
      if (el) setTimeout(() => el.focus(), 260);
    }
    return tirai;
  }

  function escTutup(e) {
    if (e.key === "Escape") tutupLembar();
  }

  function tutupLembar(langsung) {
    if (!tirai) return;
    const t = tirai;
    tirai = null;
    document.removeEventListener("keydown", escTutup);
    if (langsung) {
      t.remove();
    } else {
      t.classList.add("tutup");
      setTimeout(() => t.remove(), 280);
    }
    if (aksiTutup) {
      const f = aksiTutup;
      aksiTutup = null;
      try { f(); } catch (e) {}
    }
  }

  /* ---------- Toast ---------- */
  function toast(teks, warna, ikon) {
    const wadah = document.getElementById("toastWadah");
    if (!wadah) return;
    const el = document.createElement("div");
    el.className = "toast " + (warna || "ungu");
    el.innerHTML = (ikon ? "<span>" + ikon + "</span>" : "") + "<span>" + teks + "</span>";
    wadah.appendChild(el);
    setTimeout(() => {
      el.classList.add("keluar");
      setTimeout(() => el.remove(), 320);
    }, 2500);
  }

  /* ---------- Maskot ---------- */
  let timerNora = null;
  function nora(teks, ms) {
    const g = document.getElementById("noraGelembung");
    if (!g) return;
    g.textContent = teks;
    g.classList.add("tampil");
    clearTimeout(timerNora);
    timerNora = setTimeout(() => g.classList.remove("tampil"), ms || 4600);
  }

  /* ---------- Kepala mengecil saat digulir ---------- */
  function pantauGulir() {
    const bar = document.querySelector(".topbar");
    if (!bar) return;
    let terakhir = -1;
    const cek = () => {
      const y = global.scrollY || 0;
      const kecil = y > 24;
      if (kecil !== terakhir) {
        terakhir = kecil;
        bar.classList.toggle("mengecil", kecil);
      }
    };
    global.addEventListener("scroll", cek, { passive: true });
    cek();
  }

  global.Anim = { siapkanMuat, naikkan, riak, konfeti, lembar, tutupLembar, toast, nora, pantauGulir, kurangiGerak };
})(typeof window !== "undefined" ? window : globalThis);
