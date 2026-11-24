/* Widget «Mi inventario» del home: toma los conteos que guarda la pantalla de inventario (si existen). */
(() => {
  let c = null;
  try { c = JSON.parse(localStorage.getItem('m1_inventory_counts') || 'null'); } catch (e) { c = null; }
  if (!c) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el && Number.isFinite(v)) el.textContent = v; };
  set('iw-pub', c.publico); set('iw-draft', c.porPublicar); set('iw-arch', c.archivadas);
})();
