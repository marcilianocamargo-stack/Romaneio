const CACHE = 'romaneio-v5';
const ASSETS = [
  './index.html',
  './manifest-romaneio.json',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // 1) O estoque (raw.githubusercontent.com) NUNCA é cacheado — sempre rede
  //    (garante o estoque real na hora, e o proprio index.html ja manda
  //    ?t=timestamp + no-store, entao isso aqui e so uma garantia extra).
  if (url.hostname === 'raw.githubusercontent.com') {
    return; // deixa o fetch original buscar direto da rede
  }

  // 2) index.html / navegação: REDE PRIMEIRO (app sempre atualizado),
  //    cache só como reserva quando estiver offline.
  if (e.request.mode === 'navigate' ||
      url.pathname.endsWith('/index.html') ||
      url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return resp;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 3) Demais arquivos (biblioteca XLSX, manifest): cache primeiro.
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
