/* Page « Projets » : tri des cartes + aperçu au survol */
(function () {
  var grid = document.getElementById('project-grid');
  if (!grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.card'));

  /* ---------- Tri (importance / nom) ---------- */
  var buttons = document.querySelectorAll('.sort-btn');
  var collator = new Intl.Collator(document.documentElement.lang || 'en', {
    numeric: true,
    sensitivity: 'base',
    ignorePunctuation: true
  });

  function sortCards(mode) {
    var sorted = cards.slice().sort(function (a, b) {
      if (mode === 'name') {
        return collator.compare(a.dataset.name, b.dataset.name);
      }
      return Number(a.dataset.rank) - Number(b.dataset.rank);
    });
    sorted.forEach(function (card) { grid.appendChild(card); });
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.setAttribute('aria-pressed', btn.dataset.sort === mode ? 'true' : 'false');
    });
    hidePreview();
  }

  Array.prototype.forEach.call(buttons, function (btn) {
    btn.addEventListener('click', function () { sortCards(btn.dataset.sort); });
  });

  /* ---------- Aperçu au survol ---------- */
  var preview = document.createElement('div');
  preview.className = 'project-preview';
  preview.setAttribute('aria-hidden', 'true');
  var previewImg = document.createElement('img');
  previewImg.alt = '';
  preview.appendChild(previewImg);
  document.body.appendChild(preview);

  // Précharge les images : l'aperçu ne s'affiche que si l'image existe.
  var loaded = {};
  cards.forEach(function (card) {
    var src = card.dataset.preview;
    if (!src || src in loaded) return;
    loaded[src] = false;
    var probe = new Image();
    probe.onload = function () { loaded[src] = true; };
    probe.onerror = function () { loaded[src] = false; };
    probe.src = src;
  });

  var GAP = 18;
  var MARGIN = 8;

  function place(x, y) {
    var w = preview.offsetWidth;
    var h = preview.offsetHeight;
    var vw = document.documentElement.clientWidth;
    var vh = document.documentElement.clientHeight;
    var left = x + GAP;
    var top = y + GAP;
    if (left + w > vw - MARGIN) left = x - GAP - w;
    if (top + h > vh - MARGIN) top = y - GAP - h;
    left = Math.max(MARGIN, Math.min(left, vw - w - MARGIN));
    top = Math.max(MARGIN, Math.min(top, vh - h - MARGIN));
    preview.style.left = left + 'px';
    preview.style.top = top + 'px';
  }

  function showPreview(card, x, y) {
    var src = card.dataset.preview;
    if (!src || !loaded[src]) return;
    if (previewImg.getAttribute('src') !== src) previewImg.src = src;
    var accent = getComputedStyle(card).getPropertyValue('--card-accent');
    if (accent) preview.style.setProperty('--card-accent', accent.trim());
    place(x, y);
    preview.classList.add('is-visible');
  }

  function hidePreview() {
    preview.classList.remove('is-visible');
  }

  var hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)');

  cards.forEach(function (card) {
    card.addEventListener('mouseenter', function (e) {
      if (hoverCapable.matches) showPreview(card, e.clientX, e.clientY);
    });
    card.addEventListener('mousemove', function (e) {
      if (hoverCapable.matches && preview.classList.contains('is-visible')) {
        place(e.clientX, e.clientY);
      }
    });
    card.addEventListener('mouseleave', hidePreview);

    // Navigation au clavier : aperçu ancré sur la carte
    card.addEventListener('focus', function () {
      var r = card.getBoundingClientRect();
      showPreview(card, r.left + r.width * 0.55, r.top + r.height * 0.5);
    });
    card.addEventListener('blur', hidePreview);
  });

  window.addEventListener('scroll', hidePreview, { passive: true });
})();
