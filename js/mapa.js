(() => {
  const { items: ALL, center } = window.M1_DATA;
  const $ = (id) => document.getElementById(id);
  const desktopMQ = window.matchMedia('(min-width: 900px)');
  const isDesktop = () => desktopMQ.matches;

  const PRICE_ZOOM = 15;           // por debajo no se muestran precios, solo bolitas
  const CLUSTER_DX = 54, CLUSTER_DY = 30; // pins que se traslapan se agrupan
  const DEBOUNCE_MS = 400;         // espera tras mover/zoom antes de pedir el área visible
  const LATENCY_MS = 700;          // latencia simulada de la consulta

  const STATES = [
    ['mapa', 'Mapa (interactivo)'], ['actualizando', 'Actualizando al mover'], ['clusters', 'Mapa con clusters'],
    ['dibujar', 'Dibujar zona'], ['zona-dibujada', 'Zona dibujada aplicada'], ['preview-red', 'Preview Red M1'],
    ['preview-mercado', 'Preview Mercado'], ['sin-red', 'Sin resultados de la Red M1'], ['sin-resultados', 'Mapa sin resultados'],
    ['lista', 'Lista desde el mapa'], ['lista-cargando', 'Lista cargando'], ['lista-sin-resultados', 'Lista sin resultados'],
    ['lista-error', 'Lista error de conexión']
  ];
  const FILTERS_DEFAULT = ['Condesa', 'Elevador', '3 rec', 'Terraza'];

  const state = {
    origin: 'todos', scenario: null, zone: null, selected: null, drawing: false,
    chips: FILTERS_DEFAULT.slice(), view: 'map', prevCount: null, frozenUpdating: false, listState: null
  };

  /* ---------- Utilidades ---------- */
  const money = (n) => '$' + n.toLocaleString('en-US');
  const kfmt = (n) => '$' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
  const inPoly = (lat, lng, poly) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [yi, xi] = poly[i], [yj, xj] = poly[j];
      if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const dist2 = (a) => (a.lat - center.lat) ** 2 + (a.lng - center.lng) ** 2;

  const dataset = () => {
    if (state.scenario === 'sin-resultados') return [];
    if (state.scenario === 'sin-red') return ALL.filter((i) => i.type !== 'red');
    if (state.scenario === 'lista-vacia') return ALL.filter((i) => i.curated && i.type === 'mercado').slice(0, 3);
    return ALL;
  };

  /* ---------- Mapa ---------- */
  const map = L.map('map', { zoomControl: false, attributionControl: true, zoomSnap: 1, tap: true, minZoom: 11, maxZoom: 18 });
  if (window.M1_OFFLINE_MAP && L.IllustrativeLayer) {
    // Versión sin servidor de tiles (por ejemplo, el artifact compartido): mapa ilustrativo dibujado en canvas
    $('map').classList.add('is-illustrative');
    new L.IllustrativeLayer({ origin: [center.lat, center.lng], maxZoom: 19 }).addTo(map);
    map.attributionControl.setPrefix(false);
    map.attributionControl.addAttribution('Mapa ilustrativo');
  } else {
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
  }
  const markers = L.layerGroup().addTo(map);
  let zoneLayers = null;
  let programmatic = false, progT, suppress = false;
  const prog = () => { programmatic = true; clearTimeout(progT); progT = setTimeout(() => { programmatic = false; }, 900); };

  const INITIAL = { c: [center.lat, center.lng], z: 16 };
  // Vista inicial: sube un poco el contenido para que el contador inferior no tape pins (solo mobile)
  const homeView = () => {
    const off = isDesktop() ? 0 : 40;
    const pt = map.project(INITIAL.c, INITIAL.z).add([0, off]);
    map.setView(map.unproject(pt, INITIAL.z), INITIAL.z, { animate: false });
  };

  /* ---------- Cálculo de visibles ---------- */
  const visibleAll = () => {
    const b = map.getBounds();
    return dataset().filter((i) => (state.zone ? inPoly(i.lat, i.lng, state.zone) : b.contains([i.lat, i.lng])));
  };
  const counts = (list) => ({ todos: list.length, red: list.filter((i) => i.type === 'red').length, mercado: list.filter((i) => i.type === 'mercado').length });
  const originFilter = (list) => (state.origin === 'todos' ? list : list.filter((i) => i.type === state.origin));

  /* ---------- Marcadores ---------- */
  const pinIcon = (it, sel, cls) => L.divIcon({
    className: 'm-icon ' + (cls || ''), iconSize: [84, 48], iconAnchor: [42, 44],
    html: `<div class="pin-box"><button class="pin ${it.type === 'red' ? 'pin-red' : 'pin-mx'}${sel ? ' is-selected' : ''}" type="button" aria-label="${it.type === 'red' ? 'Red M1' : 'Mercado'}, ${money(it.price)}">${it.type === 'red' ? '<svg class="icon"><use href="#i-shield"/></svg>' : ''}${kfmt(it.price)}</button></div>`
  });
  const clusterIcon = (group, cls) => {
    const n = group.length, r = group.filter((g) => g.type === 'red').length;
    const kind = r === n ? 'c-red' : r === 0 ? 'c-mx' : 'c-mix';
    const s = Math.round(Math.max(34, Math.min(68, 26 + Math.sqrt(n) * 5)));
    return L.divIcon({
      className: 'm-icon ' + (cls || ''), iconSize: [s, s], iconAnchor: [s / 2, s / 2],
      html: `<button class="cluster ${kind}" style="--s:${s}px" type="button" aria-label="${n} inmuebles, acercar">${n}</button>`
    });
  };

  const cluster = (list) => {
    const pts = list.map((it) => ({ it, p: map.latLngToContainerPoint([it.lat, it.lng]) }));
    const used = new Set(), groups = [];
    pts.forEach((a, i) => {
      if (used.has(i)) return;
      const g = [a]; used.add(i);
      pts.forEach((b, j) => { if (!used.has(j) && Math.abs(a.p.x - b.p.x) < CLUSTER_DX && Math.abs(a.p.y - b.p.y) < CLUSTER_DY) { g.push(b); used.add(j); } });
      groups.push(g);
    });
    return groups;
  };

  const renderMarkers = (cls) => {
    markers.clearLayers();
    const b = map.getBounds().pad(0.05);
    const pool = originFilter(dataset().filter((i) => b.contains([i.lat, i.lng])));
    const showPrices = map.getZoom() >= PRICE_ZOOM;
    const selectedItem = ALL.find((i) => i.id === state.selected);
    const zoneTest = (i) => !state.zone || inPoly(i.lat, i.lng, state.zone);

    cluster(pool.filter((i) => !(selectedItem && i.id === selectedItem.id))).forEach((g) => {
      const items = g.map((x) => x.it);
      const out = items.every((i) => !zoneTest(i));
      const c = (cls || '') + (out ? ' out' : '');
      if (items.length === 1 && showPrices) {
        const it = items[0];
        L.marker([it.lat, it.lng], { icon: pinIcon(it, false, c), keyboard: true, title: '' })
          .on('click', () => selectItem(it.id)).addTo(markers);
      } else {
        const lat = items.reduce((s, i) => s + i.lat, 0) / items.length, lng = items.reduce((s, i) => s + i.lng, 0) / items.length;
        L.marker([lat, lng], { icon: clusterIcon(items, c) }).on('click', () => {
          prog();
          map.fitBounds(L.latLngBounds(items.map((i) => [i.lat, i.lng])).pad(0.5), { maxZoom: Math.min(18, map.getZoom() + 3), animate: true });
        }).addTo(markers);
      }
    });
    if (selectedItem && pool.includes(selectedItem)) {
      L.marker([selectedItem.lat, selectedItem.lng], { icon: pinIcon(selectedItem, true, ''), zIndexOffset: 1000 })
        .on('click', () => selectItem(selectedItem.id)).addTo(markers);
    }
  };

  /* ---------- Render de UI ---------- */
  const brokerParts = (it) => { const [n, ag] = (it.broker || '').split(' · '); return { n, ag }; };
  const cardHTML = (it) => `
    <article class="card" data-id="${it.id}">
      <div class="card-photo"><img src="${it.photo}" alt="" loading="lazy"><span class="card-count">1/${it.photoCount}</span></div>
      <div class="card-row"><span class="card-title">${it.title}</span>${it.type === 'red'
        ? '<span class="badge badge-red"><svg class="icon"><use href="#i-shield"/></svg>RedMoradaUno</span>'
        : '<span class="badge badge-mx">Mercado</span>'}</div>
      <div class="card-price"><b>${money(it.price)} MXN</b><small>${it.rec} recs · ${it.banos} baños · ${it.m2}m²</small></div>
      <div class="card-loc">${it.zona.includes(',') ? it.zona : it.zona + ', Benito Juárez'}</div>
      ${it.type === 'red'
        ? `<div class="card-sub">${brokerParts(it).n} · ${it.comision ? 'Sí' : 'No'} comparte comisión · ${brokerParts(it).ag}</div>${it.comision ? '<span class="comision"><svg class="icon"><use href="#i-handshake"/></svg>Comparte comisión</span>' : ''}`
        : ''}
      <div class="card-tags">${it.tags.map((t) => `<span>${t}</span>`).join('')}</div>
    </article>`;

  const skeleton = () => [1, 2].map(() => '<div class="sk-card"><div class="sk sk-photo"></div><div class="sk sk-line w1"></div><div class="sk sk-line w2"></div><div class="sk sk-line w3"></div></div>').join('');
  const illu = '<svg class="illu" viewBox="0 0 120 100" aria-hidden="true"><path d="M12 90L50 8l38 82z" fill="#e0b3e6" stroke="#e0b3e6" stroke-width="8" stroke-linejoin="round"/><path d="M44 90l36-62 36 62z" fill="#671e75" stroke="#671e75" stroke-width="8" stroke-linejoin="round" transform="translate(-6 0)"/></svg>';
  const listContent = (shown, c) => {
    if (state.listState === 'loading') return skeleton();
    if (state.listState === 'error') {
      return `<div class="lp-state"><span class="err-ico"><svg class="icon"><use href="#i-wifi-off"/></svg></span>
        <h3>No pudimos cargar las propiedades</h3><p>Revisa tu conexión e inténtalo de nuevo.</p>
        <button class="btn-primary" type="button" data-act="retry">Reintentar</button></div>`;
    }
    if (shown.length === 0) {
      const red = state.origin === 'red', mx = state.origin === 'mercado';
      const title = red ? 'Aún no hay propiedades de la Red M1 con estos filtros' : mx ? 'Aún no hay propiedades de Mercado con estos filtros' : 'No encontramos propiedades con estos filtros';
      const text = red && c.mercado > 0 ? `Hay ${plural(c.mercado, 'propiedad', 'propiedades')} de Mercado que sí coinciden. También puedes ampliar tu búsqueda.` : 'Intenta ampliar tu búsqueda o quitar algunos filtros.';
      const filters = state.chips.length
        ? `<div class="active-filters"><small>Filtros activos</small><div>${state.chips.map((t) => `<button class="fchip" type="button" data-chip="${t}">${t}<svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button>`).join('')}</div></div>` : '';
      return `<div class="lp-state">${illu}<h3>${title}</h3><p>${text}</p>
        ${red && c.mercado > 0 ? `<button class="btn-primary" type="button" data-act="mercado">Ver ${c.mercado} de Mercado</button>` : ''}
        <button class="btn-outline" type="button" data-act="clear-all">Quitar filtros</button>${filters}</div>`;
    }
    return shown.map(cardHTML).join('');
  };

  const originHTML = (c) => [['todos', 'Todos'], ['red', 'Solo RedMoradaUno'], ['mercado', 'Mercado']]
    .map(([k, l]) => `<button class="ochip${state.origin === k ? ' is-active' : ''}" type="button" data-origin="${k}">${l}${state.listState ? '' : ` <em>${c[k === 'todos' ? 'todos' : k]}</em>`}</button>`).join('');

  const titleText = (shown, c) => {
    if (state.zone) return `${plural(shown.length, 'inmueble', 'inmuebles')} en tu zona`;
    if (state.origin === 'red' && c.red === 0) return '0 inmuebles de la Red M1';
    return plural(shown.length, 'inmueble', 'inmuebles');
  };

  const renderUI = () => {
    const vis = visibleAll(), c = counts(vis), shown = originFilter(vis);
    shown.sort((a, b) => (b.curated - a.curated) || (dist2(a) - dist2(b)));

    document.querySelectorAll('.js-origin').forEach((el) => { el.innerHTML = originHTML(c); });
    $('filter-chips').innerHTML = state.chips.map((t) => `<button class="fchip" type="button" data-chip="${t}">${t}<svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button>`).join('');

    const t = titleText(shown, c);
    let sheetHTML = t;
    if (state.prevCount !== null && state.prevCount !== shown.length) sheetHTML += `<small>· antes ${state.prevCount}</small>`;
    $('sheet-text').innerHTML = sheetHTML;
    document.querySelector('.js-count-title').textContent = t;
    document.querySelector('.js-count-title-zone').textContent = `${plural(shown.length, 'inmueble', 'inmuebles')} en ${state.zone ? 'tu zona' : 'esta zona'}`;
    $('cards').innerHTML = listContent(shown, c);
    document.body.classList.toggle('list-state', !!state.listState || shown.length === 0);
    $('lp-toast').hidden = state.listState !== 'error';

    // Botón dibujar / borrar
    const hasZone = !!state.zone;
    $('draw-btn').innerHTML = hasZone
      ? '<svg class="icon"><use href="#i-trash"/></svg><span>Borrar zona</span>'
      : '<svg class="icon"><use href="#i-pencil"/></svg><span>Dibujar zona</span>';

    renderEmpty(c, shown);
    renderPreview();
    renderMarkers();
    updateZoomToast();
    return { c, shown };
  };

  const renderEmpty = (c, shown) => {
    const el = $('empty-card');
    let html = '';
    if (c.todos === 0 || (state.zone && shown.length === 0)) {
      html = `<span class="empty-ico"><svg class="icon"><use href="#i-search-minus"/></svg></span>
        <h3>No encontramos coincidencias exactas en esta zona</h3>
        <p>Intenta ampliar el rango de precio o limpiar filtros. También puedes mover el mapa a otra zona.</p>
        <button class="btn-primary" type="button" data-act="clear">Limpiar filtros</button>`;
    } else if (state.origin === 'red' && c.red === 0 && c.mercado > 0) {
      html = `<span class="badge badge-red"><svg class="icon"><use href="#i-shield"/></svg>Red M1</span>
        <h3>No hay resultados de la Red M1</h3>
        <p>Cada día sumamos más asesores a la Red M1. Mientras tanto, puedes ver las opciones de Mercado en esta zona.</p>
        <button class="btn-primary" type="button" data-act="mercado">Ver ${c.mercado} de Mercado</button>
        <button class="btn-link" type="button" data-act="clear">Limpiar filtros</button>`;
    }
    el.hidden = !html; el.innerHTML = html;
    if (html && state.selected) { state.selected = null; }
  };

  const renderPreview = () => {
    const el = $('preview');
    const it = ALL.find((i) => i.id === state.selected);
    if (!it || isDesktop()) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `
      <div class="pv-photo"><img src="${it.photo}" alt=""><span class="badge ${it.type === 'red' ? 'badge-red' : 'badge-mx'}">${it.type === 'red' ? '<svg class="icon"><use href="#i-shield"/></svg>Red M1' : 'Mercado'}</span></div>
      <div class="pv-body">
        <div class="pv-title"><span>${it.title}</span><button class="pv-close" type="button" aria-label="Cerrar" data-act="close-preview"><svg class="icon"><use href="#i-x"/></svg></button></div>
        <div class="price">${money(it.price)} <small>/ mes</small></div>
        <div class="meta">${it.rec} rec. &nbsp; ${it.banos} baños &nbsp; ${it.m2} m²</div>
        <div class="loc">${it.zona.split(',')[0]}${it.type === 'red' ? ', Benito Juárez' : ''}</div>
        ${it.type === 'red'
          ? `<div class="sub">${it.broker}</div>${it.comision ? '<span class="comision"><svg class="icon"><use href="#i-handshake"/></svg>Comparte comisión</span>' : ''}`
          : `<div class="sub">+ ${money(it.maint)} mantenimiento</div>`}
      </div>`;
  };

  /* ---------- Selección ---------- */
  function selectItem(id) {
    state.selected = id;
    renderPreview(); renderMarkers();
    if (isDesktop()) {
      document.querySelectorAll('.card.is-highlight').forEach((c) => c.classList.remove('is-highlight'));
      const card = document.querySelector(`.card[data-id="${id}"]`);
      if (card) { card.classList.add('is-highlight'); card.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    }
  }
  const deselect = () => {
    if (!state.selected) return;
    state.selected = null; renderPreview(); renderMarkers();
    document.querySelectorAll('.card.is-highlight').forEach((c) => c.classList.remove('is-highlight'));
  };
  map.on('click', deselect);

  /* ---------- Toast ---------- */
  let toastTimer;
  const showToast = (msg, { loading = false, ms = 0 } = {}) => {
    const t = $('toast');
    t.querySelector('span').textContent = msg; t.classList.toggle('loading', loading); t.hidden = false;
    clearTimeout(toastTimer);
    if (ms) toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  };
  const hideToast = () => { clearTimeout(toastTimer); $('toast').hidden = true; };
  const updateZoomToast = () => {
    if (state.drawing || updTimer || loadTimer || state.frozenUpdating) return;
    if (map.getZoom() < PRICE_ZOOM && !state.zone) showToast('Acerca el mapa para ver precios');
    else if ($('toast').querySelector('span').textContent === 'Acerca el mapa para ver precios') hideToast();
  };

  /* ---------- Actualización por viewport (debounce, sin botón manual) ---------- */
  let updTimer = null, loadTimer = null;
  const cancelUpdate = () => { clearTimeout(updTimer); clearTimeout(loadTimer); updTimer = loadTimer = null; };

  const onMoved = () => {
    if (state.drawing || suppress) return;
    if (programmatic) { programmatic = false; clearTimeout(progT); if (!state.frozenUpdating) renderUI(); return; }
    if (state.zone) return;
    cancelUpdate();
    const before = originFilter(visibleAllPrev).length;
    updTimer = setTimeout(() => {
      updTimer = null;
      showToast('Actualizando esta zona…', { loading: true });
      document.querySelectorAll('#map .m-icon').forEach((m) => m.classList.add('stale'));
      loadTimer = setTimeout(() => {
        loadTimer = null; hideToast();
        state.prevCount = before;
        renderUI(); renderMarkers('enter');
        setTimeout(() => { state.prevCount = null; $('sheet-text').innerHTML = titleText(originFilter(visibleAll()), counts(visibleAll())); }, 3500);
      }, LATENCY_MS);
    }, DEBOUNCE_MS);
  };
  let visibleAllPrev = [];
  map.on('movestart zoomstart', () => { if (!updTimer && !loadTimer) { try { visibleAllPrev = visibleAll(); } catch (e) { visibleAllPrev = []; } } });
  map.on('moveend', onMoved);

  /* ---------- Dibujo de zona ---------- */
  const layer = $('draw-layer'), path = $('draw-path'), mapEl = $('map');
  let pts = [], drawingNow = false;
  const interactions = ['dragging', 'touchZoom', 'doubleClickZoom', 'scrollWheelZoom', 'boxZoom', 'keyboard'];
  const lockMap = (lock) => interactions.forEach((k) => map[k] && map[k][lock ? 'disable' : 'enable']());
  const drawD = () => (pts.length ? 'M' + pts.map((p) => p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join('L') : '');
  const rel = (e) => { const r = mapEl.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const pathLen = () => pts.reduce((s, p, i) => (i ? s + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);

  const enterDraw = () => {
    state.drawing = true; cancelUpdate(); deselect(); hideToast();
    document.body.classList.add('drawing');
    $('drawbar').hidden = false; $('draw-hint').hidden = false; layer.removeAttribute('hidden');
    pts = []; path.setAttribute('d', ''); lockMap(true);
    requestAnimationFrame(() => map.invalidateSize());
  };
  const exitDraw = () => {
    state.drawing = false;
    document.body.classList.remove('drawing');
    $('drawbar').hidden = true; $('draw-hint').hidden = true; layer.setAttribute('hidden', '');
    pts = []; path.setAttribute('d', ''); lockMap(false);
    requestAnimationFrame(() => map.invalidateSize());
  };

  layer.addEventListener('pointerdown', (e) => { drawingNow = true; layer.setPointerCapture(e.pointerId); pts = [rel(e)]; path.setAttribute('d', drawD()); });
  layer.addEventListener('pointermove', (e) => { if (!drawingNow) return; pts.push(rel(e)); path.setAttribute('d', drawD()); });
  const finish = () => {
    if (!drawingNow) return; drawingNow = false;
    if (pts.length < 6 || pathLen() < 140) {
      pts = []; path.setAttribute('d', '');
      showToast('Trazo muy corto. Dibuja una zona más grande.', { ms: 2600 }); return;
    }
    applyZone(pts.map((p) => { const ll = map.containerPointToLatLng([p.x, p.y]); return [ll.lat, ll.lng]; }));
  };
  layer.addEventListener('pointerup', finish);
  layer.addEventListener('pointercancel', finish);

  function applyZone(poly, silent) {
    clearZone(true);
    exitDraw();
    state.zone = poly; state.selected = null;
    const world = [[85, -180], [85, 180], [-85, 180], [-85, -180]];
    zoneLayers = L.layerGroup([
      L.polygon([world, poly], { stroke: false, fillColor: '#2a1236', fillOpacity: 0.22, interactive: false }),
      L.polygon(poly, { color: '#772583', weight: 3, fillColor: '#772583', fillOpacity: 0.07, interactive: false })
    ]).addTo(map);
    prog();
    map.fitBounds(L.polygon(poly).getBounds(), { padding: [48, 48], maxZoom: 17, animate: !silent });
    if (silent) programmatic = false;
    renderUI();
    showToast('Zoom automático a tu zona', { ms: 2800 });
  }
  function clearZone(quiet) {
    if (zoneLayers) { map.removeLayer(zoneLayers); zoneLayers = null; }
    state.zone = null;
    if (!quiet) renderUI();
  }

  /* ---------- Reset y estados ---------- */
  const resetAll = () => {
    cancelUpdate(); hideToast();
    state.frozenUpdating = false; state.prevCount = null;
    if (state.drawing) exitDraw();
    clearZone(true);
    Object.assign(state, { origin: 'todos', scenario: null, selected: null, chips: FILTERS_DEFAULT.slice(), view: 'map', listState: null });
    document.body.classList.remove('view-list');
    map.invalidateSize({ animate: false, pan: false });
    homeView();
  };

  const demoZone = () => {
    const mLat = 111320, mLng = 111320 * Math.cos(center.lat * Math.PI / 180);
    const r = [300, 260, 330, 280, 340, 270];
    return r.map((m, i) => { const a = (i / r.length) * Math.PI * 2 + 0.4; return [center.lat + Math.sin(a) * m / mLat, center.lng + Math.cos(a) * m / mLng]; });
  };

  const applyState = (name) => {
    suppress = true;
    resetAll();
    switch (name) {
      case 'actualizando': {
        state.frozenUpdating = true;
        renderUI();
        const n = originFilter(visibleAll()).length;
        // Mueve ligeramente el mapa para mostrar pins "viejos" mientras carga
        state.prevCount = n;
        document.querySelectorAll('#map .m-icon').forEach((m, i) => { if (i % 3 === 0) m.classList.add('stale'); });
        $('sheet-text').innerHTML = `${plural(n + 8, 'inmueble', 'inmuebles')}<small>· antes ${n}</small>`;
        showToast('Actualizando esta zona…', { loading: true });
        break;
      }
      case 'clusters': map.setView(INITIAL.c, 13, { animate: false }); break;
      case 'dibujar': renderUI(); enterDraw(); demoStroke(); break;
      case 'zona-dibujada': renderUI(); applyZone(demoZone(), true); break;
      case 'preview-red': renderUI(); selectItem(ALL.find((i) => i.price === 38000).id); break;
      case 'preview-mercado': renderUI(); selectItem(ALL.find((i) => i.price === 21000).id); break;
      case 'sin-red': state.scenario = 'sin-red'; state.origin = 'red'; renderUI(); break;
      case 'sin-resultados': state.scenario = 'sin-resultados'; renderUI(); break;
      case 'lista': renderUI(); setView('list'); break;
      case 'lista-cargando': state.listState = 'loading'; renderUI(); setView('list'); break;
      case 'lista-error': state.listState = 'error'; renderUI(); setView('list'); break;
      case 'lista-sin-resultados':
        state.scenario = 'lista-vacia'; state.origin = 'red'; state.chips = ['4+ recámaras', 'Hasta $12,000', 'Pet-friendly'];
        renderUI(); setView('list'); break;
      default: renderUI();
    }
    if (name === 'clusters') renderUI();
    suppress = false; programmatic = false;
    markCurrent(name);
  };

  const demoStroke = () => {
    const r = mapEl.getBoundingClientRect(), cx = r.width / 2, cy = r.height * 0.5, rad = Math.min(r.width, r.height) * 0.26;
    pts = [];
    for (let a = -0.3; a < Math.PI * 2 * 0.86; a += 0.12) pts.push({ x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad });
    path.setAttribute('d', drawD());
  };

  /* ---------- Vista lista (mobile) ---------- */
  function setView(v) {
    state.view = v;
    document.body.classList.toggle('view-list', v === 'list');
    if (v === 'list') $('lp-scroll').scrollTop = 0;
    requestAnimationFrame(() => map.invalidateSize());
  }

  /* ---------- Eventos de UI ---------- */
  const openFicha = (id) => {
    const it = ALL.find((i) => i.id === id);
    window.location.href = 'ficha.html#' + (it && it.type === 'mercado' ? 'mercado' : 'red-m1');
  };
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.card[data-id]');
    if (card) { openFicha(card.dataset.id); return; }
    if (e.target.closest('#preview') && !e.target.closest('[data-act]')) { openFicha(state.selected); return; }
    const o = e.target.closest('[data-origin]');
    if (o) { state.origin = o.dataset.origin; state.selected = null; renderUI(); return; }
    const ch = e.target.closest('[data-chip]');
    if (ch) { state.chips = state.chips.filter((x) => x !== ch.dataset.chip); renderUI(); return; }
    const act = e.target.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'mercado') { state.origin = 'mercado'; renderUI(); }
      else if (a === 'clear-all') {
        const was = state.scenario; clearZone(true);
        Object.assign(state, { origin: 'todos', scenario: null, chips: [], selected: null });
        if (was) { prog(); homeView(); }
        renderUI();
      } else if (a === 'retry') {
        state.listState = 'loading'; renderUI();
        setTimeout(() => { state.listState = null; renderUI(); }, 1400);
      }
      else if (a === 'clear') {
        const wasScenario = state.scenario;
        clearZone(true); Object.assign(state, { origin: 'todos', scenario: null, chips: FILTERS_DEFAULT.slice(), selected: null });
        if (wasScenario) { prog(); homeView(); }
        renderUI();
      } else if (a === 'close-preview') { e.stopPropagation(); deselect(); }
    }
  });
  $('draw-btn').addEventListener('click', () => { if (state.zone) clearZone(); else enterDraw(); });
  $('draw-cancel').addEventListener('click', () => { exitDraw(); renderUI(); });
  $('sheet').addEventListener('click', () => setView('list'));
  $('fab-map').addEventListener('click', () => setView('map'));
  $('lp-back').addEventListener('click', () => setView('map'));
  document.querySelector('.topbar .back').addEventListener('click', (e) => { if (state.view === 'list' && !isDesktop()) { e.preventDefault(); setView('map'); } });
  $('zoom-in').addEventListener('click', () => map.zoomIn());
  $('zoom-out').addEventListener('click', () => map.zoomOut());
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (state.drawing) { exitDraw(); renderUI(); } else if (state.view === 'list') setView('map'); else deselect();
  });
  desktopMQ.addEventListener('change', () => { setView('map'); renderUI(); map.invalidateSize(); });
  window.addEventListener('resize', () => map.invalidateSize());

  /* ---------- Buscador: inactivo → activo al seleccionarlo ---------- */
  const sb = $('sb-input');
  document.querySelector('.searchbox').addEventListener('click', (e) => { if (!e.target.closest('.sb-mic')) sb.focus(); });
  sb.addEventListener('focus', () => sb.select());
  sb.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); sb.blur(); showToast('Actualizando búsqueda…', { loading: true, ms: 1200 }); }
    else if (e.key === 'Escape') { e.stopPropagation(); sb.blur(); }
  });

  /* ---------- Selector de estados + hash ---------- */
  const menu = $('states-menu'), btn = $('states-btn');
  menu.innerHTML = STATES.map(([k, l]) => `<li><a href="#${k}" data-state="${k}">${l}</a></li>`).join('');
  btn.addEventListener('click', (e) => { e.stopPropagation(); const open = menu.hidden; menu.hidden = !open; btn.setAttribute('aria-expanded', open); });
  document.addEventListener('click', (e) => { if (!e.target.closest('#states')) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
  const markCurrent = (name) => menu.querySelectorAll('a').forEach((a) => a.classList.toggle('is-current', a.dataset.state === (name || 'mapa')));
  menu.addEventListener('click', () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); });

  const fromHash = () => {
    const h = location.hash.replace('#', '');
    applyState(STATES.some(([k]) => k === h) ? h : 'mapa');
  };
  window.addEventListener('hashchange', fromHash);
  map.setView(INITIAL.c, INITIAL.z, { animate: false });
  fromHash();
})();
