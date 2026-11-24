(() => {
  const $ = (id) => document.getElementById(id);
  const icon = (n, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

  /* ---------- Datos de ejemplo ---------- */
  const PHOTOS = ['assets/img/property-del-valle.jpg', 'assets/img/property-del-valle-sur.jpg'];
  const POS = ['50% 40%', '50% 70%', '50% 20%', '50% 55%', '50% 85%'];

  const PROPS = {
    red: {
      type: 'red', price: '$24,500', maint: null,
      title: 'Departamento amueblado con roof garden', loc: 'Roma Norte, Cuauhtémoc, Ciudad de México',
      rec: 2, banos: 2, estac: 1, m2: 85, tags: ['Pet-friendly', 'Con elevador', 'Amueblado'],
      desc: 'Departamento luminoso en un edificio de 2019, a pasos de Álvaro Obregón. Cocina integral, closet vestidor en la recámara principal y acceso directo al roof garden con asadores. Entrega amueblado; mascotas permitidas con aval.',
      more: true,
      dist: [['Recámaras', '2'], ['Baños completos', '2'], ['Medio baño', '0'], ['Estacionamientos', '1 techado'], ['Superficie construida', '85 m²'], ['Piso', '4 de 7'], ['Antigüedad', '6 años'], ['Amueblado', 'Sí']],
      amen: ['Elevador', 'Roof garden', 'Gimnasio', 'Seguridad 24/7', 'Lavandería', 'Pet-friendly'],
      costs: [['Renta mensual', '$24,500'], ['Mantenimiento', 'Incluido en la renta'], ['Depósito', '1 mes'], ['Contrato mínimo', '12 meses'], ['Disponibilidad', 'Inmediata']],
      locNote: 'Ubicación aproximada. La dirección exacta la da el asesor al agendar la visita.',
      meta: 'ID de propiedad M1-24817 · Actualizada hace 2 días'
    },
    mercado: {
      type: 'mercado', price: '$19,800', maint: '$1,800',
      title: 'Departamento en Condesa cerca de Parque México', loc: 'Condesa, Cuauhtémoc, Ciudad de México',
      rec: 2, banos: 1, estac: 1, m2: 70, tags: ['Con elevador'],
      desc: 'Departamento remodelado a media cuadra de Parque México. Cocina equipada, ventanas amplias y balcón. Edificio con elevador y vigilancia.',
      descNote: 'Resumen del portal de origen. Para ver la publicación completa, continúa al portal.',
      dist: [['Recámaras', '2'], ['Baños completos', '1'], ['Estacionamientos', '1'], ['Superficie construida', '70 m²'], ['Mantenimiento', '$1,800 aparte']],
      amen: ['Elevador', 'Vigilancia', 'Balcón'],
      locNote: 'Ubicación aproximada según el portal de origen.'
    }
  };

  const ADVISORS = {
    'asesor-m1': { ini: 'MO', name: 'Mariana Ortega', co: 'Casa Alameda Inmobiliaria', since: 'En la Red M1 desde marzo 2024', rentas: '240 rentas M1 desde 2021', status: 'Activa hoy', on: true,
      stats: [['9', 'Inmuebles activos en la Bolsa'], ['8 años', 'En el sector']], comision: '50/50 en 8 de 9 inmuebles', opera: 'Roma Norte, Condesa', cta: 'wa' },
    'asesor-nuevo': { ini: 'LR', name: 'Luis Ramírez', co: 'Independiente', since: 'En la Red M1 desde septiembre 2026', rentas: null, status: 'Activo hace 2 días', on: false,
      stats: [['5 años', 'En el sector']], comision: null, opera: null, cta: 'wa' },
    'asesor-sin-datos': { ini: 'AS', name: 'Andrea Solís', co: 'Independiente', since: 'En la Red M1 desde octubre 2026', rentas: null, status: 'Activa hoy', on: true,
      stats: [], comision: null, opera: null, cta: 'wa' },
    'mi-perfil': { ini: 'PC', name: 'Patt Caballero', co: 'Independiente', since: 'En la Red M1 desde junio 2025', rentas: null, status: 'Activa hoy', on: true,
      stats: [['4', 'Inmuebles activos en la Bolsa'], ['6 años', 'En el sector']], comision: '50/50 en 4 de 4 inmuebles', opera: 'Roma Norte, Juárez', cta: 'chat' }
  };

  // [hash, etiqueta, ficha base, capa, perfil]
  const STATES = [
    ['red-m1', 'Ficha Red M1', 'red', null, null], ['mercado', 'Ficha Mercado', 'mercado', null, null],
    ['aviso-salida', 'Aviso «Estás saliendo de MoradaUno»', 'mercado', 'aviso', null],
    ['asesor-m1', 'Perfil del asesor · completo', 'red', null, 'asesor-m1'],
    ['asesor-nuevo', 'Perfil · asesor nuevo (fallback)', 'red', null, 'asesor-nuevo'],
    ['asesor-sin-datos', 'Perfil · sin datos opcionales', 'red', null, 'asesor-sin-datos'],
    ['mi-perfil', 'Perfil · mi propio perfil', 'red', null, 'mi-perfil'],
    ['compartir', 'Compartir (sheet)', 'red', 'share', null],
    ['enlace-copiado', 'Enlace copiado', 'red', 'share-copied', null],
    ['compartir-sistema', 'Compartir en… (menú del sistema)', 'red', 'share-sys', null],
    ['ficha-compartida', 'Ficha compartida (vista del cliente)', 'red', null, null, 'public'],
    ['reportes', 'Tabla de reportes (monitoreo)', 'red', null, null, 'reports']
  ];

  // MOR-628 · un toque en «¿Te dijeron que ya no está disponible?» guarda el reporte y muestra el aviso
  const REPORT_REASON = 'no_disponible';
  const REPORT_TOAST = '¡Gracias! Validaremos esta propiedad para mantener la red limpia.';
  const PROPERTY_ID = 'M1-24817';
  const readReports = () => { try { return JSON.parse(localStorage.getItem('m1_reports') || '[]'); } catch (e) { return window.M1_REPORTS || []; } };
  const saveReport = (reason) => {
    const row = { propiedad: PROPERTY_ID, motivo: reason, fecha: new Date().toISOString() };
    const all = readReports().concat(row);
    window.M1_REPORTS = all;                                             // variable que se monitorea
    try { localStorage.setItem('m1_reports', JSON.stringify(all)); } catch (e) { /* sin almacenamiento: queda en memoria */ }
    return row;
  };

  const LINK = 'moradauno.com/p/M1-24817?a=daniela-reyes';

  /* ---------- Piezas ---------- */
  const stat = (n, label, short, ico) => ({ n, label, short, ico });
  const statsOf = (p) => [stat(p.rec, 'Recámaras', 'Recámaras', 'bed'), stat(p.banos, 'Baños', 'Baños', 'bath'), stat(p.estac, 'Estacionamiento', 'Estac.', 'car'), stat(p.m2, 'm²', 'm²', 'expand')];
  const rows = (list) => list.map(([k, v]) => `<div class="row"><span>${k}</span><b>${v}</b></div>`).join('');

  const mapSVG = (red) => `<svg class="loc-map" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Mapa ilustrativo de la ubicación aproximada">
    <rect width="360" height="200" fill="#efedf1"/>
    <rect x="18" y="14" width="86" height="64" rx="8" fill="#f8ecfa"/><rect x="150" y="116" width="170" height="68" rx="8" fill="#f8ecfa"/><rect x="262" y="14" width="80" height="62" rx="8" fill="#f8ecfa"/>
    <rect x="112" y="0" width="14" height="200" fill="#fff"/><rect x="250" y="0" width="12" height="90" fill="#fff"/><rect x="0" y="90" width="360" height="14" fill="#fff"/>
    <circle cx="180" cy="98" r="48" fill="rgba(119,37,131,.10)" stroke="#6b5a73" stroke-dasharray="4 4" stroke-width="1.3"/>
    <g transform="translate(168 78)" fill="${red ? '#772583' : '#6b676f'}"><path d="M12 0C5.4 0 1 4.6 1 10.5 1 18 12 28 12 28s11-10 11-17.5C23 4.6 18.6 0 12 0z"/><circle cx="12" cy="10.5" r="4.2" fill="#fff"/></g>
  </svg>`;

  const avatar = (ini, big) => `<span class="avatar${big ? ' big' : ''}">${ini}</span>`;

  const advisorCard = () => `
    <div class="chips-row"><span class="pill pill-red">${icon('badge-check')}Asesor Red M1</span><span class="pill pill-soft">${icon('handshake')}Comparte comisión</span></div>
    <div class="adv">${avatar('MO')}<div><b>Mariana Ortega</b><span>${icon('building')}Casa Alameda Inmobiliaria</span></div></div>
    <button class="btn-outline" type="button" data-act="open-advisor">Ver perfil de asesor ${icon('chev-right')}</button>`;

  const noticeCard = () => `
    <span class="pill pill-gray">Propiedad de Mercado</span>
    <div class="notice"><span class="warn-ico">${icon('alert')}</span><div><b>Asesor no verificado</b><p>Este inmueble no pertenece a la Red M1. Viene de un portal externo y MoradaUno no verifica al asesor ni la publicación.</p></div></div>
    <div class="source"><span>Fuente</span><em>Inmuebles24</em></div>`;

  const cta = (p) => p.type === 'red'
    ? `<div class="cta"><button class="btn-primary" type="button" data-act="wa">${icon('whatsapp')}WhatsApp</button><button class="btn-outline" type="button" data-act="call">${icon('phone')}Llamar</button></div>`
    : `<div class="cta"><button class="btn-primary" type="button" data-act="portal">Ver publicación en el portal ${icon('external')}</button></div>`;

  /* ---------- Página ---------- */
  const renderPage = (p) => {
    const red = p.type === 'red';
    const st = statsOf(p);
    const gallery = POS.map((pos, i) => `<img src="${PHOTOS[i % 2]}" alt="" style="object-position:${pos}" ${i ? 'loading="lazy"' : ''}>`).join('');
    $('page').innerHTML = `
      <header class="appbar d-only">
        <a class="logo" href="red.html" aria-label="MoradaUno"><svg width="34" height="34" viewBox="0 0 28 28"><path d="M0 3 L0 28 L14 28 Z" fill="#4a0f5e"/><path d="M0 3 L14 28 L14 14 Z" fill="#671e75"/><path d="M28 3 L28 28 L14 28 Z" fill="#8e2d99"/><path d="M28 3 L14 28 L14 14 Z" fill="#b14eb5"/></svg></a>
        <div class="searchbox">${icon('search')}<span>Departamento en la Condesa con 3 recámaras y elevador</span></div>
        <button class="avatar-btn" type="button" aria-label="Perfil">BS</button>
      </header>

      <div class="wrap">
        <div class="toolbar d-only">
          <a class="back-link" href="mapa.html">${icon('arrow-left')}Volver a resultados</a>
          <button class="btn-share" type="button" data-act="share">${icon('share')}Compartir</button>
        </div>

        <section class="media" aria-label="Fotos">
          <div class="hero m-only"><img src="${PHOTOS[0]}" alt="" style="object-position:50% 40%">
            <a class="round-btn" href="mapa.html" aria-label="Volver">${icon('chev-left')}</a>
            <button class="btn-share" type="button" data-act="share">${icon('share')}Compartir</button>
            <span class="badge ${red ? 'badge-red' : 'badge-mx'}">${red ? icon('shield-check') + 'Red M1' : 'Mercado'}</span>
            <span class="counter">1/12</span>
          </div>
          <div class="gallery d-only">${gallery}
            <span class="badge ${red ? 'badge-red' : 'badge-mx'}">${red ? icon('shield-check') + 'Red M1' : 'Mercado'}</span>
            <button class="all-photos" type="button">${icon('grid')}Ver las 12 fotos</button>
          </div>
        </section>

        <div class="layout">
          <section class="head">
            <div class="price-m m-only"><b>${p.price}</b><span>/ mes</span>${p.maint ? `<small>+ ${p.maint} mantenimiento</small>` : ''}</div>
            <h1>${p.title}</h1>
            <p class="loc">${icon('pin')}${p.loc}</p>
            <div class="tiles m-only">${st.map((s) => `<div class="tile">${icon(s.ico)}<b>${s.n}</b><span>${s.short}</span></div>`).join('')}</div>
            <div class="inline-stats d-only">${st.map((s) => `<span class="istat">${icon(s.ico)}<b>${s.n}</b>${s.label}</span>`).join('')}</div>
            <div class="tags">${p.tags.map((t) => `<span>${t}</span>`).join('')}</div>
          </section>

          <aside class="aside"><div class="aside-card ${red ? 'is-red' : 'is-mx'}">
            <div class="price-d d-only"><b>${p.price}</b><span>/ mes</span>${p.maint ? `<small>+ ${p.maint} mantenimiento</small>` : ''}</div>
            ${red ? advisorCard() : noticeCard()}
            ${cta(p)}
            ${red ? `<button class="report-link" type="button" data-act="open-report">${icon('flag')}¿Te dijeron que ya no está disponible?</button>` : ''}
          </div></aside>

          <div class="body">
            <section class="sec"><h2>Descripción</h2><p class="desc">${p.desc}</p>${p.more ? '<button class="link" type="button">Leer más</button>' : ''}${p.descNote ? `<p class="note">${p.descNote}</p>` : ''}</section>
            <section class="sec"><h2>Distribución</h2><div class="rows">${rows(p.dist)}</div></section>
            <section class="sec"><h2>Amenidades</h2><div class="amen">${p.amen.map((a) => `<span>${icon('check')}${a}</span>`).join('')}</div></section>
            ${p.costs ? `<section class="sec"><h2>Costos y condiciones</h2><div class="rows">${rows(p.costs)}</div></section>` : ''}
            <section class="sec"><h2>Ubicación</h2>${mapSVG(red)}<p class="note">${p.locNote}</p></section>
            ${p.meta ? `<section class="sec foot"><p class="note">${p.meta}</p><button class="link flag" type="button" data-act="open-report">${icon('flag')}Reportar propiedad</button></section>` : ''}
          </div>
        </div>
      </div>`;
  };

  /* ---------- Capas (aviso y perfiles) ---------- */
  const layerAviso = () => `
    <div class="modal modal-aviso" role="dialog" aria-modal="true" aria-labelledby="m-title">
      <button class="m-close" type="button" data-act="close-layer" aria-label="Cerrar">${icon('x')}</button>
      <span class="alert-tile">${icon('alert-circle')}</span>
      <h2 id="m-title">Estás saliendo de MoradaUno</h2>
      <p>Te llevaremos al portal de origen para ver esta propiedad de Mercado. Ten en cuenta que este inmueble no pertenece a la Red M1 y su asesor no ha sido verificado.</p>
      <div class="dest">${icon('external')}Destino: Inmuebles24</div>
      <div class="m-actions"><button class="btn-primary" type="button" data-act="continue">Continuar al portal</button><button class="btn-outline" type="button" data-act="close-layer">Cancelar</button></div>
    </div>`;

  const layerShare = (copied) => `
    <div class="modal modal-share" role="dialog" aria-modal="true" aria-labelledby="m-title"><span class="handle m-only"></span>
      <div class="sh-head"><h2 id="m-title">Compartir con tu cliente</h2><button class="m-close inline" type="button" data-act="close-layer" aria-label="Cerrar">${icon('x')}</button></div>
      <div class="sh-note">${icon('shield-check')}<p>Se compartirá una ficha limpia con <b>tus datos de contacto</b> para tu cliente.</p></div>
      <div class="sh-me">${avatar('DR')}<div><b>Daniela Reyes · 55 3012 4455</b><span>Tu cliente verá tu nombre, teléfono y foto. No los del captador.</span></div></div>
      <button class="sh-opt${copied ? ' is-ok' : ''}" type="button" data-act="copy-link"><span class="sh-ico">${icon(copied ? 'check' : 'link')}</span><span><b>${copied ? 'Enlace copiado' : 'Copiar enlace personalizado'}</b><small>${LINK}</small></span></button>
      <button class="sh-opt" type="button" data-act="share-system"><span class="sh-ico">${icon('upload')}</span><span><b>Compartir en…</b><small>WhatsApp, Telegram, correo y más</small></span></button>
      <button class="sh-link d-only" type="button" data-act="view-client">Ver lo que verá tu cliente</button>
    </div>`;

  const layerSystem = () => `
    <p class="sys-ref"><span class="m-only">Referencia: el menú lo dibuja iOS, Android o la Web Share API del navegador</span><span class="d-only">Referencia: el menú lo dibuja el sistema o la Web Share API del navegador</span></p>
    <div class="modal sys-sheet" role="dialog" aria-modal="true" aria-label="Compartir en…"><span class="handle m-only"></span>
      <div class="sys-card"><img src="${PHOTOS[0]}" alt=""><div><b>Departamento amueblado con roof garden</b><span>Ficha de Daniela Reyes · moradauno.com</span></div></div>
      <div class="sys-apps m-only">
        <button type="button" data-act="sys-app" data-app="WhatsApp"><i>${icon('msg')}</i>WhatsApp</button>
        <button type="button" data-act="sys-app" data-app="Telegram"><i>${icon('send')}</i>Telegram</button>
        <button type="button" data-act="sys-app" data-app="Correo"><i>${icon('mail')}</i>Correo</button>
        <button type="button" data-act="sys-app" data-app="Mensajes"><i>${icon('chat')}</i>Mensajes</button>
      </div>
      <div class="sys-list m-only"><button type="button" data-act="sys-copy">Copiar ${icon('copy')}</button><button type="button" data-act="sys-print">Imprimir ${icon('printer')}</button></div>
      <div class="sys-menu d-only">
        <button type="button" data-act="sys-copy"><i>${icon('copy')}</i>Copiar</button>
        <button type="button" data-act="sys-app" data-app="WhatsApp"><i>${icon('msg')}</i>WhatsApp</button>
        <button type="button" data-act="sys-app" data-app="Telegram"><i>${icon('send')}</i>Telegram</button>
        <button type="button" data-act="sys-app" data-app="Correo"><i>${icon('mail')}</i>Correo</button>
        <button type="button" data-act="sys-app" data-app="Mensajes"><i>${icon('chat')}</i>Mensajes</button>
      </div>
      <button class="btn-outline sys-cancel d-only" type="button" data-act="close-layer">Cancelar</button>
      <p class="sys-foot">Si el navegador no soporta compartir, se muestra solo «Copiar enlace personalizado».</p>
    </div>`;

  /* ---------- Ficha compartida (vista del cliente) ---------- */
  const renderPublic = () => {
    const p = PROPS.red, st = statsOf(p);
    const gallery = POS.map((pos, i) => `<img src="${PHOTOS[i % 2]}" alt="" style="object-position:${pos}" ${i ? 'loading="lazy"' : ''}>`).join('');
    const adv = `${avatar('DR')}<div><b>Daniela Reyes</b><span>Asesora inmobiliaria · 55 3012 4455</span></div>`;
    $('page').innerHTML = `
      <div class="pub">
        <header class="pub-head m-only">${adv}</header>
        <header class="pub-top d-only"><div class="pub-head">${adv}</div><button class="btn-primary pub-mini" type="button" data-act="chat-dr">${icon('chat')}Escribir a Daniela</button></header>
        <div class="wrap">
          <section class="media">
            <div class="hero pub-hero m-only"><img src="${PHOTOS[0]}" alt="" style="object-position:50% 40%"><span class="counter">1/12</span></div>
            <div class="gallery d-only">${gallery}<button class="all-photos" type="button">${icon('grid')}Ver las 12 fotos</button></div>
          </section>
          <div class="layout">
            <section class="head">
              <div class="price-m"><b>${p.price}</b><span>/ mes</span><em class="pill pill-soft">Mantenimiento incluido</em></div>
              <h1>${p.title}</h1>
              <p class="loc">${icon('pin')}${p.loc}</p>
              <div class="tiles m-only">${st.map((x) => `<div class="tile"><b>${x.n}</b><span>${x.short}</span></div>`).join('')}</div>
              <div class="inline-stats d-only">${st.map((x) => `<span class="istat"><b>${x.n}</b>${x.label}</span>`).join('')}</div>
            </section>
            <aside class="aside d-only"><div class="aside-card is-mx pub-card">
              <div class="pub-head in-card">${adv}</div>
              <div class="cta"><button class="btn-primary" type="button" data-act="chat-dr">${icon('chat')}Escribir a Daniela</button><button class="btn-outline" type="button" data-act="call-dr">${icon('phone')}Llamar</button></div>
              <p class="pub-note">Ficha compartida por Daniela Reyes con MoradaUno. Sin datos de otros asesores.</p>
            </div></aside>
            <div class="body">
              <section class="sec"><h2>Descripción</h2><p class="desc">${p.desc.replace(/ Entrega amueblado.*$/, '')}</p></section>
              <section class="sec"><h2>Amenidades</h2><div class="amen pub-amen">${p.amen.map((x) => `<span>${x}</span>`).join('')}</div></section>
              <section class="sec"><h2>Ubicación</h2>${mapSVG(true)}<p class="note d-only">Ubicación aproximada. La dirección exacta te la comparte tu asesora.</p></section>
              <p class="pub-foot m-only">Ficha compartida por Daniela Reyes con MoradaUno. Sin datos de otros asesores.</p>
            </div>
          </div>
        </div>
      </div>
      <div class="cta pub-cta m-only"><button class="btn-primary" type="button" data-act="chat-dr">${icon('chat')}Escribir a Daniela</button><button class="btn-outline" type="button" data-act="call-dr">${icon('phone')}Llamar</button></div>`;
  };

  /* ---------- Tabla de reportes (monitoreo del prototipo) ---------- */
  const renderReports = () => {
    const rows = readReports().slice().reverse();
    const label = { [REPORT_REASON]: 'Ya no está disponible' };
    const fmt = (iso) => { const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }); };
    $('page').innerHTML = `
      <header class="pf-bar m-only"><button class="pf-back" type="button" data-act="back-ficha" aria-label="Volver a la ficha">${icon('arrow-left')}</button><b>Reportes de inmuebles</b></header>
      <div class="pf-wrap rp-wrap">
        <button class="back-link d-only" type="button" data-act="back-ficha">${icon('arrow-left')}Volver a la ficha</button>
        <h1 class="rp-title">Inmuebles reportados como no disponibles</h1>
        <p class="rp-note">Cada reporte hecho desde la ficha se guarda aquí (variable <code>M1_REPORTS</code>). Solo existe en este navegador.</p>
        ${rows.length ? `<div class="rp-table"><table><thead><tr><th>Fecha</th><th>Propiedad</th><th>Motivo</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${fmt(r.fecha)}</td><td>${r.propiedad}</td><td>${label[r.motivo] || r.motivo}</td></tr>`).join('')}</tbody></table></div>
          <button class="btn-outline rp-clear" type="button" data-act="clear-reports">Borrar reportes</button>`
        : `<div class="rp-empty"><b>Aún no hay reportes</b><span>Abre la ficha de Red M1 y toca «¿Te dijeron que ya no está disponible?».</span></div>`}
      </div>`;
  };

  /* ---------- Perfil del asesor (pantalla completa) ---------- */
  const profileCta = (a) => a.cta === 'chat'
    ? `<button class="btn-primary" type="button" data-act="chat">${icon('headset')}Pedir cambios a Atención a Clientes</button>`
    : `<button class="btn-primary" type="button" data-act="wa">${icon('whatsapp')}Contactar por WhatsApp</button>
       <a class="support" href="#" data-act="support">${icon('headset')}¿Datos desactualizados? Escribe a Atención a Clientes</a>`;

  const LISTINGS = [
    ['Departamento amueblado con roof garden', 'Roma Norte, Cuauhtémoc', '$24,500', 2, 2, 85],
    ['Departamento con terraza en Condesa', 'Condesa, Cuauhtémoc', '$27,000', 2, 2, 92],
    ['Loft remodelado cerca del Parque España', 'Condesa, Cuauhtémoc', '$18,500', 1, 1, 58],
    ['Departamento en Roma Sur con balcón', 'Roma Sur, Cuauhtémoc', '$21,800', 2, 1, 74],
    ['Penthouse con roof garden privado', 'Roma Norte, Cuauhtémoc', '$38,000', 3, 3, 160],
    ['Departamento luminoso en Hipódromo', 'Hipódromo, Cuauhtémoc', '$23,400', 2, 2, 80],
    ['Estudio amueblado en Condesa', 'Condesa, Cuauhtémoc', '$14,900', 1, 1, 45],
    ['Departamento familiar en Juárez', 'Juárez, Cuauhtémoc', '$29,900', 3, 2, 120],
    ['Departamento a media cuadra de Insurgentes', 'Roma Norte, Cuauhtémoc', '$19,200', 2, 1, 68]
  ];
  // Cantidad publicada = "Inmuebles activos en la Bolsa"; las que comparten comisión salen de "X de Y inmuebles"
  const listingsOf = (a) => {
    const t = a.stats.find(([, l]) => /activos/.test(l));
    const n = t ? parseInt(t[0], 10) : 0;
    const m = (a.comision || '').match(/en (\d+) de/);
    const shared = m ? parseInt(m[1], 10) : 0;
    return LISTINGS.slice(0, n).map((l, i) => ({ l, shared: i < shared, photo: PHOTOS[i % 2], pos: POS[i % POS.length] }));
  };
  const listingsHTML = (a) => {
    const items = listingsOf(a);
    if (!items.length) return '';
    return `<section class="pf-list" data-total="${items.length}"><div class="pl-head"><h3 class="eyebrow">Inmuebles publicados · ${items.length}</h3><button class="pl-more d-only" type="button" data-act="toggle-listings">Ver los ${items.length} inmuebles</button></div><div class="pl-grid">${items.map(({ l, shared, photo, pos }) => `
      <article class="pl-item" data-act="open-listing" tabindex="0">
        <div class="pl-photo"><img src="${photo}" alt="" style="object-position:${pos}" loading="lazy"></div>
        <div class="pl-body">
          <div class="pl-price"><b>${l[2]}</b><span>/ mes</span></div>
          <p class="pl-title">${l[0]}</p>
          <p class="pl-meta">${l[1]} · ${l[3]} rec · ${l[4]} baños · ${l[5]} m²</p>
          ${shared ? `<span class="comision">${icon('handshake')}Comparte comisión</span>` : ''}
        </div>
      </article>`).join('')}</div></section>`;
  };

  const renderProfile = (a) => {
    const facts = `<ul class="facts">
      <li>${icon('building')}<b>${a.co}</b></li>
      <li>${icon('calendar')}${a.since}</li>
      ${a.rentas ? `<li>${icon('award')}${a.rentas}</li>` : ''}
      <li><i class="dot${a.on ? ' on' : ''}"></i>${a.status}</li></ul>`;
    const perf = a.stats.length ? `<h3 class="eyebrow">Desempeño</h3><div class="stat-tiles">${a.stats.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('')}</div>` : '';
    const esq = (a.comision || a.opera) ? `<h3 class="eyebrow">Esquema comercial</h3>
      ${a.comision ? `<p class="fact-line">${icon('handshake')}<span>Comisión compartida: <b>${a.comision}</b></span></p>` : ''}
      ${a.opera ? `<p class="fact-line">${icon('pin')}<span>Opera en <b>${a.opera}</b></span></p>` : ''}` : '';
    $('page').innerHTML = `
      <header class="pf-bar m-only"><button class="pf-back" type="button" data-act="back-ficha" aria-label="Volver a la ficha">${icon('arrow-left')}</button><b>Perfil del asesor</b></header>
      <header class="appbar d-only">
        <a class="logo" href="red.html" aria-label="MoradaUno"><svg width="34" height="34" viewBox="0 0 28 28"><path d="M0 3 L0 28 L14 28 Z" fill="#4a0f5e"/><path d="M0 3 L14 28 L14 14 Z" fill="#671e75"/><path d="M28 3 L28 28 L14 28 Z" fill="#8e2d99"/><path d="M28 3 L14 28 L14 14 Z" fill="#b14eb5"/></svg></a>
        <button class="avatar-btn" type="button" aria-label="Perfil">BS</button>
      </header>
      <div class="pf-wrap">
        <button class="back-link d-only" type="button" data-act="back-ficha">${icon('arrow-left')}Volver a la ficha</button>
        <section class="pf-top">
          <div class="pf-id">${avatar(a.ini, true)}<div><h1>${a.name}</h1><span class="pill pill-red">${icon('shield-check')}Asesor Red M1</span></div></div>
          <div class="pf-cta d-only">${profileCta(a)}</div>
        </section>
        <div class="pf-grid">
          <section class="pf-card"><h3 class="eyebrow d-only">Identidad y respaldo</h3>${facts}</section>
          ${perf || esq ? `<section class="pf-card">${perf}${esq}</section>` : ''}
        </div>
        ${listingsHTML(a)}
      </div>
      <div class="pf-cta-bar m-only">${profileCta(a)}</div>`;
  };

  /* ---------- Estado / hash ---------- */
  let current = 'red-m1';
  const setLayer = (kind) => {
    const layer = $('layer');
    if (!kind) { layer.hidden = true; layer.innerHTML = ''; document.body.classList.remove('has-layer'); return; }
    layer.innerHTML = kind === 'aviso' ? layerAviso() : kind === 'share-sys' ? layerSystem() : layerShare(kind === 'share-copied');
    layer.dataset.kind = kind;
    layer.hidden = false; document.body.classList.add('has-layer');
    const f = layer.querySelector('button.btn-primary'); if (f) f.focus({ preventScroll: true });
  };

  const apply = (name) => {
    const s = STATES.find(([k]) => k === name) || STATES[0];
    current = s[0];
    document.body.classList.toggle('is-profile', !!s[4] || s[5] === 'reports');
    document.body.classList.toggle('is-public', s[5] === 'public');
    if (s[5] === 'public') renderPublic(); else if (s[5] === 'reports') renderReports(); else if (s[4]) renderProfile(ADVISORS[s[4]]); else renderPage(PROPS[s[2]]);
    setLayer(s[3]);
    if (s[3] === 'share-copied') toast('Enlace copiado. Pégalo donde quieras.', { top: true, ms: 0 }); else hideToast();
    document.querySelectorAll('#states-menu a').forEach((a) => a.classList.toggle('is-current', a.dataset.state === current));
    window.scrollTo(0, 0);
  };
  const base = () => (PROPS[(STATES.find(([k]) => k === current) || STATES[0])[2]].type === 'red' ? 'red-m1' : 'mercado');
  const openLayer = (kind, state) => { try{history.replaceState(null, '', '#' + state);}catch(e){} const s = STATES.find(([k]) => k === state); current = state; setLayer(kind); void s; };
  const closeLayer = () => { const b = base(); try{history.replaceState(null, '', '#' + b);}catch(e){} current = b; setLayer(null); };

  let toastT;
  const toast = (msg, { top = false, ms = 2200, wrap = false } = {}) => {
    const t = $('toast'); t.innerHTML = top ? `${icon('check')}<span>${msg}</span>` : msg; t.classList.toggle('top', top); t.classList.toggle('wrap', wrap); t.hidden = false;
    clearTimeout(toastT); if (ms) toastT = setTimeout(() => { t.hidden = true; }, ms);
  };
  const hideToast = () => { clearTimeout(toastT); $('toast').hidden = true; };
  const copyLink = () => { try { if (navigator.clipboard) navigator.clipboard.writeText('https://' + LINK).catch(() => {}); } catch (e) { /* sin permiso: solo prototipo */ } };

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'open-advisor') location.hash = 'asesor-m1';
    else if (a === 'back-ficha' || a === 'open-listing') location.hash = 'red-m1';
    else if (a === 'toggle-listings') {
      const sec = b.closest('.pf-list'), all = sec.classList.toggle('is-all');
      b.textContent = all ? 'Ver menos' : `Ver los ${sec.dataset.total} inmuebles`;
    }
    else if (a === 'support') { e.preventDefault(); toast('Abriendo Atención a Clientes…'); }
    else if (a === 'portal') openLayer('aviso', 'aviso-salida');
    else if (a === 'close-layer') closeLayer();
    else if (a === 'continue') { closeLayer(); toast('Abriendo Inmuebles24…'); }
    else if (a === 'wa') { const adv = ADVISORS[current] || ADVISORS['asesor-m1']; try { sessionStorage.setItem('m1_wa', JSON.stringify({ name: adv.name, ini: adv.ini })); } catch (er) { /* nada */ } location.href = 'whatsapp.html'; }
    else if (a === 'call') toast('Llamando a Mariana Ortega…');
    else if (a === 'chat') toast('Abriendo chat con Atención a Clientes…');
    else if (a === 'share') openLayer('share', 'compartir');
    else if (a === 'copy-link') { copyLink(); openLayer('share-copied', 'enlace-copiado'); toast('Enlace copiado. Pégalo donde quieras.', { top: true, ms: 3000 }); }
    else if (a === 'share-system') openLayer('share-sys', 'compartir-sistema');
    else if (a === 'view-client') location.hash = 'ficha-compartida';
    else if (a === 'open-report') { saveReport(REPORT_REASON); toast(REPORT_TOAST, { ms: 2500, wrap: true }); }
    else if (a === 'clear-reports') { try { localStorage.removeItem('m1_reports'); } catch (e) { /* nada */ } window.M1_REPORTS = []; renderReports(); }
    else if (a === 'sys-app') { closeLayer(); toast('Abriendo ' + b.dataset.app + '…'); }
    else if (a === 'sys-copy') { copyLink(); closeLayer(); toast('Enlace copiado. Pégalo donde quieras.', { top: true, ms: 3000 }); }
    else if (a === 'sys-print') { closeLayer(); toast('Preparando impresión…'); }
    else if (a === 'chat-dr') toast('Abriendo chat con Daniela…');
    else if (a === 'call-dr') toast('Llamando a Daniela Reyes…');
  });
  $('layer').addEventListener('click', (e) => { if (e.target === $('layer')) closeLayer(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('layer').hidden) closeLayer(); });

  /* ---------- Selector de estados ---------- */
  const menu = $('states-menu'), btn = $('states-btn');
  menu.innerHTML = STATES.map(([k, l]) => `<li><a href="#${k}" data-state="${k}">${l}</a></li>`).join('');
  btn.addEventListener('click', (e) => { e.stopPropagation(); const open = menu.hidden; menu.hidden = !open; btn.setAttribute('aria-expanded', open); });
  document.addEventListener('click', (e) => { if (!e.target.closest('#states')) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
  menu.addEventListener('click', () => { menu.hidden = true; });

  window.addEventListener('hashchange', () => apply(location.hash.replace('#', '')));
  apply(location.hash.replace('#', ''));
})();
