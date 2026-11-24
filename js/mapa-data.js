/* Datos de ejemplo del mapa (ilustrativos).
   - 23 inmuebles "curados" alrededor de Colonia Nápoles (11 Red M1 · 12 Mercado): es lo que se ve al abrir el mapa.
   - 163 más en anillos lejanos: al alejar el mapa el total llega a 186 (74 Red M1 · 112 Mercado). */
(() => {
  const C = { lat: 19.3946, lng: -99.1745 };
  const mLat = 111320, mLng = 111320 * Math.cos(C.lat * Math.PI / 180);
  const at = (dx, dy) => ({ lat: C.lat + dy / mLat, lng: C.lng + dx / mLng });

  let seed = 20260;
  const rnd = () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 1.2;
  const pick = (a) => a[Math.floor(rnd() * a.length)];

  const photos = ['assets/img/property-del-valle.jpg', 'assets/img/property-del-valle-sur.jpg'];
  const zonas = ['Nápoles, Benito Juárez', 'Del Valle Centro, Benito Juárez', 'Roma Norte, Cuauhtémoc', 'Condesa, Cuauhtémoc', 'Narvarte Poniente, Benito Juárez', 'Insurgentes Mixcoac, Benito Juárez'];
  const brokers = ['Mariana Gil · RE/MAX', 'Luis Ortega · Century 21', 'Ana Paredes · Independiente', 'Diego Solís · Keller Williams'];
  const tagSets = [['Pet-friendly', 'Con elevador', 'Terraza'], ['Con elevador', 'Terraza'], ['Pet-friendly', 'Con elevador'], ['Con elevador']];

  // [precio, dx, dy] en metros respecto al centro
  const redCurated = [
    [24500, -170, 260], [16900, -330, 60], [38000, -60, -20], [18200, -260, -190], [27000, 50, -300],
    [31000, 190, -380], [23400, -120, 330], [29900, 120, -150], [21800, 270, 170], [35500, 300, -120], [26700, -20, 160]
  ];
  const mxCurated = [
    [19800, 120, 380], [14500, 330, 200], [21000, 150, -80], [22400, 330, -210], [15900, -300, -330], [17500, -60, -420],
    [20300, -250, 110], [16200, 20, 70], [18900, 240, 20], [25200, -340, -60], [13800, 90, -250], [23600, -190, -250]
  ];

  let n = 0;
  const make = (type, price, pos, curated) => {
    const id = 'p' + (++n);
    const zona = curated ? zonas[0] : pick(zonas);
    const red = type === 'red';
    return {
      id, type, price, lat: pos.lat, lng: pos.lng, curated,
      title: 'Departamento en ' + zona.split(',')[0],
      zona,
      rec: 2 + Math.floor(rnd() * 3), banos: 1 + Math.floor(rnd() * 3), m2: 60 + Math.floor(rnd() * 14) * 10,
      broker: red ? pick(brokers) : null,
      comision: red && rnd() > 0.35,
      maint: red ? null : 1500 + Math.floor(rnd() * 12) * 100,
      tags: pick(tagSets),
      photo: photos[n % 2],
      photoCount: 6 + Math.floor(rnd() * 4)
    };
  };

  const items = [];
  redCurated.forEach(([p, dx, dy]) => items.push(make('red', p, at(dx, dy), true)));
  mxCurated.forEach(([p, dx, dy]) => items.push(make('mercado', p, at(dx, dy), true)));

  // Detalles fijos de los dos inmuebles que se usan en los previews del diseño
  const red38 = items.find((i) => i.price === 38000);
  Object.assign(red38, { title: 'Departamento en Nápoles', rec: 3, banos: 3, m2: 160, broker: 'Mariana Gil · RE/MAX', comision: true, tags: ['Pet-friendly', 'Con elevador', 'Terraza'], photoCount: 8 });
  const mx21 = items.find((i) => i.price === 21000);
  Object.assign(mx21, { title: 'Departamento en Ampliación Nápoles', zona: 'Ampliación Nápoles', rec: 3, banos: 2, m2: 102, maint: 2100, tags: ['Con elevador'], photoCount: 8 });

  // Anillo lejano (hotspots) para los clusters al alejar
  const hotspots = [[-1900, 700], [1700, 1100], [-1200, -1700], [1400, -1600], [200, 2000], [-2100, -300], [2100, -200]];
  const far = (type, price) => {
    const [hx, hy] = pick(hotspots);
    let dx = hx + gauss() * 380, dy = hy + gauss() * 380;
    const d = Math.hypot(dx, dy);
    if (d < 1600) { dx *= 1600 / d; dy *= 1600 / d; }
    items.push(make(type, price, at(dx, dy), false));
  };
  const price = () => 12000 + Math.floor(rnd() * 30) * 1000 + (rnd() > .5 ? 500 : 0);
  for (let i = 0; i < 63; i++) far('red', price());
  for (let i = 0; i < 100; i++) far('mercado', price());

  window.M1_DATA = { center: C, items };
})();
