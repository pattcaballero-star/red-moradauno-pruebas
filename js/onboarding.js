(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Pasos (una URL por pantalla) ---------- */
  const STEPS = [
    { id: 'revisa-info', screen: 'revisa', label: 'Revisa tu información' },
    { id: 'dato-incorrecto', screen: 'revisa', label: 'Actualizar inmobiliaria (formulario)' },
    { id: 'agregar-telefono', screen: 'revisa', label: 'Agregar otro teléfono' },
    { id: 'actualizando-datos', screen: 'revisa', label: 'Actualizar inmobiliaria (confirmación)' },
    { id: 'buscando', screen: 'buscando', label: 'Buscando propiedades' },
    { id: 'vinculadas', screen: 'vinculadas', label: 'Propiedades vinculadas' },
    { id: 'antes-de-empezar', screen: 'tus', label: 'Antes de empezar' },
    { id: 'tus-inmuebles', screen: 'tus', label: 'Tus inmuebles' },
    { id: 'publicar-todo', screen: 'tus', label: 'Publicar todo (modal)' },
    { id: 'continuas', screen: 'tus', label: 'Continúas donde lo dejaste' },
    { id: 'listo', screen: 'listo', label: '¡Listo!' }
  ];
  const NEXT = { 'revisa-info': 'buscando', buscando: 'vinculadas', vinculadas: 'antes-de-empezar' };
  const PREV = { buscando: 'revisa-info', vinculadas: 'buscando' };
  const screens = $$('.ob-screen');
  let step = null, autoTimer = null;

  /* ---------- Datos del mazo ---------- */
  const TOTAL = 4;
  const PHOTO = 'assets/img/property-del-valle.jpg';
  const TITLES = ['Amplio departamento', 'Departamento luminoso', 'Loft remodelado', 'Departamento con terraza', 'Penthouse con roof garden', 'Estudio amueblado', 'Departamento familiar', 'Departamento con balcón', 'Departamento con jardín', 'Departamento cerca del metro'];
  const ZONES = ['Del Valle, Benito Juarez, Ciudad de México', 'Narvarte Poniente, Benito Juarez, Ciudad de México', 'Roma Norte, Cuauhtémoc, Ciudad de México', 'Condesa, Cuauhtémoc, Ciudad de México', 'Coyoacán, Coyoacán, Ciudad de México', 'Nápoles, Benito Juarez, Ciudad de México', 'Polanco, Miguel Hidalgo, Ciudad de México', 'Juárez, Cuauhtémoc, Ciudad de México'];
  const PRICES = [44000, 18500, 27900, 35000, 22000, 29500, 16800, 38000, 24500, 31000];
  const DATA = Array.from({ length: TOTAL }, (_, i) => ({ title: TITLES[i % TITLES.length], zone: ZONES[i % ZONES.length], price: '$' + (PRICES[(i * 3) % PRICES.length] + (i >= 10 ? 500 * (i % 4) : 0)).toLocaleString('en-US') }));
  const LABEL = { skip: 'No publicar', publish: 'Solo publicar', share: 'Publicar y compartir' };

  let index = 0;                       // tarjeta en la cima
  let dec = Array(TOTAL).fill(null);   // decisión por inmueble: skip | publish | share
  let history = [];
  const photoIdx = Array(TOTAL).fill(0);

  const KEY = 'm1_onb';
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ index, dec })); } catch (e) { /* sin almacenamiento */ } };
  const load = () => { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && Array.isArray(s.dec) && s.dec.length === TOTAL) { index = s.index; dec = s.dec; history = dec.map((d, i) => d && i < index ? { index: i, decision: d } : null).filter(Boolean); } } catch (e) { /* nada */ } };
  const decided = () => dec.filter(Boolean).length;
  // Si ya revisó todo (y no pulsó Continuar), el siguiente intento empieza de cero
  const resetIfComplete = () => { if (decided() >= TOTAL) { index = 0; dec = Array(TOTAL).fill(null); history = []; } };

  /* ---------- Navegación ---------- */
  const setHash = (id) => { try { history_.replaceState(null, '', '#' + id); } catch (e) { location.hash = id; } };
  const history_ = window.history;

  const modals = { intro: [$('#ov-intro'), $('#m-intro')], all: [$('#ov-all'), $('#m-all')] };
  const showModal = (k, on) => { modals[k].forEach((el) => { el.hidden = !on; }); $('#tus-page').inert = modals.intro[1].hidden === false || modals.all[1].hidden === false; };
  const showWrong = (k) => { $('#ov-wrong').hidden = !k; $('#sh-wrong').hidden = k !== 'wrong'; $('#sh-phone').hidden = k !== 'phone'; $('#sh-ok').hidden = k !== 'ok'; const r = $('[data-screen=revisa] .ri-main'); if (r) r.inert = !!k; if (k === 'wrong') setTimeout(() => $('#wr-agency').focus(), 50); if (k === 'phone') setTimeout(() => $('#ph-num').focus(), 50); };
  const syncWrong = () => { const none = $('#wr-none').checked; $('#wr-agency').disabled = none; $('#wr-send').disabled = !none && !$('#wr-agency').value.trim(); };
  const showResume = (on) => { $('#resume').hidden = !on; };

  function go(id, opts = {}) {
    const s = STEPS.find((x) => x.id === id) || STEPS[0];
    clearTimeout(autoTimer);
    const prev = step; step = s.id;

    screens.forEach((el) => {
      const on = el.dataset.screen === s.screen;
      el.classList.toggle('is-active', on);
      el.toggleAttribute('inert', !on);
      el.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
    showModal('intro', false); showModal('all', false); showResume(false); showWrong(null);
    if (s.id === 'dato-incorrecto') showWrong('wrong');
    if (s.id === 'agregar-telefono') showWrong('phone');
    if (s.id === 'actualizando-datos') showWrong('ok');

    if (s.screen === 'buscando') autoTimer = setTimeout(() => go('vinculadas'), reduce.matches ? 800 : 2200);
    if (s.screen === 'tus') { renderDeck(); }
    if (s.id === 'antes-de-empezar') showModal('intro', true);
    if (s.id === 'tus-inmuebles' && (opts.resume || (index > 0 && decided() > 0 && decided() < TOTAL && !opts.fresh))) showResume(true);
    if (s.id === 'continuas') showResume(true);
    if (s.id === 'publicar-todo') {
      if (decided() === 0) { dec[0] = 'share'; index = 1; history = [{ index: 0, decision: 'share' }]; renderDeck(); }
      openAll();
    }
    if (s.id === 'listo') renderListo(opts.demo !== false && decided() < TOTAL);

    setHash(s.id);
    $$('#states-menu a').forEach((a) => a.classList.toggle('is-current', a.dataset.step === s.id));
    if (prev !== s.id) { const focusEl = $('[data-screen].is-active h1, [data-screen].is-active h2'); if (focusEl) { focusEl.setAttribute('tabindex', '-1'); } }
  }

  /* ---------- Revisa tu información ---------- */
  const consent = $('#ri-consent'), connect = $('#ri-connect');
  consent.addEventListener('change', () => { connect.disabled = !consent.checked; });

  /* ---------- Toast ---------- */
  let toastT;
  const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2400); };

  /* ---------- Deck (swipe con pointer events) ---------- */
  const deck = $('#deck'), actBtns = $$('.act');
  const THRESH_X = 100, THRESH_Y = 110, TAP = 6;
  let busy = false;
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const flyMs = () => (reduce.matches ? 1 : 320);

  function cardHTML(i) {
    const d = DATA[i];
    const dots = [0, 1, 2].map((n) => `<i class="${n === photoIdx[i] ? 'is-active' : ''}"></i>`).join('');
    return `<img class="dk-photo" src="${PHOTO}" alt="" draggable="false">
      <div class="dk-info"><p class="dk-title">${d.title}</p><p class="dk-zone">${d.zone}</p><p class="dk-price">${d.price}</p><div class="dk-dots" aria-hidden="true">${dots}</div></div>
      <span class="dk-stamp dk-stamp--skip">${LABEL.skip}</span><span class="dk-stamp dk-stamp--publish">${LABEL.publish}</span><span class="dk-stamp dk-stamp--share">${LABEL.share}</span>`;
  }
  function makeCard(i, role) {
    const el = document.createElement('article');
    el.className = `dk is-${role}`; el.dataset.index = i; el.dataset.photo = i % 3;
    el.setAttribute('aria-label', `${DATA[i].title}, ${DATA[i].zone}, ${DATA[i].price} al mes`);
    if (role === 'next') el.setAttribute('aria-hidden', 'true');
    el.innerHTML = cardHTML(i);
    return el;
  }
  function renderDeck() {
    deck.innerHTML = '';
    if (index >= TOTAL) deck.innerHTML = '<div class="dk-empty"><strong>¡Listo!</strong><span>Revisaste todos tus inmuebles</span></div>';
    else { if (index + 1 < TOTAL) deck.appendChild(makeCard(index + 1, 'next')); deck.appendChild(makeCard(index, 'top')); }
    $('#tus-n').textContent = Math.min(index + 1, TOTAL);
    $('#tus-total').textContent = TOTAL;
    actBtns.forEach((b) => { b.disabled = index >= TOTAL; });
  }
  const topCard = () => $('.dk.is-top', deck);
  const nextCard = () => $('.dk.is-next', deck);
  const setStamp = (card, kind, p) => { const s = $(`.dk-stamp--${kind}`, card); if (s) s.style.opacity = p; };
  const highlight = (kind) => actBtns.forEach((b) => b.classList.toggle('is-pressed', b.dataset.decision === kind));

  function paint(card, dx, dy) {
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.06}deg)`;
    const pR = clamp(dx / THRESH_X), pL = clamp(-dx / THRESH_X), pU = Math.abs(dy) > Math.abs(dx) ? clamp(-dy / THRESH_Y) : 0;
    setStamp(card, 'publish', pU ? 0 : pR); setStamp(card, 'skip', pU ? 0 : pL); setStamp(card, 'share', pU);
    highlight(pU >= 1 ? 'share' : pR >= 1 && !pU ? 'publish' : pL >= 1 && !pU ? 'skip' : null);
    const nxt = nextCard();
    if (nxt && !reduce.matches) { const p = Math.max(pR, pL, pU); nxt.style.transform = `translateY(${10 - 10 * p}px) scale(${0.95 + 0.05 * p})`; }
  }
  const exitVec = (d) => (d === 'skip' ? { x: -520, y: 40, r: -24 } : d === 'publish' ? { x: 520, y: 40, r: 24 } : { x: 0, y: -760, r: 0 });

  function decide(decision) {
    const card = topCard();
    if (!card || busy) return;
    busy = true; highlight(null);
    ['skip', 'publish', 'share'].forEach((k) => setStamp(card, k, k === decision ? 1 : 0));
    const v = exitVec(decision);
    card.classList.add('is-anim'); card.style.transform = `translate(${v.x}px, ${v.y}px) rotate(${v.r}deg)`;
    if (reduce.matches) card.style.opacity = '0';
    const nxt = nextCard();
    if (nxt) { nxt.classList.add('is-anim'); nxt.style.transform = 'translateY(0) scale(1)'; nxt.querySelector('.dk-info').style.opacity = '1'; }
    dec[index] = decision; history.push({ index, decision });
    setTimeout(() => {
      index += 1; busy = false; save(); renderDeck();
      if (index >= TOTAL) setTimeout(() => go('listo', { demo: false }), reduce.matches ? 0 : 450);
    }, flyMs() + 20);
  }
  function undo() {
    if (busy || !history.length) return;
    const last = history.pop(); index = last.index; dec[index] = null; save(); renderDeck();
    const card = topCard();
    if (!card || reduce.matches) return;
    const v = exitVec(last.decision); busy = true;
    card.style.transform = `translate(${v.x}px, ${v.y}px) rotate(${v.r}deg)`;
    card.getBoundingClientRect(); card.classList.add('is-anim'); card.style.transform = '';
    setTimeout(() => { card.classList.remove('is-anim'); busy = false; }, flyMs() + 20);
  }
  function cyclePhoto(card, clientX) {
    const i = +card.dataset.index, rect = card.getBoundingClientRect();
    photoIdx[i] = (photoIdx[i] + (clientX - rect.left < rect.width / 2 ? -1 : 1) + 3) % 3;
    $$('.dk-dots i', card).forEach((d, n) => d.classList.toggle('is-active', n === photoIdx[i]));
  }

  let drag = null;
  deck.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.dk.is-top');
    if (!card || busy || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag = { card, id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, t0: performance.now(), moved: false };
    card.setPointerCapture(e.pointerId); card.classList.remove('is-anim');
    const nxt = nextCard(); if (nxt) nxt.classList.remove('is-anim');
  });
  deck.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x0; drag.dy = Math.min(e.clientY - drag.y0, 40);
    if (!drag.moved && Math.hypot(drag.dx, drag.dy) > TAP) { drag.moved = true; drag.card.classList.add('is-dragging'); }
    if (drag.moved) paint(drag.card, drag.dx, drag.dy);
  });
  function endDrag(e, cancelled) {
    if (!drag || e.pointerId !== drag.id) return;
    const { card, dx, dy, moved, t0 } = drag; drag = null; card.classList.remove('is-dragging');
    if (!moved) { if (!cancelled) cyclePhoto(card, e.clientX); return; }
    const dt = Math.max(1, performance.now() - t0), vx = dx / dt, vy = dy / dt, vertical = Math.abs(dy) > Math.abs(dx);
    let d = null;
    if (!cancelled) {
      if (vertical && (-dy > THRESH_Y || (vy < -0.6 && -dy > 40))) d = 'share';
      else if (!vertical && (dx > THRESH_X || (vx > 0.6 && dx > 40))) d = 'publish';
      else if (!vertical && (-dx > THRESH_X || (vx < -0.6 && -dx > 40))) d = 'skip';
    }
    if (d) return decide(d);
    card.classList.add('is-anim'); card.style.transform = '';
    $$('.dk-stamp', card).forEach((s) => { s.style.opacity = 0; }); highlight(null);
    const nxt = nextCard(); if (nxt) { nxt.classList.add('is-anim'); nxt.style.transform = ''; }
  }
  deck.addEventListener('pointerup', (e) => endDrag(e, false));
  deck.addEventListener('pointercancel', (e) => endDrag(e, true));
  actBtns.forEach((b) => b.addEventListener('click', () => decide(b.dataset.decision)));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (!modals.all[1].hidden) closeAll(); else if (!modals.intro[1].hidden) startDeck(); return; }
    const active = $('.ob-screen.is-active');
    if (!active || active.dataset.screen !== 'tus' || e.target.closest('input, textarea') || !modals.all[1].hidden || !modals.intro[1].hidden) return;
    const map = { ArrowLeft: 'skip', ArrowRight: 'publish', ArrowUp: 'share' };
    if (map[e.key]) { e.preventDefault(); decide(map[e.key]); }
    else if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); undo(); }
  });

  /* ---------- Publicar todo ---------- */
  const radios = $$('input[name=rule]'), goBtn = $('#all-go');
  function openAll() {
    radios.forEach((r) => { r.checked = false; }); goBtn.disabled = true;
    $('#all-n').textContent = TOTAL - decided();
    showModal('all', true);
  }
  function closeAll() { showModal('all', false); if (step === 'publicar-todo') go('tus-inmuebles', { fresh: true }); }
  radios.forEach((r) => r.addEventListener('change', () => { goBtn.disabled = !radios.some((x) => x.checked); }));
  function applyAll() {
    const rule = (radios.find((r) => r.checked) || {}).value; if (!rule) return;
    for (let i = 0; i < TOTAL; i++) if (!dec[i]) dec[i] = rule;
    index = TOTAL; save(); go('listo', { demo: false });
  }
  function startDeck() { showModal('intro', false); go('tus-inmuebles', { fresh: true }); }

  /* ---------- Listo ---------- */
  function renderListo(demo) {
    let c;
    if (demo) c = { share: 2, publish: 1, skip: 1 };   // cifras del diseño cuando se abre esta pantalla directo
    else c = { share: dec.filter((d) => d === 'share').length, publish: dec.filter((d) => d === 'publish').length, skip: dec.filter((d) => d === 'skip').length };
    $('#listo-chips').innerHTML = `<span>${c.share} compartiendo comisión</span><span>${c.publish} sin compartir</span><span>${c.skip} sin publicar</span>`;
  }
  function finish() {
    try { localStorage.setItem('m1_onb_done', '1'); localStorage.removeItem(KEY); } catch (e) { /* nada */ }
    location.href = 'red.html';
  }

  /* ---------- Acciones de la interfaz ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    switch (t.dataset.act) {
      case 'next': go(NEXT[step]); break;
      case 'back': go(PREV[step]); break;
      case 'cancel': location.href = 'index.html#inicio'; break;
      case 'wrong': showWrong('wrong'); break;
      case 'close-wrong': case 'close-ok': showWrong(null); break;
      case 'wa': toast('Te llevamos a WhatsApp para corregir tus datos'); break;
      case 'send-wrong': showWrong('ok'); break;
      case 'add-phone': showWrong('phone'); break;
      case 'send-phone': showWrong(null); toast('Agregamos tu número'); break;
      case 'explore': location.href = 'red.html'; break;
      case 'close-intro': case 'start': startDeck(); break;
      case 'publish-all': go('publicar-todo'); break;
      case 'close-all': closeAll(); break;
      case 'apply-all': applyAll(); break;
      case 'resume-ok': showResume(false); break;
      case 'finish': finish(); break;
    }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button][data-act]')) { e.preventDefault(); e.target.click(); }
  });
  $('#wr-agency').addEventListener('input', syncWrong);
  $('#wr-none').addEventListener('change', syncWrong);
  $('#ph-num').addEventListener('input', () => { $('#ph-send').disabled = $('#ph-num').value.replace(/\D/g, '').length < 10; });
  $('#ov-wrong').addEventListener('click', () => showWrong(null));
  ['ov-intro', 'ov-all'].forEach((id) => $('#' + id).addEventListener('click', () => (id === 'ov-all' ? closeAll() : startDeck())));

  /* ---------- Selector de estados ---------- */
  const menu = $('#states-menu'), btn = $('#states-btn');
  menu.innerHTML = STEPS.map((s) => `<li><a href="#${s.id}" data-step="${s.id}">${s.label}</a></li>`).join('') + '<li><button type="button" id="ob-reset">Reiniciar progreso</button></li>';
  btn.addEventListener('click', (e) => { e.stopPropagation(); const o = menu.hidden; menu.hidden = !o; btn.setAttribute('aria-expanded', o); });
  document.addEventListener('click', (e) => { if (!e.target.closest('#states')) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
  menu.addEventListener('click', (e) => {
    menu.hidden = true;
    if (e.target.id === 'ob-reset') { try { localStorage.removeItem(KEY); localStorage.removeItem('m1_onb_done'); } catch (er) { /* nada */ } index = 0; dec = Array(TOTAL).fill(null); history = []; go('revisa-info'); }
  });
  window.addEventListener('hashchange', () => { const h = location.hash.replace('#', ''); if (h !== step && STEPS.some((s) => s.id === h)) go(h); });

  /* ---------- Arranque ---------- */
  load();
  resetIfComplete();
  const h0 = location.hash.replace('#', '');
  if (STEPS.some((s) => s.id === h0)) go(h0, { demo: true });
  else if (index > 0 && decided() < TOTAL) go('tus-inmuebles', { resume: true });   // vuelve donde lo dejó
  else go('revisa-info');
})();
