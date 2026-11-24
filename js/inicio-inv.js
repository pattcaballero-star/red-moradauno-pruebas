/* Widget «Mi inventario» del home core: usa los conteos guardados por la pantalla de inventario (si existen). */
(() => {
  let c = null;
  try { c = JSON.parse(localStorage.getItem('m1_inventory_counts') || 'null'); } catch (e) { c = null; }
  if (!c) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el && Number.isFinite(v)) el.textContent = v; };
  set('inv-pub', c.publico); set('inv-draft', c.porPublicar);
})();
