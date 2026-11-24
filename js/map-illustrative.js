/* Mapa ilustrativo para Leaflet: dibuja manzanas, calles, parques, río y viaducto en canvas.
   No necesita servidor de tiles. Se activa con window.M1_OFFLINE_MAP = true (ver mapa.js). */
(() => {
  const hash = (a, b) => {
    let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const B = 96;                                   // separación entre calles (px a zoom 16)
  const hw = (i) => (i % 4 === 0 ? 8 : 4.5);       // media anchura de calle; cada 4ª es avenida
  const COLORS = { street: '#fbfafc', block: '#edeaf0', pink: '#f6ecf8', cream: '#f6eedd', park: '#e1efe5', water: '#e2d9ea', waterEdge: '#d3c7e0', road: '#e6def0' };

  const draw = (ctx, coords, map, origin) => {
    const z = coords.z, sc = Math.pow(2, z - 16);
    const O = map.project(L.latLng(origin), 16);
    const ax = O.x * sc - coords.x * 256, ay = O.y * sc - coords.y * 256;     // origen (centro) en px del tile
    const X = (u) => ax + u * sc, Y = (v) => ay + v * sc;
    const umin = -ax / sc, umax = (256 - ax) / sc, vmin = -ay / sc, vmax = (256 - ay) / sc;

    ctx.fillStyle = sc < 0.3 ? COLORS.block : COLORS.street;
    ctx.fillRect(0, 0, 256, 256);

    const i0 = Math.floor(umin / B) - 1, i1 = Math.ceil(umax / B) + 1;
    const j0 = Math.floor(vmin / B) - 1, j1 = Math.ceil(vmax / B) + 1;
    if (sc >= 0.3) {
      for (let i = i0; i <= i1; i++) {
        for (let j = j0; j <= j1; j++) {
          const r = hash(i, j);
          ctx.fillStyle = r < 0.1 ? COLORS.park : r < 0.26 ? COLORS.cream : r < 0.5 ? COLORS.pink : COLORS.block;
          const x0 = X(i * B + hw(i)), x1 = X((i + 1) * B - hw(i + 1)), y0 = Y(j * B + hw(j)), y1 = Y((j + 1) * B - hw(j + 1));
          if (ctx.roundRect && sc > 0.6) { ctx.beginPath(); ctx.roundRect(x0, y0, x1 - x0, y1 - y0, 3 * sc); ctx.fill(); }
          else ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        }
      }
    } else {
      ctx.strokeStyle = COLORS.street; ctx.lineWidth = Math.max(1, 12 * sc);
      for (let i = Math.ceil(i0 / 4) * 4; i <= i1; i += 4) { ctx.beginPath(); ctx.moveTo(X(i * B), 0); ctx.lineTo(X(i * B), 256); ctx.stroke(); }
      for (let j = Math.ceil(j0 / 4) * 4; j <= j1; j += 4) { ctx.beginPath(); ctx.moveTo(0, Y(j * B)); ctx.lineTo(256, Y(j * B)); ctx.stroke(); }
    }

    const stroke = (pts, w, color, dash) => {
      ctx.beginPath(); ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
      for (let k = 1; k < pts.length; k++) ctx.lineTo(X(pts[k][0]), Y(pts[k][1]));
      ctx.lineWidth = Math.max(0.8, w * sc); ctx.strokeStyle = color; ctx.setLineDash(dash || []); ctx.lineCap = 'butt'; ctx.lineJoin = 'round'; ctx.stroke(); ctx.setLineDash([]);
    };
    const curve = (p0, c, p1, w, color) => {
      ctx.beginPath(); ctx.moveTo(X(p0[0]), Y(p0[1])); ctx.quadraticCurveTo(X(c[0]), Y(c[1]), X(p1[0]), Y(p1[1]));
      ctx.lineWidth = Math.max(0.8, w * sc); ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.stroke();
    };

    // Río (banda lila que curva por la izquierda)
    curve([-2800, 520], [-760, 420], [-420, -1500], 30, COLORS.waterEdge);
    curve([-2800, 520], [-760, 420], [-420, -1500], 24, COLORS.water);
    // Viaducto (banda diagonal en la parte alta)
    stroke([[-3200, -640], [-900, -430], [-160, -330], [3200, -420]], 34, COLORS.waterEdge);
    stroke([[-3200, -640], [-900, -430], [-160, -330], [3200, -420]], 28, COLORS.road);
    stroke([[-3200, -640], [-900, -430], [-160, -330], [3200, -420]], 2.4, '#ffffff', [10, 8]);
    // Av. Insurgentes Sur (diagonal ancha)
    stroke([[-520, 1800], [620, -1800]], 26, COLORS.waterEdge);
    stroke([[-520, 1800], [620, -1800]], 21, COLORS.road);
    stroke([[-520, 1800], [620, -1800]], 3, '#ffffff');

    // Etiquetas (solo con zoom suficiente)
    if (sc >= 0.5) {
      const fs = Math.max(11, Math.min(24, 13 * sc));
      ctx.fillStyle = '#8d8794'; ctx.textBaseline = 'middle';
      ctx.font = `600 ${fs}px Figtree, system-ui, sans-serif`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(fs * 0.3)}px`;
      ctx.fillText('COLONIA NÁPOLES', X(-170), Y(150));
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      ctx.font = `500 ${Math.max(10, 10.5 * Math.min(sc, 1.6))}px Figtree, system-ui, sans-serif`;
      ctx.fillText('Filadelfia', X(-330), Y(-150));
      ctx.fillText('Estadio Ciudad de los Deportes', X(-120), Y(560));
      ctx.save(); ctx.translate(X(240), Y(-120)); ctx.rotate(-1.2); ctx.fillText('Av. Insurgentes Sur', 0, 0); ctx.restore();
      ctx.save(); ctx.translate(X(-420), Y(-270)); ctx.rotate(-0.12); ctx.fillText('Río Becerra', 0, 0); ctx.restore();
    }
  };

  L.IllustrativeLayer = L.GridLayer.extend({
    createTile(coords) {
      const dpr = window.devicePixelRatio || 1, size = this.getTileSize();
      const c = document.createElement('canvas');
      c.width = size.x * dpr; c.height = size.y * dpr;
      const ctx = c.getContext('2d');
      ctx.scale(dpr, dpr);
      draw(ctx, coords, this._map, this.options.origin);
      return c;
    }
  });
})();
