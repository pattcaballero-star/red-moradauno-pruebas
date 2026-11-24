(() => {
  const mobile = window.matchMedia('(max-width: 767px)');
  const drawer = document.getElementById('drawer');
  const overlay = document.getElementById('drawer-overlay');
  const tabs = [...document.querySelectorAll('.tab')];
  const filtersTab = document.getElementById('tab-filters');
  let prevTab = tabs[0];

  /* ---------- Pestañas + apertura del drawer ---------- */
  const selectTab = (t) => tabs.forEach((b) => {
    const on = b === t;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', on);
  });

  let lastFocus = null;
  const open = () => {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('drawer-open');
    requestAnimationFrame(() => { overlay.classList.add('is-open'); drawer.classList.add('is-open'); });
    drawer.querySelector('.drawer-body').scrollTop = 0;
  };
  const close = () => {
    overlay.classList.remove('is-open');
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('drawer-open');
    setTimeout(() => { overlay.hidden = true; }, 250);
    selectTab(prevTab);
    if (lastFocus && lastFocus.focus) lastFocus.focus(); else if (filtersTab) filtersTab.focus();
  };

  tabs.forEach((t) => t.addEventListener('click', () => {
    if (t.dataset.href) { selectTab(t); window.location.href = t.dataset.href; return; }
    if (t === filtersTab) {
      if (!tabs.includes(prevTab) || prevTab === filtersTab) prevTab = tabs[0];
      selectTab(t); open();
    } else { prevTab = t; selectTab(t); }
  }));
  document.getElementById('drawer-close').addEventListener('click', close);
  document.getElementById('drawer-send').addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('is-open')) close(); });
  window.M1Drawer = { open, close };
  document.querySelectorAll('.js-open-filters').forEach((b) => b.addEventListener('click', open));

  /* ---------- Tipo de inmueble ---------- */
  const cards = [...document.querySelectorAll('.type-card')];
  cards.forEach((c) => c.addEventListener('click', () => cards.forEach((x) => {
    x.classList.toggle('is-selected', x === c);
    x.setAttribute('aria-checked', x === c);
  })));

  /* ---------- Amenidades ---------- */
  document.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () =>
    c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') !== 'true')));

  /* ---------- Steppers ---------- */
  document.querySelectorAll('.stepper').forEach((s) => {
    const out = s.querySelector('output');
    const min = +s.dataset.min, max = +s.dataset.max;
    const [minus, plus] = s.querySelectorAll('button');
    const render = (v) => { out.textContent = v; minus.disabled = v <= min; plus.disabled = v >= max; };
    s.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      render(Math.min(max, Math.max(min, +out.textContent + +b.dataset.step)));
    });
    render(+out.textContent);
  });

  /* ---------- Rango de renta (histograma + doble slider) ---------- */
  const bars = document.getElementById('bars');
  const rMin = document.getElementById('r-min'), rMax = document.getElementById('r-max');
  const inMin = document.getElementById('in-min'), inMax = document.getElementById('in-max');
  const fill = document.getElementById('track-fill');
  const heights = [28,46,60,38,52,34,46,30,44,26,56,38,62,30,40,24,34,22,48,26,38,20,36,44,30,24,40,34,28,22,50,26,44,32,36,54,24,34,64,30,22,36,18,26,40,28];
  const MIN = +rMin.min, MAX = +rMin.max;
  bars.innerHTML = heights.map((h) => `<i style="height:${h}px"></i>`).join('');
  const barEls = [...bars.children];
  const money = (n) => '$' + n.toLocaleString('en-US');
  const pct = (v) => (v - MIN) / (MAX - MIN) * 100;

  const paint = () => {
    const a = +rMin.value, b = +rMax.value;
    fill.style.left = pct(a) + '%';
    fill.style.right = (100 - pct(b)) + '%';
    barEls.forEach((el, i) => {
      const v = MIN + (i + .5) / barEls.length * (MAX - MIN);
      el.classList.toggle('in', v >= a && v <= b);
    });
    if (document.activeElement !== inMin) inMin.value = money(a);
    if (document.activeElement !== inMax) inMax.value = money(b);
  };
  rMin.addEventListener('input', () => { if (+rMin.value > +rMax.value) rMin.value = rMax.value; paint(); });
  rMax.addEventListener('input', () => { if (+rMax.value < +rMin.value) rMax.value = rMin.value; paint(); });
  const commit = (input, slider, isMin) => {
    const n = parseInt(input.value.replace(/\D/g, ''), 10);
    if (!isNaN(n)) {
      const lim = isMin ? +rMax.value : +rMin.value;
      slider.value = isMin ? Math.min(Math.max(n, MIN), lim) : Math.max(Math.min(n, MAX), lim);
    }
    input.blur(); paint();
  };
  [[inMin, rMin, true], [inMax, rMax, false]].forEach(([i, s, m]) => {
    i.addEventListener('focus', () => { i.value = i.value.replace(/\D/g, ''); i.select(); });
    i.addEventListener('blur', () => commit(i, s, m));
    i.addEventListener('keydown', (e) => { if (e.key === 'Enter') i.blur(); });
  });
  paint();
})();

/* ---------- Dropdown de colonias ---------- */
(() => {
  const combo = document.getElementById('combo');
  const input = document.getElementById('zone');
  const list = document.getElementById('zone-list');
  const all = window.COLONIAS_CDMX || [];
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  let selected = input.value, items = [], idx = -1;

  const render = (q) => {
    const n = norm(q.trim());
    items = n ? all.filter((c) => norm(c).includes(n)) : all;
    list.innerHTML = items.length
      ? items.map((c, i) => `<li role="option" data-i="${i}" aria-selected="${c === selected}">${c}</li>`).join('')
      : '<li class="empty">Sin resultados</li>';
    idx = -1;
  };
  const setActive = (i) => {
    const lis = list.querySelectorAll('li[role="option"]');
    lis.forEach((l, k) => l.classList.toggle('is-active', k === i));
    idx = i;
    if (lis[i]) { lis[i].scrollIntoView({ block: 'nearest' }); input.setAttribute('aria-activedescendant', ''); }
  };
  const open = () => {
    if (!list.hidden) return;
    render(input.value === selected ? '' : input.value);
    list.hidden = false; combo.classList.add('is-open'); input.setAttribute('aria-expanded', 'true');
    const sel = items.indexOf(selected); if (sel > -1) setActive(sel);
  };
  const close = () => {
    list.hidden = true; combo.classList.remove('is-open'); input.setAttribute('aria-expanded', 'false');
    input.value = selected;
  };
  const pick = (c) => { selected = c; close(); };

  input.addEventListener('focus', () => { input.select(); open(); });
  input.addEventListener('click', open);
  input.addEventListener('input', () => {
    if (list.hidden) { list.hidden = false; combo.classList.add('is-open'); input.setAttribute('aria-expanded', 'true'); }
    render(input.value); if (items.length) setActive(0);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); open(); setActive(Math.min(idx + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(idx - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[idx]) pick(items[idx]); else close(); input.blur(); }
    else if (e.key === 'Escape' && !list.hidden) { e.stopPropagation(); close(); }
  });
  list.addEventListener('mousedown', (e) => e.preventDefault());
  list.addEventListener('click', (e) => { const li = e.target.closest('li[data-i]'); if (li) { pick(items[+li.dataset.i]); input.blur(); } });
  input.addEventListener('blur', () => { if (!list.hidden) close(); });
})();
