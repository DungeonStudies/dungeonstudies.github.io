/* Dungeon Studies' service worker.
 *
 * The game was always one file you could open from disk, and installing it as
 * an app must not cost that. So this caches the shell and nothing clever: the
 * page, the icons, the manifest. Everything the game needs is already inside
 * index.html, which is why there is no asset list to keep in step.
 *
 * Bump CACHE_V on release. The old cache is deleted on activate, the new
 * worker takes over immediately, and any open tab is told to reload once.
 */
const CACHE_V = 'dungeon-studies-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE_V)
      /* one miss must not fail the whole install, so they go in one at a time */
      .then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{}))))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(ks=>Promise.all(ks.filter(k=>k!==CACHE_V).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  /* Never touch the API. A cached answer from Anthropic would be wrong and a
     cached failure would be worse. */
  if(url.origin !== self.location.origin) return;

  /* Network-first for the page itself, so a deployed update is picked up as
     soon as there is a connection, and the cache is the fallback rather than
     the source of truth. Everything else is cache-first: the icons never
     change without a version bump. */
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if(isPage){
    e.respondWith(
      fetch(req)
        .then(res=>{ const copy = res.clone();
                     caches.open(CACHE_V).then(c=>c.put(req, copy)).catch(()=>{});
                     return res; })
        .catch(()=>caches.match(req).then(r=>r || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(caches.match(req).then(r=>r || fetch(req)));
});
