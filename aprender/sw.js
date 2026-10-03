/* Service worker: guarda la app en el celular para que funcione sin internet.
   Si cambiás archivos, subí el número de VERSION para que los celulares se actualicen. */
const VERSION = 'aprender-v1';
const FILES = [
  './',
  './index.html',
  './styles.css',
  './marks.css',
  './manifest.webmanifest',
  './data/preguntas.js',
  './js/progreso.js',
  './js/juegos.js',
  './js/app.js',
  './fonts/Leander.ttf',
  './fonts/josefin-sans.woff2',
  './fonts/im-fell-english.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-64.png'
];

// Las fotos que usan las preguntas se toman del propio banco, así una foto nueva
// queda disponible sin internet sin tener que agregarla a mano en esta lista.
function fotosDelBanco() {
  try {
    self.window = self;
    importScripts('./data/preguntas.js');
    const B = self.BANCO || {};
    const rutas = new Set();
    const mirar = x => { if (typeof x === 'string' && /\.(jpe?g|png|webp|gif)$/i.test(x)) rutas.add('./' + x.replace(/^\.\//, '')); };
    (B.modulos || []).forEach(m => mirar(m.foto));
    (B.fichas || []).forEach(f => mirar(f.foto));
    (B.preguntas || []).forEach(p => {
      mirar(p.foto);
      (p.pares || []).forEach(par => (par || []).forEach(mirar));
    });
    return [...rutas];
  } catch (e) {
    return [];
  }
}

const FOTOS = fotosDelBanco();

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(FILES);
    // Si alguna foto falta, no frena la instalación.
    await Promise.all(FOTOS.map(u => cache.add(u).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Primero la copia guardada (rápido y sin internet); en segundo plano se actualiza.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async cache => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req).then(res => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      if (cached) { e.waitUntil(network); return cached; }
      const res = await network;
      if (res) return res;
      if (req.mode === 'navigate') return cache.match('./index.html');
      return Response.error();
    })
  );
});
