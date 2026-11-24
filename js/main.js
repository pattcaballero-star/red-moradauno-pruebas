(() => {
  const field = document.getElementById('field');
  const input = document.getElementById('query');
  const ghostText = document.getElementById('ghost-text');
  const form = document.getElementById('search');

  /* ---------- Textarea auto-grow ---------- */
  const grow = () => {
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
  };
  const sync = () => {
    field.classList.toggle('has-value', input.value.length > 0);
    grow();
  };
  input.addEventListener('input', sync);
  input.addEventListener('focus', () => field.classList.add('is-active'));
  input.addEventListener('blur', () => { field.classList.remove('is-active'); sync(); });
  field.addEventListener('click', (e) => { if (!e.target.closest('.mic')) input.focus(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); window.location.href = 'mapa.html#lista'; });

  /* ---------- Animación de escritura (typing) ---------- */
  const TYPE_SPEED = 55; // ms por carácter
  const phrases = [
    'Busca depto de 2 recámaras en la Roma con balcón',
    'Busca casa con 3 recámaras y patio',
    'Busca depto en la Juárez con elevador'
  ];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0, j = 0, mode = 'type', timer;

  const tick = () => {
    const p = phrases[i];
    let delay = TYPE_SPEED;
    if (mode === 'type') {
      j += 1;
      ghostText.textContent = p.slice(0, j);
      if (j >= p.length) { mode = 'hold'; delay = 1900; }
      else {
        delay = TYPE_SPEED * (0.6 + Math.random() * 1.1);
        if (p[j - 1] === ' ') delay += TYPE_SPEED * 0.8;
      }
    } else if (mode === 'hold') {
      mode = 'erase'; delay = 120;
    } else {
      j -= 1;
      ghostText.textContent = p.slice(0, Math.max(j, 0));
      if (j <= 0) { mode = 'type'; i = (i + 1) % phrases.length; delay = 550; }
      else delay = Math.max(TYPE_SPEED * 0.4, 14);
    }
    timer = setTimeout(tick, delay);
  };

  if (reduce) ghostText.textContent = phrases[0];
  else timer = setTimeout(tick, 700);

  document.addEventListener('visibilitychange', () => {
    if (reduce) return;
    clearTimeout(timer);
    if (!document.hidden) timer = setTimeout(tick, 300);
  });
})();
