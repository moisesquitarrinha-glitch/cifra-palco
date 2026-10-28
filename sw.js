/* Cifra de Palco — guarda o app no aparelho para abrir sem internet */
const VERSION = 'cifra-palco-v16';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION)
    .then(c => Promise.all(CORE.map(u => fetch(u, { cache: 'no-store' }).then(r => r.ok && c.put(u, r)))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && !/^cifra-palco-v\d+$/.test(k) || (+k.split('-v')[1] < +VERSION.split('-v')[1])).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function newestCached(req){
  const keys = (await caches.keys()).filter(k => /^cifra-palco-v\d+$/.test(k)).sort((a, b) => +b.split('-v')[1] - +a.split('-v')[1]);
  for (const k of keys){ const r = await (await caches.open(k)).match(req, { ignoreSearch: true }); if (r) return r; }
  return null;
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin){
    // Com internet: sempre a versão mais nova do servidor (sem o cache de 10 min). Sem internet: a cópia guardada.
    e.respondWith(
      fetch(req, { cache: 'no-store' }).then(res => {
        if (res.ok && !url.search){ const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(async () => (await newestCached(req)) || (req.mode === 'navigate' ? newestCached('./index.html') : Response.error()))
    );
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
    })));
  }
});
