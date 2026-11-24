window.M1_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxfCbZWpPpKkqEbwC2cF06BllhbWv3JgZAHH-nd3uFL3n6Y-rG5vtEl5_GukxcZBt0c8g/exec';

// Microsoft Clarity (no se carga en modo facilitadora ni en el mapa de calor)
if (!/[?&](fac|hm)=1/.test(location.search) && sessionStorage.getItem('m1_fac') !== '1') {
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', 'zigc8zkn8f');
}
