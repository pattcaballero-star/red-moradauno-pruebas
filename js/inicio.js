(() => {
  const $ = (id) => document.getElementById(id);
  const modal = $('in-modal'), overlay = $('in-overlay');
  const STATES = [['bienvenida', 'Inicio con modal de bienvenida'], ['inicio', 'Inicio sin modal']];

  const store = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* nada */ } }
  };
  const onboardingDone = () => { try { return localStorage.getItem('m1_onb_done') === '1'; } catch (e) { return false; } };

  const show = (on) => { modal.hidden = !on; overlay.hidden = !on; document.body.style.overflow = on ? 'hidden' : ''; };
  const close = () => { show(false); store.set('m1_welcome_dismissed', '1'); };

  $('in-close').addEventListener('click', close);
  overlay.addEventListener('click', close);
  // Mobile: arrastra la hoja hacia abajo para cerrarla
  const desktop = window.matchMedia('(min-width:900px)');
  let y0 = null, dy = 0;
  modal.addEventListener('touchstart', (e) => { if (desktop.matches || modal.scrollTop > 0) return; y0 = e.touches[0].clientY; dy = 0; }, { passive: true });
  modal.addEventListener('touchmove', (e) => {
    if (y0 === null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    if (dy > 0) { modal.classList.add('is-dragging'); modal.style.transform = 'translateY(' + dy + 'px)'; }
  }, { passive: true });
  const endDrag = () => {
    if (y0 === null) return;
    y0 = null; modal.classList.remove('is-dragging'); modal.style.transform = '';
    if (dy > 100) close();
    dy = 0;
  };
  modal.addEventListener('touchend', endDrag);
  modal.addEventListener('touchcancel', endDrag);

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });

  // El modal se abre al tocar la tarjeta "Red inmobiliaria"; si ya terminaste el onboarding, la tarjeta va directo a la Red
  const redCard = $('in-red');
  if (redCard) redCard.addEventListener('click', (e) => { if (!onboardingDone()) { e.preventDefault(); show(true); } });
  // Con #bienvenida el modal abre al cargar (estado del prototipo)
  const apply = () => {
    const h = location.hash.replace('#', '');
    if (h === 'bienvenida') show(true);
    else if (h === 'inicio') show(false);
    else show(!!(window.M1T && M1T.autoWelcome && M1T.autoWelcome()) && !store.get('m1_welcome_dismissed'));
    document.querySelectorAll('#states-menu a').forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === '#' + (h || (modal.hidden ? 'inicio' : 'bienvenida'))));
  };

  /* Selector de estados */
  const menu = $('states-menu'), btn = $('states-btn');
  menu.innerHTML = STATES.map(([k, l]) => `<li><a href="#${k}">${l}</a></li>`).join('') + '<li><button type="button" id="in-reset">Reiniciar demo (modal y onboarding)</button></li>';
  btn.addEventListener('click', (e) => { e.stopPropagation(); const open = menu.hidden; menu.hidden = !open; btn.setAttribute('aria-expanded', open); });
  document.addEventListener('click', (e) => { if (!e.target.closest('#states')) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
  menu.addEventListener('click', (e) => {
    menu.hidden = true;
    if (e.target.id === 'in-reset') {
      try { sessionStorage.removeItem('m1_welcome_dismissed'); localStorage.removeItem('m1_onb'); localStorage.removeItem('m1_onb_done'); } catch (err) { /* nada */ }
      history.replaceState(null, '', location.pathname); apply();
    }
  });

  window.addEventListener('hashchange', apply);
  apply();
})();
