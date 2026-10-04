/* ============================================================
   TEMPEL LINK WEB APP DI BAWAH INI (berakhiran /exec)
   Contoh: 'https://script.google.com/macros/s/AKfycb.../exec'
   ============================================================ */
const WEB_APP_URL = '';

(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const form = $('#surveyForm');
  const notice = $('#notice');
  const thanks = $('#thanks');
  const submitBtn = $('#submitBtn');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Animasi muncul saat di-scroll ---------- */
  const io = ('IntersectionObserver' in window && !reduce)
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    : null;

  function watch(el) {
    if (io) io.observe(el);
    else el.classList.add('in');
  }
  document.querySelectorAll('.reveal').forEach(watch);

  /* ---------- Progress bar scroll ---------- */
  const progress = $('#progress');
  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const p = max > 0 ? h.scrollTop / max : 0;
    progress.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)) + ')';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Pesan ---------- */
  function showNotice(msg, ok) {
    notice.textContent = msg;
    notice.className = 'notice' + (ok ? ' ok' : '');
    notice.hidden = false;
  }
  function hideNotice() { notice.hidden = true; }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function urlWith(query) {
    return WEB_APP_URL + (WEB_APP_URL.indexOf('?') > -1 ? '&' : '?') + query;
  }

  /* ---------- Hasil sementara ---------- */
  function renderBars(el, data, total) {
    const rows = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
    if (!rows.length) {
      el.innerHTML = '<p class="empty">Belum ada jawaban. Jadilah yang pertama.</p>';
      return;
    }
    el.innerHTML = rows.map(([label, n]) => {
      const p = total ? Math.round((n / total) * 100) : 0;
      return '<div class="bar" style="--w:' + p + '%"><span>' + esc(label) +
        '</span><div class="track"><i></i></div><b>' + p + '%</b></div>';
    }).join('');
    el.querySelectorAll('.bar').forEach(watch);
  }

  function resultsMessage(msg) {
    $('#resMerek').innerHTML = '<p class="empty">' + esc(msg) + '</p>';
    $('#resTinta').innerHTML = '<p class="empty">' + esc(msg) + '</p>';
  }

  async function loadResults() {
    if (!WEB_APP_URL) {
      resultsMessage('Isi WEB_APP_URL di app.js agar hasil tampil.');
      return;
    }
    try {
      const res = await fetch(urlWith('action=results'), { cache: 'no-store' });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || 'Gagal memuat hasil');
      $('#total').textContent = d.total;
      $('#avg').textContent = d.total ? Number(d.rating).toFixed(1).replace('.', ',') : '-';
      renderBars($('#resMerek'), d.merek, d.total);
      renderBars($('#resTinta'), d.tinta, d.total);
    } catch (err) {
      resultsMessage('Hasil belum bisa dimuat. Periksa link web app dan pengaturan aksesnya.');
    }
  }

  /* ---------- Validasi & kirim ---------- */
  const REQUIRED = ['nama', 'status', 'merek', 'tinta', 'ukuran', 'frekuensi', 'harga', 'rating'];

  form.addEventListener('input', (e) => {
    const q = e.target.closest('[data-q]');
    if (q) q.classList.remove('invalid');
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    hideNotice();

    if (!WEB_APP_URL) {
      showNotice('Link web app belum diisi. Buka app.js lalu isi WEB_APP_URL.');
      notice.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const fd = new FormData(form);
    let first = null;
    form.querySelectorAll('[data-q]').forEach((q) => q.classList.remove('invalid'));

    REQUIRED.forEach((name) => {
      const v = String(fd.get(name) || '').trim();
      if (!v) {
        const q = form.querySelector('[name="' + name + '"]').closest('[data-q]');
        q.classList.add('invalid');
        if (!first) first = q;
      }
    });

    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const payload = {
      nama: String(fd.get('nama')).trim(),
      status: fd.get('status'),
      merek: fd.get('merek'),
      tinta: fd.get('tinta'),
      ukuran: fd.get('ukuran'),
      frekuensi: fd.get('frekuensi'),
      harga: fd.get('harga'),
      rating: Number(fd.get('rating')),
      faktor: fd.getAll('faktor').join(', '),
      saran: String(fd.get('saran') || '').trim()
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';

    try {
      // Tanpa header khusus agar tidak memicu preflight CORS
      const res = await fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify(payload) });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || 'Gagal menyimpan');

      form.reset();
      form.hidden = true;
      thanks.hidden = false;
      thanks.scrollIntoView({ behavior: 'smooth', block: 'center' });
      loadResults();
    } catch (err) {
      showNotice('Jawaban belum terkirim. Periksa koneksi dan link web app, lalu coba lagi.');
      notice.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Kirim jawaban';
    }
  });

  $('#again').addEventListener('click', () => {
    thanks.hidden = true;
    form.hidden = false;
    $('#survei').scrollIntoView({ behavior: 'smooth' });
  });

  loadResults();
})();
