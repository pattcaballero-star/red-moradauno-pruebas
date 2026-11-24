/* Modo prueba de usabilidad: oculta herramientas de prototipo, reinicia el estado por participante y registra la sesión.
   ?p=ID participante · ?t=N tarea · ?fac=1 modo facilitadora (ve "Estados", no registra) · ?reset=1 reinicia estado */
(() => {
  if (new URLSearchParams(location.search).get('hm') === '1') {
    /* ---------- Microsoft Clarity (opcional: M1_CLARITY en js/config.js) ---------- */
  const cid = window.M1_CLARITY;
  if (cid && !fac) {
    (function (c, l, a, r, i, t, y) { c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); }; t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i; y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y); })(window, document, 'clarity', 'script', cid);
    try { clarity('identify', pid(), sid); clarity('set', 'participante', pid()); if (task()) clarity('set', 'tarea', task()); } catch (e) { /* nada */ }
  }

  window.M1T = { fac: true, participant: false, log() {}, flush() {}, autoWelcome: () => false };
    const h = document.createElement('style'); h.textContent = '.states{display:none!important}'; (document.head || document.documentElement).appendChild(h); return;
  }
  const ss = { get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* nada */ } }, del: (k) => { try { sessionStorage.removeItem(k); } catch (e) { /* nada */ } } };
  const q = new URLSearchParams(location.search);
  if (q.get('fac') === '1') ss.set('m1_fac', '1');
  if (q.get('fac') === '0') ss.del('m1_fac');
  const fac = ss.get('m1_fac') === '1';
  if (q.get('p')) ss.set('m1_pid', q.get('p').slice(0, 24));
  if (q.get('t')) {
    ss.set('m1_task', q.get('t').slice(0, 4)); ss.set('m1_phase', 'brief');
    q.delete('t'); try { history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q.toString() : '') + location.hash); } catch (e) { /* nada */ }
  }

  const wipe = () => { try { Object.keys(localStorage).filter((k) => k.indexOf('m1_') === 0).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* nada */ } ss.del('m1_welcome_dismissed'); };
  let sid = ss.get('m1_sid'), isNew = false;
  if (!sid) { sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); ss.set('m1_sid', sid); ss.set('m1_t0', String(Date.now())); ss.set('m1_events', '[]'); isNew = true; if (!fac) wipe(); }
  if (q.get('reset') === '1') wipe();
  const t0 = +ss.get('m1_t0') || Date.now();
  const pid = () => ss.get('m1_pid') || ('anon-' + sid.slice(-4));
  const task = () => ss.get('m1_task') || '';

  // Fuera del modo facilitadora se oculta el selector de estados

  /* ---------- Registro ---------- */
  let events = []; try { events = JSON.parse(ss.get('m1_events') || '[]'); } catch (e) { events = []; }
  let dirty = false, sending = false, dbp = null;
  const page = () => (location.pathname.split('/').pop() || 'index.html') + location.hash;
  const log = (type, label, extra) => {
    if (fac) return;
    const ev = Object.assign({ t: Date.now() - t0, type, page: page(), task: task() }, label ? { label } : {}, extra || {});
    events.push(ev); if (events.length > 1500) events.shift();
    ss.set('m1_events', JSON.stringify(events)); dirty = true;
  };
  const getDb = () => dbp || (dbp = (async () => { try { return window.claude && claude.use ? await claude.use('db') : null; } catch (e) { return null; } })());
  const flush = async () => {
    if (!dirty || sending || fac) return;
    const last = events[events.length - 1] || { t: 0 };
    const doc = { sid, pid: pid(), name: ss.get('m1_name') || '', start: t0, last: t0 + last.t, tasks: [...new Set(events.map((e) => e.task).filter(Boolean))], ua: navigator.userAgent.slice(0, 120), w: innerWidth, h: innerHeight, events };
    const ep = window.M1_ENDPOINT;
    if (ep) {
      sending = true;
      try { await fetch(ep, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({}, doc, { events: events.slice(-1000) })) }); dirty = false; } catch (e) { /* se reintenta */ }
      sending = false; return;
    }
    const db = await getDb(); if (!db) return;
    sending = true;
    try { await db.doc('sessions/' + sid).set(doc); dirty = false; } catch (e) { /* se reintenta en el siguiente ciclo */ }
    sending = false;
  };
  setInterval(flush, 5000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  addEventListener('pagehide', flush);

  const labelOf = (el) => {
    const t = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('data-act') || el.id || el.className || '').replace(/\s+/g, ' ').trim();
    return (el.tagName.toLowerCase() + ': ' + t).slice(0, 70);
  };
  document.addEventListener('click', (e) => {
    const pos = { x: Math.round(e.clientX), y: Math.round(e.clientY), xr: +(e.clientX / innerWidth).toFixed(3), yr: +(e.clientY / innerHeight).toFixed(3) };
    const el = e.target.closest('a,button,[role=button],[data-act],[data-id],input,label,textarea,article.card,.pl-item');
    if (!el) { log('miss', '', pos); return; }
    log('tap', labelOf(el), pos);
  }, true);

  /* ---------- Callejones sin salida ---------- */
  let toastT; const toast = (msg) => {
    let t = document.getElementById('m1t-toast');
    if (!t) { t = document.createElement('div'); t.id = 'm1t-toast'; t.setAttribute('role', 'status'); t.style.cssText = 'position:fixed;left:50%;bottom:110px;transform:translateX(-50%);z-index:9999;max-width:calc(100% - 32px);padding:12px 18px;border-radius:14px;background:#330248;color:#fff;font:600 14px/1.4 Figtree,system-ui,sans-serif;text-align:center;box-shadow:0 6px 18px rgba(51,2,72,.3)'; document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2200);
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href="#"]');
    if (a && !a.hasAttribute('data-act')) { e.preventDefault(); toast('Esta sección no está disponible en el prototipo'); log('dead_end', labelOf(a)); }
  });

  addEventListener('hashchange', () => log('view', ''));
  addEventListener('DOMContentLoaded', () => { log('view', isNew ? 'inicio de sesión' : ''); setTimeout(flush, 800); });


  /* ---------- Guía de tareas (bienvenida, tarjeta de tarea y botón "Terminé") ---------- */
  const TASKS = [
    { t: 'Entender la red', say: 'Abre la app por primera vez. Antes de avanzar, cuéntame con tus palabras qué es esto y para qué te serviría', start: 'index.html' },
    { t: 'Onboarding sin ayuda', say: 'Regístrate y deja tu cuenta lista para empezar, como lo harías sola. Dime qué crees que está pasando en cada paso', start: 'index.html' },
    { t: 'Búsqueda', say: 'Tu cliente busca una renta de cierto presupuesto y zona. Encuentra opciones: puedes escribirlo como se lo dirías a alguien, dictarlo o usar filtros, lo que prefieras', start: 'index.html' },
    { t: 'Gestionar el inventario', say: 'Tienes una propiedad nueva y otra que ya se rentó. Deja tu inventario al día y decide cuáles quieres compartir con la red', start: 'inventario.html' },
    { t: 'Revisar una ficha', say: 'Elige una propiedad que te interese. Dime qué necesitas saber para decidir si te sirve y si trabajarías con esa asesora, y dime si lo encuentras', start: 'mapa.html#lista' },
    { t: 'Colaborar', say: 'Quieres avanzar con esa propiedad. Contacta a la otra asesora como lo harías aquí y cuéntame qué esperas que pase', start: 'ficha.html#red-m1', keep: /ficha|whatsapp/ }
  ];
  const phase = () => ss.get('m1_phase') || (task() ? 'brief' : 'intro');
  const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const go = (u) => {
    const a = new URL(u, location.href);
    if (a.pathname === location.pathname) { if (a.hash !== location.hash) history.replaceState(null, '', a.pathname + a.search + a.hash); location.reload(); } else location.href = a.href;
  };
  const enter = (n) => {
    ss.set('m1_task', String(n)); ss.set('m1_phase', 'brief');
    if (n <= 2) ss.del('m1_welcome_dismissed');
    const T = TASKS[n - 1];
    if (T.keep && T.keep.test(location.pathname)) render(); else go(T.start);
  };
  if (!fac) {
    const st = document.createElement('style');
    st.textContent = `.m1t-ov{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(40,32,52,.62);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);font-family:Figtree,system-ui,-apple-system,"Segoe UI",sans-serif}
.m1t-card{width:100%;max-width:420px;max-height:calc(100% - 16px);overflow:auto;padding:28px 24px 24px;border-radius:24px;background:#fff;color:#202028;box-shadow:0 20px 50px rgba(30,10,40,.35)}
.m1t-eye{margin:0 0 10px;color:#8c2f9b;font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
.m1t-card h2{margin:0 0 14px;font-size:26px;line-height:1.15;font-weight:800;color:#202028}
.m1t-card p{margin:0 0 18px;font-size:17px;line-height:1.5;color:#3a3a4a}
.m1t-card p.m1t-say{font-size:20px;font-weight:600;color:#202028}
.m1t-card p.m1t-small{font-size:15px;color:#6c6a78}
.m1t-card label{display:block;margin:0 0 8px;font-size:15px;font-weight:700}.m1t-card label span{font-weight:400;color:#6c6a78}
.m1t-card input{width:100%;height:52px;margin:0 0 18px;padding:0 16px;border:2px solid #d4d0de;border-radius:14px;font:inherit;font-size:17px;color:#202028;background:#fff}
.m1t-card input:focus{outline:none;border-color:#8c2f9b}
.m1t-btn{width:100%;height:52px;border:0;border-radius:14px;background:linear-gradient(#8c3f9d,#5f2272);color:#fff;font:800 17px/1 inherit;font-family:inherit;cursor:pointer}
.m1t-bar{position:fixed;top:0;left:0;right:0;z-index:9000;height:48px;display:flex;align-items:center;gap:10px;padding:0 10px 0 14px;background:#330248;color:#fff;font-family:Figtree,system-ui,-apple-system,"Segoe UI",sans-serif}
.m1t-bar .m1t-lb{flex:1;min-width:0;line-height:1.15}.m1t-bar small{display:block;color:#d9b8e2;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.m1t-bar b{display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:14px}
.m1t-bar button{flex:none;height:34px;padding:0 16px;border:0;border-radius:10px;background:#fff;color:#5f2272;font:800 14px/1 inherit;font-family:inherit;cursor:pointer}
body.m1t-has-bar{padding-top:48px}` + '.states{display:none!important}';
    (document.head || document.documentElement).appendChild(st);
  }
  function card(html) {
    const ov = document.createElement('div'); ov.className = 'm1t-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = '<div class="m1t-card">' + html + '</div>'; document.body.appendChild(ov); return ov;
  }
  function render() {
    if (fac || !document.body) return;
    document.querySelectorAll('.m1t-ov,.m1t-bar').forEach((n) => n.remove()); document.body.classList.remove('m1t-has-bar');
    const p = phase(), n = +task() || 1, T = TASKS[n - 1] || TASKS[0];
    if (p === 'intro') {
      const ov = card('<p class="m1t-eye">Prueba de usabilidad</p><h2>¡Gracias por ayudarnos!</h2><p>Vas a probar un prototipo. <b>No es una evaluación tuya</b>: nos ayudas a mejorar la app. Piensa en voz alta, di lo que ves y lo que esperas que pase.</p><label for="m1t-name">Tu nombre o código <span>(opcional)</span></label><input id="m1t-name" type="text" placeholder="Ej. Ana" autocomplete="off" maxlength="30"><button class="m1t-btn" type="button">Empezar</button>');
      ov.querySelector('button').addEventListener('click', () => {
        const v = ov.querySelector('input').value.trim(); if (v) ss.set('m1_name', v);
        log('session_start', v); enter(1);
      });
    } else if (p === 'brief') {
      const ov = card('<p class="m1t-eye">Tarea ' + n + ' de ' + TASKS.length + '</p><h2>' + esc(T.t) + '</h2><p class="m1t-say">“' + esc(T.say) + '.”</p><p class="m1t-small">Cuando termines, toca el botón <b>Terminé</b> que aparece arriba.</p><button class="m1t-btn" type="button">Comenzar</button>');
      ov.querySelector('button').addEventListener('click', () => { log('task_start', T.t); try { if (window.clarity) clarity('set', 'tarea', String(n)); } catch (e) { /* nada */ } ss.set('m1_phase', 'doing'); render(); });
    } else if (p === 'doing') {
      const b = document.createElement('div'); b.className = 'm1t-bar';
      b.innerHTML = '<div class="m1t-lb"><small>Tarea ' + n + ' de ' + TASKS.length + '</small><b>' + esc(T.t) + '</b></div><button type="button">Terminé</button>';
      document.body.appendChild(b); document.body.classList.add('m1t-has-bar');
      b.querySelector('button').addEventListener('click', () => {
        log('task_done', T.t); flush();
        if (n < TASKS.length) enter(n + 1); else { ss.set('m1_phase', 'end'); render(); }
      });
    } else {
      card('<p class="m1t-eye">Prueba de usabilidad</p><h2>¡Eso fue todo, gracias!</h2><p>Terminaste las ' + TASKS.length + ' tareas. Tu ayuda nos sirve muchísimo para mejorar la app.</p><button class="m1t-btn" type="button">Reiniciar</button>');
      document.querySelector('.m1t-ov .m1t-btn').addEventListener('click', () => {
        flush();
        ['m1_sid', 'm1_t0', 'm1_events', 'm1_task', 'm1_phase', 'm1_name', 'm1_wa'].forEach((k) => ss.del(k)); wipe();
        const u = new URL('index.html', location.href); if (q.get('p')) u.searchParams.set('p', q.get('p')); location.href = u.href;
      });
    }
  }
  addEventListener('DOMContentLoaded', render);
  if (document.readyState !== 'loading') render();

  window.M1T = { fac, participant: !fac, sid, pid, log, flush,
    autoWelcome: () => !fac && +task() === 2 };
})();
