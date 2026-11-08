/* Page « Projets » : tri des cartes + aperçu au survol (image ou diaporama) */
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
  // data-preview = une image, ou plusieurs séparées par des virgules (diaporama).
  var SLIDE_MS = 1600;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)');

  var preview = document.createElement('div');
  preview.className = 'project-preview';
  preview.setAttribute('aria-hidden', 'true');
  preview.style.setProperty('--slide-ms', SLIDE_MS + 'ms');
  var stage = document.createElement('div');
  stage.className = 'preview-stage';
  preview.appendChild(stage);
  document.body.appendChild(preview);

  function sourcesOf(card) {
    return (card.dataset.preview || '')
      .split(',')
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  // loaded[src] = { w, h } une fois l'image chargée, false si elle est introuvable.
  var loaded = {};
  function probe(src) {
    if (src in loaded) return;
    loaded[src] = false;
    var im = new Image();
    im.onload = function () { loaded[src] = { w: im.naturalWidth, h: im.naturalHeight }; };
    im.onerror = function () { loaded[src] = false; };
    im.src = src;
  }

  // Au chargement de la page : seulement la 1re image de chaque projet.
  // Les suivantes du diaporama se chargent au premier survol.
  cards.forEach(function (card) {
    var srcs = sourcesOf(card);
    if (srcs.length) probe(srcs[0]);
  });

  var timer = null;
  var slides = [];
  var segments = [];
  var current = 0;

  function setActive(index) {
    current = index;
    slides.forEach(function (img, i) { img.classList.toggle('is-active', i === index); });
    segments.forEach(function (seg, i) {
      seg.classList.remove('is-done', 'is-active');
      if (i < index) seg.classList.add('is-done');
      if (i === index) {
        void seg.offsetWidth; // relance l'animation de la barre
        seg.classList.add('is-active');
      }
    });
  }

  function advance(srcs) {
    for (var step = 1; step <= srcs.length; step++) {
      var next = (current + step) % srcs.length;
      if (loaded[srcs[next]]) { setActive(next); return; }
    }
  }

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

  // Projet sans image : petit cadre avec le texte de data-preview-text
  // (« Aucun aperçu » / « No preview »).
  function showEmpty(card, x, y) {
    var text = card.dataset.previewText;
    if (!text) return;
    clearInterval(timer);
    stage.textContent = '';
    slides = [];
    segments = [];
    var empty = document.createElement('div');
    empty.className = 'preview-empty';
    empty.textContent = text;
    stage.appendChild(empty);
    stage.style.width = '240px';
    stage.style.height = '135px';
    var accent = getComputedStyle(card).getPropertyValue('--card-accent');
    if (accent) preview.style.setProperty('--card-accent', accent.trim());
    place(x, y);
    preview.classList.add('is-visible');
  }

  function showPreview(card, x, y) {
    var srcs = sourcesOf(card);
    if (!srcs.length) { showEmpty(card, x, y); return; }
    var first = loaded[srcs[0]];
    if (!first) return; // pas d'image : pas d'aperçu

    // Un projet à plusieurs images : on charge la suite, sauf si l'utilisateur
    // préfère limiter les animations (il ne voit alors que la 1re image).
    var animate = srcs.length > 1 && !reduceMotion.matches;
    if (animate) srcs.forEach(probe);
    if (!animate) srcs = [srcs[0]];

    clearInterval(timer);
    stage.textContent = '';
    slides = srcs.map(function (src) {
      var img = document.createElement('img');
      img.className = 'preview-slide';
      img.alt = '';
      img.src = src;
      stage.appendChild(img);
      return img;
    });

    // Le cadre suit le format de la 1re image (vertical, horizontal, carré…),
    // dans une taille maximale, sans agrandir au-delà de la taille d'origine.
    var vw = document.documentElement.clientWidth;
    var vh = document.documentElement.clientHeight;
    var scale = Math.min(Math.min(320, vw * 0.7) / first.w, Math.min(380, vh * 0.6) / first.h, 1);
    stage.style.width = Math.round(first.w * scale) + 'px';
    stage.style.height = Math.round(first.h * scale) + 'px';

    segments = [];
    var old = preview.querySelector('.preview-dots');
    if (old) old.remove();
    if (srcs.length > 1) {
      var dots = document.createElement('div');
      dots.className = 'preview-dots';
      srcs.forEach(function () {
        var seg = document.createElement('span');
        dots.appendChild(seg);
        segments.push(seg);
      });
      stage.appendChild(dots);
    }

    var accent = getComputedStyle(card).getPropertyValue('--card-accent');
    if (accent) preview.style.setProperty('--card-accent', accent.trim());

    setActive(0);
    if (srcs.length > 1) {
      timer = setInterval(function () { advance(srcs); }, SLIDE_MS);
    }
    place(x, y);
    preview.classList.add('is-visible');
  }

  function hidePreview() {
    clearInterval(timer);
    preview.classList.remove('is-visible');
  }

  cards.forEach(function (card) {
    card.addEventListener('mouseenter', function (e) {
      if (hoverCapable.matches) showPreview(card, e.clientX, e.clientY);
    });
    card.addEventListener('mousemove', function (e) {
      if (!hoverCapable.matches) return;
      if (preview.classList.contains('is-visible')) {
        place(e.clientX, e.clientY);
      } else {
        // réaffiche l'aperçu si un défilement l'avait masqué
        showPreview(card, e.clientX, e.clientY);
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
