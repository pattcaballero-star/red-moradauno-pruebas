(() => {
  const $ = (id) => document.getElementById(id);
  const PHOTOS = ['assets/img/property-del-valle.jpg', 'assets/img/property-del-valle-sur.jpg'];
  const POS = ['50% 40%', '50% 70%', '50% 20%', '50% 55%', '50% 85%'];

  // Datos de ejemplo: [título, colonia, precio, recámaras, baños, m²]
  const SEED = {
    publico: [
      ['Departamento amueblado con roof garden', 'Roma Norte', 24500, 2, 2, 85],
      ['Depto bonito en la Del Valle', 'Del Valle Centro', 18900, 2, 1, 70],
      ['Loft remodelado cerca del Parque España', 'Condesa', 18500, 1, 1, 58],
      ['Departamento con terraza en Condesa', 'Condesa', 27000, 2, 2, 92],
      ['Penthouse con roof garden privado', 'Roma Norte', 38000, 3, 3, 160],
      ['Departamento luminoso en Hipódromo', 'Hipódromo', 23400, 2, 2, 80],
      ['Estudio amueblado en Condesa', 'Condesa', 14900, 1, 1, 45],
      ['Departamento familiar en Juárez', 'Juárez', 29900, 3, 2, 120],
      ['Departamento a media cuadra de Insurgentes', 'Roma Norte', 19200, 2, 1, 68],
      ['Departamento en Roma Sur con balcón', 'Roma Sur', 21800, 2, 1, 74],
      ['Departamento en Narvarte con elevador', 'Narvarte Poniente', 17500, 2, 1, 66],
      ['Departamento en Nápoles cerca del WTC', 'Nápoles', 20300, 2, 2, 78],
      ['Departamento con jardín en Del Valle', 'Del Valle Norte', 26500, 3, 2, 110],
      ['Departamento remodelado en Escandón', 'Escandón', 16200, 2, 1, 62]
    ],
    porPublicar: [
      ['Departamento amueblado con roof garden', 'Roma Norte', 24500, 2, 2, 85],
      ['Depto bonito en la Del Valle', 'Del Valle Centro', 18900, 2, 1, 70],
      ['Departamento con vista en Polanco', 'Polanco', 41000, 3, 3, 150],
      ['Departamento en Santa María la Ribera', 'Santa María la Ribera', 12900, 2, 1, 64]
    ],
    archivadas: [
      ['Loft en la Condesa con terraza', 'Condesa', 21000, 1, 1, 62],
      ['Estudio en Polanco', 'Polanco', 16500, 1, 1, 45],
      ['Estudio en Polanco', 'Polanco', 16500, 1, 1, 45],
      ['Estudio en Polanco', 'Polanco', 16500, 1, 1, 45]
    ]
  };

  const TABS = [['publico', 'Público', 'pub'], ['porPublicar', 'Por publicar', 'draft'], ['archivadas', 'Archivadas', 'arch']];
  const HASH = { publico: 'publico', 'por-publicar': 'porPublicar', archivadas: 'archivadas' };

  let n = 0;
  const items = [];
  Object.entries(SEED).forEach(([status, list]) => list.forEach((l, i) => {
    items.push({ id: 'i' + (++n), status, title: l[0], zona: l[1], price: l[2], rec: l[3], banos: l[4], m2: l[5], share: status === 'porPublicar' ? i !== 0 : status === 'archivadas' ? i !== 0 : (n % 7) !== 0,
      kind: status === 'archivadas' ? ['inactive', 'standard', 'standard', 'standard'][i] : null,
      reason: status === 'archivadas' ? [null, 'rentado', 'pausado', 'cancelado'][i] : null, photo: PHOTOS[n % 2], pos: POS[n % POS.length] });
  }));

  // H10 · datos de sincronización: origen, cambios detectados en la fuente y reapariciones
  const byId = (id) => items.find((i) => i.id === id);
  items.forEach((it) => { it.origin = 'IMPORTADO'; });
  byId('i8').origin = 'MANUAL';                                   // creado a mano en M1, no se sincroniza
  Object.assign(byId('i3'), { priceWas: 19500 });                 // CA4 · precio actualizado desde la fuente
  Object.assign(byId('i18'), { relisted: true, relistedAt: 'hace 3 días' }); // CA3 · estaba archivado y reapareció
  items.push({ id: 'i23', status: 'archivadas', title: 'Departamento en Narvarte Oriente', zona: 'Narvarte Oriente', price: 15800, rec: 2, banos: 1, m2: 60, share: true, kind: 'action', reason: null, origin: 'IMPORTADO', photo: PHOTOS[1], pos: POS[0] }); // CA2 · ARCHIVADO_NO_DETECTADO

  // El estado (a qué lista pertenece cada inmueble y si comparte comisión) se recuerda en este navegador
  const STATE_KEY = 'm1_inventory_state_v2';
  try {
    const saved = JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
    items.forEach((it) => { const v = saved[it.id]; if (v) { it.status = v.status; it.share = v.share; if (v.kind !== undefined) it.kind = v.kind; if (v.reason !== undefined) it.reason = v.reason; } });
  } catch (e) { /* sin almacenamiento: se queda con los datos de ejemplo */ }
  const saveState = () => {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(Object.fromEntries(items.map((i) => [i.id, { status: i.status, share: i.share, kind: i.kind, reason: i.reason }])))); } catch (e) { /* nada */ }
  };

  let current = 'publico';
  let syncFailed = false;   // H10 · la última lectura de la fuente falló: se conserva el último estado conocido
  let notifRelist = false;  // H10 · notificación «un inmueble archivado volvió a aparecer»
  const syncTxt = (it) => it.origin === 'MANUAL' ? 'Creado en M1 · no se sincroniza con portales' : 'Importado · ' + (syncFailed ? 'Última sincronización: ayer 6:00 a.m.' : 'Sincronizado: hoy 6:00 a.m.');
  const money = (v) => '$' + v.toLocaleString('en-US');
  const counts = () => ({ publico: items.filter((i) => i.status === 'publico').length, porPublicar: items.filter((i) => i.status === 'porPublicar').length, archivadas: items.filter((i) => i.status === 'archivadas').length });
  const saveCounts = () => { try { localStorage.setItem('m1_inventory_counts', JSON.stringify(counts())); } catch (e) { /* sin almacenamiento */ } };

  const renderStats = () => {
    const c = counts();
    $('inv-stats').innerHTML = TABS.map(([k, label, cls]) =>
      `<button class="inv-stat is-${cls}${current === k ? ' is-selected' : ''}" type="button" role="tab" aria-selected="${current === k}" data-tab="${k}"><b>${c[k]}</b><span>${label}</span>${k === 'archivadas' && badge ? `<i class="inv-badge" aria-label="${badge} nuevas">${badge}</i>` : ''}</button>`).join('');
  };

  const action = { publico: ['Archivar', 'archive'], porPublicar: ['Publicar', 'publish'], archivadas: ['Volver a publicar', 'republish'] };
  const ARCHIVE_ICO = '<svg class="inv-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4"/></svg>';
  const BELL_ICO = '<svg class="inv-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>';
  const cardNew = (it) => `
    <article class="inv-card is-new" data-id="${it.id}">
      <div class="inv-row">
        <img class="inv-photo" src="${it.photo}" alt="" style="object-position:${it.pos}" loading="lazy">
        <div class="inv-info">
          <span class="inv-tag${it.relisted ? ' is-amber' : ''}">${it.relisted ? 'Volvió a aparecer en el portal' : 'Nuevo · detectado en otro portal'}</span>
          <h3>${it.title}</h3>
          <div class="inv-price"><b>${money(it.price)}</b><span>/ mes</span></div>
          <p class="inv-meta">${it.zona} · ${it.rec} rec · ${it.banos} ${it.banos === 1 ? 'baño' : 'baños'} · ${it.m2} m²</p>
          <p class="inv-sync">${it.relisted ? 'Reapareció ' + it.relistedAt + ' · Estaba archivado' : 'Detectado hoy 6:00 a.m.'}</p>
        </div>
      </div>
      <div class="inv-ask">
        <div><b>¿Compartes comisión?</b><span>Ofreces comisión a otros asesores</span></div>
        <label class="inv-share2"><input class="inv-switch" type="checkbox" data-act="share" ${it.share ? 'checked' : ''}><i class="inv-sw" aria-hidden="true"></i><em>${it.share ? 'Sí' : 'No'}</em></label>
      </div>
      <div class="inv-actions">
        <button class="inv-btn" type="button" data-act="discard">No publicar</button>
        <button class="inv-btn is-primary" type="button" data-act="publish">Publicar en la Bolsa</button>
      </div>
    </article>`;

  const REFRESH_ICO = '<svg class="inv-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5"/></svg>';
  const CLOCK_ICO = '<svg class="inv-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const photoOf = (it) => `<img class="inv-photo" src="${it.photo}" alt="" style="object-position:${it.pos}" loading="lazy">`;
  const metaOf = (it) => `${it.zona} · ${it.rec} rec · ${it.banos} ${it.banos === 1 ? 'baño' : 'baños'} · ${it.m2} m²`;
  const shareSwitch = (it) => `<label class="inv-share"><span>Comparte comisión</span><input class="inv-switch" type="checkbox" data-act="share" ${it.share ? 'checked' : ''}><i class="inv-sw" aria-hidden="true"></i><em>${it.share ? 'Sí' : 'No'}</em></label>`;
  const republishBtn = (label) => `<button class="inv-btn is-outline" type="button" data-act="republish">${REFRESH_ICO}${label}</button>`;

  // Caso 1 · acción requerida (el anuncio ya no se detectó en el portal original)
  const cardAction = (it) => `
    <article class="inv-card is-action" data-id="${it.id}">
      <div class="inv-flag"><i></i><span>Acción requerida · Se archivó el anuncio ya que no se detectó en el portal original</span></div>
      <div class="inv-row">${photoOf(it)}
        <div class="inv-info"><h3>${it.title}</h3><div class="inv-price"><b>${money(it.price)}</b><span>/ mes</span></div>
          <p class="inv-meta">${metaOf(it)}</p><p class="inv-sync">${syncTxt(it)}</p></div></div>
      <div class="inv-foot">${shareSwitch(it)}${republishBtn('Volver a publicar')}</div>
    </article>`;

  // Caso 2 · archivado normal, con etiqueta del motivo (Rentado · Pausado · Cancelado)
  const REASON_TAG = { rentado: ['Rentado', 'is-green'], pausado: ['Pausado', 'is-amber'], cancelado: ['Cancelado', 'is-gray'] };
  const cardArchived = (it) => `
    <article class="inv-card is-archived" data-id="${it.id}">
      ${REASON_TAG[it.reason] ? `<div class="inv-top"><span class="inv-tag ${REASON_TAG[it.reason][1]}">${REASON_TAG[it.reason][0]}</span></div>` : ''}
      <div class="inv-row">${photoOf(it)}
        <div class="inv-info"><h3>${it.title}</h3><div class="inv-price"><b>${money(it.price)}</b><span>/ mes</span></div>
          <p class="inv-meta">${metaOf(it)}</p>${shareSwitch(it)}<p class="inv-sync">${syncTxt(it)}</p></div></div>
      <div class="inv-end">${republishBtn('Volver a publicar')}</div>
    </article>`;

  // Caso 3 · salió de la Bolsa por falta de actividad (hay que confirmar si sigue disponible)
  const cardInactive = (it) => `
    <article class="inv-card is-inactive" data-id="${it.id}">
      <div class="inv-top"><span class="inv-tag is-red">Salió de la Bolsa por falta de actividad</span></div>
      <div class="inv-row">${photoOf(it)}
        <div class="inv-info"><h3>${it.title}</h3><div class="inv-price"><b>${money(it.price)}</b><span>/ mes</span></div>
          <p class="inv-meta">${metaOf(it)}</p><p class="inv-sync">Última actualización: hace 30 días</p></div></div>
      <div class="inv-why">${CLOCK_ICO}<p>Los inmuebles sin cambios en 30 días pueden ya no estar disponibles. Para cuidar la calidad de la Bolsa, solo mostramos anuncios vigentes.</p></div>
      <p class="inv-ask2">¿Sigue disponible?</p>
      <div class="inv-two">${republishBtn('Sí, volver a publicar')}<button class="inv-btn is-outline" type="button" data-act="rented">Ya se rentó</button></div>
      <div class="inv-foot is-plain">${shareSwitch(it)}</div>
    </article>`;

  const card = (it) => it.status === 'porPublicar' ? cardNew(it)
    : it.status === 'archivadas' ? (it.kind === 'action' ? cardAction(it) : it.kind === 'inactive' ? cardInactive(it) : cardArchived(it))
    : `
    <article class="inv-card" data-id="${it.id}">
      <div class="inv-row">
        <img class="inv-photo" src="${it.photo}" alt="" style="object-position:${it.pos}" loading="lazy">
        <div class="inv-info">
          <h3>${it.title}</h3>
          <div class="inv-price"><b>${money(it.price)}</b><span>/ mes</span>${it.priceWas ? `<em class="inv-chg">Precio actualizado · antes ${money(it.priceWas)}</em>` : ''}</div>
          <p class="inv-meta">${it.zona} · ${it.rec} rec · ${it.banos} ${it.banos === 1 ? 'baño' : 'baños'} · ${it.m2} m²</p>
          <p class="inv-sync">${syncTxt(it)}</p>
        </div>
      </div>
      <div class="inv-foot">
        <label class="inv-share"><span>Comparte comisión</span>
          <input class="inv-switch" type="checkbox" data-act="share" ${it.share ? 'checked' : ''}>
          <i class="inv-sw" aria-hidden="true"></i><em>${it.share ? 'Sí' : 'No'}</em></label>
        <button class="inv-btn" type="button" data-act="${action[it.status][1]}">${it.status === 'publico' ? ARCHIVE_ICO : ''}${action[it.status][0]}</button>
      </div>
    </article>`;

  let badge = 0;        // insignia roja en Archivadas (movimientos sin revisar)
  let notice = false;   // aviso «Movimos N inmuebles a Archivadas» (caso de uso dentro de Público)
  const INFO_ICO = '<svg class="inv-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>';
  const detectedHTML = (k) => `<div class="inv-notice is-info" role="status">${INFO_ICO}<p><b>Detectamos ${k} ${k === 1 ? 'inmueble nuevo' : 'inmuebles nuevos'}</b><br>${k === 1 ? 'Lo publicaste' : 'Los publicaste'} en otros portales. Elige si ${k === 1 ? 'lo publicas' : 'los publicas'} en la Red MoradaUno y si compartes comisión con otros asesores.</p></div>`;
  const ALERT_ICO = '<svg class="inv-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/></svg>';
  const failHTML = () => `<div class="inv-notice" role="status">${ALERT_ICO}<p><b>No pudimos sincronizar hoy</b><br>Tu inventario sigue como quedó en la última sincronización (ayer 6:00 a.m.). Lo intentaremos de nuevo automáticamente.</p></div>`;
  const relistNotifHTML = () => `<div class="inv-notice is-info" role="status">${BELL_ICO}<p><b>Un inmueble archivado volvió a aparecer</b><br>Lo detectamos otra vez en tu portal y lo dejamos en Por publicar. No se publica hasta que lo confirmes.</p><a class="inv-notice-link" href="#por-publicar">Revisar</a></div>`;
  const relistedHTML = (k) => `<div class="inv-notice is-info" role="status">${BELL_ICO}<p><b>${k === 1 ? 'Un inmueble archivado volvió a aparecer' : k + ' inmuebles archivados volvieron a aparecer'}</b><br>No ${k === 1 ? 'lo publicamos' : 'los publicamos'} solos. Confirma si quieres publicar${k === 1 ? 'lo' : 'los'} de nuevo.</p></div>`;
  const noticeHTML = () => `<div class="inv-notice" role="status">${BELL_ICO}<p><b>Movimos 2 inmuebles a Archivadas</b>: ya que no aparecen en el portal o cumplieron 30 días sin reconfirmar.</p></div>`;

  let query = '', zonaSel = '';
  const fold = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const zonaBase = (z) => z.split(',')[0];

  const renderList = () => {
    const all = items.filter((i) => i.status === current);
    const q = fold(query.trim());
    const list = all.filter((i) => (!zonaSel || i.zona === zonaSel) && (!q || fold(i.title + ' ' + i.zona).includes(q))).sort((a, b) => (b.relisted ? 1 : 0) - (a.relisted ? 1 : 0));
    const reap = list.filter((i) => i.relisted).length, nuevos = list.length - reap;
    const filtered = all.length > 0 && list.length === 0;
    $('inv-list').innerHTML = (syncFailed ? failHTML() : '') + (notifRelist && current === 'publico' ? relistNotifHTML() : '') + (notice && current === 'publico' ? noticeHTML() : '') + (current === 'porPublicar' && reap ? relistedHTML(reap) : '') + (current === 'porPublicar' && nuevos ? detectedHTML(nuevos) : '') + (list.length ? list.map(card).join('')
      : filtered ? '<div class="inv-empty"><b>Sin resultados</b><span>Prueba con otra búsqueda o cambia la colonia.</span></div>'
      : '<div class="inv-empty"><b>No hay inmuebles aquí</b><span>Cuando muevas un inmueble a esta lista, lo verás en este espacio.</span></div>');
  };
  const fillZonas = () => {
    const sel = $('inv-zona'); if (!sel) return;
    const zonas = [...new Set(items.map((i) => i.zona))].sort((a, b) => a.localeCompare(b, 'es'));
    sel.innerHTML = '<option value="">Colonia</option>' + zonas.map((z) => `<option value="${z}">${zonaBase(z)}</option>`).join('');
    sel.value = zonaSel;
  };
  const render = () => { renderStats(); renderList(); saveCounts(); saveState(); };

  /* ---------- Modal «¿Por qué sale de la Bolsa?» (H10) ---------- */
  const ico = (d) => `<svg class="inv-ico" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const REASONS = [
    ['rentado', 'Rentado', 'Ya lo rentaste', ico('<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>')],
    ['pausado', 'Pausado temporalmente', 'Lo retiras por ahora y puedes reactivarlo', ico('<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>')],
    ['cancelado', 'Cancelado', 'Ya no se va a rentar', ico('<circle cx="12" cy="12" r="9"/><path d="M5.7 5.7l12.6 12.6"/>')]
  ];
  const REASON_INFO = {
    rentado: 'Dejará de verse en la Bolsa de inmediato y pasará a Archivadas.',
    pausado: 'Dejará de verse en la Bolsa de inmediato. Seguirá en tu inventario y puedes reactivarlo cuando quieras.',
    cancelado: 'Dejará de verse en la Bolsa de inmediato y pasará a Archivadas.'
  };
  const REASON_DONE = {
    rentado: ['archivadas', 'Marcamos el inmueble como rentado. Lo encontrarás en Archivadas.'],
    pausado: ['archivadas', 'Inmueble pausado. Puedes reactivarlo cuando quieras.'],
    cancelado: ['archivadas', 'Inmueble cancelado. Lo encontrarás en Archivadas.']
  };
  let reasonId = null, reasonPick = null;

  const renderReason = () => {
    const it = items.find((i) => i.id === reasonId);
    if (!it) return;
    $('reason-sheet').innerHTML = `
      <span class="rs-handle"></span>
      <header class="rs-head"><div><h2 id="reason-title">¿Por qué sale de la Bolsa?</h2><p>${it.title} · ${money(it.price)} / mes</p></div>
        <button class="rs-close" type="button" data-act="reason-close" aria-label="Cerrar"><svg class="inv-ico" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button></header>
      <div class="rs-list" role="radiogroup" aria-label="Motivo">${REASONS.map(([k, t, d, i]) => `
        <button class="rs-opt${reasonPick === k ? ' is-selected' : ''}" type="button" role="radio" aria-checked="${reasonPick === k}" data-reason="${k}"><span class="rs-ico">${i}</span><span><b>${t}</b><small>${d}</small></span></button>`).join('')}</div>
      ${reasonPick ? `<div class="rs-info">${INFO_ICO}<p>${REASON_INFO[reasonPick]}</p></div>` : ''}
      <div class="rs-actions"><button class="rs-cancel" type="button" data-act="reason-close">Cancelar</button><button class="rs-confirm" type="button" data-act="reason-confirm"${reasonPick ? '' : ' disabled'}>Confirmar</button></div>`;
  };
  const openReason = (id, pick = null) => {
    reasonId = id; reasonPick = pick; renderReason();
    $('reason-overlay').hidden = false; $('reason-sheet').hidden = false;
    document.body.style.overflow = 'hidden';
  };
  const closeReason = () => {
    $('reason-overlay').hidden = true; $('reason-sheet').hidden = true;
    document.body.style.overflow = ''; reasonId = null; reasonPick = null;
  };

  let tT;
  const toast = (msg) => { const t = $('inv-toast'); t.textContent = msg; t.hidden = false; clearTimeout(tT); tT = setTimeout(() => { t.hidden = true; }, 2500); };

  const move = (id, status, msg, reason) => { const it = items.find((i) => i.id === id); if (it) { it.status = status; if (status === 'publico') it.relisted = false; if (status === 'archivadas') { it.kind = 'standard'; it.reason = reason || 'cancelado'; } render(); toast(msg); } };

  document.addEventListener('click', (e) => {
    if (e.target.id === 'reason-overlay' || e.target.closest('[data-act=reason-close]')) { closeReason(); return; }
    const opt = e.target.closest('.rs-opt');
    if (opt) { reasonPick = opt.dataset.reason; renderReason(); return; }
    if (e.target.closest('[data-act=reason-confirm]') && reasonId && reasonPick) {
      const [status, msg] = REASON_DONE[reasonPick], id = reasonId;
      const pick = reasonPick;
      closeReason(); move(id, status, msg, pick);
      return;
    }
    const tab = e.target.closest('.inv-stat');
    if (tab) { current = tab.dataset.tab; if (current === 'archivadas') badge = 0; render(); return; }
    const b = e.target.closest('.inv-btn');
    if (!b) return;
    const id = b.closest('.inv-card').dataset.id, a = b.dataset.act;
    if (a === 'archive') openReason(id);
    else if (a === 'publish') move(id, 'publico', 'Inmueble publicado en la Red MoradaUno.');
    else if (a === 'republish') move(id, 'publico', 'Volvimos a publicar el inmueble en la Red MoradaUno.');
    else if (a === 'rented') move(id, 'archivadas', 'Listo. Marcamos el inmueble como rentado.', 'rentado');
    else if (a === 'discard') move(id, 'archivadas', 'Inmueble descartado. Lo encontrarás en Archivadas.', 'cancelado');
  });
  document.addEventListener('input', (e) => { if (e.target.id === 'inv-q') { query = e.target.value; renderList(); } });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'inv-zona') { zonaSel = e.target.value; renderList(); return; }
    if (!e.target.matches('.inv-switch')) return;
    const it = items.find((i) => i.id === e.target.closest('.inv-card').dataset.id);
    if (it) { it.share = e.target.checked; e.target.closest('label').querySelector('em').textContent = it.share ? 'Sí' : 'No'; saveState(); }
  });

  const fromHash = () => {
    const h = location.hash.replace('#', '');
    if (HASH[h]) current = HASH[h];
    closeReason();
    notice = h === 'publico-aviso';
    syncFailed = h === 'sync-fallo';
    notifRelist = h === 'publico-reaparecio';
    badge = h === 'por-publicar' ? 2 : 0;
    if (notice || syncFailed || notifRelist) current = 'publico';
    if (h === 'archivar-motivo') { current = 'publico'; render(); const it = items.find((i) => i.title === 'Depto bonito en la Del Valle' && i.status === 'publico'); if (it) openReason(it.id, 'pausado'); }
    else render();
    document.querySelectorAll('#states-menu a').forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === '#' + (h || 'publico')));
  };

  /* Selector de estados (herramienta del prototipo) */
  const STATES = [['publico', 'Mi inventario · Público'], ['publico-aviso', 'Público · aviso de archivado automático'], ['por-publicar', 'Por publicar · nuevos y reaparecidos'], ['publico-reaparecio', 'Público · notificación de reaparición'], ['sync-fallo', 'Falla de sincronización'], ['archivar-motivo', 'Archivar · motivo (modal)'], ['archivadas', 'Archivadas']];
  const menu = $('states-menu'), btn = $('states-btn');
  menu.innerHTML = STATES.map(([k, l]) => `<li><a href="#${k}">${l}</a></li>`).join('') + '<li><button type="button" id="inv-reset">Restablecer datos de ejemplo</button></li>';
  btn.addEventListener('click', (e) => { e.stopPropagation(); const open = menu.hidden; menu.hidden = !open; btn.setAttribute('aria-expanded', open); });
  document.addEventListener('click', (e) => { if (!e.target.closest('#states')) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
  menu.addEventListener('click', (e) => {
    menu.hidden = true;
    if (e.target.id === 'inv-reset') { try { localStorage.removeItem(STATE_KEY); localStorage.removeItem('m1_inventory_counts'); } catch (err) { /* nada */ } location.reload(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('reason-sheet').hidden) closeReason(); });
  window.addEventListener('hashchange', fromHash);
  fillZonas();
  fromHash();
})();
