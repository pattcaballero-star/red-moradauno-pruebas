/* Tab bar global (mobile). La pestaña activa se toma de <body data-tab="inicio|red|proteccion|operaciones|perfil"> (por defecto: red). */
(() => {
  const active = document.body.dataset.tab || 'red';
  const line = (d) => `<svg class="tb-ico" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const items = [
    { k: 'inicio', label: 'Inicio', href: 'index.html', svg: line('<rect x="4" y="5" width="16" height="14" rx=".6"/><path d="M4 5l16 14M20 5L4 19"/>') },
    { k: 'red', label: 'Red', href: 'red.html', svg: `<svg class="tb-ico tb-dots" viewBox="0 0 24 24" aria-hidden="true">${[5, 12, 19].map((y) => [5, 12, 19].map((x) => `<circle cx="${x}" cy="${y}" r="1.7"/>`).join('')).join('')}</svg>` },
    { k: 'proteccion', label: 'Protección', href: '#', center: true, svg: line('<path d="M12 5v14M5 12h14"/>') },
    { k: 'operaciones', label: 'Operaciones', href: '#', svg: line('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>') },
    { k: 'perfil', label: 'Perfil', href: '#', svg: line('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>') }
  ];
  const nav = document.createElement('nav');
  nav.className = 'tabbar';
  nav.setAttribute('aria-label', 'Principal');
  nav.innerHTML = items.map((i) => `<a class="tb-item${i.center ? ' tb-center' : ''}${i.k === active ? ' is-active' : ''}" href="${i.href}" data-tab="${i.k}"${i.k === active ? ' aria-current="page"' : ''}>${i.center ? `<span class="tb-fab">${i.svg}</span><span class="tb-icowrap"></span>` : `<span class="tb-icowrap">${i.svg}</span>`}<span class="tb-label">${i.label}</span></a>`).join('');
  // Las pestañas sin pantalla todavía no navegan
  nav.addEventListener('click', (e) => { const a = e.target.closest('a[href="#"]'); if (a) e.preventDefault(); });
  document.body.appendChild(nav);
})();
